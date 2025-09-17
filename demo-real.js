#!/usr/bin/env node

/**
 * Real Demo - Analyze actual Pure Lambda files
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Scan actual files
function scanRepository(rootPath) {
  const nodes = []
  const edges = []
  const nodeMap = new Map()

  function hashContent(content) {
    return crypto.createHash('blake3' in crypto ? 'blake3' : 'sha256')
      .update(content)
      .digest('hex')
      .slice(0, 16)
  }

  function analyzeFile(filePath) {
    const relativePath = path.relative(rootPath, filePath)
    const content = fs.readFileSync(filePath, 'utf-8')
    const ext = path.extname(filePath)
    const name = path.basename(filePath)

    // Determine node kind
    let kind = 'resource'
    if (['.ts', '.js'].includes(ext)) kind = 'module'
    else if (['.md'].includes(ext)) kind = 'concept'
    else if (['.yaml', '.json'].includes(ext)) kind = 'asset'

    // Calculate complexity (simplified)
    const lines = content.split('\n').length
    const complexity = Math.floor(Math.log(lines + 1) * 3)

    const nodeId = hashContent(relativePath)

    const node = {
      id: nodeId,
      kind,
      sig: hashContent(content),
      attrs: new Map([
        ['name', name],
        ['path', relativePath],
        ['size', content.length],
        ['lines', lines],
        ['complexity', complexity]
      ])
    }

    nodes.push(node)
    nodeMap.set(relativePath, nodeId)

    // Detect imports (simplified)
    const importRegex = /(?:import|require)\s*\(?\s*['"]([^'"]+)['"]/g
    let match
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1]
      if (importPath.startsWith('.')) {
        // Local import
        let resolvedPath = path.resolve(path.dirname(filePath), importPath)

        // Try different extensions
        const extensions = ['.ts', '.js', '.json', '']
        for (const ext of extensions) {
          const testPath = resolvedPath + ext
          const relativeTest = path.relative(rootPath, testPath)
          if (nodeMap.has(relativeTest)) {
            edges.push({
              src: nodeId,
              dst: nodeMap.get(relativeTest),
              rel: 'imports'
            })
            break
          }
        }
      }
    }

    // Detect function calls (very simplified)
    if (content.includes('transform(') || content.includes('compose(')) {
      // Add some synthetic edges for demo
      if (nodeMap.has('lvg/types.ts')) {
        edges.push({
          src: nodeId,
          dst: nodeMap.get('lvg/types.ts'),
          rel: 'calls'
        })
      }
    }
  }

  // Scan directories
  function scanDir(dir, depth = 0) {
    if (depth > 3) return // Limit depth

    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        // Skip node_modules and hidden dirs
        if (entry.name === 'node_modules' ||
            entry.name.startsWith('.') ||
            entry.name === 'dist' ||
            entry.name === 'demo-output') {
          continue
        }
        scanDir(fullPath, depth + 1)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name)
        if (['.ts', '.js', '.md', '.yaml', '.json'].includes(ext)) {
          analyzeFile(fullPath)
        }
      }
    }
  }

  scanDir(rootPath)

  return { nodes, edges }
}

// Enhanced SVG generation with force layout
function generateEnhancedSVG(lvg) {
  const nodePositions = new Map()

  // Force-directed layout simulation
  const simulation = {
    nodes: lvg.nodes.map((node, i) => ({
      id: node.id,
      x: 600 + (Math.random() - 0.5) * 400,
      y: 400 + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
      node
    })),
    iterations: 50
  }

  // Run simulation
  for (let iter = 0; iter < simulation.iterations; iter++) {
    // Apply forces
    for (let i = 0; i < simulation.nodes.length; i++) {
      const n1 = simulation.nodes[i]

      // Repulsion
      for (let j = i + 1; j < simulation.nodes.length; j++) {
        const n2 = simulation.nodes[j]
        const dx = n2.x - n1.x
        const dy = n2.y - n1.y
        const dist = Math.sqrt(dx * dx + dy * dy) + 1
        const force = 5000 / (dist * dist)

        n1.vx -= dx * force / dist
        n1.vy -= dy * force / dist
        n2.vx += dx * force / dist
        n2.vy += dy * force / dist
      }

      // Center gravity
      n1.vx -= (n1.x - 600) * 0.01
      n1.vy -= (n1.y - 400) * 0.01
    }

    // Attraction along edges
    lvg.edges.forEach(edge => {
      const n1 = simulation.nodes.find(n => n.id === edge.src)
      const n2 = simulation.nodes.find(n => n.id === edge.dst)
      if (n1 && n2) {
        const dx = n2.x - n1.x
        const dy = n2.y - n1.y
        const force = 0.001

        n1.vx += dx * force
        n1.vy += dy * force
        n2.vx -= dx * force
        n2.vy -= dy * force
      }
    })

    // Update positions
    simulation.nodes.forEach(n => {
      n.x += n.vx
      n.y += n.vy
      n.vx *= 0.8 // Damping
      n.vy *= 0.8

      // Keep in bounds
      n.x = Math.max(50, Math.min(1150, n.x))
      n.y = Math.max(50, Math.min(750, n.y))

      nodePositions.set(n.id, { x: n.x, y: n.y, node: n.node })
    })
  }

  // Generate SVG
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <radialGradient id="bg-gradient">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#1a1a2e"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="800" fill="url(#bg-gradient)"/>

  <!-- Grid -->
  <g opacity="0.05">`

  for (let x = 0; x <= 1200; x += 50) {
    svg += `\n    <line x1="${x}" y1="0" x2="${x}" y2="800" stroke="#fff"/>`
  }
  for (let y = 0; y <= 800; y += 50) {
    svg += `\n    <line x1="0" y1="${y}" x2="1200" y2="${y}" stroke="#fff"/>`
  }

  svg += `\n  </g>

  <!-- Title -->
  <text x="600" y="30" text-anchor="middle" fill="#61dafb" font-size="24" font-family="monospace" filter="url(#glow)">
    Pure Lambda - Living Repository
  </text>

  <!-- Edges -->\n`

  // Draw edges with curves
  lvg.edges.forEach(edge => {
    const src = nodePositions.get(edge.src)
    const dst = nodePositions.get(edge.dst)
    if (src && dst) {
      const color = edge.rel === 'calls' ? '#61dafb' :
                   edge.rel === 'imports' ? '#666' :
                   edge.rel === 'refines' ? '#9333ea' : '#10b981'

      // Calculate curve
      const cx = (src.x + dst.x) / 2
      const cy = (src.y + dst.y) / 2 - 20

      svg += `  <path d="M ${src.x},${src.y} Q ${cx},${cy} ${dst.x},${dst.y}"
         stroke="${color}" stroke-width="2" fill="none" opacity="0.6"/>\n`
    }
  })

  svg += `
  <!-- Nodes -->\n`

  // Draw nodes
  Array.from(nodePositions.values()).forEach(({ x, y, node }) => {
    const colors = {
      module: '#3178c6',
      fn: '#61dafb',
      type: '#692b7c',
      concept: '#10b981',
      asset: '#f59e0b',
      resource: '#666'
    }
    const color = colors[node.kind] || '#666'

    const size = Math.min(50, 10 + Math.sqrt(node.attrs.get('size') / 100))

    svg += `  <g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)})">
    <circle r="${size}" fill="${color}" stroke="#fff" stroke-width="2" opacity="0.9" filter="url(#glow)"/>
    <text y="5" text-anchor="middle" fill="#fff" font-size="10" font-family="monospace">
      ${node.attrs.get('name').slice(0, 15)}
    </text>
    <text y="18" text-anchor="middle" fill="#aaa" font-size="8" font-family="monospace">
      ${node.attrs.get('lines')} lines
    </text>
  </g>\n`
  })

  // Stats
  const moduleCount = lvg.nodes.filter(n => n.kind === 'module').length
  const conceptCount = lvg.nodes.filter(n => n.kind === 'concept').length
  const totalLines = lvg.nodes.reduce((sum, n) => sum + (n.attrs.get('lines') || 0), 0)

  svg += `
  <!-- Legend -->
  <g transform="translate(50, 700)">
    <rect x="-10" y="-20" width="300" height="80" fill="#000" opacity="0.5" rx="5"/>

    <circle cx="0" cy="0" r="8" fill="#3178c6"/>
    <text x="15" y="4" fill="#fff" font-size="11" font-family="monospace">Module (${moduleCount})</text>

    <circle cx="100" cy="0" r="8" fill="#10b981"/>
    <text x="115" y="4" fill="#fff" font-size="11" font-family="monospace">Concept (${conceptCount})</text>

    <circle cx="200" cy="0" r="8" fill="#f59e0b"/>
    <text x="215" y="4" fill="#fff" font-size="11" font-family="monospace">Asset</text>

    <text x="0" y="25" fill="#666" font-size="10" font-family="monospace">
      Total: ${lvg.nodes.length} nodes | ${lvg.edges.length} edges | ${totalLines} lines
    </text>
    <text x="0" y="40" fill="#666" font-size="9" font-family="monospace">
      Generated: ${new Date().toLocaleString()}
    </text>
  </g>
</svg>`

  return svg
}

// Main
console.log('🔮 Analyzing Pure Lambda repository...\n')

const rootPath = process.cwd()
const { nodes, edges } = scanRepository(rootPath)

const lvg = {
  version: '1.0.0',
  nodes,
  edges,
  metadata: {
    repo_cid: crypto.randomBytes(16).toString('hex'),
    timestamp: Date.now(),
    lang: 'typescript',
    deterministic: false
  }
}

console.log('📊 Repository Analysis:')
console.log(`  📁 Nodes: ${nodes.length}`)
console.log(`  🔗 Edges: ${edges.length}`)
console.log(`  📄 Modules: ${nodes.filter(n => n.kind === 'module').length}`)
console.log(`  💭 Concepts: ${nodes.filter(n => n.kind === 'concept').length}`)

const svg = generateEnhancedSVG(lvg)

// Save outputs
const outDir = 'demo-output'
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

const svgPath = path.join(outDir, 'real-repo.svg')
fs.writeFileSync(svgPath, svg)
console.log(`\n✅ SVG saved to: ${svgPath}`)

const jsonPath = path.join(outDir, 'real-repo-lvg.json')
fs.writeFileSync(jsonPath, JSON.stringify(lvg, (key, value) => {
  if (value instanceof Map) {
    return Object.fromEntries(value)
  }
  return value
}, 2))
console.log(`📦 LVG saved to: ${jsonPath}`)

// Enhanced HTML viewer
const html = `<!DOCTYPE html>
<html>
<head>
  <title>Pure Lambda - Repository Visualization</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
      color: #fff;
      font-family: 'Courier New', monospace;
      overflow: hidden;
    }
    .container {
      display: flex;
      height: 100vh;
    }
    .sidebar {
      width: 300px;
      background: rgba(0,0,0,0.5);
      padding: 20px;
      overflow-y: auto;
    }
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    h1 {
      color: #61dafb;
      margin-bottom: 20px;
      text-shadow: 0 0 20px rgba(97, 218, 251, 0.5);
    }
    .stats {
      margin: 20px 0;
    }
    .stat {
      padding: 10px;
      margin: 5px 0;
      background: rgba(255,255,255,0.05);
      border-radius: 5px;
      border-left: 3px solid #61dafb;
    }
    .svg-wrapper {
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(97, 218, 251, 0.3);
      border-radius: 10px;
      padding: 10px;
      box-shadow: 0 0 30px rgba(97, 218, 251, 0.2);
    }
    .controls {
      margin-top: 20px;
      text-align: center;
    }
    button {
      background: #61dafb;
      color: #000;
      border: none;
      padding: 10px 20px;
      margin: 0 5px;
      border-radius: 5px;
      cursor: pointer;
      font-family: monospace;
      font-weight: bold;
    }
    button:hover {
      background: #4fa8c5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="sidebar">
      <h2 style="color: #61dafb; margin-bottom: 20px;">Pure Lambda</h2>
      <div class="stats">
        <div class="stat">
          <strong>Nodes:</strong> ${nodes.length}
        </div>
        <div class="stat">
          <strong>Edges:</strong> ${edges.length}
        </div>
        <div class="stat">
          <strong>Modules:</strong> ${nodes.filter(n => n.kind === 'module').length}
        </div>
        <div class="stat">
          <strong>Concepts:</strong> ${nodes.filter(n => n.kind === 'concept').length}
        </div>
        <div class="stat">
          <strong>Total Lines:</strong> ${nodes.reduce((sum, n) => sum + (n.attrs.get('lines') || 0), 0)}
        </div>
      </div>
      <hr style="border: 1px solid #333; margin: 20px 0;">
      <h3 style="color: #61dafb; margin-bottom: 10px;">Files</h3>
      <div style="max-height: 400px; overflow-y: auto;">
        ${nodes.slice(0, 20).map(n => `
          <div style="padding: 5px; margin: 2px 0; background: rgba(255,255,255,0.05); border-radius: 3px; font-size: 11px;">
            ${n.attrs.get('path')}
          </div>
        `).join('')}
      </div>
    </div>
    <div class="main">
      <h1>🔮 Repository Living Graph</h1>
      <div class="svg-wrapper">
        ${svg}
      </div>
      <div class="controls">
        <button onclick="location.reload()">🔄 Refresh</button>
        <button onclick="window.open('real-repo-lvg.json')">📦 View JSON</button>
        <button onclick="downloadSVG()">💾 Download SVG</button>
      </div>
    </div>
  </div>
  <script>
    function downloadSVG() {
      const svg = document.querySelector('svg').outerHTML;
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pure-lambda-graph.svg';
      a.click();
    }
  </script>
</body>
</html>`

const htmlPath = path.join(outDir, 'real-repo.html')
fs.writeFileSync(htmlPath, html)
console.log(`🌐 Interactive viewer saved to: ${htmlPath}`)

console.log('\n' + '='.repeat(60))
console.log('✨ Analysis complete!')
console.log(`📈 Open ${htmlPath} to explore`)
console.log('='.repeat(60) + '\n')