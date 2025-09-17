#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * Generate steward roster for the week
 */
function generateRoster(options = {}) {
  const weekNumber = options.week || getWeekNumber();
  const startDate = getWeekStart();
  const endDate = getWeekEnd();

  const roster = `# Steward Roster - Week ${weekNumber}

**Period:** ${startDate.toISOString().split('T')[0]} → ${endDate.toISOString().split('T')[0]}

## On-Call Schedule

### Primary Roles

| Role | Steward | Label | Responsibilities |
|------|---------|-------|-----------------|
| **Intake** | @steward-intake | \`steward:intake\` | Triage, labels, first response ≤6h |
| **Policy** | @steward-policy | \`steward:policy\` | BIOLOCK enforcement, quarantine review |
| **DSSE** | @steward-dsse | \`steward:dsse\` | Signatures, keys, re-signing if needed |

### Rotation Schedule

| Day | Intake | Policy | DSSE |
|-----|--------|--------|------|
| Mon | intake-1 | policy-1 | dsse-1 |
| Tue | intake-1 | policy-1 | dsse-1 |
| Wed | intake-2 | policy-1 | dsse-2 |
| Thu | intake-2 | policy-2 | dsse-2 |
| Fri | intake-3 | policy-2 | dsse-1 |
| Sat | intake-3 | policy-1 | dsse-2 |
| Sun | intake-1 | policy-2 | dsse-1 |

## SLA Targets

- **First Response:** p95 ≤ 6 hours
- **Review:** p95 ≤ 24 hours
- **Merge Decision:** p95 ≤ 48 hours
- **BIOLOCK Review:** p100 ≤ 2 hours (critical)

## Escalation Path

1. **Level 1:** Current on-call steward
2. **Level 2:** Backup steward (next in rotation)
3. **Level 3:** All stewards + maintainer
4. **Emergency:** Freeze protocol (\`scripts/ops/freeze.mjs\`)

## Quick Commands

\`\`\`bash
# Check current on-call
node scripts/stewards/roster.mjs --current

# Page steward
node scripts/stewards/page.mjs --role intake --message "New seed needs triage"

# Handoff checklist
node scripts/stewards/handoff.mjs --from intake-1 --to intake-2
\`\`\`

## Metrics Dashboard

- [Trust Score](../trust-score.json)
- [Conformance](../conformance.json)
- [Field Trials](../dist/field/summary.json)
- [Federation Index](../dist/fed/index.json)

## Notes

- Stewards have \`steward_exempt=true\` for rate limits
- Use quarantine for any suspicious activity
- BIOLOCK violations = immediate quarantine + review
- Weekly retrospective: Sunday 20:00 UTC

---
*Generated: ${new Date().toISOString()}*
`;

  // Write roster
  const rosterPath = path.join(projectRoot, 'docs', 'stewards', 'ROSTER.md');
  const dir = path.dirname(rosterPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(rosterPath, roster);

  console.log('📋 Steward Roster Generated');
  console.log('=' .repeat(40));
  console.log(`Week: ${weekNumber}`);
  console.log(`Period: ${startDate.toISOString().split('T')[0]} → ${endDate.toISOString().split('T')[0]}`);
  console.log(`Output: ${rosterPath}`);

  return roster;
}

function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff));
}

function getWeekEnd() {
  const start = getWeekStart();
  return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {};

  if (args.includes('--week')) {
    options.week = getWeekNumber();
  }

  if (args.includes('--current')) {
    console.log('Current on-call: steward:intake');
    process.exit(0);
  }

  generateRoster(options);
}

export { generateRoster };