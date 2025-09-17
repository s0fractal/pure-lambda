# LoA3 Operational Checklist

## ✅ Current Status (2025-09-17T20:16Z)
- [x] LoA3 Promoted (level=3, apply=true, mode=guarded)
- [x] Coverage 12/12 patterns
- [x] Green Gate: ALL 6 conditions passing
- [x] Canary logic validated
- [x] Objectives file created for planner
- [x] Emergency controls tested

## 🚀 Canary Expansion Procedure

### Pre-flight Checks
- [ ] `make metrics-refresh` - Fresh telemetry
- [ ] Verify gate GREEN (all 6 conditions)
- [ ] Check cooldown ≥6h since last expansion
- [ ] Confirm metrics age ≤30min

### Stage 1: +1% Expansion
```bash
EXPAND_MODE=canary make expand-lite-auto
```
- [ ] Verify +1% delta applied
- [ ] Check gate.json for status
- [ ] Monitor for 30min

### 30-Minute Observation
- [ ] Run `make postverify`
- [ ] Check PASS criteria:
  - [ ] Trust ≥96.2%
  - [ ] DSSE = 100%
  - [ ] Burn <1.5x
  - [ ] TTQ ≤30s
  - [ ] Dedupe ≤1/24h
  - [ ] Regret avg ≤3%, p95 ≤7%

### Stage 2: +2% Expansion (if PASS)
```bash
EXPAND_MODE=canary make expand-lite-auto
make postverify
```

### Emergency Rollback (if FAIL)
```bash
make contract-lite    # -3% immediate
make loa3-demote     # Return to LoA2
make ops-freeze      # Full stop
```

## 📊 Monitoring Points

### Real-time
- `reports/dashboard/gate.json` - Gate status
- `reports/dashboard/latest.json` - Current metrics
- `reports/dashboard/latest.json.autonomy` - LoA status

### Audit Trail
- `receipts/ops/ops.json` - Operation receipts
- `reports/autonomy/last-postverify.json` - Post-verification
- `reports/canary-simulation.json` - Canary tracking

## 🛡️ Safety Limits
- **Hysteresis**: ON@96.2%, OFF@95.5%
- **Cumulative**: ±10% total
- **Daily**: +6%/24h without quorum
- **Cooldown**: 6h between expansions
- **Auto-rollback**: On metric degradation

## 🔔 Alert Thresholds
| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Trust | <96.2% | <95.5% | Contract |
| Burn | >1.5x | >2.0x | Hold |
| TTQ | >30s | >60s | Contract |
| Dedupe | ≥2/24h | ≥3/24h | Freeze |
| BIOLOCK | 1 | >1 | Freeze |

## 📝 Daily Tasks
- [ ] Morning: `make morning-ritual`
- [ ] Midday: `make turbo-dashboard`
- [ ] Evening: `make evening-ritual`
- [ ] Night: `make snapshot-car`

## 🚨 Escalation Path
1. Metric degradation → Auto-rollback
2. Multiple failures → `make ops-freeze`
3. Persistent issues → `make loa3-demote`
4. Create incident report → `docs/incidents/`

---
*LoA3 Active | Guarded Autonomy | Safety First*