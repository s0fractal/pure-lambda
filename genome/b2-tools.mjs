#!/usr/bin/env node
/**
 * B2 Laboratory Toolchain
 * fold, expand, verify, diff, doe
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

// === Core Definitions ===
const GENOME = JSON.parse(readFileSync('genome/atoms.json', 'utf8'));
const ATOMS = new Set(Object.keys(GENOME.atoms));
const COMBINATORS = new Set(Object.keys(GENOME.combinators));

// === b2-fold: Graph → phash ===
function fold(graph) {
  // Canonical serialization
  function canonicalize(node) {
    if (!node) return null;

    if (node.op === 'THEN' || node.op === '▶') {
      return {
        op: 'THEN',
        l: canonicalize(node.left || node.l),
        r: canonicalize(node.right || node.r)
      };
    } else if (node.op === 'SPLIT' || node.op === '∆') {
      return {
        op: 'SPLIT',
        l: canonicalize(node.left || node.l),
        r: canonicalize(node.right || node.r)
      };
    } else if (ATOMS.has(node.op || node.name)) {
      const atomName = node.op || node.name;
      return {
        op: 'ATOM',
        name: atomName,
        phash: GENOME.atoms[atomName]?.phash || `ph_${atomName}`
      };
    }

    return node;
  }

  const canonical = canonicalize(graph);
  const serialized = JSON.stringify(canonical, null, 0);

  const phash = createHash('sha256')
    .update('pl/genome-v1')
    .update(serialized)
    .digest('hex')
    .substring(0, 44);

  return { canonical, phash };
}

// === b2-expand: phash → Graph ===
const PHASH_REGISTRY = new Map(); // In production, this would be persistent

function expand(phash) {
  // Lookup in registry
  const stored = PHASH_REGISTRY.get(phash);
  if (!stored) {
    throw new Error(`Unknown phash: ${phash}`);
  }
  return stored;
}

// === b2-verify: Check B2 laws ===
function verify(graph) {
  const errors = [];
  const warnings = [];

  function checkNode(node, depth = 0, imports = new Set(), inLoop = false) {
    if (!node) return;

    // Check combinators
    if (node.op === 'THEN' || node.op === '▶') {
      checkNode(node.left || node.l, depth + 1, imports, inLoop);
      checkNode(node.right || node.r, depth + 1, imports, inLoop);
    } else if (node.op === 'SPLIT' || node.op === '∆') {
      checkNode(node.left || node.l, depth + 1, imports, inLoop);
      checkNode(node.right || node.r, depth + 1, imports, inLoop);
    }

    // Check atoms
    else if (node.op === 'ATOM' || node.name) {
      const atomName = node.name || node.op;

      if (!ATOMS.has(atomName) && !imports.has(atomName)) {
        imports.add(atomName);
        if (imports.size > 2) {
          errors.push(`Too many external imports: ${imports.size} > 2`);
        }
      }

      if (atomName === 'DELAY') {
        inLoop = false; // Reset loop detection
      }
    }

    // Check for algebraic loops
    if (node.op === 'LOOP' && !hasDelay(node)) {
      errors.push(`Algebraic loop detected at depth ${depth}`);
    }
  }

  function hasDelay(node) {
    if (!node) return false;
    if ((node.op === 'ATOM' || node.name) &&
        (node.name === 'DELAY' || node.op === 'DELAY')) return true;
    if (hasDelay(node.left) || hasDelay(node.l)) return true;
    if (hasDelay(node.right) || hasDelay(node.r)) return true;
    return false;
  }

  checkNode(graph);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// === b2-diff: Compare graphs ===
function diff(graph1, graph2) {
  const { phash: phash1 } = fold(graph1);
  const { phash: phash2 } = fold(graph2);

  if (phash1 === phash2) {
    return {
      identical: true,
      structural_diff: null,
      behavioral_diff: null
    };
  }

  // Structural diff
  const structural_diff = {
    phash1,
    phash2,
    atoms1: countAtoms(graph1),
    atoms2: countAtoms(graph2)
  };

  return {
    identical: false,
    structural_diff
  };
}

function countAtoms(graph) {
  const counts = {};

  function count(node) {
    if (!node) return;

    if (node.op === 'ATOM' || node.name) {
      const name = node.name || node.op;
      counts[name] = (counts[name] || 0) + 1;
    }

    count(node.left || node.l);
    count(node.right || node.r);
  }

  count(graph);
  return counts;
}

// === b2-doe: Design of Experiments ===
function doe() {
  // 30 orthogonal test scenarios
  const scenarios = [];

  // Pure transformations
  for (let i = 0; i < 10; i++) {
    scenarios.push({
      type: 'pure',
      input: i,
      expected_gate: 'G0',
      expected_profile: 'deterministic'
    });
  }

  // Stateful accumulations
  for (let i = 0; i < 10; i++) {
    scenarios.push({
      type: 'stateful',
      input: { state: i, value: i * 2 },
      expected_gate: 'G0',
      expected_profile: 'scan'
    });
  }

  // Time-based with delays
  for (let i = 0; i < 10; i++) {
    scenarios.push({
      type: 'temporal',
      input: { t: i * 100, value: Math.sin(i) },
      expected_gate: 'G0',
      expected_profile: 'delay'
    });
  }

  return scenarios;
}

// === CLI Interface ===
const command = process.argv[2];
const arg1 = process.argv[3];

if (command === 'fold') {
  const graph = JSON.parse(readFileSync(arg1, 'utf8'));
  const { canonical, phash } = fold(graph);

  console.log('📦 B2 Fold');
  console.log(`Input: ${arg1}`);
  console.log(`phash: ${phash}`);

  // Store for expand
  PHASH_REGISTRY.set(phash, canonical);
  writeFileSync(`genome/folded/${phash}.json`, JSON.stringify(canonical, null, 2));

} else if (command === 'verify') {
  const graph = JSON.parse(readFileSync(arg1, 'utf8'));
  const result = verify(graph);

  console.log('🔍 B2 Verify');
  if (result.valid) {
    console.log('✅ Valid B2 graph');
  } else {
    console.log('❌ Invalid B2 graph');
    result.errors.forEach(e => console.log(`  • ${e}`));
  }

} else if (command === 'diff') {
  const graph1 = JSON.parse(readFileSync(arg1, 'utf8'));
  const graph2 = JSON.parse(readFileSync(process.argv[4], 'utf8'));
  const result = diff(graph1, graph2);

  console.log('🔄 B2 Diff');
  if (result.identical) {
    console.log('✅ Graphs are identical');
  } else {
    console.log('❌ Graphs differ');
    console.log(`  phash1: ${result.structural_diff.phash1}`);
    console.log(`  phash2: ${result.structural_diff.phash2}`);
  }

} else if (command === 'doe') {
  const scenarios = doe();

  console.log('🧪 B2 Design of Experiments');
  console.log(`Generated ${scenarios.length} test scenarios:`);
  console.log(`  • 10 pure transformations`);
  console.log(`  • 10 stateful accumulations`);
  console.log(`  • 10 temporal with delays`);

  writeFileSync('genome/doe-scenarios.json', JSON.stringify(scenarios, null, 2));

} else {
  console.log('🧬 B2 Laboratory Tools');
  console.log('');
  console.log('Commands:');
  console.log('  b2-fold <graph.json>     - Fold graph to phash');
  console.log('  b2-expand <phash>        - Expand phash to graph');
  console.log('  b2-verify <graph.json>   - Verify B2 compliance');
  console.log('  b2-diff <g1> <g2>        - Compare two graphs');
  console.log('  b2-doe                   - Generate test scenarios');
}

export { fold, expand, verify, diff, doe };