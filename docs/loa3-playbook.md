# 🚀 LoA3 Production Playbook

## Current Status
- ✅ **Coverage**: 12/12 patterns (REAL seeds, not fake!)
- ✅ **Trust**: 96.3%
- ✅ **DSSE**: 100%
- ✅ **LoA**: 3 (guarded autonomy)
- ⏰ **Gate**: HOLD until 04:01 UTC (cooldown)
- ✅ **GitHub Secrets**: Configured (PL_ED25519_SECRET, PL_DID)
- ✅ **merge-proof**: 4 seeds (Church-Rosser ready)

## Pattern Coverage (All ✅)
- select-focus: 2 seeds
- scan-metrics: 2 seeds
- bounded-delay: 2 seeds
- partition-rr: 2 seeds
- route-audit: 2 seeds
- split-metric-select: 2 seeds
- delay-scan-smoother: 2 seeds
- select-tee: 2 seeds
- bounded-partition: 2 seeds
- merge-proof-lite: 2 seeds
- **merge-proof: 4 seeds** (confluence verified)
- branch-stress: 2 seeds

## T+0: When Cooldown Expires (04:01 UTC)

```bash
# 1) Refresh metrics (must be <30min fresh)
make metrics-refresh

# 2) Quick gate check
node -e 'let d=require("./reports/dashboard/latest.json");
let ok=((d.trust?.current||d.trust?.score||0)>=96.2 &&
        (d.dsse?.current||d.dsse?.coverage||0)===100 &&
        (d.dedupe?.blocks24h||99)<=1 &&
        (d.burn?.breath_1h||9)<2);
console.log(ok?"✅ GATE: GO":"⏸️ GATE: HOLD")'

# 3) Dry-run canary (no changes)
DRY_RUN=1 EXPAND_MODE=canary make expand-lite-auto

# 4) Real canary: Stage 1 (+1%)
EXPAND_MODE=canary make expand-lite-auto
```

## T+30min: Observation Period

```bash
# Check stability and regret
make postverify

# If PASS → Stage 2 (+2%)
EXPAND_MODE=canary make expand-lite-auto
```

## Monitoring & Audit

```bash
# Gate status + reasons
cat reports/dashboard/gate.json | jq '.'

# Latest oracle decision with explanation
tail -n1 receipts/ops/*.json

# Real coverage matrix (verify 12/12 holds)
jq -r '.coverage.patterns' reports/dashboard/latest.json

# Shadow hit rate
cat reports/autonomy/shadow.csv | tail -5

# System health
make go-live
```

## Emergency Controls

```bash
make contract-lite    # -3% immediate rollback
make loa3-demote     # Back to LoA2
make ops-freeze      # Full stop
```

## Daily Rituals

### Morning (09:00 UTC)
```bash
make expand-check       # Check dedupe blocks & novelty
make scoreboard-update  # Update trust & DSSE
make queue-report       # Check processing queue
```

### Evening (21:00 UTC)
```bash
make breath-slo        # Check multipath control
make coverage-badge    # Update pattern coverage
make red-lane          # Test defenses (once daily)
```

## Key Limits & Guards
- **Epsilon limit**: ±10% total
- **24h limit**: +6% max without quorum
- **Cooldown**: 6h between expansions
- **Staleness**: 30min max metric age
- **Hysteresis**: Trust ON@96.2%, OFF@95.5%

## GitHub Actions (Auto-running daily)
- `daily-digest.yml` - Pattern coverage & metrics
- `daily-signed-digest.yml` - DSSE attestations
- `daily-snapshot.yml` - System state backup
- `expand-lite.yml` - Manual expansion trigger
- `expand-lite-rehearsal.yml` - Dry-run testing

## Success Criteria
✅ All 12 promotion criteria satisfied
✅ No demotion triggers active
✅ Shadow hit rate > 85%
✅ Regret < 3% avg, < 7% p95
✅ All safety systems operational

---
*System ready for full autonomous operation after cooldown expires*
*Generated: 2025-09-17T22:30:00Z*