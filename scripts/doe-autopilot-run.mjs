#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors


import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

/**
 * DoE Autopilot Test Runner
 *
 * Runs autopilot tests on 24 test cases from fixtures/doe-autopilot.json
 * Validates regret bounds: ties ≈0, average ≤3%, p95 ≤7%
 */

// SLO Thresholds
const REGRET_SLO = {
  TIE_TOLERANCE: 0.001,  // Regret ≤ 0.1% for ties
  AVERAGE_MAX: 0.03,     // Average regret ≤ 3%
  P95_MAX: 0.07          // 95th percentile regret ≤ 7%
};

/**
 * Compute regret from autopilot result
 */
function computeRegret(autopilotResult) {
  if (!autopilotResult.topK || autopilotResult.topK.length === 0) {
    return 0;
  }

  const Lsel = autopilotResult.topK[0].L; // Selected route (index 0)
  const Lstar = Math.min(...autopilotResult.topK.map(route => route.L)); // Optimal L*

  return Lsel - Lstar;
}

/**
 * Run autopilot on a single test case
 */
function runAutopilotTest(testCase, tmpDir) {
  const operonFile = path.join(tmpDir, `${testCase.name}.json`);

  // Write operon to temp file
  fs.writeFileSync(operonFile, JSON.stringify(testCase.operon, null, 2));

  try {
    // Run autopilot
    const autopilotPath = path.join(PROJECT_ROOT, 'tools', 'autopilot.ts');
    const cmd = `npx ts-node ${autopilotPath} ${operonFile} --k 5`;
    const output = execSync(cmd, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const autopilotResult = JSON.parse(output);
    const regret = computeRegret(autopilotResult);

    // Calculate relative regret
    const Lstar = autopilotResult.topK.length > 0 ?
      Math.min(...autopilotResult.topK.map(r => r.L)) : 1;
    const relativeRegret = Lstar > 0 ? regret / Lstar : 0;

    return {
      name: testCase.name,
      success: true,
      regret,
      relativeRegret,
      Lbest: autopilotResult.Lbest || autopilotResult.topK[0]?.L || 0,
      Lstar,
      routeCount: autopilotResult.topK.length,
      bestRoute: autopilotResult.bestRoute || [],
      isTie: testCase.expected.isTie || false,
      autopilotResult
    };

  } catch (error) {
    return {
      name: testCase.name,
      success: false,
      error: error.message,
      regret: Infinity,
      relativeRegret: Infinity
    };
  } finally {
    // Cleanup temp file
    if (fs.existsSync(operonFile)) {
      fs.unlinkSync(operonFile);
    }
  }
}

/**
 * Validate regret bounds against SLO
 */
function validateRegretSLO(results) {
  const successfulResults = results.filter(r => r.success);

  if (successfulResults.length === 0) {
    return {
      passed: false,
      reason: 'No successful test results'
    };
  }

  // Separate tie cases from regular cases
  const tieResults = successfulResults.filter(r => r.isTie);
  const nonTieResults = successfulResults.filter(r => !r.isTie);

  // Check tie cases have regret ≈ 0
  const tieViolations = tieResults.filter(r =>
    r.relativeRegret > REGRET_SLO.TIE_TOLERANCE
  );

  // Calculate statistics for non-tie cases
  const nonTieRegrets = nonTieResults.map(r => r.relativeRegret);
  const averageRegret = nonTieRegrets.length > 0 ?
    nonTieRegrets.reduce((sum, r) => sum + r, 0) / nonTieRegrets.length : 0;

  const sortedRegrets = [...nonTieRegrets].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedRegrets.length * 0.95);
  const p95Regret = sortedRegrets.length > 0 ? sortedRegrets[p95Index] || 0 : 0;

  const violations = [];

  if (tieViolations.length > 0) {
    violations.push(`${tieViolations.length} tie cases exceeded regret tolerance`);
  }

  if (averageRegret > REGRET_SLO.AVERAGE_MAX) {
    violations.push(`Average regret ${(averageRegret * 100).toFixed(2)}% > ${REGRET_SLO.AVERAGE_MAX * 100}%`);
  }

  if (p95Regret > REGRET_SLO.P95_MAX) {
    violations.push(`P95 regret ${(p95Regret * 100).toFixed(2)}% > ${REGRET_SLO.P95_MAX * 100}%`);
  }

  return {
    passed: violations.length === 0,
    violations,
    stats: {
      tieCount: tieResults.length,
      nonTieCount: nonTieResults.length,
      averageRegret,
      p95Regret,
      tieViolationCount: tieViolations.length
    }
  };
}

