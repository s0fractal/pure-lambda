# RFC-α: Founders' Grace

**Status**: PROPOSED  
**Author**: did:pl:KyivPrime  
**Created**: 2025-09-13  
**Epoch**: Genesis+1  

## Summary

Limit founder DID weight to maximum 0.34 (minority) for 2 epochs to prevent unilateral control while maintaining emergency response capability.

## Motivation

The founder who initiated Genesis should not have absolute power. This RFC establishes democratic safeguards while preserving crisis response.

## Specification

### Weight Limits
- Founder DID: max 0.34 voting weight
- Emergency actions: require 0.51 consensus
- Incident patches: accelerated quorum (3h instead of 48h)

### Duration
- Active for: 2 epochs (Genesis+1, Genesis+2)
- Auto-expires: Genesis+3
- Extension: requires 0.67 supermajority

### Emergency Powers (retained)
- `emergency_stop`: halt all contracts
- `witness`: sign historical events
- `patch_propose`: fast-track security fixes

### Powers Revoked
- Unilateral contract deployment
- Direct registry modification
- Chamber override

## Implementation

```yaml
policies:
  founder_grace:
    max_weight: 0.34
    expires_epoch: 3
    emergency_retain:
      - emergency_stop
      - witness
      - patch_propose
```

## Security Considerations

- Prevents founder capture
- Maintains emergency response
- Democratic transition path

## Vote

**Chamber H**: [ ] Yes [ ] No  
**Chamber A**: [ ] Yes [ ] No  

---

*"Влада розподілена — цивілізація жива"*