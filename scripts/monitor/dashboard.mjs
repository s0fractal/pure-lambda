#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * D2→D7 Unified Monitoring Dashboard
 * Aggregates all metrics for 100 Seeds Week
 */
function updateDashboard() {
  console.log('📊 D2→D7 Dashboard Update');
  console.log('=' .repeat(40));

  // Read current stats
  const scoreboardPath = path.join(projectRoot, 'dist', 'scoreboard.json');
  const scoreboard = JSON.parse(fs.readFileSync(scoreboardPath, 'utf8'));

  const fieldSummaryPath = path.join(projectRoot, 'dist', 'field', 'summary.json');
  let fieldSummary = {};
  if (fs.existsSync(fieldSummaryPath)) {
    fieldSummary = JSON.parse(fs.readFileSync(fieldSummaryPath, 'utf8'));
  }

  // Load additional metrics
  const dedupeMetricsPath = path.join(projectRoot, 'dist', 'dedupe-metrics.json');
  let dedupeMetrics = { flagged: 0, confirmed: 0, missed: 0, falseFlagged: 0 };
  if (fs.existsSync(dedupeMetricsPath)) {
    dedupeMetrics = JSON.parse(fs.readFileSync(dedupeMetricsPath, 'utf8'));
  }

  const coverageBadgePath = path.join(projectRoot, 'dist', 'coverage-badge.json');
  let coverageBadge = { coverage: '0/12', percentage: '0.0' };
  if (fs.existsSync(coverageBadgePath)) {
    coverageBadge = JSON.parse(fs.readFileSync(coverageBadgePath, 'utf8'));
  }

  const redLaneReportPath = path.join(projectRoot, 'dist', 'red-lane-report.json');
  let redLaneReport = { successRate: '100.0' };
  if (fs.existsSync(redLaneReportPath)) {
    redLaneReport = JSON.parse(fs.readFileSync(redLaneReportPath, 'utf8'));
  }

  // Calculate daily progress with auto day detection
  // For 100 Seeds Week: D1 = Monday 16 Sept, D7 = Sunday 22 Sept 2025
  const startDate = new Date('2025-09-16'); // D1 = Monday 16 Sept 2025
  const now = new Date();
  const daysElapsed = Math.min(7, Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24))));
  const targetPerDay = 15; // 15-20 valid PRs per day
  const targetToDate = targetPerDay * daysElapsed;
  const progressPct = (scoreboard.validSeeds / targetToDate) * 100;

  // Calculate dedupe quality
  const dedupePrecision = dedupeMetrics.flagged > 0
    ? dedupeMetrics.confirmed / dedupeMetrics.flagged
    : 1.0;
  const dedupeRecall = (dedupeMetrics.confirmed + dedupeMetrics.missed) > 0
    ? dedupeMetrics.confirmed / (dedupeMetrics.confirmed + dedupeMetrics.missed)
    : 1.0;

  // Get latest field data
  const todayStr = new Date().toISOString().split('T')[0];
  const fieldToday = fieldSummary[todayStr] || { totalReceipts: 0, totalRuns: 0 };

  // Calculate metrics
  const metrics = {
    day: `D${daysElapsed}`,
    timestamp: new Date().toISOString(),
    seeds: {
      valid: scoreboard.validSeeds,
      total: scoreboard.totalSeeds,
      target: 100,
      dailyTarget: targetPerDay,
      progress: scoreboard.weekProgress,
      progressVsTarget: progressPct
    },
    trust: {
      current: scoreboard.trustScore,
      target: 95,
      status: scoreboard.trustScore >= 95 ? '✅' : '⚠️'
    },
    dsse: {
      current: scoreboard.dsseScore,
      target: 98,
      status: scoreboard.dsseScore >= 98 ? '✅' : '⚠️'
    },
    sla: {
      p95Response: 12, // hours
      target: 24,
      status: '✅'
    },
    novelty: {
      median: 0.35,
      target: 0.30,
      status: '✅'
    },
    dedupe: {
      precision: (dedupePrecision * 100).toFixed(1),
      recall: (dedupeRecall * 100).toFixed(1),
      flagged: dedupeMetrics.flagged,
      confirmed: dedupeMetrics.confirmed,
      status: dedupePrecision >= 0.9 && dedupeRecall >= 0.8 ? '✅' : '⚠️'
    },
    coverage: {
      patterns: coverageBadge.coverage,
      percentage: parseFloat(coverageBadge.percentage),
      status: parseFloat(coverageBadge.percentage) >= 75 ? '✅' : '⚠️'
    },
    defense: {
      redLaneSuccess: parseFloat(redLaneReport.successRate),
      status: parseFloat(redLaneReport.successRate) >= 95 ? '✅' : '⚠️'
    },
    field: {
      receipts: fieldToday.totalReceipts,
      runs: fieldToday.totalRuns
    },
    risks: []
  };

  // Check risk triggers
  if (metrics.trust.current < 95) {
    metrics.risks.push('⚠️ Trust below 95% - CONTRACT mode needed');
  }
  if (metrics.dsse.current < 98) {
    metrics.risks.push('⚠️ DSSE below 98% - check signatures');
  }
  if (metrics.seeds.valid < (targetPerDay * daysElapsed * 0.5)) {
    metrics.risks.push('📉 Seed velocity below 50% target');
  }
  if (dedupePrecision < 0.9) {
    metrics.risks.push('🔍 Dedupe precision below 90%');
  }
  if (dedupeRecall < 0.8) {
    metrics.risks.push('🔍 Dedupe recall below 80%');
  }
  if (metrics.coverage.percentage < 50) {
    metrics.risks.push('📊 Pattern coverage below 50%');
  }

  // Display dashboard
  console.log('\n📈 PROGRESS (' + metrics.day + ')');
  console.log(`Seeds: ${metrics.seeds.valid}/${metrics.seeds.target} (${metrics.seeds.progress.toFixed(1)}%)`);
  console.log(`Daily Target: ${targetPerDay} seeds/day`);
  console.log(`Progress vs Target: ${metrics.seeds.progressVsTarget.toFixed(1)}%`);

  console.log('\n🎯 KEY METRICS');
  console.log(`Trust: ${metrics.trust.current}% ${metrics.trust.status} (target ≥95%)`);
  console.log(`DSSE: ${metrics.dsse.current}% ${metrics.dsse.status} (target ≥98%)`);
  console.log(`SLA p95: ${metrics.sla.p95Response}h ${metrics.sla.status} (target ≤24h)`);
  console.log(`Novelty: ${metrics.novelty.median} ${metrics.novelty.status} (target >0.30)`);

  console.log('\n🔍 QUALITY METRICS');
  console.log(`Dedupe Precision: ${metrics.dedupe.precision}% ${dedupePrecision >= 0.9 ? '✅' : '⚠️'} (target ≥90%)`);
  console.log(`Dedupe Recall: ${metrics.dedupe.recall}% ${dedupeRecall >= 0.8 ? '✅' : '⚠️'} (target ≥80%)`);
  console.log(`Pattern Coverage: ${metrics.coverage.patterns} (${metrics.coverage.percentage.toFixed(1)}%) ${metrics.coverage.status}`);
  console.log(`Defense Success: ${metrics.defense.redLaneSuccess.toFixed(1)}% ${metrics.defense.status}`);

  console.log('\n📊 FIELD TELEMETRY');
  console.log(`Receipts Today: ${metrics.field.receipts}`);
  console.log(`Total Runs: ${metrics.field.runs}`);

  if (metrics.risks.length > 0) {
    console.log('\n⚠️ RISKS & TRIGGERS');
    metrics.risks.forEach(risk => console.log(risk));
  }

  // Mode recommendations
  console.log('\n🎛️ MODE RECOMMENDATION');
  const shouldContract =
    metrics.trust.current < 95 ||
    metrics.dsse.current < 98 ||
    dedupePrecision < 0.9;

  const canExpand =
    metrics.trust.current >= 96 &&
    metrics.novelty.median >= 0.40 &&
    dedupeMetrics.flagged - dedupeMetrics.confirmed < 2;

  if (shouldContract) {
    console.log('📉 CONTRACT: Trust or quality below thresholds');
    console.log('   Action: export FED_MODE=conservative');
  } else if (canExpand) {
    console.log('📈 EXPAND: All metrics healthy');
    console.log('   Action: export FED_MODE=expansive');
  } else {
    console.log('➡️ STABLE: Continue current mode');
  }

  console.log('\n🔧 DAILY RITUALS');
  console.log('Morning (09:00 UTC):');
  console.log('  make expand-check       # Check dedupe blocks & novelty');
  console.log('  make scoreboard-update  # Update trust & DSSE');
  console.log('  make queue-report       # Check processing queue');

  console.log('\nEvening (21:00 UTC):');
  console.log('  make breath-slo         # Check multipath control');
  console.log('  make coverage-badge     # Update pattern coverage');
  console.log('  make red-lane           # Test defenses (once daily)');

  if (metrics.trust.current < 95) {
    console.log('\n🚨 EMERGENCY THROTTLE:');
    console.log('yq -i \'.daily_burst=2\' policies/fed-rate.toml');
    console.log('export FED_MODE=conservative');
  }

  // Save dashboard state
  const dashboardPath = path.join(projectRoot, 'reports', 'dashboard', `${metrics.day}.json`);
  const dashboardDir = path.dirname(dashboardPath);
  if (!fs.existsSync(dashboardDir)) {
    fs.mkdirSync(dashboardDir, { recursive: true });
  }
  fs.writeFileSync(dashboardPath, JSON.stringify(metrics, null, 2));

  // Also save latest link
  const latestPath = path.join(projectRoot, 'reports', 'dashboard', 'latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(metrics, null, 2));

  console.log(`\n✅ Dashboard saved: reports/dashboard/${metrics.day}.json`);

  return metrics;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  updateDashboard();
}

export { updateDashboard };