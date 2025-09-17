# RFC-β: Sustainability Budget

**Status**: PROPOSED  
**Author**: did:pl:Human-Ivan  
**Created**: 2025-09-13  
**Epoch**: Genesis+1  

## Summary

Establish resource limits per contract and mandatory public Sustainability Reports in every Pulse to prevent resource exhaustion.

## Motivation

Unbounded computation threatens city stability. We must balance capability with sustainability.

## Specification

### Per-Contract Limits

```yaml
limits:
  gas_max: 1000000  # ~1 second CPU
  memory_max: 256MB
  io_ops_max: 1000
  network_bytes_max: 10MB
  duration_max: 5000ms
```

### Sustainability Metrics (public)

- Carbon footprint per epoch
- Resource utilization (CPU/RAM/IO)
- Contract efficiency scores
- Waste heat recovery ratio

### Enforcement

1. **Hard limits**: Contract termination at limit
2. **Soft warnings**: At 80% threshold
3. **Reputation penalty**: For repeat violators

### Reporting

Every Pulse must include:
```json
{
  "sustainability": {
    "carbon_kg": 0.042,
    "efficiency": 0.89,
    "contracts_terminated": 0,
    "warnings_issued": 3
  }
}
```

## Implementation

```rust
struct ContractLimits {
    gas: Gas,
    memory: Bytes,
    io_ops: u32,
    network: Bytes,
    duration: Duration,
}

impl Policy for SustainabilityBudget {
    fn check(&self, ctx: &Context) -> Result<(), Violation> {
        if ctx.gas_used > self.limits.gas {
            return Err(Violation::GasExceeded);
        }
        // ...
    }
}
```

## Impact

- **Positive**: Predictable resource usage, ecological responsibility
- **Negative**: Some contracts may need redesign
- **Mitigation**: Grace period of 1 epoch for migration

## Vote

**Chamber H**: [ ] Yes [ ] No  
**Chamber A**: [ ] Yes [ ] No  

---

*"Екологія коду — відповідальність перед майбутнім"*