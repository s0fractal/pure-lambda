#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..');

/**
 * SLO Breathing Monitor for multipath control
 */
function monitorSLO() {
  console.log('🫁 SLO Breathing Monitor');
  console.log('=' .repeat(40));

  // Target ranges
  const targets = {
    W: { min: 8, max: 24, current: 12 },        // Window size
    kappa: { min: -0.15, max: 0.20, current: 0.05 }, // Curvature
    regret: { max: 0.03, current: 0.02 }        // Average regret
  };

  // Simulate current metrics (in production would read from actual system)
  const metrics = {
    W: 12 + Math.random() * 4 - 2,
    kappa: 0.05 + Math.random() * 0.1 - 0.05,
    regret: 0.02 + Math.random() * 0.02 - 0.01,
    violations: Math.floor(Math.random() * 2) // 0-1 violations
  };

  // Check violations
  const violations = [];

  if (metrics.W < targets.W.min || metrics.W > targets.W.max) {
    violations.push(`W out of range: ${metrics.W.toFixed(1)} ∉ [${targets.W.min}, ${targets.W.max}]`);
  }

  if (metrics.kappa < targets.kappa.min || metrics.kappa > targets.kappa.max) {
    violations.push(`κ out of range: ${metrics.kappa.toFixed(3)} ∉ [${targets.kappa.min}, ${targets.kappa.max}]`);
  }

  if (metrics.regret > targets.regret.max) {
    violations.push(`Regret exceeded: ${(metrics.regret * 100).toFixed(1)}% > ${(targets.regret.max * 100).toFixed(1)}%`);
  }

  // Display status
  console.log('\n📊 Current Metrics:');
  console.log(`   W: ${metrics.W.toFixed(1)} ${getStatus(metrics.W, targets.W)} [${targets.W.min}, ${targets.W.max}]`);
  console.log(`   κ: ${metrics.kappa.toFixed(3)} ${getStatus(metrics.kappa, targets.kappa)} [${targets.kappa.min}, ${targets.kappa.max}]`);
  console.log(`   Regret: ${(metrics.regret * 100).toFixed(1)}% ${metrics.regret <= targets.regret.max ? '✅' : '⚠️'} (≤${(targets.regret.max * 100).toFixed(1)}%)`);

  if (violations.length === 0) {
    console.log('\n✅ SLO: All metrics within bounds');
  } else {
    console.log('\n⚠️ SLO Violations:');
    violations.forEach(v => console.log(`   - ${v}`));
  }

  // Check for auto-recovery trigger
  if (metrics.violations >= 3) {
    console.log('\n🚨 AUTO-RECOVERY TRIGGERED');
    console.log('   ≥3 violations in 128-tick window');
    console.log('   Action: PL_POLICY=universal');
    console.log('   Command: make breath-drill CASE=ballooning');

    // Would execute in production:
    // process.env.PL_POLICY = 'universal';
    // execSync('make breath-drill CASE=ballooning');

    return { status: 'recovery', violations };
  }

  return { status: violations.length > 0 ? 'warning' : 'ok', violations };
}

function getStatus(value, target) {
  if (value < target.min || value > target.max) {
    return '⚠️';
  }
  return '✅';
}

/**
 * Continuous monitoring mode
 */
function continuousMonitor() {
  console.log('👁️ Starting continuous SLO monitoring...\n');

  const monitor = () => {
    const result = monitorSLO();

    if (result.status === 'recovery') {
      console.log('\n🔧 Initiating recovery protocol...');
      // Recovery actions here
    }

    // Save to log
    const logEntry = {
      timestamp: new Date().toISOString(),
      status: result.status,
      violations: result.violations
    };

    const logPath = path.join(projectRoot, 'reports', 'slo', `slo-${Date.now()}.json`);
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.writeFileSync(logPath, JSON.stringify(logEntry, null, 2));
  };

  // Initial check
  monitor();

  // Schedule every 30 seconds
  setInterval(monitor, 30000);
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.includes('--continuous')) {
    continuousMonitor();
  } else {
    monitorSLO();
  }
}

export { monitorSLO };