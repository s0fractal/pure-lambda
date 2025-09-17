#!/usr/bin/env node

/**
 * EWMA (Exponentially Weighted Moving Average) Anomaly Detection
 * Detects statistical anomalies in metrics using z-scores
 */

/**
 * Calculate EWMA for time series
 * @param {number[]} xs - Time series values
 * @param {number} alpha - Smoothing factor (0-1, higher=more reactive)
 * @returns {number[]} EWMA values
 */
export function ewma(xs, alpha = 0.3) {
  if (!xs || xs.length === 0) return [];

  let m = xs[0];
  const out = [m];

  for (let i = 1; i < xs.length; i++) {
    m = alpha * xs[i] + (1 - alpha) * m;
    out.push(m);
  }

  return out;
}

/**
 * Calculate z-score for anomaly detection
 * @param {number} value - Current value
 * @param {number} mean - EWMA mean
 * @param {number} stddev - Standard deviation
 * @returns {number} Z-score (|z| > 3 indicates anomaly)
 */
export function zscore(value, mean, stddev) {
  if (stddev === 0) return 0;
  return (value - mean) / stddev;
}

/**
 * Calculate standard deviation for EWMA residuals
 * @param {number[]} values - Original values
 * @param {number[]} ewmaValues - EWMA values
 * @returns {number} Standard deviation
 */
export function ewmaStdDev(values, ewmaValues) {
  if (values.length !== ewmaValues.length || values.length === 0) return 0;

  const residuals = values.map((v, i) => v - ewmaValues[i]);
  const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const variance = residuals.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / residuals.length;

  return Math.sqrt(variance);
}

/**
 * Detect anomalies in metrics
 * @param {Object} history - Historical metric data
 * @returns {Object} Anomaly detection results
 */
export function detectAnomalies(history) {
  const results = {};

  // Process each metric
  const metrics = ['novelty', 'precision', 'recall'];

  for (const metric of metrics) {
    if (!history[metric] || history[metric].length < 3) {
      results[metric] = { anomaly: false, insufficient_data: true };
      continue;
    }

    const values = history[metric];
    const ewmaValues = ewma(values, 0.3);
    const stdDev = ewmaStdDev(values, ewmaValues);

    const current = values[values.length - 1];
    const ewmaCurrent = ewmaValues[ewmaValues.length - 1];
    const z = zscore(current, ewmaCurrent, stdDev);

    results[metric] = {
      current,
      ewma: ewmaCurrent,
      stdDev,
      zscore: z,
      anomaly: Math.abs(z) > 3,
      trend: current > ewmaCurrent ? 'up' : 'down'
    };
  }

  return results;
}

/**
 * Load metrics history and detect anomalies
 */
export function analyzeMetrics() {
  const fs = require('fs');
  const path = require('path');

  // Load dedupe metrics for precision/recall
  const dedupeMetricsPath = path.join(process.cwd(), 'dist', 'dedupe-metrics.json');
  let dedupeMetrics = { history: [] };
  if (fs.existsSync(dedupeMetricsPath)) {
    dedupeMetrics = JSON.parse(fs.readFileSync(dedupeMetricsPath, 'utf8'));
  }

  // Extract time series
  const history = {
    novelty: [],
    precision: [],
    recall: []
  };

  // Get last 24 data points (hourly)
  const recentHistory = dedupeMetrics.history.slice(-24);

  recentHistory.forEach(h => {
    // Novelty would come from sweep metrics (placeholder)
    history.novelty.push(0.35 + Math.random() * 0.1 - 0.05); // Simulated
    history.precision.push(h.precision || 1.0);
    history.recall.push(h.recall || 1.0);
  });

  // Detect anomalies
  const anomalies = detectAnomalies(history);

  // Add alert if any anomalies detected
  const hasAnomalies = Object.values(anomalies).some(a => a.anomaly);
  if (hasAnomalies) {
    anomalies.alert = 'ANOMALY_DETECTED';
    anomalies.affected = Object.keys(anomalies).filter(k => anomalies[k].anomaly);
  }

  return anomalies;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const { dirname } = await import('path');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Generate test data
  const testHistory = {
    novelty: [0.35, 0.36, 0.34, 0.35, 0.37, 0.36, 0.35, 0.45], // Last value is anomaly
    precision: [0.95, 0.94, 0.96, 0.95, 0.94, 0.95, 0.96, 0.95],
    recall: [0.85, 0.84, 0.86, 0.85, 0.84, 0.85, 0.86, 0.75] // Last value is anomaly
  };

  const anomalies = detectAnomalies(testHistory);

  console.log('📈 EWMA Anomaly Detection');
  console.log('=' .repeat(40));

  for (const [metric, result] of Object.entries(anomalies)) {
    if (typeof result !== 'object' || !result.current) continue;

    console.log(`\n${metric.charAt(0).toUpperCase() + metric.slice(1)}:`);
    console.log(`  Current: ${result.current.toFixed(3)}`);
    console.log(`  EWMA: ${result.ewma.toFixed(3)}`);
    console.log(`  Z-score: ${result.zscore.toFixed(2)}`);
    console.log(`  Status: ${result.anomaly ? '🚨 ANOMALY' : '✅ Normal'}`);
  }

  if (anomalies.alert) {
    console.log('\n🚨 Alert: Anomalies detected in:', anomalies.affected.join(', '));
  }
}

export { analyzeMetrics };