#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * PL-SEED-01 Round-trip Conformance Test
 *
 * Tests:
 * 1. Take seeds/*.json → pack → unpack
 * 2. Assert canonical equality on tiles & gid/iid/xid sets
 * 3. If PL_ED25519_SECRET present: wrap pack output into DSSE using tools/attest.ts; then unpack --verify
 *
 * Usage:
 *   node scripts/ga/seed-roundtrip.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');

// Paths
const seedsDir = join(projectRoot, 'seeds');
const distSeedsDir = join(projectRoot, 'dist/seeds');
const reportsDir = join(projectRoot, 'reports/conformance');
const packTool = join(projectRoot, 'tools/seed/pack.ts');
const unpackTool = join(projectRoot, 'tools/seed/unpack.ts');

/**
 * Test result for a single seed
 */
class TestResult {
  constructor(seedName) {
    this.seedName = seedName;
    this.packSuccess = false;
    this.unpackSuccess = false;
    this.canonicalMatch = false;
    this.gidSetMatch = false;
    this.iidSetMatch = false;
    this.xidSetMatch = false;
    this.dssePackSuccess = false;
    this.dsseUnpackSuccess = false;
    this.dsseVerifySuccess = false;
    this.errors = [];
  }

  addError(error) {
    this.errors.push(error);
  }

  isSuccess() {
    return this.packSuccess &&
           this.unpackSuccess &&
           this.canonicalMatch &&
           this.gidSetMatch &&
           this.iidSetMatch &&
           this.xidSetMatch;
  }

  isDsseSuccess() {
    return this.dssePackSuccess &&
           this.dsseUnpackSuccess &&
           this.dsseVerifySuccess;
  }
}

/**
 * Execute command and return result
 */
function execCommand(command, cwd = projectRoot) {
  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stdout: error.stdout || '',
      stderr: error.stderr || ''
    };
  }
}

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Compare arrays for equality (order-independent)
 */
function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  return sortedA.every((val, idx) => val === sortedB[idx]);
}

/**
 * Generate unified diff between two strings
 */
function generateUnifiedDiff(str1, str2, filename1 = 'original', filename2 = 'roundtrip') {
  const lines1 = str1.split('\n');
  const lines2 = str2.split('\n');

  let diff = `--- ${filename1}\n+++ ${filename2}\n`;

  const maxLen = Math.max(lines1.length, lines2.length);
  let contextStart = -1;
  let contextEnd = -1;

  // Find differences
  const changes = [];
  for (let i = 0; i < maxLen; i++) {
    const line1 = lines1[i] || '';
    const line2 = lines2[i] || '';

    if (line1 !== line2) {
      if (contextStart === -1) contextStart = Math.max(0, i - 3);
      contextEnd = Math.min(maxLen - 1, i + 3);

      if (line1) changes.push({ type: '-', line: line1, num: i + 1 });
      if (line2) changes.push({ type: '+', line: line2, num: i + 1 });
    }
  }

  if (changes.length === 0) return null;

  diff += `@@ -${contextStart + 1},${contextEnd - contextStart + 1} +${contextStart + 1},${contextEnd - contextStart + 1} @@\n`;

  // Generate context and changes
  for (let i = contextStart; i <= contextEnd; i++) {
    const line1 = lines1[i] || '';
    const line2 = lines2[i] || '';

    if (line1 === line2) {
      diff += ` ${line1}\n`;
    } else {
      if (line1) diff += `-${line1}\n`;
      if (line2) diff += `+${line2}\n`;
    }
  }

  return diff;
}

/**
 * Deep compare objects for equality
 */
function deepEqual(a, b) {
  if (a === b) return true;

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    return arraysEqual(a, b);
  }

  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();

  if (keysA.length !== keysB.length) return false;
  if (!keysA.every((key, idx) => key === keysB[idx])) return false;

  return keysA.every(key => deepEqual(a[key], b[key]));
}

/**
 * Test a single seed file
 */
