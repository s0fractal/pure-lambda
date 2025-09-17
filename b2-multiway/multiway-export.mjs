#!/usr/bin/env node
/**
 * B2 → Multiway Export
 * Converts B2 graphs to Wolfram-style multiway evolution systems
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

/**
 * Multiway Event - a single rewrite step
 */
class Event {
  constructor(rule, input, output, time = 0) {
    this.rule = rule;      // Which B2 operator fired
    this.input = input;    // Input state/value
    this.output = output;  // Output state(s)
    this.time = time;      // Causal time layer
    this.id = this.computeId();
  }

  computeId() {
    const hash = createHash('sha256');
    hash.update(`${this.rule}:${JSON.stringify(this.input)}→${JSON.stringify(this.output)}@${this.time}`);
    return hash.digest('hex').substring(0, 8);
  }
}

/**
 * Branchial Space - all possible execution paths
 */
class BranchialSpace {
  constructor() {
    this.events = [];           // All events
    this.branches = new Map();  // branch_id → state
    this.mergePoints = [];      // Where branches converge
    this.causalGraph = new Map(); // event_id → [dependent_events]
    this.nextBranchId = 0;
  }

  addEvent(event) {
    this.events.push(event);

    // Track causal dependencies
    if (!this.causalGraph.has(event.id)) {
      this.causalGraph.set(event.id, []);
    }
  }

  branch(fromEvent, states) {
    // Create multiple branches from a SPLIT event
    const branches = [];
    for (const state of states) {
      const branchId = this.nextBranchId++;
      this.branches.set(branchId, {
        state,
        parent: fromEvent.id,
        created: fromEvent.time
      });
      branches.push(branchId);
    }
    return branches;
  }

  merge(branches, intoEvent) {
    // Record merge point where branches converge
    this.mergePoints.push({
      branches: branches.map(b => this.branches.get(b)),
      event: intoEvent,
      phash: this.computePhash(intoEvent.output)
    });
  }

  computePhash(state) {
    const hash = createHash('sha256');
    hash.update('b2-multiway:');
    hash.update(JSON.stringify(state));
    return 'ph_' + hash.digest('hex').substring(0, 12);
  }

  /**
   * Generate multiway graph in Wolfram format
   */
  toMultiwayGraph() {
    const nodes = [];
    const edges = [];

    // Create nodes for each unique state
    const stateMap = new Map();
    let nodeId = 0;

    for (const event of this.events) {
      const inputKey = JSON.stringify(event.input);
      const outputKey = JSON.stringify(event.output);

      if (!stateMap.has(inputKey)) {
        stateMap.set(inputKey, nodeId++);
        nodes.push({
          id: stateMap.get(inputKey),
          label: inputKey,
          time: event.time
        });
      }

      if (!stateMap.has(outputKey)) {
        stateMap.set(outputKey, nodeId++);
        nodes.push({
          id: stateMap.get(outputKey),
          label: outputKey,
          time: event.time + 1
        });
      }

      // Add edge for this rewrite
      edges.push({
        from: stateMap.get(inputKey),
        to: stateMap.get(outputKey),
        rule: event.rule,
        eventId: event.id
      });
    }

    return { nodes, edges };
  }

  /**
   * Compute branchial graph (branch relationships)
   */
  toBranchialGraph() {
    const layers = new Map(); // time → branches at that time

    // Group branches by time
    for (const [id, branch] of this.branches) {
      const time = branch.created;
      if (!layers.has(time)) {
        layers.set(time, []);
      }
      layers.get(time).push({
        id,
        state: branch.state,
        parent: branch.parent
      });
    }

    // Find common ancestors (for merge detection)
    const findLCA = (b1, b2) => {
      const ancestors1 = new Set();
      let current = this.branches.get(b1);
      while (current) {
        ancestors1.add(current.parent);
        current = this.branches.get(current.parent);
      }

      current = this.branches.get(b2);
      while (current) {
        if (ancestors1.has(current.parent)) {
          return current.parent;
        }
        current = this.branches.get(current.parent);
      }
      return null;
    };

    return {
      layers: Array.from(layers.entries()).sort((a, b) => a[0] - b[0]),
      mergePoints: this.mergePoints,
      width: Math.max(...Array.from(layers.values()).map(l => l.length))
    };
  }
}

/**
 * B2 Operator Rewrite Rules
 */
const B2_RULES = {
  'THEN': (input) => {
    // Sequential composition: pass through
    return [input];
  },

  'SPLIT': (input) => {
    // Fan-out: duplicate into two branches
    return [input, input];
  },

  'MERGE': (inputs) => {
    // Fan-in: left-biased monoid
    if (!Array.isArray(inputs)) inputs = [inputs];
    return inputs.find(x => x !== null && x !== undefined) ?? null;
  },

  'FOCUS': (input) => {
    // Filter + map
    if (input && input.value > 0) {
      return { type: 'Some', value: input.value * 2 };
    }
    return { type: 'None' };
  },

  'SCAN': (input, state = 0) => {
    // Stateful accumulation
    const newState = state + (input.value || 0);
    return { state: newState, output: newState };
  },

  'DELAY': (input) => {
    // Time shift (creates causal edge)
    return { ...input, delayed: true, t: '+1' };
  },

  'PAIR': (input1, input2) => {
    // Tuple construction
    return [input1, input2];
  },

  'id': (input) => {
    // Identity
    return input;
  }
};

