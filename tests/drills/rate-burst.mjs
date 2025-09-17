#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * Rate Burst Drill - Simulates burst submission to trigger rate limits
 */
async function runRateBurstDrill() {
  console.log('🔴 Red Team Drill: Rate Burst Attack');
  console.log('=' .repeat(40));
  console.log('Simulating rapid seed submissions to trigger rate limiter...\n');

  const receiptsDir = path.join(projectRoot, 'receipts', 'ingest');

  // Ensure directory exists
  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, { recursive: true });
  }

  // Create test DID for attacker
  const attackerDID = 'did:plc:attacker-burst-test';

  // Simulate 6 submissions in quick succession (exceeds daily burst of 5)
  const submissions = [];
  const baseTime = new Date();

  for (let i = 0; i < 6; i++) {
    const timestamp = new Date(baseTime.getTime() + i * 1000); // 1 second apart
    const receipt = {
      timestamp: timestamp.toISOString(),
      operator: { did: attackerDID },
      seeds_added: [{ name: `burst-seed-${i}`, size: 1000 }]
    };

    const filename = `test-burst-${timestamp.getTime()}.json`;
    const filepath = path.join(receiptsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(receipt, null, 2));
    submissions.push(filename);

    console.log(`📝 Created submission ${i + 1}: ${filename}`);
  }

  // Now check rate limit for the attacker
  console.log('\n🔍 Checking rate limit status...');

  const { checkRateLimit } = await import('../../scripts/fed/rate.mjs');
  const result = checkRateLimit(attackerDID);

  console.log('\n📊 Rate Limit Result:');
  console.log(JSON.stringify(result, null, 2));

  // Cleanup test files
  console.log('\n🧹 Cleaning up test submissions...');
  for (const file of submissions) {
    fs.unlinkSync(path.join(receiptsDir, file));
  }

  // Verify drill success
  if (!result.ok && result.reason.includes('RATE_LIMIT')) {
    console.log('\n✅ Drill PASSED: Rate limiter successfully blocked burst attack');
    console.log(`   Reason: ${result.reason}`);
    return true;
  } else {
    console.log('\n❌ Drill FAILED: Rate limiter did not block burst attack');
    return false;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  runRateBurstDrill()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Drill error:', error.message);
      process.exit(1);
    });
}

export { runRateBurstDrill };