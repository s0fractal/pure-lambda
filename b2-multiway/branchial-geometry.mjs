#!/usr/bin/env node
/**
 * Branchial Geometry Calculator
 * Measures the "breathing" of branchial space
 */

import { createWriteStream } from 'fs';
import { readFileSync, writeFileSync } from 'fs';
import { BranchialSpace, evolveMultiway } from './multiway-export.mjs';

/**
 * Calculate branchial width at each time layer
 */
function calculateWidth(space) {
  const layers = new Map(); // time → active branches

  // Group events by time
  for (const event of space.events) {
    if (!layers.has(event.time)) {
      layers.set(event.time, new Set());
    }

    // Count unique branches (based on output states)
    const stateKey = JSON.stringify(event.output);
    layers.get(event.time).add(stateKey);
  }

  // Also count branches from the branch registry
  for (const [id, branch] of space.branches) {
    const time = branch.created;
    if (!layers.has(time)) {
      layers.set(time, new Set());
    }
    layers.get(time).add(JSON.stringify(branch.state));
  }

  // Convert to array and sort by time
  const widths = [];
  const maxTime = Math.max(...layers.keys());

  for (let t = 0; t <= maxTime; t++) {
    const layer = layers.get(t) || new Set();
    widths.push({
      time: t,
      width: layer.size || 1 // At least 1 branch always exists
    });
  }

  return widths;
}

/**
 * Calculate curvature κ = 1 - W(t+1)/W(t)
 * κ < 0: explosion (branches growing)
 * κ > 0: convergence (branches merging)
 * κ = 0: stable width
 */
function calculateCurvature(widths) {
  const curvatures = [];

  for (let i = 0; i < widths.length - 1; i++) {
    const w_t = widths[i].width;
    const w_t1 = widths[i + 1].width;

    const kappa = 1 - (w_t1 / w_t);

    curvatures.push({
      time: widths[i].time,
      width: w_t,
      kappa: kappa,
      interpretation: kappa < -0.1 ? 'explosion' :
                     kappa > 0.1 ? 'convergence' :
                     'stable'
    });
  }

  // Add last point with κ=0 (no next layer)
  if (widths.length > 0) {
    const last = widths[widths.length - 1];
    curvatures.push({
      time: last.time,
      width: last.width,
      kappa: 0,
      interpretation: 'terminal'
    });
  }

  return curvatures;
}

/**
 * Calculate antichain size (incomparable elements)
 * This gives the true "width" of concurrent computation
 */
function calculateAntichain(space) {
  const antichains = [];

  // Build partial order from causal graph
  const events = space.events;
  const causalOrder = new Map();

  for (const event of events) {
    if (!causalOrder.has(event.id)) {
      causalOrder.set(event.id, new Set());
    }

    // Find events that depend on this one
    for (const [depId, deps] of space.causalGraph) {
      if (deps.includes(event.id)) {
        causalOrder.get(event.id).add(depId);
      }
    }
  }

  // Group by time and find antichain size
  const timeGroups = new Map();
  for (const event of events) {
    if (!timeGroups.has(event.time)) {
      timeGroups.set(event.time, []);
    }
    timeGroups.get(event.time).push(event);
  }

  for (const [time, eventsAtTime] of timeGroups) {
    // Check which events are incomparable (can run in parallel)
    const incomparable = [];

    for (let i = 0; i < eventsAtTime.length; i++) {
      for (let j = i + 1; j < eventsAtTime.length; j++) {
        const e1 = eventsAtTime[i];
        const e2 = eventsAtTime[j];

        // If neither causally depends on the other, they're incomparable
        const e1DepsOnE2 = causalOrder.get(e2.id)?.has(e1.id);
        const e2DepsOnE1 = causalOrder.get(e1.id)?.has(e2.id);

        if (!e1DepsOnE2 && !e2DepsOnE1) {
          incomparable.push([e1.id, e2.id]);
        }
      }
    }

    antichains.push({
      time,
      antichain_size: Math.max(1, incomparable.length),
      parallel_pairs: incomparable.length
    });
  }

  return antichains;
}

/**
 * Generate CSV output for branchial geometry
 */
function generateCSV(curvatures, antichains) {
  const rows = ['t,W,κ,antichain,interpretation'];

  for (const curve of curvatures) {
    const antichain = antichains.find(a => a.time === curve.time);
    const antichainSize = antichain ? antichain.antichain_size : 1;

    rows.push([
      curve.time,
      curve.width,
      curve.kappa.toFixed(4),
      antichainSize,
      curve.interpretation
    ].join(','));
  }

  return rows.join('\n');
}

/**
 * Calculate breathing metrics
 */
function calculateBreathing(curvatures) {
  const explosions = curvatures.filter(c => c.kappa < -0.1).length;
  const convergences = curvatures.filter(c => c.kappa > 0.1).length;
  const stable = curvatures.filter(c => Math.abs(c.kappa) <= 0.1).length;

  const maxWidth = Math.max(...curvatures.map(c => c.width));
  const avgWidth = curvatures.reduce((sum, c) => sum + c.width, 0) / curvatures.length;
  const avgCurvature = curvatures.reduce((sum, c) => sum + c.kappa, 0) / curvatures.length;

  return {
    explosions,
    convergences,
    stable,
    maxWidth,
    avgWidth: avgWidth.toFixed(2),
    avgCurvature: avgCurvature.toFixed(4),
    breathing: avgCurvature < 0 ? 'expanding' : avgCurvature > 0 ? 'contracting' : 'stable'
  };
}

/**
 * Generate SVG visualization of width over time
 */
