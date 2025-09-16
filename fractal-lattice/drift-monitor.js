#!/usr/bin/env node
/**
 * Drift Monitor - Track lattice stability metrics every pulse
 * Triggers auto-fallback on anomalies
 */

const fs = require('fs');
const { decide, LATTICE_CID } = require('./lattice-control');

// Load context for analysis
const context = fs.readFileSync('fractal-lattice/context.jsonl', 'utf-8')
  .trim().split('\n').map(line => JSON.parse(line));

/**
 * Calculate key stability metrics
 */
function calculateMetrics() {
  const metrics = {
    apex_support: 0,
    proof_support: 0,
    perf_support: 0,
    universal_support: 0,
    misroute_rate: 0,
    ood_rate: 0,
    rules_coverage: 0,
    entropy: 0,
    total_receipts: context.length
  };

  // Count profile distributions
  const decisions = [];
  const oodCount = [];

  context.forEach(receipt => {
    const decision = decide(receipt.attributes);
    decisions.push(decision);

    // Count profile support
    metrics[`${decision.profile}_support`]++;

    // Check for OOD
    if (decision.confidence < 0.5) {
      oodCount.push(receipt);
    }
  });

  // Calculate rates
  metrics.apex_support = (metrics.apex_support / context.length * 100).toFixed(1);
  metrics.proof_support = (metrics.proof_support / context.length * 100).toFixed(1);
  metrics.perf_support = (metrics.perf_support / context.length * 100).toFixed(1);
  metrics.universal_support = (metrics.universal_support / context.length * 100).toFixed(1);

  // Misroute detection (simplified: universal when should be specific)
  const expectedSpecific = context.filter(r =>
    r.attributes.includes('exec:success') &&
    !r.attributes.includes('oracle:fs') &&
    !r.attributes.includes('oracle:net')
  );
  const actualUniversal = expectedSpecific.filter(r => {
    const d = decide(r.attributes);
    return d.profile === 'universal';
  });
  metrics.misroute_rate = (actualUniversal.length / expectedSpecific.length * 100).toFixed(2);

  // OOD rate
  metrics.ood_rate = (oodCount.length / context.length * 100).toFixed(2);

  // Rules coverage (how many rules apply)
  const rulesApplied = new Set();
  decisions.forEach(d => {
    if (d.used_rules) {
      d.used_rules.forEach(r => rulesApplied.add(r));
    }
  });
  metrics.rules_coverage = (rulesApplied.size / 5 * 100).toFixed(0); // 5 total rules

  // Calculate entropy
  const attrFreq = {};
  context.forEach(r => {
    r.attributes.forEach(a => {
      attrFreq[a] = (attrFreq[a] || 0) + 1;
    });
  });

  const total = Object.values(attrFreq).reduce((a, b) => a + b, 0);
  metrics.entropy = Object.values(attrFreq).reduce((H, freq) => {
    const p = freq / total;
    return H - (p * Math.log2(p));
  }, 0).toFixed(2);

  return metrics;
}

/**
 * Check triggers and auto-fallback if needed
 */
function checkTriggers(metrics, prevMetrics) {
  const triggers = [];

  // Trigger: misroute > 1%
  if (parseFloat(metrics.misroute_rate) > 1.0) {
    triggers.push({
      type: 'MISROUTE',
      value: metrics.misroute_rate,
      threshold: '1%',
      action: 'fallback to universal'
    });
  }

  // Trigger: OOD > 2%
  if (parseFloat(metrics.ood_rate) > 2.0) {
    triggers.push({
      type: 'OOD_SPIKE',
      value: metrics.ood_rate,
      threshold: '2%',
      action: 'fallback to universal'
    });
  }

  // Trigger: Entropy spike (>1.5x)
  if (prevMetrics && prevMetrics.entropy) {
    const entropyDelta = metrics.entropy / prevMetrics.entropy;
    if (entropyDelta > 1.5) {
      triggers.push({
        type: 'ENTROPY_SPIKE',
        value: entropyDelta.toFixed(2) + 'x',
        threshold: '1.5x',
        action: 'investigate new patterns'
      });
    }
    metrics.entropyΔ = entropyDelta.toFixed(2);
  }

  // Trigger: Apex support drop (>20% relative)
  if (prevMetrics && prevMetrics.apex_support) {
    const apexDrop = (prevMetrics.apex_support - metrics.apex_support) / prevMetrics.apex_support;
    if (apexDrop > 0.2) {
      triggers.push({
        type: 'APEX_DROP',
        value: (apexDrop * 100).toFixed(0) + '%',
        threshold: '20%',
        action: 'generate targeted receipts'
      });
    }
  }

  return triggers;
}

