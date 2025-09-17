#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * SPDX License Scanner - Add/validate SPDX headers in source files
 * Deterministic ordering, minimal tooling approach
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = new URL('.', import.meta.url).pathname;
const projectRoot = join(__dirname, '..', '..');

// File extensions and their comment styles
const COMMENT_STYLES = {
  '.js': { prefix: '// ', suffix: '' },
  '.mjs': { prefix: '// ', suffix: '' },
  '.ts': { prefix: '// ', suffix: '' },
  '.tsx': { prefix: '// ', suffix: '' },
  '.jsx': { prefix: '// ', suffix: '' },
  '.md': { prefix: '<!-- ', suffix: ' -->' },
  '.html': { prefix: '<!-- ', suffix: ' -->' },
  '.xml': { prefix: '<!-- ', suffix: ' -->' },
  '.yml': { prefix: '# ', suffix: '' },
  '.yaml': { prefix: '# ', suffix: '' },
  '.json': null, // Skip JSON files - no comment support
  '.sh': { prefix: '# ', suffix: '' },
  '.py': { prefix: '# ', suffix: '' },
  '.rs': { prefix: '// ', suffix: '' },
  '.go': { prefix: '// ', suffix: '' },
  '.c': { prefix: '// ', suffix: '' },
  '.cpp': { prefix: '// ', suffix: '' },
  '.h': { prefix: '// ', suffix: '' }
};

// Directories to scan
const SCAN_DIRS = ['src', 'tools', 'scripts', 'mirrorbench', 'docs'];

// Files/directories to exclude
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.DS_Store/,
  /dist/,
  /build/,
  /coverage/,
  /\.nyc_output/,
  /\.next/,
  /\.nuxt/,
  /\.vuepress/,
  /\.cache/,
  /temp/,
  /tmp/,
  /\.(png|jpg|jpeg|gif|svg|ico|webp|bmp|tiff)$/i,
  /\.(woff|woff2|ttf|eot|otf)$/i,
  /\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i,
  /\.(zip|tar|gz|bz2|7z|rar)$/i,
  /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i,
  /\.lock$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/
];

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function generateSPDXHeader(ext, filePath) {
  const commentStyle = COMMENT_STYLES[ext];
  if (!commentStyle) return null;

  const year = getCurrentYear();
  const license = 'MIT';
  const copyright = `Copyright (c) ${year} Pure Lambda Authors`;

  const spdxLine = `${commentStyle.prefix}SPDX-License-Identifier: ${license}${commentStyle.suffix}`;
  const copyrightLine = `${commentStyle.prefix}${copyright}${commentStyle.suffix}`;

  return `${spdxLine}\n${copyrightLine}\n`;
}

function hasSPDXHeader(content) {
  const lines = content.split('\n').slice(0, 10); // Check first 10 lines
  return lines.some(line => line.includes('SPDX-License-Identifier'));
}

