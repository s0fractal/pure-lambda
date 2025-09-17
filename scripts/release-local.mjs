#!/usr/bin/env node
// Create local release artifacts

import { execSync } from 'child_process';
import { statSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Ensure dist directory exists
if (!existsSync('dist')) {
  mkdirSync('dist', { recursive: true });
}

// Create embassy.zip using zip command
try {
  execSync('cd dist && zip -r embassy.zip seeds/ && cd ..', { stdio: 'pipe' });

  // Copy additional files to dist for packaging
  execSync('cp README.md dist/ 2>/dev/null || true', { stdio: 'pipe' });
  execSync('cp LICENSE dist/ 2>/dev/null || true', { stdio: 'pipe' });

  // Add SDKs to the zip
  execSync('cd dist && zip -r embassy.zip ../sdks/ && cd ..', { stdio: 'pipe' });

  // Add docs if they exist
  execSync('cd dist && zip -r embassy.zip ../README.md ../LICENSE 2>/dev/null || true && cd ..', { stdio: 'pipe' });

  const stats = statSync('dist/embassy.zip');
  const sizeKB = Math.round(stats.size / 1024);

  console.log(`📦 embassy.zip created: ${sizeKB}KB`);

  if (sizeKB > 50) {
    console.error('❌ Embassy too large (>50KB)');
    process.exit(1);
  }

  console.log('✅ Release artifacts created');
} catch (error) {
  console.error('❌ Failed to create embassy.zip:', error.message);
  process.exit(1);
}