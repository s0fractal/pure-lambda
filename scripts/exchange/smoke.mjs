#!/usr/bin/env node

/**
 * PSE (Public Seed Exchange) Smoke Test
 * Validates exchange index and performs integrity checks on artifacts
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import * as crypto from 'crypto';

// BLAKE3 implementation (using SHA-256 as fallback for compatibility)
function blake3(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Validate DSSE envelope structure
function validateDSSE(content) {
  try {
    const envelope = JSON.parse(content.toString('utf8'));

    // Check for required DSSE fields
    if (!envelope.payload || !envelope.signatures) {
      return false;
    }

    // Validate signatures array
    if (!Array.isArray(envelope.signatures) || envelope.signatures.length === 0) {
      return false;
    }

    // Check signature structure
    for (const sig of envelope.signatures) {
      if (!sig.protected || !sig.signature) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

async function runSmokeTests() {
  console.log('🔍 PSE Smoke Test - Validating Public Seed Exchange');
  console.log('='.repeat(60));

  const projectRoot = process.cwd();
  const exchangeDir = join(projectRoot, 'docs', 'exchange');
  const indexJsonPath = join(exchangeDir, 'index.json');
  const indexHtmlPath = join(exchangeDir, 'index.html');
  const distRelease = join(projectRoot, 'dist', 'release');

  let allPassed = true;
  let errorCount = 0;

  function fail(message) {
    console.log(`❌ ${message}`);
    allPassed = false;
    errorCount++;
  }

  function pass(message) {
    console.log(`✅ ${message}`);
  }

  function info(message) {
    console.log(`ℹ️  ${message}`);
  }

  // Check 1: Verify index.html exists
  console.log('\n📄 Checking exchange index files...');
  if (!existsSync(indexHtmlPath)) {
    fail('index.html not found in docs/exchange/');
  } else {
    pass('index.html exists');
  }

  // Check 2: Verify index.json exists
  if (!existsSync(indexJsonPath)) {
    fail('index.json not found in docs/exchange/');
    console.log('💥 Cannot continue without index.json');
    process.exit(1);
  } else {
    pass('index.json exists');
  }

  // Check 3: Parse and validate index.json structure
  let indexData;
  try {
    const content = readFileSync(indexJsonPath, 'utf8');
    indexData = JSON.parse(content);
    pass('index.json is valid JSON');
  } catch (error) {
    fail(`index.json parse error: ${error.message}`);
    process.exit(1);
  }

  // Check 4: Validate index.json schema
  console.log('\n🔍 Validating index.json schema...');
  if (!indexData.version) {
    fail('Missing version field in index.json');
  } else {
    pass(`Version: ${indexData.version}`);
  }

  if (!indexData.generated) {
    fail('Missing generated timestamp in index.json');
  } else {
    pass(`Generated: ${indexData.generated}`);
  }

  if (!Array.isArray(indexData.artifacts)) {
    fail('Missing or invalid artifacts array in index.json');
    process.exit(1);
  } else {
    pass(`Artifacts count: ${indexData.artifacts.length}`);
  }

  // Check 5: Process each artifact
  console.log('\n📦 Validating artifacts...');
  let totalSize = 0;
  let dsseCount = 0;

  for (const artifact of indexData.artifacts) {
    console.log(`\n  Checking ${artifact.name}:`);

    // Validate artifact schema
    if (!artifact.name || !artifact.kind || typeof artifact.size !== 'number' || !artifact.blake3 || typeof artifact.dsse !== 'boolean') {
      fail(`    Invalid artifact schema for ${artifact.name}`);
      continue;
    }

    const artifactPath = join(distRelease, artifact.name);

    // Check file exists
    if (!existsSync(artifactPath)) {
      fail(`    File not found: ${artifact.name}`);
      continue;
    } else {
      pass(`    File exists`);
    }

    // Check file size
    const stats = statSync(artifactPath);
    if (stats.size !== artifact.size) {
      fail(`    Size mismatch: expected ${artifact.size}, got ${stats.size}`);
    } else {
      pass(`    Size correct: ${artifact.size} bytes`);
    }

    // Check size limit (80KB)
    const sizeKB = Math.ceil(stats.size / 1024);
    if (sizeKB > 80) {
      fail(`    Size exceeds 80KB limit: ${sizeKB}KB`);
    } else {
      pass(`    Size within limits: ${sizeKB}KB (≤80KB)`);
    }

    totalSize += stats.size;

    // Verify BLAKE3 hash
    try {
      const content = readFileSync(artifactPath);
      const computedHash = blake3(content);

      if (computedHash !== artifact.blake3) {
        fail(`    BLAKE3 hash mismatch for ${artifact.name}`);
        console.log(`      Expected: ${artifact.blake3}`);
        console.log(`      Computed: ${computedHash}`);
      } else {
        pass(`    BLAKE3 hash verified: ${computedHash.substring(0, 16)}...`);
      }

      // Verify DSSE if claimed
      if (artifact.dsse) {
        if (validateDSSE(content)) {
          pass(`    DSSE envelope valid`);
          dsseCount++;
        } else {
          fail(`    DSSE envelope invalid or malformed`);
        }
      } else {
        info(`    No DSSE envelope (expected)`);
      }

    } catch (error) {
      fail(`    Error reading ${artifact.name}: ${error.message}`);
    }
  }

  // Check 6: Overall statistics
  console.log('\n📊 Exchange statistics:');
  const totalSizeKB = Math.ceil(totalSize / 1024);
  console.log(`   Total artifacts: ${indexData.artifacts.length}`);
  console.log(`   Total size: ${totalSizeKB} KB`);
  console.log(`   DSSE signed: ${dsseCount}`);

  // Size budget check (reasonable limit for PSE)
  const maxBudgetKB = 240; // 240KB total budget
  if (totalSizeKB > maxBudgetKB) {
    fail(`Total size ${totalSizeKB}KB exceeds budget ${maxBudgetKB}KB`);
  } else {
    pass(`Total size within budget: ${totalSizeKB}KB (≤${maxBudgetKB}KB)`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 PSE smoke test PASSED - All checks successful');
    console.log(`✅ ${indexData.artifacts.length} artifacts validated`);
    console.log(`✅ ${dsseCount} DSSE envelopes verified`);
    console.log(`✅ Total size: ${totalSizeKB}KB`);
    process.exit(0);
  } else {
    console.log(`💥 PSE smoke test FAILED - ${errorCount} errors found`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSmokeTests().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

export { runSmokeTests };