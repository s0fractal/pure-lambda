/**
 * SVGx Generator - Deterministic SVG from LVG
 */

import { LVG, LVGNode, LVGEdge, LVGPatch } from '../../lvg/types'
import * as seedrandom from 'seedrandom'

interface Point {
  x: number
  y: number
}

interface NodePosition extends Point {
  id: string
}

const COLOR_PALETTE = {
  module: '#3178c6',
  fn: '#61dafb',
  type: '#692b7c',
  resource: '#f59e0b',
  asset: '#10b981',
  concept: '#ef4444',
  default: '#666666'
}

export async function generateSVGx(lvg: LVG, seed: string): Promise<string> {
  // Layout nodes
  const positions = layoutNodes(lvg, seed)

  // Build SVG
  const svg = buildSVG(lvg, positions)

  // Canonicalize
  return canonicalizeSVG(svg)
}

function layoutNodes(lvg: LVG, seed: string): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>()
  const rng = seedrandom(seed)

  // Simple grid layout for determinism
  const gridSize = Math.ceil(Math.sqrt(lvg.nodes.length))
  const cellWidth = 1200 / (gridSize + 1)
  const cellHeight = 800 / (gridSize + 1)

  lvg.nodes.forEach((node, i) => {
    const row = Math.floor(i / gridSize)
    const col = i % gridSize

    positions.set(node.id, {
      id: node.id,
      x: (col + 1) * cellWidth,
      y: (row + 1) * cellHeight
    })
  })

  // Apply force-directed adjustments with fixed iterations
  for (let iter = 0; iter < 100; iter++) {
    applyForces(lvg, positions, rng)
  }

  // Snap to grid for stability
  positions.forEach((pos, id) => {
    pos.x = Math.round(pos.x / 5) * 5
    pos.y = Math.round(pos.y / 5) * 5
  })

  return positions
}

function applyForces(
  lvg: LVG,
  positions: Map<string, NodePosition>,
  rng: () => number
): void {
  const alpha = 0.1
  const repulsion = 100
  const attraction = 0.01

  // Repulsion between all nodes
  const nodes = Array.from(positions.values())
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x
      const dy = nodes[j].y - nodes[i].y
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.1
      const force = repulsion / (dist * dist)

      nodes[i].x -= dx * force * alpha
      nodes[i].y -= dy * force * alpha
      nodes[j].x += dx * force * alpha
      nodes[j].y += dy * force * alpha
    }
  }

  // Attraction along edges
  for (const edge of lvg.edges) {
    const src = positions.get(edge.src)
    const dst = positions.get(edge.dst)
    if (!src || !dst) continue

    const dx = dst.x - src.x
    const dy = dst.y - src.y
    const force = attraction

    src.x += dx * force * alpha
    src.y += dy * force * alpha
    dst.x -= dx * force * alpha
    dst.y -= dy * force * alpha
  }

  // Keep within bounds
  positions.forEach(pos => {
    pos.x = Math.max(50, Math.min(1150, pos.x))
    pos.y = Math.max(50, Math.min(750, pos.y))
  })
}

function buildSVG(lvg: LVG, positions: Map<string, NodePosition>): string {
  const nodes: string[] = []
  const edges: string[] = []

  // Sort for determinism
  const sortedNodes = [...lvg.nodes].sort((a, b) => a.id.localeCompare(b.id))
  const sortedEdges = [...lvg.edges].sort((a, b) => {
    const srcCmp = a.src.localeCompare(b.src)
    if (srcCmp !== 0) return srcCmp
    const dstCmp = a.dst.localeCompare(b.dst)
    if (dstCmp !== 0) return dstCmp
    return a.rel.localeCompare(b.rel)
  })

  // Generate edges
  for (const edge of sortedEdges) {
    const src = positions.get(edge.src)
    const dst = positions.get(edge.dst)
    if (!src || !dst) continue

    const edgeElement = createEdge(src, dst, edge)
    edges.push(edgeElement)
  }

  // Generate nodes
  for (const node of sortedNodes) {
    const pos = positions.get(node.id)
    if (!pos) continue

    const nodeElement = createNode(node, pos)
    nodes.push(nodeElement)
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  ${edges.join('\n  ')}
  ${nodes.join('\n  ')}
</svg>`
}

function createNode(node: LVGNode, pos: NodePosition): string {
  const color = COLOR_PALETTE[node.kind] || COLOR_PALETTE.default
  const size = calculateNodeSize(node)

  switch (node.kind) {
    case 'module':
      return `<rect x="${n3(pos.x - size / 2)}" y="${n3(pos.y - size / 2)}" width="${n3(size)}" height="${n3(size)}" fill="${color}" stroke="#000000" stroke-width="1"/>`

    case 'fn':
      return `<circle cx="${n3(pos.x)}" cy="${n3(pos.y)}" r="${n3(size / 2)}" fill="${color}" stroke="#000000" stroke-width="1"/>`

    case 'type':
      return `<rect x="${n3(pos.x - size / 2)}" y="${n3(pos.y - size / 2)}" width="${n3(size)}" height="${n3(size)}" fill="${color}" stroke="#000000" stroke-width="1" stroke-dasharray="5,5"/>`

    default:
      return `<circle cx="${n3(pos.x)}" cy="${n3(pos.y)}" r="${n3(size / 2)}" fill="${color}" stroke="#000000" stroke-width="1"/>`
  }
}

function createEdge(src: NodePosition, dst: NodePosition, edge: LVGEdge): string {
  const color = edge.rel === 'tests' ? '#10b981' : '#666666'
  const strokeWidth = edge.weight ? Math.min(edge.weight, 5) : 2
  const dashArray = edge.rel === 'refines' ? 'stroke-dasharray="5,5"' : ''

  return `<path d="M ${n3(src.x)},${n3(src.y)} L ${n3(dst.x)},${n3(dst.y)}" stroke="${color}" stroke-width="${strokeWidth}" fill="none" ${dashArray}/>`
}

function calculateNodeSize(node: LVGNode): number {
  const complexity = node.attrs.get('complexity') || 1
  const size = node.attrs.get('size') || 100

  switch (node.kind) {
    case 'module':
      return Math.sqrt(size / 10) * 10
    case 'fn':
      return Math.log(complexity + 1) * 20
    case 'type':
      return (node.attrs.get('members') || 5) * 3
    default:
      return 30
  }
}

function n3(n: number): string {
  // Normalize number to 3 decimal places
  return n.toFixed(3)
}

function canonicalizeSVG(svg: string): string {
  // Already generated in canonical form
  return svg
}

export function applyPatch(svg: string, patch: LVGPatch): string {
  // TODO: Apply incremental patch to SVG
  // For now, would need to regenerate
  console.log(`Applying patch with ${patch.operations.length} operations`)
  return svg
}