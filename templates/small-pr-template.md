# Small PR Template (≤3 tiles)

## 📦 Change Summary
**Type:** [ ] Bug fix [ ] Feature [ ] Refactor [ ] PNF optimization [ ] Documentation

**Scope:** __ files changed, __ lines added/removed

**Tiles affected:** __ / 3 (max)

## 🔧 Technical Details

### Graph Changes
- **Before phash:** `ph_...`
- **After phash:** `ph_...`
- **Invariant preserved:** [ ] Yes [ ] No

### PNF Analysis
- **Identity eliminations:** __
- **Composition simplifications:** __
- **Route cost change:** ΔL = __%

### Breathing Impact
- **Width impact:** ΔW = __
- **Curvature impact:** Δκ = __
- **SLO compliance:** [ ] Maintained [ ] Improved [ ] Degraded

## 📊 Performance Impact

### Measurements
- **Speedup:** __×
- **Memory delta:** __
- **PAC bound:** ≤__%

### DOE Results
- **Scenarios tested:** __ / 30
- **Misroutes:** __ (target: 0)
- **Confluence ratio:** __%

## 🔒 Safety Checks

### BIOLOCK Scan
- [ ] Clean (no bio-triggers)
- [ ] TX-corridor only
- [ ] Proof of abstention attached

### B2 Verification
- [ ] Valid B2 graph
- [ ] ≤2 external imports
- [ ] No algebraic loops
- [ ] PNF-ready

## 📋 Receipt

```json
{
  "change_id": "ch_...",
  "phash_before": "ph_...",
  "phash_after": "ph_...",
  "verified": true,
  "gate": "G0",
  "profile": "...",
  "speedup": "__×",
  "safety": "clean"
}
```

## 🔄 Rollback Plan

**If PAC/SLO degrade:**
1. `git revert <commit>`
2. Restore previous phash: `ph_...`
3. Re-run DOE verification
4. File incident report

**Auto-rollback triggers:**
- [ ] Regret > 7% (p95)
- [ ] W or κ outside SLO ranges for >3 ticks
- [ ] Any misroute detected

## 📝 Checklist

- [ ] Change scope ≤3 tiles
- [ ] phash invariant preserved (or explained)
- [ ] DOE passed (0 misroutes)
- [ ] BIOLOCK clean
- [ ] B2 verification passed
- [ ] Receipt generated
- [ ] Rollback plan documented
- [ ] Performance measured
- [ ] SLO impact assessed

---

**Note:** PRs >3 tiles require full design review and extended DOE (100+ scenarios).

*Generated with B2 Small PR Template v1.0*