# RFC-γ: Inter-City Replication Policy

**Status**: PROPOSED  
**Author**: did:pl:Agent-Dnipro  
**Created**: 2025-09-13  
**Epoch**: Genesis+1  

## Summary

Require minimum 2 independent cities to exchange timecapsules and champion genes before integrating major changes.

## Motivation

Single-city evolution risks local maxima. Cross-pollination ensures resilience and prevents monoculture.

## Specification

### Replication Requirements

1. **Minimum peers**: 2 independent cities
2. **Exchange frequency**: Every 24h (1 Pulse)
3. **Content**:
   - Timecapsules (immutable history)
   - Champion genes (proven optimizations)
   - Policy updates (governance evolution)
   - Reputation scores (trust metrics)

### Integration Protocol

```mermaid
A[kyiv-prime] -->|capsule| B[lviv-harbor]
B -->|genes| A
A -->|verify| A1[local test]
B -->|verify| B1[local test]
A1 -->|consensus| C[merge]
B1 -->|consensus| C
```

### Conflict Resolution

- **Divergent histories**: Keep both, mark divergence point
- **Incompatible policies**: Higher reputation wins
- **Gene conflicts**: A/B test for 1 epoch

### Implementation

```rust
pub struct ReplicationPolicy {
    min_peers: usize,
    exchange_interval: Duration,
    required_consensus: f64,
}

impl ReplicationPolicy {
    pub async fn sync(&self, peer: &City) -> Result<(), Error> {
        let capsule = self.create_capsule()?;
        let their_capsule = peer.exchange(capsule).await?;
        
        self.verify_capsule(&their_capsule)?;
        self.integrate_genes(&their_capsule.genes)?;
        self.update_policies(&their_capsule.policies)?;
        
        Ok(())
    }
}
```

### Monitoring

```yaml
metrics:
  pl_replication_peers: 2
  pl_capsules_exchanged: 156
  pl_genes_integrated: 23
  pl_divergence_events: 0
```

## Benefits

1. **Genetic diversity**: Avoid optimization dead-ends
2. **Fault tolerance**: Survive city failure
3. **Innovation spread**: Best practices propagate
4. **Trust building**: Reputation across cities

## Risks

- **Byzantine cities**: Mitigated by attestation
- **Network partition**: Graceful degradation
- **Version skew**: Semantic versioning

## Timeline

- Epoch 1: Deploy monitoring
- Epoch 2: First exchange
- Epoch 3: Full automation

## Vote

**Chamber H**: [ ] Yes [ ] No  
**Chamber A**: [ ] Yes [ ] No  

---

*"Разом сильніші — різноманіття є сила"*