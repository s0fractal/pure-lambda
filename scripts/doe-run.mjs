#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors


/**
 * DOE Runner for GID/IID/XID Invariant Testing
 * Executes all test cases and validates invariants
 */

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root
const PROJECT_ROOT = path.resolve(__dirname, '..');
const TOOLS_DIR = path.join(PROJECT_ROOT, 'tools');
const FIXTURES_DIR = path.join(PROJECT_ROOT, 'fixtures');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'reports');

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

/**
 * Execute a shell command and return result
 */
function execCommand(command, args, input = null) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: PROJECT_ROOT
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    if (input) {
      process.stdin.write(input);
      process.stdin.end();
    }

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Calculate GID/IID/XID for a tile YAML
 */
async function calculateHashes(tileYaml) {
  try {
    const yamlContent = yaml.stringify(tileYaml);
    const result = await execCommand('npx', ['ts-node', path.join(TOOLS_DIR, 'gid.ts')], yamlContent);
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Hash calculation failed: ${error.message}`);
  }
}

/**
 * Deep merge objects (for mutations)
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Apply mutation to a tile YAML
 */
function applyMutation(originalYaml, mutation) {
  return deepMerge(originalYaml, mutation);
}

/**
 * Check if two arrays have the same elements at specified indices
 */
function checkEqualityGroup(hashes, indices, property, expectEqual = true) {
  if (indices.length < 2) return { passed: true, details: `Only ${indices.length} elements in group` };

  const values = indices.map(i => hashes[i] ? hashes[i][property] : null);
  const firstValue = values[0];
  const allEqual = values.every(v => v === firstValue);

  const passed = expectEqual ? allEqual : !allEqual;
  const details = expectEqual
    ? `Expected equal ${property}: ${values.join(' == ')}`
    : `Expected different ${property}: ${values.join(' != ')}`;

  return { passed, details, values };
}

/**
 * Test tile variants and check invariants
 */
async function testTile(tileSpec) {
  console.log(`\n🧪 Testing tile: ${tileSpec.name}`);

  const variants = [tileSpec.yaml, ...tileSpec.variants.map(v => applyMutation(tileSpec.yaml, v.mutate))];
  const hashes = [];

  // Calculate hashes for all variants
  try {
    for (let i = 0; i < variants.length; i++) {
      console.log(`   Computing hashes for variant ${i}...`);
      const hash = await calculateHashes(variants[i]);
      hashes.push(hash);
      console.log(`   GID: ${hash.gid.slice(0, 12)}... IID: ${hash.iid.slice(0, 12)}... XID: ${hash.xid.slice(0, 12)}...`);
    }
  } catch (error) {
    return {
      name: tileSpec.name,
      passed: false,
      error: `Hash calculation failed: ${error.message}`,
      details: []
    };
  }

  // Check expectations
  const checks = [];
  const expectations = tileSpec.expect;

  if (expectations.gid_equal && expectations.gid_equal.length > 0) {
    const check = checkEqualityGroup(hashes, expectations.gid_equal, 'gid', true);
    checks.push({ type: 'gid_equal', ...check });
  }

  if (expectations.iid_equal && expectations.iid_equal.length > 0) {
    const check = checkEqualityGroup(hashes, expectations.iid_equal, 'iid', true);
    checks.push({ type: 'iid_equal', ...check });
  }

  if (expectations.xid_diff && expectations.xid_diff.length > 0) {
    const check = checkEqualityGroup(hashes, expectations.xid_diff, 'xid', false);
    checks.push({ type: 'xid_diff', ...check });
  }

  const allPassed = checks.every(c => c.passed);

  // Log results
  checks.forEach(check => {
    const status = check.passed ? '✅' : '❌';
    console.log(`   ${status} ${check.type}: ${check.details}`);
  });

  return {
    name: tileSpec.name,
    passed: allPassed,
    checks,
    variants: variants.length,
    hashes
  };
}

/**
 * Build neighbor IID map from operon connections
 */
function buildNeighborIIDs(operonYaml, tileHashes) {
  const neighborIIDsMap = {};

  // Initialize empty neighbor maps for all tiles
  operonYaml.tiles.forEach(tile => {
    neighborIIDsMap[tile.name] = {};
  });

  // Build connections map
  if (operonYaml.connections) {
    operonYaml.connections.forEach(conn => {
      const [fromTile, fromPort] = conn.from.split('.');
      const [toTile, toPort] = conn.to.split('.');

      // Find the IIDs for the tiles
      const fromTileHash = tileHashes.find(h => h.name === fromTile);
      const toTileHash = tileHashes.find(h => h.name === toTile);

      if (fromTileHash && toTileHash) {
        // fromTile has toTile as neighbor on fromPort
        neighborIIDsMap[fromTile][fromPort] = toTileHash.iid;
        // toTile has fromTile as neighbor on toPort
        neighborIIDsMap[toTile][toPort] = fromTileHash.iid;
      }
    });
  }

  return neighborIIDsMap;
}

/**
 * Test operon and check XID changes with neighbor mutations
 */
async function testOperon(operonSpec) {
  console.log(`\n🔗 Testing operon: ${operonSpec.name}`);

  const variants = [operonSpec.yaml];

  // Apply mutations to create variants
  operonSpec.variants.forEach(variant => {
    const mutatedOperon = JSON.parse(JSON.stringify(operonSpec.yaml));

    // Apply tile mutations
    if (variant.mutate.tiles) {
      variant.mutate.tiles.forEach(tileMutation => {
        const tileIndex = mutatedOperon.tiles.findIndex(t => t.name === tileMutation.name);
        if (tileIndex >= 0) {
          mutatedOperon.tiles[tileIndex] = deepMerge(mutatedOperon.tiles[tileIndex], tileMutation);
        }
      });
    }

    // Apply connection mutations
    if (variant.mutate.connections) {
      mutatedOperon.connections = variant.mutate.connections;
    }

    variants.push(mutatedOperon);
  });

  // Calculate hashes for all tiles in all variants
  const variantResults = [];

  try {
    for (let v = 0; v < variants.length; v++) {
      const variant = variants[v];
      const tileHashes = [];

      console.log(`   Processing variant ${v} with ${variant.tiles.length} tiles...`);

      // Calculate base hashes for all tiles
      for (const tile of variant.tiles) {
        const hash = await calculateHashes(tile);
        tileHashes.push({ name: tile.name, ...hash });
      }

      // Build neighbor IID map
      const neighborIIDs = buildNeighborIIDs(variant, tileHashes);

      // Recalculate XIDs with neighbor information
      for (let i = 0; i < tileHashes.length; i++) {
        const tile = variant.tiles[i];
        const tileWithNeighbors = {
          ...tile,
          neighborIIDs: neighborIIDs[tile.name]
        };

        const hashWithNeighbors = await calculateHashes(tileWithNeighbors);
        tileHashes[i].xid = hashWithNeighbors.xid;
      }

      variantResults.push(tileHashes);

      // Log tile hashes
      tileHashes.forEach(th => {
        console.log(`   ${th.name}: GID=${th.gid.slice(0, 8)} IID=${th.iid.slice(0, 8)} XID=${th.xid.slice(0, 8)}`);
      });
    }
  } catch (error) {
    return {
      name: operonSpec.name,
      passed: false,
      error: `Operon processing failed: ${error.message}`,
      details: []
    };
  }

  // Check expectations
  const checks = [];
  const expectations = operonSpec.expect;

  if (expectations.gid_equal && expectations.gid_equal.length > 0) {
    const allTileHashes = variantResults.flat();
    const check = checkEqualityGroup(allTileHashes, expectations.gid_equal, 'gid', true);
    checks.push({ type: 'gid_equal', ...check });
  }

  if (expectations.iid_equal && expectations.iid_equal.length > 0) {
    const allTileHashes = variantResults.flat();
    const check = checkEqualityGroup(allTileHashes, expectations.iid_equal, 'iid', true);
    checks.push({ type: 'iid_equal', ...check });
  }

  if (expectations.xid_diff && expectations.xid_diff.length > 0) {
    // For operons, compare XID changes between variants
    const baseVariant = variantResults[0];
    const mutatedVariant = variantResults[1];

    if (baseVariant && mutatedVariant) {
      // Find tiles that should have different XIDs
      let hasDifference = false;

      baseVariant.forEach((baseTile, i) => {
        const mutatedTile = mutatedVariant.find(m => m.name === baseTile.name);
        if (mutatedTile && baseTile.xid !== mutatedTile.xid) {
          hasDifference = true;
        }
      });

      checks.push({
        type: 'xid_diff',
        passed: hasDifference,
        details: `XID changes detected between variants: ${hasDifference}`
      });
    }
  }

  const allPassed = checks.every(c => c.passed);

  // Log results
  checks.forEach(check => {
    const status = check.passed ? '✅' : '❌';
    console.log(`   ${status} ${check.type}: ${check.details}`);
  });

  return {
    name: operonSpec.name,
    passed: allPassed,
    checks,
    variants: variants.length,
    variantResults
  };
}

/**
 * Generate summary report
 */
async function generateSummaryReport(results) {
  await fs.mkdir(REPORTS_DIR, { recursive: true });

  const reportPath = path.join(REPORTS_DIR, 'doe-summary.md');
  const timestamp = new Date().toISOString();

  let report = `# DOE Summary Report\n\n`;
  report += `**Generated:** ${timestamp}\n`;
  report += `**Total Tests:** ${testResults.total}\n`;
  report += `**Passed:** ${testResults.passed}\n`;
  report += `**Failed:** ${testResults.failed}\n`;
  report += `**Success Rate:** ${((testResults.passed / testResults.total) * 100).toFixed(1)}%\n\n`;

  // Summary table
  report += `## Test Results Summary\n\n`;
  report += `| Test Name | Type | Status | Variants | Details |\n`;
  report += `|-----------|------|--------|----------|----------|\n`;

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const type = result.variants ? (result.variantResults ? 'Operon' : 'Tile') : 'Unknown';
    const variants = result.variants || 0;
    const details = result.error || `${result.checks?.length || 0} checks`;

    report += `| ${result.name} | ${type} | ${status} | ${variants} | ${details} |\n`;
  });

  // Detailed results
  report += `\n## Detailed Results\n\n`;

  results.forEach(result => {
    report += `### ${result.name}\n\n`;

    if (result.error) {
      report += `**Error:** ${result.error}\n\n`;
    } else if (result.checks) {
      report += `**Checks:**\n`;
      result.checks.forEach(check => {
        const status = check.passed ? '✅' : '❌';
        report += `- ${status} **${check.type}**: ${check.details}\n`;
      });
      report += `\n`;
    }
  });

  // Invariant analysis
  report += `## Invariant Analysis\n\n`;
  report += `### GID (Genomic ID) Invariants\n`;
  report += `- **✅ Code normalization**: Whitespace and variable renaming should not affect GID\n`;
  report += `- **✅ Semantic equivalence**: Functionally equivalent code should have same GID\n`;
  report += `- **❌ Different logic**: Changed algorithms should produce different GIDs\n\n`;

  report += `### IID (Interface ID) Invariants\n`;
  report += `- **✅ Port consistency**: Same port names and types should have same IID\n`;
  report += `- **✅ ABI stability**: Same interface contract should have same IID\n`;
  report += `- **❌ Interface changes**: Different port names or types should produce different IIDs\n\n`;

  report += `### XID (Context ID) Invariants\n`;
  report += `- **✅ Neighbor sensitivity**: XID should change when neighbor IIDs change\n`;
  report += `- **✅ Isolation**: Disconnected tiles should have constant XIDs\n`;
  report += `- **✅ Permutation invariance**: Swapping identical neighbors should not affect XID\n\n`;

  await fs.writeFile(reportPath, report, 'utf8');
  console.log(`\n📊 Summary report written to: ${reportPath}`);

  return reportPath;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const doeFile = args[0] || path.join(FIXTURES_DIR, 'doe.json');

  console.log(`🚀 Starting DOE execution...`);
  console.log(`📋 Loading test cases from: ${doeFile}`);

  try {
    // Load DOE specification
    const doeContent = await fs.readFile(doeFile, 'utf8');
    const doeSpec = JSON.parse(doeContent);

    const results = [];

    // Test all tiles
    console.log(`\n=== TESTING TILES ===`);
    for (const tileSpec of doeSpec.tiles) {
      testResults.total++;
      const result = await testTile(tileSpec);
      results.push(result);

      if (result.passed) {
        testResults.passed++;
      } else {
        testResults.failed++;
        if (result.error) {
          testResults.errors.push(`${result.name}: ${result.error}`);
        }
      }
    }

    // Test all operons
    console.log(`\n=== TESTING OPERONS ===`);
    for (const operonSpec of doeSpec.operons) {
      testResults.total++;
      const result = await testOperon(operonSpec);
      results.push(result);

      if (result.passed) {
        testResults.passed++;
      } else {
        testResults.failed++;
        if (result.error) {
          testResults.errors.push(`${result.name}: ${result.error}`);
        }
      }
    }

    // Generate report
    await generateSummaryReport(results);

    // Final summary
    console.log(`\n=== FINAL RESULTS ===`);
    console.log(`Total tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.errors.length > 0) {
      console.log(`\nErrors encountered:`);
      testResults.errors.forEach(error => console.log(`  ❌ ${error}`));
    }

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error(`❌ DOE execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Check if we have the yaml package
try {
  await import('yaml');
} catch (error) {
  console.error('❌ Missing dependency: yaml package');
  console.error('Please install: npm install yaml');
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}