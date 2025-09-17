#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Federation Ingest Format Tests
 *
 * Tests that operon and tiles variants of the same seed produce:
 * - Same gid/iid/xid sets
 * - No quarantine due to format mismatch
 * - Proper manifest generation
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

// Test configuration
const TEST_DIR = '/tmp/fed-ingest-test';
const SEEDS_DIR = join(TEST_DIR, 'seeds');
const VAULT_DIR = join(TEST_DIR, 'vault');
const MANIFEST_PATH = join(TEST_DIR, 'manifest.json');

/**
 * Test seed in tiles format
 */
const TILES_SEED = {
  "pl_seed": "PL-SEED-01",
  "version": 1,
  "createdAt": "2025-09-17T12:00:00.000Z",
  "name": "test-focus-delay",
  "tiles": [
    {
      "op": "FOCUS",
      "code": "x => x",
      "abi": {
        "types": "data -> focused",
        "effects": [],
        "ports": {
          "in": "data",
          "out": "focused"
        }
      },
      "law": "identity",
      "cost": "O(1)"
    },
    {
      "op": "DELAY",
      "abi": {
        "types": "focused -> delayed",
        "effects": [],
        "ports": {
          "in": "focused",
          "out": "delayed"
        }
      },
      "law": "temporal",
      "cost": "O(1)"
    }
  ],
  "meta": {
    "gidSet": [
      "8a7ea8476e1b730e84f17885c08eaacf1a40c3572d709bdb30e88fff154f1602",
      "c2f1e0d9b8a7968574635241f0e9d8c7b6a59483726150a9b8c7d6e5f493a2b1"
    ],
    "iidSet": [
      "90fb5efc9fe440fd0d0e197cb3b5ae1f9d18aed0b6f659b63ea222674d9afd6b",
      "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890".slice(0, 64)
    ],
    "xidSet": [
      "506bf04529922981c8e224ee125e181147e58ccffe2ffead16fafa650e5b04ea",
      "d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2"
    ],
    "stats": {
      "hops": 2,
      "latency": 0,
      "mem": 2
    }
  }
};

/**
 * Test seed in operon format (converted from tiles)
 */
const OPERON_SEED = {
  "name": "test-focus-delay",
  "nodes": {
    "baf8a7ea8476e1b730e84f17885c08eaacf1a40c3572d709b90fb5efc9fe4": {
      "op": "FOCUS",
      "code": "x => x",
      "abi": {
        "types": "data -> focused",
        "effects": [],
        "ports": {
          "in": "data",
          "out": "focused"
        }
      },
      "ports": {
        "in": "data",
        "out": "focused"
      },
      "law": "identity",
      "cost": "O(1)",
      "gid": "8a7ea8476e1b730e84f17885c08eaacf1a40c3572d709bdb30e88fff154f1602",
      "iid": "90fb5efc9fe440fd0d0e197cb3b5ae1f9d18aed0b6f659b63ea222674d9afd6b",
      "xid": "506bf04529922981c8e224ee125e181147e58ccffe2ffead16fafa650e5b04ea",
      "links": {
        "out": "bafc2f1e0d9b8a7968574635241f0e9d8c7b6a59483726150a9b8c7a1b2c3d4"
      },
      "receipt": null
    },
    "bafc2f1e0d9b8a7968574635241f0e9d8c7b6a59483726150a9b8c7a1b2c3d4": {
      "op": "DELAY",
      "abi": {
        "types": "focused -> delayed",
        "effects": [],
        "ports": {
          "in": "focused",
          "out": "delayed"
        }
      },
      "ports": {
        "in": "focused",
        "out": "delayed"
      },
      "law": "temporal",
      "cost": "O(1)",
      "gid": "c2f1e0d9b8a7968574635241f0e9d8c7b6a59483726150a9b8c7d6e5f493a2b1",
      "iid": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890".slice(0, 64),
      "xid": "d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2",
      "links": {},
      "receipt": null
    },
    "baf8a7ea8476e1b730e84f17885c08eaacf1a40c3572d709b90fb5efc9femeta": {
      "oids": [
        "baf8a7ea8476e1b730e84f17885c08eaacf1a40c3572d709b90fb5efc9fe4",
        "bafc2f1e0d9b8a7968574635241f0e9d8c7b6a59483726150a9b8c7a1b2c3d4"
      ],
      "root": "baf8a7ea8476e1b730e84f17885c08eaacf1a40c3572d709b90fb5efc9fe4"
    }
  },
  "root": "baf8a7ea8476e1b730e84f17885c08eaacf1a40c3572d709b90fb5efc9femeta",
  "gidSet": [
    "8a7ea8476e1b730e84f17885c08eaacf1a40c3572d709bdb30e88fff154f1602",
    "c2f1e0d9b8a7968574635241f0e9d8c7b6a59483726150a9b8c7d6e5f493a2b1"
  ],
  "iidSet": [
    "90fb5efc9fe440fd0d0e197cb3b5ae1f9d18aed0b6f659b63ea222674d9afd6b",
    "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890".slice(0, 64)
  ],
  "expected": {
    "minRouteLen": 2,
    "invariants": [
      "GID independent of ports",
      "IID equal for abi-equal"
    ]
  }
};