function testSeed(seedFile) {
  const seedName = seedFile.replace('.json', '');
  const result = new TestResult(seedName);

  console.log(`\n🧪 Testing seed: ${seedName}`);

  const inputPath = join(seedsDir, seedFile);
  const packedPath = join(distSeedsDir, `${seedName}.seed.json`);
  const unpackedPath = join(distSeedsDir, `${seedName}.operon.json`);
  const dssePackedPath = join(distSeedsDir, `${seedName}.dsse.json`);
  const dsseUnpackedPath = join(distSeedsDir, `${seedName}.dsse.operon.json`);

  try {
    // Read original operon
    const originalContent = readFileSync(inputPath, 'utf8');
    const originalOperon = JSON.parse(originalContent);

    // Step 1: Pack seed
    console.log(`  📦 Packing ${seedName}...`);
    const packCmd = `npx ts-node "${packTool}" "${inputPath}"`;
    const packResult = execCommand(packCmd);

    if (!packResult.success) {
      result.addError(`Pack failed: ${packResult.error}`);
      return result;
    }

    result.packSuccess = true;
    writeFileSync(packedPath, packResult.output);

    // Step 2: Unpack seed
    console.log(`  📂 Unpacking ${seedName}...`);
    const unpackCmd = `npx ts-node "${unpackTool}" "${packedPath}"`;
    const unpackResult = execCommand(unpackCmd);

    if (!unpackResult.success) {
      result.addError(`Unpack failed: ${unpackResult.error}`);
      return result;
    }

    result.unpackSuccess = true;
    writeFileSync(unpackedPath, unpackResult.output);

    // Step 3: Compare canonical form using canonical strings
    console.log(`  🔍 Comparing canonical forms...`);
    const unpackedOperon = JSON.parse(unpackResult.output);

    try {
      // Use external process for canonical comparison since ES modules are tricky
      const canonicalTest = execCommand(`npx ts-node -e "
        const { canonicalize } = require('${join(projectRoot, 'src/seed/canonical.ts')}');
        const { roundTripEqual } = require('${join(projectRoot, 'tools/seed/unpack.ts')}');
        const fs = require('fs');

        const originalData = JSON.parse(fs.readFileSync('${inputPath}', 'utf8'));
        const unpackedData = JSON.parse(fs.readFileSync('${unpackedPath}', 'utf8'));

        if (roundTripEqual(originalData, unpackedData)) {
          console.log('MATCH');
        } else {
          console.log('MISMATCH');
          console.log('ORIGINAL:');
          console.log(canonicalize(originalData));
          console.log('UNPACKED:');
          console.log(canonicalize(unpackedData));
        }
      "`);

      if (canonicalTest.success) {
        const output = canonicalTest.output.trim();
        if (output.startsWith('MATCH')) {
          result.canonicalMatch = true;
          console.log(`    ✅ Canonical forms match`);
        } else {
          result.addError('Canonical form mismatch after round-trip');
          console.log(`    ❌ Canonical forms mismatch`);

          // Extract and display the diff
          const lines = output.split('\n');
          const originalIndex = lines.indexOf('ORIGINAL:');
          const unpackedIndex = lines.indexOf('UNPACKED:');

          if (originalIndex >= 0 && unpackedIndex >= 0) {
            const originalCanonical = lines[originalIndex + 1] || '';
            const unpackedCanonical = lines[unpackedIndex + 1] || '';

            const diff = generateUnifiedDiff(
              originalCanonical,
              unpackedCanonical,
              `original-${seedName}.json`,
              `roundtrip-${seedName}.json`
            );

            if (diff) {
              console.log(`    📄 Unified diff:`);
              console.log(diff);
            }
          }
        }
      } else {
        result.addError(`Canonical comparison failed: ${canonicalTest.error}`);
        console.log(`    ❌ Canonical comparison failed`);
      }
    } catch (canonicalError) {
      // Fallback to previous comparison method
      const originalTiles = extractTileData(originalOperon);
      const unpackedTiles = extractTileData(unpackedOperon);

      if (deepEqual(originalTiles, unpackedTiles)) {
        result.canonicalMatch = true;
        console.log(`    ✅ Tiles match (fallback comparison)`);
      } else {
        result.addError('Tile data mismatch after round-trip (fallback comparison)');
        console.log(`    ❌ Tiles mismatch (fallback comparison)`);
      }
    }

    // Step 4: Recompute and compare GID/IID/XID sets
    console.log(`  🔄 Recomputing hash sets...`);

    try {
      // Parse the packed seed to get computed hash sets
      const packedSeed = JSON.parse(readFileSync(packedPath, 'utf8'));
      const computedGidSet = packedSeed.meta?.gidSet || [];
      const computedIidSet = packedSeed.meta?.iidSet || [];
      const computedXidSet = packedSeed.meta?.xidSet || [];

      // Compare computed sets with original
      if (arraysEqual(originalOperon.gidSet || [], computedGidSet)) {
        result.gidSetMatch = true;
        console.log(`    ✅ GID sets match`);
      } else {
        result.addError('GID sets mismatch after recomputation');
        console.log(`    ❌ GID sets mismatch`);
      }

      if (arraysEqual(originalOperon.iidSet || [], computedIidSet)) {
        result.iidSetMatch = true;
        console.log(`    ✅ IID sets match`);
      } else {
        result.addError('IID sets mismatch after recomputation');
        console.log(`    ❌ IID sets mismatch`);
      }

      // XID comparison (may not be present in original)
      const originalXids = originalOperon.xidSet || [];
      if (originalXids.length === 0 || arraysEqual(originalXids, computedXidSet)) {
        result.xidSetMatch = true;
        console.log(`    ✅ XID sets match (or not present in original)`);
      } else {
        result.addError('XID sets mismatch after recomputation');
        console.log(`    ❌ XID sets mismatch`);
      }
    } catch (hashError) {
      result.addError(`Failed to recompute hash sets: ${hashError.message}`);
      console.log(`    ❌ Hash set recomputation failed`);
    }

    // Step 5: DSSE round-trip (if secret key available)
    if (process.env.PL_ED25519_SECRET) {
      console.log(`  🔐 Testing DSSE round-trip...`);

      // Pack with DSSE
      const dssePackCmd = `npx ts-node "${packTool}" --attest "${inputPath}"`;
      const dssePackResult = execCommand(dssePackCmd);

      if (dssePackResult.success) {
        result.dssePackSuccess = true;
        writeFileSync(dssePackedPath, dssePackResult.output);
        console.log(`    ✅ DSSE pack successful`);

        // Unpack with verification
        const dsseUnpackCmd = `npx ts-node "${unpackTool}" --verify "${dssePackedPath}"`;
        const dsseUnpackResult = execCommand(dsseUnpackCmd);

        if (dsseUnpackResult.success) {
          result.dsseUnpackSuccess = true;
          result.dsseVerifySuccess = true; // Verification is part of unpack with --verify
          writeFileSync(dsseUnpackedPath, dsseUnpackResult.output);
          console.log(`    ✅ DSSE unpack and verify successful`);
        } else {
          result.addError(`DSSE unpack/verify failed: ${dsseUnpackResult.error}`);
          console.log(`    ❌ DSSE unpack/verify failed`);
        }
      } else {
        result.addError(`DSSE pack failed: ${dssePackResult.error}`);
        console.log(`    ❌ DSSE pack failed`);
      }
    } else {
      console.log(`  ⏭️  Skipping DSSE test (PL_ED25519_SECRET not set)`);
    }

  } catch (error) {
    result.addError(`Unexpected error: ${error.message}`);
    console.log(`  💥 Unexpected error: ${error.message}`);
  }

  return result;
}

