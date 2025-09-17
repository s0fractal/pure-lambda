# Protocol Migration Plan

## Overview

Controlled evolution without ecosystem fracture through dual-run and migration receipts.

## Migration Phases

### Phase 1: Proposal (Day 0-7)
- RFC submitted with migration plan
- Technical review by both chambers
- Risk assessment and rollback plan

### Phase 2: Dual-Run (Day 7-14)
- Both vN and vN+1 active simultaneously
- Feature flags control traffic split
- Metrics collected for both versions

### Phase 3: Validation (Day 14-16)
- Performance comparison
- Invariant checking
- Chamber voting

### Phase 4: Cutover (Day 16-17)
- Gradual traffic shift to vN+1
- Monitor for issues
- Ready for instant rollback

### Phase 5: Deprecation (Day 30)
- Remove vN code paths
- Archive migration artifacts
- Update documentation

## Migration Receipt

After successful migration:

```json
{
  "migration_id": "v1.0.0-to-v1.1.0",
  "rfc": 42,
  "changes": [
    {
      "component": "surgeon",
      "from_version": "2.0.0",
      "to_version": "2.1.0",
      "breaking": false
    }
  ],
  "dual_run": {
    "start": "2025-01-13T00:00:00Z",
    "end": "2025-01-20T00:00:00Z",
    "metrics": {
      "v1_errors": 0,
      "v2_errors": 0,
      "performance_delta": "+5%"
    }
  },
  "rollback_available": true,
  "signatures": []
}
```

## Feature Flags

Control version routing:

```yaml
features:
  use_surgeon_v2_1:
    enabled: true
    rollout: 100  # Percentage
    
  use_new_erasure:
    enabled: false
    rollout: 0
    
  experimental_zk_proofs:
    enabled: false
    rollout: 0
```

## Rollback Procedure

If issues detected:

1. **Immediate**: Feature flag to 0%
2. **Quick**: Revert git commit
3. **Full**: Restore from time capsule

## Success Criteria

Migration succeeds when:
- ✅ All invariants hold
- ✅ Performance within 10% or better
- ✅ No increase in error rate
- ✅ Both chambers approve
- ✅ 48 hours stable operation

## Kill Switch

Automatic rollback triggers:
- Error rate > 1%
- P95 latency > 2x baseline
- Any critical invariant violation
- Consensus split detected

## Historical Migrations

### v0.9 → v1.0 (Genesis)
- Initial protocol launch
- No migration needed

### v1.0 → v1.1 (Coming)
- Surgeon v2.1 with better map fusion
- New erasure coding
- Backwards compatible