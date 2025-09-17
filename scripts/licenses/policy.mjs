#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * License Policy Validator - Validate dependencies against allow/deny lists
 * Checks package.json dependencies and embedded LICENSE files
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = new URL('.', import.meta.url).pathname;
const projectRoot = join(__dirname, '..', '..');

// Load policy files
function loadPolicy() {
  try {
    const allowlist = JSON.parse(readFileSync(join(projectRoot, 'licenses/ALLOWLIST.json'), 'utf8'));
    const denylist = JSON.parse(readFileSync(join(projectRoot, 'licenses/DENYLIST.json'), 'utf8'));
    return { allowlist, denylist };
  } catch (error) {
    console.error(`Error loading policy files: ${error.message}`);
    process.exit(1);
  }
}

// Extract dependencies from package.json
function extractDependencies() {
  const deps = new Map();

  // Main package.json
  try {
    const mainPkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    if (mainPkg.dependencies) {
      Object.keys(mainPkg.dependencies).forEach(name => {
        deps.set(name, { version: mainPkg.dependencies[name], source: 'package.json' });
      });
    }
    if (mainPkg.devDependencies) {
      Object.keys(mainPkg.devDependencies).forEach(name => {
        deps.set(name, { version: mainPkg.devDependencies[name], source: 'package.json (dev)' });
      });
    }
  } catch (error) {
    console.error(`Error reading main package.json: ${error.message}`);
    process.exit(1);
  }

  // Workspace packages
  function scanWorkspaces(dir) {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        if (statSync(fullPath).isDirectory()) {
          const pkgPath = join(fullPath, 'package.json');
          try {
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
            const relativePath = relative(projectRoot, pkgPath);

            if (pkg.dependencies) {
              Object.keys(pkg.dependencies).forEach(name => {
                deps.set(name, { version: pkg.dependencies[name], source: relativePath });
              });
            }
            if (pkg.devDependencies) {
              Object.keys(pkg.devDependencies).forEach(name => {
                deps.set(name, { version: pkg.devDependencies[name], source: `${relativePath} (dev)` });
              });
            }
          } catch (error) {
            // Skip packages without package.json or malformed ones
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  // Scan common workspace directories
  const workspaceDirs = ['packages', 'sdks', 'organisms'];
  for (const dir of workspaceDirs) {
    const dirPath = join(projectRoot, dir);
    try {
      if (statSync(dirPath).isDirectory()) {
        scanWorkspaces(dirPath);
      }
    } catch (error) {
      // Directory doesn't exist, skip
    }
  }

  return deps;
}

// Get license from node_modules (simplified heuristic)
function getLicenseFromNodeModules(packageName) {
  const packagePath = join(projectRoot, 'node_modules', packageName);

  try {
    // Try package.json first
    const pkgPath = join(packagePath, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (pkg.license) {
      return typeof pkg.license === 'string' ? pkg.license : pkg.license.type;
    }
    if (pkg.licenses && pkg.licenses.length > 0) {
      return pkg.licenses[0].type;
    }
  } catch (error) {
    // Package.json not found or malformed
  }

  // Try LICENSE files
  const licenseFiles = ['LICENSE', 'LICENSE.txt', 'LICENSE.md', 'license', 'license.txt', 'license.md'];
  for (const filename of licenseFiles) {
    try {
      const licensePath = join(packagePath, filename);
      const licenseText = readFileSync(licensePath, 'utf8');

      // Simple heuristics for license detection
      const text = licenseText.toLowerCase();
      if (text.includes('mit license') || text.includes('mit ')) return 'MIT';
      if (text.includes('apache license') || text.includes('apache-2.0')) return 'Apache-2.0';
      if (text.includes('bsd-3-clause') || text.includes('3-clause bsd')) return 'BSD-3-Clause';
      if (text.includes('bsd-2-clause') || text.includes('2-clause bsd')) return 'BSD-2-Clause';
      if (text.includes('isc license')) return 'ISC';
      if (text.includes('gpl-3.0') || text.includes('gnu general public license version 3')) return 'GPL-3.0-only';
      if (text.includes('lgpl-3.0') || text.includes('gnu lesser general public license version 3')) return 'LGPL-3.0-only';
      if (text.includes('agpl-3.0') || text.includes('gnu affero general public license version 3')) return 'AGPL-3.0-only';
      if (text.includes('cc0') || text.includes('creative commons')) return 'CC0-1.0';

      return 'UNKNOWN';
    } catch (error) {
      // License file not found
    }
  }

  return 'UNKNOWN';
}

// Find embedded LICENSE files in repository
function findEmbeddedLicenses() {
  const licenses = [];

  function scanDirectory(dir, depth = 0) {
    if (depth > 3) return; // Limit recursion depth

    try {
      const entries = readdirSync(dir);
      for (const entry of entries.sort()) {
        const fullPath = join(dir, entry);
        const relativePath = relative(projectRoot, fullPath);

        // Skip node_modules and other excluded directories
        if (relativePath.includes('node_modules') ||
            relativePath.includes('.git') ||
            relativePath.includes('dist') ||
            relativePath.includes('build')) {
          continue;
        }

        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          scanDirectory(fullPath, depth + 1);
        } else if (stat.isFile()) {
          const filename = entry.toLowerCase();
          if (filename.includes('license') || filename.includes('licence')) {
            try {
              const content = readFileSync(fullPath, 'utf8');
              const firstLine = content.split('\n')[0].toLowerCase();

              let licenseType = 'UNKNOWN';
              if (firstLine.includes('mit')) licenseType = 'MIT';
              else if (firstLine.includes('apache')) licenseType = 'Apache-2.0';
              else if (firstLine.includes('bsd')) licenseType = 'BSD-3-Clause';
              else if (firstLine.includes('gpl')) licenseType = 'GPL-3.0-only';

              licenses.push({
                file: relativePath,
                type: licenseType,
                firstLine: firstLine.substring(0, 100)
              });
            } catch (error) {
              // Skip files we can't read
            }
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  scanDirectory(projectRoot);
  return licenses;
}

function validateLicense(spdxId, allowlist, denylist) {
  // Normalize SPDX ID
  const normalized = spdxId.trim();

  // Check against denylist first (strict)
  if (denylist.includes(normalized)) {
    return { status: 'DENIED', reason: `License ${normalized} is in denylist` };
  }

  // Check against allowlist
  if (allowlist.includes(normalized)) {
    return { status: 'ALLOWED', reason: `License ${normalized} is in allowlist` };
  }

  // Unknown licenses are warnings, not failures
  if (normalized === 'UNKNOWN') {
    return { status: 'WARNING', reason: 'License could not be determined' };
  }

  return { status: 'WARNING', reason: `License ${normalized} not in allowlist (review required)` };
}

function main() {
  console.log('License Policy Validator');
  console.log('='.repeat(50));

  const { allowlist, denylist } = loadPolicy();
  console.log(`Allowlist: ${allowlist.join(', ')}`);
  console.log(`Denylist: ${denylist.join(', ')}`);
  console.log('');

  // Extract and validate dependencies
  console.log('Analyzing dependencies...');
  const dependencies = extractDependencies();
  console.log(`Found ${dependencies.size} unique dependencies`);
  console.log('');

  const results = {
    allowed: 0,
    warnings: 0,
    denied: 0,
    total: 0
  };

  const violations = [];
  const warnings = [];

  // Check each dependency
  for (const [name, info] of dependencies) {
    const license = getLicenseFromNodeModules(name);
    const validation = validateLicense(license, allowlist, denylist);

    results.total++;

    console.log(`${name} (${info.version}) - ${license} - ${validation.status}`);

    switch (validation.status) {
      case 'ALLOWED':
        results.allowed++;
        break;
      case 'WARNING':
        results.warnings++;
        warnings.push({ name, license, reason: validation.reason, source: info.source });
        break;
      case 'DENIED':
        results.denied++;
        violations.push({ name, license, reason: validation.reason, source: info.source });
        break;
    }
  }

  console.log('');

  // Check embedded licenses
  console.log('Analyzing embedded LICENSE files...');
  const embeddedLicenses = findEmbeddedLicenses();
  console.log(`Found ${embeddedLicenses.length} embedded license files`);

  for (const license of embeddedLicenses) {
    const validation = validateLicense(license.type, allowlist, denylist);
    console.log(`${license.file} - ${license.type} - ${validation.status}`);

    if (validation.status === 'DENIED') {
      violations.push({
        name: license.file,
        license: license.type,
        reason: validation.reason,
        source: 'embedded'
      });
      results.denied++;
    } else if (validation.status === 'WARNING') {
      warnings.push({
        name: license.file,
        license: license.type,
        reason: validation.reason,
        source: 'embedded'
      });
      results.warnings++;
    }
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total items checked: ${results.total + embeddedLicenses.length}`);
  console.log(`Allowed: ${results.allowed}`);
  console.log(`Warnings: ${results.warnings}`);
  console.log(`Denied: ${results.denied}`);

  if (warnings.length > 0) {
    console.log('');
    console.log('WARNINGS (review required):');
    warnings.forEach(w => {
      console.log(`  ⚠️  ${w.name} - ${w.license} (${w.reason}) [${w.source}]`);
    });
  }

  if (violations.length > 0) {
    console.log('');
    console.log('VIOLATIONS (must be resolved):');
    violations.forEach(v => {
      console.error(`  ❌ ${v.name} - ${v.license} (${v.reason}) [${v.source}]`);
    });

    console.log('');
    console.error('❌ License policy validation FAILED');
    console.error(`${violations.length} license violations found.`);
    console.error('Remove denied licenses or update policy files.');
    process.exit(2);
  }

  if (warnings.length > 0) {
    console.log('');
    console.log('⚠️  License policy validation completed with warnings');
    console.log(`${warnings.length} licenses require review.`);
  } else {
    console.log('');
    console.log('✅ License policy validation PASSED');
    console.log('All licenses comply with policy.');
  }

  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}