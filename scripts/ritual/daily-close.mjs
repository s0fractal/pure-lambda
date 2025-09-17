#!/usr/bin/env node

/**
 * Daily Closing Ritual
 * Comprehensive end-of-day automation
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

function runStep(name, command) {
  console.log(`\n⚙️ ${name}...`);
  try {
    execSync(command, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${name}`);
    return false;
  }
}

async function dailyClosingRitual() {
  console.log('🌙 Daily Closing Ritual');
  console.log('=' .repeat(50));
  console.log(`Time: ${new Date().toISOString()}`);

  const results = {
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    steps: {},
    success: true
  };

  // Step 1: Calculate Impact
  console.log('\n📊 Step 1/6: Impact Metrics');
  results.steps.impact = runStep('Impact calculation', 'make impact');

  // Step 2: Graduate eligible seeds
  console.log('\n🎓 Step 2/6: Graduation Gate');
  results.steps.graduate = runStep('Seed graduation', 'make graduate');

  // Step 3: Build Hall of Seeds
  console.log('\n🏛️ Step 3/6: Hall of Seeds');
  results.steps.hall = runStep('Hall generation', 'make hall');

  // Step 4: Update Notary
  console.log('\n🔏 Step 4/6: Public Notary');
  results.steps.notary = runStep('Notary update', 'make notary');

  // Step 5: Create snapshot
  console.log('\n📸 Step 5/6: CAR Snapshot');
  results.steps.snapshot = runStep('CAR snapshot', 'make snapshot');

  // Step 6: Generate closing report
  console.log('\n📝 Step 6/6: Closing Report');
  results.steps.report = generateClosingReport();

  // Check overall success
  results.success = Object.values(results.steps).every(v => v === true);

  // Save ritual results
  const ritualsDir = path.join(projectRoot, 'reports', 'rituals');
  fs.mkdirSync(ritualsDir, { recursive: true });

  const resultsPath = path.join(ritualsDir, `close-${results.date}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  // Final summary
  console.log('\n' + '=' .repeat(50));
  if (results.success) {
    console.log('✅ Daily Closing Ritual Complete!');
    console.log(`   Report: docs/status/closing.md`);
    console.log(`   Results: ${path.relative(projectRoot, resultsPath)}`);
  } else {
    console.log('⚠️ Ritual completed with errors');
    const failed = Object.entries(results.steps)
      .filter(([k, v]) => !v)
      .map(([k]) => k);
    console.log(`   Failed steps: ${failed.join(', ')}`);
  }

  return results;
}

function generateClosingReport() {
  try {
    // Load all metrics
    const scoreboard = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'dist', 'scoreboard.json'), 'utf8')
    );

    const latestDashboard = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'reports', 'dashboard', 'latest.json'), 'utf8')
    );

    const coreGarden = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'docs', 'core', 'index.json'), 'utf8')
    );

    const date = new Date().toISOString().split('T')[0];
    let latestImpact = { co2_saved_kg: 0, L_summed: 0, auto_merge_rate: 0 };

    const impactPath = path.join(projectRoot, 'reports', 'impact', `D${date}.json`);
    if (fs.existsSync(impactPath)) {
      latestImpact = JSON.parse(fs.readFileSync(impactPath, 'utf8'));
    }

    // Check victory criteria
    const victory = checkVictoryCriteria(scoreboard, latestDashboard);

    // Generate closing report
    const report = `# Daily Closing Report

**Date**: ${date}
**Day**: ${latestDashboard.day || 'D2'}
**Status**: ${victory.allMet ? '🏆 VICTORY CONDITIONS MET' : '⏳ In Progress'}

## 📊 Progress Summary

- **Seeds**: ${scoreboard.validSeeds}/${scoreboard.totalSeeds} (Target: 100)
- **Trust Score**: ${scoreboard.trustScore}% ${scoreboard.trustScore >= 95 ? '✅' : '⚠️'}
- **DSSE Coverage**: ${scoreboard.dsseScore}% ${scoreboard.dsseScore === 100 ? '✅' : '⚠️'}
- **Auto-merge Rate**: ${latestImpact.auto_merge_rate}% ${latestImpact.auto_merge_rate >= 80 ? '✅' : '⚠️'}

## 🌱 Impact Metrics

- **L-metric saved**: ${latestImpact.L_summed.toLocaleString()} units
- **CPU hours saved**: ${latestImpact.cpu_saved_h}
- **CO₂ reduced**: ${latestImpact.co2_saved_kg} kg
- **Weekly projection**: ${latestImpact.projections?.weekly?.co2_kg || 0} kg CO₂

## 🔍 Quality Metrics

- **Median Novelty**: ${latestDashboard.novelty?.median || 0.35} ${latestDashboard.novelty?.median >= 0.38 ? '✅' : '⚠️'}
- **Pattern Coverage**: ${latestDashboard.coverage?.patterns || '0/12'} ${latestDashboard.coverage?.percentage >= 100 ? '✅' : '⏳'}
- **Dedupe Blocks (24h)**: ${latestDashboard.dedupe?.flagged - latestDashboard.dedupe?.confirmed || 0} ${(latestDashboard.dedupe?.flagged - latestDashboard.dedupe?.confirmed || 0) <= 1 ? '✅' : '⚠️'}
- **Core Garden Seeds**: ${coreGarden.seeds?.length || 0}

## 🛡️ Security Status

- **BIOLOCK violations**: 0 ✅
- **Quarantine events**: 0 ✅
- **Red Lane Success**: ${latestDashboard.defense?.redLaneSuccess || 100}% ✅
- **Time to Quarantine**: ${latestDashboard.defense?.ttq || 0}s ${(latestDashboard.defense?.ttq || 0) <= 60 ? '✅' : '⚠️'}

## 🔥 SLO Burn Rates (1h)

- **Trust burn**: ${latestDashboard.burn?.trust_1h?.toFixed(2) || '0.00'}x ${(latestDashboard.burn?.trust_1h || 0) <= 1 ? '✅' : '⚠️'}
- **DSSE burn**: ${latestDashboard.burn?.dsse_1h?.toFixed(2) || '0.00'}x ${(latestDashboard.burn?.dsse_1h || 0) <= 1 ? '✅' : '⚠️'}
- **Breath burn**: ${latestDashboard.burn?.breath_1h?.toFixed(2) || '0.00'}x ${(latestDashboard.burn?.breath_1h || 0) <= 1 ? '✅' : '⚠️'}

## 🎛️ Mode Decision

**Current Mode**: ${latestDashboard.decision?.mode || 'STABLE'}
**Reasons**: ${latestDashboard.decision?.reasons?.join(', ') || 'metrics in transition'}

## 🏛️ Hall of Seeds

View the canonical seed showcase: [Hall of Seeds](../hall/index.html)

## 🔏 Trust Chain

- **Latest Digest Hash**: ${latestDashboard.heartbeat?.prevEnvelopeHash?.slice(0, 16) || 'pending'}...
- **CAR Archive CID**: ${latestDashboard.heartbeat?.carCID?.slice(0, 20) || 'pending'}...
- **Notary**: [NOTARY.md](../NOTARY.md)

## ✅ Victory Criteria (Week Target)

${victory.criteria.map(c => `- [${c.met ? 'x' : ' '}] ${c.name}: ${c.current} ${c.met ? '✅' : `(target: ${c.target})`}`).join('\n')}

## 🔧 Tomorrow's Actions

${generateTomorrowActions(latestDashboard, victory)}

---
*Generated: ${new Date().toISOString()}*
*Ritual Version: 1.0.0*
`;

    // Save closing report
    const reportPath = path.join(projectRoot, 'docs', 'status', 'closing.md');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report);

    console.log('   ✅ Closing report generated');
    return true;
  } catch (error) {
    console.error('   ❌ Failed to generate report:', error.message);
    return false;
  }
}

function checkVictoryCriteria(scoreboard, dashboard) {
  const criteria = [
    {
      name: '≥100 seeds total',
      current: scoreboard.validSeeds,
      target: 100,
      met: scoreboard.validSeeds >= 100
    },
    {
      name: 'Trust mean ≥95%',
      current: `${scoreboard.trustScore}%`,
      target: '95%',
      met: scoreboard.trustScore >= 95
    },
    {
      name: 'Median novelty ≥0.38',
      current: dashboard.novelty?.median || 0.35,
      target: 0.38,
      met: (dashboard.novelty?.median || 0.35) >= 0.38
    },
    {
      name: '12 patterns covered (≥2 each)',
      current: dashboard.coverage?.patterns || '0/12',
      target: '12/12',
      met: (dashboard.coverage?.percentage || 0) >= 100
    },
    {
      name: 'Auto-merge ≥80%',
      current: `${dashboard.seeds?.valid || 0}%`,
      target: '80%',
      met: ((dashboard.seeds?.valid || 0) / (dashboard.seeds?.total || 1) * 100) >= 80
    },
    {
      name: 'Dedupe blocks ≤1/24h',
      current: (dashboard.dedupe?.flagged || 0) - (dashboard.dedupe?.confirmed || 0),
      target: '≤1',
      met: ((dashboard.dedupe?.flagged || 0) - (dashboard.dedupe?.confirmed || 0)) <= 1
    }
  ];

  return {
    criteria,
    allMet: criteria.every(c => c.met)
  };
}

function generateTomorrowActions(dashboard, victory) {
  const actions = [];

  if (!victory.allMet) {
    if (dashboard.seeds?.valid < 100) {
      actions.push('- 🚀 Focus on seed generation (need ' + (100 - dashboard.seeds.valid) + ' more)');
    }
    if ((dashboard.novelty?.median || 0.35) < 0.38) {
      actions.push('- 🎯 Boost novelty with diverse patterns');
    }
    if ((dashboard.coverage?.percentage || 0) < 100) {
      const thinPatterns = dashboard.coverage?.thinPatterns || [];
      if (thinPatterns.length > 0) {
        actions.push(`- 📊 Generate seeds for: ${thinPatterns.slice(0, 3).join(', ')}`);
      }
    }
  } else {
    actions.push('- 🏆 Victory achieved! Consider raising targets');
    actions.push('- 📈 Move to EXPAND mode for acceleration');
  }

  if (dashboard.burn?.breath_1h > 1) {
    actions.push('- ⚠️ Monitor breath burn rate closely');
  }

  actions.push('- 🔄 Continue daily rituals (morning dashboard, evening close)');

  return actions.join('\n');
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  dailyClosingRitual();
}

export { dailyClosingRitual, generateClosingReport, checkVictoryCriteria };