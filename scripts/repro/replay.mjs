#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Reproducible Replay + Provenance
 *
 * Steps:
 * 1. Clean dist/
 * 2. Run: npm run ipld:car (write dist/operon.car & dist/operon.json)
 * 3. Run: make nf-dry (produce dist/operon.nf.json & patch)
 * 4. Run: npm run autopilot:json (baseline & NF if exists)
 * 5. Compute HASHES: blake3 or sha256 of outputs + tool versions
 * 6. Emit provenance JSON: receipts/attest/provenance.json
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { join, resolve } from 'path';

const projectRoot = resolve(process.cwd());

// Utility functions
function execSafe(cmd, options = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      cwd: projectRoot,
      stdio: 'pipe',
      ...options
    });
  } catch (error) {
    console.error(`Command failed: ${cmd}`);
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

function computeHash(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function getToolVersions() {
  const nodeVersion = execSafe('node -v').trim();

  let tsNodeVersion;
  try {
    tsNodeVersion = execSafe('npx ts-node -v').trim().split('\n')[0];
  } catch {
    tsNodeVersion = 'unknown';
  }

  const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
  const pkgVersion = packageJson.version;

  let gitRev;
  try {
    gitRev = execSafe('git rev-parse HEAD').trim();
  } catch {
    gitRev = 'unknown';
  }

  let rulesHash = null;
  const rulesPath = join(projectRoot, 'rules/nf.json');
  if (existsSync(rulesPath)) {
    rulesHash = computeHash(rulesPath);
  }

  return {
    node: nodeVersion,
    tsnode: tsNodeVersion,
    pkg: pkgVersion,
    gitRev,
    rulesHash
  };
}

function computeFixturesHash() {
  const fixturesDir = join(projectRoot, 'fixtures');
  if (!existsSync(fixturesDir)) {
    return null;
  }

  try {
    // Simple approach: hash the tiles directory if it exists
    const tilesDir = join(fixturesDir, 'tiles');
    if (existsSync(tilesDir)) {
      const output = execSafe(`find "${tilesDir}" -type f -exec sha256sum {} + | sort | sha256sum`);
      return output.split(' ')[0];
    }
  } catch {
    // Fallback: just hash the main fixture file if exists
    const mainFixture = join(fixturesDir, 'doe.json');
    if (existsSync(mainFixture)) {
      return computeHash(mainFixture);
    }
  }

  return null;
}

function parseAutopilotOutput() {
  const autopilotFile = '/tmp/autopilot-last.json';
  if (!existsSync(autopilotFile)) {
    return { Lbest: null, routeLen: null };
  }

  try {
    const content = JSON.parse(readFileSync(autopilotFile, 'utf8'));
    return {
      Lbest: content.Lbest || content.L_best || null,
      routeLen: content.routeLen || content.route_length || null
    };
  } catch {
    return { Lbest: null, routeLen: null };
  }
}

function parseNFPatch() {
  const patchFile = join(projectRoot, 'dist/operon.nf.patch.json');
  if (!existsSync(patchFile)) {
    return { patchCount: 0, delta: null };
  }

  try {
    const content = JSON.parse(readFileSync(patchFile, 'utf8'));
    const patchCount = Array.isArray(content) ? content.length : Object.keys(content).length;

    // Extract delta metrics if available
    const delta = {
      hops: content.delta?.hops || null,
      lat: content.delta?.lat || content.delta?.latency || null,
      mem: content.delta?.mem || content.delta?.memory || null
    };

    return { patchCount, delta };
  } catch {
    return { patchCount: 0, delta: null };
  }
}

async function main() {
  console.log('🔄 Starting reproducible replay...');

  const startTime = new Date().toISOString();

  // Step 1: Clean dist/
  console.log('1. Cleaning dist/');
  const distDir = join(projectRoot, 'dist');
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true, force: true });
  }
  mkdirSync(distDir, { recursive: true });

  // Step 2: Run npm run ipld:car
  console.log('2. Running ipld:car export');
  execSafe('npm run ipld:car');

  // Step 3: Run make nf-dry
  console.log('3. Running NF dry run');
  try {
    execSafe('make nf-dry');
  } catch (error) {
    console.warn('NF dry run failed or not available:', error.message);
  }

  // Step 4: Run autopilot
  console.log('4. Running autopilot analysis');
  try {
    execSafe('npm run autopilot:json');
  } catch (error) {
    console.warn('Autopilot analysis failed:', error.message);
    // Try make autopilot as fallback
    try {
      execSafe('make autopilot');
    } catch (fallbackError) {
      console.warn('Fallback autopilot also failed:', fallbackError.message);
    }
  }

  // Step 5: Compute hashes and gather metadata
  console.log('5. Computing hashes and gathering metadata');

  const tools = getToolVersions();
  const fixturesHash = computeFixturesHash();

  const outputs = [
    { path: 'dist/operon.json', hash: computeHash(join(projectRoot, 'dist/operon.json')) },
    { path: 'dist/operon.nf.json', hash: computeHash(join(projectRoot, 'dist/operon.nf.json')) },
    { path: 'dist/operon.nf.patch.json', hash: computeHash(join(projectRoot, 'dist/operon.nf.patch.json')) }
  ].filter(file => file.hash !== null);

  const autopilot = parseAutopilotOutput();
  const nfData = parseNFPatch();

  // Step 6: Create provenance
  console.log('6. Creating provenance record');

  const provenance = {
    ts: startTime,
    gitRev: tools.gitRev,
    tools: {
      node: tools.node,
      tsnode: tools.tsnode,
      pkg: tools.pkg
    },
    inputs: {
      fixturesHash
    },
    outputs: {
      files: outputs
    },
    rulesHash: tools.rulesHash,
    autopilot: {
      Lbest: autopilot.Lbest,
      routeLen: autopilot.routeLen
    },
    nf: {
      patchCount: nfData.patchCount,
      delta: nfData.delta
    }
  };

  // Ensure attest directory exists
  const attestDir = join(projectRoot, 'receipts/attest');
  mkdirSync(attestDir, { recursive: true });

  // Write provenance
  const provenancePath = join(attestDir, 'provenance.json');
  writeFileSync(provenancePath, JSON.stringify(provenance, null, 2));

  console.log(`✅ Provenance written to: ${provenancePath}`);
  console.log(`📊 Summary:`);
  console.log(`   - Git revision: ${tools.gitRev}`);
  console.log(`   - Output files: ${outputs.length}`);
  console.log(`   - NF patches: ${nfData.patchCount}`);
  console.log(`   - Autopilot L_best: ${autopilot.Lbest || 'N/A'}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Replay failed:', error);
    process.exit(1);
  });
}