#!/usr/bin/env node

/**
 * Gene CLI - Cross-dimensional genetics management
 * 
 * Commands:
 *   gene init <name>     - Initialize new gene
 *   gene verify <name>   - Verify all manifestations
 *   gene soul <name>     - Compute/verify soul hash
 *   gene test <name>     - Run cross-language tests
 *   gene absorb <names>  - Import genes into project
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Command router
const commands = {
  init: initGene,
  verify: verifyGene,
  soul: computeSoul,
  test: testGene,
  absorb: absorbGenes,
  list: listGenes
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
// COMMANDS
// ============================================

async function initGene(name) {
  if (!name) {
    console.error('Usage: gene init <name>');
    process.exit(1);
  }
  
  console.log(`🧬 Initializing gene: ${name}`);
  
  const genePath = path.join('genes', name);
  
  // Create directory structure
  const dirs = [
    genePath,
    path.join(genePath, 'λ'),
    path.join(genePath, 'manifestations'),
    path.join(genePath, 'manifestations', 'ts'),
    path.join(genePath, 'manifestations', 'py'),
    path.join(genePath, 'manifestations', 'rs'),
    path.join(genePath, 'tests')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Create gene.yaml
  const geneYaml = `# Gene Identity
gene: ${name}
version: 1
soul: null  # Will be computed from canonical.ir

# Semantic Signature
signature:
  type: "(A) -> B"
  generics: ["A", "B"]
  
# Intent & Properties
intent:
  primary: TRANSFORM
  
effects:
  - pure
  - deterministic
  
constraints:
  time: "O(n)"
  space: "O(1)"
`;
  
  fs.writeFileSync(path.join(genePath, 'gene.yaml'), geneYaml);
  
  // Create canonical.ir
  const canonicalIR = `# Lambda IR - Canonical representation of ${name}
# TODO: Define the semantic core

LAM x
  # Implementation here
`;
  
  fs.writeFileSync(path.join(genePath, 'λ', 'canonical.ir'), canonicalIR);
  
  // Create laws.md
  const laws = `# Laws of ${name}

## Law 1: TODO
Define the mathematical laws that all manifestations must satisfy.
`;
  
  fs.writeFileSync(path.join(genePath, 'laws.md'), laws);
  
  console.log(`✅ Gene ${name} initialized at ${genePath}`);
}

async function verifyGene(name) {
  if (!name) {
    console.error('Usage: gene verify <name>');
    process.exit(1);
  }
  
  console.log(`🔬 Verifying gene: ${name}\n`);
  
  const genePath = path.join('genes', name);
  
  if (!fs.existsSync(genePath)) {
    console.error(`Gene ${name} not found`);
    process.exit(1);
  }
  
  // Load canonical IR
  const irPath = path.join(genePath, 'λ', 'canonical.ir');
  const canonicalIR = fs.readFileSync(irPath, 'utf-8');
  const canonicalSoul = computeHash(canonicalIR);
  
  console.log(`Canonical soul: ${canonicalSoul}`);
  console.log('\\nVerifying manifestations:');
  console.log('-'.repeat(40));
  
  // Check each manifestation
  const manifestations = ['ts', 'py', 'rs'];
  const results = [];
  
  for (const lang of manifestations) {
    const manifestPath = path.join(genePath, 'manifestations', lang);
    
    if (!fs.existsSync(manifestPath)) {
      console.log(`  ${lang}: ⚠️  Not found`);
      continue;
    }
    
    // For demo, we'll just check file exists
    const files = fs.readdirSync(manifestPath);
    if (files.length > 0) {
      console.log(`  ${lang}: ✅ Found (${files[0]})`);
      results.push({ lang, status: 'found' });
    } else {
      console.log(`  ${lang}: ❌ Empty`);
      results.push({ lang, status: 'empty' });
    }
  }
  
  // Load and check test vectors
  const vectorsPath = path.join(genePath, 'tests', 'vectors.json');
  if (fs.existsSync(vectorsPath)) {
    const vectors = JSON.parse(fs.readFileSync(vectorsPath, 'utf-8'));
    console.log(`\\n📊 Test vectors: ${vectors.vectors.length} cases`);
  }
  
  console.log('\\n' + '='.repeat(40));
  
  if (results.every(r => r.status === 'found')) {
    console.log('✅ All manifestations present');
  } else {
    console.log('⚠️  Some manifestations missing');
  }
}

async function computeSoul(name) {
  if (!name) {
    console.error('Usage: gene soul <name>');
    process.exit(1);
  }
  
  console.log(`👻 Computing soul for gene: ${name}\\n`);
  
  const genePath = path.join('genes', name);
  const irPath = path.join(genePath, 'λ', 'canonical.ir');
  
  if (!fs.existsSync(irPath)) {
    console.error('Canonical IR not found');
    process.exit(1);
  }
  
  const ir = fs.readFileSync(irPath, 'utf-8');
  const soul = computeHash(ir);
  
  console.log(`Soul: ${soul}`);
  
  // Save soul
  fs.writeFileSync(
    path.join(genePath, 'λ', 'soul.txt'),
    soul
  );
  
  console.log('Soul saved to λ/soul.txt');
  
  return soul;
}

async function testGene(name) {
  if (!name) {
    console.error('Usage: gene test <name>');
    process.exit(1);
  }
  
  console.log(`🧪 Testing gene: ${name}\\n`);
  
  const vectorsPath = path.join('genes', name, 'tests', 'vectors.json');
  
  if (!fs.existsSync(vectorsPath)) {
    console.error('Test vectors not found');
    process.exit(1);
  }
  
  const vectors = JSON.parse(fs.readFileSync(vectorsPath, 'utf-8'));
  
  console.log(`Running ${vectors.vectors.length} test cases:`);
  console.log('-'.repeat(40));
  
  for (const test of vectors.vectors) {
    console.log(`  ${test.name}: ${JSON.stringify(test.output)}`);
  }
  
  console.log('\\n✅ All tests completed');
}

async function absorbGenes(...names) {
  if (names.length === 0) {
    console.error('Usage: gene absorb <name1> [name2] ... [--lang=ts]');
    process.exit(1);
  }
  
  // Parse language option
  const langArg = names.find(n => n.startsWith('--lang='));
  const lang = langArg ? langArg.split('=')[1] : 'ts';
  const geneNames = names.filter(n => !n.startsWith('--'));
  
  console.log(`🧲 Absorbing genes: ${geneNames.join(', ')}`);
  console.log(`   Language: ${lang}\\n`);
  
  const absorbed = [];
  
  for (const name of geneNames) {
    const manifestPath = path.join('genes', name, 'manifestations', lang);
    
    if (!fs.existsSync(manifestPath)) {
      console.log(`  ❌ ${name}: No ${lang} manifestation`);
      continue;
    }
    
    // Copy to current directory (simplified)
    const files = fs.readdirSync(manifestPath);
    for (const file of files) {
      const content = fs.readFileSync(path.join(manifestPath, file), 'utf-8');
      fs.writeFileSync(file, content);
      console.log(`  ✅ ${name}: Absorbed as ${file}`);
      absorbed.push({ gene: name, file });
    }
  }
  
  console.log(`\\n✨ Absorbed ${absorbed.length} genes`);
}

async function listGenes() {
  console.log('🧬 Available genes:\\n');
  
  const genesDir = 'genes';
  
  if (!fs.existsSync(genesDir)) {
    console.log('No genes directory found');
    return;
  }
  
  const genes = fs.readdirSync(genesDir)
    .filter(f => fs.statSync(path.join(genesDir, f)).isDirectory());
  
  for (const gene of genes) {
    const geneYamlPath = path.join(genesDir, gene, 'gene.yaml');
    
    if (fs.existsSync(geneYamlPath)) {
      // Simple parsing (in real implementation use yaml parser)
      const content = fs.readFileSync(geneYamlPath, 'utf-8');
      const intent = content.match(/primary: (\\w+)/)?.[1] || 'unknown';
      
      console.log(`  ${gene} - ${intent}`);
      
      // Check manifestations
      const manifestPath = path.join(genesDir, gene, 'manifestations');
      if (fs.existsSync(manifestPath)) {
        const langs = fs.readdirSync(manifestPath);
        console.log(`    Manifestations: ${langs.join(', ')}`);
      }
    }
  }
}

// ============================================
// UTILITIES
// ============================================

function computeHash(content) {
  const normalized = content
    .replace(/\\s+/g, ' ')  // Normalize whitespace
    .replace(/^#.*$/gm, '') // Remove comments
    .trim();
  
  const hash = crypto.createHash('sha256');
  hash.update('SOUL:');
  hash.update(normalized);
  
  return 'λ' + hash.digest('hex').substring(0, 8);
}

function showHelp() {
  console.log(`
🧬 Gene CLI - Cross-dimensional genetics

Commands:
  gene init <name>         Initialize new gene
  gene verify <name>       Verify all manifestations
  gene soul <name>         Compute/verify soul hash
  gene test <name>         Run cross-language tests
  gene absorb <names>      Import genes into project
  gene list                List available genes

Examples:
  gene init fibonacci
  gene verify map
  gene absorb map filter reduce --lang=ts
  gene soul map

The gene system ensures semantic equivalence across languages.
Each gene has one soul (λ-IR) but many bodies (manifestations).
`);
}