/**
 * Extract comparable tile data from operon
 */
function extractTileData(operon) {
  const tiles = [];

  for (const [nodeId, node] of Object.entries(operon.nodes)) {
    // Skip meta nodes
    if (node.oids || !node.op) continue;

    tiles.push({
      op: node.op,
      code: node.code || null,
      abi: node.abi || {
        types: '',
        effects: [],
        ports: node.ports || {}
      },
      law: node.law || 'unknown',
      cost: node.cost || 'O(?)'
    });
  }

  // Sort tiles by op for deterministic comparison
  return tiles.sort((a, b) => a.op.localeCompare(b.op));
}

/**
 * Generate markdown report
 */
function generateReport(results) {
  const now = new Date().toISOString();
  let markdown = `# PL-SEED-01 Round-trip Conformance Report\n\n`;
  markdown += `Generated: ${now}\n\n`;

  // Summary table
  markdown += `## Summary\n\n`;
  markdown += `| Seed | Pack | Unpack | Canonical | GID | IID | XID | DSSE | Status |\n`;
  markdown += `|------|------|--------|-----------|-----|-----|-----|------|--------|\n`;

  let totalTests = results.length;
  let passedTests = 0;
  let dsseTests = 0;
  let dssePassedTests = 0;

  for (const result of results) {
    const pack = result.packSuccess ? '✅' : '❌';
    const unpack = result.unpackSuccess ? '✅' : '❌';
    const canonical = result.canonicalMatch ? '✅' : '❌';
    const gid = result.gidSetMatch ? '✅' : '❌';
    const iid = result.iidSetMatch ? '✅' : '❌';
    const xid = result.xidSetMatch ? '✅' : '❌';

    let dsse = '⏭️';
    if (result.dssePackSuccess || result.dsseUnpackSuccess) {
      dsseTests++;
      if (result.isDsseSuccess()) {
        dsse = '✅';
        dssePassedTests++;
      } else {
        dsse = '❌';
      }
    }

    const status = result.isSuccess() ? '**PASS**' : '**FAIL**';
    if (result.isSuccess()) passedTests++;

    markdown += `| ${result.seedName} | ${pack} | ${unpack} | ${canonical} | ${gid} | ${iid} | ${xid} | ${dsse} | ${status} |\n`;
  }

  markdown += `\n**Results: ${passedTests}/${totalTests} tests passed**\n`;
  if (dsseTests > 0) {
    markdown += `**DSSE: ${dssePassedTests}/${dsseTests} DSSE tests passed**\n`;
  }
  markdown += `\n`;

  // Detailed results
  markdown += `## Detailed Results\n\n`;

  for (const result of results) {
    markdown += `### ${result.seedName}\n\n`;

    if (result.isSuccess()) {
      markdown += `✅ **PASSED** - All round-trip tests successful\n\n`;
    } else {
      markdown += `❌ **FAILED**\n\n`;
      markdown += `Errors:\n`;
      for (const error of result.errors) {
        markdown += `- ${error}\n`;
      }
      markdown += `\n`;
    }

    if (result.dssePackSuccess || result.dsseUnpackSuccess) {
      if (result.isDsseSuccess()) {
        markdown += `🔐 DSSE tests: **PASSED**\n\n`;
      } else {
        markdown += `🔐 DSSE tests: **FAILED**\n\n`;
      }
    }
  }

  return { markdown, passed: passedTests, total: totalTests };
}

