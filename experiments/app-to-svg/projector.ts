/**
 * TypeScript → SVG Projector
 * Analyzes TypeScript/JavaScript repos and projects them to SVG space
 */

import * as ts from 'typescript'
import * as fs from 'fs'
import * as path from 'path'
import { createHash } from 'crypto'
import { projectFileSystem, SVG } from './pure-functions'

interface FileInfo {
  path: string
  size: number
  type: string
  depth: number
  complexity?: number
  hasTests?: boolean
  hash?: string
}

interface Import {
  source: string
  target: string
  type: 'static' | 'dynamic'
  frequency?: number
}

interface Repository {
  files: FileInfo[]
  imports: Import[]
  metadata: {
    name: string
    language: string
    framework?: string
    testCoverage?: number
  }
}

// ============== ANALYSIS FUNCTIONS ==============

/**
 * Analyze TypeScript/JavaScript repository
 */
export function analyzeRepository(rootPath: string): Repository {
  const files: FileInfo[] = []
  const imports: Import[] = []
  const fileMap = new Map<string, FileInfo>()

  // Recursively scan directory
  function scanDirectory(dirPath: string, depth: number = 0) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      const relativePath = path.relative(rootPath, fullPath)

      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue
        }
        scanDirectory(fullPath, depth + 1)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1)
        if (['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'md'].includes(ext)) {
          const stats = fs.statSync(fullPath)
          const content = fs.readFileSync(fullPath, 'utf-8')

          const fileInfo: FileInfo = {
            path: relativePath,
            size: stats.size,
            type: ext,
            depth,
            hasTests: entry.name.includes('.test.') || entry.name.includes('.spec.'),
            hash: createHash('sha256').update(content).digest('hex').slice(0, 8)
          }

          // Analyze complexity for code files
          if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
            fileInfo.complexity = analyzeComplexity(content, ext)
            analyzeImports(content, relativePath, imports)
          }

          files.push(fileInfo)
          fileMap.set(relativePath, fileInfo)
        }
      }
    }
  }

  scanDirectory(rootPath)

  // Detect framework
  const packageJsonPath = path.join(rootPath, 'package.json')
  let framework: string | undefined
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    if (pkg.dependencies?.react || pkg.devDependencies?.react) {
      framework = 'react'
    } else if (pkg.dependencies?.vue || pkg.devDependencies?.vue) {
      framework = 'vue'
    } else if (pkg.dependencies?.angular || pkg.devDependencies?.angular) {
      framework = 'angular'
    }
  }

  return {
    files,
    imports,
    metadata: {
      name: path.basename(rootPath),
      language: 'typescript',
      framework
    }
  }
}

/**
 * Analyze cyclomatic complexity
 */
function analyzeComplexity(content: string, fileType: string): number {
  let complexity = 1 // Base complexity

  // Count decision points
  const patterns = [
    /\bif\b/g,
    /\belse\b/g,
    /\bwhile\b/g,
    /\bfor\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\?\s*:/g, // Ternary operator
    /&&/g,     // Logical AND
    /\|\|/g    // Logical OR
  ]

  patterns.forEach(pattern => {
    const matches = content.match(pattern)
    if (matches) {
      complexity += matches.length
    }
  })

  // Adjust for file size
  const lines = content.split('\n').length
  return Math.round(complexity * (1 + lines / 1000))
}

/**
 * Analyze imports in a file
 */
function analyzeImports(content: string, sourcePath: string, imports: Import[]) {
  // Static imports
  const staticImportRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g
  let match

  while ((match = staticImportRegex.exec(content)) !== null) {
    const targetPath = resolveImportPath(sourcePath, match[1])
    if (targetPath) {
      imports.push({
        source: sourcePath,
        target: targetPath,
        type: 'static'
      })
    }
  }

  // Dynamic imports
  const dynamicImportRegex = /import\s*\(['"]([^'"]+)['"]\)/g
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    const targetPath = resolveImportPath(sourcePath, match[1])
    if (targetPath) {
      imports.push({
        source: sourcePath,
        target: targetPath,
        type: 'dynamic'
      })
    }
  }

  // CommonJS requires
  const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g
  while ((match = requireRegex.exec(content)) !== null) {
    const targetPath = resolveImportPath(sourcePath, match[1])
    if (targetPath) {
      imports.push({
        source: sourcePath,
        target: targetPath,
        type: 'static'
      })
    }
  }
}

/**
 * Resolve import path to actual file
 */
function resolveImportPath(sourcePath: string, importPath: string): string | null {
  // Skip external modules
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null
  }

  const sourceDir = path.dirname(sourcePath)
  let resolvedPath = path.join(sourceDir, importPath)

  // Remove leading slash if present
  if (resolvedPath.startsWith('/')) {
    resolvedPath = resolvedPath.slice(1)
  }

  // Try different extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '']
  for (const ext of extensions) {
    const testPath = resolvedPath + ext
    if (testPath) {
      return testPath
    }
  }

  return null
}

// ============== SVG GENERATION ==============

/**
 * Generate SVG string from projection
 */
