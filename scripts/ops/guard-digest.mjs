#!/usr/bin/env node

import fs from 'fs';

function extractMetrics() {
  // Try to read from trust.json first
  try {
    const trustData = JSON.parse(fs.readFileSync('dist/trust.json', 'utf8'));
    return {
      trust: trustData.score ? trustData.score * 100 : null,
      dsse: trustData.components?.dsse ? trustData.components.dsse * 100 : null
    };
  } catch (e) {
    console.log('📊 trust.json not available, parsing daily.md...');
  }

  // Fallback to parsing daily.md
  try {
    const dailyContent = fs.readFileSync('docs/status/daily.md', 'utf8');
    const trustMatch = dailyContent.match(/Trust:\s*([\d.]+)%/i);
    const dsseMatch = dailyContent.match(/DSSE:\s*(\d+)%/i);

    return {
      trust: trustMatch ? parseFloat(trustMatch[1]) : null,
      dsse: dsseMatch ? parseFloat(dsseMatch[1]) : null
    };
  } catch (e) {
    console.warn('⚠️ Could not read metrics from daily.md');
    return { trust: null, dsse: null };
  }
}

async function guardDigest() {
  try {
    console.log('🚨 Guard: checking digest metrics...');

    const { trust, dsse } = extractMetrics();

    console.log(`📊 Current metrics: Trust=${trust ?? 'n/a'}% DSSE=${dsse ?? 'n/a'}%`);

    // Check thresholds
    const trustBad = trust !== null && trust < 95;
    const dsseBad = dsse !== null && dsse < 100;

    if (trustBad || dsseBad) {
      console.error('🚨 ANOMALY DETECTED:');
      if (trustBad) console.error(`  - Trust score too low: ${trust}% < 95%`);
      if (dsseBad) console.error(`  - DSSE coverage incomplete: ${dsse}% < 100%`);

      console.log('🛑 Triggering emergency freeze...');

      // Try to call freeze script
      try {
        const { execSync } = await import('node:child_process');
        execSync('node scripts/ops/freeze.mjs', { stdio: 'inherit' });
        console.log('✅ Emergency freeze activated');
      } catch (e) {
        console.error('❌ Failed to execute freeze script:', e.message);
        // Create freeze marker file as fallback
        fs.writeFileSync('EMERGENCY_FREEZE', JSON.stringify({
          reason: 'digest-guard-anomaly',
          timestamp: new Date().toISOString(),
          metrics: { trust, dsse }
        }, null, 2));
        console.log('✅ Emergency freeze marker created');
      }

      process.exit(1);
    }

    console.log('✅ Guard: all metrics within acceptable thresholds');

  } catch (error) {
    console.error('❌ Guard failed:', error.message);
    process.exit(1);
  }
}

guardDigest();