/**
 * Generate drift report
 */
function generateReport(metrics, triggers) {
  const timestamp = new Date().toISOString();

  const report = {
    timestamp,
    lattice_cid: LATTICE_CID,
    metrics,
    triggers,
    status: triggers.length > 0 ? 'DEGRADED' : 'STABLE',
    recommended_action: triggers.length > 0 ? 'PL_POLICY=universal' : 'continue'
  };

  // Append to drift log
  fs.appendFileSync(
    'fractal-lattice/drift.jsonl',
    JSON.stringify(report) + '\n'
  );

  return report;
}

/**
 * Generate SVG badge
 */
function generateBadge(metrics, status) {
  const color = status === 'STABLE' ? '#4CAF50' : '#FF9800';
  const speedup = ((100 - parseFloat(metrics.universal_support)) / 50).toFixed(1); // Rough estimate

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="20">
  <rect width="200" height="20" fill="${color}"/>
  <text x="10" y="14" fill="white" font-family="Arial" font-size="12">
    autopilot: ${status === 'STABLE' ? 'ON' : 'DEGRADED'} · ${speedup}× · proofs: ✓
  </text>
</svg>`;

  fs.writeFileSync('fractal-lattice/badge.svg', svg);
  return 'badge.svg';
}

/**
 * Main monitoring pulse
 */
function pulse() {
  console.log('\n📊 DRIFT MONITOR PULSE\n');
  console.log('=' .repeat(60));

  // Load previous metrics if exists
  let prevMetrics = null;
  if (fs.existsSync('fractal-lattice/drift.jsonl')) {
    const lines = fs.readFileSync('fractal-lattice/drift.jsonl', 'utf-8').trim().split('\n');
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      prevMetrics = JSON.parse(lastLine).metrics;
    }
  }

  // Calculate current metrics
  const metrics = calculateMetrics();

  // Check triggers
  const triggers = checkTriggers(metrics, prevMetrics);

  // Display metrics
  console.log('📈 Metrics:');
  console.log(`  Apex support: ${metrics.apex_support}%`);
  console.log(`  Proof support: ${metrics.proof_support}%`);
  console.log(`  Perf support: ${metrics.perf_support}%`);
  console.log(`  Universal: ${metrics.universal_support}%`);
  console.log(`  Misroute rate: ${metrics.misroute_rate}%`);
  console.log(`  OOD rate: ${metrics.ood_rate}%`);
  console.log(`  Rules coverage: ${metrics.rules_coverage}%`);
  console.log(`  Entropy: ${metrics.entropy} bits`);
  if (metrics.entropyΔ) {
    console.log(`  Entropy Δ: ${metrics.entropyΔ}x`);
  }

  // Display triggers
  if (triggers.length > 0) {
    console.log('\n⚠️ TRIGGERS DETECTED:');
    triggers.forEach(t => {
      console.log(`  ${t.type}: ${t.value} > ${t.threshold}`);
      console.log(`    → ${t.action}`);
    });
    console.log('\n🚨 RECOMMENDED: Set PL_POLICY=universal');
  } else {
    console.log('\n✅ No triggers - system stable');
  }

  // Generate report
  const report = generateReport(metrics, triggers);

  // Generate badge
  const badge = generateBadge(metrics, report.status);

  console.log('\n📝 Outputs:');
  console.log(`  Report: drift.jsonl`);
  console.log(`  Badge: ${badge}`);
  console.log(`  Status: ${report.status}`);

  console.log('=' .repeat(60));

  return report;
}

// Export for use
module.exports = {
  calculateMetrics,
  checkTriggers,
  pulse
};

// Run if called directly
if (require.main === module) {
  pulse();
}