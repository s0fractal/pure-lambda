#!/usr/bin/env node
/**
 * Generate diverse receipts batch from DOE matrix
 */

const fs = require('fs');
const crypto = require('crypto');

// Read plan
const plan = fs.readFileSync('receipts/plan.csv', 'utf-8')
  .trim().split('\n')
  .slice(1) // Skip header
  .map(line => {
    const [id, lang, type, size, policy, determinism, environment, command] = line.split(',');
    return { id, lang, type, size, policy, determinism, environment, command };
  });

// Normalized attribute dictionary
const ATTR_MAP = {
  // Language
  'ts': 'lang:typescript',
  'py': 'lang:python',
  'rust': 'lang:rust',

  // Type
  'pure': 'type:pure_function',
  'validate': 'type:validation',
  'graph': 'type:graph_algo',
  'io_lite': 'type:io_bounded',

  // Size
  'xs': 'size:xs_1_10kb',
  'm': 'size:m_1_10mb',
  'l': 'size:l_100mb_plus',

  // Policy (genes)
  'memo': 'gene:MEMO',
  'par': 'gene:PAR',
  'surgeon': 'gene:SURGEON',
  'memo_par': 'gene:MEMO,gene:PAR',
  'none': 'gene:NONE',

  // Determinism
  'seed_auto': 'inv:deterministic',
  'fake_timers': 'cap:time_mock',
  'rand': 'cap:random',
  'env_touch': 'cap:env_mutation',

  // Environment
  'node18': 'env:node_18',
  'node20': 'env:node_20'
};

// Simulate execution results based on patterns
function simulateExecution(spec) {
  const hasRandom = spec.determinism === 'rand';
  const hasEnv = spec.determinism === 'env_touch';
  const hasFakeTimers = spec.determinism === 'fake_timers';
  const isPure = spec.type === 'pure';
  const hasIO = spec.type === 'io_lite';

  // Oracle flags
  const oracle = {
    env: hasEnv,
    fs: hasIO,
    rand: hasRandom,
    time: hasFakeTimers,
    net: false
  };

  // Execution outcome
  const success = isPure || (!hasRandom && !hasEnv);
  const speed = spec.size === 'xs' ? 'fast' :
                 spec.size === 'm' ? 'medium' :
                 'slow';

  // Time simulation (ms)
  const baseTime = spec.size === 'xs' ? 5 :
                   spec.size === 'm' ? 50 :
                   500;

  const memoBoost = spec.policy.includes('memo') ? 0.3 : 1;
  const parBoost = spec.policy.includes('par') ? 0.5 : 1;
  const time = Math.floor(baseTime * memoBoost * parBoost);

  // Cache simulation
  const cacheRate = spec.policy.includes('memo') ?
    (isPure ? 0.95 : 0.4) : 0;

  return {
    success,
    time,
    speed,
    oracle,
    cacheRate
  };
}

// Generate receipts
const receipts = [];
const context = [];

for (const spec of plan) {
  const result = simulateExecution(spec);

  // Build attributes
  const attributes = new Set();

  // Add normalized attributes
  attributes.add(ATTR_MAP[spec.lang]);
  attributes.add(ATTR_MAP[spec.type]);
  attributes.add(ATTR_MAP[spec.size]);
  attributes.add(ATTR_MAP[spec.determinism]);
  attributes.add(ATTR_MAP[spec.environment]);

  // Add policy genes
  if (spec.policy !== 'none') {
    const policies = ATTR_MAP[spec.policy].split(',');
    policies.forEach(p => attributes.add(p));
  }

  // Add execution results
  attributes.add(result.success ? 'exec:success' : 'exec:failure');
  attributes.add(`speed:${result.speed}`);

  // Add oracle results
  if (!result.oracle.fs) attributes.add('oracle:no_fs');
  if (!result.oracle.net) attributes.add('oracle:no_net');
  if (!result.oracle.env) attributes.add('oracle:no_env');
  if (!result.oracle.time) attributes.add('oracle:no_time');
  if (!result.oracle.rand) attributes.add('oracle:no_rand');

  // Add proof attributes for successful pure functions
  if (result.success && spec.type === 'pure') {
    attributes.add('proof:deterministic');
    attributes.add('proof:memoization_safe');
  }

  // Add cache attributes
  if (result.cacheRate > 0.8) attributes.add('cache:high');
  else if (result.cacheRate > 0.3) attributes.add('cache:medium');
  else attributes.add('cache:low');

  // Generate receipt
  const receipt = {
    id: spec.id,
    type: 'synthetic',
    command: spec.command,
    timestamp: new Date().toISOString(),
    execution: {
      success: result.success,
      time_ms: result.time,
      exitCode: result.success ? 0 : 1
    },
    oracle: result.oracle,
    stats: {
      cache_rate: result.cacheRate
    },
    attributes: Array.from(attributes).sort(),
    cid: crypto.createHash('sha256')
      .update(JSON.stringify({ spec, result }))
      .digest('hex').slice(0, 16)
  };

  receipts.push(receipt);

  // Add to context
  context.push({
    object: receipt.id,
    attributes: Array.from(attributes).sort()
  });
}

// Save receipts
fs.mkdirSync('receipts/batch', { recursive: true });
receipts.forEach(r => {
  fs.writeFileSync(
    `receipts/batch/${r.id}.json`,
    JSON.stringify(r, null, 2)
  );
});

// Append to context
const existingContext = fs.existsSync('fractal-lattice/context.jsonl') ?
  fs.readFileSync('fractal-lattice/context.jsonl', 'utf-8').trim().split('\n') : [];

const newContext = [...existingContext, ...context.map(c => JSON.stringify(c))];
fs.writeFileSync('fractal-lattice/context-expanded.jsonl', newContext.join('\n'));

// Summary
console.log(`Generated ${receipts.length} diverse receipts`);
console.log(`Total context size: ${newContext.length} objects`);

// Attribute distribution
const attrCounts = {};
for (const c of context) {
  for (const attr of c.attributes) {
    const category = attr.split(':')[0];
    attrCounts[category] = (attrCounts[category] || 0) + 1;
  }
}

console.log('\nAttribute distribution:');
Object.entries(attrCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

console.log('\nNext step: Run stability analysis on expanded context');
console.log('  cp fractal-lattice/context-expanded.jsonl fractal-lattice/context.jsonl');
console.log('  node fractal-lattice/bootstrap.js');