#!/usr/bin/env node

/**
 * Hall of Seeds - Showcase of 12 patterns with canonical seeds
 * Interactive offline gallery with Verify/Bench/Contribute buttons
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

const TARGET_PATTERNS = [
  'select-focus', 'scan-metrics', 'bounded-delay',
  'partition-rr', 'route-audit', 'split-metric-select',
  'delay-scan-smoother', 'select-tee', 'bounded-partition',
  'merge-proof-lite', 'merge-proof', 'branch-stress'
];

async function buildHall(srcDir = 'seeds/garden', outDir = 'docs/hall') {
  console.log('🏛️ Hall of Seeds Builder');
  console.log('=' .repeat(40));

  // Collect seeds by pattern
  const seedsByPattern = {};
  TARGET_PATTERNS.forEach(p => { seedsByPattern[p] = []; });

  const seedPaths = await glob(path.join(projectRoot, srcDir, '*.json'));

  for (const seedPath of seedPaths) {
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const seedName = seed.name || path.basename(seedPath, '.json');

    // Categorize by pattern
    for (const pattern of TARGET_PATTERNS) {
      if (seedName.includes(pattern.replace('-', '')) || seedName.startsWith(pattern)) {
        seedsByPattern[pattern].push({
          name: seedName,
          file: path.basename(seedPath),
          trust: 96 + Math.random() * 3, // Mock trust score
          novelty: 0.3 + Math.random() * 0.2, // Mock novelty
          size: JSON.stringify(seed).length,
          nodes: seed.nodes?.length || 0,
          edges: seed.edges?.length || 0
        });
        break;
      }
    }
  }

  // Select top 2 canonical seeds per pattern
  const hallSeeds = [];
  Object.entries(seedsByPattern).forEach(([pattern, seeds]) => {
    const canonical = seeds
      .sort((a, b) => b.trust - a.trust)
      .slice(0, 2);

    canonical.forEach(seed => {
      seed.pattern = pattern;
      hallSeeds.push(seed);
    });
  });

  console.log(`\n📊 Patterns covered: ${Object.keys(seedsByPattern).filter(p => seedsByPattern[p].length > 0).length}/12`);
  console.log(`🌟 Hall seeds: ${hallSeeds.length}`);

  // Generate HTML gallery
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hall of Seeds - Pure Lambda</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: white;
      text-align: center;
      margin-bottom: 2rem;
      font-size: 2.5rem;
    }
    .filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }
    .filter {
      background: white;
      padding: 0.5rem 1rem;
      border-radius: 2rem;
      cursor: pointer;
      transition: all 0.3s;
    }
    .filter:hover, .filter.active {
      background: #667eea;
      color: white;
    }
    .patterns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }
    .pattern-group {
      background: white;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    .pattern-title {
      font-size: 1.2rem;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 1rem;
    }
    .seed {
      background: #f7f7f7;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .seed-name {
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    .metrics {
      display: flex;
      gap: 1rem;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      color: #666;
    }
    .buttons {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .btn {
      padding: 0.3rem 0.8rem;
      border-radius: 0.3rem;
      border: none;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .btn-verify { background: #48bb78; color: white; }
    .btn-bench { background: #4299e1; color: white; }
    .btn-contribute { background: #ed8936; color: white; }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
    .stats {
      text-align: center;
      color: white;
      margin-top: 3rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏛️ Hall of Seeds</h1>

    <div class="filters">
      <div class="filter active" data-filter="all">All Patterns</div>
      <div class="filter" data-filter="trust">High Trust (≥98%)</div>
      <div class="filter" data-filter="novelty">High Novelty (≥0.4)</div>
    </div>

    <div class="patterns">
      ${TARGET_PATTERNS.map(pattern => {
        const seeds = hallSeeds.filter(s => s.pattern === pattern);
        if (seeds.length === 0) {
          return `
          <div class="pattern-group">
            <div class="pattern-title">${pattern}</div>
            <div class="seed">
              <div style="color: #999; text-align: center; padding: 2rem;">
                No canonical seeds yet
              </div>
            </div>
          </div>`;
        }

        return `
        <div class="pattern-group" data-pattern="${pattern}">
          <div class="pattern-title">${pattern}</div>
          ${seeds.map(seed => `
            <div class="seed" data-trust="${seed.trust}" data-novelty="${seed.novelty}">
              <div class="seed-name">${seed.name}</div>
              <div class="metrics">
                <span>Trust: ${seed.trust.toFixed(1)}%</span>
                <span>Novelty: ${seed.novelty.toFixed(2)}</span>
              </div>
              <div class="metrics">
                <span>Nodes: ${seed.nodes}</span>
                <span>Edges: ${seed.edges}</span>
              </div>
              <div class="buttons">
                <button class="btn btn-verify" onclick="verify('${seed.file}')">Verify</button>
                <button class="btn btn-bench" onclick="bench('${seed.file}')">Bench</button>
                <button class="btn btn-contribute" onclick="contribute('${pattern}')">Contribute</button>
              </div>
            </div>
          `).join('')}
        </div>`;
      }).join('')}
    </div>

    <div class="stats">
      <p>Total Seeds: ${hallSeeds.length} | Patterns: ${Object.keys(seedsByPattern).filter(p => seedsByPattern[p].length > 0).length}/12</p>
      <p>Generated: ${new Date().toISOString()}</p>
    </div>
  </div>

  <script>
    function verify(file) {
      window.open('/docs/verify/index.html?seed=' + file, '_blank');
    }

    function bench(file) {
      alert('Benchmarking ' + file + '\\n\\nRun: make bench SEED=' + file);
    }

    function contribute(pattern) {
      window.open('https://github.com/anthropics/pure-lambda/issues/new?title=Seed+for+' + pattern, '_blank');
    }

    // Filter functionality
    document.querySelectorAll('.filter').forEach(filter => {
      filter.addEventListener('click', () => {
        document.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
        filter.classList.add('active');

        const filterType = filter.dataset.filter;
        document.querySelectorAll('.seed').forEach(seed => {
          if (filterType === 'all') {
            seed.style.display = 'block';
          } else if (filterType === 'trust') {
            seed.style.display = parseFloat(seed.dataset.trust) >= 98 ? 'block' : 'none';
          } else if (filterType === 'novelty') {
            seed.style.display = parseFloat(seed.dataset.novelty) >= 0.4 ? 'block' : 'none';
          }
        });
      });
    });
  </script>
</body>
</html>`;

  // Save Hall of Seeds
  const hallPath = path.join(projectRoot, outDir, 'index.html');
  fs.mkdirSync(path.dirname(hallPath), { recursive: true });
  fs.writeFileSync(hallPath, html);

  // Also save JSON index
  const indexPath = path.join(projectRoot, outDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify({
    patterns: Object.keys(seedsByPattern),
    seeds: hallSeeds,
    generated: new Date().toISOString()
  }, null, 2));

  console.log(`\n✅ Hall of Seeds: ${outDir}/index.html`);
  console.log(`📋 JSON index: ${outDir}/index.json`);

  return hallSeeds;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = {};
  process.argv.slice(2).forEach((arg, i, arr) => {
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      args[key] = arr[i + 1] || true;
    }
  });

  buildHall(args.src, args.out);
}

export { buildHall };