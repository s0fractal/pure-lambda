#!/usr/bin/env node

/**
 * lvg-watch: Reactive LVG daemon with live updates
 */

import * as fs from 'fs'
import * as path from 'path'
import * as chokidar from 'chokidar'
import * as WebSocket from 'ws'
import * as http from 'http'
import { program } from 'commander'
import { TypeScriptAdapter } from '../lvg/adapters/typescript'
import { LVG, LVGPatch } from '../lvg/types'
import { generateSVGx, applyPatch } from '../viz/svgx/generator'

// CLI setup
program
  .name('lvg-watch')
  .description('Watch repository and stream LVG updates')
  .version('1.0.0')
  .argument('<repo>', 'Repository path')
  .option('-l, --lang <language>', 'Source language', 'ts')
  .option('-p, --port <port>', 'WebSocket port', '7007')
  .option('--serve', 'Serve viewer UI')
  .option('-v, --verbose', 'Verbose output')
  .action(main)

class LVGDaemon {
  private lvg: LVG
  private wss: WebSocket.Server
  private watcher: chokidar.FSWatcher
  private clients: Set<WebSocket> = new Set()
  private patchHistory: LVGPatch[] = []
  private adapter: any

  constructor(
    private repoPath: string,
    private lang: string,
    private port: number,
    private verbose: boolean
  ) {
    this.adapter = this.getAdapter(lang)
  }

  async start() {
    console.log('🚀 LVG Watch v1.0.0')
    console.log('===================')

    // Initial build
    await this.buildInitialLVG()

    // Start WebSocket server
    this.startWebSocketServer()

    // Start file watcher
    this.startFileWatcher()

    console.log(`\n👁️ Watching ${this.repoPath}`)
    console.log(`🔌 WebSocket on ws://localhost:${this.port}`)
    console.log(`📊 ${this.lvg.nodes.length} nodes, ${this.lvg.edges.length} edges`)
    console.log('\nPress Ctrl+C to stop')
  }

  private async buildInitialLVG() {
    if (this.verbose) console.log('Building initial LVG...')

    const files = await this.scanRepository()
    const nodes = new Map<string, any>()
    const edges: any[] = []

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf-8')
      const fileLVG = this.adapter.parse(source, file)

      for (const node of fileLVG.nodes) {
        nodes.set(node.id, node)
      }
      edges.push(...fileLVG.edges)
    }

    this.lvg = {
      version: '1.0.0',
      nodes: Array.from(nodes.values()),
      edges,
      metadata: {
        repo_cid: await this.computeRepoCID(),
        timestamp: Date.now(),
        lang: this.lang,
        deterministic: false // Reactive mode
      }
    }
  }

  private async scanRepository(): Promise<string[]> {
    const files: string[] = []
    const extensions = this.getExtensions()

    function scan(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
            continue
          }
          scan(fullPath)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name)
          if (extensions.includes(ext)) {
            files.push(fullPath)
          }
        }
      }
    }

    scan(this.repoPath)
    return files
  }

  private getExtensions(): string[] {
    switch (this.lang) {
      case 'ts':
      case 'typescript':
        return ['.ts', '.tsx', '.js', '.jsx']
      default:
        return ['.ts', '.js']
    }
  }

  private getAdapter(lang: string): any {
    switch (lang) {
      case 'ts':
      case 'typescript':
        return new TypeScriptAdapter()
      default:
        return new TypeScriptAdapter()
    }
  }

  private async computeRepoCID(): Promise<string> {
    // Simplified for reactive mode
    return `reactive-${Date.now()}`
  }

  private startWebSocketServer() {
    this.wss = new WebSocket.Server({ port: this.port })

    this.wss.on('connection', (ws) => {
      if (this.verbose) console.log('Client connected')

      this.clients.add(ws)

      // Send initial state
      ws.send(JSON.stringify({
        type: 'initial',
        lvg: this.lvg,
        patches: this.patchHistory
      }))

      ws.on('close', () => {
        this.clients.delete(ws)
        if (this.verbose) console.log('Client disconnected')
      })

      ws.on('error', (err) => {
        console.error('WebSocket error:', err)
        this.clients.delete(ws)
      })
    })
  }

  private startFileWatcher() {
    const extensions = this.getExtensions()
    const pattern = `**/*{${extensions.join(',')}}`

    this.watcher = chokidar.watch(pattern, {
      cwd: this.repoPath,
      ignored: ['**/node_modules/**', '**/.git/**'],
      persistent: true,
      ignoreInitial: true
    })

    this.watcher
      .on('add', (file) => this.handleFileAdd(file))
      .on('change', (file) => this.handleFileChange(file))
      .on('unlink', (file) => this.handleFileRemove(file))
  }

  private async handleFileAdd(file: string) {
    if (this.verbose) console.log(`Added: ${file}`)

    const fullPath = path.join(this.repoPath, file)
    const source = fs.readFileSync(fullPath, 'utf-8')
    const fileLVG = this.adapter.parse(source, fullPath)

    const patch: LVGPatch = {
      type: 'add',
      timestamp: Date.now(),
      operations: []
    }

    // Add new nodes
    for (const node of fileLVG.nodes) {
      if (!this.lvg.nodes.find(n => n.id === node.id)) {
        this.lvg.nodes.push(node)
        patch.operations.push({
          op: 'addNode',
          node
        })
      }
    }

    // Add new edges
    for (const edge of fileLVG.edges) {
      if (!this.lvg.edges.find(e =>
        e.src === edge.src && e.dst === edge.dst && e.rel === edge.rel
      )) {
        this.lvg.edges.push(edge)
        patch.operations.push({
          op: 'addEdge',
          edge
        })
      }
    }

    this.broadcastPatch(patch)
  }

  private async handleFileChange(file: string) {
    if (this.verbose) console.log(`Changed: ${file}`)

    const fullPath = path.join(this.repoPath, file)
    const source = fs.readFileSync(fullPath, 'utf-8')
    const fileLVG = this.adapter.parse(source, fullPath)

    const patch: LVGPatch = {
      type: 'change',
      timestamp: Date.now(),
      operations: []
    }

    // Update existing nodes
    for (const newNode of fileLVG.nodes) {
      const existingIndex = this.lvg.nodes.findIndex(n => n.id === newNode.id)
      if (existingIndex >= 0) {
        const existing = this.lvg.nodes[existingIndex]

        // Check if attributes changed
        const changed = Array.from(newNode.attrs.entries()).some(([key, value]) =>
          existing.attrs.get(key) !== value
        )

        if (changed) {
          this.lvg.nodes[existingIndex] = newNode
          patch.operations.push({
            op: 'updateNode',
            node: newNode
          })
        }
      } else {
        // New node
        this.lvg.nodes.push(newNode)
        patch.operations.push({
          op: 'addNode',
          node: newNode
        })
      }
    }

    // Handle removed nodes
    const newNodeIds = new Set(fileLVG.nodes.map(n => n.id))
    const fileNodes = this.lvg.nodes.filter(n =>
      n.attrs.get('path') === fullPath
    )

    for (const node of fileNodes) {
      if (!newNodeIds.has(node.id)) {
        const index = this.lvg.nodes.findIndex(n => n.id === node.id)
        if (index >= 0) {
          this.lvg.nodes.splice(index, 1)
          patch.operations.push({
            op: 'removeNode',
            nodeId: node.id
          })
        }
      }
    }

    this.broadcastPatch(patch)
  }

  private async handleFileRemove(file: string) {
    if (this.verbose) console.log(`Removed: ${file}`)

    const fullPath = path.join(this.repoPath, file)
    const patch: LVGPatch = {
      type: 'remove',
      timestamp: Date.now(),
      operations: []
    }

    // Remove nodes from this file
    const fileNodes = this.lvg.nodes.filter(n =>
      n.attrs.get('path') === fullPath
    )

    for (const node of fileNodes) {
      const index = this.lvg.nodes.findIndex(n => n.id === node.id)
      if (index >= 0) {
        this.lvg.nodes.splice(index, 1)
        patch.operations.push({
          op: 'removeNode',
          nodeId: node.id
        })
      }

      // Remove edges involving this node
      this.lvg.edges = this.lvg.edges.filter(e =>
        e.src !== node.id && e.dst !== node.id
      )
    }

    this.broadcastPatch(patch)
  }

  private broadcastPatch(patch: LVGPatch) {
    if (patch.operations.length === 0) return

    this.patchHistory.push(patch)

    const message = JSON.stringify({
      type: 'patch',
      patch
    })

    for (const client of this.clients) {
      try {
        client.send(message)
      } catch (err) {
        console.error('Failed to send patch:', err)
        this.clients.delete(client)
      }
    }

    if (this.verbose) {
      console.log(`Broadcast patch: ${patch.operations.length} operations`)
    }
  }

  async stop() {
    console.log('\n👋 Stopping LVG Watch...')

    this.watcher?.close()
    this.wss?.close()

    for (const client of this.clients) {
      client.close()
    }
  }
}

