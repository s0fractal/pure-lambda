#!/usr/bin/env node
/**
 * Generate Hasse diagram from concepts
 * Input: concepts.jsonl
 * Output: lattice.json + lattice.svg
 */

import { readFileSync, writeFileSync } from 'fs'

interface Concept {
  intent: string[]
  extent: string[]
}

interface LatticeNode {
  id: number
  intent: string[]
  extent: string[]
  parents: number[]
  children: number[]
  level: number
}

interface Lattice {
  nodes: LatticeNode[]
  edges: Array<[number, number]>  // [parent, child]
}

function loadConcepts(file: string): Concept[] {
  const lines = readFileSync(file, 'utf-8').trim().split('\n')
  return lines.map(line => JSON.parse(line))
}

function isSubset(a: string[], b: string[]): boolean {
  const bSet = new Set(b)
  return a.every(x => bSet.has(x))
}

function buildHasse(concepts: Concept[]): Lattice {
  const nodes: LatticeNode[] = concepts.map((c, i) => ({
    id: i,
    intent: c.intent,
    extent: c.extent,
    parents: [],
    children: [],
    level: 0
  }))

  // Sort by intent size (smaller first)
  nodes.sort((a, b) => a.intent.length - b.intent.length)

  // Find parent-child relationships
  const edges: Array<[number, number]> = []

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (isSubset(nodes[i].intent, nodes[j].intent)) {
        // Check if direct parent (no intermediate node)
        let isDirect = true
        for (let k = i + 1; k < j; k++) {
          if (isSubset(nodes[i].intent, nodes[k].intent) &&
              isSubset(nodes[k].intent, nodes[j].intent)) {
            isDirect = false
            break
          }
        }

        if (isDirect) {
          nodes[i].children.push(j)
          nodes[j].parents.push(i)
          edges.push([i, j])
        }
      }
    }
  }

  // Calculate levels
  const calculateLevel = (node: LatticeNode): number => {
    if (node.level > 0) return node.level
    if (node.parents.length === 0) {
      node.level = 1
    } else {
      node.level = Math.max(...node.parents.map(p => calculateLevel(nodes[p]))) + 1
    }
    return node.level
  }

  nodes.forEach(calculateLevel)

  return { nodes, edges }
}

function generateSVG(lattice: Lattice): string {
  const width = 1200
  const height = 800
  const nodeRadius = 20
  const levelHeight = 100

  // Group nodes by level
  const levels = new Map<number, LatticeNode[]>()
  let maxLevel = 0
  for (const node of lattice.nodes) {
    if (!levels.has(node.level)) {
      levels.set(node.level, [])
    }
    levels.get(node.level)!.push(node)
    maxLevel = Math.max(maxLevel, node.level)
  }

  // Position nodes
  const positions = new Map<number, { x: number, y: number }>()
  for (const [level, nodes] of levels) {
    const y = height - (level * levelHeight) - 50
    const spacing = width / (nodes.length + 1)
    nodes.forEach((node, i) => {
      positions.set(node.id, {
        x: spacing * (i + 1),
        y
      })
    })
  }

  // Generate SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f0f4f8"/>
      <stop offset="100%" stop-color="#d2d6dc"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.2"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <text x="${width/2}" y="30" text-anchor="middle" font-size="24" font-weight="bold" fill="#2d3748">Fractal Lattice</text>
  <text x="${width/2}" y="55" text-anchor="middle" font-size="14" fill="#718096">${lattice.nodes.length} concepts, ${lattice.edges.length} edges</text>
`

  // Draw edges
  svg += '  <g id="edges" stroke="#cbd5e0" stroke-width="2" fill="none">\n'
  for (const [parent, child] of lattice.edges) {
    const p1 = positions.get(parent)!
    const p2 = positions.get(child)!
    svg += `    <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" opacity="0.6"/>\n`
  }
  svg += '  </g>\n'

  // Draw nodes
  svg += '  <g id="nodes">\n'
  for (const node of lattice.nodes) {
    const pos = positions.get(node.id)!
    const color = node.level === 1 ? '#48bb78' :
                   node.level === maxLevel ? '#ed8936' :
                   '#667eea'

    svg += `    <g transform="translate(${pos.x},${pos.y})">\n`
    svg += `      <circle r="${nodeRadius}" fill="${color}" stroke="#2d3748" stroke-width="2" filter="url(#shadow)"/>\n`
    svg += `      <text y="-25" text-anchor="middle" font-size="10" fill="#2d3748">${node.intent.length} attrs</text>\n`
    svg += `      <text y="-35" text-anchor="middle" font-size="10" fill="#718096">${node.extent.length} objs</text>\n`
    svg += `      <text y="35" text-anchor="middle" font-size="9" fill="#a0aec0">#${node.id}</text>\n`
    svg += `    </g>\n`
  }
  svg += '  </g>\n'

  // Legend
  svg += `  <g transform="translate(50,${height-80})">
    <text font-size="12" font-weight="bold" fill="#2d3748">Legend:</text>
    <circle cx="10" cy="20" r="8" fill="#48bb78"/>
    <text x="25" y="24" font-size="11" fill="#4a5568">Bottom (∅)</text>
    <circle cx="10" cy="40" r="8" fill="#667eea"/>
    <text x="25" y="44" font-size="11" fill="#4a5568">Concepts</text>
    <circle cx="10" cy="60" r="8" fill="#ed8936"/>
    <text x="25" y="64" font-size="11" fill="#4a5568">Top (⊤)</text>
  </g>\n`

  svg += '</svg>'

  return svg
}

function generateLattice(conceptsFile: string, outputJson: string, outputSvg: string) {
  console.log('Building Hasse diagram...')

  const concepts = loadConcepts(conceptsFile)
  console.log(`Loaded ${concepts.length} concepts`)

  const lattice = buildHasse(concepts)
  console.log(`Built lattice with ${lattice.edges.length} edges`)

  // Save JSON
  writeFileSync(outputJson, JSON.stringify(lattice, null, 2))
  console.log(`Lattice JSON: ${outputJson}`)

  // Generate SVG
  const svg = generateSVG(lattice)
  writeFileSync(outputSvg, svg)
  console.log(`Lattice SVG: ${outputSvg}`)

  // Statistics
  const avgIntent = lattice.nodes.reduce((sum, n) => sum + n.intent.length, 0) / lattice.nodes.length
  const avgExtent = lattice.nodes.reduce((sum, n) => sum + n.extent.length, 0) / lattice.nodes.length
  const maxLevel = Math.max(...lattice.nodes.map(n => n.level))

  console.log('\nLattice Statistics:')
  console.log(`  Height: ${maxLevel}`)
  console.log(`  Average intent size: ${avgIntent.toFixed(1)}`)
  console.log(`  Average extent size: ${avgExtent.toFixed(1)}`)

  // Fractal dimension estimate
  const D = Math.log(lattice.nodes.length) / Math.log(avgIntent + 1)
  console.log(`  Fractal dimension (estimate): ${D.toFixed(2)}`)

  return lattice
}

// Run if called directly
if (require.main === module) {
  generateLattice(
    'fractal-lattice/concepts.jsonl',
    'fractal-lattice/lattice.json',
    'fractal-lattice/lattice.svg'
  )
}

export { generateLattice }