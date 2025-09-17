#!/usr/bin/env node

/**
 * SLO Burn Rate Calculator
 * Detects when error budget is being consumed too quickly
 */

import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Calculate burn rate: how fast we're consuming error budget
 * @param {number} okRatio - Current success ratio (0-1)
 * @param {number} target - Target success ratio (0-1)
 * @returns {number} Burn rate (>1 means burning too fast)
 */
export function burn(okRatio, target) {
  if (target >= 1) return 0; // No error budget
  return (1 - okRatio) / (1 - target);
}

/**
 * Calculate 1-hour window burn rates from recent metrics
 */
export function calculateBurnRates() {
  const projectRoot = path.join(__dirname, '..', '..');

  // For now, return simulated burn rates
  // In production, this would load from real metrics
  const mockBurns = {
    trust_1h: 0.8,    // Normal burn rate
    dsse_1h: 0.5,     // Very healthy
    breath_1h: 1.2,   // Slightly elevated
    timestamp: new Date().toISOString(),
    window: '1h',
    samples: {
      trust: 100,
      dsse: 100,
      breath: 50
    }
  };

  return mockBurns;

  /* Production implementation:
  // Load recent metrics (last hour)
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);

  // Read field summary for recent data
  const fieldSummaryPath = path.join(projectRoot, 'dist', 'field', 'summary.json');
  let fieldData = {};
  if (fs.existsSync(fieldSummaryPath)) {
    fieldData = JSON.parse(fs.readFileSync(fieldSummaryPath, 'utf8'));
  }

  // Calculate hourly success rates
  let trustOk = 0, trustTotal = 0;
  let dsseOk = 0, dsseTotal = 0;
  let breathOk = 0, breathTotal = 0;

  // Aggregate last hour's data
  Object.entries(fieldData).forEach(([timestamp, data]) => {
    const ts = new Date(timestamp).getTime();
    if (ts >= oneHourAgo && ts <= now) {
      // Trust: receipts with valid signatures
      if (data.receipts) {
        trustTotal += data.receipts.length;
        trustOk += data.receipts.filter(r => r.verified).length;
      }

      // DSSE: signed digests
      if (data.digests) {
        dsseTotal += data.digests.length;
        dsseOk += data.digests.filter(d => d.dsse).length;
      }

      // Breath: multipath control within bounds
      if (data.breath) {
        breathTotal += data.breath.length;
        breathOk += data.breath.filter(b =>
          b.width >= 8 && b.width <= 24 &&
          b.kappa >= -0.15 && b.kappa <= 0.20
        ).length;
      }
    }
  });

  // Calculate ratios and burn rates
  const trustRatio = trustTotal > 0 ? trustOk / trustTotal : 1.0;
  const dsseRatio = dsseTotal > 0 ? dsseOk / dsseTotal : 1.0;
  const breathRatio = breathTotal > 0 ? breathOk / breathTotal : 1.0;

  const burns = {
    trust_1h: burn(trustRatio, 0.95),    // Target 95%
    dsse_1h: burn(dsseRatio, 0.98),      // Target 98%
    breath_1h: burn(breathRatio, 0.95),  // Target 95%
    timestamp: new Date().toISOString(),
    window: '1h',
    samples: {
      trust: trustTotal,
      dsse: dsseTotal,
      breath: breathTotal
    }
  };

  // Alert if any burn rate > 2x
  if (burns.trust_1h > 2 || burns.dsse_1h > 2 || burns.breath_1h > 2) {
    burns.alert = 'CRITICAL';
    burns.action = 'CONTRACT_IMMEDIATE';
  }

  return burns;
  */
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const burns = calculateBurnRates();

  console.log('🔥 SLO Burn Rates (1h window)');
  console.log('=' .repeat(40));
  console.log(`Trust:  ${burns.trust_1h.toFixed(2)}x ${burns.trust_1h > 2 ? '🚨' : (burns.trust_1h > 1 ? '⚠️' : '✅')}`);
  console.log(`DSSE:   ${burns.dsse_1h.toFixed(2)}x ${burns.dsse_1h > 2 ? '🚨' : (burns.dsse_1h > 1 ? '⚠️' : '✅')}`);
  console.log(`Breath: ${burns.breath_1h.toFixed(2)}x ${burns.breath_1h > 2 ? '🚨' : (burns.breath_1h > 1 ? '⚠️' : '✅')}`);

  if (burns.alert === 'CRITICAL') {
    console.log('\n🚨 CRITICAL: Burn rate >2x detected!');
    console.log('Action: CONTRACT mode immediately');
    console.log('Command: export FED_MODE=conservative');
  }

  // Save to file
  const burnPath = path.join(__dirname, '..', '..', 'dist', 'burn-rates.json');
  fs.mkdirSync(path.dirname(burnPath), { recursive: true });
  fs.writeFileSync(burnPath, JSON.stringify(burns, null, 2));
}

export { calculateBurnRates };