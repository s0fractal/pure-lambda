# Post-Quantum Cryptography Migration Plan

## Overview

Transition Pure Lambda to quantum-resistant cryptography while maintaining backward compatibility.

## Timeline

### Phase 1: Preparation (Now - 30 days)
- Deploy PQ libraries
- Generate hybrid keypairs
- Update SDKs

### Phase 2: Dual-Signing (30 - 90 days)
- All new content dual-signed (Ed25519 + Dilithium)
- Validators accept both
- Monitor performance

### Phase 3: PQ-Primary (90 - 180 days)
- PQ signatures primary, classical secondary
- Deprecation warnings for classical-only
- Update all tooling

### Phase 4: Quantum-Safe (180+ days)
- Classical signatures optional
- Full PQ verification required
- Emergency cutover ready

## Hybrid Signature Format

```json
{
  "version": "hybrid-1.0",
  "classical": {
    "algorithm": "Ed25519",
    "public_key": "base64...",
    "signature": "base64..."
  },
  "post_quantum": {
    "algorithm": "Dilithium3",
    "public_key": "base64...",
    "signature": "base64..."
  },
  "message_hash": "blake3:...",
  "timestamp": 1234567890
}
```

## Key Generation

```bash
# Generate hybrid keypair
pl-keygen --hybrid \
  --classical ed25519 \
  --pq dilithium3 \
  --output ~/.pl/keys/hybrid.json

# Rotate existing keys
pl-key-rotate \
  --old ~/.pl/keys/ed25519.key \
  --new ~/.pl/keys/hybrid.json \
  --grace-period 7d
```

## Migration Checklist

### Registry
- [ ] Support hybrid CIDs
- [ ] Dual verification paths
- [ ] Performance benchmarks

### Consensus
- [ ] BFT with PQ signatures
- [ ] Hybrid committee keys
- [ ] Emergency classical fallback

### Networking
- [ ] Kyber KEM for TLS
- [ ] PQ-safe peer authentication
- [ ] Bandwidth impact assessment

### Identity
- [ ] Hybrid DIDs
- [ ] Legacy DID migration
- [ ] Recovery mechanisms

## Performance Impact

| Operation | Classical | Hybrid | PQ-Only |
|-----------|----------|--------|---------|
| Sign | 50 μs | 200 μs | 150 μs |
| Verify | 150 μs | 400 μs | 250 μs |
| Key Size | 32 B | 2.5 KB | 2.4 KB |
| Sig Size | 64 B | 3.5 KB | 3.3 KB |

## Emergency Procedures

### Quantum Attack Detected
1. Activate emergency committee
2. Disable classical verification
3. Force PQ-only mode
4. Audit all recent transactions
5. Issue security bulletin

### Rollback Plan
1. Revert to last known good state
2. Re-enable classical crypto
3. Investigate attack vectors
4. Implement additional mitigations
5. Retry migration

## Testing

### Quantum Drill
```bash
# Simulate quantum computer availability
./chaos/macro/quantum_cutover.sh

# Expected results:
# - Network remains operational
# - No data loss
# - Consensus maintained
# - Performance acceptable
```

### Compatibility Matrix

| Component | Ed25519 | Hybrid | Dilithium |
|-----------|---------|--------|-----------|
| Registry | ✓ | ✓ | ✓ |
| Consensus | ✓ | ✓ | ✓ |
| Contracts | ✓ | ✓ | ✓ |
| Identity | ✓ | ✓ | ✓ |
| Network | ✓ | ✓ | Planned |

## Success Criteria

- Zero security incidents during migration
- Performance degradation <2x
- 100% backward compatibility
- Successful quantum drill
- All SDKs updated

---

*"Prepare for tomorrow's threats today."*