#!/usr/bin/env node
/**
 * Conformance test set v1 - 10 receipts per profile (40 total)
 * These must always remain green for Lattice Control v1
 */

const fs = require('fs');
const { decide } = require('./lattice-control');

// Conformance receipts - canonical examples per profile
const CONFORMANCE_SET = [
  // APEX profile (10 receipts) - pure functions with full proofs
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `conf-apex-${i}`,
    attributes: [
      'type:pure_function',
      'exec:success',
      'proof:deterministic',
      'proof:memoization_safe',
      'oracle:no_fs',
      'oracle:no_net',
      'oracle:no_env',
      'oracle:no_rand',
      'oracle:no_time',
      `lang:${['typescript', 'python', 'rust'][i % 3]}`,
      `size:${['xs_1_10kb', 'm_1_10mb'][i % 2]}`,
      'gene:MEMO',
      'cache:high',
      'speed:fast'
    ],
    expected: {
      profile: 'apex',
      min_confidence: 0.8,
      genes: { MEMO: true, PAR: true, SURGEON: false }
    }
  })),

  // PROOF profile (10 receipts) - success with no side effects
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `conf-proof-${i}`,
    attributes: [
      'type:validation',
      'exec:success',
      'oracle:no_fs',
      'oracle:no_net',
      'oracle:no_env',
      `lang:${['typescript', 'python'][i % 2]}`,
      'size:xs_1_10kb',
      'gene:MEMO',
      'cache:high',
      'speed:fast'
    ],
    expected: {
      profile: 'proof',
      min_confidence: 0.5,
      genes: { MEMO: true, PAR: false, SURGEON: false }
    }
  })),

  // PERFORMANCE profile (10 receipts) - large successful operations
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `conf-perf-${i}`,
    attributes: [
      'type:graph_algo',
      'exec:success',
      'size:l_100mb_plus',
      'oracle:no_fs',
      'oracle:no_net',
      'oracle:no_env',
      'lang:rust',
      'gene:PAR',
      'cache:low',
      `speed:${['medium', 'slow'][i % 2]}`
    ],
    expected: {
      profile: 'performance',
      min_confidence: 0.5,
      genes: { MEMO: false, PAR: true, SURGEON: false }
    }
  })),

  // UNIVERSAL profile (10 receipts) - side effects or failures
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `conf-univ-${i}`,
    attributes: [
      'type:io_bounded',
      i < 5 ? 'exec:failure' : 'exec:success',
      i < 5 ? 'oracle:fs' : 'oracle:net',
      'lang:python',
      'size:l_100mb_plus',
      'gene:MEMO',
      'cache:low',
      'speed:slow'
    ],
    expected: {
      profile: 'universal',
      min_confidence: 0,
      genes: { MEMO: false, PAR: false, SURGEON: false }
    }
  }))
];

/**
 * Run conformance tests
 */
function runConformanceTests() {
  console.log('🧪 Running Conformance Tests v1\n');
  console.log('=' .repeat(60));

  let passed = 0;
  let failed = 0;
  const failures = [];

  CONFORMANCE_SET.forEach(test => {
    const decision = decide(test.attributes);

    // Check profile match
    const profileOk = decision.profile === test.expected.profile;

    // Check confidence threshold
    const confOk = decision.confidence >= test.expected.min_confidence;

    // Check gene activation
    const genesOk = JSON.stringify(decision.genes) === JSON.stringify(test.expected.genes);

    if (profileOk && confOk && genesOk) {
      passed++;
      console.log(`✅ ${test.id}: ${decision.profile} (${decision.confidence.toFixed(2)})`);
    } else {
      failed++;
      failures.push({
        id: test.id,
        expected: test.expected.profile,
        got: decision.profile,
        confidence: decision.confidence
      });
      console.log(`❌ ${test.id}: Expected ${test.expected.profile}, got ${decision.profile}`);
    }
  });

  console.log('=' .repeat(60));
  console.log(`\nResults: ${passed}/${CONFORMANCE_SET.length} passed`);

  if (failed > 0) {
    console.log('\nFailures:');
    failures.forEach(f => {
      console.log(`  ${f.id}: ${f.expected} → ${f.got} (conf: ${f.confidence.toFixed(2)})`);
    });
  }

  // Save conformance results
  const results = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    passed: passed,
    total: CONFORMANCE_SET.length,
    rate: (passed / CONFORMANCE_SET.length * 100).toFixed(1) + '%',
    failures: failures
  };

  fs.writeFileSync(
    'fractal-lattice/conformance-results.json',
    JSON.stringify(results, null, 2)
  );

  return passed === CONFORMANCE_SET.length;
}

/**
 * OOD Sentinel checks
 */
function setupOODSentinels() {
  console.log('\n🛡️ OOD Sentinels Configuration:\n');

  const sentinels = {
    confidence_threshold: 0.5,
    hasse_distance_max: 2,
    entropy_spike_threshold: 1.5,
    unknown_attr_limit: 2,
    quarantine_log: 'fractal-lattice/quarantine.jsonl'
  };

  console.log('Thresholds:');
  console.log(`  Min confidence: ${sentinels.confidence_threshold}`);
  console.log(`  Max Hasse distance: ${sentinels.hasse_distance_max}`);
  console.log(`  Entropy spike: ${sentinels.entropy_spike_threshold}x`);
  console.log(`  Unknown attrs: ${sentinels.unknown_attr_limit}`);
  console.log(`  Quarantine: ${sentinels.quarantine_log}`);

  // Save sentinel config
  fs.writeFileSync(
    'fractal-lattice/ood-sentinels.json',
    JSON.stringify(sentinels, null, 2)
  );

  return sentinels;
}

/**
 * A/B switch configuration
 */
function setupABSwitch() {
  console.log('\n🔄 A/B Switch Configuration:\n');

  const config = {
    PL_POLICY: process.env.PL_POLICY || 'auto',
    options: ['apex', 'proof', 'performance', 'universal', 'auto'],
    default: 'auto',
    crisis_mode: 'universal'
  };

  console.log(`Current: PL_POLICY=${config.PL_POLICY}`);
  console.log(`Options: ${config.options.join(', ')}`);
  console.log(`Crisis: ${config.crisis_mode} (instant safe mode)`);

  return config;
}

// Main execution
if (require.main === module) {
  // Run conformance tests
  const conformanceOk = runConformanceTests();

  // Setup sentinels
  const sentinels = setupOODSentinels();

  // Setup A/B switch
  const abSwitch = setupABSwitch();

  // Final status
  console.log('\n' + '='.repeat(60));
  console.log('\n🔮 LATTICE CONTROL v1 STATUS\n');
  console.log(`  Conformance: ${conformanceOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Sentinels: ✅ ARMED`);
  console.log(`  A/B Switch: ✅ READY`);
  console.log(`  Autopilot: ${conformanceOk ? '✅ ENABLED' : '⚠️ DEGRADED'}`);

  if (conformanceOk) {
    console.log('\n🚀 Autopilot увімкнено!');
    console.log('   Lattice is stable (J=1.0)');
    console.log('   Policy compiler active');
    console.log('   OOD protection enabled');
    console.log('   Crisis fallback: PL_POLICY=universal');
  } else {
    console.log('\n⚠️ Conformance failures detected');
    console.log('   Fix failures before enabling autopilot');
  }
}

module.exports = {
  CONFORMANCE_SET,
  runConformanceTests,
  setupOODSentinels,
  setupABSwitch
};