#!/usr/bin/env node

/**
 * Pattern Coverage Monitor & Badge Generator
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const TARGET_PATTERNS = [
  'select-focus',
  'scan-metrics',
  'bounded-delay',
  'partition-rr',
  'route-audit',
  'split-metric-select',
  'delay-scan-smoother',
  'select-tee',
  'bounded-partition',
  'merge-proof-lite',
  'merge-proof',
  'branch-stress'
];

async function analyzeCoverage() {
  console.log('📊 Pattern Coverage Analysis');
  console.log('=' .repeat(40));

  // Find all merged seeds
  const seedPaths = await glob([
    'seeds/garden/*.json',
    'vault/fed/**/*.json',
    'out/sweep-final/*.json'
  ]);

  console.log(`\nAnalyzing ${seedPaths.length} seeds...`);

  // Count seeds per pattern
  const patternCounts = {};
  const patternSeeds = {};

  for (const pattern of TARGET_PATTERNS) {
    patternCounts[pattern] = 0;
    patternSeeds[pattern] = [];
  }

  for (const seedPath of seedPaths) {
    try {
      const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      const seedName = seed.name || path.basename(seedPath, '.json');

      // Identify pattern from seed name
      for (const pattern of TARGET_PATTERNS) {
        if (seedName.includes(pattern.replace('-', '')) || seedName.startsWith(pattern)) {
          patternCounts[pattern]++;
          patternSeeds[pattern].push(seedName);
          break;
        }
      }
    } catch (e) {
      console.warn(`⚠️ Could not read seed: ${seedPath}`);
    }
  }

  // Calculate coverage
  const coveredPatterns = Object.keys(patternCounts).filter(p => patternCounts[p] >= 2);
  const coverage = coveredPatterns.length / TARGET_PATTERNS.length;

  console.log('\n📋 Pattern Distribution:');
  for (const pattern of TARGET_PATTERNS) {
    const count = patternCounts[pattern];
    const status = count >= 2 ? '✅' : (count === 1 ? '⚠️' : '❌');
    console.log(`   ${pattern}: ${count} seeds ${status}`);

    if (count > 0 && count < 5) {
      console.log(`      → ${patternSeeds[pattern].slice(0, 3).join(', ')}`);
    }
  }

  // Identify thin patterns needing boost
  const thinPatterns = TARGET_PATTERNS.filter(p => patternCounts[p] < 2);

  console.log('\n📈 Coverage Summary:');
  console.log(`   Patterns covered: ${coveredPatterns.length}/12 (${(coverage * 100).toFixed(1)}%)`);
  console.log(`   Target: ≥2 seeds per pattern`);

  if (thinPatterns.length > 0) {
    console.log('\n⚠️ Patterns needing boost:');
    for (const pattern of thinPatterns) {
      console.log(`   - ${pattern} (current: ${patternCounts[pattern]})`);
    }

    // Generate boost config
    const boostConfig = {
      priority: thinPatterns,
      weight_boost: 1.5,
      target_count: 2
    };

    fs.mkdirSync('dist', { recursive: true });
    fs.writeFileSync('dist/pattern-boost.json', JSON.stringify(boostConfig, null, 2));
    console.log('\n✅ Generated boost config: dist/pattern-boost.json');
  }

  // Generate badge
  const badge = {
    coverage: `${coveredPatterns.length}/12`,
    percentage: (coverage * 100).toFixed(1),
    color: coverage >= 0.75 ? 'green' : (coverage >= 0.5 ? 'yellow' : 'red'),
    status: coverage >= 0.75 ? '🟢' : (coverage >= 0.5 ? '🟡' : '🔴'),
    details: patternCounts
  };

  fs.writeFileSync('dist/coverage-badge.json', JSON.stringify(badge, null, 2));

  // Generate SVG badge
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20">
    <rect width="120" height="20" fill="#555"/>
    <rect x="60" width="60" height="20" fill="${badge.color}"/>
    <text x="30" y="14" fill="#fff" text-anchor="middle">coverage</text>
    <text x="90" y="14" fill="#fff" text-anchor="middle">${badge.coverage}</text>
  </svg>`;

  fs.writeFileSync('dist/badges/coverage.svg', svg);
  console.log('✅ Generated coverage badge: dist/badges/coverage.svg');

  return { coverage, patternCounts, thinPatterns };
}

// Integrate with sweep generator
function generateBoostConfig() {
  try {
    const boostData = JSON.parse(fs.readFileSync('dist/pattern-boost.json', 'utf8'));

    if (boostData.priority.length > 0) {
      console.log('\n🚀 Applying pattern boost for thin coverage:');
      console.log(`   Boosting: ${boostData.priority.join(', ')}`);
      console.log(`   Weight multiplier: ${boostData.weight_boost}x`);

      // This would be integrated with sweep.mjs
      process.env.PATTERN_BOOST = JSON.stringify(boostData.priority);
      process.env.PATTERN_BOOST_WEIGHT = boostData.weight_boost.toString();
    }
  } catch (e) {
    // No boost needed
  }
}

// CLI
if (process.argv[1] === new URL(import.meta.url).pathname) {
  analyzeCoverage().then(({ coverage, thinPatterns }) => {
    if (thinPatterns.length > 0) {
      console.log('\n💡 Recommendation:');
      console.log('   Run sweep with pattern boost:');
      console.log('   PATTERN_BOOST=1 node scripts/generate/sweep.mjs');
    }

    // Exit code based on coverage
    process.exit(coverage >= 0.5 ? 0 : 1);
  });
}

export { analyzeCoverage, generateBoostConfig };