#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * PR Queue Management Tool
 */
function manageQueue(options = {}) {
  console.log('📋 PR Queue Management');
  console.log('=' .repeat(40));

  // Mock PR data (in production would use GitHub API)
  const mockPRs = [
    {
      number: 101,
      title: 'Seed Proposal: select-focus (PL-SEED-01)',
      author: 'contributor1',
      trust: 0.98,
      novelty: 0.45,
      size: 12500,
      labels: ['trust:high', 'novelty:high'],
      created: new Date(Date.now() - 2 * 60 * 60 * 1000),
      firstResponse: null
    },
    {
      number: 102,
      title: 'Seed Proposal: hello-world-v2 (PL-SEED-01)',
      author: 'contributor2',
      trust: 0.92,
      novelty: 0.15,
      size: 8000,
      labels: ['trust:medium', 'novelty:low'],
      created: new Date(Date.now() - 5 * 60 * 60 * 1000),
      firstResponse: null
    },
    {
      number: 103,
      title: 'Seed Proposal: bounded-delay (PL-SEED-01)',
      author: 'first-timer',
      trust: 0.96,
      novelty: 0.38,
      size: 9500,
      labels: ['trust:high', 'first-time-contributor'],
      created: new Date(Date.now() - 1 * 60 * 60 * 1000),
      firstResponse: null
    }
  ];

  // Sort by priority
  const prioritized = mockPRs.sort((a, b) => {
    const scoreA = calculatePriority(a);
    const scoreB = calculatePriority(b);
    return scoreB - scoreA;
  });

  if (options.report) {
    console.log('\n📊 Queue Report\n');
    console.log('Priority | PR# | Title | Trust | Novelty | Age | Labels');
    console.log('---------|-----|-------|-------|---------|-----|-------');

    prioritized.forEach((pr, idx) => {
      const age = getAge(pr.created);
      const slaStatus = age > 6 ? '⚠️' : '✅';
      console.log(
        `${idx + 1}${slaStatus.padStart(8)} | #${pr.number} | ${pr.title.substring(15, 35).padEnd(20)} | ${(pr.trust * 100).toFixed(0)}% | ${(pr.novelty * 100).toFixed(0)}% | ${age}h | ${pr.labels.slice(0, 2).join(', ')}`
      );
    });

    // SLA Summary
    const overSLA = mockPRs.filter(pr => getAge(pr.created) > 6).length;
    const avgAge = mockPRs.reduce((sum, pr) => sum + getAge(pr.created), 0) / mockPRs.length;

    console.log('\n📈 SLA Metrics:');
    console.log(`   Total PRs: ${mockPRs.length}`);
    console.log(`   Over SLA (>6h): ${overSLA}`);
    console.log(`   Avg Age: ${avgAge.toFixed(1)}h`);
    console.log(`   P95 Target: ≤24h`);
  }

  if (options.watch) {
    console.log('\n👀 Watching queue (refresh every 30s)...\n');
    setInterval(() => {
      process.stdout.write('\x1Bc'); // Clear console
      manageQueue({ report: true });
    }, 30000);
  }

  return prioritized;
}

function calculatePriority(pr) {
  let score = 0;

  // Trust score weight
  if (pr.trust >= 0.95) score += 100;
  else if (pr.trust >= 0.90) score += 50;

  // Novelty weight
  if (pr.novelty >= 0.4) score += 75;
  else if (pr.novelty >= 0.3) score += 25;

  // Size weight (smaller is better)
  if (pr.size < 10000) score += 30;
  else if (pr.size < 20000) score += 15;

  // First-timer bonus
  if (pr.labels.includes('first-time-contributor')) score += 50;

  // Age penalty (older = higher priority)
  const age = getAge(pr.created);
  if (age > 12) score += 40;
  else if (age > 6) score += 20;

  return score;
}

function getAge(created) {
  return Math.floor((Date.now() - created) / (1000 * 60 * 60));
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {};

  if (args.includes('--report')) {
    options.report = true;
  }

  if (args.includes('--watch')) {
    options.watch = true;
  }

  if (!args.length) {
    console.log('Usage: node tools/mod/queue.mjs [--report] [--watch]');
    process.exit(0);
  }

  manageQueue(options);
}

export { manageQueue };