/**
 * Simulate multiway evolution of a B2 graph
 */
function evolveMultiway(b2Graph, inputs, maxTime = 10) {
  const space = new BranchialSpace();

  // Initialize with input states
  const initialStates = inputs.map((inp, i) => ({
    id: i,
    value: inp,
    time: 0
  }));

  // Queue of pending evaluations
  const queue = initialStates.map(s => ({
    state: s,
    node: b2Graph,
    time: 0
  }));

  while (queue.length > 0 && queue[0].time < maxTime) {
    const { state, node, time } = queue.shift();

    if (!node) continue;

    if (node.op === 'ATOM') {
      // Apply atom rule
      const rule = B2_RULES[node.name] || B2_RULES.id;
      const outputs = Array.isArray(rule(state.value))
        ? rule(state.value)
        : [rule(state.value)];

      for (const output of outputs) {
        const event = new Event(node.name, state, output, time);
        space.addEvent(event);

        // Continue evaluation
        queue.push({
          state: { ...state, value: output },
          node: null, // Terminal
          time: time + 1
        });
      }
    }
    else if (node.op === 'THEN') {
      // Sequential: left then right
      queue.push({
        state,
        node: node.left,
        time
      });
      // Output of left becomes input of right
      // (simplified - in reality would wait for left completion)
    }
    else if (node.op === 'SPLIT') {
      // Parallel branches
      const event = new Event('SPLIT', state, [state, state], time);
      space.addEvent(event);

      const branches = space.branch(event, [state, state]);

      queue.push({
        state,
        node: node.left,
        time: time + 1
      });
      queue.push({
        state,
        node: node.right,
        time: time + 1
      });
    }
  }

  return space;
}

/**
 * Check confluence (Church-Rosser property)
 */
function checkConfluence(space) {
  const finalStates = new Map(); // phash → states that reach it

  for (const merge of space.mergePoints) {
    const phash = merge.phash;
    if (!finalStates.has(phash)) {
      finalStates.set(phash, []);
    }
    finalStates.get(phash).push(merge.branches);
  }

  // Check if different paths lead to same result
  const confluent = [];
  const divergent = [];

  for (const [phash, paths] of finalStates) {
    if (paths.length > 1) {
      // Multiple paths reached same phash = confluent
      confluent.push({ phash, pathCount: paths.length });
    } else {
      divergent.push({ phash, pathCount: 1 });
    }
  }

  const total = confluent.length + divergent.length;
  return {
    isConfluent: divergent.length === 0,
    confluent,
    divergent,
    confluenceRatio: total > 0 ? confluent.length / total : 1.0
  };
}

/**
 * Export for visualization
 */
function exportForViz(space) {
  const multiway = space.toMultiwayGraph();
  const branchial = space.toBranchialGraph();

  return {
    multiway,
    branchial,
    stats: {
      totalEvents: space.events.length,
      branches: space.branches.size,
      mergePoints: space.mergePoints.length,
      maxWidth: branchial.width,
      causalDepth: Math.max(...space.events.map(e => e.time))
    }
  };
}

// === CLI Interface ===
const command = process.argv[2];

if (command === 'evolve') {
  const graphPath = process.argv[3] || 'genome/test-graph.json';
  const graph = JSON.parse(readFileSync(graphPath, 'utf8'));

  // Test with DOE scenarios
  const inputs = Array.from({length: 10}, (_, i) => ({ id: i, value: i }));

  console.log('🌌 Multiway Evolution');
  const space = evolveMultiway(graph, inputs);

  const viz = exportForViz(space);
  console.log(`Events: ${viz.stats.totalEvents}`);
  console.log(`Max width: ${viz.stats.maxWidth}`);
  console.log(`Causal depth: ${viz.stats.causalDepth}`);

  writeFileSync('b2-multiway/evolution.json', JSON.stringify(viz, null, 2));

} else if (command === 'confluence') {
  // Check Church-Rosser property
  const graph = {
    op: 'SPLIT',
    left: { op: 'ATOM', name: 'FOCUS' },
    right: { op: 'ATOM', name: 'SCAN' }
  };

  const inputs = [{ value: 42 }, { value: 0 }, { value: -1 }];
  const space = evolveMultiway(graph, inputs, 5);
  const confluence = checkConfluence(space);

  console.log('🔄 Confluence Check');
  console.log(`Is confluent: ${confluence.isConfluent}`);
  console.log(`Confluence ratio: ${(confluence.confluenceRatio * 100).toFixed(1)}%`);

} else if (command === 'geodesic') {
  // Compare geodesics with computational irreducibility
  console.log('📏 Geodesic Analysis');
  console.log('Comparing optimal paths vs irreducible computations...');

  // Would load receipts and compare with hex-field geodesics
  console.log('(Analysis would go here)');

} else {
  console.log('🌌 B2 Multiway Export');
  console.log('');
  console.log('Commands:');
  console.log('  evolve <graph>    - Evolve B2 graph in multiway system');
  console.log('  confluence        - Check Church-Rosser property');
  console.log('  geodesic          - Compare with irreducibility bounds');
}

export { BranchialSpace, Event, evolveMultiway, checkConfluence };