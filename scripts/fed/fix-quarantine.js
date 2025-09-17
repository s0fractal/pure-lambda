#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Federation Quarantine Fixer
 *
 * Analyzes quarantine items and fixes those that can be safely resolved:
 * - If canonicalJson is byte-identical, mark as alias and remove from quarantine
 * - Provides diagnostics for items that need manual review
 *
 * Usage:
 *   node scripts/fed/fix-quarantine.js [--dry-run] [--verbose]
 */

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

const MANIFEST_PATH = 'dist/fed/manifest.json';
const INDEX_PATH = 'dist/fed/index.json';
const VAULT_DIR = 'vault/fed';

/**
 * Load JSON file with error handling
 */
function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`❌ Failed to load ${path}: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Load canonical JSON for a seed hash
 */
function loadSeedCanonical(hash) {
  const seedPath = join(VAULT_DIR, `${hash}.seed.json`);
  if (!existsSync(seedPath)) {
    throw new Error(`Seed file not found: ${seedPath}`);
  }

  const seedData = JSON.parse(readFileSync(seedPath, 'utf8'));
  const { canonicalize } = require('../../src/seed/canonical');
  return canonicalize(seedData);
}

/**
 * Compare canonical forms and check if they're byte-identical
 */
function compareCanonical(hash1, hash2, gidIndex, gid) {
  try {
    const canonical1 = loadSeedCanonical(hash1);
    const existingEntry = gidIndex[gid];

    if (!existingEntry) {
      return { identical: false, reason: 'NO_EXISTING_ENTRY' };
    }

    const canonical2 = existingEntry.canonicalJson;

    return {
      identical: canonical1 === canonical2,
      canonical1,
      canonical2,
      existingHash: existingEntry.hash,
      existingFile: existingEntry.file,
      existingAliases: existingEntry.aliases
    };
  } catch (error) {
    return {
      identical: false,
      reason: 'COMPARISON_ERROR',
      error: error.message
    };
  }
}

/**
 * Fix quarantine items that can be safely resolved
 */
function fixQuarantine(manifest, gidIndex, options = {}) {
  const { dryRun = false, verbose = false } = options;

  const results = {
    fixed: [],
    unfixable: [],
    errors: []
  };

  for (const item of manifest.quarantine) {
    if (verbose) {
      console.log(`\n🔍 Analyzing quarantine item: ${item.hash}`);
      console.log(`   Reason: ${item.reason}`);
      console.log(`   GID: ${item.gid || 'N/A'}`);
    }

    // Only attempt to fix GID_CANON_BUG items with a valid GID
    if (item.reason === 'GID_CANON_BUG' && item.gid) {
      try {
        const comparison = compareCanonical(item.hash, null, gidIndex, item.gid);

        if (comparison.identical) {
          // Canonical forms are byte-identical - can be marked as alias
          results.fixed.push({
            hash: item.hash,
            gid: item.gid,
            action: 'MARK_AS_ALIAS',
            existingHash: comparison.existingHash,
            existingAliases: comparison.existingAliases
          });

          if (verbose) {
            console.log(`   ✅ Can be fixed: Canonical forms are byte-identical`);
            console.log(`   📋 Will mark as alias of ${comparison.existingHash}`);
          }
        } else {
          results.unfixable.push({
            hash: item.hash,
            gid: item.gid,
            reason: comparison.reason || 'CANONICAL_DIFFERS',
            error: comparison.error
          });

          if (verbose) {
            console.log(`   ❌ Cannot fix: ${comparison.reason || 'Canonical forms differ'}`);
            if (comparison.error) {
              console.log(`   🐛 Error: ${comparison.error}`);
            }
          }
        }
      } catch (error) {
        results.errors.push({
          hash: item.hash,
          gid: item.gid,
          error: error.message
        });

        if (verbose) {
          console.log(`   💥 Error analyzing: ${error.message}`);
        }
      }
    } else {
      results.unfixable.push({
        hash: item.hash,
        reason: `UNSUPPORTED_REASON_${item.reason}`,
        details: item.details
      });

      if (verbose) {
        console.log(`   ⏭️  Skipping: Reason '${item.reason}' not supported for auto-fix`);
      }
    }
  }

  return results;
}

/**
 * Apply fixes to manifest and index
 */
function applyFixes(manifest, gidIndex, fixes, options = {}) {
  const { dryRun = false, verbose = false } = options;

  if (dryRun) {
    console.log('\n🔬 DRY RUN - No changes will be made');
    return;
  }

  console.log(`\n🔧 Applying ${fixes.length} fixes...`);

  // Track hashes to remove from quarantine
  const hashesToRemove = new Set();

  for (const fix of fixes) {
    if (fix.action === 'MARK_AS_ALIAS') {
      // Find the seed entry and get its name
      const seedEntry = manifest.seeds.find(s => s.hash === fix.hash);
      const seedName = seedEntry ? seedEntry.name : `unknown-${fix.hash.substring(0, 8)}`;

      // Add as alias to existing GID index entry
      const existingEntry = gidIndex[fix.gid];
      if (existingEntry && !existingEntry.aliases.includes(seedName)) {
        existingEntry.aliases.push(seedName);

        if (verbose) {
          console.log(`   ✅ Added ${seedName} as alias for GID ${fix.gid}`);
        }
      }

      hashesToRemove.add(fix.hash);
    }
  }

  // Remove fixed items from quarantine
  const originalQuarantineCount = manifest.quarantine.length;
  manifest.quarantine = manifest.quarantine.filter(item => !hashesToRemove.has(item.hash));

  console.log(`   📉 Quarantine reduced: ${originalQuarantineCount} → ${manifest.quarantine.length}`);

  // Recalculate trust score
  const trustScore = calculateTrustScore(manifest.seeds, manifest.quarantine);
  manifest.trust.score = Math.round(trustScore * 1000) / 1000;
  manifest.trust.stats.conformant = manifest.seeds.filter(s =>
    !manifest.quarantine.find(q => q.hash === s.hash)
  ).length;

  console.log(`   📊 Trust score updated: ${manifest.trust.score}`);
}

/**
 * Calculate trust score (same logic as ingest.ts)
 */
function calculateTrustScore(seedEntries, quarantine) {
  const dsseValid = seedEntries.filter(s => s.dsse.valid).length;
  const conformant = seedEntries.filter(s =>
    quarantine.find(q => q.hash === s.hash) === undefined
  ).length;
  const ageScore = 1.0; // All seeds are fresh for now

  // Trust formula: 40% conformity + 20% DSSE + 40% age
  return 0.4 * (conformant / seedEntries.length) +
         0.2 * (dsseValid / seedEntries.length) +
         0.4 * ageScore;
}

/**
 * Print summary report
 */
function printSummary(results, options = {}) {
  const { verbose = false } = options;

  console.log(`\n📊 QUARANTINE FIX SUMMARY`);
  console.log(`========================`);
  console.log(`✅ Fixable items:     ${results.fixed.length}`);
  console.log(`❌ Unfixable items:   ${results.unfixable.length}`);
  console.log(`💥 Errors:            ${results.errors.length}`);
  console.log(`📋 Total analyzed:    ${results.fixed.length + results.unfixable.length + results.errors.length}`);

  if (results.fixed.length > 0) {
    console.log(`\n🔧 FIXES TO APPLY:`);
    for (const fix of results.fixed) {
      console.log(`   • ${fix.hash.substring(0, 12)}... → alias for GID ${fix.gid.substring(0, 12)}...`);
    }
  }

  if (results.unfixable.length > 0 && verbose) {
    console.log(`\n❌ UNFIXABLE ITEMS:`);
    for (const item of results.unfixable) {
      console.log(`   • ${item.hash?.substring(0, 12) || 'unknown'}... (${item.reason})`);
    }
  }

  if (results.errors.length > 0) {
    console.log(`\n💥 ERRORS:`);
    for (const error of results.errors) {
      console.log(`   • ${error.hash?.substring(0, 12) || 'unknown'}... - ${error.error}`);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose')
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Federation Quarantine Fixer');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/fed/fix-quarantine.mjs [options]');
    console.log('');
    console.log('Options:');
    console.log('  --dry-run    Show what would be fixed without making changes');
    console.log('  --verbose    Show detailed analysis of each item');
    console.log('  --help, -h   Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/fed/fix-quarantine.mjs --dry-run --verbose');
    console.log('  node scripts/fed/fix-quarantine.mjs');
    return;
  }

  console.log('🔧 Federation Quarantine Fixer');
  console.log('===============================');

  // Check if manifest exists
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`❌ Federation manifest not found: ${MANIFEST_PATH}`);
    console.error('   Run "make fed-garden" first to create the federation');
    process.exit(1);
  }

  // Load manifest and index
  console.log(`📖 Loading federation manifest: ${MANIFEST_PATH}`);
  const manifest = loadJson(MANIFEST_PATH);

  console.log(`📖 Loading GID index: ${INDEX_PATH}`);
  const gidIndex = loadJson(INDEX_PATH);

  console.log(`📊 Current status:`);
  console.log(`   • Seeds: ${manifest.seeds.length}`);
  console.log(`   • Quarantine: ${manifest.quarantine.length}`);
  console.log(`   • Trust score: ${manifest.trust.score}`);

  if (manifest.quarantine.length === 0) {
    console.log('✅ No items in quarantine - nothing to fix!');
    return;
  }

  // Analyze quarantine
  console.log(`\n🔍 Analyzing ${manifest.quarantine.length} quarantine items...`);
  const results = fixQuarantine(manifest, gidIndex, options);

  // Print summary
  printSummary(results, options);

  // Apply fixes if not dry run
  if (results.fixed.length > 0) {
    applyFixes(manifest, gidIndex, results.fixed, options);

    if (!options.dryRun) {
      // Save updated files
      console.log(`\n💾 Saving updated files...`);
      writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
      writeFileSync(INDEX_PATH, JSON.stringify(gidIndex, null, 2));
      console.log(`   • ${MANIFEST_PATH}`);
      console.log(`   • ${INDEX_PATH}`);

      console.log(`\n✅ Quarantine fix complete!`);
      console.log(`   New quarantine count: ${manifest.quarantine.length}`);
      console.log(`   New trust score: ${manifest.trust.score}`);
    }
  } else if (!options.dryRun) {
    console.log('\n⚠️  No items could be automatically fixed');
    console.log('   Manual review may be required for remaining quarantine items');
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Error:', error.message);
    process.exit(1);
  });
}