#!/usr/bin/env node

/**
 * DEVOUR - The Great Devourer
 * Consumes the entire ecosystem and digests it into pure genes
 * 
 * Commands:
 *   devour add <source>    - Consume external code
 *   devour digest          - Extract λ-IR and souls
 *   devour align           - Find equivalence classes
 *   devour distill         - Select champion implementations
 *   devour forge           - Build organism artifacts
 *   devour attest          - Generate proofs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Command router
const commands = {
  add: devourAdd,
  digest: devourDigest,
  align: devourAlign,
  distill: devourDistill,
  forge: devourForge,
  attest: devourAttest,
  status: devourStatus
};

// Parse arguments
const [,, command, ...args] = process.argv;

if (!command || !commands[command]) {
  showHelp();
  process.exit(1);
}

// Execute command
commands[command](...args).catch(console.error);

// ============================================
// DEVOUR COMMANDS
// ============================================

async function devourAdd(...sources) {
  if (sources.length === 0) {
    console.error('Usage: devour add <npm-package|github-repo|crate>');
    process.exit(1);
  }
  
  console.log('🦖 DEVOURING EXTERNAL CODE\\n');
  
  const devourDir = '.devour';
  const sourcesDir = path.join(devourDir, 'sources');
  
  // Ensure directories exist
  [devourDir, sourcesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Load or create devour state
  const stateFile = path.join(devourDir, 'state.json');
  const state = fs.existsSync(stateFile) 
    ? JSON.parse(fs.readFileSync(stateFile, 'utf-8'))
    : { sources: [], digested: [], aligned: {}, champions: {} };
  
  for (const source of sources) {
    console.log(`📦 Consuming: ${source}`);
    
    try {
      let consumed = false;
      
      // Detect source type
      if (source.includes('github.com') || source.includes('.git')) {
        // GitHub repository
        const repoName = source.split('/').pop().replace('.git', '');
        const targetDir = path.join(sourcesDir, repoName);
        
        if (!fs.existsSync(targetDir)) {
          execSync(`git clone ${source} ${targetDir}`, { stdio: 'inherit' });
          consumed = true;
        } else {
          console.log('  Already consumed');
        }
        
        state.sources.push({ type: 'github', name: repoName, path: targetDir });
        
      } else if (source.startsWith('@') || !source.includes('/')) {
        // NPM package
        const pkgDir = path.join(sourcesDir, 'npm', source);
        
        if (!fs.existsSync(pkgDir)) {
          fs.mkdirSync(pkgDir, { recursive: true });
          execSync(`cd ${pkgDir} && npm init -y && npm install ${source}`, { stdio: 'inherit' });
          consumed = true;
        } else {
          console.log('  Already consumed');
        }
        
        state.sources.push({ type: 'npm', name: source, path: pkgDir });
        
      } else {
        console.log('  Unknown source type');
      }
      
      if (consumed) {
        console.log('  ✓ Consumed successfully');
      }
      
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}`);
    }
  }
  
  // Save state
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  
  console.log(`\\n🦖 Consumed ${sources.length} sources`);
  console.log('Next: Run "devour digest" to extract genes');
}

async function devourDigest() {
  console.log('🧬 DIGESTING INTO GENES\\n');
  
  const stateFile = path.join('.devour', 'state.json');
  if (!fs.existsSync(stateFile)) {
    console.error('No sources to digest. Run "devour add" first.');
    process.exit(1);
  }
  
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  const genesDir = path.join('.devour', 'genes');
  
  if (!fs.existsSync(genesDir)) {
    fs.mkdirSync(genesDir, { recursive: true });
  }
  
  let totalGenes = 0;
  const allGenes = new Map();
  
  for (const source of state.sources) {
    console.log(`📖 Digesting ${source.name}...`);
    
    const genes = await extractGenes(source.path);
    
    for (const [name, gene] of genes) {
      // Generate soul
      gene.soul = computeSoul(gene.ir || gene.code);
      gene.source = source.name;
      
      // Store gene
      const geneFile = path.join(genesDir, `${gene.soul}.json`);
      fs.writeFileSync(geneFile, JSON.stringify(gene, null, 2));
      
      allGenes.set(gene.soul, gene);
      totalGenes++;
    }
    
    console.log(`  ✓ Extracted ${genes.size} genes`);
  }
  
  // Update state
  state.digested = Array.from(allGenes.keys());
  state.totalGenes = totalGenes;
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  
  console.log(`\\n🧬 Digested ${totalGenes} total genes`);
  console.log('Next: Run "devour align" to find equivalences');
}

async function devourAlign() {
  console.log('🔄 ALIGNING EQUIVALENT GENES\\n');
  
  const stateFile = path.join('.devour', 'state.json');
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  const genesDir = path.join('.devour', 'genes');
  
  // Try to load advanced alignment rules first
  let alignmentRules;
  try {
    alignmentRules = require('./devour/alignment-rules');
    console.log('Using advanced alignment rules...\\n');
  } catch (e) {
    // Fall back to simple rules
    alignmentRules = loadAlignmentRules();
    console.log('Using basic alignment rules...\\n');
  }
  
  // Group genes by equivalence
  const equivalenceClasses = new Map();
  
  for (const soul of state.digested) {
    const genePath = path.join(genesDir, `${soul}.json`);
    const gene = JSON.parse(fs.readFileSync(genePath, 'utf-8'));
    
    // Find equivalence class
    let eqClass;
    if (alignmentRules.findCanonical) {
      // Use advanced rules
      const sourceName = gene.source.toLowerCase();
      let library = 'unknown';
      if (sourceName.includes('lodash')) library = 'lodash';
      else if (sourceName.includes('ramda')) library = 'ramda';
      else if (sourceName.includes('underscore')) library = 'underscore';
      
      eqClass = alignmentRules.findCanonical(library, gene.name) || gene.name;
    } else {
      // Use simple rules
      eqClass = findEquivalenceClass(gene, alignmentRules);
    }
    
    if (!equivalenceClasses.has(eqClass)) {
      equivalenceClasses.set(eqClass, []);
    }
    
    equivalenceClasses.get(eqClass).push(gene);
  }
  
  console.log(`Found ${equivalenceClasses.size} equivalence classes:\\n`);
  
  // Show major equivalences
  const majorClasses = Array.from(equivalenceClasses.entries())
    .filter(([_, genes]) => genes.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);
  
  for (const [className, genes] of majorClasses) {
    const sources = [...new Set(genes.map(g => g.source))];
    console.log(`  ${className}: ${genes.length} variants`);
    console.log(`    Sources: ${sources.join(', ')}`);
  }
  
  // Generate compatibility report if advanced rules available
  if (alignmentRules.generateReport) {
    const report = alignmentRules.generateReport();
    console.log('\\n📊 Alignment Report:');
    console.log(`  Total genes: ${report.totalGenes}`);
    console.log(`  Coverage:`);
    console.log(`    lodash: ${report.coverage.lodash}/${report.totalGenes}`);
    console.log(`    ramda: ${report.coverage.ramda}/${report.totalGenes}`);
    console.log(`    underscore: ${report.coverage.underscore}/${report.totalGenes}`);
  }
  
  // Save alignment
  state.aligned = Object.fromEntries(
    Array.from(equivalenceClasses.entries()).map(([k, v]) => [k, v.map(g => g.soul)])
  );
  
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  
  console.log(`\\n✅ Aligned into ${equivalenceClasses.size} unique genes`);
  console.log('Next: Run "devour distill" to select champions');
}

async function devourDistill() {
  console.log('🏆 DISTILLING CHAMPION IMPLEMENTATIONS\\n');
  
  const stateFile = path.join('.devour', 'state.json');
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  const genesDir = path.join('.devour', 'genes');
  
  const champions = {};
  
  for (const [className, souls] of Object.entries(state.aligned)) {
    const candidates = souls.map(soul => {
      const genePath = path.join(genesDir, `${soul}.json`);
      return JSON.parse(fs.readFileSync(genePath, 'utf-8'));
    });
    
    // Select champion based on criteria
    const champion = selectChampion(candidates);
    champions[className] = champion.soul;
    
    console.log(`  ${className}: Selected ${champion.source} variant`);
    console.log(`    Soul: ${champion.soul}`);
    console.log(`    Score: ${champion.score || 'N/A'}`);
  }
  
  // Save champions
  state.champions = champions;
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  
  console.log(`\\n🏆 Selected ${Object.keys(champions).length} champion genes`);
  console.log('Next: Run "devour forge" to build organism');
}

async function devourForge(organismName = 'devoured', ...options) {
  console.log(`🔨 FORGING ORGANISM: ${organismName}\\n`);
  
  const stateFile = path.join('.devour', 'state.json');
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  const genesDir = path.join('.devour', 'genes');
  
  // Parse options
  const targets = options.find(o => o.startsWith('--targets='))?.split('=')[1].split(',') 
    || ['ts', 'wasm'];
  const withShims = options.includes('--with-shims');
  const shimLibraries = options.find(o => o.startsWith('--shims='))?.split('=')[1].split(',')
    || ['lodash', 'ramda', 'underscore'];
  
  // Create organism structure
  const organismDir = path.join('organisms', organismName);
  if (!fs.existsSync(organismDir)) {
    fs.mkdirSync(organismDir, { recursive: true });
  }
  
  // Collect champion genes
  const genes = [];
  for (const [className, soul] of Object.entries(state.champions)) {
    const genePath = path.join(genesDir, `${soul}.json`);
    const gene = JSON.parse(fs.readFileSync(genePath, 'utf-8'));
    gene.canonical_name = className;
    genes.push(gene);
  }
  
  console.log(`Forging with ${genes.length} genes...\\n`);
  
  // Generate organism.toml
  const organismToml = `[organism]
name = "${organismName}"
version = "0.1.0"
description = "Devoured and distilled from the ecosystem"
author = "The Great Devourer"

[genes]
included = ${JSON.stringify(genes.map(g => g.canonical_name))}

[targets]
${targets.map(t => `${t} = { enabled = true }`).join('\\n')}

[policy]
strict = false  # Devoured code may not be perfectly pure
evolved = true  # This organism evolved from consumption

[metadata]
sources = ${JSON.stringify([...new Set(state.sources.map(s => s.name))])}
devoured_at = "${new Date().toISOString()}"
total_consumed = ${state.totalGenes}
distilled_to = ${genes.length}
`;
  
  fs.writeFileSync(path.join(organismDir, 'organism.toml'), organismToml);
  
  // Build targets
  for (const target of targets) {
    console.log(`  Building ${target}...`);
    await buildTarget(organismName, genes, target);
  }
  
  // Compute soulset
  const souls = genes.map(g => g.soul).sort();
  const soulset = computeMerkleRoot(souls);
  
  console.log(`\\n🔏 Organism Soulset: ${soulset}`);
  
  // Generate shims if requested
  if (withShims) {
    console.log('\\n🔌 Generating compatibility shims...');
    
    try {
      const ShimGenerator = require('./devour/shim-generator');
      const manifest = {
        name: organismName,
        genes: Object.fromEntries(
          genes.map(g => [g.canonical_name, { soul: g.soul, verified: true }])
        )
      };
      
      for (const library of shimLibraries) {
        console.log(`  Generating ${library} shim...`);
        const generator = new ShimGenerator(manifest, library);
        const shimPath = generator.generateShim();
        console.log(`    ✓ Created at ${shimPath}`);
      }
    } catch (e) {
      console.log('  Warning: Could not generate shims:', e.message);
    }
  }
  
  console.log(`\\n✅ Forged ${organismName} with ${genes.length} genes`);
}

async function devourAttest() {
  console.log('📜 GENERATING ATTESTATIONS\\n');
  
  const stateFile = path.join('.devour', 'state.json');
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  
  const attestation = {
    version: '1.0',
    type: 'devour-attestation',
    timestamp: new Date().toISOString(),
    sources: state.sources,
    statistics: {
      total_consumed: state.totalGenes,
      unique_genes: Object.keys(state.aligned).length,
      champions: Object.keys(state.champions).length
    },
    process: {
      consumed_at: state.sources[0]?.consumed_at,
      digested_at: state.digested_at,
      aligned_at: state.aligned_at,
      distilled_at: state.distilled_at
    },
    proofs: {
      soulset: computeMerkleRoot(Object.values(state.champions)),
      sources_hash: computeHash(JSON.stringify(state.sources)),
      alignment_hash: computeHash(JSON.stringify(state.aligned))
    }
  };
  
  const attestPath = path.join('.devour', 'attestation.json');
  fs.writeFileSync(attestPath, JSON.stringify(attestation, null, 2));
  
  console.log('Attestation generated:');
  console.log(`  Sources: ${attestation.statistics.total_consumed} genes from ${state.sources.length} sources`);
  console.log(`  Distilled: ${attestation.statistics.champions} champion genes`);
  console.log(`  Soulset: ${attestation.proofs.soulset}`);
  
  console.log(`\\n📜 Attestation saved to ${attestPath}`);
}

async function devourStatus() {
  console.log('🦖 DEVOUR STATUS\\n');
  
  const stateFile = path.join('.devour', 'state.json');
  
  if (!fs.existsSync(stateFile)) {
    console.log('No active devour process.');
    console.log('Run "devour add <source>" to begin.');
    return;
  }
  
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  
  console.log('Sources consumed:');
  for (const source of state.sources || []) {
    console.log(`  - ${source.name} (${source.type})`);
  }
  
  if (state.digested) {
    console.log(`\\nGenes extracted: ${state.totalGenes || 0}`);
  }
  
  if (state.aligned) {
    console.log(`Unique genes: ${Object.keys(state.aligned).length}`);
  }
  
  if (state.champions) {
    console.log(`Champions selected: ${Object.keys(state.champions).length}`);
  }
  
  console.log('\\nNext step:', getNextStep(state));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function extractGenes(sourcePath) {
  const genes = new Map();
  
  // Find all JS/TS files
  const files = findFiles(sourcePath, ['.js', '.ts', '.jsx', '.tsx']);
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Simple function extraction (would use proper AST in production)
      const funcRegex = /(?:export\\s+)?(?:async\\s+)?function\\s+(\\w+)|(?:export\\s+)?const\\s+(\\w+)\\s*=\\s*(?:async\\s*)?(?:\\([^)]*\\)|\\w+)\\s*=>/g;
      let match;
      
      while ((match = funcRegex.exec(content)) !== null) {
        const name = match[1] || match[2];
        if (name && !genes.has(name)) {
          genes.set(name, {
            name,
            code: extractFunctionBody(content, match.index),
            file: path.relative(sourcePath, file)
          });
        }
      }
    } catch (error) {
      // Skip files that can't be parsed
    }
  }
  
  return genes;
}

function findFiles(dir, extensions) {
  const files = [];
  
  function walk(currentDir) {
    if (currentDir.includes('node_modules') || currentDir.includes('.git')) {
      return;
    }
    
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
  }
  
  walk(dir);
  return files;
}

function extractFunctionBody(content, startIndex) {
  // Simplified extraction - in production would use proper parsing
  const slice = content.slice(startIndex, startIndex + 500);
  return slice.split('\\n').slice(0, 10).join('\\n');
}

function loadAlignmentRules() {
  const rulesPath = path.join('.devour', 'alignment-rules.json');
  
  if (fs.existsSync(rulesPath)) {
    return JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
  }
  
  // Default alignment rules
  return {
    map: ['map', 'collect', 'transform', 'fmap'],
    filter: ['filter', 'select', 'where', 'find_all'],
    reduce: ['reduce', 'fold', 'inject', 'aggregate'],
    compose: ['compose', 'flow', 'pipe', 'chain'],
    curry: ['curry', 'partial', 'curryRight'],
    identity: ['identity', 'id', 'I'],
    constant: ['constant', 'always', 'K'],
    chunk: ['chunk', 'batch', 'partition'],
    flatten: ['flatten', 'flat', 'concat'],
    uniq: ['uniq', 'unique', 'distinct', 'dedupe']
  };
}

function findEquivalenceClass(gene, rules) {
  const name = gene.name.toLowerCase();
  
  for (const [className, variants] of Object.entries(rules)) {
    if (variants.some(v => name.includes(v))) {
      return className;
    }
  }
  
  return gene.name; // Use original name if no match
}

function selectChampion(candidates) {
  // Score each candidate
  for (const candidate of candidates) {
    candidate.score = scoreGene(candidate);
  }
  
  // Sort by score and select best
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

function scoreGene(gene) {
  let score = 0;
  
  // Prefer popular sources
  if (gene.source.includes('lodash')) score += 30;
  if (gene.source.includes('ramda')) score += 25;
  if (gene.source.includes('underscore')) score += 20;
  
  // Prefer shorter code
  const codeLength = (gene.code || '').length;
  if (codeLength < 100) score += 20;
  else if (codeLength < 200) score += 10;
  
  // Prefer pure functions (no side effects detected)
  if (!gene.code?.includes('console.')) score += 10;
  if (!gene.code?.includes('Date.')) score += 5;
  
  return score;
}

async function buildTarget(organismName, genes, target) {
  const outputDir = path.join('organisms', organismName, 'dist', target);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  switch (target) {
    case 'ts':
      // Generate TypeScript module
      const tsExports = genes.map(g => 
        `export const ${g.canonical_name} = ${g.code || '() => {}'};`
      ).join('\\n\\n');
      
      fs.writeFileSync(path.join(outputDir, 'index.ts'), tsExports);
      break;
    
    case 'wasm':
      // Generate WASM stub
      fs.writeFileSync(path.join(outputDir, 'module.wat'), 
        ';; WebAssembly module for ' + organismName
      );
      break;
  }
}

function computeSoul(code) {
  const hash = crypto.createHash('sha256');
  hash.update('SOUL:');
  hash.update((code || '').replace(/\\s+/g, ' ').trim());
  return 'λ' + hash.digest('hex').substring(0, 8);
}

function computeHash(content) {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex').substring(0, 16);
}

function computeMerkleRoot(souls) {
  if (souls.length === 0) return '00000000';
  
  const hash = crypto.createHash('sha256');
  for (const soul of souls) {
    hash.update(soul);
  }
  
  return 'S:' + hash.digest('hex').substring(0, 8);
}

function getNextStep(state) {
  if (!state.sources || state.sources.length === 0) {
    return 'devour add <source>';
  }
  if (!state.digested) {
    return 'devour digest';
  }
  if (!state.aligned) {
    return 'devour align';
  }
  if (!state.champions) {
    return 'devour distill';
  }
  return 'devour forge <organism-name>';
}

function showHelp() {
  console.log(`
🦖 DEVOUR - The Great Devourer

Commands:
  devour add <source>     Consume external code (npm/github/crate)
  devour digest          Extract genes from consumed sources
  devour align           Find equivalent functions across sources
  devour distill         Select champion implementations
  devour forge <name>    Build organism from champions
  devour attest          Generate attestation proofs
  devour status          Show current devour state

Pipeline:
  add → digest → align → distill → forge → attest

Examples:
  devour add lodash ramda underscore
  devour add https://github.com/jashkenas/underscore
  devour digest
  devour align
  devour distill
  devour forge ultimate-core --targets=ts,wasm
  devour forge ultimate-core --with-shims --shims=lodash,ramda
  devour attest

The Devourer consumes entire ecosystems and distills them into
pure genetic essences, creating the ultimate organisms.
`);
}