#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..');

/**
 * Auto-merge lane for high-quality seeds
 */
function checkAutoMerge(pr) {
  console.log('🚦 Auto-Merge Lane Check');
  console.log('=' .repeat(40));

  const criteria = {
    trust: pr.trust >= 0.98,
    dsse: pr.dsse === true,
    conformance: pr.conformance >= 0.95,
    biolock: pr.biolock === 0,
    sizeOk: pr.size <= 80000,
    novelty: pr.novelty >= 0.35
  };

  const scores = {
    trust: pr.trust * 100,
    dsse: pr.dsse ? 100 : 0,
    conformance: pr.conformance * 100,
    biolock: pr.biolock === 0 ? 'PASS' : 'FAIL',
    size: pr.size,
    novelty: pr.novelty * 100
  };

  console.log('\n📊 PR Analysis:');
  console.log(`   Trust: ${scores.trust.toFixed(1)}% ${criteria.trust ? '✅' : '❌'} (≥98%)`);
  console.log(`   DSSE: ${scores.dsse}% ${criteria.dsse ? '✅' : '❌'} (100%)`);
  console.log(`   Conformance: ${scores.conformance.toFixed(1)}% ${criteria.conformance ? '✅' : '❌'} (≥95%)`);
  console.log(`   BIOLOCK: ${scores.biolock} ${criteria.biolock ? '✅' : '❌'} (=0)`);
  console.log(`   Size: ${(scores.size / 1024).toFixed(1)}KB ${criteria.sizeOk ? '✅' : '❌'} (≤80KB)`);
  console.log(`   Novelty: ${scores.novelty.toFixed(0)}% ${criteria.novelty ? '✅' : '❌'} (≥35%)`);

  const allGreen = Object.values(criteria).every(v => v === true);

  if (allGreen) {
    console.log('\n✅ AUTO-MERGE: GREEN LANE');
    console.log('   Label: auto-merge:green');
    console.log('   Action: Ready for steward 👍');
    console.log('   Command: gh pr merge --squash (after 👍)');

    return {
      autoMerge: true,
      label: 'auto-merge:green',
      message: `✅ AUTO-MERGE QUALIFIED ✅

All criteria met:
• Trust: ${(pr.trust * 100).toFixed(1)}% ≥98%
• DSSE: Valid
• Conformance: ${(pr.conformance * 100).toFixed(1)}% ≥95%
• BIOLOCK: Clean
• Size: ${(pr.size / 1024).toFixed(1)}KB ≤80KB

Ready for steward 👍 → auto-merge`
    };
  } else {
    const failedCriteria = Object.entries(criteria)
      .filter(([_, passed]) => !passed)
      .map(([name, _]) => name);

    console.log('\n⚠️ AUTO-MERGE: NOT ELIGIBLE');
    console.log(`   Failed: ${failedCriteria.join(', ')}`);

    // Determine triage action
    let action = '';
    if (!criteria.biolock) {
      action = 'quarantine';
    } else if (pr.trust < 0.80) {
      action = 'reject';
    } else if (pr.trust < 0.95) {
      action = 'needs-fix';
    } else {
      action = 'review';
    }

    return {
      autoMerge: false,
      label: `triage:${action}`,
      message: `Does not meet auto-merge criteria. Failed: ${failedCriteria.join(', ')}`
    };
  }
}

/**
 * Batch check multiple PRs
 */
function batchCheck(prs) {
  const results = {
    autoMerge: [],
    needsFix: [],
    reject: [],
    quarantine: []
  };

  for (const pr of prs) {
    const result = checkAutoMerge(pr);

    if (result.autoMerge) {
      results.autoMerge.push(pr);
    } else if (result.label === 'triage:quarantine') {
      results.quarantine.push(pr);
    } else if (result.label === 'triage:reject') {
      results.reject.push(pr);
    } else {
      results.needsFix.push(pr);
    }
  }

  console.log('\n📈 Batch Results:');
  console.log(`   Auto-merge eligible: ${results.autoMerge.length}`);
  console.log(`   Needs fix: ${results.needsFix.length}`);
  console.log(`   Reject: ${results.reject.length}`);
  console.log(`   Quarantine: ${results.quarantine.length}`);

  return results;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  // Mock PR for testing
  const mockPR = {
    number: 201,
    title: 'Seed Proposal: advanced-pattern (PL-SEED-01)',
    trust: 0.98,
    dsse: true,
    conformance: 0.96,
    biolock: 0,
    size: 45000,
    novelty: 0.48
  };

  const result = checkAutoMerge(mockPR);

  if (result.autoMerge) {
    console.log('\n🎉 PR #' + mockPR.number + ' qualifies for auto-merge!');
  } else {
    console.log('\n📝 PR #' + mockPR.number + ' requires: ' + result.label);
  }
}

export { checkAutoMerge, batchCheck };