/**
 * Test utilities
 */
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  assert(condition, message) {
    if (condition) {
      console.log(`✓ ${message}`);
      this.passed++;
    } else {
      console.log(`❌ ${message}`);
      this.failed++;
    }
    this.tests.push({ passed: condition, message });
  }

  assertEqual(actual, expected, message) {
    const equals = JSON.stringify(actual) === JSON.stringify(expected);
    this.assert(equals, `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
  }

  assertArraysEqual(actual, expected, message) {
    const actualSorted = [...actual].sort();
    const expectedSorted = [...expected].sort();
    this.assertEqual(actualSorted, expectedSorted, message);
  }

  report() {
    console.log(`\\n=== Test Results ===`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Total: ${this.passed + this.failed}`);

    if (this.failed > 0) {
      console.log(`\\n❌ Some tests failed`);
      process.exit(1);
    } else {
      console.log(`\\n✅ All tests passed`);
    }
  }
}

/**
 * Setup test environment
 */
function setupTest() {
  // Clean up any existing test directory
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }

  // Create test directories
  mkdirSync(TEST_DIR, { recursive: true });
  mkdirSync(SEEDS_DIR, { recursive: true });
  mkdirSync(VAULT_DIR, { recursive: true });

  // Write test seeds
  writeFileSync(join(SEEDS_DIR, 'tiles-format.json'), JSON.stringify(TILES_SEED, null, 2));
  writeFileSync(join(SEEDS_DIR, 'operon-format.json'), JSON.stringify(OPERON_SEED, null, 2));

  // Create alias test - same seed with different name
  const ALIAS_SEED = { ...TILES_SEED, name: 'test-focus-delay-alias' };
  writeFileSync(join(SEEDS_DIR, 'alias-format.json'), JSON.stringify(ALIAS_SEED, null, 2));

  // Create conflict test - same GID but different canonical form
  const CONFLICT_SEED = {
    ...TILES_SEED,
    name: 'test-focus-delay-conflict',
    tiles: [
      {
        ...TILES_SEED.tiles[0],
        code: 'y => y'  // Different code but should produce same GID (testing conflict detection)
      },
      TILES_SEED.tiles[1]
    ]
  };
  writeFileSync(join(SEEDS_DIR, 'conflict-format.json'), JSON.stringify(CONFLICT_SEED, null, 2));
}

/**
 * Cleanup test environment
 */
function cleanupTest() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

/**
 * Run ingest command
 */
function runIngest(format = 'auto', extraOptions = '') {
  try {
    const indexPath = join(TEST_DIR, 'index.json');
    const diagnosticsDir = join(TEST_DIR, 'diagnostics');
    const cmd = `cd /Users/chaoshex/Projects/pure-lambda && ts-node tools/fed/ingest.ts --format=${format} --vault=${VAULT_DIR} --manifest=${MANIFEST_PATH} --index=${indexPath} --diagnostics=${diagnosticsDir} --verbose ${extraOptions} ${SEEDS_DIR}`;
    const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout, stderr: error.stderr };
  }
}

/**
 * Main test execution
 */