/**
 * Main execution
 */
function main() {
  console.log('🧪 PL-SEED-01 Round-trip Conformance Test');
  console.log('=' .repeat(50));

  // Ensure directories exist
  ensureDir(distSeedsDir);
  ensureDir(reportsDir);

  // Find all seed files
  if (!existsSync(seedsDir)) {
    console.error(`❌ Seeds directory not found: ${seedsDir}`);
    process.exit(1);
  }

  const seedFiles = readdirSync(seedsDir)
    .filter(file => file.endsWith('.json'))
    .filter(file => file !== 'index.json') // Skip index files
    .sort();

  if (seedFiles.length === 0) {
    console.error(`❌ No seed files found in: ${seedsDir}`);
    process.exit(1);
  }

  console.log(`Found ${seedFiles.length} seed files to test`);

  // Test each seed
  const results = [];
  for (const seedFile of seedFiles) {
    const result = testSeed(seedFile);
    results.push(result);
  }

  // Generate report
  console.log('\\n📊 Generating report...');
  const { markdown, passed, total } = generateReport(results);

  const reportPath = join(reportsDir, 'seed-roundtrip.md');
  writeFileSync(reportPath, markdown);

  console.log(`\\n📄 Report written to: ${reportPath}`);
  console.log(`\\n🎯 Final Results: ${passed}/${total} tests passed`);

  // Exit with appropriate code
  if (passed === total) {
    console.log('\\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log(`\\n💥 ${total - passed} tests failed`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}