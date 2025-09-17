#!/usr/bin/env ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * GID Conflict Diagnosis Tool
 *
 * Diagnoses GID conflicts by comparing canonical digests and generating diffs
 * Usage:
 *   ts-node tools/gid-diagnose.ts artifact1.json artifact2.json
 *   ts-node tools/gid-diagnose.ts --fix input.json
 */

const { readFileSync, writeFileSync } = require('fs');
const { normalizeSeed } = require('./seed/normalize');
const { canonicalize } = require('../src/seed/canonical');
const { createHash } = require('crypto');

interface DiagnosisResult {
  artifact1: {
    path: string;
    canonical: string;
    hash: string;
    gidSet: string[];
  };
  artifact2?: {
    path: string;
    canonical: string;
    hash: string;
    gidSet: string[];
  };
  diff?: {
    type: 'identical' | 'different' | 'gid_conflict';
    details: string;
    commonGids?: string[];
    conflictingGids?: string[];
  };
}

/**
 * Compute canonical hash of data
 */
function computeCanonicalHash(data: any): string {
  const canonical = canonicalize(data);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Generate JSON diff between two objects
 */
function generateJsonDiff(obj1: any, obj2: any, path: string = ''): string[] {
  const diffs: string[] = [];

  if (typeof obj1 !== typeof obj2) {
    diffs.push(`${path}: type differs (${typeof obj1} vs ${typeof obj2})`);
    return diffs;
  }

  if (obj1 === null || obj2 === null) {
    if (obj1 !== obj2) {
      diffs.push(`${path}: value differs (${obj1} vs ${obj2})`);
    }
    return diffs;
  }

  if (typeof obj1 !== 'object') {
    if (obj1 !== obj2) {
      diffs.push(`${path}: value differs (${obj1} vs ${obj2})`);
    }
    return diffs;
  }

  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    diffs.push(`${path}: array/object type mismatch`);
    return diffs;
  }

  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) {
      diffs.push(`${path}: array length differs (${obj1.length} vs ${obj2.length})`);
    }

    const maxLen = Math.max(obj1.length, obj2.length);
    for (let i = 0; i < maxLen; i++) {
      const newPath = `${path}[${i}]`;
      if (i >= obj1.length) {
        diffs.push(`${newPath}: missing in first array`);
      } else if (i >= obj2.length) {
        diffs.push(`${newPath}: missing in second array`);
      } else {
        diffs.push(...generateJsonDiff(obj1[i], obj2[i], newPath));
      }
    }
  } else {
    // Objects
    const keys1 = Object.keys(obj1).sort();
    const keys2 = Object.keys(obj2).sort();
    const allKeys = [...new Set([...keys1, ...keys2])].sort();

    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;
      if (!(key in obj1)) {
        diffs.push(`${newPath}: missing in first object`);
      } else if (!(key in obj2)) {
        diffs.push(`${newPath}: missing in second object`);
      } else {
        diffs.push(...generateJsonDiff(obj1[key], obj2[key], newPath));
      }
    }
  }

  return diffs;
}

/**
 * Diagnose two artifacts
 */