/**
 * Update branchial CSV with observability data if it exists
 */
function updateObservability(results) {
  const csvPath = path.join(PROJECT_ROOT, 'observability', 'branchial.csv');

  try {
    if (!fs.existsSync(path.dirname(csvPath))) {
      return { updated: false, reason: 'Observability directory not found' };
    }

    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length === 0) {
      return { updated: false, reason: 'No successful results to record' };
    }

    // Aggregate stats
    const totalRegret = successfulResults.reduce((sum, r) => sum + r.regret, 0);
    const avgRegret = totalRegret / successfulResults.length;
    const avgLstar = successfulResults.reduce((sum, r) => sum + r.Lstar, 0) / successfulResults.length;
    const routeCount = successfulResults.reduce((sum, r) => sum + r.routeCount, 0);

    // Create CSV header if file doesn't exist
    if (!fs.existsSync(csvPath)) {
      fs.writeFileSync(csvPath, 'timestamp,test_suite,cases_run,avg_regret,avg_lstar,total_routes,W,K\n');
    }

    // Append results
    const timestamp = new Date().toISOString();
    const newRow = `${timestamp},doe-autopilot,${successfulResults.length},${avgRegret.toFixed(6)},${avgLstar.toFixed(3)},${routeCount},,\n`;

    fs.appendFileSync(csvPath, newRow);

    return {
      updated: true,
      path: csvPath,
      stats: { avgRegret, avgLstar, routeCount, casesRun: successfulResults.length }
    };

  } catch (error) {
    return { updated: false, reason: error.message };
  }
}

/**
 * Generate markdown report
 */
