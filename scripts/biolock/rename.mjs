#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Configuration
const SEARCH_DIRS = ['core', 'src', 'tools', 'scripts', 'mirrorbench', 'examples', 'filters', 'policies'];
const SKIP_PATHS = ['docs', 'seeds', 'receipts', 'observability', 'node_modules', '.git', 'dist', 'embassy'];
const SEARCH_PATTERN = /\bvirus\b/gi;
const REPLACEMENT = 'deconstructor';

// Stats
let filesScanned = 0;
let filesChanged = 0;
let totalReplacements = 0;
const changedFiles = [];

// Parse arguments
const isDryRun = process.argv.includes('--dry');

console.log(`🔄 ${isDryRun ? '[DRY RUN] ' : ''}BIOLOCK Token Rename: deconstructor → ${REPLACEMENT}`);
console.log('📂 Scanning directories:', SEARCH_DIRS.join(', '));
console.log('⏭️  Skipping:', SKIP_PATHS.join(', '));
console.log('');

function shouldSkip(filePath) {
  const relative = path.relative(projectRoot, filePath);
  return SKIP_PATHS.some(skip => relative.startsWith(skip));
}

function processFile(filePath) {
  if (shouldSkip(filePath)) return;

  filesScanned++;

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(SEARCH_PATTERN);

    if (!matches) return;

    // Replace intelligently based on context
    let newContent = content;
    let replacements = 0;

    // Handle different contexts
    newContent = newContent.replace(/\bvirus\b/gi, (match) => {
      const isCapitalized = match[0] === match[0].toUpperCase();
      const isAllCaps = match === match.toUpperCase();

      replacements++;

      if (isAllCaps) return REPLACEMENT.toUpperCase();
      if (isCapitalized) return REPLACEMENT.charAt(0).toUpperCase() + REPLACEMENT.slice(1);
      return REPLACEMENT;
    });

    // Also handle compound forms
    newContent = newContent.replace(/\bVirus(?=Deconstructor)/gi, 'Deconstructor');
    newContent = newContent.replace(/\bcreateVirusDeconstructor/g, 'createDeconstructor');

    if (replacements > 0) {
      filesChanged++;
      totalReplacements += replacements;
      changedFiles.push({
        path: path.relative(projectRoot, filePath),
        count: replacements
      });

      if (!isDryRun) {
        fs.writeFileSync(filePath, newContent);
      }

      console.log(`${isDryRun ? '[DRY] ' : ''}✏️  ${path.relative(projectRoot, filePath)}: ${replacements} replacement(s)`);
    }
  } catch (err) {
    if (err.code !== 'EISDIR') {
      console.error(`❌ Error processing ${filePath}:`, err.message);
    }
  }
}

function scanDirectory(dir) {
  const fullPath = path.join(projectRoot, dir);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Directory not found: ${dir}`);
    return;
  }

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);

      if (shouldSkip(entryPath)) continue;

      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.isFile()) {
        // Process JS, TS, MJS, JSON, MD, YAML files
        const ext = path.extname(entry.name).toLowerCase();
        if (['.js', '.ts', '.mjs', '.json', '.md', '.yaml', '.yml'].includes(ext)) {
          processFile(entryPath);
        }
      }
    }
  }

  walk(fullPath);
}

// Main execution
console.log('🔍 Starting scan...\n');

for (const dir of SEARCH_DIRS) {
  scanDirectory(dir);
}

// Also check root-level files
['PROVENANCE.md'].forEach(file => {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    processFile(filePath);
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log(`📊 ${isDryRun ? 'DRY RUN ' : ''}SUMMARY`);
console.log('='.repeat(60));
console.log(`Files scanned: ${filesScanned}`);
console.log(`Files ${isDryRun ? 'would be ' : ''}changed: ${filesChanged}`);
console.log(`Total replacements: ${totalReplacements}`);

if (changedFiles.length > 0) {
  console.log(`\n${isDryRun ? 'Would change' : 'Changed'} files:`);
  changedFiles.forEach(({ path, count }) => {
    console.log(`  - ${path} (${count} replacement${count > 1 ? 's' : ''})`);
  });
}

if (isDryRun && filesChanged > 0) {
  console.log('\n💡 Run without --dry flag to apply changes');
}

if (!isDryRun && filesChanged > 0) {
  console.log('\n✅ Changes applied successfully');
  console.log('🔒 Run biolock:lint to verify compliance');
}

process.exit(0);