# 🌱 100 Seeds Week - LIVE

## Quick Start

```bash
# Check your seed locally
npm run ck:validate path/to/seed.json

# Create cartridge + DSSE
npm run ck:bundle path/to/seed.json

# Submit PR with this title format:
# "Seed Proposal: <name> (PL-SEED-01)"
```

## Requirements

- ✅ Trust ≥95%
- ✅ DSSE envelope valid
- ✅ Size ≤80KB (seed), ≤100KB (total)
- ✅ Conformance ≥90%
- ✅ No BIOLOCK violations

## Seed Ideas (Compact & Novel)

### 1. **select-focus** (branch-aware router)
```json
{
  "name": "select-focus",
  "nodes": {
    "entry": {"op": "ENTER"},
    "select": {"op": "SELECT", "condition": "branch"},
    "focus": {"op": "FOCUS", "target": "$selected"},
    "merge": {"op": "MERGE"}
  }
}
```

### 2. **bounded-delay** (energy-saving debounce)
```json
{
  "name": "bounded-delay",
  "nodes": {
    "entry": {"op": "ENTER"},
    "delay": {"op": "DELAY", "bound": 100},
    "debounce": {"op": "FILTER", "rate": 0.1},
    "output": {"op": "EXIT"}
  }
}
```

### 3. **route-audit** (auto-receipts)
```json
{
  "name": "route-audit",
  "nodes": {
    "entry": {"op": "ENTER"},
    "route": {"op": "ROUTE"},
    "audit": {"op": "SIGN", "receipt": true},
    "merge": {"op": "MERGE"}
  }
}
```

### 4. **partition-rr** (fair round-robin)
```json
{
  "name": "partition-rr",
  "nodes": {
    "entry": {"op": "ENTER"},
    "partition": {"op": "SPLIT", "n": 3},
    "rr": {"op": "SCHEDULE", "policy": "round-robin"},
    "merge": {"op": "MERGE"}
  }
}
```

### 5. **scan-metrics** (threshold aggregator)
```json
{
  "name": "scan-metrics",
  "nodes": {
    "entry": {"op": "ENTER"},
    "scan": {"op": "SCAN", "window": 10},
    "threshold": {"op": "FILTER", "min": 0.5},
    "color": {"op": "ANNOTATE", "metric": true}
  }
}
```

## Badges for Your Seed

Add to your seed's README:

```markdown
![Trust](https://img.shields.io/badge/trust-%E2%89%A595%25-brightgreen)
![DSSE](https://img.shields.io/badge/dsse-verified-brightgreen)
![Conformance](https://img.shields.io/badge/conformance-%E2%89%A590%25-brightgreen)
![100 Seeds Week](https://pure-lambda.org/dist/badges/100-seeds-week.svg)
```

## Response Templates (for Stewards)

### ✅ All-Green
```
Thanks! ✅ DSSE verified • ✅ Conformance ≥90% • ✅ Trust ≥95% • Size OK.
Labels: contrib:seed • trust:high • ready-for-review
Next: steward:policy will give final ACK within 24h. 🎯
```

### 🟡 Trust 80-94%
```
Thanks! DSSE OK. Conformance is fine, but Trust=<X>%.
Please run locally:
  npm run ck:validate path/to/seed.json
Tips to raise trust:
  • reduce size (unused fields)
  • ensure XIDv2 uniqueness
  • add minimal docs (pattern intent)
Label: trust:medium • awaiting-updates
```

### 🔴 DSSE Missing
```
We couldn't verify the DSSE envelope.
Please generate offline:
  npm run ck:bundle path/to/seed.json
  (this will create envelope + cartridge)
Then push both files. Label: dsse:fix-needed
```

### ⛔ BIOLOCK Triggered
```
BIOLOCK policy flagged unsafe tokens.
Your PR is quarantined for steward review.
Please remove dual-use details and resubmit. Label: policy:biolock
```

## Daily Operations

### Morning (Stewards)
```bash
node scripts/scoreboard/update.mjs
node scripts/field/ingest.mjs out/field/*.json
node scripts/fed/trust.mjs --print
```

### Evening (Stewards)
```bash
node scripts/badges/mint.mjs --delta
make site
```

### Emergency Throttle
```bash
# If trust <95% twice
yq -i '.daily_burst=2' policies/fed-rate.toml
```

## Links

- [Live Scoreboard](/docs/scoreboard/index.html)
- [Steward Roster](/docs/stewards/ROSTER.md)
- [Field Kiosk](/docs/otm/kiosk.html)
- [Trust Dashboard](/trust-score.json)

---

**Week 38** • Trust 96.3% • DSSE 100% • Seeds 0/100