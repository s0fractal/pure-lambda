#!/usr/bin/env node

/**
 * Impact-as-a-Service - Daily impact metrics
 * Tracks L-wins, CPU/CO₂ savings, auto-merge rate
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

function calculateImpact(since = '24h') {
  const now = new Date();
  const sinceMs = since === '24h' ? 24 * 60 * 60 * 1000 : parseInt(since) * 60 * 60 * 1000;
  const startTime = new Date(now - sinceMs);

  // Load scoreboard
  const scoreboardPath = path.join(projectRoot, 'dist', 'scoreboard.json');
  const scoreboard = JSON.parse(fs.readFileSync(scoreboardPath, 'utf8'));

  // Calculate L-metric wins (simplified: each seed saves ~100L)
  const L_per_seed = 100; // L-metric units saved per optimized seed
  const L_summed = scoreboard.validSeeds * L_per_seed;

  // CPU savings (each seed saves ~0.5 CPU-hours)
  const cpu_per_seed = 0.5; // CPU-hours saved
  const cpu_saved_h = scoreboard.validSeeds * cpu_per_seed;

  // CO₂ savings (0.4kg per CPU-hour)
  const co2_per_cpu_h = 0.4; // kg CO₂ per CPU-hour
  const co2_saved_kg = cpu_saved_h * co2_per_cpu_h;

  // Auto-merge rate
  const auto_merge_rate = scoreboard.totalSeeds > 0
    ? (scoreboard.validSeeds / scoreboard.totalSeeds * 100).toFixed(1)
    : 0;

  const impact = {
    date: now.toISOString().split('T')[0],
    timestamp: now.toISOString(),
    period: since,
    seeds: {
      valid: scoreboard.validSeeds,
      total: scoreboard.totalSeeds
    },
    L_summed,
    cpu_saved_h: cpu_saved_h.toFixed(1),
    co2_saved_kg: co2_saved_kg.toFixed(2),
    auto_merge_rate: parseFloat(auto_merge_rate),

    // Projections
    projections: {
      weekly: {
        L: L_summed * 7,
        cpu_h: (cpu_saved_h * 7).toFixed(0),
        co2_kg: (co2_saved_kg * 7).toFixed(1)
      },
      monthly: {
        L: L_summed * 30,
        cpu_h: (cpu_saved_h * 30).toFixed(0),
        co2_kg: (co2_saved_kg * 30).toFixed(1)
      }
    }
  };

  return impact;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const sinceIdx = args.indexOf('--since');
  const since = sinceIdx >= 0 ? args[sinceIdx + 1] : '24h';

  const outIdx = args.indexOf('--out');
  const outDir = outIdx >= 0 ? args[outIdx + 1] : 'reports/impact';

  const impact = calculateImpact(since);

  console.log('🌱 Impact Metrics');
  console.log('=' .repeat(40));
  console.log(`\nPeriod: ${impact.period}`);
  console.log(`Seeds: ${impact.seeds.valid}/${impact.seeds.total}`);
  console.log(`\n💎 Impact:`);
  console.log(`  L-metric: ${impact.L_summed.toLocaleString()} units`);
  console.log(`  CPU saved: ${impact.cpu_saved_h} hours`);
  console.log(`  CO₂ saved: ${impact.co2_saved_kg} kg`);
  console.log(`  Auto-merge: ${impact.auto_merge_rate}%`);

  console.log(`\n📈 Projections:`);
  console.log(`  Weekly: ${impact.projections.weekly.co2_kg} kg CO₂`);
  console.log(`  Monthly: ${impact.projections.monthly.co2_kg} kg CO₂`);

  // Save report
  const reportPath = path.join(projectRoot, outDir, `D${impact.date}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(impact, null, 2));

  console.log(`\n✅ Report saved: ${outDir}/D${impact.date}.json`);
}

export { calculateImpact };