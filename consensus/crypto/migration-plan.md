# Post-Quantum Cryptographic Migration Plan

## Executive Summary
Transition to quantum-resistant cryptography through hybrid signing (Ed25519 + Dilithium) with zero-downtime migration.

## Phase 1: Dual-Signature Introduction (Days 1-7)

### Objectives
- Deploy PQ-ready nodes alongside classical nodes
- Begin dual-signing all critical paths
- Maintain backwards compatibility

### Implementation
```bash
# Enable dual-signing
make pq-enable

# Verify both signature types
make pq-verify MODE=hybrid
```

### Acceptance Criteria
- [ ] 100% of validators support Dilithium verification
- [ ] All new blocks contain dual signatures
- [ ] Zero consensus interruptions

## Phase 2: Dual-Run Period (Days 7-14)

### Monitoring
```yaml
metrics:
  ed25519_verify_time_ms: < 1
  dilithium_verify_time_ms: < 5
  signature_size_increase: 3.2x
  network_overhead: < 15%
```

### Rollback Triggers
- Consensus lag > 1000ms
- Signature verification failures > 0.1%
- Network partition detected

## Phase 3: Quantum Cutover (Day 14)

### Pre-flight Checks
```bash
# Run quantum drill
make chaos-run CASE=quantum_cutover

# Verify all nodes PQ-ready
make pq-status
```

### Cutover Sequence
1. **T-60min**: Final health check
2. **T-30min**: Freeze non-critical operations
3. **T-0**: Disable Ed25519 verification
4. **T+5min**: Confirm Dilithium-only operation
5. **T+60min**: Resume all operations

## Algorithms

### Primary: Dilithium3
- Security Level: NIST Level 3
- Public Key: 1952 bytes
- Signature: 3293 bytes
- Verification: ~1ms

### Fallback: Falcon-512
- Security Level: NIST Level 1
- Public Key: 897 bytes  
- Signature: 690 bytes
- Verification: ~0.5ms

### KEM: Kyber768
- Security Level: NIST Level 3
- Public Key: 1184 bytes
- Ciphertext: 1088 bytes
- Decapsulation: ~0.5ms

## Identity Migration

### Key Generation
```bash
# Generate PQ keypair
./identity/pq/keygen.sh

# Sign identity transition
./identity/pq/sign.sh transition.json

# Verify dual signatures
./identity/pq/verify.sh identity.json
```

### DID Update
```json
{
  "@context": "https://w3id.org/did/v1",
  "id": "did:pl:node1",
  "verificationMethod": [
    {
      "id": "did:pl:node1#ed25519-key-1",
      "type": "Ed25519VerificationKey2020",
      "publicKeyMultibase": "z6Mk...",
      "deprecated": "2025-09-27T00:00:00Z"
    },
    {
      "id": "did:pl:node1#dilithium3-key-1",
      "type": "Dilithium3VerificationKey2024",
      "publicKeyMultibase": "z8Dil...",
      "activated": "2025-09-20T00:00:00Z"
    }
  ]
}
```

## Network Protocol Updates

### Handshake v2
```rust
struct HandshakeV2 {
    version: u8,  // = 2
    node_id: [u8; 32],
    ed25519_sig: Option<[u8; 64]>,      // Phase 1-2
    dilithium_sig: [u8; 3293],          // Always
    kyber_kem_pk: [u8; 1184],           // For channel setup
    capabilities: Capabilities,
}
```

### Block Header v2  
```rust
struct BlockHeaderV2 {
    // ... existing fields ...
    signatures: SignatureSet {
        ed25519: Option<Signature>,     // Deprecated after cutover
        dilithium: Signature,            // Required
        threshold: u32,                  // 2/3 + 1
    },
}
```

## Storage Migration

### Historical Signatures
- Keep Ed25519 signatures for 1 year post-cutover
- Archive to cold storage after 90 days
- Maintain proof-of-transition for each identity

### State Transition
```sql
-- Track signature types
CREATE TABLE signature_transitions (
    block_height BIGINT,
    transition_type VARCHAR(20),
    timestamp TIMESTAMP,
    ed25519_count INT,
    dilithium_count INT,
    hybrid_count INT
);
```

## Emergency Procedures

### Quantum Attack Detected
1. Immediate switch to Dilithium-only
2. Revoke all Ed25519 keys
3. Force identity rotation
4. Audit last 1000 blocks

### Rollback Procedure
```bash
# Emergency rollback
make pq-rollback HEIGHT=<last_safe_block>

# Re-enable classical crypto
make pq-disable EMERGENCY=true
```

## Testing

### Chaos Engineering
```bash
# Simulate quantum computer attack
make chaos-run CASE=quantum_attack

# Test rapid key rotation
make chaos-run CASE=pq_key_rotation

# Network partition during migration
make chaos-run CASE=pq_partition
```

### Performance Benchmarks
```bash
# Baseline (Ed25519 only)
make bench MODE=classical

# Hybrid mode
make bench MODE=hybrid

# PQ-only mode  
make bench MODE=quantum
```

## Success Metrics

- Zero consensus interruptions
- < 20% performance degradation
- 100% node participation
- No emergency rollbacks
- All identities migrated

## Timeline

- **Day 0**: Deploy PQ-enabled binaries
- **Day 1-7**: Dual-signature phase
- **Day 7-14**: Monitoring & adjustment
- **Day 14**: Quantum cutover
- **Day 15-30**: Deprecation period
- **Day 30**: Remove classical crypto