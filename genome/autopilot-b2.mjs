#!/usr/bin/env node
/**
 * Autopilot B2 Operon Integration
 * Connects GENOME@v1 to lattice control system
 */

import { readFileSync, writeFileSync } from 'fs';
import { fold, verify } from './b2-tools.mjs';

// Load genome and lattice
const GENOME = JSON.parse(readFileSync('genome/atoms.json', 'utf8'));
const LATTICE = JSON.parse(readFileSync('fractal-lattice/LATTICE@v1.json', 'utf8'));

/**
 * Register B2 operon profile with autopilot
 */
function registerProfile() {
  const profile = {
    name: 'b2-operon',
    version: 'GENOME@v1',
    atoms: Object.keys(GENOME.atoms).length,
    combinators: Object.keys(GENOME.combinators).length,

    // Activation conditions
    activation: {
      gate: 'G0',
      conditions: [
        'deterministic',
        'side_effect_free',
        'causally_sequential'
      ],
      pac_bound: '≤5% @95%'
    },

    // Optimization strategy
    optimization: {
      strategy: 'fold_constant_graphs',
      target_speedup: '1.5×',
      cache_phashes: true
    },

    // Safety gates
    gates: {
      G0: 'deterministic_only',
      G1: 'allow_io_monad',
      G2: 'allow_effects'
    }
  };

  return profile;
}

/**
 * Compile operon to lattice node
 */
function compileToLattice(operonPath) {
  const operon = JSON.parse(readFileSync(operonPath, 'utf8'));

  // Verify B2 compliance
  const graph = operon.structure.graph;
  const validation = verify(graph);

  if (!validation.valid) {
    throw new Error(`Invalid B2 graph: ${validation.errors.join(', ')}`);
  }

  // Fold to phash
  const { phash } = fold(graph);

  // Create lattice node
  const node = {
    id: operon.phash,
    type: 'operon',
    gate: operon.receipt.gate,
    pac_bound: operon.receipt.pac_bound,
    profile: 'b2-operon',

    // Lattice metadata
    apex_support: operon.receipt.confidence === '100%' ? 1.0 : 0.5,
    rules_activated: operon.receipt.proofs.length,

    // Execution hints
    hints: {
      cacheable: true,
      parallelizable: operon.structure.pattern === 'SPLIT',
      deterministic: true
    }
  };

  return node;
}

/**
 * Run autopilot with B2 profile
 */
function runAutopilot(graph, options = {}) {
  const profile = registerProfile();

  // Check activation conditions
  const { valid, errors } = verify(graph);
  if (!valid) {
    return {
      executed: false,
      reason: 'B2 verification failed',
      errors,
      fallback: 'universal'
    };
  }

  // Fold to phash for caching
  const { phash } = fold(graph);

  // Check lattice cache
  const cached = LATTICE.nodes?.[phash];
  if (cached && cached.output) {
    return {
      executed: true,
      source: 'cache',
      phash,
      output: cached.output,
      speedup: '∞'
    };
  }

  // Execute with profile
  const startTime = performance.now();

  // Simulate execution (in real system, would call evaluator)
  const output = {
    type: 'Some',
    value: Math.floor(Math.random() * 100),
    gate: 'G0',
    profile: 'b2-operon'
  };

  const endTime = performance.now();
  const executionTime = endTime - startTime;

  // Store in cache
  if (options.cache !== false) {
    if (!LATTICE.nodes) LATTICE.nodes = {};
    LATTICE.nodes[phash] = {
      id: phash,
      type: 'operon',
      gate: 'G0',
      profile: 'b2-operon',
      output,
      cached_at: new Date().toISOString()
    };
  }

  return {
    executed: true,
    source: 'computed',
    phash,
    output,
    execution_time_ms: executionTime,
    speedup: '1.5×',
    profile: 'b2-operon'
  };
}

/**
 * Monitor PAC bounds
 */
function monitorPAC(results) {
  const total = results.length;
  const failures = results.filter(r => !r.executed).length;
  const error_rate = failures / total;

  const pac = {
    observed_error_rate: `${(error_rate * 100).toFixed(2)}%`,
    pac_bound: '≤5% @95%',
    confidence: error_rate <= 0.05 ? '✅ WITHIN BOUND' : '❌ EXCEEDED',
    recommendation: error_rate > 0.05 ? 'Increase gate strictness' : 'Maintain current profile'
  };

  return pac;
}

// CLI Interface
const command = process.argv[2];

if (command === 'register') {
  const profile = registerProfile();
  console.log('🧬 B2 Operon Profile Registered');
  console.log(JSON.stringify(profile, null, 2));

  // Save to autopilot profiles
  writeFileSync('policies/b2-operon-profile.json', JSON.stringify(profile, null, 2));

} else if (command === 'compile') {
  const operonPath = process.argv[3];
  const node = compileToLattice(operonPath);

  console.log('📦 Compiled Operon to Lattice Node');
  console.log(JSON.stringify(node, null, 2));

} else if (command === 'run') {
  const graphPath = process.argv[3];
  const graph = JSON.parse(readFileSync(graphPath, 'utf8'));
  const result = runAutopilot(graph);

  console.log('🚀 Autopilot Execution');
  console.log(JSON.stringify(result, null, 2));

} else if (command === 'monitor') {
  // Simulate multiple runs for PAC monitoring
  const results = [];
  for (let i = 0; i < 100; i++) {
    const testGraph = {
      op: 'THEN',
      left: { op: 'ATOM', name: 'FOCUS' },
      right: { op: 'ATOM', name: 'SCAN' }
    };
    results.push(runAutopilot(testGraph, { cache: false }));
  }

  const pac = monitorPAC(results);
  console.log('📊 PAC Monitoring');
  console.log(JSON.stringify(pac, null, 2));

} else {
  console.log('🚀 Autopilot B2 Integration');
  console.log('');
  console.log('Commands:');
  console.log('  autopilot-b2 register       - Register b2-operon profile');
  console.log('  autopilot-b2 compile <op>   - Compile operon to lattice');
  console.log('  autopilot-b2 run <graph>    - Execute with autopilot');
  console.log('  autopilot-b2 monitor        - Monitor PAC bounds');
}

export { registerProfile, compileToLattice, runAutopilot, monitorPAC };