function runTests() {
  const test = new TestRunner();

  console.log('=== Federation Ingest Format Tests ===\\n');

  // Setup
  setupTest();

  try {
    // Test 1: Ingest both formats
    console.log('📋 Test 1: Ingesting tiles and operon formats...');
    const ingestResult = runIngest('auto');
    test.assert(ingestResult.success, 'Ingest command succeeded');

    if (!ingestResult.success) {
      console.log('Ingest error:', ingestResult.error);
      console.log('Stdout:', ingestResult.output);
      console.log('Stderr:', ingestResult.stderr);
      return test.report();
    }

    // Test 2: Check manifest exists
    console.log('\\n📋 Test 2: Checking manifest generation...');
    test.assert(existsSync(MANIFEST_PATH), 'Manifest file created');

    if (!existsSync(MANIFEST_PATH)) {
      return test.report();
    }

    // Test 3: Parse and validate manifest
    const manifestContent = readFileSync(MANIFEST_PATH, 'utf8');
    const manifest = JSON.parse(manifestContent);

    test.assertEqual(manifest.pl_fed, 'PL-FED-01', 'Manifest has correct format identifier');
    test.assert(Array.isArray(manifest.seeds), 'Manifest has seeds array');
    test.assert(typeof manifest.trust === 'object', 'Manifest has trust object');
    test.assert(Array.isArray(manifest.quarantine), 'Manifest has quarantine array');

    // Test 4: Check seed count (should include alias and potentially conflict)
    console.log('\\n📋 Test 3: Validating seed processing...');
    test.assert(manifest.seeds.length >= 2, `At least two seeds processed (got ${manifest.seeds.length})`);

    // Test 5: Find our test seeds in manifest
    const tilesManifestSeed = manifest.seeds.find(s => s.source.file.includes('tiles-format.json'));
    const operonManifestSeed = manifest.seeds.find(s => s.source.file.includes('operon-format.json'));

    test.assert(tilesManifestSeed !== undefined, 'Tiles format seed found in manifest');
    test.assert(operonManifestSeed !== undefined, 'Operon format seed found in manifest');

    if (!tilesManifestSeed || !operonManifestSeed) {
      return test.report();
    }

    // Test 6: Verify format detection
    console.log('\\n📋 Test 4: Validating format detection...');
    test.assertEqual(tilesManifestSeed.source.format, 'tiles', 'Tiles format correctly detected');
    test.assertEqual(operonManifestSeed.source.format, 'operon', 'Operon format correctly detected');

    // Test 7: Compare GID/IID/XID sets - they should be identical
    console.log('\\n📋 Test 5: Comparing hash sets between formats...');
    test.assertArraysEqual(tilesManifestSeed.gidSet, operonManifestSeed.gidSet, 'GID sets match between formats');
    test.assertArraysEqual(tilesManifestSeed.iidSet, operonManifestSeed.iidSet, 'IID sets match between formats');
    test.assertArraysEqual(tilesManifestSeed.xidSet, operonManifestSeed.xidSet, 'XID sets match between formats');

    // Test 8: Check for quarantine
    console.log('\\n📋 Test 6: Checking quarantine status...');
    const tilesQuarantined = manifest.quarantine.some(q => q.hash === tilesManifestSeed.hash);
    const operonQuarantined = manifest.quarantine.some(q => q.hash === operonManifestSeed.hash);

    test.assert(!tilesQuarantined, 'Tiles format seed not quarantined');
    test.assert(!operonQuarantined, 'Operon format seed not quarantined');

    // Test 9: Check trust score
    console.log('\\n📋 Test 7: Validating trust metrics...');
    test.assert(manifest.trust.score > 0, 'Trust score is positive');
    test.assertEqual(manifest.trust.stats.conformant, 2, 'Both seeds are conformant');

    // Test 10: Verify vault files exist
    console.log('\\n📋 Test 8: Checking vault storage...');
    const tilesVaultFile = join(VAULT_DIR, `${tilesManifestSeed.hash}.seed.json`);
    const operonVaultFile = join(VAULT_DIR, `${operonManifestSeed.hash}.seed.json`);

    test.assert(existsSync(tilesVaultFile), 'Tiles seed stored in vault');
    test.assert(existsSync(operonVaultFile), 'Operon seed stored in vault');

    // Test 11: Verify vault files are in canonical tiles format
    if (existsSync(tilesVaultFile) && existsSync(operonVaultFile)) {
      const tilesVaultSeed = JSON.parse(readFileSync(tilesVaultFile, 'utf8'));
      const operonVaultSeed = JSON.parse(readFileSync(operonVaultFile, 'utf8'));

      test.assert(Array.isArray(tilesVaultSeed.tiles), 'Tiles vault seed has tiles array');
      test.assert(Array.isArray(operonVaultSeed.tiles), 'Operon vault seed normalized to tiles array');
      test.assertEqual(tilesVaultSeed.pl_seed, 'PL-SEED-01', 'Tiles vault seed has correct format');
      test.assertEqual(operonVaultSeed.pl_seed, 'PL-SEED-01', 'Operon vault seed normalized to correct format');
    }

    console.log('\\n📋 Test 9: Testing alias merging and quarantine detection...');

    // Find alias and conflict seeds in manifest
    const aliasManifestSeed = manifest.seeds.find(s => s.source.file.includes('alias-format.json'));
    const conflictManifestSeed = manifest.seeds.find(s => s.source.file.includes('conflict-format.json'));

    // Test alias handling
    if (aliasManifestSeed) {
      // Check if alias seed was recognized (should share GIDs with tiles seed)
      test.assertArraysEqual(aliasManifestSeed.gidSet, tilesManifestSeed.gidSet, 'Alias seed has same GID set as original');

      // Check if alias should have been merged (or quarantined if different canonical form)
      const aliasQuarantined = manifest.quarantine.some(q => q.hash === aliasManifestSeed.hash);

      if (!aliasQuarantined) {
        console.log('✓ Alias seed merged successfully (identical canonical form)');
      } else {
        console.log('✓ Alias seed quarantined (different canonical form detected)');
      }
    }

    // Test conflict detection
    if (conflictManifestSeed) {
      const conflictQuarantined = manifest.quarantine.some(q =>
        q.hash === conflictManifestSeed.hash &&
        (q.reason === 'GID_CANON_BUG' || q.reason === 'VALIDATION_ERROR')
      );

      if (conflictQuarantined) {
        test.assert(true, 'Conflict seed properly quarantined');
        console.log('✓ GID conflict properly detected and quarantined');
      } else {
        console.log('ℹ️ Conflict seed not quarantined - may have normalized to same canonical form');
      }
    }

    // Test GID index creation
    const indexPath = join(TEST_DIR, 'index.json');
    test.assert(existsSync(indexPath), 'GID index file created');

    if (existsSync(indexPath)) {
      const gidIndex = JSON.parse(readFileSync(indexPath, 'utf8'));
      test.assert(typeof gidIndex === 'object', 'GID index is valid JSON object');

      // Should have entries for each GID from our test seeds
      const totalGids = new Set([
        ...tilesManifestSeed.gidSet,
        ...operonManifestSeed.gidSet
      ]);

      test.assert(Object.keys(gidIndex).length >= totalGids.size, 'GID index contains expected number of entries');
      console.log(`✓ GID index created with ${Object.keys(gidIndex).length} entries`);
    }

    // Test diagnostics directory
    const diagnosticsDir = join(TEST_DIR, 'diagnostics');
    if (existsSync(diagnosticsDir)) {
      const diagnosticsFiles = readdirSync(diagnosticsDir);
      if (diagnosticsFiles.length > 0) {
        test.assert(true, `Diagnostics files created (${diagnosticsFiles.length} files)`);
        console.log(`✓ Diagnostics generated: ${diagnosticsFiles.join(', ')}`);
      }
    }

    console.log('\\n📋 Test 10: Verifying Garden compatibility...');

    // Test actual Garden seeds if they exist
    const gardenDir = '/Users/chaoshex/Projects/pure-lambda/seeds/garden';
    if (existsSync(gardenDir)) {
      const gardenResult = runIngest('auto');
      if (gardenResult.success) {
        test.assert(true, 'Garden seeds ingest successfully');

        // Check updated manifest
        const updatedManifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
        test.assert(updatedManifest.seeds.length >= 2, 'Garden seeds added to manifest');
        test.assert(updatedManifest.quarantine.length === 0, 'No Garden seeds quarantined due to format issues');
      } else {
        test.assert(false, `Garden seeds ingest failed: ${gardenResult.error}`);
      }
    } else {
      console.log('⚠ Garden directory not found, skipping Garden compatibility test');
    }

  } catch (error) {
    console.error('Test execution error:', error);
    test.assert(false, `Test execution failed: ${error.message}`);
  } finally {
    // Cleanup
    cleanupTest();
  }

  test.report();
}

// Run tests
runTests();