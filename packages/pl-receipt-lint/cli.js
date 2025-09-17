#!/usr/bin/env node

/**
 * pl-receipt-lint - Receipt Validator and Linter
 *
 * Validates receipts against schema and checks for issues
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const SCHEMA = {
  required: ['type', 'timestamp', 'proof', 'cid'],
  types: {
    type: 'string',
    timestamp: 'number',
    proof: 'object',
    cid: 'string'
  },
  proof_required: ['equivalence']
}

/**
 * Validate single receipt
 */
function validateReceipt(receipt, filepath) {
  const errors = []
  const warnings = []

  // Check required fields
  for (const field of SCHEMA.required) {
    if (!(field in receipt)) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  // Check types
  for (const [field, expectedType] of Object.entries(SCHEMA.types)) {
    if (field in receipt) {
      const actualType = typeof receipt[field]
      if (actualType !== expectedType) {
        errors.push(`Invalid type for ${field}: expected ${expectedType}, got ${actualType}`)
      }
    }
  }

  // Validate proof
  if (receipt.proof) {
    for (const field of SCHEMA.proof_required) {
      if (!(field in receipt.proof)) {
        errors.push(`Missing proof field: ${field}`)
      }
    }

    // Check proof validity
    if (receipt.proof.equivalence === false) {
      warnings.push('Equivalence not verified!')
    }

    if (receipt.proof.side_effect_free === false) {
      warnings.push('Side effects detected - optimization may be unsafe')
    }
  }

  // Validate CID
  if (receipt.cid) {
    if (!/^[a-f0-9]{64}$/.test(receipt.cid)) {
      errors.push(`Invalid CID format: ${receipt.cid}`)
    }

    // Recompute CID to verify
    const content = { ...receipt }
    delete content.cid
    const computed = crypto.createHash('sha256')
      .update(JSON.stringify(content))
      .digest('hex')

    if (computed !== receipt.cid) {
      warnings.push(`CID mismatch: computed ${computed.slice(0, 8)}... but got ${receipt.cid.slice(0, 8)}...`)
    }
  }

  // Check stats
  if (receipt.stats) {
    if (receipt.stats.speedup && receipt.stats.speedup < 1) {
      warnings.push(`Speedup less than 1x (${receipt.stats.speedup}) - optimization made things slower!`)
    }

    if (receipt.stats.hit_rate && receipt.stats.hit_rate < 0.1) {
      warnings.push(`Very low cache hit rate (${(receipt.stats.hit_rate * 100).toFixed(1)}%)`)
    }
  }

  // Check timestamp
  if (receipt.timestamp) {
    const age = Date.now() - receipt.timestamp
    if (age > 86400000) { // 24 hours
      warnings.push(`Receipt is ${(age / 3600000).toFixed(1)} hours old`)
    }
  }

  return { errors, warnings }
}

/**
 * Lint all receipts in directory
 */
function lintDirectory(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))

  const results = {
    total: files.length,
    valid: 0,
    invalid: 0,
    warnings: 0,
    errors: [],
    stats: {
      avg_speedup: 0,
      avg_hit_rate: 0,
      total_calls: 0,
      total_hits: 0
    }
  }

  for (const file of files) {
    const filepath = path.join(dir, file)
    let receipt

    try {
      receipt = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
    } catch (e) {
      results.errors.push(`Failed to parse ${file}: ${e.message}`)
      results.invalid++
      continue
    }

    const { errors, warnings } = validateReceipt(receipt, filepath)

    if (errors.length > 0) {
      results.invalid++
      results.errors.push(`${file}: ${errors.join(', ')}`)
    } else {
      results.valid++
    }

    if (warnings.length > 0) {
      results.warnings++
      console.warn(`⚠️  ${file}: ${warnings.join(', ')}`)
    }

    // Collect stats
    if (receipt.stats) {
      if (receipt.stats.speedup) {
        results.stats.avg_speedup += receipt.stats.speedup
      }
      if (receipt.stats.hit_rate) {
        results.stats.avg_hit_rate += receipt.stats.hit_rate
      }
      if (receipt.stats.total_calls) {
        results.stats.total_calls += receipt.stats.total_calls
      }
      if (receipt.stats.cache_hits) {
        results.stats.total_hits += receipt.stats.cache_hits
      }
    }
  }

  // Calculate averages
  if (results.valid > 0) {
    results.stats.avg_speedup /= results.valid
    results.stats.avg_hit_rate /= results.valid
  }

  return results
}

/**
 * Format results as markdown
 */
function formatResults(results) {
  const status = results.invalid === 0 ? '✅' : '❌'
  const hitRate = (results.stats.avg_hit_rate * 100).toFixed(1)
  const speedup = results.stats.avg_speedup.toFixed(2)

  let output = `# Receipt Lint Report ${status}\n\n`
  output += `| Metric | Value |\n`
  output += `|--------|-------|\n`
  output += `| Total Receipts | ${results.total} |\n`
  output += `| Valid | ${results.valid} |\n`
  output += `| Invalid | ${results.invalid} |\n`
  output += `| Warnings | ${results.warnings} |\n`
  output += `| Avg Speedup | ${speedup}x |\n`
  output += `| Avg Hit Rate | ${hitRate}% |\n`
  output += `| Total Calls | ${results.stats.total_calls} |\n`
  output += `| Cache Hits | ${results.stats.total_hits} |\n`

  if (results.errors.length > 0) {
    output += `\n## Errors\n\n`
    results.errors.forEach(err => {
      output += `- ${err}\n`
    })
  }

  return output
}

/**
 * Generate badge
 */
function generateBadge(results) {
  const valid = results.invalid === 0
  const color = valid ? 'brightgreen' : 'red'
  const status = valid ? 'passing' : 'failing'

  return `![Receipt Validation](https://img.shields.io/badge/receipts-${status}-${color})`
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: pl-receipt-lint <directory>')
    console.log('       pl-receipt-lint <receipt.json>')
    process.exit(1)
  }

  const target = args[0]
  const stats = fs.statSync(target)

  if (stats.isDirectory()) {
    // Lint directory
    const results = lintDirectory(target)

    console.log(formatResults(results))
    console.log(`\nBadge: ${generateBadge(results)}`)

    // Exit code
    process.exit(results.invalid > 0 ? 1 : 0)

  } else {
    // Lint single file
    const receipt = JSON.parse(fs.readFileSync(target, 'utf-8'))
    const { errors, warnings } = validateReceipt(receipt, target)

    if (errors.length > 0) {
      console.error('❌ Errors:')
      errors.forEach(e => console.error(`  - ${e}`))
    }

    if (warnings.length > 0) {
      console.warn('⚠️  Warnings:')
      warnings.forEach(w => console.warn(`  - ${w}`))
    }

    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ Receipt is valid!')
    }

    process.exit(errors.length > 0 ? 1 : 0)
  }
}

module.exports = { validateReceipt, lintDirectory, formatResults, generateBadge }