async function diagnoseArtifacts(path1: string, path2: string): Promise<DiagnosisResult> {
  try {
    // Load and normalize both artifacts
    const content1 = readFileSync(path1, 'utf8');
    const content2 = readFileSync(path2, 'utf8');

    const data1 = JSON.parse(content1);
    const data2 = JSON.parse(content2);

    const normalized1 = await normalizeSeed(data1);
    const normalized2 = await normalizeSeed(data2);

    const canonical1 = normalized1.canonicalJson;
    const canonical2 = normalized2.canonicalJson;

    const hash1 = computeCanonicalHash(JSON.parse(canonical1));
    const hash2 = computeCanonicalHash(JSON.parse(canonical2));

    const result: DiagnosisResult = {
      artifact1: {
        path: path1,
        canonical: canonical1,
        hash: hash1,
        gidSet: normalized1.gidSet
      },
      artifact2: {
        path: path2,
        canonical: canonical2,
        hash: hash2,
        gidSet: normalized2.gidSet
      }
    };

    // Compare and generate diff
    if (canonical1 === canonical2) {
      result.diff = {
        type: 'identical',
        details: 'Canonical forms are identical - seeds are equivalent'
      };
    } else {
      // Check for GID conflicts
      const gids1 = new Set(normalized1.gidSet);
      const gids2 = new Set(normalized2.gidSet);
      const commonGids = normalized1.gidSet.filter(gid => gids2.has(gid));

      if (commonGids.length > 0) {
        const conflictingGids = commonGids.filter(gid => {
          // This is a simplified check - in practice, we'd need to check
          // if the same GID maps to different tiles in each seed
          return true;
        });

        result.diff = {
          type: 'gid_conflict',
          details: `Seeds share ${commonGids.length} GID(s) but have different canonical forms`,
          commonGids,
          conflictingGids
        };
      } else {
        result.diff = {
          type: 'different',
          details: 'Canonical forms differ but no GID conflicts detected'
        };
      }
    }

    return result;

  } catch (error) {
    throw new Error(`Failed to diagnose artifacts: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Fix an artifact by rewriting it to canonical form
 */
async function fixArtifact(inputPath: string, outputPath?: string): Promise<void> {
  try {
    const content = readFileSync(inputPath, 'utf8');
    const data = JSON.parse(content);

    const normalized = await normalizeSeed(data);
    const canonicalSeed = normalized.seedTiles;

    const fixedPath = outputPath || inputPath;
    writeFileSync(fixedPath, JSON.stringify(canonicalSeed, null, 2));

    console.log(`✓ Fixed seed written to: ${fixedPath}`);
    console.log(`  Original hash: ${computeCanonicalHash(data)}`);
    console.log(`  Canonical hash: ${computeCanonicalHash(canonicalSeed)}`);
    console.log(`  GID set: [${normalized.gidSet.join(', ')}]`);

  } catch (error) {
    throw new Error(`Failed to fix artifact: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Print help
 */
function printHelp(): void {
  console.log('GID Conflict Diagnosis Tool');
  console.log('');
  console.log('Usage:');
  console.log('  ts-node tools/gid-diagnose.ts <artifact1> <artifact2>  # Compare two artifacts');
  console.log('  ts-node tools/gid-diagnose.ts --fix <input> [output]   # Fix artifact to canonical form');
  console.log('');
  console.log('Options:');
  console.log('  --fix                    Rewrite seed to canonical form');
  console.log('  --help, -h              Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  ts-node tools/gid-diagnose.ts seed1.json seed2.json');
  console.log('  ts-node tools/gid-diagnose.ts --fix corrupted.json fixed.json');
  console.log('  ts-node tools/gid-diagnose.ts --fix seed.json  # Fix in place');
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  try {
    if (args[0] === '--fix') {
      // Fix mode
      if (args.length < 2) {
        console.error('Error: --fix requires an input file');
        process.exit(1);
      }

      const inputPath = args[1];
      const outputPath = args[2]; // Optional

      await fixArtifact(inputPath, outputPath);

    } else {
      // Compare mode
      if (args.length < 2) {
        console.error('Error: Two artifacts required for comparison');
        printHelp();
        process.exit(1);
      }

      const path1 = args[0];
      const path2 = args[1];

      console.log('=== GID Conflict Diagnosis ===\n');

      const result = await diagnoseArtifacts(path1, path2);

      // Print canonical digests
      console.log('Canonical Digests:');
      console.log(`  Artifact 1 (${result.artifact1.path}):`);
      console.log(`    Hash: ${result.artifact1.hash}`);
      console.log(`    GIDs: [${result.artifact1.gidSet.join(', ')}]`);

      if (result.artifact2) {
        console.log(`  Artifact 2 (${result.artifact2.path}):`);
        console.log(`    Hash: ${result.artifact2.hash}`);
        console.log(`    GIDs: [${result.artifact2.gidSet.join(', ')}]`);
      }

      console.log('');

      // Print diff analysis
      if (result.diff) {
        console.log('Diff Analysis:');
        console.log(`  Type: ${result.diff.type}`);
        console.log(`  Details: ${result.diff.details}`);

        if (result.diff.commonGids && result.diff.commonGids.length > 0) {
          console.log(`  Common GIDs: [${result.diff.commonGids.join(', ')}]`);
        }

        if (result.diff.type === 'different' || result.diff.type === 'gid_conflict') {
          // Generate detailed JSON diff
          console.log('\nDetailed JSON Diff:');
          const obj1 = JSON.parse(result.artifact1.canonical);
          const obj2 = JSON.parse(result.artifact2!.canonical);
          const diffs = generateJsonDiff(obj1, obj2);

          if (diffs.length === 0) {
            console.log('  (No differences in canonical form - this should not happen)');
          } else {
            diffs.slice(0, 20).forEach(diff => { // Limit to first 20 diffs
              console.log(`  ${diff}`);
            });
            if (diffs.length > 20) {
              console.log(`  ... and ${diffs.length - 20} more differences`);
            }
          }
        }
      }

      // Print recommendation
      console.log('\nRecommendation:');
      if (result.diff?.type === 'identical') {
        console.log('  ✅ Seeds are equivalent - no action needed');
      } else if (result.diff?.type === 'gid_conflict') {
        console.log('  ⚠️  GID conflict detected - review tile implementations');
        console.log('  💡 Consider using --fix to normalize both artifacts');
      } else {
        console.log('  ℹ️  Seeds differ but no GID conflicts - this is normal');
      }
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

// Export for testing
module.exports = { diagnoseArtifacts, fixArtifact, generateJsonDiff };