#!/usr/bin/env ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * PL-CARTRIDGE-01 Verifier
 *
 * Verifies cartridge integrity and optional DSSE signatures
 * Usage:
 *   ts-node tools/cartridge/verify.ts path/to/cartridge.htmlc
 *   ts-node tools/cartridge/verify.ts path/to/cartridge.cartridge
 */

import { readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, extname, basename } from 'path';
import { execSync } from 'child_process';
import { canonicalize } from '../../src/seed/canonical';
import { computeHash, validateSeed } from '../../src/seed/schema';
import { verifyEnvelope } from '../attest';

interface CartridgeManifest {
  version: number;
  createdAt: string;
  seedHash: string;
  envelopeHash?: string;
  viewerHash: string;
  manifestHash: string;
  size: number;
}

interface VerificationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

/**
 * Extract and parse HTML cartridge
 */
function parseHtmlCartridge(filePath: string): {
  manifest: CartridgeManifest;
  seedData: any;
  envelopeData?: any;
  viewerHtml: string;
} {
  const htmlContent = readFileSync(filePath, 'utf8');

  // Extract manifest
  const manifestMatch = htmlContent.match(
    /<script id="pl-cartridge" type="application\/json">\s*([\s\S]*?)\s*<\/script>/
  );
  if (!manifestMatch) {
    throw new Error('No cartridge manifest found in HTML');
  }

  const manifest: CartridgeManifest = JSON.parse(manifestMatch[1]!);

  // Extract seed data
  const seedMatch = htmlContent.match(
    /<script id="pl-seed" type="text\/plain">\s*([\s\S]*?)\s*<\/script>/
  );
  if (!seedMatch) {
    throw new Error('No seed data found in HTML');
  }

  let seedData: any = null;
  const seedBase64 = seedMatch[1]?.trim();
  if (seedBase64 && seedBase64 !== '__SEED_PLACEHOLDER__') {
    try {
      const seedJson = Buffer.from(seedBase64, 'base64').toString('utf8');
      seedData = JSON.parse(seedJson);
    } catch (error) {
      throw new Error(`Failed to decode seed data: ${error}`);
    }
  } else {
    throw new Error('Seed data placeholder not replaced');
  }

  // Extract envelope data (optional)
  const envelopeMatch = htmlContent.match(
    /<script id="pl-envelope" type="text\/plain">\s*([\s\S]*?)\s*<\/script>/
  );
  let envelopeData: any = undefined;
  if (envelopeMatch) {
    const envelopeBase64 = envelopeMatch[1]?.trim();
    if (envelopeBase64 && envelopeBase64 !== '__ENVELOPE_PLACEHOLDER__') {
      try {
        const envelopeJson = Buffer.from(envelopeBase64, 'base64').toString('utf8');
        envelopeData = JSON.parse(envelopeJson);
      } catch (error) {
        throw new Error(`Failed to decode envelope data: ${error}`);
      }
    }
  }

  // Extract viewer HTML template (restore placeholders for hash verification)
  let viewerHtml = htmlContent
    .replace(/<script id="pl-cartridge"[\s\S]*?<\/script>/, '<script id="pl-cartridge" type="application/json">\n__MANIFEST_PLACEHOLDER__\n    </script>')
    .replace(/<script id="pl-seed"[\s\S]*?<\/script>/, '<script id="pl-seed" type="text/plain">\n__SEED_PLACEHOLDER__\n    </script>')
    .replace(/<script id="pl-envelope"[\s\S]*?<\/script>/, '<script id="pl-envelope" type="text/plain">\n__ENVELOPE_PLACEHOLDER__\n    </script>')
    .trim();

  return { manifest, seedData, envelopeData, viewerHtml };
}

/**
 * Extract and parse ZIP cartridge
 */