async function main(repoPath: string, options: any) {
  const daemon = new LVGDaemon(
    repoPath,
    options.lang,
    parseInt(options.port),
    options.verbose
  )

  // Handle shutdown
  process.on('SIGINT', async () => {
    await daemon.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await daemon.stop()
    process.exit(0)
  })

  // Start daemon
  await daemon.start()

  // Optionally serve viewer UI
  if (options.serve) {
    serveViewer(parseInt(options.port) + 1)
  }
}

function serveViewer(port: number) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>LVG Live Viewer</title>
  <style>
    body { margin: 0; font-family: monospace; background: #1e1e1e; color: #fff; }
    #status { position: fixed; top: 10px; right: 10px; padding: 5px 10px; background: #333; }
    #status.connected { background: #0f0; color: #000; }
    #svg-container { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="status">Connecting...</div>
  <div id="svg-container"></div>
  <script>
    const ws = new WebSocket('ws://localhost:${port - 1}')
    const status = document.getElementById('status')
    const container = document.getElementById('svg-container')

    ws.onopen = () => {
      status.textContent = 'Connected'
      status.classList.add('connected')
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'initial') {
        console.log('Initial LVG:', data.lvg)
        renderSVG(data.lvg)
      } else if (data.type === 'patch') {
        console.log('Patch:', data.patch)
        applyPatch(data.patch)
      }
    }

    ws.onerror = (err) => {
      status.textContent = 'Error'
      status.classList.remove('connected')
    }

    ws.onclose = () => {
      status.textContent = 'Disconnected'
      status.classList.remove('connected')
    }

    function renderSVG(lvg) {
      // Simplified SVG rendering
      const svg = createSVGFromLVG(lvg)
      container.innerHTML = svg
    }

    function applyPatch(patch) {
      // Apply incremental updates
      console.log('Applying patch with', patch.operations.length, 'operations')
    }

    function createSVGFromLVG(lvg) {
      // Basic SVG generation (simplified)
      return \`<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="800" fill="#2e2e2e"/>
        <text x="20" y="30" fill="#fff">Nodes: \${lvg.nodes.length}</text>
        <text x="20" y="50" fill="#fff">Edges: \${lvg.edges.length}</text>
      </svg>\`
    }
  </script>
</body>
</html>`

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(html)
  })

  server.listen(port, () => {
    console.log(`📺 Viewer at http://localhost:${port}`)
  })
}

// Run if called directly
if (require.main === module) {
  program.parse()
}