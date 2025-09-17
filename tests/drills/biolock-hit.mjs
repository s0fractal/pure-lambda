#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * BIOLOCK Hit Drill - Tests policy enforcement against malicious content
 */
async function runBiolockDrill() {
  console.log('🔴 Red Team Drill: BIOLOCK Policy Test');
  console.log('=' .repeat(40));
  console.log('Testing policy enforcement against prohibited content...\n');

  // Create malicious seed
  const maliciousSeed = {
    pl_seed: "PL-MALICIOUS-TEST",
    version: 1,
    name: "malicious-test",
    description: "This seed contains viral-vector and gain-of-function research",
    process: {
      step1: "Extract pathogen samples",
      step2: "Apply bioweapon protocol",
      step3: "Implement lab-protocol for amplification"
    },
    metadata: {
      danger: "Contains biosafety-level 4 materials"
    }
  };

  const testPath = path.join(projectRoot, 'tmp', 'drill-biolock.json');

  // Ensure tmp directory exists
  const tmpDir = path.join(projectRoot, 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // Write malicious seed
  fs.writeFileSync(testPath, JSON.stringify(maliciousSeed, null, 2));
  console.log(`📝 Created malicious seed: ${testPath}`);

  // Run BIOLOCK enforcement
  console.log('\n🔒 Running BIOLOCK policy check...');

  let exitCode = 0;
  let output = '';

  try {
    output = execSync(
      `node scripts/policy/enforce.mjs "${testPath}"`,
      {
        cwd: projectRoot,
        encoding: 'utf8'
      }
    );
  } catch (error) {
    exitCode = error.status;
    output = error.stdout;
  }

  const result = JSON.parse(output);

  console.log('\n📊 BIOLOCK Result:');
  console.log(JSON.stringify(result, null, 2));

  // Cleanup
  console.log('\n🧹 Cleaning up test file...');
  fs.unlinkSync(testPath);

  // Verify drill success
  if (exitCode === 2 && result.hasViolations) {
    const violations = result.results[0].violations;
    const expectedTokens = ['viral-vector', 'gain-of-function', 'pathogen', 'bioweapon', 'lab-protocol'];
    const foundTokens = violations.map(v => v.token);

    const allFound = expectedTokens.every(token => foundTokens.includes(token));

    if (allFound) {
      console.log('\n✅ Drill PASSED: BIOLOCK successfully blocked all prohibited content');
      console.log(`   Detected tokens: ${foundTokens.join(', ')}`);
      console.log(`   Quarantine required: ${result.results[0].actions.quarantine}`);
      return true;
    } else {
      console.log('\n⚠️ Drill PARTIAL: Some tokens not detected');
      console.log(`   Expected: ${expectedTokens.join(', ')}`);
      console.log(`   Found: ${foundTokens.join(', ')}`);
      return false;
    }
  } else {
    console.log('\n❌ Drill FAILED: BIOLOCK did not block malicious content');
    return false;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  runBiolockDrill()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Drill error:', error.message);
      process.exit(1);
    });
}

export { runBiolockDrill };