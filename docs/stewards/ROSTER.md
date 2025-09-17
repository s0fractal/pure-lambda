# Steward Roster - Week 38

**Period:** 2025-09-15 → 2025-09-21

## On-Call Schedule

### Primary Roles

| Role | Steward | Label | Responsibilities |
|------|---------|-------|-----------------|
| **Intake** | @steward-intake | `steward:intake` | Triage, labels, first response ≤6h |
| **Policy** | @steward-policy | `steward:policy` | BIOLOCK enforcement, quarantine review |
| **DSSE** | @steward-dsse | `steward:dsse` | Signatures, keys, re-signing if needed |

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
4. **Emergency:** Freeze protocol (`scripts/ops/freeze.mjs`)

## Quick Commands

```bash
# Check current on-call
node scripts/stewards/roster.mjs --current

# Page steward
node scripts/stewards/page.mjs --role intake --message "New seed needs triage"

# Handoff checklist
node scripts/stewards/handoff.mjs --from intake-1 --to intake-2
```

## Metrics Dashboard

- [Trust Score](../trust-score.json)
- [Conformance](../conformance.json)
- [Field Trials](../dist/field/summary.json)
- [Federation Index](../dist/fed/index.json)

## Notes

- Stewards have `steward_exempt=true` for rate limits
- Use quarantine for any suspicious activity
- BIOLOCK violations = immediate quarantine + review
- Weekly retrospective: Sunday 20:00 UTC

---
*Generated: 2025-09-17T12:18:37.457Z*