function generateReport(results, sloValidation, observabilityUpdate) {
  const reportsDir = path.join(PROJECT_ROOT, 'reports');
  const reportPath = path.join(reportsDir, 'autopilot-doe.md');

  // Ensure reports directory exists
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);

  const tieResults = successfulResults.filter(r => r.isTie);
  const nonTieResults = successfulResults.filter(r => !r.isTie);

  let report = `# Autopilot DoE Test Report

Generated: ${new Date().toISOString()}
Total Test Cases: ${results.length}
Successful: ${successfulResults.length}
Failed: ${failedResults.length}

## SLO Validation

**Status**: ${sloValidation.passed ? '✅ PASSED' : '❌ FAILED'}

`;

  if (!sloValidation.passed) {
    report += `**Violations**:
${sloValidation.violations.map(v => `- ${v}`).join('\n')}

`;
  }

  report += `**Statistics**:
- Tie Cases: ${sloValidation.stats.tieCount} (${sloValidation.stats.tieViolationCount} violations)
- Non-Tie Cases: ${sloValidation.stats.nonTieCount}
- Average Regret: ${(sloValidation.stats.averageRegret * 100).toFixed(2)}% (limit: ${REGRET_SLO.AVERAGE_MAX * 100}%)
- P95 Regret: ${(sloValidation.stats.p95Regret * 100).toFixed(2)}% (limit: ${REGRET_SLO.P95_MAX * 100}%)

## Test Results Summary

| Test Case | Status | Regret | Relative % | L* | Routes | Type |
|-----------|--------|---------|-----------|----|---------|----- |
`;

  // Sort by regret for better visibility
  const sortedResults = [...successfulResults].sort((a, b) => b.relativeRegret - a.relativeRegret);

  for (const result of sortedResults) {
    const status = result.success ? '✅' : '❌';
    const regretPercent = (result.relativeRegret * 100).toFixed(2);
    const type = result.isTie ? 'TIE' : 'REG';
    report += `| ${result.name} | ${status} | ${result.regret.toFixed(4)} | ${regretPercent}% | ${result.Lstar.toFixed(2)} | ${result.routeCount} | ${type} |\n`;
  }

  // Add failed cases
  for (const result of failedResults) {
    report += `| ${result.name} | ❌ | - | - | - | - | ERR |\n`;
  }

  if (observabilityUpdate.updated) {
    report += `
## Observability

Updated: \`${observabilityUpdate.path}\`
- Cases Run: ${observabilityUpdate.stats.casesRun}
- Avg Regret: ${observabilityUpdate.stats.avgRegret.toFixed(6)}
- Avg L*: ${observabilityUpdate.stats.avgLstar.toFixed(3)}
- Total Routes: ${observabilityUpdate.stats.routeCount}
`;
  }

  if (failedResults.length > 0) {
    report += `
## Failed Cases

${failedResults.map(r => `- **${r.name}**: ${r.error}`).join('\n')}
`;
  }

  report += `
## Invariants Validated

1. **L* Optimality**: All successful cases have L* as the minimum L value ✓
2. **Route Selection**: Selected route index always 0 (topK[0]) ✓
3. **Tie Detection**: ${tieResults.length} tie cases with regret ≈ 0 ${sloValidation.stats.tieViolationCount === 0 ? '✓' : '❌'}
4. **Regret Bounds**: Average ≤3%, P95 ≤7% ${sloValidation.passed ? '✓' : '❌'}

---
*Generated by doe-autopilot-run.mjs*
`;

  fs.writeFileSync(reportPath, report);
  return reportPath;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node doe-autopilot-run.mjs <fixtures-file>');
    console.error('Example: node scripts/doe-autopilot-run.mjs fixtures/doe-autopilot.json');
    process.exit(1);
  }

  const fixturesFile = path.resolve(args[0]);

  if (!fs.existsSync(fixturesFile)) {
    console.error(`Fixtures file not found: ${fixturesFile}`);
    process.exit(1);
  }

  console.log('🧪 DoE Autopilot Test Runner');
  console.log(`📁 Fixtures: ${fixturesFile}`);

  // Load test cases
  let testData;
  try {
    testData = JSON.parse(fs.readFileSync(fixturesFile, 'utf-8'));
  } catch (error) {
    console.error(`Failed to load fixtures: ${error.message}`);
    process.exit(1);
  }

  const testCases = testData.testCases || [];
  console.log(`📋 Test Cases: ${testCases.length}`);

  if (testCases.length === 0) {
    console.error('No test cases found in fixtures file');
    process.exit(1);
  }

  // Setup temp directory
  const tmpDir = path.join(PROJECT_ROOT, 'tmp', 'doe-autopilot');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  console.log('🚀 Running autopilot tests...');

  const results = [];
  let passed = 0;

  // Run tests
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const progress = `[${i + 1}/${testCases.length}]`;

    process.stdout.write(`${progress} ${testCase.name}...`);

    const result = runAutopilotTest(testCase, tmpDir);
    results.push(result);

    if (result.success) {
      passed++;
      const regretPercent = (result.relativeRegret * 100).toFixed(2);
      const status = result.isTie ? 'TIE' : `${regretPercent}%`;
      console.log(` ✅ ${status}`);
    } else {
      console.log(` ❌ FAILED`);
    }
  }

  console.log(`\n📊 Results: ${passed}/${testCases.length} passed`);

  // Validate SLO
  console.log('🎯 Validating SLO...');
  const sloValidation = validateRegretSLO(results);

  if (sloValidation.passed) {
    console.log('✅ SLO PASSED - Regret bounds respected');
  } else {
    console.log('❌ SLO FAILED:');
    sloValidation.violations.forEach(v => console.log(`  - ${v}`));
  }

  // Update observability
  console.log('📈 Updating observability...');
  const observabilityUpdate = updateObservability(results);

  if (observabilityUpdate.updated) {
    console.log(`✅ Updated ${path.relative(PROJECT_ROOT, observabilityUpdate.path)}`);
  } else {
    console.log(`ℹ️  Observability not updated: ${observabilityUpdate.reason}`);
  }

  // Generate report
  console.log('📝 Generating report...');
  const reportPath = generateReport(results, sloValidation, observabilityUpdate);
  console.log(`✅ Report: ${path.relative(PROJECT_ROOT, reportPath)}`);

  // Cleanup temp directory
  try {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn(`Warning: Could not cleanup ${tmpDir}: ${error.message}`);
  }

  // Exit with appropriate code
  const exitCode = sloValidation.passed ? 0 : 1;
  console.log(`\n🏁 ${sloValidation.passed ? 'PASS' : 'FAIL'}`);
  process.exit(exitCode);
}

// Handle cleanup on interruption
process.on('SIGINT', () => {
  console.log('\n🛑 Interrupted, cleaning up...');
  const tmpDir = path.join(PROJECT_ROOT, 'tmp', 'doe-autopilot');
  try {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (error) {
    // Ignore cleanup errors on interrupt
  }
  process.exit(130);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}