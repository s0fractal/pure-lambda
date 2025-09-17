#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * B2 Smoke Test CI
 * Runs basic commands and verifies output files exist
 */

import { execSync } from 'child_process';
import { existsSync, statSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function execCommand(cmd, description) {
  log(`▶ ${description}`, 'blue');
  try {
    const output = execSync(cmd, {
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf8'
    });
    log(`✅ ${description} - OK`, 'green');
    return output;
  } catch (error) {
    log(`❌ ${description} - FAILED`, 'red');
    log(`Command: ${cmd}`, 'yellow');
    log(`Error: ${error.message}`, 'red');
    if (error.stdout) log(`stdout: ${error.stdout}`, 'yellow');
    if (error.stderr) log(`stderr: ${error.stderr}`, 'yellow');
    throw error;
  }
}

function verifyFile(filePath, description) {
  log(`▶ Checking ${description}`, 'blue');
  const fullPath = join(projectRoot, filePath);

  if (!existsSync(fullPath)) {
    log(`❌ ${description} - File not found: ${fullPath}`, 'red');
    throw new Error(`File not found: ${filePath}`);
  }

  const stats = statSync(fullPath);
  if (stats.size === 0) {
    log(`❌ ${description} - File is empty: ${fullPath}`, 'red');
    throw new Error(`File is empty: ${filePath}`);
  }

  log(`✅ ${description} - OK (${stats.size} bytes)`, 'green');
  return stats.size;
}

function verifyJSON(filePath, description) {
  const size = verifyFile(filePath, description);
  const fullPath = join(projectRoot, filePath);

  try {
    const content = readFileSync(fullPath, 'utf8');
    JSON.parse(content);
    log(`✅ ${description} - Valid JSON`, 'green');
  } catch (error) {
    log(`❌ ${description} - Invalid JSON: ${error.message}`, 'red');
    throw error;
  }

  return size;
}

async function main() {
  log('\n🧪 B2 Smoke Test Suite', 'blue');
  log('='.repeat(50), 'blue');

  let exitCode = 0;

  try {
    // 1. Run gid:file command
    execCommand('npm run gid:file fixtures/tiles/sample.yaml', 'GID generation for sample tile');

    // 2. Run ipld:car command
    execCommand('npm run ipld:car', 'IPLD CAR export');

    // 3. Verify dist/operon.car exists and has size > 0
    verifyFile('dist/operon.car', 'CAR file');

    // 4. Verify dist/operon.json exists and is valid JSON
    verifyJSON('dist/operon.json', 'JSON DAG file');

    log('\n🎉 All smoke tests passed!', 'green');

  } catch (error) {
    log(`\n💥 Smoke test failed: ${error.message}`, 'red');
    exitCode = 1;
  }

  log('='.repeat(50), 'blue');
  process.exit(exitCode);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}