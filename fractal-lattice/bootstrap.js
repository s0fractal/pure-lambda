#!/usr/bin/env node
/**
 * Bootstrap stability analysis for lattice
 * Tests robustness via random subsampling
 */

const fs = require('fs');

// Load context
const context = fs.readFileSync('fractal-lattice/context.jsonl', 'utf-8')
  .trim().split('\n').map(line => JSON.parse(line));

// Compute closure for attribute set
function computeClosure(attrs, rows) {
  // Find objects with all attrs
  const extent = rows.filter(row =>
    attrs.every(a => row.attributes.includes(a))
  ).map(r => r.object);

  // Find common attributes of these objects
  if (extent.length === 0) return { intent: [], extent: [] };

  const commonAttrs = rows
    .filter(r => extent.includes(r.object))
    .reduce((common, row) => {
      if (common === null) return new Set(row.attributes);
      return new Set(row.attributes.filter(a => common.has(a)));
    }, null);

  return {
    intent: Array.from(commonAttrs || []).sort(),
    extent: extent
  };
}

// Generate concepts for a context subset
function generateConcepts(rows) {
  const concepts = [];
  const seen = new Set();

  // Get all unique attributes
  const allAttrs = new Set();
  rows.forEach(r => r.attributes.forEach(a => allAttrs.add(a)));

  // Generate key subsets
  const keySets = [
    [],
    ...Array.from(allAttrs).map(a => [a]),
    ...Array.from(allAttrs).slice(0, 3).map((a, i, arr) =>
      i < arr.length - 1 ? [a, arr[i + 1]] : [a]
    )
  ];

  for (const attrs of keySets) {
    const { intent, extent } = computeClosure(attrs, rows);
    const key = intent.join(',');

    if (!seen.has(key) && extent.length > 0) {
      seen.add(key);
      concepts.push({ intent, extent });
    }
  }

  return concepts;
}

// Jaccard similarity for concept sets
function jaccardConcepts(concepts1, concepts2) {
  const set1 = new Set(concepts1.map(c => c.intent.join(',')));
  const set2 = new Set(concepts2.map(c => c.intent.join(',')));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

// Calculate edge preservation
function edgePreservation(concepts1, concepts2) {
  // Build edges for each
  function buildEdges(concepts) {
    const edges = [];
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const intent1 = concepts[i].intent;
        const intent2 = concepts[j].intent;

        // Check subset relation
        const is1Sub2 = intent1.every(a => intent2.includes(a));
        const is2Sub1 = intent2.every(a => intent1.includes(a));

        if (is1Sub2 || is2Sub1) {
          const key = [intent1.join(','), intent2.join(',')].sort().join('->');
          edges.push(key);
        }
      }
    }
    return edges;
  }

  const edges1 = buildEdges(concepts1);
  const edges2 = buildEdges(concepts2);

  const set1 = new Set(edges1);
  const set2 = new Set(edges2);

  const preserved = [...set1].filter(e => set2.has(e)).length;
  return edges1.length > 0 ? preserved / edges1.length : 0;
}

