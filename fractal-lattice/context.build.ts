#!/usr/bin/env node
/**
 * Build FCA context from receipts
 * Output: context.jsonl (binary matrix O×A)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

// Collect all receipts
const receiptsDir = '.pl-studio/receipts'
const outputFile = 'fractal-lattice/context.jsonl'

interface Receipt {
  id?: string
  cid?: string
  type?: string
  kind?: string
  command?: string
  execution?: any
  oracle?: Record<string, boolean>
  proof?: Record<string, boolean>
  stats?: any
  name?: string
  seed?: string
  hash?: string
}

interface ContextRow {
  object: string  // Receipt CID
  attributes: Set<string>
}

function extractAttributes(receipt: Receipt): Set<string> {
  const attrs = new Set<string>()

  // Type/kind attributes
  if (receipt.type) attrs.add(`type:${receipt.type}`)
  if (receipt.kind) attrs.add(`kind:${receipt.kind}`)

  // Oracle attributes (side effects)
  if (receipt.oracle) {
    for (const [key, value] of Object.entries(receipt.oracle)) {
      if (value) attrs.add(`oracle:${key}`)
      else attrs.add(`oracle:no_${key}`)
    }
  }

  // Proof attributes
  if (receipt.proof) {
    for (const [key, value] of Object.entries(receipt.proof)) {
      if (value) attrs.add(`proof:${key}`)
    }
  }

  // Execution attributes
  if (receipt.execution) {
    if (receipt.execution.success) attrs.add('exec:success')
    else attrs.add('exec:failure')

    if (receipt.execution.time_ms) {
      const time = receipt.execution.time_ms
      if (time < 10) attrs.add('speed:fast')
      else if (time < 100) attrs.add('speed:medium')
      else attrs.add('speed:slow')
    }
  }

  // Stats attributes
  if (receipt.stats) {
    if (receipt.stats.cache_rate > 0.8) attrs.add('cache:high')
    else if (receipt.stats.cache_rate > 0.5) attrs.add('cache:medium')
    else if (receipt.stats.cache_rate >= 0) attrs.add('cache:low')
  }

  // Seed attribute
  if (receipt.seed === 'auto') attrs.add('seed:auto')
  else if (receipt.seed) attrs.add('seed:custom')

  // Hash existence
  if (receipt.hash) attrs.add('has:hash')
  if (receipt.cid) attrs.add('has:cid')

  return attrs
}

function buildContext() {
  const context: ContextRow[] = []

  if (!existsSync(receiptsDir)) {
    console.log('No receipts directory found. Generating sample receipts...')

    // Generate sample receipts for demonstration
    const sampleReceipts: Receipt[] = [
      {
        cid: 'sample-001',
        type: 'proof',
        oracle: { env: false, fs: false, net: false },
        proof: { deterministic: true, side_effect_free: true },
        execution: { success: true, time_ms: 5 }
      },
      {
        cid: 'sample-002',
        type: 'proof',
        oracle: { env: false, fs: true, net: false },
        proof: { deterministic: false, side_effect_free: false },
        execution: { success: false, time_ms: 150 }
      },
      {
        cid: 'sample-003',
        kind: 'pcta-exec',
        oracle: { env: false, fs: false, net: false },
        proof: { deterministic: true, memoization_safe: true },
        stats: { cache_rate: 0.914 },
        execution: { success: true, time_ms: 2 }
      },
      {
        cid: 'sample-004',
        kind: 'pcta-summary',
        stats: { cache_rate: 0.3 },
        seed: 'auto'
      },
      {
        cid: 'sample-005',
        type: 'proof',
        oracle: { env: true, fs: false, net: true },
        proof: { deterministic: false },
        execution: { success: false, time_ms: 500 }
      }
    ]

    for (const receipt of sampleReceipts) {
      const attrs = extractAttributes(receipt)
      context.push({
        object: receipt.cid || 'unknown',
        attributes: attrs
      })
    }
  } else {
    // Read actual receipts
    const files = readdirSync(receiptsDir).filter(f => f.endsWith('.json'))

    for (const file of files) {
      try {
        const receipt = JSON.parse(readFileSync(join(receiptsDir, file), 'utf-8'))
        const attrs = extractAttributes(receipt)
        const cid = receipt.cid || receipt.id || file.replace('.json', '')

        context.push({
          object: cid,
          attributes: attrs
        })
      } catch (error) {
        console.error(`Failed to parse ${file}:`, error)
      }
    }
  }

  // Write context as JSONL
  const lines = context.map(row => JSON.stringify({
    object: row.object,
    attributes: Array.from(row.attributes).sort()
  }))

  writeFileSync(outputFile, lines.join('\n'))

  // Summary
  const allAttributes = new Set<string>()
  for (const row of context) {
    for (const attr of row.attributes) {
      allAttributes.add(attr)
    }
  }

  console.log(`Context built:`)
  console.log(`  Objects (receipts): ${context.length}`)
  console.log(`  Attributes: ${allAttributes.size}`)
  console.log(`  Output: ${outputFile}`)

  return { context, allAttributes: Array.from(allAttributes).sort() }
}

// Run if called directly
if (require.main === module) {
  buildContext()
}

export { buildContext }