#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Generate NOTICE and THIRD_PARTY files from dependencies
 * Creates structured documentation of third-party licenses
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = new URL('.', import.meta.url).pathname;
const projectRoot = join(__dirname, '..', '..');

// Extract dependencies from all package.json files
function extractDependencies() {
  const deps = new Map();

  // Main package.json
  try {
    const mainPkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    if (mainPkg.dependencies) {
      Object.entries(mainPkg.dependencies).forEach(([name, version]) => {
        deps.set(name, { version, isDev: false });
      });
    }
    if (mainPkg.devDependencies) {
      Object.entries(mainPkg.devDependencies).forEach(([name, version]) => {
        // Only add if not already present as production dependency
        if (!deps.has(name)) {
          deps.set(name, { version, isDev: true });
        }
      });
    }
  } catch (error) {
    console.error(`Error reading main package.json: ${error.message}`);
    process.exit(1);
  }

  return deps;
}

// Get license info from node_modules
function getLicenseInfo(packageName) {
  const packagePath = join(projectRoot, 'node_modules', packageName);

  try {
    // Try package.json first
    const pkgPath = join(packagePath, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

    let spdxId = 'UNKNOWN';
    if (pkg.license) {
      spdxId = typeof pkg.license === 'string' ? pkg.license : pkg.license.type;
    } else if (pkg.licenses && pkg.licenses.length > 0) {
      spdxId = pkg.licenses[0].type;
    }

    // If still unknown, try to detect from LICENSE files
    if (spdxId === 'UNKNOWN') {
      spdxId = detectLicenseFromFiles(packagePath);
    }

    return {
      name: packageName,
      version: pkg.version || 'unknown',
      spdxId,
      homepage: pkg.homepage || pkg.repository?.url || '',
      author: pkg.author || ''
    };
  } catch (error) {
    return {
      name: packageName,
      version: 'unknown',
      spdxId: 'UNKNOWN',
      homepage: '',
      author: ''
    };
  }
}

function detectLicenseFromFiles(packagePath) {
  const licenseFiles = ['LICENSE', 'LICENSE.txt', 'LICENSE.md', 'license', 'license.txt', 'license.md'];

  for (const filename of licenseFiles) {
    try {
      const licensePath = join(packagePath, filename);
      const licenseText = readFileSync(licensePath, 'utf8').toLowerCase();

      // Simple heuristics for license detection
      if (licenseText.includes('mit license') || licenseText.includes('mit ')) return 'MIT';
      if (licenseText.includes('apache license') || licenseText.includes('apache-2.0')) return 'Apache-2.0';
      if (licenseText.includes('bsd-3-clause') || licenseText.includes('3-clause bsd')) return 'BSD-3-Clause';
      if (licenseText.includes('bsd-2-clause') || licenseText.includes('2-clause bsd')) return 'BSD-2-Clause';
      if (licenseText.includes('isc license')) return 'ISC';
      if (licenseText.includes('cc0') || licenseText.includes('creative commons')) return 'CC0-1.0';
    } catch (error) {
      // License file not found, continue
    }
  }

  return 'UNKNOWN';
}

function generateNotice() {
  const year = new Date().getFullYear();
  const projectName = 'Pure Lambda';
  const primaryLicense = 'MIT';

  // Get unique SPDX IDs from dependencies
  const dependencies = extractDependencies();
  const thirdPartyLicenses = new Set();

  for (const [name] of dependencies) {
    const info = getLicenseInfo(name);
    if (info.spdxId !== 'UNKNOWN' && info.spdxId !== primaryLicense) {
      thirdPartyLicenses.add(info.spdxId);
    }
  }

  const licensesList = Array.from(thirdPartyLicenses).sort().join(', ');

  return `${projectName}
Copyright (c) ${year} Pure Lambda Authors

This project is licensed under the ${primaryLicense} License.

This software includes third-party components with the following licenses:
${licensesList || 'None'}

For full license text and attribution details, see THIRD_PARTY.json.
`;
}

function generateThirdParty() {
  const dependencies = extractDependencies();
  const thirdPartyData = [];

  for (const [name, depInfo] of dependencies) {
    const info = getLicenseInfo(name);
    thirdPartyData.push({
      name: info.name,
      version: info.version,
      spdxId: info.spdxId,
      homepage: info.homepage,
      author: typeof info.author === 'string' ? info.author :
              info.author?.name || info.author?.email || '',
      isDev: depInfo.isDev
    });
  }

  // Sort by name for deterministic output
  thirdPartyData.sort((a, b) => a.name.localeCompare(b.name));

  return JSON.stringify(thirdPartyData, null, 2);
}

function main() {
  console.log('Generating license notices...');

  try {
    // Generate NOTICE.txt
    const notice = generateNotice();
    const noticePath = join(projectRoot, 'licenses/NOTICE.txt');
    writeFileSync(noticePath, notice);
    console.log(`✓ Generated ${relative(projectRoot, noticePath)}`);

    // Generate THIRD_PARTY.json
    const thirdParty = generateThirdParty();
    const thirdPartyPath = join(projectRoot, 'licenses/THIRD_PARTY.json');
    writeFileSync(thirdPartyPath, thirdParty);
    console.log(`✓ Generated ${relative(projectRoot, thirdPartyPath)}`);

    const thirdPartyData = JSON.parse(thirdParty);
    console.log(`\nSummary:`);
    console.log(`- Third-party packages: ${thirdPartyData.length}`);
    console.log(`- Production dependencies: ${thirdPartyData.filter(p => !p.isDev).length}`);
    console.log(`- Development dependencies: ${thirdPartyData.filter(p => p.isDev).length}`);

    // Show license distribution
    const licenseCount = {};
    thirdPartyData.forEach(p => {
      licenseCount[p.spdxId] = (licenseCount[p.spdxId] || 0) + 1;
    });

    console.log(`\nLicense distribution:`);
    Object.entries(licenseCount)
      .sort(([,a], [,b]) => b - a)
      .forEach(([license, count]) => {
        console.log(`  ${license}: ${count} packages`);
      });

    console.log('\n✅ License notices generated successfully!');

  } catch (error) {
    console.error(`Error generating notices: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}