// Run bootstrap analysis
function runBootstrap(iterations = 100, sampleRate = 0.7) {
  console.log(`Running ${iterations} bootstrap iterations with ${(sampleRate * 100).toFixed(0)}% sampling...`);

  const baseConcepts = generateConcepts(context);
  const jaccards = [];
  const edgeRates = [];
  const conceptCounts = [];

  for (let i = 0; i < iterations; i++) {
    // Random subsample
    const sampleSize = Math.floor(context.length * sampleRate);
    const shuffled = [...context].sort(() => Math.random() - 0.5);
    const sample = shuffled.slice(0, sampleSize);

    // Generate concepts for sample
    const sampleConcepts = generateConcepts(sample);

    // Calculate metrics
    const jaccard = jaccardConcepts(baseConcepts, sampleConcepts);
    const edgeRate = edgePreservation(baseConcepts, sampleConcepts);

    jaccards.push(jaccard);
    edgeRates.push(edgeRate);
    conceptCounts.push(sampleConcepts.length);

    if ((i + 1) % 20 === 0) {
      console.log(`  Iteration ${i + 1}: Jaccard=${jaccard.toFixed(3)}, Edge preservation=${edgeRate.toFixed(3)}`);
    }
  }

  // Calculate statistics
  const avgJaccard = jaccards.reduce((a, b) => a + b, 0) / jaccards.length;
  const avgEdgeRate = edgeRates.reduce((a, b) => a + b, 0) / edgeRates.length;
  const avgConcepts = conceptCounts.reduce((a, b) => a + b, 0) / conceptCounts.length;

  // Calculate entropy (Shannon)
  const conceptFreq = {};
  for (let i = 0; i < iterations; i++) {
    const sample = [...context].sort(() => Math.random() - 0.5).slice(0, Math.floor(context.length * sampleRate));
    const concepts = generateConcepts(sample);

    concepts.forEach(c => {
      const key = c.intent.join(',');
      conceptFreq[key] = (conceptFreq[key] || 0) + 1;
    });
  }

  const totalAppearances = Object.values(conceptFreq).reduce((a, b) => a + b, 0);
  const entropy = Object.values(conceptFreq).reduce((H, freq) => {
    const p = freq / totalAppearances;
    return H - (p * Math.log2(p));
  }, 0);

  // Calculate branching factor
  const levels = {};
  baseConcepts.forEach(c => {
    const level = c.intent.length;
    levels[level] = (levels[level] || 0) + 1;
  });
  const avgBranching = Object.keys(levels).length > 1 ?
    Object.values(levels).reduce((a, b) => a + b, 0) / Object.keys(levels).length : 1;

  return {
    avgJaccard,
    avgEdgeRate,
    avgConcepts,
    entropy,
    avgBranching,
    stable: avgJaccard > 0.8 && avgEdgeRate > 0.8
  };
}

// Main execution
const results = runBootstrap();

// Generate stability report
const markdown = `# Lattice Stability Analysis

## Bootstrap Results (100 iterations, 70% sampling)

| Metric | Value | Interpretation |
|--------|-------|----------------|
| **Jaccard Similarity** | ${results.avgJaccard.toFixed(3)} | ${results.avgJaccard > 0.8 ? '✅ Stable' : '⚠️ Unstable'} |
| **Edge Preservation** | ${results.avgEdgeRate.toFixed(3)} | ${results.avgEdgeRate > 0.8 ? '✅ Stable' : '⚠️ Unstable'} |
| **Avg Concepts** | ${results.avgConcepts.toFixed(1)} | Concept count variance |
| **Shannon Entropy** | ${results.entropy.toFixed(2)} bits | Information content |
| **Branching Factor** | ${results.avgBranching.toFixed(1)} | Convergence rate |

## Stability Assessment

${results.stable ? '### ✅ LATTICE IS STABLE' : '### ⚠️ LATTICE NEEDS MORE DATA'}

${results.stable ?
  'The lattice structure is robust to subsampling. Core patterns persist across bootstrap iterations.' :
  'The lattice shows variability under subsampling. More receipts needed for stable patterns.'}

## Fractal Dimension

Using the entropy and branching metrics:
- **Estimated dimension**: D ≈ ${(results.entropy / Math.log2(results.avgConcepts + 1)).toFixed(2)}
- **Interpretation**: ${results.entropy < 2 ? 'Low complexity - quick convergence' : 'Moderate complexity - rich structure'}

## Recommendations

${results.stable ? `
1. Current lattice is reliable for policy decisions
2. Implication rules have high confidence
3. Can safely use for gene activation profiles
` : `
1. Collect more diverse receipts
2. Wait for stability before policy decisions
3. Focus on most frequent concepts only
`}

---

*Generated by bootstrap stability analysis*
`;

fs.writeFileSync('fractal-lattice/stability.md', markdown);

// Save raw results
fs.writeFileSync('fractal-lattice/stability.json', JSON.stringify({
  ...results,
  timestamp: new Date().toISOString(),
  parameters: {
    iterations: 100,
    sampleRate: 0.7
  }
}, null, 2));

console.log('\nStability Analysis Complete:');
console.log(`  Jaccard: ${results.avgJaccard.toFixed(3)}`);
console.log(`  Edge preservation: ${results.avgEdgeRate.toFixed(3)}`);
console.log(`  Entropy: ${results.entropy.toFixed(2)} bits`);
console.log(`  Status: ${results.stable ? '✅ STABLE' : '⚠️ UNSTABLE'}`);
console.log(`  Report: fractal-lattice/stability.md`);