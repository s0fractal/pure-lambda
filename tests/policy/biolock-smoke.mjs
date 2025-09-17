#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Create test seed with prohibited content
function createTestSeed() {
  const testSeed = {
    pl_seed: "PL-TEST-BIOLOCK",
    version: 1,
    name: "test-biolock-violation",
    description: "Test seed containing lab-protocol for BIOLOCK testing",
    nodes: {
      node1: {
        op: "PROCESS",
        desc: "This contains lab-protocol instructions",
        metadata: {
          warning: "pathogen handling procedure"
        }
      }
    }
  };

  const testPath = path.join(projectRoot, 'tmp', 'test-biolock.json');

  // Ensure tmp directory exists
  const tmpDir = path.join(projectRoot, 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  fs.writeFileSync(testPath, JSON.stringify(testSeed, null, 2));
  return testPath;
}

// Run BIOLOCK enforcement test
async function runBiolockTest() {
  console.log('🧪 BIOLOCK Policy Smoke Test');
  console.log('=' .repeat(40));

  try {
    // Test 1: Create seed with violations
    console.log('\n📝 Test 1: Seed with policy violations');
    const testFile = createTestSeed();
    console.log(`   Created test file: ${testFile}`);

    // Run enforcement
    let exitCode = 0;
    let output = '';

    try {
      output = execSync(
        `node scripts/policy/enforce.mjs "${testFile}"`,
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

    // Verify violations detected
    if (exitCode !== 2) {
      throw new Error(`Expected exit code 2, got ${exitCode}`);
    }

    if (!result.hasViolations) {
      throw new Error('Expected violations to be detected');
    }

    const violations = result.results[0].violations;
    const foundTokens = violations.map(v => v.token);

    console.log(`   ✅ Exit code: ${exitCode} (expected: 2)`);
    console.log(`   ✅ Violations detected: ${foundTokens.join(', ')}`);
    console.log(`   ✅ Quarantine required: ${result.results[0].actions.quarantine}`);

    // Test 2: Clean seed should pass
    console.log('\n📝 Test 2: Clean seed (no violations)');

    const cleanSeed = {
      pl_seed: "PL-TEST-CLEAN",
      version: 1,
      name: "test-clean",
      description: "Clean computational seed",
      nodes: {
        node1: {
          op: "COMPUTE",
          desc: "Safe mathematical operation"
        }
      }
    };

    const cleanPath = path.join(projectRoot, 'tmp', 'test-clean.json');
    fs.writeFileSync(cleanPath, JSON.stringify(cleanSeed, null, 2));

    try {
      output = execSync(
        `node scripts/policy/enforce.mjs "${cleanPath}"`,
        {
          cwd: projectRoot,
          encoding: 'utf8'
        }
      );
      exitCode = 0;
    } catch (error) {
      exitCode = error.status;
    }

    if (exitCode !== 0) {
      throw new Error(`Clean seed failed: exit code ${exitCode}`);
    }

    const cleanResult = JSON.parse(output);
    if (cleanResult.hasViolations) {
      throw new Error('Clean seed incorrectly flagged');
    }

    console.log(`   ✅ Exit code: ${exitCode} (expected: 0)`);
    console.log(`   ✅ No violations detected`);

    // Test 3: Multiple violations
    console.log('\n📝 Test 3: Multiple violations');

    const multiViolationSeed = {
      name: "multi-violation",
      description: "Contains bioweapon and viral-vector terms",
      process: "gain-of-function research"
    };

    const multiPath = path.join(projectRoot, 'tmp', 'test-multi.json');
    fs.writeFileSync(multiPath, JSON.stringify(multiViolationSeed, null, 2));

    try {
      output = execSync(
        `node scripts/policy/enforce.mjs "${multiPath}"`,
        {
          cwd: projectRoot,
          encoding: 'utf8'
        }
      );
      exitCode = 0;
    } catch (error) {
      exitCode = error.status;
      output = error.stdout;
    }

    const multiResult = JSON.parse(output);
    const multiViolations = multiResult.results[0].violations;

    if (multiViolations.length < 3) {
      throw new Error(`Expected 3+ violations, found ${multiViolations.length}`);
    }

    console.log(`   ✅ Detected ${multiViolations.length} violations`);
    console.log(`   ✅ Tokens: ${multiViolations.map(v => v.token).join(', ')}`);

    // Cleanup
    console.log('\n🧹 Cleaning up test files...');
    fs.unlinkSync(testFile);
    fs.unlinkSync(cleanPath);
    fs.unlinkSync(multiPath);

    // Success
    console.log('\n✅ BIOLOCK Smoke Test PASSED');
    console.log('   - Policy correctly blocks dangerous content');
    console.log('   - Clean seeds pass through');
    console.log('   - Multiple violations detected');
    console.log('   - Exit codes correct (2 for violations, 0 for clean)');

    return true;

  } catch (error) {
    console.error('\n❌ BIOLOCK Smoke Test FAILED');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  runBiolockTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { runBiolockTest };