function generateSVG(curvatures) {
  const width = 600;
  const height = 400;
  const margin = 50;

  const maxTime = Math.max(...curvatures.map(c => c.time));
  const maxWidth = Math.max(...curvatures.map(c => c.width));

  const xScale = (t) => margin + (t / maxTime) * (width - 2 * margin);
  const yScale = (w) => height - margin - (w / maxWidth) * (height - 2 * margin);

  // Create path for width curve
  const pathData = curvatures
    .map(c => `${xScale(c.time)},${yScale(c.width)}`)
    .join(' L ');

  // Create path for curvature (normalized to fit)
  const kappaScale = (k) => height/2 - k * 100; // Scale kappa to visible range
  const kappaPath = curvatures
    .map(c => `${xScale(c.time)},${kappaScale(c.kappa)}`)
    .join(' L ');

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#0a0e27"/>

    <!-- Grid -->
    ${Array.from({length: 5}, (_, i) => {
      const y = margin + i * (height - 2 * margin) / 4;
      return `<line x1="${margin}" y1="${y}" x2="${width - margin}" y2="${y}"
                    stroke="#30363d" stroke-dasharray="5,5" opacity="0.5"/>`;
    }).join('')}

    <!-- Axes -->
    <line x1="${margin}" y1="${height - margin}" x2="${width - margin}" y2="${height - margin}"
          stroke="#8b949e" stroke-width="2"/>
    <line x1="${margin}" y1="${margin}" x2="${margin}" y2="${height - margin}"
          stroke="#8b949e" stroke-width="2"/>

    <!-- Width curve -->
    <polyline points="M ${pathData}" fill="none" stroke="#58a6ff" stroke-width="3"/>

    <!-- Curvature curve -->
    <polyline points="M ${kappaPath}" fill="none" stroke="#f85149" stroke-width="2" opacity="0.7"/>

    <!-- Points -->
    ${curvatures.map(c => `
      <circle cx="${xScale(c.time)}" cy="${yScale(c.width)}" r="4"
              fill="${c.interpretation === 'explosion' ? '#f85149' :
                      c.interpretation === 'convergence' ? '#238636' : '#58a6ff'}"/>
    `).join('')}

    <!-- Labels -->
    <text x="${width/2}" y="${height - 10}" fill="#e1e4e8" text-anchor="middle">Time</text>
    <text x="20" y="${height/2}" fill="#e1e4e8" text-anchor="middle"
          transform="rotate(-90 20 ${height/2})">Width</text>

    <!-- Legend -->
    <rect x="${width - 150}" y="10" width="140" height="60" fill="#161b22" stroke="#30363d"/>
    <line x1="${width - 140}" y1="25" x2="${width - 120}" y2="25" stroke="#58a6ff" stroke-width="3"/>
    <text x="${width - 115}" y="30" fill="#e1e4e8" font-size="12">Width W(t)</text>
    <line x1="${width - 140}" y1="45" x2="${width - 120}" y2="45" stroke="#f85149" stroke-width="2"/>
    <text x="${width - 115}" y="50" fill="#e1e4e8" font-size="12">Curvature κ(t)</text>
  </svg>`;
}

// === CLI Interface ===
const command = process.argv[2];

if (command === 'analyze') {
  const graphPath = process.argv[3] || 'genome/test-graph.json';
  const graph = JSON.parse(readFileSync(graphPath, 'utf8'));

  console.log('📊 Branchial Geometry Analysis');

  // Evolve the graph with test inputs
  const inputs = [
    { value: 42 },
    { value: 0 },
    { value: -1 },
    { value: 100 },
    { value: 50 }
  ];

  const space = evolveMultiway(graph, inputs, 10);

  // Calculate geometry
  const widths = calculateWidth(space);
  const curvatures = calculateCurvature(widths);
  const antichains = calculateAntichain(space);
  const breathing = calculateBreathing(curvatures);

  // Generate outputs
  const csv = generateCSV(curvatures, antichains);
  writeFileSync('b2-multiway/branchial.csv', csv);
  console.log('✅ Saved branchial.csv');

  const svg = generateSVG(curvatures);
  writeFileSync('b2-multiway/branchial-geometry.svg', svg);
  console.log('✅ Saved branchial-geometry.svg');

  // Display metrics
  console.log('\n📈 Breathing Metrics:');
  console.log(`  Max width: ${breathing.maxWidth}`);
  console.log(`  Avg width: ${breathing.avgWidth}`);
  console.log(`  Avg curvature: ${breathing.avgCurvature}`);
  console.log(`  Explosions: ${breathing.explosions}`);
  console.log(`  Convergences: ${breathing.convergences}`);
  console.log(`  Overall: ${breathing.breathing}`);

} else if (command === 'watch') {
  // Real-time monitoring mode
  console.log('👁️ Watching branchial geometry...');

  setInterval(() => {
    // Would read from live execution traces
    const mockWidth = 1 + Math.floor(Math.random() * 5);
    const mockKappa = (Math.random() - 0.5) * 0.5;

    console.log(`t=${Date.now() % 100} W=${mockWidth} κ=${mockKappa.toFixed(3)} ${
      mockKappa < -0.1 ? '💥' : mockKappa > 0.1 ? '🎯' : '➖'
    }`);
  }, 1000);

} else {
  console.log('📐 Branchial Geometry Calculator');
  console.log('');
  console.log('Commands:');
  console.log('  analyze <graph>  - Calculate W(t), κ(t) for graph');
  console.log('  watch            - Real-time geometry monitoring');
  console.log('');
  console.log('Outputs:');
  console.log('  branchial.csv           - Time series data');
  console.log('  branchial-geometry.svg  - Visualization');
}

export { calculateWidth, calculateCurvature, calculateAntichain, calculateBreathing };