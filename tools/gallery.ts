#!/usr/bin/env ts-node
// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Gallery Generator - Create HTML gallery from seeds/examples/*.json
 * Shows: seed name, tile count, NF preview, Pair-Lexicon matches
 */

import * as fs from 'fs';
import * as path from 'path';
import { program } from 'commander';
import yaml from 'js-yaml';

interface SeedNode {
  cost: string;
  gid: string;
  iid: string;
  law: string;
  links: Record<string, string>;
  op: string;
  ports: Record<string, string>;
  receipt: any;
  xid: string;
}

interface SeedData {
  nodes: Record<string, SeedNode | { oids: string[]; root: string }>;
  root: string;
  name: string;
  abi?: {
    ports: Record<string, string>;
    patterns?: string[];
    description?: string;
  };
  gidSet: string[];
  iidSet: string[];
  expected: {
    minRouteLen: number;
    invariants: string[];
  };
}

interface PairPattern {
  pattern: string;
  nf: string;
  alias: string;
  description: string;
  external: {
    sql?: string;
    rxjs?: string;
  };
}

interface PairLexicon {
  pairs: PairPattern[];
}

interface SeedInfo {
  name: string;
  filePath: string;
  tileCount: number;
  complexity: string;
  patterns: string[];
  description: string;
  routeLength: number;
  operators: string[];
  nfPreview: string;
}

