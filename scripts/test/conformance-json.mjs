#!/usr/bin/env node

// Generate conformance test results in JSON format

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const config = {
  outputFile: 'dist/fed/conformance.json'
};

function runConformanceTests() {
  try {
    // Run the actual conformance tests
    const output = execSync('node tests/conformance-run.mjs 2>&1', { encoding: 'utf8' });

    // Parse the results from the output
    const lines = output.split('\n');
    const summaryLine = lines.find(l => l.includes('tests passed'));

    if (summaryLine) {
      // Extract numbers from "X/Y tests passed (Z%)"
      const match = summaryLine.match(/(\d+)\/(\d+) tests passed/);
      if (match) {
        const passed = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        const ratio = total > 0 ? passed / total : 0;

        return {
          total,
          passed,
          failed: total - passed,
          ratio,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Fallback if parsing fails
    return {
      total: 0,
      passed: 0,
      failed: 0,
      ratio: 0,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    // Tests failed or error occurred - try to extract results anyway
    const output = error.stdout || '';
    const lines = output.split('\n');
    const summaryLine = lines.find(l => l.includes('tests passed'));

    if (summaryLine) {
      const match = summaryLine.match(/(\d+)\/(\d+) tests passed/);
      if (match) {
        const passed = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        const ratio = total > 0 ? passed / total : 0;

        return {
          total,
          passed,
          failed: total - passed,
          ratio,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Complete failure
    return {
      total: 75, // Known total from previous runs
      passed: 0,
      failed: 75,
      ratio: 0,
      timestamp: new Date().toISOString()
    };
  }
}

// Run tests and save results
const results = runConformanceTests();
writeFileSync(config.outputFile, JSON.stringify(results, null, 2));
console.log(`Conformance results written to ${config.outputFile}`);
console.log(`Passed: ${results.passed}/${results.total} (${(results.ratio * 100).toFixed(1)}%)`);