#!/usr/bin/env node

/**
 * lvg-pack: Precompile repository to deterministic LVG + SVGx
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { program } from 'commander'
import { TypeScriptAdapter } from '../lvg/adapters/typescript'
import { LVG } from '../lvg/types'
import { generateSVGx } from '../viz/svgx/generator'
import { createCAR } from '../ipld/car.js'

// CLI setup
program
  .name('lvg-pack')
  .description('Pack repository into deterministic LVG + SVGx')
  .version('1.0.0')
  .argument('<repo>', 'Repository path')
  .option('-l, --lang <language>', 'Source language', 'ts')
  .option('-o, --out <dir>', 'Output directory', 'dist/lvg')
  .option('-s, --seed <seed>', 'Layout seed (default: repo CID)')
  .option('-v, --verbose', 'Verbose output')
  .option('--verify', 'Verify determinism')
  .action(main)

async function main(repoPath: string, options: any) {
  const startTime = Date.now()

  if (options.verbose) {
    console.log('LVG Pack v1.0.0')
    console.log('================')
    console.log(`Repository: ${repoPath}`)
    console.log(`Language: ${options.lang}`)
    console.log(`Output: ${options.out}`)
  }

  // Step 1: Scan repository
  const files = await scanRepository(repoPath, options.lang)
  if (options.verbose) {
    console.log(`Found ${files.length} source files`)
  }

  // Step 2: Build LVG
  const lvg = await buildLVG(files, options.lang)
  if (options.verbose) {
    console.log(`Built LVG: ${lvg.nodes.length} nodes, ${lvg.edges.length} edges`)
  }

  // Step 3: Compute repo CID
  const repoCID = await computeRepoCID(repoPath)
  lvg.metadata.repo_cid = repoCID
  if (options.verbose) {
    console.log(`Repo CID: ${repoCID}`)
  }

  // Step 4: Generate SVGx
  const seed = options.seed || repoCID
  const svgx = await generateSVGx(lvg, seed)
  if (options.verbose) {
    console.log(`Generated SVGx with seed: ${seed}`)
  }

  // Step 5: Create outputs
  await createOutputs(lvg, svgx, options.out)

  // Step 6: Verify if requested
  if (options.verify) {
    const verified = await verifyDeterminism(repoPath, options)
    if (!verified) {
      console.error('❌ Determinism verification failed!')
      process.exit(1)
    }
    console.log('✅ Determinism verified')
  }

  const elapsed = Date.now() - startTime
  console.log(`✨ Packed in ${elapsed}ms`)
  console.log(`📦 ${options.out}/lvg.car`)
  console.log(`🎨 ${options.out}/svgx.snapshot.svg`)
  console.log(`🗺️ ${options.out}/map.json`)
}

async function scanRepository(repoPath: string, lang: string): Promise<string[]> {
  const files: string[] = []
  const extensions = getExtensions(lang)

  function scan(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
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

  scan(repoPath)
  return files.sort() // Sort for determinism
}

function getExtensions(lang: string): string[] {
  switch (lang) {
    case 'ts':
    case 'typescript':
      return ['.ts', '.tsx', '.js', '.jsx']
    case 'rust':
      return ['.rs']
    case 'python':
      return ['.py']
    case 'go':
      return ['.go']
    default:
      throw new Error(`Unsupported language: ${lang}`)
  }
}

async function buildLVG(files: string[], lang: string): Promise<LVG> {
  const adapter = getAdapter(lang)
  const nodes = new Map<string, any>()
  const edges: any[] = []

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf-8')
    const fileLVG = adapter.parse(source, file)

    // Merge nodes
    for (const node of fileLVG.nodes) {
      nodes.set(node.id, node)
    }

    // Merge edges
    edges.push(...fileLVG.edges)
  }

  // Canonicalize
  const sortedNodes = Array.from(nodes.values())
    .sort((a, b) => a.id.localeCompare(b.id))

  const sortedEdges = edges
    .sort((a, b) => {
      const srcCmp = a.src.localeCompare(b.src)
      if (srcCmp !== 0) return srcCmp
      const dstCmp = a.dst.localeCompare(b.dst)
      if (dstCmp !== 0) return dstCmp
      return a.rel.localeCompare(b.rel)
    })
    // Remove duplicates
    .filter((edge, i, arr) =>
      i === 0 || !(
        edge.src === arr[i - 1].src &&
        edge.dst === arr[i - 1].dst &&
        edge.rel === arr[i - 1].rel
      )
    )

  return {
    version: '1.0.0',
    nodes: sortedNodes,
    edges: sortedEdges,
    metadata: {
      repo_cid: '', // Will be filled later
      timestamp: Date.now(),
      lang,
      deterministic: true
    }
  }
}

function getAdapter(lang: string): any {
  switch (lang) {
    case 'ts':
    case 'typescript':
      return new TypeScriptAdapter()
    default:
      throw new Error(`No adapter for language: ${lang}`)
  }
}

async function computeRepoCID(repoPath: string): Promise<string> {
  const hash = crypto.createHash('blake3')

  // Hash all file contents in deterministic order
  const files: string[] = []

  function collect(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue
        }
        collect(fullPath)
      } else if (entry.isFile()) {
        files.push(fullPath)
      }
    }
  }

  collect(repoPath)
  files.sort()

  for (const file of files) {
    const content = fs.readFileSync(file)
    const relativePath = path.relative(repoPath, file)
    hash.update(relativePath)
    hash.update(content)
  }

  return hash.digest('hex').slice(0, 32)
}

async function createOutputs(lvg: LVG, svgx: string, outDir: string) {
  // Create output directory
  fs.mkdirSync(outDir, { recursive: true })

  // 1. Save LVG as CAR
  const carPath = path.join(outDir, 'lvg.car')
  const car = await createCAR(lvg)
  fs.writeFileSync(carPath, car)

  // 2. Save SVGx snapshot
  const svgPath = path.join(outDir, 'svgx.snapshot.svg')
  fs.writeFileSync(svgPath, svgx)

  // 3. Create mapping file
  const mapPath = path.join(outDir, 'map.json')
  const mapping = createMapping(lvg)
  fs.writeFileSync(mapPath, JSON.stringify(mapping, null, 2))
}

function createMapping(lvg: LVG): any {
  const map: any = {
    nodes: {},
    edges: []
  }

  for (const node of lvg.nodes) {
    map.nodes[node.id] = {
      name: node.attrs.get('name'),
      path: node.attrs.get('path'),
      kind: node.kind
    }
  }

  for (const edge of lvg.edges) {
    map.edges.push({
      src: edge.src,
      dst: edge.dst,
      rel: edge.rel
    })
  }

  return map
}

async function verifyDeterminism(repoPath: string, options: any): Promise<boolean> {
  // Run twice with same inputs
  const files = await scanRepository(repoPath, options.lang)

  const lvg1 = await buildLVG(files, options.lang)
  const lvg2 = await buildLVG(files, options.lang)

  // Compare serialized forms
  const json1 = JSON.stringify(lvg1, null, 2)
  const json2 = JSON.stringify(lvg2, null, 2)

  return json1 === json2
}

// Run if called directly
if (require.main === module) {
  program.parse()
}