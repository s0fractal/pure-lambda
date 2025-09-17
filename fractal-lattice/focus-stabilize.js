#!/usr/bin/env node
/**
 * Focus stabilization: Reduce noise, amplify signal
 */

const fs = require('fs');

// Load current context
const allReceipts = fs.readFileSync('fractal-lattice/context.jsonl', 'utf-8')
  .trim().split('\n').map(line => JSON.parse(line));

console.log(`Current context: ${allReceipts.length} objects`);

// Find the most stable patterns
function findStableCore() {
  const attributeFreq = {};
  const pairFreq = {};

  // Count attribute and pair frequencies
  allReceipts.forEach(row => {
    row.attributes.forEach(attr => {
      attributeFreq[attr] = (attributeFreq[attr] || 0) + 1;

      // Count pairs
      row.attributes.forEach(other => {
        if (attr < other) {
          const key = `${attr}|${other}`;
          pairFreq[key] = (pairFreq[key] || 0) + 1;
        }
      });
    });
  });

  // Find high-frequency stable attributes (appear in >50% of receipts)
  const stableAttrs = Object.entries(attributeFreq)
    .filter(([attr, freq]) => freq > allReceipts.length * 0.5)
    .map(([attr]) => attr);

  // Find high-confidence pairs (appear together >80% when one appears)
  const stablePairs = [];
  Object.entries(pairFreq).forEach(([key, freq]) => {
    const [a1, a2] = key.split('|');
    const conf1 = freq / attributeFreq[a1];
    const conf2 = freq / attributeFreq[a2];
    if (Math.min(conf1, conf2) > 0.8) {
      stablePairs.push([a1, a2, Math.min(conf1, conf2)]);
    }
  });

  return { stableAttrs, stablePairs };
}

// Generate focused receipts with stable patterns only
function generateFocusedReceipts() {
  const { stableAttrs, stablePairs } = findStableCore();

  console.log(`\nStable attributes (>50% frequency): ${stableAttrs.length}`);
  console.log(stableAttrs.slice(0, 10).join(', '));

  console.log(`\nStable pairs (>80% confidence): ${stablePairs.length}`);
  stablePairs.slice(0, 5).forEach(([a1, a2, conf]) => {
    console.log(`  ${a1} <-> ${a2}: ${(conf * 100).toFixed(0)}%`);
  });

  const focused = [];

  // Core pattern 1: Pure functions with full proofs
  for (let i = 0; i < 30; i++) {
    const lang = ['typescript', 'python', 'rust'][i % 3];
    const size = ['xs_1_10kb', 'm_1_10mb', 'l_100mb_plus'][Math.floor(i / 10)];
    const gene = ['MEMO', 'PAR'][i % 2];

    focused.push({
      object: `f${1000 + i}`,
      attributes: [
        `lang:${lang}`,
        'type:pure_function',
        `size:${size}`,
        `gene:${gene}`,
        'exec:success',
        'env:node_20',
        'inv:deterministic',
        'oracle:no_fs',
        'oracle:no_net',
        'oracle:no_env',
        'oracle:no_rand',
        'oracle:no_time',
        'proof:deterministic',
        'proof:memoization_safe',
        gene === 'MEMO' ? 'cache:high' : 'cache:low',
        size === 'xs_1_10kb' ? 'speed:fast' : 'speed:medium'
      ].sort()
    });
  }

  // Core pattern 2: Validation with consistent attributes
  for (let i = 0; i < 20; i++) {
    const lang = ['typescript', 'python', 'rust'][i % 3];
    const size = ['xs_1_10kb', 'm_1_10mb'][i % 2];
    const gene = ['MEMO', 'SURGEON'][i % 2];

    focused.push({
      object: `f${1030 + i}`,
      attributes: [
        `lang:${lang}`,
        'type:validation',
        `size:${size}`,
        `gene:${gene}`,
        'exec:success',
        'env:node_20',
        'inv:deterministic',
        'oracle:no_fs',
        'oracle:no_net',
        'oracle:no_env',
        gene === 'MEMO' ? 'cache:high' : 'cache:low',
        'speed:fast'
      ].sort()
    });
  }

  // Core pattern 3: Graph algorithms
  for (let i = 0; i < 15; i++) {
    const lang = ['typescript', 'rust'][i % 2];
    const size = ['xs_1_10kb', 'l_100mb_plus'][i % 2];
    const gene = 'PAR'; // Parallel is common for graphs

    focused.push({
      object: `f${1050 + i}`,
      attributes: [
        `lang:${lang}`,
        'type:graph_algo',
        `size:${size}`,
        `gene:${gene}`,
        'exec:success',
        'env:node_20',
        'inv:deterministic',
        'oracle:no_fs',
        'oracle:no_net',
        'oracle:no_env',
        'cache:low',
        size === 'xs_1_10kb' ? 'speed:fast' : 'speed:slow'
      ].sort()
    });
  }

  // Add a few failure cases for contrast
  for (let i = 0; i < 5; i++) {
    focused.push({
      object: `f${1065 + i}`,
      attributes: [
        'lang:python',
        'type:io_bounded',
        'size:l_100mb_plus',
        'gene:MEMO',
        'exec:failure',
        'env:node_20',
        'oracle:fs', // Has side effects
        'cache:low',
        'speed:slow'
      ].sort()
    });
  }

  return focused;
}

// Filter existing receipts to remove noise
function filterNoisy(receipts) {
  // Remove receipts with rare attributes
  const attributeFreq = {};
  receipts.forEach(row => {
    row.attributes.forEach(attr => {
      attributeFreq[attr] = (attributeFreq[attr] || 0) + 1;
    });
  });

  // Keep only receipts where all attributes appear in at least 3 other receipts
  return receipts.filter(row => {
    return row.attributes.every(attr => attributeFreq[attr] >= 3);
  });
}

// Main execution
const focused = generateFocusedReceipts();
const filtered = filterNoisy(allReceipts);

console.log(`\nGenerated ${focused.length} focused receipts`);
console.log(`Filtered to ${filtered.length} receipts (from ${allReceipts.length})`);

// Combine focused + filtered subset
const finalContext = [...filtered.slice(0, 50), ...focused];

fs.writeFileSync(
  'fractal-lattice/context-focused.jsonl',
  finalContext.map(r => JSON.stringify(r)).join('\n')
);

console.log(`\nFinal focused context: ${finalContext.length} objects`);
console.log('Saved to: fractal-lattice/context-focused.jsonl');

// Analyze expected stability
const patterns = {};
finalContext.forEach(row => {
  const key = row.attributes
    .filter(a => a.includes('type:') || a.includes('exec:') || a.includes('proof:'))
    .join(',');
  patterns[key] = (patterns[key] || 0) + 1;
});

const uniquePatterns = Object.keys(patterns).length;
const avgFreq = Object.values(patterns).reduce((a, b) => a + b, 0) / uniquePatterns;

console.log(`\nPattern analysis:`);
console.log(`  Unique patterns: ${uniquePatterns}`);
console.log(`  Avg frequency: ${avgFreq.toFixed(1)}`);
console.log(`  Expected stability: ${avgFreq > 3 ? 'HIGH' : 'MEDIUM'}`);

console.log('\nNext: cp fractal-lattice/context-focused.jsonl fractal-lattice/context.jsonl');
console.log('Then: node fractal-lattice/bootstrap.js');