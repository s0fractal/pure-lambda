#!/usr/bin/env node

/**
 * Quick Demo - Show LVG in action without full build
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Simple LVG structure
function createDemoLVG() {
  const nodes = [
    {
      id: 'mod-001',
      kind: 'module',
      sig: 'hash-module-main',
      attrs: new Map([
        ['name', 'index.ts'],
        ['path', 'src/index.ts'],
        ['size', 2500],
        ['complexity', 12]
      ])
    },
    {
      id: 'fn-001',
      kind: 'fn',
      sig: 'hash-fn-transform',
      attrs: new Map([
        ['name', 'transform'],
        ['path', 'src/index.ts'],
        ['complexity', 5],
        ['params', 2]
      ])
    },
    {
      id: 'fn-002',
      kind: 'fn',
      sig: 'hash-fn-compose',
      attrs: new Map([
        ['name', 'compose'],
        ['path', 'src/compose.ts'],
        ['complexity', 8],
        ['params', 3]
      ])
    },
    {
      id: 'type-001',
      kind: 'type',
      sig: 'hash-type-lvg',
      attrs: new Map([
        ['name', 'LVG'],
        ['path', 'src/types.ts'],
        ['members', 4]
      ])
    }
  ]

  const edges = [
    { src: 'mod-001', dst: 'fn-001', rel: 'calls' },
    { src: 'fn-001', dst: 'fn-002', rel: 'calls' },
    { src: 'fn-002', dst: 'type-001', rel: 'refines' },
    { src: 'mod-001', dst: 'type-001', rel: 'imports' }
  ]

  return {
    version: '1.0.0',
    nodes,
    edges,
    metadata: {
      repo_cid: crypto.randomBytes(16).toString('hex'),
      timestamp: Date.now(),
      lang: 'typescript',
      deterministic: true
    }
  }
}

// Generate simple SVG
function generateSVG(lvg) {
  const nodePositions = new Map()

  // Simple grid layout
  lvg.nodes.forEach((node, i) => {
    const x = 200 + (i % 2) * 400
    const y = 150 + Math.floor(i / 2) * 200
    nodePositions.set(node.id, { x, y })
  })

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <!-- Background -->
  <rect width="1200" height="800" fill="#1e1e1e"/>

  <!-- Title -->
  <text x="600" y="30" text-anchor="middle" fill="#fff" font-size="20" font-family="monospace">
    Lambda View Graph - Demo
  </text>

  <!-- Edges -->\n`

  // Draw edges
  lvg.edges.forEach(edge => {
    const src = nodePositions.get(edge.src)
    const dst = nodePositions.get(edge.dst)
    if (src && dst) {
      const color = edge.rel === 'calls' ? '#61dafb' :
                   edge.rel === 'imports' ? '#666' : '#9333ea'
      svg += `  <line x1="${src.x}" y1="${src.y}" x2="${dst.x}" y2="${dst.y}" stroke="${color}" stroke-width="2" opacity="0.6"/>\n`
    }
  })

  svg += `
  <!-- Nodes -->\n`

  // Draw nodes
  lvg.nodes.forEach(node => {
    const pos = nodePositions.get(node.id)
    const color = node.kind === 'module' ? '#3178c6' :
                 node.kind === 'fn' ? '#61dafb' :
                 node.kind === 'type' ? '#692b7c' : '#666'

    const size = node.kind === 'module' ? 40 : 30

    svg += `  <g transform="translate(${pos.x}, ${pos.y})">
    <circle r="${size}" fill="${color}" stroke="#fff" stroke-width="2"/>
    <text y="5" text-anchor="middle" fill="#fff" font-size="12" font-family="monospace">
      ${node.attrs.get('name')}
    </text>
  </g>\n`
  })

  svg += `
  <!-- Legend -->
  <g transform="translate(50, 700)">
    <circle cx="0" cy="0" r="10" fill="#3178c6"/>
    <text x="20" y="5" fill="#fff" font-size="12" font-family="monospace">Module</text>

    <circle cx="100" cy="0" r="10" fill="#61dafb"/>
    <text x="120" y="5" fill="#fff" font-size="12" font-family="monospace">Function</text>

    <circle cx="220" cy="0" r="10" fill="#692b7c"/>
    <text x="240" y="5" fill="#fff" font-size="12" font-family="monospace">Type</text>
  </g>

  <!-- Stats -->
  <g transform="translate(50, 750)">
    <text fill="#666" font-size="10" font-family="monospace">
      Nodes: ${lvg.nodes.length} | Edges: ${lvg.edges.length} | Generated: ${new Date().toISOString()}
    </text>
  </g>
</svg>`

  return svg
}

// Main demo
console.log('🚀 LVG Demo - Generating visualization...\n')

const lvg = createDemoLVG()
console.log('📊 Created LVG:')
console.log(`  - ${lvg.nodes.length} nodes`)
console.log(`  - ${lvg.edges.length} edges`)

const svg = generateSVG(lvg)

// Save outputs
const outDir = 'demo-output'
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

// Save SVG
const svgPath = path.join(outDir, 'demo.svg')
fs.writeFileSync(svgPath, svg)
console.log(`\n✅ SVG saved to: ${svgPath}`)

// Save LVG JSON
const jsonPath = path.join(outDir, 'demo-lvg.json')
fs.writeFileSync(jsonPath, JSON.stringify(lvg, (key, value) => {
  if (value instanceof Map) {
    return Object.fromEntries(value)
  }
  return value
}, 2))
console.log(`📦 LVG saved to: ${jsonPath}`)

// Generate HTML viewer
const html = `<!DOCTYPE html>
<html>
<head>
  <title>LVG Demo Viewer</title>
  <style>
    body {
      margin: 0;
      background: #0a0a0a;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: monospace;
    }
    .container {
      text-align: center;
    }
    h1 {
      color: #61dafb;
      margin-bottom: 20px;
    }
    .svg-container {
      border: 2px solid #333;
      border-radius: 8px;
      overflow: hidden;
      display: inline-block;
    }
    .info {
      color: #666;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔮 Lambda View Graph</h1>
    <div class="svg-container">
      ${svg}
    </div>
    <div class="info">
      Pure Lambda - Universal λ Layer | <a href="demo-lvg.json" style="color: #61dafb">View JSON</a>
    </div>
  </div>
</body>
</html>`

const htmlPath = path.join(outDir, 'index.html')
fs.writeFileSync(htmlPath, html)
console.log(`🌐 HTML viewer saved to: ${htmlPath}`)

console.log('\n' + '='.repeat(60))
console.log('🎉 Demo complete! To view:')
console.log(`   1. Open ${htmlPath} in your browser`)
console.log(`   2. Or run: open ${htmlPath} (on macOS)`)
console.log('='.repeat(60) + '\n')