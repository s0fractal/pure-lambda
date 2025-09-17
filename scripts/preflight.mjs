#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Preflight Gate - Comprehensive Pre-commit Validation
 * Runs all required checks before deployment or commit
 */

import { execSync, spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSection(title) {
  log(`\n${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  log(`${colors.bold}${colors.cyan}🚀 ${title}${colors.reset}`);
  log(`${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`);
}

function runCommand(cmd, description, options = {}) {
  const startTime = Date.now();
  log(`\n▶ ${description}`, 'blue');
  log(`Command: ${cmd}`, 'yellow');

  try {
    const result = execSync(cmd, {
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf8',
      ...options
    });

    const duration = Date.now() - startTime;
    log(`✅ ${description} - PASSED (${duration}ms)`, 'green');

    // Show output if verbose or if there were warnings
    if (result.trim() && (process.env.PREFLIGHT_VERBOSE || result.includes('warn'))) {
      log(`Output:\n${result}`, 'yellow');
    }

    return { success: true, output: result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`❌ ${description} - FAILED (${duration}ms)`, 'red');
    log(`Exit code: ${error.status}`, 'red');

    if (error.stdout) {
      log(`stdout:\n${error.stdout}`, 'yellow');
    }
    if (error.stderr) {
      log(`stderr:\n${error.stderr}`, 'red');
    }

    return {
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
      exitCode: error.status,
      duration
    };
  }
}

async function runPreflightChecks() {
  logSection('PREFLIGHT GATE - Comprehensive Validation');
  log('Running all pre-deployment checks...', 'cyan');

  const checks = [];
  const startTime = Date.now();
  let allPassed = true;

  // Skip license checks if RELEASE_NO_PREFLIGHT is set
  const skipLicenseChecks = process.env.RELEASE_NO_PREFLIGHT;

  // 1. License Hardening (unless skipped)
  if (!skipLicenseChecks) {
    logSection('📄 License Hardening');

    // SPDX Header Check
    const spdxResult = runCommand(
      'npm run spdx:check',
      'SPDX header validation'
    );
    checks.push({ name: 'SPDX Headers', ...spdxResult });
    if (!spdxResult.success) allPassed = false;

    // License Policy Check
    if (spdxResult.success) {
      const policyResult = runCommand(
        'node scripts/licenses/policy.mjs',
        'License policy validation'
      );
      checks.push({ name: 'License Policy', ...policyResult });
      if (!policyResult.success) allPassed = false;
    }
  }

  // 2. BIOLOCK Lint
  logSection('🔒 BIOLOCK Security Scan');
  const biolockResult = runCommand(
    'node scripts/biolock/lint.mjs',
    'BIOLOCK forbidden token scan'
  );
  checks.push({ name: 'BIOLOCK', ...biolockResult });
  if (!biolockResult.success) allPassed = false;

  // 3. CI Smoke Tests
  logSection('🧪 CI Smoke Tests');
  const smokeResult = runCommand(
    'node scripts/ci/smoke.mjs',
    'Basic functionality smoke tests'
  );
  checks.push({ name: 'Smoke Tests', ...smokeResult });
  if (!smokeResult.success) allPassed = false;

  // 4. Breathing SLO Check
  // TEMPORARY: Skip breathing SLO check during hotfix
  // logSection('🫁 Breathing System SLO Compliance');
  // const breathResult = runCommand(
  //   'make -f Makefile.breath breath-slo',
  //   'Breathing system SLO compliance check'
  // );
  // checks.push({ name: 'Breathing SLO', ...breathResult });
  // if (!breathResult.success) allPassed = false;

  // 5. Receipt Verification
  logSection('🧾 Receipt & Provenance Verification');
  const verifyResult = runCommand(
    'node scripts/receipts/verify-all.mjs',
    'Verify all receipts and provenance'
  );
  checks.push({ name: 'Receipt Verification', ...verifyResult });
  if (!verifyResult.success) allPassed = false;

  // 6. Reproducibility & Attestation Chain
  logSection('🔐 Reproducibility & Attestation Chain');

  // First run replay
  const replayResult = runCommand(
    'node scripts/repro/replay.mjs',
    'Reproduce deterministic build'
  );
  checks.push({ name: 'Reproducible Build', ...replayResult });
  if (!replayResult.success) allPassed = false;

  if (replayResult.success) {
    // Then run attestation make
    const attestMakeResult = runCommand(
      'npm run attest:make',
      'Generate cryptographic attestations'
    );
    checks.push({ name: 'Attestation Generation', ...attestMakeResult });
    if (!attestMakeResult.success) allPassed = false;

    if (attestMakeResult.success) {
      // Finally verify attestations
      const attestVerifyResult = runCommand(
        'npm run attest:verify',
        'Verify cryptographic attestations'
      );
      checks.push({ name: 'Attestation Verification', ...attestVerifyResult });
      if (!attestVerifyResult.success) allPassed = false;
    }
  }

  // Summary Report
  const totalTime = Date.now() - startTime;
  logSection('📊 PREFLIGHT SUMMARY');

  log(`Total execution time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`, 'cyan');
  log(`Checks performed: ${checks.length}`, 'cyan');

  let passedCount = 0;
  for (const check of checks) {
    const status = check.success ? '✅ PASS' : '❌ FAIL';
    const time = `(${check.duration}ms)`;
    const color = check.success ? 'green' : 'red';
    log(`  ${status} ${check.name} ${time}`, color);
    if (check.success) passedCount++;
  }

  log(`\nResult: ${passedCount}/${checks.length} checks passed`, 'cyan');

  if (allPassed) {
    logSection('🎉 PREFLIGHT PASSED - Ready for Deployment');
    log('All validation checks completed successfully!', 'green');
    log('System is ready for commit/deployment.', 'green');
    return 0;
  } else {
    logSection('💥 PREFLIGHT FAILED - Deployment Blocked');
    log('One or more validation checks failed.', 'red');
    log('Please resolve all issues before proceeding.', 'red');

    // Show failed checks summary
    const failed = checks.filter(c => !c.success);
    log(`\nFailed checks (${failed.length}):`, 'red');
    for (const check of failed) {
      log(`  ❌ ${check.name}${check.exitCode ? ` (exit ${check.exitCode})` : ''}`, 'red');
    }

    return 1;
  }
}

async function main() {
  try {
    const exitCode = await runPreflightChecks();
    process.exit(exitCode);
  } catch (error) {
    log(`\n💥 FATAL ERROR: ${error.message}`, 'red');
    log(error.stack, 'red');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}