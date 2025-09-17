#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..');

/**
 * Auto-triage PR system
 */
function autoTriage() {
  console.log('🤖 Auto-Triage System');
  console.log('=' .repeat(40));

  // Response templates
  const templates = {
    'all-green': {
      labels: ['contrib:seed', 'trust:high', 'ready-for-review'],
      message: `Thanks! ✅ DSSE verified • ✅ Conformance ≥90% • ✅ Trust ≥95% • Size OK.
Labels: contrib:seed • trust:high • ready-for-review
Next: steward:policy will give final ACK within 24h. 🎯`
    },
    'trust-medium': {
      labels: ['trust:medium', 'awaiting-updates'],
      message: `Thanks! DSSE OK. Conformance is fine, but Trust=<X>%.
Please run locally: npm run ck:validate path/to/seed.json
Tips: reduce size, ensure XIDv2 uniqueness, add minimal docs.
Label: trust:medium • awaiting-updates`
    },
    'dsse-missing': {
      labels: ['dsse:fix-needed'],
      message: `We couldn't verify the DSSE envelope.
Please generate offline: npm run ck:bundle path/to/seed.json
Then push both files. Label: dsse:fix-needed`
    },
    'biolock': {
      labels: ['policy:biolock', 'quarantine'],
      message: `BIOLOCK policy flagged unsafe tokens.
Your PR is quarantined for steward review.
Please remove dual-use details and resubmit. Label: policy:biolock`
    }
  };

  // Simulate PR analysis (in production would use GitHub API)
  const mockAnalysis = {
    trust: 0.96,
    dsse: true,
    conformance: 0.92,
    size: 45000,
    biolock: false,
    novelty: 0.43
  };

  // Determine response
  let response = null;

  if (mockAnalysis.biolock) {
    response = templates['biolock'];
  } else if (!mockAnalysis.dsse) {
    response = templates['dsse-missing'];
  } else if (mockAnalysis.trust < 0.95) {
    response = templates['trust-medium'];
    response.message = response.message.replace('<X>', (mockAnalysis.trust * 100).toFixed(1));
  } else {
    response = templates['all-green'];
  }

  console.log('\n📋 Analysis:');
  console.log(`   Trust: ${(mockAnalysis.trust * 100).toFixed(1)}%`);
  console.log(`   DSSE: ${mockAnalysis.dsse ? '✅' : '❌'}`);
  console.log(`   Conformance: ${(mockAnalysis.conformance * 100).toFixed(1)}%`);
  console.log(`   Size: ${(mockAnalysis.size / 1024).toFixed(1)}KB`);
  console.log(`   BIOLOCK: ${mockAnalysis.biolock ? '⛔' : '✅'}`);
  console.log(`   Novelty: ${(mockAnalysis.novelty * 100).toFixed(0)}%`);

  console.log('\n🏷️ Labels to apply:');
  console.log(`   ${response.labels.join(', ')}`);

  console.log('\n💬 Response:');
  console.log(response.message);

  // Save triage log
  const triageLog = {
    timestamp: new Date().toISOString(),
    analysis: mockAnalysis,
    response: response.labels,
    template: Object.keys(templates).find(k => templates[k] === response)
  };

  const logPath = path.join(projectRoot, 'reports', 'triage', `${Date.now()}.json`);
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  fs.writeFileSync(logPath, JSON.stringify(triageLog, null, 2));

  return response;
}

// Monitor mode
function monitorMode() {
  console.log('👀 Monitoring PRs (every 5 min)...\n');

  const check = () => {
    console.log(`[${new Date().toISOString()}] Checking PRs...`);
    autoTriage();
  };

  check();
  setInterval(check, 5 * 60 * 1000); // 5 minutes
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.includes('--monitor')) {
    monitorMode();
  } else {
    autoTriage();
  }
}

export { autoTriage };