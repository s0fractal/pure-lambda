#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors


import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const projectRoot = resolve(process.cwd());
const operonJsonPath = resolve(projectRoot, 'dist/operon.json');
const operonNfJsonPath = resolve(projectRoot, 'dist/operon.nf.json');
const patchJsonPath = resolve(projectRoot, 'dist/operon.nf.patch.json');

function log(msg) {
  console.log(`[nf-smoke] ${msg}`);
}

function error(msg) {
  console.error(`[nf-smoke] ERROR: ${msg}`);
}

function runCommand(cmd, description) {
  try {
    log(`Running: ${description}`);
    const result = execSync(cmd, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    log(`✅ ${description} succeeded`);
    return result;
  } catch (err) {
    error(`${description} failed: ${err.message}`);
    throw err;
  }
}

async function main() {
  log('Starting NF smoke test');

  try {
    // Step 1: Ensure dist/operon.json exists
    if (!existsSync(operonJsonPath)) {
      log('dist/operon.json not found, running npm run ipld:car');
      runCommand('npm run ipld:car', 'Generate IPLD CAR file');

      if (!existsSync(operonJsonPath)) {
        throw new Error('dist/operon.json still not found after running ipld:car');
      }
    }
    log('✅ dist/operon.json exists');

    // Step 2: Run nf-dry to generate NF outputs
    runCommand('make nf-dry', 'NF dry run');

    // Step 3: Verify NF outputs exist
    if (!existsSync(operonNfJsonPath)) {
      throw new Error('dist/operon.nf.json was not created by nf-dry');
    }
    log('✅ dist/operon.nf.json created');

    if (!existsSync(patchJsonPath)) {
      throw new Error('dist/operon.nf.patch.json was not created by nf-dry');
    }
    log('✅ dist/operon.nf.patch.json created');

    // Step 4: Run autopilot on NF JSON and check Lbest
    const autopilotOutput = runCommand(
      `npx ts-node tools/autopilot.ts ${operonNfJsonPath} --k 5`,
      'Run autopilot on NF JSON'
    );

    // Parse autopilot output to extract Lbest
    let autopilotResult;
    try {
      autopilotResult = JSON.parse(autopilotOutput.trim());
    } catch (parseErr) {
      throw new Error(`Failed to parse autopilot output: ${parseErr.message}`);
    }

    const lbest = autopilotResult.topK?.[0]?.L || autopilotResult.Lbest;
    if (typeof lbest !== 'number') {
      throw new Error(`Invalid Lbest value: ${lbest}`);
    }

    log(`Lbest from NF autopilot: ${lbest}`);

    // Step 5: Get baseline Lbest from original operon.json
    const baselineOutput = runCommand(
      `npx ts-node tools/autopilot.ts ${operonJsonPath} --k 5`,
      'Run baseline autopilot'
    );

    let baselineResult;
    try {
      baselineResult = JSON.parse(baselineOutput.trim());
    } catch (parseErr) {
      throw new Error(`Failed to parse baseline autopilot output: ${parseErr.message}`);
    }

    const baselineLbest = baselineResult.topK?.[0]?.L || baselineResult.Lbest;
    if (typeof baselineLbest !== 'number') {
      throw new Error(`Invalid baseline Lbest value: ${baselineLbest}`);
    }

    log(`Baseline Lbest: ${baselineLbest}`);

    // Step 6: Check that NF Lbest <= baseline (NF should not make things worse)
    if (lbest > baselineLbest) {
      throw new Error(
        `NF rewrite degraded performance: Lbest ${lbest} > baseline ${baselineLbest}`
      );
    }

    log(`✅ NF performance check passed: ${lbest} <= ${baselineLbest}`);

    // Step 7: Validate patch file structure
    const patchData = JSON.parse(readFileSync(patchJsonPath, 'utf8'));
    if (!Array.isArray(patchData)) {
      throw new Error('Patch file should contain an array of patches');
    }

    for (const patch of patchData) {
      if (!patch.rule || !patch.nodes || !patch.delta) {
        throw new Error(`Invalid patch structure: ${JSON.stringify(patch)}`);
      }
      if (!Array.isArray(patch.nodes)) {
        throw new Error(`Patch nodes should be an array: ${JSON.stringify(patch.nodes)}`);
      }
      if (typeof patch.delta.hops !== 'number' ||
          typeof patch.delta.latency !== 'number' ||
          typeof patch.delta.memory !== 'number') {
        throw new Error(`Invalid patch delta structure: ${JSON.stringify(patch.delta)}`);
      }
    }

    log(`✅ Patch file validation passed: ${patchData.length} patches`);

    // Summary
    log('🎉 NF smoke test completed successfully');
    log(`   - Baseline Lbest: ${baselineLbest}`);
    log(`   - NF Lbest: ${lbest}`);
    log(`   - Improvement: ${((baselineLbest - lbest) / baselineLbest * 100).toFixed(2)}%`);
    log(`   - Patches applied: ${patchData.length}`);

    process.exit(0);

  } catch (err) {
    error(`Smoke test failed: ${err.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}