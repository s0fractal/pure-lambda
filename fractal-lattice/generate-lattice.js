#!/usr/bin/env node
/**
 * Generate lattice.json from stable context
 */

const fs = require('fs');

// Load context
const context = fs.readFileSync('fractal-lattice/context.jsonl', 'utf-8')
  .trim().split('\n').map(line => JSON.parse(line));

// Simple concept extraction
function generateConcepts(rows) {
  const concepts = [];
  const seen = new Set();

  // Get all unique attributes
  const allAttrs = new Set();
  rows.forEach(r => r.attributes.forEach(a => allAttrs.add(a)));

  // Generate some key concepts
  const keyPatterns = [
    ['type:pure_function', 'exec:success'],
    ['type:validation', 'exec:success'],
    ['type:graph_algo', 'exec:success'],
    ['type:io_bounded', 'exec:failure'],
    ['oracle:no_fs', 'oracle:no_net', 'oracle:no_env'],
    ['proof:deterministic', 'proof:memoization_safe'],
    ['gene:MEMO', 'cache:high'],
    ['gene:PAR', 'cache:low'],
    ['size:xs_1_10kb', 'speed:fast'],
    ['size:l_100mb_plus', 'speed:slow']
  ];

  let id = 0;
  keyPatterns.forEach(intent => {
    // Find objects with these attributes
    const extent = rows.filter(row =>
      intent.every(attr => row.attributes.includes(attr))
    ).map(r => r.object);

    if (extent.length > 0) {
      concepts.push({
        id: `c${id++}`,
        intent: intent,
        extent: extent,
        level: intent.length
      });
    }
  });

  // Add top (empty intent) and bottom (all common attrs)
  concepts.unshift({
    id: 'top',
    intent: [],
    extent: rows.map(r => r.object),
    level: 0
  });

  // Find common attributes across all
  const commonAttrs = Array.from(allAttrs).filter(attr =>
    rows.every(r => r.attributes.includes(attr))
  );

  if (commonAttrs.length > 0) {
    concepts.push({
      id: 'bottom',
      intent: commonAttrs,
      extent: [],
      level: commonAttrs.length
    });
  }

  return concepts;
}

// Generate edges based on subset relations
function generateEdges(concepts) {
  const edges = [];

  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      const c1 = concepts[i];
      const c2 = concepts[j];

      // Check if c1 intent ⊆ c2 intent
      if (c1.intent.every(a => c2.intent.includes(a))) {
        edges.push({
          from: c1.id,
          to: c2.id,
          type: 'subset'
        });
      } else if (c2.intent.every(a => c1.intent.includes(a))) {
        edges.push({
          from: c2.id,
          to: c1.id,
          type: 'subset'
        });
      }
    }
  }

  return edges;
}

// Main generation
const concepts = generateConcepts(context);
const edges = generateEdges(concepts);

const lattice = {
  version: '1.0.0',
  generated: new Date().toISOString(),
  source: 'context.jsonl',
  stats: {
    objects: context.length,
    concepts: concepts.length,
    edges: edges.length
  },
  concepts: concepts,
  edges: edges
};

// Save lattice
fs.writeFileSync('fractal-lattice/lattice.json', JSON.stringify(lattice, null, 2));

console.log(`Generated lattice:`);
console.log(`  Objects: ${context.length}`);
console.log(`  Concepts: ${concepts.length}`);
console.log(`  Edges: ${edges.length}`);
console.log(`  Saved to: fractal-lattice/lattice.json`);