#!/usr/bin/env node

/**
 * Dedupe Quality Monitor - Precision/Recall tracking
 */

import fs from 'fs';
import path from 'path';

const METRICS_PATH = 'dist/dedupe-metrics.json';
const LOG_PATH = 'observability/dedupe-log.jsonl';

// Load or initialize metrics
function loadMetrics() {
  try {
    return JSON.parse(fs.readFileSync(METRICS_PATH, 'utf8'));
  } catch (e) {
    return {
      flagged: 0,
      confirmed: 0,
      missed: 0,
      falseFlagged: 0,
      lastCheck: null,
      history: []
    };
  }
}

// Calculate precision & recall
function calculateQuality(metrics) {
  const precision = metrics.flagged > 0
    ? metrics.confirmed / metrics.flagged
    : 1.0;

  const recall = (metrics.confirmed + metrics.missed) > 0
    ? metrics.confirmed / (metrics.confirmed + metrics.missed)
    : 1.0;

  return { precision, recall };
}

// Auto-adjust threshold based on quality
function recommendThreshold(precision, recall, current = 0.85) {
  // If precision too low (many false positives), increase threshold
  if (precision < 0.9 && recall > 0.8) {
    return Math.min(0.95, current + 0.02);
  }

  // If recall too low (missing duplicates), decrease threshold
  if (recall < 0.8 && precision > 0.9) {
    return Math.max(0.75, current - 0.02);
  }

  return current;
}

// Log dedupe event
function logEvent(type, data) {
  const event = {
    type,
    timestamp: new Date().toISOString(),
    ...data
  };

  fs.mkdirSync('observability', { recursive: true });
  fs.appendFileSync(LOG_PATH, JSON.stringify(event) + '\n');
}

// Update metrics
function updateMetrics(type, data = {}) {
  const metrics = loadMetrics();

  switch(type) {
    case 'flagged':
      metrics.flagged++;
      logEvent('dedupe_flagged', data);
      break;
    case 'confirmed':
      metrics.confirmed++;
      logEvent('dedupe_confirmed', data);
      break;
    case 'missed':
      metrics.missed++;
      logEvent('dedupe_missed', data);
      break;
    case 'false':
      metrics.falseFlagged++;
      logEvent('dedupe_false_positive', data);
      break;
  }

  // Calculate current quality
  const { precision, recall } = calculateQuality(metrics);

  // Add to history
  metrics.history.push({
    timestamp: new Date().toISOString(),
    precision,
    recall,
    flagged: metrics.flagged,
    confirmed: metrics.confirmed,
    missed: metrics.missed
  });

  // Keep last 7 days of history
  if (metrics.history.length > 168) { // 7 days * 24 hours
    metrics.history = metrics.history.slice(-168);
  }

  metrics.lastCheck = new Date().toISOString();

  // Save updated metrics
  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync(METRICS_PATH, JSON.stringify(metrics, null, 2));

  return { metrics, precision, recall };
}

// Generate quality report
function generateReport() {
  const metrics = loadMetrics();
  const { precision, recall } = calculateQuality(metrics);
  const threshold = parseFloat(process.env.NOVELTY_SIM_THRESH || '0.85');
  const newThreshold = recommendThreshold(precision, recall, threshold);

  console.log('🔍 Dedupe Quality Report');
  console.log('=' .repeat(40));
  console.log();
  console.log('📊 Current Metrics:');
  console.log(`   Flagged: ${metrics.flagged}`);
  console.log(`   Confirmed: ${metrics.confirmed}`);
  console.log(`   Missed: ${metrics.missed}`);
  console.log(`   False Positives: ${metrics.falseFlagged}`);
  console.log();
  console.log('📈 Quality Scores:');
  console.log(`   Precision: ${(precision * 100).toFixed(1)}% ${precision >= 0.9 ? '✅' : '⚠️'} (target ≥90%)`);
  console.log(`   Recall: ${(recall * 100).toFixed(1)}% ${recall >= 0.8 ? '✅' : '⚠️'} (target ≥80%)`);
  console.log();
  console.log('🎛️ Threshold:');
  console.log(`   Current: ${threshold.toFixed(2)}`);

  if (newThreshold !== threshold) {
    console.log(`   Recommended: ${newThreshold.toFixed(2)} ${newThreshold > threshold ? '↑' : '↓'}`);
    console.log(`   Action: export NOVELTY_SIM_THRESH=${newThreshold.toFixed(2)}`);
  } else {
    console.log('   Status: Optimal ✅');
  }

  // Generate badge
  const badge = {
    precision: precision >= 0.9 ? '🟢' : (precision >= 0.8 ? '🟡' : '🔴'),
    recall: recall >= 0.8 ? '🟢' : (recall >= 0.7 ? '🟡' : '🔴')
  };

  fs.writeFileSync('dist/dedupe-badge.json', JSON.stringify({
    precision: (precision * 100).toFixed(1),
    recall: (recall * 100).toFixed(1),
    badge,
    threshold: newThreshold.toFixed(2)
  }, null, 2));

  return { precision, recall, threshold, newThreshold };
}

// CLI
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const command = process.argv[2];

  switch(command) {
    case 'flagged':
      updateMetrics('flagged', { seed: process.argv[3] });
      console.log('✅ Recorded flagged duplicate');
      break;

    case 'confirmed':
      updateMetrics('confirmed', { seed: process.argv[3] });
      console.log('✅ Recorded confirmed duplicate');
      break;

    case 'missed':
      updateMetrics('missed', { seed: process.argv[3] });
      console.log('✅ Recorded missed duplicate');
      break;

    case 'false':
      updateMetrics('false', { seed: process.argv[3] });
      console.log('✅ Recorded false positive');
      break;

    case 'report':
    default:
      generateReport();
  }
}

export { loadMetrics, calculateQuality, recommendThreshold, updateMetrics, generateReport };