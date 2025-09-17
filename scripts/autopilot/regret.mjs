#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors


import * as fs from 'fs';
import * as path from 'path';

/**
 * Regret computation: regret = Lsel - L*
 * Where Lsel is the selected route's L value (topK[0])
 * And L* is the optimal L value (minimum L in topK)
 */
function computeRegret(topK) {
  if (!topK || topK.length === 0) {
    return 0;
  }

  const Lsel = topK[0].L; // Selected route (index 0)
  const Lstar = Math.min(...topK.map(route => route.L)); // Optimal L*

  return Lsel - Lstar;
}

/**
 * Read autopilot JSON output and compute regret
 */
function processAutopilotOutput(autopilotFile) {
  try {
    const content = fs.readFileSync(autopilotFile, 'utf-8');
    const data = JSON.parse(content);

    const regret = computeRegret(data.topK);

    return {
      bestRoute: data.bestRoute,
      Lbest: data.Lbest,
      regret,
      routeCount: data.topK.length,
      Lstar: data.topK.length > 0 ? Math.min(...data.topK.map(r => r.L)) : 0
    };
  } catch (error) {
    throw new Error(`Failed to process autopilot output: ${error.message}`);
  }
}

/**
 * Append regret data to branchial.csv if it exists
 */
function updateBranchialCSV(regretData) {
  const csvPath = 'observability/branchial.csv';

  try {
    // Check if CSV exists
    if (!fs.existsSync(csvPath)) {
      console.log(`CSV file ${csvPath} does not exist, creating with header`);
      fs.writeFileSync(csvPath, 'timestamp,regret,Lbest,Lstar,routeCount\n');
    }

    // Read existing CSV to check if regret column exists
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    const header = lines[0];

    // Add regret column if it doesn't exist
    let newHeader = header;
    if (!header.includes('regret')) {
      newHeader = header + ',regret';

      // Update existing rows with empty regret values
      const updatedLines = [newHeader];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          updatedLines.push(lines[i] + ',');
        }
      }
      fs.writeFileSync(csvPath, updatedLines.join('\n') + '\n');
    }

    // Append new row with regret data in proper CSV format
    const epoch = Math.floor(Date.now() / 1000) % 100; // Simple epoch counter
    const newRow = `${epoch},${regretData.Lbest},${regretData.regret},${regretData.routeCount},${regretData.Lstar},${regretData.Lbest + regretData.regret},${regretData.regret}`;

    fs.appendFileSync(csvPath, newRow + '\n');
    console.log(`Updated ${csvPath} with regret data`);

  } catch (error) {
    console.warn(`Could not update ${csvPath}: ${error.message}`);
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node regret.mjs <autopilot-json-file>');
    process.exit(1);
  }

  const autopilotFile = args[0];

  try {
    const regretData = processAutopilotOutput(autopilotFile);

    // Print regret summary
    console.log('Regret Analysis:');
    console.log(`  Selected Route L: ${regretData.Lbest}`);
    console.log(`  Optimal L*: ${regretData.Lstar}`);
    console.log(`  Regret: ${regretData.regret}`);
    console.log(`  Route Count: ${regretData.routeCount}`);
    console.log(`  Best Route: ${regretData.bestRoute.join(' -> ')}`);

    // Update CSV if available
    updateBranchialCSV(regretData);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}