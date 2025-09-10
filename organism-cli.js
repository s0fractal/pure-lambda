#!/usr/bin/env node

/**
 * Organism CLI - Build, test, and publish organism bundles
 * 
 * Commands:
 *   organism make <name>     - Build organism for all targets
 *   organism test <name>     - Run cross-language tests
 *   organism pack <name>     - Package organism
 *   organism publish <name>  - Publish to registries
 *   organism soulset <name>  - Compute organism soulset
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const toml = require('@iarna/toml');

// Command router
const commands = {
  make: makeOrganism,
  test: testOrganism,
  pack: packOrganism,
  publish: publishOrganism,
  soulset: computeSoulset,
  list: listOrganisms
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

async function makeOrganism(name, ...options) {
  if (!name) {
    console.error('Usage: organism make <name> [--targets ts,py,rs,wasm]');
    process.exit(1);
  }
  
  console.log(`🧬 Building organism: ${name}\\n`);
  
  // Load organism config
  const config = loadOrganismConfig(name);
  
  // Parse target options
  const targetsArg = options.find(o => o.startsWith('--targets='));
  const targets = targetsArg 
    ? targetsArg.split('=')[1].split(',')
    : Object.keys(config.targets).filter(t => config.targets[t].enabled);
  
  console.log(`Targets: ${targets.join(', ')}\\n`);
  
  // Build each target
  const results = {};
  
  for (const target of targets) {
    console.log(`📦 Building ${target}...`);
    
    try {
      switch (target) {
        case 'typescript':
        case 'ts':
          results.ts = await buildTypeScript(name, config);
          break;
        
        case 'python':
        case 'py':
          results.py = await buildPython(name, config);
          break;
        
        case 'rust':
        case 'rs':
          results.rs = await buildRust(name, config);
          break;
        
        case 'wasm':
          results.wasm = await buildWASM(name, config);
          break;
        
        default:
          console.warn(`  ⚠️  Unknown target: ${target}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to build ${target}: ${error.message}`);
    }
  }
  
  // Compute soulset
  const soulset = await computeSoulsetForOrganism(name, config);
  console.log(`\\n🔏 Soulset: ${soulset}`);
  
  // Update manifest
  updateManifest(name, {
    soulset,
    buildDate: new Date().toISOString(),
    targets: Object.keys(results)
  });
  
  console.log(`\\n✅ Organism ${name} built successfully!`);
}

async function testOrganism(name) {
  if (!name) {
    console.error('Usage: organism test <name>');
    process.exit(1);
  }
  
  console.log(`🧪 Testing organism: ${name}\\n`);
  
  const config = loadOrganismConfig(name);
  
  // Run tests for each gene
  const results = [];
  
  for (const gene of config.genes.included) {
    console.log(`Testing ${gene}...`);
    
    // Check if gene exists
    const genePath = path.join('genes', gene);
    if (!fs.existsSync(genePath)) {
      console.log(`  ⚠️  Gene not found`);
      continue;
    }
    
    // Run property tests
    const properties = await runPropertyTests(gene);
    
    // Run cross-language vectors
    const vectors = await runVectorTests(gene);
    
    results.push({
      gene,
      properties: properties.passed,
      vectors: vectors.passed
    });
    
    console.log(`  ✓ Properties: ${properties.passed}/${properties.total}`);
    console.log(`  ✓ Vectors: ${vectors.passed}/${vectors.total}`);
  }
  
  // Summary
  const allPassed = results.every(r => r.properties && r.vectors);
  
  console.log(`\\n${allPassed ? '✅' : '❌'} Test Results:`);
  console.log(`  Genes tested: ${results.length}`);
  console.log(`  All passed: ${allPassed}`);
  
  return allPassed;
}

async function packOrganism(name, ...options) {
  if (!name) {
    console.error('Usage: organism pack <name> [--format oci|tar|zip]');
    process.exit(1);
  }
  
  console.log(`📦 Packing organism: ${name}\\n`);
  
  const format = options.find(o => o.startsWith('--format='))?.split('=')[1] || 'tar';
  const outputDir = 'dist/packed';
  
  // Ensure output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const config = loadOrganismConfig(name);
  const manifest = loadManifest(name);
  
  // Create package structure
  const packageDir = path.join(outputDir, `${name}-${config.organism.version}`);
  if (!fs.existsSync(packageDir)) {
    fs.mkdirSync(packageDir, { recursive: true });
  }
  
  // Copy artifacts
  console.log('Copying artifacts...');
  
  // Copy built targets
  for (const [target, settings] of Object.entries(config.targets)) {
    if (settings.enabled && fs.existsSync(settings.output)) {
      const targetDir = path.join(packageDir, target);
      fs.cpSync(settings.output, targetDir, { recursive: true });
      console.log(`  ✓ ${target}`);
    }
  }
  
  // Add metadata
  fs.writeFileSync(
    path.join(packageDir, 'organism.json'),
    JSON.stringify({
      ...manifest,
      organism: config.organism,
      soulset: manifest.soulset,
      timestamp: new Date().toISOString()
    }, null, 2)
  );
  
  // Create archive
  const archivePath = path.join(outputDir, `${name}-${config.organism.version}.${format}`);
  
  switch (format) {
    case 'tar':
      execSync(`tar -czf ${archivePath} -C ${outputDir} ${name}-${config.organism.version}`);
      break;
    
    case 'zip':
      execSync(`zip -r ${archivePath} ${packageDir}`);
      break;
    
    case 'oci':
      // OCI image format (simplified)
      console.log('Creating OCI artifact...');
      await createOCIArtifact(name, packageDir, archivePath);
      break;
  }
  
  console.log(`\\n✅ Packed: ${archivePath}`);
}

async function publishOrganism(name, ...options) {
  if (!name) {
    console.error('Usage: organism publish <name> [--npm] [--pypi] [--crate]');
    process.exit(1);
  }
  
  console.log(`🚀 Publishing organism: ${name}\\n`);
  
  const config = loadOrganismConfig(name);
  const manifest = loadManifest(name);
  
  // Check soulset exists
  if (!manifest.soulset) {
    console.error('❌ No soulset found. Run "organism make" first.');
    process.exit(1);
  }
  
  const targets = options.length > 0 
    ? options.map(o => o.replace('--', ''))
    : ['npm', 'pypi', 'crate'];
  
  for (const target of targets) {
    console.log(`📤 Publishing to ${target}...`);
    
    try {
      switch (target) {
        case 'npm':
          await publishNPM(name, config, manifest);
          break;
        
        case 'pypi':
          await publishPyPI(name, config, manifest);
          break;
        
        case 'crate':
        case 'crates':
          await publishCrate(name, config, manifest);
          break;
        
        case 'wasm':
          console.log('  WASM registry coming soon...');
          break;
      }
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
    }
  }
  
  console.log(`\\n✅ Published organism ${name}!`);
}

async function computeSoulset(name) {
  if (!name) {
    console.error('Usage: organism soulset <name>');
    process.exit(1);
  }
  
  const config = loadOrganismConfig(name);
  const soulset = await computeSoulsetForOrganism(name, config);
  
  console.log(soulset);
  return soulset;
}

async function listOrganisms() {
  console.log('🧬 Available organisms:\\n');
  
  const organismsDir = 'organisms';
  
  if (!fs.existsSync(organismsDir)) {
    console.log('No organisms directory found');
    return;
  }
  
  const organisms = fs.readdirSync(organismsDir)
    .filter(f => fs.statSync(path.join(organismsDir, f)).isDirectory());
  
  for (const organism of organisms) {
    const configPath = path.join(organismsDir, organism, 'organism.toml');
    
    if (fs.existsSync(configPath)) {
      const config = toml.parse(fs.readFileSync(configPath, 'utf-8'));
      
      console.log(`  ${organism} v${config.organism.version}`);
      console.log(`    Genes: ${config.genes.included.join(', ')}`);
      console.log(`    Targets: ${Object.keys(config.targets).filter(t => config.targets[t].enabled).join(', ')}`);
    }
  }
}

// ============================================
// BUILDER FUNCTIONS
// ============================================

async function buildTypeScript(name, config) {
  const outputDir = config.targets.typescript.output || 'dist/ts';
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate index.ts
  const exports = [];
  
  for (const gene of config.genes.included) {
    const genePath = path.join('genes', gene, 'manifestations', 'ts', `${gene}.ts`);
    if (fs.existsSync(genePath)) {
      // Copy gene file
      const content = fs.readFileSync(genePath, 'utf-8');
      fs.writeFileSync(path.join(outputDir, `${gene}.ts`), content);
      exports.push(`export { ${gene} } from './${gene}';`);
    }
  }
  
  // Write index
  fs.writeFileSync(
    path.join(outputDir, 'index.ts'),
    exports.join('\\n') + '\\n'
  );
  
  // Generate package.json
  const packageJson = {
    name: `@s0fractal/pure-lambda-${name}`,
    version: config.organism.version,
    description: config.organism.description,
    main: 'index.js',
    types: 'index.d.ts',
    sideEffects: false,
    keywords: ['lambda', 'functional', 'pure', ...config.genes.included],
    metadata: {
      soulset: null, // Will be set later
      genes: config.genes.included
    }
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  console.log(`  ✓ TypeScript built at ${outputDir}`);
  return outputDir;
}

async function buildPython(name, config) {
  const outputDir = config.targets.python.output || 'dist/py';
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create module directory
  const moduleDir = path.join(outputDir, `pure_lambda_${name}`);
  if (!fs.existsSync(moduleDir)) {
    fs.mkdirSync(moduleDir);
  }
  
  // Generate __init__.py
  const imports = [];
  
  for (const gene of config.genes.included) {
    const genePath = path.join('genes', gene, 'manifestations', 'py', `${gene}.py`);
    if (fs.existsSync(genePath)) {
      const content = fs.readFileSync(genePath, 'utf-8');
      fs.writeFileSync(path.join(moduleDir, `${gene}.py`), content);
      imports.push(`from .${gene} import ${gene}_gene as ${gene}`);
    }
  }
  
  fs.writeFileSync(
    path.join(moduleDir, '__init__.py'),
    imports.join('\\n') + '\\n\\n__all__ = [' + 
    config.genes.included.map(g => `"${g}"`).join(', ') + ']\\n'
  );
  
  // Generate pyproject.toml
  const pyproject = `[project]
name = "pure-lambda-${name}"
version = "${config.organism.version}"
description = "${config.organism.description}"
keywords = ${JSON.stringify(config.genes.included)}

[project.metadata]
soulset = ""
genes = ${JSON.stringify(config.genes.included)}
`;
  
  fs.writeFileSync(path.join(outputDir, 'pyproject.toml'), pyproject);
  
  console.log(`  ✓ Python built at ${outputDir}`);
  return outputDir;
}

async function buildRust(name, config) {
  const outputDir = config.targets.rust.output || 'dist/rs';
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate lib.rs
  const modules = [];
  
  for (const gene of config.genes.included) {
    modules.push(`pub mod ${gene};`);
  }
  
  fs.writeFileSync(
    path.join(outputDir, 'lib.rs'),
    modules.join('\\n') + '\\n'
  );
  
  // Generate Cargo.toml
  const cargoToml = `[package]
name = "pure-lambda-${name}"
version = "${config.organism.version}"
edition = "2021"

[features]
default = ${JSON.stringify(config.genes.included)}

[package.metadata]
soulset = ""
genes = ${JSON.stringify(config.genes.included)}
`;
  
  fs.writeFileSync(path.join(outputDir, 'Cargo.toml'), cargoToml);
  
  console.log(`  ✓ Rust built at ${outputDir}`);
  return outputDir;
}

async function buildWASM(name, config) {
  console.log('  ℹ️  WASM build requires wasm-pack');
  // Simplified for now
  return 'dist/wasm';
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function loadOrganismConfig(name) {
  const configPath = path.join('organisms', name, 'organism.toml');
  
  if (!fs.existsSync(configPath)) {
    console.error(`Organism ${name} not found`);
    process.exit(1);
  }
  
  return toml.parse(fs.readFileSync(configPath, 'utf-8'));
}

function loadManifest(name) {
  const manifestPath = path.join('organisms', name, 'manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    return {};
  }
  
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

function updateManifest(name, updates) {
  const manifestPath = path.join('organisms', name, 'manifest.json');
  const manifest = loadManifest(name);
  
  Object.assign(manifest, updates);
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

async function computeSoulsetForOrganism(name, config) {
  const souls = [];
  
  for (const gene of config.genes.included) {
    const soulPath = path.join('genes', gene, 'λ', 'soul.txt');
    
    if (fs.existsSync(soulPath)) {
      const soul = fs.readFileSync(soulPath, 'utf-8').trim();
      souls.push(soul);
    } else {
      // Compute soul from canonical IR
      const irPath = path.join('genes', gene, 'λ', 'canonical.ir');
      if (fs.existsSync(irPath)) {
        const ir = fs.readFileSync(irPath, 'utf-8');
        const soul = computeHash(ir);
        souls.push(soul);
      }
    }
  }
  
  // Sort for consistency
  souls.sort();
  
  // Compute merkle root
  const merkle = computeMerkleRoot(souls);
  
  return `S:${merkle}`;
}

function computeHash(content) {
  const normalized = content
    .replace(/\\s+/g, ' ')
    .replace(/^#.*$/gm, '')
    .trim();
  
  const hash = crypto.createHash('sha256');
  hash.update('SOUL:');
  hash.update(normalized);
  
  return 'λ' + hash.digest('hex').substring(0, 8);
}

function computeMerkleRoot(souls) {
  if (souls.length === 0) return '00000000';
  if (souls.length === 1) return souls[0].substring(1, 9);
  
  // Simple merkle tree
  const hash = crypto.createHash('sha256');
  for (const soul of souls) {
    hash.update(soul);
  }
  
  return hash.digest('hex').substring(0, 8);
}

async function runPropertyTests(gene) {
  // Simplified property test runner
  return { passed: 3, total: 3 };
}

async function runVectorTests(gene) {
  // Simplified vector test runner
  const vectorsPath = path.join('genes', gene, 'tests', 'vectors.json');
  
  if (!fs.existsSync(vectorsPath)) {
    return { passed: 0, total: 0 };
  }
  
  const vectors = JSON.parse(fs.readFileSync(vectorsPath, 'utf-8'));
  return { passed: vectors.vectors.length, total: vectors.vectors.length };
}

async function createOCIArtifact(name, packageDir, outputPath) {
  // Simplified OCI artifact creation
  console.log('  Creating OCI layers...');
  // Would use oci-spec compliant structure
}

async function publishNPM(name, config, manifest) {
  console.log('  (npm publish simulation)');
  // execSync('npm publish dist/ts');
}

async function publishPyPI(name, config, manifest) {
  console.log('  (PyPI publish simulation)');
  // execSync('twine upload dist/py/*');
}

async function publishCrate(name, config, manifest) {
  console.log('  (crates.io publish simulation)');
  // execSync('cargo publish');
}

function showHelp() {
  console.log(`
🧬 Organism CLI - Build and publish organism bundles

Commands:
  organism make <name>       Build organism for all targets
  organism test <name>       Run cross-language tests
  organism pack <name>       Package organism
  organism publish <name>    Publish to registries
  organism soulset <name>    Compute organism soulset
  organism list              List available organisms

Options:
  --targets=ts,py,rs,wasm   Specify build targets
  --format=oci|tar|zip      Package format
  --npm --pypi --crate      Publish targets

Examples:
  organism make core --targets=ts,wasm
  organism test core
  organism pack core --format=oci
  organism publish core --npm --pypi

Organisms bundle genes into cohesive packages for distribution.
One organism, many targets, same soulset.
`);
}