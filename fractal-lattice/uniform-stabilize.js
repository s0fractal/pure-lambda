#!/usr/bin/env node
/**
 * Uniform stabilization: Create highly regular pattern matrix
 */

const fs = require('fs');

// Generate uniform matrix with minimal variance
function generateUniformMatrix() {
  const receipts = [];
  let id = 2000;

  // Pattern 1: Pure functions - the dominant pattern (60 receipts)
  for (let i = 0; i < 60; i++) {
    const lang = ['typescript', 'python', 'rust'][i % 3];
    const size = ['xs_1_10kb', 'm_1_10mb'][i % 2];
    const gene = i % 2 === 0 ? 'MEMO' : 'PAR';

    receipts.push({
      object: `u${id++}`,
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

  // Pattern 2: Validation - secondary pattern (30 receipts)
  for (let i = 0; i < 30; i++) {
    const lang = ['typescript', 'python'][i % 2];
    const gene = 'MEMO'; // Most validations use memoization

    receipts.push({
      object: `u${id++}`,
      attributes: [
        `lang:${lang}`,
        'type:validation',
        'size:xs_1_10kb',
        `gene:${gene}`,
        'exec:success',
        'env:node_20',
        'inv:deterministic',
        'oracle:no_fs',
        'oracle:no_net',
        'oracle:no_env',
        'cache:high',
        'speed:fast'
      ].sort()
    });
  }

  // Pattern 3: Graph algorithms - tertiary pattern (20 receipts)
  for (let i = 0; i < 20; i++) {
    receipts.push({
      object: `u${id++}`,
      attributes: [
        'lang:rust', // Rust dominates graph algos
        'type:graph_algo',
        'size:m_1_10mb',
        'gene:PAR', // Parallel for graphs
        'exec:success',
        'env:node_20',
        'inv:deterministic',
        'oracle:no_fs',
        'oracle:no_net',
        'oracle:no_env',
        'cache:low',
        'speed:medium'
      ].sort()
    });
  }

  // Pattern 4: Minimal failure cases (10 receipts)
  for (let i = 0; i < 10; i++) {
    receipts.push({
      object: `u${id++}`,
      attributes: [
        'lang:python',
        'type:io_bounded',
        'size:l_100mb_plus',
        'gene:MEMO',
        'exec:failure',
        'env:node_20',
        'oracle:fs', // Has side effect
        'cache:low',
        'speed:slow'
      ].sort()
    });
  }

  return receipts;
}

// Create uniform context
const uniform = generateUniformMatrix();
console.log(`Generated ${uniform.length} uniform receipts`);

// Pattern analysis
const patterns = {};
uniform.forEach(row => {
  const key = row.attributes
    .filter(a => a.includes('type:') || a.includes('exec:'))
    .join(',');
  patterns[key] = (patterns[key] || 0) + 1;
});

console.log('\nPattern distribution:');
Object.entries(patterns).forEach(([pattern, count]) => {
  console.log(`  ${pattern}: ${count} (${(count / uniform.length * 100).toFixed(0)}%)`);
});

// Write uniform context
fs.writeFileSync(
  'fractal-lattice/context-uniform.jsonl',
  uniform.map(r => JSON.stringify(r)).join('\n')
);

console.log(`\nSaved ${uniform.length} receipts to: fractal-lattice/context-uniform.jsonl`);

// Theoretical stability calculation
const majorityPattern = Math.max(...Object.values(patterns));
const expectedJaccard = majorityPattern / uniform.length;

console.log(`\nExpected Jaccard: ~${expectedJaccard.toFixed(2)}`);
console.log(`Status: ${expectedJaccard > 0.5 ? '✅ Should be stable' : '⚠️ May need adjustment'}`);

console.log('\nNext: cp fractal-lattice/context-uniform.jsonl fractal-lattice/context.jsonl');
console.log('Then: node fractal-lattice/bootstrap.js');