export function generateSVG(svg: SVG): string {
  const width = 1200
  const height = 800

  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .node { cursor: pointer; transition: all 0.3s; }
      .node:hover { transform: scale(1.1); }
      .edge { stroke-width: 2; fill: none; opacity: 0.6; }
      .label { font-family: monospace; font-size: 12px; }
      .memoized { stroke: #10b981; stroke-width: 3; stroke-dasharray: 5,5; }
      .dead-code { opacity: 0.3; }
      .complex { fill: #ef4444 !important; }
    </style>

    <!-- Gradients for edges -->
    <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#666;stop-opacity:0.2" />
      <stop offset="100%" style="stop-color:#666;stop-opacity:0.8" />
    </linearGradient>

    <!-- Shadow filter -->
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="2" dy="2" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.5"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#f9fafb"/>

  <!-- Grid -->
  <g opacity="0.1">
    ${Array.from({ length: width / 50 }, (_, i) =>
      `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="${height}" stroke="#666"/>`
    ).join('\n    ')}
    ${Array.from({ length: height / 50 }, (_, i) =>
      `<line x1="0" y1="${i * 50}" x2="${width}" y2="${i * 50}" stroke="#666"/>`
    ).join('\n    ')}
  </g>

  <!-- Edges -->
  <g id="edges">
    ${svg.edges.map(edge => {
      const fromNode = svg.nodes.find(n => n.id === edge.from)
      const toNode = svg.nodes.find(n => n.id === edge.to)
      if (!fromNode || !toNode) return ''

      // Calculate edge path with curve
      const dx = toNode.x - fromNode.x
      const dy = toNode.y - fromNode.y
      const dr = Math.sqrt(dx * dx + dy * dy)

      return `<path
      d="M ${fromNode.x},${fromNode.y} A ${dr},${dr} 0 0,1 ${toNode.x},${toNode.y}"
      class="edge"
      stroke="${edge.stroke === 'dashed' ? '#ef4444' : '#666'}"
      stroke-dasharray="${edge.stroke === 'dashed' ? '5,5' : '0'}"
      marker-end="url(#arrowhead)"
    />`
    }).join('\n    ')}
  </g>

  <!-- Arrow marker -->
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
    </marker>
  </defs>

  <!-- Nodes -->
  <g id="nodes">
    ${svg.nodes.map(node => {
      const isMemoized = node.attributes.get('memoized') === 'true'
      const complexity = parseInt(node.attributes.get('complexity') || '0')
      const isComplex = complexity > 10

      return `<g transform="translate(${node.x}, ${node.y})" class="node">
      <circle
        r="${node.r}"
        fill="${isComplex ? '#ef4444' : node.fill}"
        filter="url(#shadow)"
        class="${isMemoized ? 'memoized' : ''}"
      />
      <text class="label" text-anchor="middle" dy=".3em" fill="white">
        ${path.basename(node.id).slice(0, 10)}
      </text>
      ${complexity > 0 ? `<text class="label" text-anchor="middle" dy="1.5em" fill="white" font-size="10">
        ${complexity}
      </text>` : ''}
    </g>`
    }).join('\n    ')}
  </g>

  <!-- Temporal layers -->
  ${svg.layers.map((layer, i) => `
  <g id="layer-${layer.id}" opacity="${layer.opacity}" transform="${layer.transform}">
    <rect x="10" y="${10 + i * 20}" width="100" height="15" fill="#666" opacity="0.2"/>
    <text x="15" y="${20 + i * 20}" class="label" font-size="10">Layer ${layer.id}</text>
  </g>
  `).join('')}

  <!-- Legend -->
  <g transform="translate(${width - 150}, 20)">
    <rect width="140" height="120" fill="white" stroke="#666" opacity="0.9"/>
    <text x="10" y="20" class="label" font-weight="bold">Legend</text>
    <circle cx="20" cy="40" r="5" fill="#3178c6"/>
    <text x="30" y="45" class="label">TypeScript</text>
    <circle cx="20" cy="60" r="5" fill="#f0db4f"/>
    <text x="30" y="65" class="label">JavaScript</text>
    <circle cx="20" cy="80" r="5" fill="#61dafb"/>
    <text x="30" y="85" class="label">React/JSX</text>
    <line x1="10" y1="100" x2="30" y2="100" stroke="#666" stroke-dasharray="5,5"/>
    <text x="35" y="105" class="label">Dynamic</text>
  </g>
</svg>`

  return svgContent
}

// ============== MAIN PROJECTOR ==============

/**
 * Project repository to SVG
 */
export function projectRepository(repoPath: string): { svg: SVG, raw: string } {
  console.log(`Analyzing repository: ${repoPath}`)

  const repo = analyzeRepository(repoPath)
  console.log(`Found ${repo.files.length} files and ${repo.imports.length} imports`)

  const svg = projectFileSystem(repo)
  console.log(`Generated SVG with ${svg.nodes.length} nodes and ${svg.edges.length} edges`)

  const svgString = generateSVG(svg)

  return {
    svg,
    raw: svgString
  }
}

// ============== CLI INTERFACE ==============

if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: ts-node projector.ts <repository-path> [output-file]')
    process.exit(1)
  }

  const repoPath = args[0]
  const outputPath = args[1] || 'output.svg'

  if (!fs.existsSync(repoPath)) {
    console.error(`Repository path does not exist: ${repoPath}`)
    process.exit(1)
  }

  try {
    const { svg, raw } = projectRepository(repoPath)

    fs.writeFileSync(outputPath, raw)
    console.log(`SVG saved to ${outputPath}`)

    // Also save JSON representation
    const jsonPath = outputPath.replace('.svg', '.json')
    fs.writeFileSync(jsonPath, JSON.stringify(svg, null, 2))
    console.log(`JSON saved to ${jsonPath}`)

  } catch (error) {
    console.error('Error projecting repository:', error)
    process.exit(1)
  }
}