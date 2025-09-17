#!/usr/bin/env node
/**
 * Hyper-stabilization: Generate receipts with strong patterns
 */

const fs = require('fs');

// Load current context
const context = fs.readFileSync('fractal-lattice/context.jsonl', 'utf-8')
  .trim().split('\n').map(line => JSON.parse(line));

console.log(`Current context: ${context.length} objects`);

// Extract strong patterns from existing data
function extractStrongPatterns() {
  const patterns = new Map();

  context.forEach(row => {
    // Find pure function patterns
    if (row.attributes.includes('type:pure_function') &&
        row.attributes.includes('exec:success')) {
      const pattern = row.attributes.filter(a =>
        a.startsWith('oracle:no_') ||
        a.includes('proof:') ||
        a.includes('inv:deterministic')
      );
      patterns.set('pure_success', pattern);
    }

    // Find failure patterns
    if (row.attributes.includes('exec:failure')) {
      const pattern = row.attributes.filter(a =>
        a.startsWith('oracle:') && !a.includes('no_') ||
        a.includes('cap:')
      );
      if (pattern.length > 0) patterns.set('failure', pattern);
    }
  });

  return patterns;
}

// Generate receipts with consistent patterns
function generateConsistentReceipts(count = 50) {
  const receipts = [];
  const patterns = extractStrongPatterns();

  // Core dimensions for systematic coverage
  const languages = ['typescript', 'python', 'rust'];
  const types = ['pure_function', 'validation', 'graph_algo', 'io_bounded'];
  const sizes = ['xs_1_10kb', 'm_1_10mb', 'l_100mb_plus'];
  const genes = ['MEMO', 'PAR', 'SURGEON'];

  let id = 200;

  // Generate with strong patterns
  for (let i = 0; i < count; i++) {
    const lang = languages[i % 3];
    const type = types[Math.floor(i / 3) % 4];
    const size = sizes[Math.floor(i / 12) % 3];
    const gene = genes[Math.floor(i / 4) % 3];

    // Determine if pure and successful based on type
    const isPure = type === 'pure_function';
    const isSuccess = isPure || Math.random() > 0.2;

    const attributes = [
      `lang:${lang}`,
      `type:${type}`,
      `size:${size}`,
      `gene:${gene}`,
      'env:node_20',
      'inv:deterministic'
    ];

    // Add consistent oracle patterns
    if (isPure && isSuccess) {
      // Pure functions have no oracles
      attributes.push(
        'oracle:no_fs',
        'oracle:no_net',
        'oracle:no_env',
        'oracle:no_rand',
        'oracle:no_time',
        'proof:deterministic',
        'proof:memoization_safe'
      );
    } else if (type === 'io_bounded') {
      // IO bounded may have fs oracle
      attributes.push('oracle:no_net', 'oracle:no_env', 'oracle:no_rand', 'oracle:no_time');
      if (Math.random() > 0.5) attributes.push('oracle:fs');
      else attributes.push('oracle:no_fs');
    } else {
      // Validation and graph_algo typically no oracles
      attributes.push('oracle:no_fs', 'oracle:no_net', 'oracle:no_env');
      if (Math.random() > 0.7) {
        attributes.push('oracle:no_rand', 'oracle:no_time');
      }
    }

    // Add execution result
    attributes.push(isSuccess ? 'exec:success' : 'exec:failure');

    // Add speed based on size and success
    if (size === 'xs_1_10kb' && isSuccess) {
      attributes.push('speed:fast');
    } else if (size === 'l_100mb_plus') {
      attributes.push(Math.random() > 0.5 ? 'speed:slow' : 'speed:medium');
    } else {
      attributes.push('speed:medium');
    }

    // Add cache based on gene and success
    if (gene === 'MEMO' && isSuccess) {
      attributes.push('cache:high');
    } else if (gene === 'PAR') {
      attributes.push('cache:low');
    } else {
      attributes.push(Math.random() > 0.5 ? 'cache:low' : 'cache:medium');
    }

    receipts.push({
      object: `r${id++}`,
      attributes: attributes.sort()
    });
  }

  return receipts;
}

// Generate and merge
const newReceipts = generateConsistentReceipts(50);
console.log(`Generated ${newReceipts.length} consistent receipts`);

// Strong pattern reinforcement: duplicate successful pure functions
const reinforced = [];
context.forEach(row => {
  if (row.attributes.includes('type:pure_function') &&
      row.attributes.includes('exec:success') &&
      row.attributes.includes('proof:deterministic')) {
    // Clone with new ID
    reinforced.push({
      object: `r${300 + reinforced.length}`,
      attributes: [...row.attributes]
    });
  }
});

console.log(`Reinforced ${reinforced.length} pure function patterns`);

// Merge all
const hyperContext = [...context, ...newReceipts, ...reinforced];

// Write expanded context
fs.writeFileSync(
  'fractal-lattice/context-hyper.jsonl',
  hyperContext.map(r => JSON.stringify(r)).join('\n')
);

console.log(`\nHyper context: ${hyperContext.length} objects`);
console.log('Saved to: fractal-lattice/context-hyper.jsonl');

// Analyze pattern density
const patternCounts = {};
hyperContext.forEach(row => {
  const key = row.attributes
    .filter(a => a.includes('type:') || a.includes('exec:'))
    .join(',');
  patternCounts[key] = (patternCounts[key] || 0) + 1;
});

console.log('\nPattern density:');
Object.entries(patternCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .forEach(([pattern, count]) => {
    console.log(`  ${pattern}: ${count} instances`);
  });

console.log('\nNext: cp fractal-lattice/context-hyper.jsonl fractal-lattice/context.jsonl');
console.log('Then: node fractal-lattice/bootstrap.js');