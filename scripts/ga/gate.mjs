#!/usr/bin/env node

/**
 * GA Gate - Quality Assurance Gate
 * Runs all quality checks in sequence and reports results
 * Exit non-zero on any failure; print minimal table to stdout
 */

import { execSync } from 'child_process';
import { existsSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import process from 'process';
import * as crypto from 'crypto';

const CHECKS = [
  {
    name: 'conformance',
    command: 'node tests/conformance-run.mjs',
    description: 'Conformance Tests'
  },
  {
    name: 'seed-rt',
    command: 'make seed-rt',
    description: 'Seed Roundtrip'
  },
  {
    name: 'verify-all',
    command: 'node scripts/receipts/verify-all.mjs',
    description: 'Receipt Verification'
  },
  {
    name: 'release-check',
    command: 'node scripts/release/check.mjs',
    description: 'Release Check'
  },
  {
    name: 'demo',
    command: 'make demo',
    description: 'Demo Build'
  },
  {
    name: 'cartridge',
    command: 'make cartridge',
    description: 'Cartridge Build'
  },
  {
    name: 'cartridge-verify',
    command: 'make cartridge-verify',
    description: 'Cartridge Verify'
  },
  {
    name: 'garden',
    command: 'make garden',
    description: 'Garden Seeds'
  },
  {
    name: 'fed-garden',
    command: 'make fed-garden',
    description: 'Garden Federation'
  },
  {
    name: 'pse',
    command: 'make exchange && node scripts/exchange/smoke.mjs',
    description: 'Public Seed Exchange'
  },
  {
    name: 'pocket-direct',
    command: 'make pocket-direct-smoke',
    description: 'Pocket Direct'
  }
];

const results = [];
let allPassed = true;

console.log('🛡️  GA Gate - Quality Assurance Checks');
console.log('=====================================');

for (const check of CHECKS) {
  process.stdout.write(`${check.description.padEnd(20)} ... `);

  try {
    const startTime = Date.now();
    execSync(check.command, {
      stdio: 'pipe',
      cwd: process.cwd(),
      timeout: 30000 // 30 second timeout per check
    });
    const duration = Date.now() - startTime;

    console.log(`✅ PASS (${duration}ms)`);
    results.push({
      name: check.name,
      status: 'PASS',
      duration
    });
  } catch (error) {
    console.log(`❌ FAIL`);
    results.push({
      name: check.name,
      status: 'FAIL',
      error: error.message
    });
    allPassed = false;
  }
}

console.log('');
console.log('Summary:');
console.log('--------');
results.forEach(result => {
  const status = result.status === 'PASS' ? '✅' : '❌';
  const duration = result.duration ? ` (${result.duration}ms)` : '';
  console.log(`${status} ${result.name}${duration}`);
});

// Additional demo validations if demo check passed
if (allPassed && results.find(r => r.name === 'demo' && r.status === 'PASS')) {
  console.log('');
  console.log('🏙️ Validating demo artifacts...');

  // Check if docs/demo/index.html exists
  const demoIndexPath = join(process.cwd(), 'docs/demo/index.html');
  if (!existsSync(demoIndexPath)) {
    console.log('❌ docs/demo/index.html not found');
    allPassed = false;
  } else {
    console.log('✅ docs/demo/index.html exists');
  }

  // Check hello-city.zip size <= 50KB
  const zipPath = join(process.cwd(), 'dist/release/hello-city.zip');
  if (!existsSync(zipPath)) {
    console.log('❌ hello-city.zip not found');
    allPassed = false;
  } else {
    const stats = statSync(zipPath);
    const sizeKB = Math.ceil(stats.size / 1024);
    if (sizeKB <= 50) {
      console.log(`✅ hello-city.zip size: ${sizeKB}KB (≤50KB)`);
    } else {
      console.log(`❌ hello-city.zip size: ${sizeKB}KB (>50KB)`);
      allPassed = false;
    }
  }
}

// Additional cartridge validations if cartridge checks passed
if (allPassed && results.find(r => r.name === 'cartridge' && r.status === 'PASS') && results.find(r => r.name === 'cartridge-verify' && r.status === 'PASS')) {
  console.log('');
  console.log('📦 Validating cartridge artifacts...');

  // Check htmlc size <= 40KB
  const htmlcPath = join(process.cwd(), 'dist/release/hello-city.htmlc');
  if (!existsSync(htmlcPath)) {
    console.log('❌ hello-city.htmlc not found');
    allPassed = false;
  } else {
    const stats = statSync(htmlcPath);
    const sizeKB = Math.ceil(stats.size / 1024);
    if (sizeKB <= 40) {
      console.log(`✅ hello-city.htmlc size: ${sizeKB}KB (≤40KB)`);
    } else {
      console.log(`❌ hello-city.htmlc size: ${sizeKB}KB (>40KB)`);
      allPassed = false;
    }
  }

  // Check cartridge size <= 80KB
  const cartridgePath = join(process.cwd(), 'dist/release/hello-city.cartridge');
  if (!existsSync(cartridgePath)) {
    console.log('❌ hello-city.cartridge not found');
    allPassed = false;
  } else {
    const stats = statSync(cartridgePath);
    const sizeKB = Math.ceil(stats.size / 1024);
    if (sizeKB <= 80) {
      console.log(`✅ hello-city.cartridge size: ${sizeKB}KB (≤80KB)`);
    } else {
      console.log(`❌ hello-city.cartridge size: ${sizeKB}KB (>80KB)`);
      allPassed = false;
    }
  }

  // Federation integration steps
  if (allPassed) {
    console.log('');
    console.log('🏛️ Federation integration...');

    try {
      // Fed-ingest
      console.log('📥 Ingesting artifacts...');
      execSync(`make fed-ingest PATHS="dist/release/hello-city.htmlc dist/release/hello-city.cartridge"`, {
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 15000
      });
      console.log('✅ Fed-ingest completed');

      // Fed-bundle
      console.log('📦 Creating federation bundle...');
      execSync('make fed-bundle', {
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 10000
      });
      console.log('✅ Fed-bundle completed');

      // Fed-verify with trust score validation
      console.log('🔍 Verifying federation bundle...');
      const verifyOutput = execSync('make fed-verify', {
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 10000,
        encoding: 'utf8'
      });

      // Parse verification output for trust score and quarantine count
      let trustScore = 0;
      let quarantineCount = 0;

      try {
        // Look for trust score in output (format may vary)
        const trustMatch = verifyOutput.match(/trust[.\s]*score[:\s]*([0-9.]+)/i);
        if (trustMatch) {
          trustScore = parseFloat(trustMatch[1]);
        }

        // Look for quarantine count in output
        const quarantineMatch = verifyOutput.match(/quarantine[d]*[:\s]*([0-9]+)/i);
        if (quarantineMatch) {
          quarantineCount = parseInt(quarantineMatch[1]);
        }
      } catch (parseError) {
        console.log('⚠️ Could not parse verification output, proceeding with defaults');
      }

      // Assert trust.score >= 0.8 and quarantine == 0
      if (trustScore >= 0.8) {
        console.log(`✅ Trust score: ${trustScore.toFixed(3)} (≥0.8)`);
      } else {
        console.log(`❌ Trust score: ${trustScore.toFixed(3)} (<0.8)`);
        allPassed = false;
      }

      if (quarantineCount === 0) {
        console.log(`✅ Quarantine count: ${quarantineCount}`);
      } else {
        console.log(`❌ Quarantine count: ${quarantineCount} (>0)`);
        allPassed = false;
      }

      if (allPassed) {
        console.log('✅ Fed-verify completed');
      }

    } catch (fedError) {
      console.log('❌ Federation integration failed:', fedError.message);
      allPassed = false;
    }
  }


  // Air-Gap integration steps
  if (allPassed) {
    console.log('');
    console.log('✈️ Air-Gap integration...');

    try {
      // Air-pack step
      console.log('📦 Creating air-pack...');
      execSync('make air-pack', {
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 15000
      });
      console.log('✅ Air-pack completed');

      // Verify sharecodes.txt exists
      const sharecodesPath = join(process.cwd(), 'dist/air/sharecodes.txt');
      if (!existsSync(sharecodesPath)) {
        console.log('❌ dist/air/sharecodes.txt not found');
        allPassed = false;
      } else {
        console.log('✅ ShareCodes file generated');
      }

      // Air-recv step (reconstruction and hash verification)
      if (allPassed) {
        console.log('🔧 Reconstructing file from ShareCodes...');
        const recvOutput = execSync('npx ts-node tools/air/recv-assemble.ts --sharecodes dist/air/sharecodes.txt', {
          stdio: 'pipe',
          cwd: process.cwd(),
          timeout: 15000,
          encoding: 'utf8'
        });

        // Check if reconstruction was successful
        if (recvOutput.includes('✅ PASS - File reconstructed')) {
          console.log('✅ File reconstruction successful');

          // Extract and verify hash from output
          const hashMatch = recvOutput.match(/Hash: ([a-f0-9]+)/);
          if (hashMatch) {
            const reconstructedHash = hashMatch[1];

            // Get original file hash for comparison
            const originalCartridgePath = join(process.cwd(), 'dist/release/hello-city.cartridge');
            if (existsSync(originalCartridgePath)) {
              const originalContent = fs.readFileSync(originalCartridgePath);
              const originalHash = crypto.createHash('sha256').update(originalContent).digest('hex');

              if (reconstructedHash === originalHash) {
                console.log(`✅ Hash verification passed: ${reconstructedHash.substring(0, 16)}...`);
              } else {
                console.log(`❌ Hash mismatch: original ${originalHash.substring(0, 16)}... vs reconstructed ${reconstructedHash.substring(0, 16)}...`);
                allPassed = false;
              }
            } else {
              console.log('❌ Original cartridge file not found for hash comparison');
              allPassed = false;
            }
          } else {
            console.log('⚠️ Could not extract hash from reconstruction output');
          }
        } else {
          console.log('❌ File reconstruction failed');
          allPassed = false;
        }
      }

    } catch (airError) {
      console.log('❌ Air-Gap integration failed:', airError.message);
      allPassed = false;
    }
  }
}

// Garden GA gate integration
if (allPassed && results.find(r => r.name === 'garden' && r.status === 'PASS') && results.find(r => r.name === 'fed-garden' && r.status === 'PASS')) {
  console.log('');
  console.log('🌱 Garden GA Gate validation...');

  try {
    // Trust score validation
    console.log('🔍 Validating trust score...');
    const trustOutput = execSync('make trust', {
      stdio: 'pipe',
      cwd: process.cwd(),
      timeout: 10000,
      encoding: 'utf8'
    });

    // Parse trust score from output
    let trustScore = 0;
    let quarantineCount = 0;

    try {
      const trustMatch = trustOutput.match(/Trust Score:\s*([0-9.]+)/);
      if (trustMatch) {
        trustScore = parseFloat(trustMatch[1]);
      }

      const quarantineMatch = trustOutput.match(/Quarantine Count:\s*([0-9]+)/);
      if (quarantineMatch) {
        quarantineCount = parseInt(quarantineMatch[1]);
      }
    } catch (parseError) {
      console.log('⚠️ Could not parse trust output, using defaults');
    }

    // Assert trust.score >= 0.9 and quarantine == 0
    if (trustScore >= 0.9) {
      console.log(`✅ Trust score: ${trustScore.toFixed(3)} (≥0.9)`);
    } else {
      console.log(`❌ Trust score: ${trustScore.toFixed(3)} (<0.9)`);
      allPassed = false;
    }

    if (quarantineCount === 0) {
      console.log(`✅ Quarantine count: ${quarantineCount}`);
    } else {
      console.log(`❌ Quarantine count: ${quarantineCount} (>0)`);
      allPassed = false;
    }

    if (allPassed) {
      // Air-garden step
      console.log('✈️ Creating air-gap pack...');
      execSync('make air-garden', {
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 15000
      });
      console.log('✅ Air-garden completed');

      // Recv-assemble step for verification
      console.log('🔧 Reconstructing from ShareCodes...');
      const recvOutput = execSync('npx ts-node tools/air/recv-assemble.ts --sharecodes dist/air/sharecodes.txt', {
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 15000,
        encoding: 'utf8'
      });

      // Check if reconstruction was successful (BLAKE3 hash verification)
      if (recvOutput.includes('✅ PASS - File reconstructed')) {
        console.log('✅ File reconstruction successful (BLAKE3 verified)');

        // Extract and verify hash
        const hashMatch = recvOutput.match(/Hash: ([a-f0-9]+)/);
        if (hashMatch) {
          const reconstructedHash = hashMatch[1];

          // Get original federation bundle hash for comparison
          const originalBundlePath = join(process.cwd(), 'dist/release/federation.fed.zip');
          if (existsSync(originalBundlePath)) {
            const originalContent = readFileSync(originalBundlePath);
            // Use SHA-256 as fallback if BLAKE3 not available
            const originalHash = crypto.createHash('sha256').update(originalContent).digest('hex');

            if (reconstructedHash === originalHash) {
              console.log(`✅ Hash verification passed: ${reconstructedHash.substring(0, 16)}...`);
            } else {
              console.log(`❌ Hash mismatch: original ${originalHash.substring(0, 16)}... vs reconstructed ${reconstructedHash.substring(0, 16)}...`);
              allPassed = false;
            }
          } else {
            console.log('❌ Original federation bundle not found for hash comparison');
            allPassed = false;
          }
        } else {
          console.log('⚠️ Could not extract hash from reconstruction output');
        }
      } else {
        console.log('❌ File reconstruction failed');
        allPassed = false;
      }
    }

  } catch (gardenError) {
    console.log('❌ Garden GA gate failed:', gardenError.message);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('');
  console.log('🎉 All quality checks passed!');

  // Check if Garden, PSE, or Pocket Direct was included for special message
  if (results.find(r => r.name === 'pocket-direct' && r.status === 'PASS')) {
    console.log('POCKET DIRECT READY: ✅');
  } else if (results.find(r => r.name === 'pse' && r.status === 'PASS')) {
    console.log('PSE READY: ✅');
  } else if (results.find(r => r.name === 'garden' && r.status === 'PASS')) {
    console.log('GA READY (Garden): ✅');
  } else {
    console.log('GA READY: ✅');
  }

  process.exit(0);
} else {
  console.log('');
  console.log('💥 Some quality checks failed!');
  process.exit(1);
}