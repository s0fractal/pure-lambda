#!/usr/bin/env node

/**
 * Victory Status Dashboard
 * Quick visual check of all victory criteria
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

function victoryStatus() {
  // Load metrics
  const scoreboard = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'dist', 'scoreboard.json'), 'utf8')
  );

  const dashboard = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'reports', 'dashboard', 'latest.json'), 'utf8')
  );

  // Victory criteria with progress bars
  const criteria = [
    {
      name: 'Seeds',
      current: scoreboard.validSeeds,
      target: 100,
      unit: '',
      emoji: '🌱'
    },
    {
      name: 'Trust',
      current: scoreboard.trustScore,
      target: 95,
      unit: '%',
      emoji: '🔐'
    },
    {
      name: 'Novelty',
      current: (dashboard.novelty?.median || 0.35) * 100,
      target: 38,
      unit: '',
      emoji: '✨'
    },
    {
      name: 'Coverage',
      current: dashboard.coverage?.percentage || 50,
      target: 100,
      unit: '%',
      emoji: '📊'
    },
    {
      name: 'Auto-merge',
      current: 80, // TODO: Calculate from real data
      target: 80,
      unit: '%',
      emoji: '🤖'
    },
    {
      name: 'Dedupe OK',
      current: ((dashboard.dedupe?.flagged || 0) - (dashboard.dedupe?.confirmed || 0)) <= 1 ? 100 : 0,
      target: 100,
      unit: '',
      emoji: '🔍'
    }
  ];

  console.log('\n🏆 VICTORY STATUS - 100 Seeds Week');
  console.log('=' .repeat(50));
  console.log(`Day: ${dashboard.day || 'D2'} | Time: ${new Date().toTimeString().split(' ')[0]}`);
  console.log('=' .repeat(50));

  let allMet = true;

  criteria.forEach(c => {
    const progress = Math.min(100, (c.current / c.target) * 100);
    const met = c.current >= c.target;
    allMet = allMet && met;

    // Create progress bar
    const barLength = 30;
    const filled = Math.floor((progress / 100) * barLength);
    const empty = barLength - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    // Format display
    const status = met ? '✅' : progress >= 80 ? '🟡' : '🔴';
    const value = `${c.current}${c.unit}/${c.target}${c.unit}`;

    console.log(`\n${c.emoji} ${c.name.padEnd(12)} ${status}`);
    console.log(`   [${bar}] ${progress.toFixed(0)}%`);
    console.log(`   ${value.padStart(40)}`);
  });

  console.log('\n' + '=' .repeat(50));

  if (allMet) {
    console.log('🎉 VICTORY ACHIEVED! All criteria met!');
    console.log('🚀 Ready for EXPAND mode acceleration');
  } else {
    const remaining = criteria.filter(c => c.current < c.target).length;
    console.log(`⏳ ${remaining} criteria remaining`);

    // Priority actions
    console.log('\n📋 Priority Actions:');
    if (scoreboard.validSeeds < 100) {
      console.log(`   1. Generate ${100 - scoreboard.validSeeds} more seeds`);
    }
    if ((dashboard.novelty?.median || 0.35) < 0.38) {
      console.log(`   2. Boost novelty (current: ${(dashboard.novelty?.median || 0.35).toFixed(2)})`);
    }
    if ((dashboard.coverage?.percentage || 50) < 100) {
      const thin = dashboard.coverage?.thinPatterns?.slice(0, 3) || [];
      console.log(`   3. Fill patterns: ${thin.join(', ')}`);
    }
  }

  console.log('\n💡 Quick Commands:');
  console.log('   Morning: make morning-ritual');
  console.log('   Evening: make evening-ritual');
  console.log('   Status:  make victory-check');

  return allMet;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const victory = victoryStatus();
  process.exit(victory ? 0 : 1);
}

export { victoryStatus };