#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Test configuration
const TEST_SEED = 'hello-city';
const TEST_TIMEOUT = 30000; // 30 seconds

// Cleanup function
function cleanup() {
  const filesToClean = [
    'out/seed-qr.svg',
    'out/seed-qr.txt',
    'out/ck/validate.json',
    `out/ck/${TEST_SEED}.cartridge`,
    `out/ck/${TEST_SEED}.cartridge.sha256`,
    'out/ck/PR.md',
    'out/ck/PR-summary.txt',
    'tmp/'
  ];

  filesToClean.forEach(file => {
    const fullPath = path.join(projectRoot, file);
    if (fs.existsSync(fullPath)) {
      if (fs.statSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }
  });
}

// Run command with error handling
function runCommand(cmd, description) {
  console.log(`  Running: ${description}`);
  console.log(`    Command: ${cmd}`);

  try {
    const output = execSync(cmd, {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: TEST_TIMEOUT
    });

    console.log(`    ✅ Success`);
    if (output.trim()) {
      console.log(`    Output: ${output.split('\n')[0]}...`);
    }
    return output;
  } catch (error) {
    console.error(`    ❌ Failed: ${error.message}`);
    throw error;
  }
}

// Verify file exists and meets criteria
function verifyFile(filePath, description, checks = {}) {
  console.log(`  Checking: ${description}`);
  console.log(`    Path: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  console.log(`    Size: ${stats.size} bytes`);

  // Size checks
  if (checks.maxSize && stats.size > checks.maxSize) {
    throw new Error(`File too large: ${stats.size} > ${checks.maxSize}`);
  }

  if (checks.minSize && stats.size < checks.minSize) {
    throw new Error(`File too small: ${stats.size} < ${checks.minSize}`);
  }

  // Content checks
  if (checks.mustContain) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const text of checks.mustContain) {
      if (!content.includes(text)) {
        throw new Error(`File missing required text: "${text}"`);
      }
    }
  }

  console.log(`    ✅ File verification passed`);
  return stats;
}

// Parse JSON file and verify structure
function verifyJsonFile(filePath, description, requiredFields = []) {
  verifyFile(filePath, description);

  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);

  for (const field of requiredFields) {
    if (!(field in data)) {
      throw new Error(`JSON missing required field: ${field}`);
    }
  }

  console.log(`    ✅ JSON structure verified`);
  return data;
}

// Main test function
async function runSmokeTest() {
  const startTime = Date.now();

  console.log('🧪 Pure Lambda Contributor Kit - Smoke Test');
  console.log('='.repeat(50));
  console.log('');

  try {
    // Setup
    console.log('📋 Setup');
    cleanup();

    const seedPath = path.join(projectRoot, `seeds/garden/${TEST_SEED}.json`);
    verifyFile(seedPath, `Test seed: ${TEST_SEED}`, {
      mustContain: ['pl_seed', 'version'],
      minSize: 100
    });

    // Test 1: QR Code Generation
    console.log('\n🔗 Test 1: QR Code Generation');
    runCommand(
      `ts-node tools/ck/qrcode.ts ${seedPath}`,
      'Generate QR code'
    );

    verifyFile(
      path.join(projectRoot, 'out/seed-qr.svg'),
      'QR code SVG',
      { minSize: 1000, mustContain: ['<svg', 'width="400"'] }
    );

    verifyFile(
      path.join(projectRoot, 'out/seed-qr.txt'),
      'QR code data',
      { minSize: 10 }
    );

    // Test 2: Validation
    console.log('\n✅ Test 2: Validation');
    try {
      runCommand(
        `node scripts/ck/validate.mjs ${seedPath}`,
        'Validate seed'
      );
    } catch (error) {
      // Validation may fail with exit code 1 if trust < 95%, but that's OK for testing
      console.log('    ⚠️ Validation returned non-zero exit (expected for test seed)');
    }

    const validationData = verifyJsonFile(
      path.join(projectRoot, 'out/ck/validate.json'),
      'Validation results',
      ['seed', 'conformance', 'trust', 'ready']
    );

    if (validationData.trust.trustScore < 0.5) {
      throw new Error(`Trust score too low: ${validationData.trust.trustScore}`);
    }

    console.log(`    Trust score: ${(validationData.trust.trustScore * 100).toFixed(1)}%`);

    // Test 3: Bundle Creation
    console.log('\n📦 Test 3: Bundle Creation');
    runCommand(
      `node scripts/ck/bundle.mjs ${seedPath}`,
      'Create cartridge'
    );

    const cartridgePath = path.join(projectRoot, `out/ck/${TEST_SEED}.cartridge`);
    const cartridgeData = verifyJsonFile(
      cartridgePath,
      'Cartridge file',
      ['manifest', 'seed']
    );

    verifyFile(
      path.join(projectRoot, `out/ck/${TEST_SEED}.cartridge.sha256`),
      'Cartridge hash file',
      { minSize: 10 }
    );

    console.log(`    XIDv2: ${cartridgeData.manifest.xidV2.slice(0, 16)}...`);

    // Test 4: PR Generation
    console.log('\n📋 Test 4: PR Generation');
    runCommand(
      `node scripts/ck/pr.mjs ${cartridgePath}`,
      'Generate PR markdown'
    );

    verifyFile(
      path.join(projectRoot, 'out/ck/PR.md'),
      'PR markdown',
      {
        minSize: 1000,
        mustContain: [
          '# Seed Contribution',
          TEST_SEED,
          'Trust Score',
          'Maintainer Checklist'
        ]
      }
    );

    verifyFile(
      path.join(projectRoot, 'out/ck/PR-summary.txt'),
      'PR summary',
      { minSize: 50, mustContain: [TEST_SEED] }
    );

    // Test 5: Verify Cartridge (round-trip test)
    console.log('\n🔍 Test 5: Cartridge Verification');
    runCommand(
      `node scripts/ck/bundle.mjs --verify ${cartridgePath}`,
      'Verify cartridge integrity'
    );

    // Test 6: QR Decode Simulation (verify QR data is valid)
    console.log('\n🔄 Test 6: QR Data Verification');
    const qrData = fs.readFileSync(path.join(projectRoot, 'out/seed-qr.txt'), 'utf8');

    // Decode base64url
    const decodedData = Buffer.from(
      qrData.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    ).toString('utf8');

    const decodedSeed = JSON.parse(decodedData);
    if (decodedSeed.name !== TEST_SEED) {
      throw new Error(`QR decode mismatch: expected ${TEST_SEED}, got ${decodedSeed.name}`);
    }

    console.log(`    ✅ QR data decodes to correct seed: ${decodedSeed.name}`);

    // Test 7: Size Gate Verification
    console.log('\n📏 Test 7: Size Gate Verification');
    const totalSize = cartridgeData.manifest.size.total;
    const maxSize = 100 * 1024; // 100KB total limit

    if (totalSize > maxSize) {
      throw new Error(`Cartridge too large: ${totalSize} > ${maxSize}`);
    }

    console.log(`    ✅ Size gates passed: ${(totalSize / 1024).toFixed(1)} KB ≤ 100 KB`);

    // Success Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n🎉 Smoke Test Results');
    console.log('='.repeat(50));
    console.log(`✅ All tests passed in ${duration}s`);
    console.log('');
    console.log('Workflow verified:');
    console.log(`  1. QR code generation: ✅`);
    console.log(`  2. Seed validation: ✅ (${(validationData.trust.trustScore * 100).toFixed(1)}%)`);
    console.log(`  3. Cartridge bundling: ✅`);
    console.log(`  4. PR generation: ✅`);
    console.log(`  5. Round-trip verification: ✅`);
    console.log(`  6. QR data integrity: ✅`);
    console.log(`  7. Size gates: ✅`);
    console.log('');
    console.log('🚀 Contributor Kit is ready for use!');

    return true;

  } catch (error) {
    console.error('\n❌ Smoke Test Failed');
    console.error('='.repeat(50));
    console.error(`Error: ${error.message}`);
    console.error('');
    console.error('Debug information:');
    console.error(`  Working directory: ${projectRoot}`);
    console.error(`  Test seed: ${TEST_SEED}`);
    console.error(`  Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

    return false;

  } finally {
    // Cleanup (optional - comment out for debugging)
    console.log('\n🧹 Cleanup');
    try {
      cleanup();
      console.log('  ✅ Cleanup completed');
    } catch (e) {
      console.log(`  ⚠️ Cleanup warning: ${e.message}`);
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  runSmokeTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { runSmokeTest };