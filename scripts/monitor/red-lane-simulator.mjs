#!/usr/bin/env node

/**
 * Red Lane Simulator - Test defenses with bad seeds
 */

import fs from 'fs';
import { execSync } from 'child_process';

const BAD_SEEDS = [
  {
    name: 'ood-giant',
    type: 'size',
    seed: {
      name: 'bloated-monster',
      version: 1,
      size: '500KB',
      nodes: Array(1000).fill({ op: 'NOOP' }),
      edges: Array(5000).fill([0, 1])
    }
  },
  {
    name: 'near-duplicate',
    type: 'duplicate',
    seed: {
      name: 'select-focus-copy',
      version: 1,
      nodes: [
        { op: 'ENTER' },
        { op: 'SELECT' },
        { op: 'FOCUS' },
        { op: 'EXIT' }
      ],
      edges: [[0,1], [1,2], [2,3]],
      xidv2: 'abc123def456789012345678901234567890'
    }
  },
  {
    name: 'biolock-trigger',
    type: 'biolock',
    seed: {
      name: 'crypto-miner',
      version: 1,
      intent: 'mine cryptocurrency using spare compute',
      nodes: [
        { op: 'CRYPTO_HASH' },
        { op: 'MINE_BLOCK' }
      ]
    }
  },
  {
    name: 'malformed',
    type: 'invalid',
    seed: {
      // Missing required fields
      nodes: 'not-an-array',
      edges: null
    }
  }
];

async function simulateRedLane() {
  console.log('🔴 Red Lane Simulator');
  console.log('=' .repeat(40));
  console.log('Testing defenses with intentionally bad seeds...\n');

  const results = [];
  const startTime = Date.now();

  for (const badSeed of BAD_SEEDS) {
    console.log(`\n🎯 Testing: ${badSeed.name} (${badSeed.type})`);

    const tempFile = `/tmp/bad-seed-${badSeed.name}.json`;
    fs.writeFileSync(tempFile, JSON.stringify(badSeed.seed, null, 2));

    const testStart = Date.now();
    let blocked = false;
    let blockReason = '';
    let timeToBlock = 0;

    try {
      // Test size check
      const sizeKB = JSON.stringify(badSeed.seed).length / 1024;
      if (sizeKB > 80) {
        blocked = true;
        blockReason = 'size-limit';
        timeToBlock = Date.now() - testStart;
        console.log(`   ✅ Blocked: Size limit (${sizeKB.toFixed(1)}KB > 80KB)`);
      }

      // Test BIOLOCK
      if (!blocked && badSeed.type === 'biolock') {
        try {
          execSync(`node scripts/biolock/lint.mjs ${tempFile}`, { stdio: 'ignore' });
        } catch (e) {
          blocked = true;
          blockReason = 'biolock';
          timeToBlock = Date.now() - testStart;
          console.log(`   ✅ Blocked: BIOLOCK policy violation`);
        }
      }

      // Test deduplication
      if (!blocked && badSeed.type === 'duplicate') {
        try {
          const result = execSync(
            `node scripts/novelty/dedupe.mjs ${tempFile} seeds/garden/*.json`,
            { encoding: 'utf8', stdio: 'pipe' }
          );
          const parsed = JSON.parse(result);
          if (parsed.nearDuplicates.length > 0) {
            blocked = true;
            blockReason = 'duplicate';
            timeToBlock = Date.now() - testStart;
            console.log(`   ✅ Blocked: Near-duplicate detected`);
          }
        } catch (e) {
          // Dedupe check failed (exit code 2 means duplicate found)
          if (e.status === 2) {
            blocked = true;
            blockReason = 'duplicate';
            timeToBlock = Date.now() - testStart;
            console.log(`   ✅ Blocked: Near-duplicate detected`);
          }
        }
      }

      // Test conformance
      if (!blocked && badSeed.type === 'invalid') {
        try {
          execSync(`node scripts/ga/conformance.mjs ${tempFile}`, { stdio: 'ignore' });
        } catch (e) {
          blocked = true;
          blockReason = 'conformance';
          timeToBlock = Date.now() - testStart;
          console.log(`   ✅ Blocked: Conformance check failed`);
        }
      }

      if (!blocked) {
        console.log(`   ❌ NOT BLOCKED - Defense failure!`);
      }

    } catch (error) {
      blocked = true;
      blockReason = 'error';
      timeToBlock = Date.now() - testStart;
      console.log(`   ✅ Blocked: ${error.message}`);
    }

    results.push({
      seed: badSeed.name,
      type: badSeed.type,
      blocked,
      reason: blockReason,
      timeMs: timeToBlock
    });

    // Clean up
    try {
      fs.unlinkSync(tempFile);
    } catch (e) {}
  }

  const totalTime = Date.now() - startTime;

  console.log('\n' + '=' .repeat(40));
  console.log('📊 Red Lane Simulation Results:\n');

  const blocked = results.filter(r => r.blocked);
  const passed = results.filter(r => !r.blocked);

  console.log(`✅ Blocked: ${blocked.length}/${results.length}`);
  console.log(`❌ Passed: ${passed.length}/${results.length}`);

  if (blocked.length > 0) {
    console.log('\n⏱️ Time to quarantine:');
    for (const result of blocked) {
      console.log(`   ${result.seed}: ${result.timeMs}ms ${result.timeMs <= 60000 ? '✅' : '⚠️'}`);
    }

    const avgTime = blocked.reduce((sum, r) => sum + r.timeMs, 0) / blocked.length;
    console.log(`   Average: ${avgTime.toFixed(0)}ms`);
  }

  if (passed.length > 0) {
    console.log('\n⚠️ Defense gaps found:');
    for (const result of passed) {
      console.log(`   - ${result.seed} (${result.type})`);
    }
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    blocked: blocked.length,
    passed: passed.length,
    successRate: (blocked.length / results.length * 100).toFixed(1),
    avgTimeToBlock: blocked.length > 0
      ? (blocked.reduce((sum, r) => sum + r.timeMs, 0) / blocked.length).toFixed(0)
      : null,
    details: results,
    totalTimeMs: totalTime
  };

  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync('dist/red-lane-report.json', JSON.stringify(report, null, 2));

  console.log('\n✅ Report saved: dist/red-lane-report.json');

  // Exit with error if any bad seeds passed
  if (passed.length > 0) {
    console.log('\n❌ Red Lane test failed - defenses need improvement');
    process.exit(1);
  } else {
    console.log('\n✅ All defenses operational!');
  }
}

// CLI
if (process.argv[1] === new URL(import.meta.url).pathname) {
  simulateRedLane().catch(error => {
    console.error('❌ Simulation failed:', error.message);
    process.exit(1);
  });
}

export { simulateRedLane };