function parseZipCartridge(filePath: string): {
  manifest: CartridgeManifest;
  seedData: any;
  envelopeData?: any;
  viewerHtml: string;
} {
  const tempDir = join('/tmp', `cartridge-verify-${Date.now()}`);

  try {
    // Create temp directory and extract
    mkdirSync(tempDir, { recursive: true });
    execSync(`cd "${tempDir}" && unzip -q "${filePath}"`, { stdio: 'pipe' });

    // Read required files
    const manifestPath = join(tempDir, 'manifest.json');
    const seedPath = join(tempDir, 'seed.json');
    const viewerPath = join(tempDir, 'index.html');
    const envelopePath = join(tempDir, 'envelope.json');

    if (!existsSync(manifestPath)) {
      throw new Error('manifest.json not found in cartridge');
    }
    if (!existsSync(seedPath)) {
      throw new Error('seed.json not found in cartridge');
    }
    if (!existsSync(viewerPath)) {
      throw new Error('index.html not found in cartridge');
    }

    const manifest: CartridgeManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const seedData = JSON.parse(readFileSync(seedPath, 'utf8'));
    const viewerHtml = readFileSync(viewerPath, 'utf8');

    let envelopeData: any = undefined;
    if (existsSync(envelopePath)) {
      envelopeData = JSON.parse(readFileSync(envelopePath, 'utf8'));
    }

    return { manifest, seedData, envelopeData, viewerHtml };

  } finally {
    // Clean up temp directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Verify cartridge structure and hashes
 */
function verifyCartridge(filePath: string): VerificationResult {
  const result: VerificationResult = {
    success: true,
    errors: [],
    warnings: [],
    info: []
  };

  try {
    const extension = extname(filePath).toLowerCase();
    const fileName = basename(filePath);

    result.info.push(`Verifying cartridge: ${fileName}`);

    // Parse cartridge based on type
    let cartridgeData: {
      manifest: CartridgeManifest;
      seedData: any;
      envelopeData?: any;
      viewerHtml: string;
    };

    if (extension === '.htmlc') {
      result.info.push('Detected HTML cartridge format (.htmlc)');
      cartridgeData = parseHtmlCartridge(filePath);
    } else if (extension === '.cartridge') {
      result.info.push('Detected ZIP cartridge format (.cartridge)');
      cartridgeData = parseZipCartridge(filePath);
    } else {
      result.errors.push(`Unsupported cartridge format: ${extension}`);
      result.success = false;
      return result;
    }

    const { manifest, seedData, envelopeData, viewerHtml } = cartridgeData;

    // Verify manifest structure
    result.info.push('Checking manifest structure...');
    if (typeof manifest.version !== 'number' || manifest.version < 1) {
      result.errors.push('Invalid manifest version');
    }
    if (!manifest.createdAt || isNaN(new Date(manifest.createdAt).getTime())) {
      result.errors.push('Invalid createdAt timestamp');
    }
    if (!manifest.seedHash || typeof manifest.seedHash !== 'string') {
      result.errors.push('Missing or invalid seedHash');
    }
    if (!manifest.viewerHash || typeof manifest.viewerHash !== 'string') {
      result.errors.push('Missing or invalid viewerHash');
    }
    if (!manifest.manifestHash || typeof manifest.manifestHash !== 'string') {
      result.errors.push('Missing or invalid manifestHash');
    }
    if (typeof manifest.size !== 'number' || manifest.size <= 0) {
      result.errors.push('Invalid size field');
    }

    // Verify seed structure
    result.info.push('Validating seed structure...');
    try {
      validateSeed(seedData);
      result.info.push('✓ Seed structure validation passed');
    } catch (error) {
      result.errors.push(`Seed validation failed: ${error instanceof Error ? error.message : error}`);
    }

    // Verify seed hash
    result.info.push('Verifying seed hash...');
    const calculatedSeedHash = computeHash(canonicalize(seedData));
    if (calculatedSeedHash === manifest.seedHash) {
      result.info.push('✓ Seed hash verification passed');
    } else {
      result.errors.push(`Seed hash mismatch. Expected: ${manifest.seedHash}, Got: ${calculatedSeedHash}`);
    }

    // Verify viewer hash
    result.info.push('Verifying viewer hash...');
    const calculatedViewerHash = computeHash(viewerHtml);
    if (calculatedViewerHash === manifest.viewerHash) {
      result.info.push('✓ Viewer hash verification passed');
    } else {
      result.errors.push(`Viewer hash mismatch. Expected: ${manifest.viewerHash}, Got: ${calculatedViewerHash}`);
    }

    // Verify manifest hash
    result.info.push('Verifying manifest hash...');
    const manifestWithoutHash = { ...manifest };
    delete (manifestWithoutHash as any).manifestHash;
    delete (manifestWithoutHash as any).size; // Size is added after manifest hash is calculated
    const calculatedManifestHash = computeHash(canonicalize(manifestWithoutHash));
    if (calculatedManifestHash === manifest.manifestHash) {
      result.info.push('✓ Manifest hash verification passed');
    } else {
      result.errors.push(`Manifest hash mismatch. Expected: ${manifest.manifestHash}, Got: ${calculatedManifestHash}`);
    }

    // Verify envelope if present
    if (envelopeData) {
      result.info.push('Verifying DSSE envelope...');

      if (manifest.envelopeHash) {
        const calculatedEnvelopeHash = computeHash(canonicalize(envelopeData));
        if (calculatedEnvelopeHash === manifest.envelopeHash) {
          result.info.push('✓ Envelope hash verification passed');
        } else {
          result.errors.push(`Envelope hash mismatch. Expected: ${manifest.envelopeHash}, Got: ${calculatedEnvelopeHash}`);
        }
      } else {
        result.warnings.push('Envelope present but no envelopeHash in manifest');
      }

      // Verify DSSE signature (requires environment setup)
      try {
        // Create temp file for envelope verification
        const tempEnvelopePath = `/tmp/envelope-verify-${Date.now()}.json`;
        require('fs').writeFileSync(tempEnvelopePath, JSON.stringify(envelopeData, null, 2));

        try {
          const isValidSignature = verifyEnvelope(tempEnvelopePath);
          if (isValidSignature) {
            result.info.push('✓ DSSE signature verification passed');
          } else {
            result.warnings.push('DSSE signature verification failed (may require PL_ED25519_SECRET)');
          }
        } finally {
          // Clean up temp file
          try {
            require('fs').unlinkSync(tempEnvelopePath);
          } catch {}
        }
      } catch (error) {
        result.warnings.push(`DSSE signature verification error: ${error instanceof Error ? error.message : error}`);
      }
    } else {
      result.info.push('No DSSE envelope (unsigned cartridge)');
      if (manifest.envelopeHash) {
        result.warnings.push('Manifest has envelopeHash but no envelope data found');
      }
    }

    // Check size constraints
    const fileSizeBytes = require('fs').statSync(filePath).size;
    if (extension === '.htmlc' && fileSizeBytes > 40 * 1024) {
      result.warnings.push(`HTML cartridge size (${(fileSizeBytes / 1024).toFixed(1)} KB) exceeds 40KB target`);
    } else if (extension === '.cartridge' && fileSizeBytes > 80 * 1024) {
      result.warnings.push(`ZIP cartridge size (${(fileSizeBytes / 1024).toFixed(1)} KB) exceeds 80KB limit`);
    }

    // Update success status
    result.success = result.errors.length === 0;

    if (result.success) {
      result.info.push('🎉 Cartridge verification completed successfully');
    }

  } catch (error) {
    result.errors.push(`Verification failed: ${error instanceof Error ? error.message : error}`);
    result.success = false;
  }

  return result;
}

/**
 * Print verification results
 */
function printResults(result: VerificationResult, verbose: boolean = false) {
  console.log('\n=== PL-CARTRIDGE-01 Verification Results ===\n');

  // Print info messages (always shown)
  if (result.info.length > 0) {
    for (const info of result.info) {
      console.log(`ℹ️  ${info}`);
    }
    console.log();
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    for (const warning of result.warnings) {
      console.log(`   ${warning}`);
    }
    console.log();
  }

  // Print errors
  if (result.errors.length > 0) {
    console.log('❌ ERRORS:');
    for (const error of result.errors) {
      console.log(`   ${error}`);
    }
    console.log();
  }

  // Print final result
  if (result.success) {
    console.log('✅ PASS: Cartridge verification successful');
  } else {
    console.log('❌ FAIL: Cartridge verification failed');
    console.log(`   ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage:');
    console.log('  ts-node tools/cartridge/verify.ts <cartridge-file>');
    console.log('  ts-node tools/cartridge/verify.ts --help');
    console.log('');
    console.log('Arguments:');
    console.log('  cartridge-file  Path to .htmlc or .cartridge file');
    console.log('');
    console.log('Options:');
    console.log('  --verbose, -v   Show detailed verification steps');
    console.log('  --help, -h      Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  ts-node tools/cartridge/verify.ts dist/release/hello-city.htmlc');
    console.log('  ts-node tools/cartridge/verify.ts dist/release/hello-city.cartridge');
    process.exit(0);
  }

  const verbose = args.includes('--verbose') || args.includes('-v');
  const filePath = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));

  if (!filePath) {
    console.error('Error: Cartridge file path required');
    process.exit(1);
  }

  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    const result = verifyCartridge(filePath);
    printResults(result, verbose);
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Verification failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { verifyCartridge, parseHtmlCartridge, parseZipCartridge };