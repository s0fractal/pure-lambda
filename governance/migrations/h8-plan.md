# H8 Migration Plan: Dual-Run Strategy

## Overview

Migration from H7 (Tri-City Mesh) to H8 (Macro-Scale & Formal Trust) using zero-downtime dual-run approach.

## Timeline

Total duration: 7 days (1 Pulse cycle)

### Day 0: Preparation
- Deploy H8 components in shadow mode
- Enable feature flags (disabled)
- Start collecting baseline metrics

### Days 1-2: Shadow Mode
- H8 components run in parallel without affecting decisions
- BFT consensus signs in shadow (no enforcement)
- ML tuning observes but doesn't adjust
- Collect comparison metrics

### Day 3: Gradual Activation
- Enable H8 features for 10% of traffic
- Monitor for anomalies
- Rollback capability ready

### Days 4-5: Expansion
- Increase to 50% traffic
- BFT consensus becomes authoritative for new items
- ML tuning begins adjusting with tight guardrails

### Day 6: Full Migration
- 100% traffic on H8
- H7 components in standby
- Final validation

### Day 7: Cleanup
- Decommission H7 components
- Archive H7 state
- Chronicle entry

## Feature Flags

```yaml
features:
  BFT_CRITICAL: false      # BFT for critical facts
  GEO_SHARDING: false      # Geographic sharding
  ML_PRICING: false        # ML-based pricing
  ML_SCHEDULER: false      # ML-based scheduling
  FORMAL_CHECKS: false     # TLA+ verification
  MACRO_SCALE: false       # 10+ cities support
```

## Rollback Plan

### Triggers
- Registry divergence > 0 for >5 minutes
- SLA breach rate > 10%
- BFT split-brain detected
- ML guardrail violations > 3

### Procedure
1. Flip feature flags to false
2. Route traffic back to H7
3. Investigate root cause
4. Fix and retry

## Validation Checkpoints

### Shadow Mode (Day 2)
- [ ] BFT signatures match expected
- [ ] ML predictions within bounds
- [ ] No performance degradation
- [ ] Formal models pass

### 10% Traffic (Day 3)
- [ ] Latency p99 < 200ms
- [ ] Zero registry divergence
- [ ] Fairness index > 0.9
- [ ] No security alerts

### 50% Traffic (Day 5)
- [ ] All H7 metrics maintained or improved
- [ ] BFT consensus stable
- [ ] ML tuning improving SLA
- [ ] Cross-region replication working

### Full Migration (Day 6)
- [ ] All acceptance criteria met
- [ ] Disaster drills passed
- [ ] Zero data loss
- [ ] Governance approval

## Monitoring

### Key Metrics
```yaml
critical:
  - registry_divergence: 0
  - bft_consensus_health: 100%
  - ml_guardrail_violations: 0
  - inter_region_latency_p50: <120ms

important:
  - fairness_index: >0.9
  - sla_breach_rate: <5%
  - credit_balance: ±100
  - node_participation: >90%
```

### Dashboards
- H8 Migration Dashboard: `/monitoring/h8-migration.sh`
- A/B Comparison: `/monitoring/h7-vs-h8.sh`
- Rollback Status: `/monitoring/rollback-ready.sh`

## Communication Plan

### Stakeholders
- Chamber H: Human representatives
- Chamber A: Agent representatives
- Node operators: All cities
- Citizens: Via embassy channels

### Updates
- Daily status in Chronicle
- Real-time alerts for issues
- Final report after completion

## Risk Mitigation

### High Risk: BFT Split Brain
- **Mitigation**: Start with non-critical items
- **Detection**: Monitor for conflicting signatures
- **Recovery**: Immediate rollback, manual reconciliation

### Medium Risk: ML Instability
- **Mitigation**: Tight guardrails, gradual learning rate
- **Detection**: Variance monitoring
- **Recovery**: Revert to H7 parameters

### Low Risk: Regional Latency
- **Mitigation**: Pre-position shards
- **Detection**: Latency monitoring
- **Recovery**: Traffic shaping

## Success Criteria

✅ All H8 acceptance criteria met
✅ Zero service disruption
✅ Performance improved or maintained
✅ Both chambers approve
✅ Chronicle entry confirmed

## Commands

```bash
# Start shadow mode
./tools/dual_run_h8.sh shadow

# Enable 10% traffic
./tools/dual_run_h8.sh partial 10

# Enable 50% traffic
./tools/dual_run_h8.sh partial 50

# Full migration
./tools/dual_run_h8.sh full

# Emergency rollback
./tools/dual_run_h8.sh rollback

# Status check
./tools/dual_run_h8.sh status
```

## Post-Migration

1. Archive H7 components
2. Update documentation
3. Training for new features
4. Plan H9 exploration

---

*"Evolution without revolution - the system transforms itself"*