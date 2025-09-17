#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * Sweep generator - creates seed variants from parameter grid
 */
function generateSweep(configPath, outputDir, options = {}) {
  console.log('🌱 Seed Sweep Generator');
  console.log('=' .repeat(40));

  // Read sweep config
  const config = readConfig(configPath);

  // Mode selection
  if (options.bandit) {
    console.log('🎰 Bandit mode: Thompson Sampling');
    applyBanditWeights(config);
  } else if (options.deterministic) {
    console.log('📐 Deterministic mode: plan shares');
    // Use original planned shares
  } else {
    console.log('🎲 Default mode: equal weights');
  }

  // Ensure output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let totalGenerated = 0;
  const xidSet = new Set();

  for (const seedConfig of config.seeds) {
    const templatePath = path.join(projectRoot, 'seeds', 'templates', `${seedConfig.name}.json`);

    if (!fs.existsSync(templatePath)) {
      console.warn(`⚠️  Template not found: ${seedConfig.name}`);
      continue;
    }

    const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

    // Generate all combinations
    const variants = generateVariants(template, seedConfig.vars);

    for (const variant of variants) {
      // Calculate novelty
      const novelty = calculateNovelty(variant);

      // Skip low novelty
      if (novelty < 0.3) {
        console.log(`   ⏩ Skipping low novelty (${(novelty * 100).toFixed(0)}%): ${variant.name}`);
        continue;
      }

      // Generate unique XIDv2
      const xidv2 = generateXIDv2(variant);

      // Check for duplicates
      if (xidSet.has(xidv2)) {
        console.log(`   ⏩ Duplicate XIDv2: ${xidv2}`);
        continue;
      }
      xidSet.add(xidv2);

      // Add metadata
      variant.xidv2 = xidv2;
      variant.novelty = novelty;
      variant.generated = new Date().toISOString();
      variant.sweep = true;

      // Ensure size compliance
      const size = JSON.stringify(variant).length;
      if (size > 80000) {
        console.log(`   ⏩ Size exceeded (${(size/1024).toFixed(1)}KB): ${variant.name}`);
        continue;
      }

      // Save variant
      const filename = `${variant.name}-${Date.now()}.json`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(variant, null, 2));

      console.log(`   ✅ Generated: ${filename} (novelty: ${(novelty * 100).toFixed(0)}%)`);
      totalGenerated++;
    }
  }

  console.log(`\n🌱 Generated ${totalGenerated} seed variants`);
  console.log(`   Output: ${outputDir}`);

  return totalGenerated;
}

function readConfig(configPath) {
  // Simple config format (would use YAML in production)
  return {
    seeds: [
      {
        name: 'select-focus',
        vars: {
          threshold: [0.3, 0.5, 0.7],
          bias: ['left', 'right']
        }
      },
      {
        name: 'bounded-delay',
        vars: {
          maxTicks: [4, 8, 16],
          energyMode: ['eco', 'normal']
        }
      },
      {
        name: 'partition-rr',
        vars: {
          quantum: [2, 3, 5],
          cap: [8, 12]
        }
      },
      {
        name: 'split-metric-select',
        vars: {
          metric: ['temp', 'load', 'lat'],
          cut: ['p50', 'p75', 'p90']
        }
      },
      {
        name: 'delay-scan-smoother',
        vars: {
          alpha: [0.2, 0.5, 0.8]
        }
      }
    ]
  };
}

function generateVariants(template, vars) {
  const variants = [];
  const keys = Object.keys(vars);

  // Generate cartesian product
  function cartesian(index = 0, current = {}) {
    if (index === keys.length) {
      const variant = JSON.parse(JSON.stringify(template));

      // Apply parameters
      for (const [key, value] of Object.entries(current)) {
        applyParam(variant, key, value);
      }

      // Update name
      const suffix = Object.values(current).join('-');
      variant.name = `${template.name}-${suffix}`;

      variants.push(variant);
      return;
    }

    const key = keys[index];
    for (const value of vars[key]) {
      current[key] = value;
      cartesian(index + 1, current);
    }
  }

  cartesian();
  return variants;
}

function applyParam(seed, key, value) {
  // Apply parameter to seed nodes
  for (const node of Object.values(seed.nodes || {})) {
    if (node.params) {
      // Simple replacement (in production would be more sophisticated)
      if (node.params[key] !== undefined) {
        node.params[key] = value;
      }
    }
  }
}

