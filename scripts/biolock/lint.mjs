#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * BIOLOCK Lint - Forbidden Token Scanner
 * Blocks dangerous biological research terminology in code
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');

// Forbidden biological research tokens
const FORBIDDEN_TOKENS = [
  'pathogen',
  'gain-of-function',
  'weaponize',
  'bioweapon'
];

// Allowed in specific contexts
const ALLOWLIST_CONFIG = {
  'docs/TRUST-MODEL.md': {
    section: 'Threat model',
    reason: 'Security documentation exception'
  }
};

// Colors for output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  reset: '\x1b[0m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function isInThreatModelSection(content, lineNumber) {
  const lines = content.split('\n');
  let inThreatModel = false;

  for (let i = 0; i < lineNumber; i++) {
    const line = lines[i];
    if (line.includes('## Threat Model') || line.includes('## Threat model')) {
      inThreatModel = true;
    } else if (line.startsWith('## ') && inThreatModel) {
      inThreatModel = false;
    }
  }

  return inThreatModel;
}

function scanContent(content, filePath) {
  const violations = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    for (const token of FORBIDDEN_TOKENS) {
      const regex = new RegExp(`\\b${token}\\b`, 'gi');
      if (regex.test(line)) {
        // Check if this is an allowed exception
        const allowedFile = ALLOWLIST_CONFIG[filePath];
        if (allowedFile && isInThreatModelSection(content, lineNumber)) {
          log(`⚠️  ALLOWED: ${token} found in ${filePath}:${lineNumber} (${allowedFile.reason})`, 'yellow');
          continue;
        }

        violations.push({
          file: filePath,
          line: lineNumber,
          token: token,
          context: line.trim()
        });
      }
    }
  }

  return violations;
}

function scanFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const relativePath = relative(projectRoot, filePath);
    return scanContent(content, relativePath);
  } catch (error) {
    log(`⚠️  Could not read ${filePath}: ${error.message}`, 'yellow');
    return [];
  }
}

function shouldScanFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  const scanExtensions = ['.js', '.mjs', '.ts', '.tsx', '.json', '.md', '.yaml', '.yml', '.txt'];

  // Skip node_modules and other common ignore patterns
  if (filePath.includes('node_modules/') ||
      filePath.includes('.git/') ||
      filePath.includes('dist/') ||
      filePath.includes('scripts/biolock/') ||  // Skip biolock scripts themselves
      filePath.includes('scripts/bio_lock_scan') ||  // Skip old biolock scripts
      filePath.includes('scripts/biolock-guard') ||  // Skip guard script
      filePath.includes('policies/bio.yaml') ||  // Skip bio policies
      filePath.includes('filters/registry.md') ||  // Skip filters
      filePath.endsWith('.lock') ||
      filePath.endsWith('.log')) {
    return false;
  }

  return scanExtensions.includes(ext) || !ext; // Include files without extensions
}

function walkDirectory(dirPath, files = []) {
  if (!existsSync(dirPath)) return files;

  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walkDirectory(fullPath, files);
    } else if (stat.isFile() && shouldScanFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', {
      cwd: projectRoot,
      encoding: 'utf8'
    }).trim();

    if (!output) return [];

    return output.split('\n')
      .map(file => join(projectRoot, file))
      .filter(file => existsSync(file) && shouldScanFile(file));
  } catch (error) {
    // If not in git repo or no staged files, return empty
    return [];
  }
}

function main() {
  log('🔒 BIOLOCK Lint - Scanning for forbidden biological research tokens...', 'green');
  log(`Forbidden tokens: ${FORBIDDEN_TOKENS.join(', ')}`, 'yellow');

  let filesToScan = [];

  // Check if we have staged files (git diff mode)
  const stagedFiles = getStagedFiles();
  if (stagedFiles.length > 0) {
    log(`📄 Scanning ${stagedFiles.length} staged files`, 'green');
    filesToScan = stagedFiles;
  } else {
    // Full repository scan
    log('📂 No staged files, scanning entire repository', 'green');
    filesToScan = walkDirectory(projectRoot);
  }

  if (filesToScan.length === 0) {
    log('✅ No files to scan', 'green');
    return;
  }

  let totalViolations = 0;

  for (const filePath of filesToScan) {
    const violations = scanFile(filePath);

    if (violations.length > 0) {
      totalViolations += violations.length;

      for (const violation of violations) {
        log(`❌ BLOCKED: "${violation.token}" found in ${violation.file}:${violation.line}`, 'red');
        log(`   Context: ${violation.context}`, 'red');
      }
    }
  }

  if (totalViolations > 0) {
    log(`\n💀 BIOLOCK VIOLATION: ${totalViolations} forbidden token(s) detected`, 'red');
    log('❌ Biological research terms are prohibited in this codebase', 'red');
    log('🔒 Please remove or relocate to approved documentation sections', 'red');
    process.exit(2);
  } else {
    log('\n✅ BIOLOCK PASSED: No forbidden tokens detected', 'green');
    log(`📊 Scanned ${filesToScan.length} files`, 'green');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}