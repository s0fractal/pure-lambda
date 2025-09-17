#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * Build OTM bundle with size optimization
 */
async function buildOTM() {
  console.log('🔨 Building One-Tap Mirrors (OTM)');
  console.log('=' .repeat(40));

  const inputPath = path.join(projectRoot, 'docs', 'otm', 'otm.ts');
  const outputPath = path.join(projectRoot, 'docs', 'otm', 'otm.min.js');
  const devOutputPath = path.join(projectRoot, 'docs', 'otm', 'otm.js');

  // Check if TypeScript file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    // First, check if we have esbuild
    let hasEsbuild = false;
    try {
      execSync('npx esbuild --version', { stdio: 'ignore' });
      hasEsbuild = true;
    } catch (e) {
      console.log('⚠️ esbuild not found, using fallback bundler');
    }

    if (hasEsbuild) {
      // Build development version
      console.log('📦 Building development version...');
      execSync(
        `npx esbuild ${inputPath} --bundle --format=iife --global-name=OTMBundle --outfile=${devOutputPath}`,
        { cwd: projectRoot, stdio: 'inherit' }
      );

      // Build minified production version
      console.log('📦 Building production version...');
      execSync(
        `npx esbuild ${inputPath} --bundle --format=iife --global-name=OTMBundle --minify --outfile=${outputPath}`,
        { cwd: projectRoot, stdio: 'inherit' }
      );
    } else {
      // Fallback: Simple concatenation and manual minification
      console.log('📦 Using fallback bundler...');

      const tsContent = fs.readFileSync(inputPath, 'utf8');

      // Remove TypeScript types and compile to JS (very basic)
      let jsContent = tsContent
        .replace(/interface\s+\w+\s*{[^}]*}/g, '') // Remove interfaces
        .replace(/:\s*\w+(\[\])?/g, '') // Remove type annotations
        .replace(/export\s+/g, '') // Remove exports
        .replace(/import\s+.*?;/g, ''); // Remove imports

      // Wrap in IIFE
      jsContent = `(function() {
${jsContent}
window.OTM = OTM;
})();`;

      // Save dev version
      fs.writeFileSync(devOutputPath, jsContent);

      // Minify for production (basic)
      let minified = jsContent
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\/\/.*/g, '') // Remove line comments
        .replace(/\s+/g, ' ') // Collapse whitespace
        .replace(/\s*([{}();,:])\s*/g, '$1'); // Remove spaces around operators

      fs.writeFileSync(outputPath, minified);
    }

    // Check file sizes
    const devSize = fs.statSync(devOutputPath).size;
    const minSize = fs.statSync(outputPath).size;

    console.log(`\n📊 Build Results:`);
    console.log(`   Development: ${(devSize / 1024).toFixed(2)} KB`);
    console.log(`   Minified: ${(minSize / 1024).toFixed(2)} KB`);

    // Check gzip size
    const minContent = fs.readFileSync(outputPath);
    const gzipped = zlib.gzipSync(minContent);
    const gzipSize = gzipped.length;

    console.log(`   Gzipped: ${(gzipSize / 1024).toFixed(2)} KB`);

    // Verify size constraint
    const TARGET_SIZE = 7 * 1024; // 7KB
    if (gzipSize <= TARGET_SIZE) {
      console.log(`   ✅ Size constraint met (≤7KB gzip)`);
    } else {
      console.log(`   ⚠️ Size exceeds target: ${(gzipSize / 1024).toFixed(2)}KB > 7KB`);
      console.log(`   Consider removing features or optimizing code`);
    }

    // Generate info file
    const info = {
      built: new Date().toISOString(),
      sizes: {
        development: devSize,
        minified: minSize,
        gzipped: gzipSize
      },
      target: '7KB gzipped',
      status: gzipSize <= TARGET_SIZE ? 'PASS' : 'EXCEEDS'
    };

    fs.writeFileSync(
      path.join(projectRoot, 'docs', 'otm', 'build-info.json'),
      JSON.stringify(info, null, 2)
    );

    console.log(`\n✅ OTM build complete!`);
    console.log(`   Output: ${outputPath}`);

    return {
      success: true,
      sizes: info.sizes
    };

  } catch (error) {
    console.error(`\n❌ Build failed: ${error.message}`);
    process.exit(1);
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  buildOTM();
}

export { buildOTM };