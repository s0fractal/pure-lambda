#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Detects seed files in PR changes
 * Returns the first found seed.json or .cartridge file
 */

function detectPRSeed() {
  try {
    // Get changed files in this PR/commit
    let changedFiles;

    try {
      // Try to get PR diff (works in GitHub Actions)
      changedFiles = execSync('git diff --name-only HEAD^ HEAD', {
        encoding: 'utf8',
        timeout: 5000
      }).trim().split('\n').filter(f => f);
    } catch (error) {
      // Fallback: get all seed files
      console.warn('⚠️ Could not detect PR changes, scanning all seeds');
      changedFiles = execSync('find seeds -name "*.json" 2>/dev/null || echo', {
        encoding: 'utf8'
      }).trim().split('\n').filter(f => f);
    }

    console.log(`🔍 Checking ${changedFiles.length} changed files...`);

    // Filter for seed-related files
    const seedFiles = changedFiles.filter(file => {
      return file.match(/\.(json|cartridge)$/) &&
             (file.includes('seeds/') ||
              file.includes('contrib/') ||
              file.includes('receipts/attest/'));
    });

    if (seedFiles.length === 0) {
      console.log('📭 No seed files found in PR');
      return null;
    }

    // Prioritize .cartridge files, then .json files in seeds/
    const cartridgeFiles = seedFiles.filter(f => f.endsWith('.cartridge'));
    const jsonFiles = seedFiles.filter(f => f.endsWith('.json') && f.includes('seeds/'));

    let selectedFile;
    if (cartridgeFiles.length > 0) {
      selectedFile = cartridgeFiles[0];
      console.log(`📦 Found cartridge: ${selectedFile}`);
    } else if (jsonFiles.length > 0) {
      selectedFile = jsonFiles[0];
      console.log(`🌱 Found seed: ${selectedFile}`);
    } else {
      selectedFile = seedFiles[0];
      console.log(`📄 Found file: ${selectedFile}`);
    }

    // Verify file exists
    if (!fs.existsSync(selectedFile)) {
      console.error(`❌ File not found: ${selectedFile}`);
      return null;
    }

    const stats = fs.statSync(selectedFile);
    console.log(`✅ Selected: ${selectedFile} (${(stats.size / 1024).toFixed(1)} KB)`);

    return selectedFile;

  } catch (error) {
    console.error(`❌ Error detecting PR seed: ${error.message}`);
    return null;
  }
}

// CLI interface
function main() {
  const seedFile = detectPRSeed();

  if (seedFile) {
    // Output the file path for use in workflows
    console.log(seedFile);
    process.exit(0);
  } else {
    console.error('No seed files detected');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { detectPRSeed };