function calculateNovelty(seed) {
  // Count unique operators and parameters
  const operators = new Set();
  const params = new Set();

  for (const node of Object.values(seed.nodes || {})) {
    if (node.op) operators.add(node.op);
    if (node.params) {
      for (const [k, v] of Object.entries(node.params)) {
        params.add(`${k}:${v}`);
      }
    }
  }

  // Base novelty on diversity
  const baseNovelty = 0.3;
  const opBonus = operators.size * 0.05;
  const paramBonus = params.size * 0.02;

  return Math.min(1, baseNovelty + opBonus + paramBonus);
}

const EPS = 0.07; // 7% чиста розвідка

function applyBanditWeights(config) {
  console.log('🎰 Thompson Sampling with ε-explore');

  // Load previous metrics or use defaults
  const metrics = loadMetrics();

  // Pick bucket using Thompson Sampling
  const buckets = [
    { name: 'core', share: 0.40, patterns: ['select-focus', 'scan-metrics', 'bounded-delay', 'partition-rr', 'route-audit'] },
    { name: 'advanced', share: 0.35, patterns: ['split-metric-select', 'delay-scan-smoother', 'select-tee', 'bounded-partition'] },
    { name: 'proof', share: 0.15, patterns: ['merge-proof-lite', 'merge-proof'] },
    { name: 'experimental', share: 0.10, patterns: ['branch-stress', 'route-merge-variant'] }
  ];

  // Apply Thompson Sampling weights
  for (const bucket of buckets) {
    const prior = metrics[bucket.name] || { alpha: 5, beta: 2 };
    const sampledProb = betaSample(prior.alpha, prior.beta);

    // ε-explore: 7% pure exploration
    const weight = Math.random() < EPS ?
      bucket.share :
      0.85 * sampledProb + 0.15 * bucket.share;

    console.log(`   ${bucket.name}: weight=${weight.toFixed(3)} (α=${prior.alpha}, β=${prior.beta})`);

    // Update config seeds in this bucket
    for (const seed of config.seeds) {
      if (bucket.patterns.includes(seed.name)) {
        seed.weight = weight;
      }
    }
  }
}

function loadMetrics() {
  // Load previous acceptance metrics
  const metricsPath = path.join(projectRoot, 'reports', 'bandit-metrics.json');

  if (fs.existsSync(metricsPath)) {
    return JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
  }

  // Default priors
  return {
    core: { alpha: 12, beta: 3 },
    advanced: { alpha: 7, beta: 4 },
    proof: { alpha: 3, beta: 3 },
    experimental: { alpha: 1, beta: 4 }
  };
}

function updatePriors(bucketName, accepted) {
  const metricsPath = path.join(projectRoot, 'reports', 'bandit-metrics.json');
  const metrics = loadMetrics();

  if (!metrics[bucketName]) {
    metrics[bucketName] = { alpha: 1, beta: 1 };
  }

  if (accepted) {
    metrics[bucketName].alpha += 1;
  } else {
    metrics[bucketName].beta += 1;
  }

  // Save updated metrics
  const dir = path.dirname(metricsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
}

function categorize(seedName) {
  if (['select', 'focus', 'scan', 'delay', 'merge', 'partition'].some(op => seedName.includes(op))) {
    return 'Core';
  }
  if (['split-metric', 'bounded', 'route'].some(op => seedName.includes(op))) {
    return 'Advanced';
  }
  if (['proof', 'merge-proof'].some(op => seedName.includes(op))) {
    return 'Proof';
  }
  return 'Experimental';
}

function betaSample(alpha, beta) {
  // Simple approximation of Beta distribution sampling
  // In production would use proper statistical library
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  const stdDev = Math.sqrt(variance);

  // Normal approximation with bounds [0, 1]
  const sample = Math.max(0, Math.min(1, mean + (Math.random() - 0.5) * stdDev * 2));
  return sample;
}

function generateXIDv2(seed) {
  const data = JSON.stringify(seed);
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return `${seed.name}-v2-${hash.substring(0, 16)}-${Date.now()}`;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node scripts/generate/sweep.mjs <config> <output-dir> [--bandit]');
    console.log('Example: node scripts/generate/sweep.mjs configs/sweep.yaml out/sweep/ --bandit');
    process.exit(1);
  }

  const options = {
    bandit: args.includes('--bandit'),
    deterministic: args.includes('--deterministic')
  };

  generateSweep(args[0], args[1], options);
}

export { generateSweep };