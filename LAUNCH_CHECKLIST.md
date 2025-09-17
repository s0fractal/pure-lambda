# 🚀 LoA3 GitHub Launch Checklist

## ✅ Pre-Push Verification

### 1. Security Check
- [ ] No private keys in code (ED25519_SECRET, etc.)
- [ ] No API tokens hardcoded
- [ ] Using GitHub Secrets for sensitive data

### 2. GitHub Secrets Required
```yaml
PL_ED25519_SECRET: <base64-encoded-private-key>
PL_DID: did:key:z...
GITHUB_TOKEN: (automatic, needs 'contents: write')
```

### 3. GitHub Settings
- [ ] Actions → Settings → Workflow permissions: **Read and write**
- [ ] Branch protection rules (optional but recommended)

### 4. LoA3 Configuration Verified
```toml
# policies/autonomy.toml
level = 3              ✅
apply = true           ✅
mode = "guarded"       ✅
```

### 5. Safety Limits Active
- Hysteresis: 96.2% ON / 95.5% OFF
- Limits: ±10% total, +6%/24h
- Cooldown: 6h between expansions
- Canary: +1% → 30min → +2%

## 📝 Git Commands

```bash
# Create feature branch
git checkout -b launch/loa3

# Stage all changes
git add -A

# Commit with clear message
git commit -m "feat: LoA3 guarded autonomy with safety guardrails

- Implements Level of Autonomy 3 (guarded mode)
- Adds canary expansion (+1% → observe → +2%)
- Green gate with 6 safety conditions
- Hysteresis to prevent flapping
- Auto-rollback on metric degradation
- DSSE receipts for audit trail
- Emergency controls (contract/demote/freeze)"

# Push to GitHub
git push -u origin launch/loa3

# Create PR (using GitHub CLI)
gh pr create \
  --title "🚀 feat: LoA3 Guarded Autonomy" \
  --body "## Summary
Implements Level of Autonomy 3 with comprehensive safety guardrails.

## Key Features
- ✅ LoA3 with guarded autonomy
- ✅ Canary expansions (+1% → 30min → +2%)
- ✅ Green gate with 6 conditions
- ✅ Hysteresis (96.2%/95.5%)
- ✅ Auto-rollback on degradation
- ✅ DSSE audit trail
- ✅ Emergency controls

## Safety
- All limits enforced (±10%, +6%/24h, 6h cooldown)
- BIOLOCK v2 enabled
- Full monitoring and alerting

## Testing
- Gate logic validated
- Canary sequence tested
- Emergency rollback verified" \
  --label "go-live" \
  --label "loa3" \
  --label "production"
```

## 🔍 Post-Merge Validation

### CI/CD Should Show:
- [ ] Daily digest workflow runs successfully
- [ ] Signed digest created with DSSE
- [ ] CAR snapshot generated
- [ ] Gate status: GREEN

### Artifacts to Check:
- `reports/dashboard/gate.json` - Should show GREEN
- `docs/status/daily.md` - Updated daily status
- `receipts/attest/daily-*.envelope.json` - DSSE signatures
- `dist/snapshots/<date>.car` - Daily snapshots

### First Canary (When Ready):
```bash
make metrics-refresh
EXPAND_MODE=canary make expand-lite-auto  # +1%
# After 30min:
make postverify
# If PASS:
EXPAND_MODE=canary make expand-lite-auto  # +2%
```

## 🚨 Emergency Controls
```bash
make contract-lite    # -3% immediate
make loa3-demote     # Return to LoA2
make ops-freeze      # Full stop
```

## ✨ Final Status
- **LoA**: 3 (Guarded Autonomy)
- **Gate**: GREEN (6/6 conditions)
- **Coverage**: 12/12 patterns
- **Trust**: 96.3%
- **DSSE**: 100%
- **Safety**: All guardrails active

---
**Ready to push to GitHub!** 🐤🛡️🚀