function walkDirectory(dir, files = []) {
  if (!statSync(dir).isDirectory()) return files;

  try {
    const entries = readdirSync(dir);

    for (const entry of entries.sort()) { // Deterministic ordering
      const fullPath = join(dir, entry);
      const relativePath = relative(projectRoot, fullPath);

      if (shouldExclude(relativePath)) continue;

      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walkDirectory(fullPath, files);
      } else if (stat.isFile()) {
        const ext = extname(fullPath);
        if (COMMENT_STYLES[ext] !== undefined) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
    console.warn(`Warning: Cannot read directory ${dir}: ${error.message}`);
  }

  return files;
}

function scanFiles() {
  const allFiles = [];

  // Scan specified directories
  for (const dir of SCAN_DIRS) {
    const dirPath = join(projectRoot, dir);
    try {
      if (statSync(dirPath).isDirectory()) {
        walkDirectory(dirPath, allFiles);
      }
    } catch (error) {
      // Directory doesn't exist, skip
      continue;
    }
  }

  return allFiles.sort(); // Deterministic ordering
}

function processFile(filePath, writeMode = false) {
  const ext = extname(filePath);
  const commentStyle = COMMENT_STYLES[ext];

  if (!commentStyle) {
    return { skipped: true, reason: 'No comment style defined' };
  }

  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (error) {
    return { error: `Cannot read file: ${error.message}` };
  }

  if (hasSPDXHeader(content)) {
    return { hasHeader: true };
  }

  const header = generateSPDXHeader(ext, filePath);
  if (!header) {
    return { skipped: true, reason: 'Cannot generate header' };
  }

  if (writeMode) {
    try {
      // Handle shebangs - keep them at the top
      const lines = content.split('\n');
      let insertIndex = 0;

      if (lines[0] && lines[0].startsWith('#!')) {
        insertIndex = 1;
        // Add empty line after shebang if not present
        if (lines[1] && lines[1].trim() !== '') {
          lines.splice(1, 0, '');
          insertIndex = 2;
        }
      }

      // Insert header
      const headerLines = header.trimEnd().split('\n');
      lines.splice(insertIndex, 0, ...headerLines, '');

      writeFileSync(filePath, lines.join('\n'));
      return { added: true };
    } catch (error) {
      return { error: `Cannot write file: ${error.message}` };
    }
  }

  return { missing: true, proposedHeader: header };
}

function main() {
  const args = process.argv.slice(2);
  const writeMode = args.includes('--write');

  console.log('SPDX License Scanner');
  console.log(`Mode: ${writeMode ? 'WRITE (applying headers)' : 'CHECK (dry-run)'}`);
  console.log(`Scanning directories: ${SCAN_DIRS.join(', ')}`);
  console.log('');

  const files = scanFiles();
  console.log(`Found ${files.length} files to process`);
  console.log('');

  const results = {
    processed: 0,
    hasHeader: 0,
    missing: 0,
    added: 0,
    skipped: 0,
    errors: 0
  };

  const missingFiles = [];
  const errorFiles = [];

  for (const filePath of files) {
    const relativePath = relative(projectRoot, filePath);
    const result = processFile(filePath, writeMode);

    results.processed++;

    if (result.hasHeader) {
      results.hasHeader++;
      console.log(`✓ ${relativePath} - has SPDX header`);
    } else if (result.missing) {
      results.missing++;
      missingFiles.push(relativePath);
      console.log(`✗ ${relativePath} - missing SPDX header`);
      if (!writeMode) {
        console.log(`  Proposed header:`);
        result.proposedHeader.split('\n').forEach(line => {
          if (line.trim()) console.log(`    ${line}`);
        });
      }
    } else if (result.added) {
      results.added++;
      console.log(`+ ${relativePath} - added SPDX header`);
    } else if (result.skipped) {
      results.skipped++;
      console.log(`- ${relativePath} - skipped (${result.reason})`);
    } else if (result.error) {
      results.errors++;
      errorFiles.push({ path: relativePath, error: result.error });
      console.error(`! ${relativePath} - error: ${result.error}`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Files processed: ${results.processed}`);
  console.log(`With SPDX headers: ${results.hasHeader}`);
  console.log(`Missing headers: ${results.missing}`);

  if (writeMode) {
    console.log(`Headers added: ${results.added}`);
  }

  console.log(`Files skipped: ${results.skipped}`);
  console.log(`Errors: ${results.errors}`);

  if (errorFiles.length > 0) {
    console.log('');
    console.log('ERRORS:');
    errorFiles.forEach(({ path, error }) => {
      console.error(`  ${path}: ${error}`);
    });
  }

  if (!writeMode && results.missing > 0) {
    console.log('');
    console.log(`Run with --write to add missing headers to ${results.missing} files.`);
    console.log('');
    console.log('Missing SPDX headers in:');
    missingFiles.forEach(file => console.log(`  ${file}`));
    process.exit(1);
  }

  if (results.errors > 0) {
    process.exit(1);
  }

  console.log('');
  console.log(writeMode ? '✅ All files processed successfully!' : '✅ All files have SPDX headers!');
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}