function loadSeed(filePath: string): SeedData {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function loadPairLexicon(lexiconPath: string): PairLexicon {
  const content = fs.readFileSync(lexiconPath, 'utf-8');
  return yaml.load(content) as PairLexicon;
}

function isOperonNode(node: any): node is SeedNode {
  return node.hasOwnProperty('gid') && node.hasOwnProperty('op');
}

function analyzeSeed(seedData: SeedData, lexicon: PairLexicon): SeedInfo {
  const operators: string[] = [];
  let maxComplexity = 'O(1)';

  // Count tiles and extract operators
  for (const [nodeId, node] of Object.entries(seedData.nodes)) {
    if (isOperonNode(node)) {
      operators.push(node.op);

      // Track highest complexity
      const complexities = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(n^3)', 'O(2^n)'];
      const currentIndex = complexities.indexOf(node.cost);
      const maxIndex = complexities.indexOf(maxComplexity);
      if (currentIndex > maxIndex) {
        maxComplexity = node.cost;
      }
    }
  }

  // Extract patterns from ABI or detect them
  const patterns = seedData.abi?.patterns || detectPatterns(operators, lexicon);

  // Generate NF preview
  const nfPreview = generateNFPreview(operators, patterns, lexicon);

  // Extract description
  const description = seedData.abi?.description ||
    `${operators.join(' → ')} pattern with ${operators.length} operator${operators.length > 1 ? 's' : ''}`;

  return {
    name: seedData.name,
    filePath: path.basename(seedData.name + '.json'),
    tileCount: operators.length,
    complexity: maxComplexity,
    patterns,
    description,
    routeLength: seedData.expected.minRouteLen,
    operators,
    nfPreview
  };
}

function detectPatterns(operators: string[], lexicon: PairLexicon): string[] {
  const patterns: string[] = [];

  // Simple 2-gram pattern detection
  for (let i = 0; i < operators.length - 1; i++) {
    const op1 = operators[i];
    const op2 = operators[i + 1];
    if (op1 && op2) {
      const pair = `${op1.toLowerCase()}▶${op2.toLowerCase()}`;
      const match = lexicon.pairs.find(p => p.pattern === pair);
      if (match) {
        patterns.push(match.alias);
      }
    }
  }

  return patterns;
}

function generateNFPreview(operators: string[], patterns: string[], lexicon: PairLexicon): string {
  if (patterns.length > 0) {
    const pattern = lexicon.pairs.find(p => p.alias === patterns[0]);
    if (pattern) {
      return pattern.nf;
    }
  }

  // Fallback to operator sequence
  if (operators.length === 1) {
    return `${operators[0]}(λ, data → result)`;
  } else {
    return operators.join(' ∘ ');
  }
}

function generateExampleCard(seed: SeedInfo): string {
  const patternBadges = seed.patterns.map(p =>
    `<span class="pattern-badge">${p}</span>`
  ).join('');

  const complexityClass = seed.complexity.includes('O(1)') ? 'low' :
                         seed.complexity.includes('O(log n)') ? 'medium' :
                         seed.complexity.includes('O(n)') && !seed.complexity.includes('log') ? 'medium' : 'high';

  return `
    <div class="example-card">
      <div class="card-header">
        <h3>${getEmojiForSeed(seed.name)} ${formatSeedName(seed.name)}</h3>
        ${patternBadges}
      </div>

      <div class="card-body">
        <p class="description">${seed.description}</p>
        <code class="nf-preview">${seed.nfPreview}</code>

        <div class="operators">
          <strong>Operators:</strong> ${seed.operators.join(', ')}
        </div>
      </div>

      <div class="card-footer">
        <div class="metrics">
          <span class="metric tiles">
            <span class="metric-value">${seed.tileCount}</span>
            <span class="metric-label">tiles</span>
          </span>
          <span class="metric complexity ${complexityClass}">
            <span class="metric-value">${seed.complexity}</span>
            <span class="metric-label">complexity</span>
          </span>
          <span class="metric route">
            <span class="metric-value">${seed.routeLength}</span>
            <span class="metric-label">route length</span>
          </span>
        </div>

        <div class="actions">
          <a href="../seeds/examples/${seed.filePath}" class="action-link view-json">View JSON</a>
          <button onclick="generateNF('${seed.name}')" class="action-link generate-nf">Generate NF</button>
        </div>
      </div>
    </div>`;
}

function getEmojiForSeed(name: string): string {
  const emojiMap: Record<string, string> = {
    'hello-world': '🌱',
    'map-filter': '🔍',
    'fork-join': '🍴',
    'pipeline': '🏭',
    'recursive': '🔄',
    'distributed': '🌐'
  };
  return emojiMap[name] || '⚡';
}

function formatSeedName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function generatePatternSummary(allSeeds: SeedInfo[], lexicon: PairLexicon): string {
  const allPatterns = new Set<string>();
  allSeeds.forEach(seed => seed.patterns.forEach(pattern => allPatterns.add(pattern)));

  const patternRows = Array.from(allPatterns).map(patternAlias => {
    const pattern = lexicon.pairs.find(p => p.alias === patternAlias);
    if (!pattern) return '';

    const usedInSeeds = allSeeds
      .filter(seed => seed.patterns.includes(patternAlias))
      .map(seed => seed.name)
      .join(', ');

    return `
      <tr>
        <td><code>${pattern.pattern}</code></td>
        <td><code>${pattern.nf}</code></td>
        <td><strong>${pattern.alias}</strong></td>
        <td>${pattern.description}</td>
        <td><small>${usedInSeeds}</small></td>
      </tr>`;
  }).join('');

  return `
    <div class="pattern-summary">
      <h3>Patterns Used in Examples</h3>
      <table class="pattern-table">
        <thead>
          <tr>
            <th>Pattern</th>
            <th>NF</th>
            <th>Alias</th>
            <th>Description</th>
            <th>Used In</th>
          </tr>
        </thead>
        <tbody>
          ${patternRows}
        </tbody>
      </table>
    </div>`;
}

function generateGalleryHTML(seeds: SeedInfo[], lexicon: PairLexicon): string {
  const exampleCards = seeds.map(generateExampleCard).join('\n');
  const patternSummary = generatePatternSummary(seeds, lexicon);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pure Lambda Examples Gallery</title>
    <style>
        :root {
            --primary: #2563eb;
            --primary-dark: #1d4ed8;
            --secondary: #64748b;
            --success: #059669;
            --warning: #d97706;
            --danger: #dc2626;
            --bg: #f8fafc;
            --surface: #ffffff;
            --border: #e2e8f0;
            --text: #1e293b;
            --text-light: #64748b;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .header p {
            font-size: 1.125rem;
            color: var(--text-light);
            max-width: 600px;
            margin: 0 auto;
        }

        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }

        .example-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .example-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .card-header {
            padding: 1rem 1.5rem 0.5rem;
            border-bottom: 1px solid var(--border);
        }

        .card-header h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }

        .pattern-badge {
            display: inline-block;
            background: var(--primary);
            color: white;
            font-size: 0.75rem;
            font-weight: 500;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            margin-right: 0.5rem;
            margin-bottom: 0.5rem;
        }

        .card-body {
            padding: 1rem 1.5rem;
        }

        .description {
            color: var(--text-light);
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }

        .nf-preview {
            display: block;
            background: #f1f5f9;
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 0.75rem;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 0.875rem;
            color: var(--primary-dark);
            margin-bottom: 1rem;
            overflow-x: auto;
        }

        .operators {
            font-size: 0.875rem;
            color: var(--text-light);
        }

        .card-footer {
            padding: 1rem 1.5rem;
            background: #fafbfc;
            border-top: 1px solid var(--border);
        }

        .metrics {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .metric {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        .metric-value {
            font-weight: 600;
            font-size: 1.125rem;
        }

        .metric-label {
            font-size: 0.75rem;
            color: var(--text-light);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .complexity.low .metric-value { color: var(--success); }
        .complexity.medium .metric-value { color: var(--warning); }
        .complexity.high .metric-value { color: var(--danger); }

        .actions {
            display: flex;
            gap: 0.5rem;
        }

        .action-link {
            flex: 1;
            text-align: center;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            transition: all 0.2s;
        }

        .view-json {
            background: var(--surface);
            color: var(--primary);
            border: 1px solid var(--primary);
        }

        .view-json:hover {
            background: var(--primary);
            color: white;
        }

        .generate-nf {
            background: var(--primary);
            color: white;
            border: 1px solid var(--primary);
            cursor: pointer;
        }

        .generate-nf:hover {
            background: var(--primary-dark);
        }

        .pattern-summary {
            margin-top: 3rem;
            padding: 2rem;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
        }

        .pattern-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }

        .pattern-table th,
        .pattern-table td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }

        .pattern-table th {
            background: var(--bg);
            font-weight: 600;
            font-size: 0.875rem;
        }

        .pattern-table td {
            font-size: 0.875rem;
        }

        .pattern-table code {
            background: #f1f5f9;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
        }

        .footer {
            text-align: center;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid var(--border);
            color: var(--text-light);
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Pure Lambda Examples Gallery</h1>
            <p>Explore canonical seed patterns that demonstrate cross-dimensional genetics and functional programming concepts.</p>
        </div>

        <div class="gallery-grid">
            ${exampleCards}
        </div>

        ${patternSummary}

        <div class="footer">
            <p>Generated with Pure Lambda Gallery Tool • <a href="../EXAMPLES.md">View Documentation</a> • <a href="../PAIR-LEXICON.md">Pair-Lexicon Reference</a></p>
        </div>
    </div>

    <script>
        function generateNF(seedName) {
            // Mock NF generation - would call actual NF tool in real implementation
            alert(\`Generating NF for \${seedName}...\\n\\nIn a real implementation, this would call:\\n./tools/nf.ts seeds/examples/\${seedName}.json\`);
        }
    </script>
</body>
</html>`;
}

function main() {
  program
    .name('gallery')
    .description('Generate HTML gallery from Pure Lambda example seeds')
    .option('-i, --input <dir>', 'Input directory containing example seeds', 'seeds/examples')
    .option('-l, --lexicon <file>', 'Pair-Lexicon YAML file', 'docs/pairs.yaml')
    .option('-o, --output <file>', 'Output HTML file', 'docs/gallery.html')
    .option('--title <title>', 'Gallery title', 'Pure Lambda Examples Gallery')
    .action((options) => {
      try {
        const inputDir = path.resolve(options.input);
        const lexiconFile = path.resolve(options.lexicon);
        const outputFile = path.resolve(options.output);

        // Load pair lexicon
        const lexicon = loadPairLexicon(lexiconFile);

        // Find all JSON files in examples directory
        const seedFiles = fs.readdirSync(inputDir)
          .filter(file => file.endsWith('.json'))
          .map(file => path.join(inputDir, file));

        // Analyze each seed
        const seeds: SeedInfo[] = seedFiles.map(filePath => {
          const seedData = loadSeed(filePath);
          return analyzeSeed(seedData, lexicon);
        });

        // Sort by complexity and name
        seeds.sort((a, b) => {
          const complexityOrder = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)'];
          const aIndex = complexityOrder.indexOf(a.complexity);
          const bIndex = complexityOrder.indexOf(b.complexity);

          if (aIndex !== bIndex) {
            return aIndex - bIndex;
          }

          return a.name.localeCompare(b.name);
        });

        // Generate HTML
        const html = generateGalleryHTML(seeds, lexicon);

        // Write output
        fs.writeFileSync(outputFile, html, 'utf-8');

        console.log(`Gallery generated successfully:`);
        console.log(`  Input: ${inputDir} (${seeds.length} seeds)`);
        console.log(`  Lexicon: ${lexiconFile}`);
        console.log(`  Output: ${outputFile}`);
        console.log(`  Total patterns detected: ${new Set(seeds.flatMap(s => s.patterns)).size}`);

      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });

  program.parse();
}

if (require.main === module) {
  main();
}

export { analyzeSeed, generateGalleryHTML };
export type { SeedInfo };