# Attestation and Privacy

## Overview

Attestation provides cryptographic proof that code executed in a trusted environment with specific policies enforced. Two modes are supported:

1. **Enclave Mode**: Execution in Trusted Execution Environment (TEE)
2. **Deterministic Build**: Reproducible builds with signed provenance

## Enclave Attestation

When an agent executes in an enclave (SGX, TrustZone, etc.), it produces a quote:

```json
{
  "kind": "enclave",
  "evidence": "<base64 quote>",
  "module_measurement": "<blake3 hash of WASM module>",
  "policy_cid": "Qm... (CID of enforced policy)"
}
```

### Verification Steps

1. Validate quote signature against manufacturer root
2. Check module measurement matches expected hash
3. Verify policy was enforced during execution
4. Confirm no secrets leaked to public outputs

## Deterministic Build Attestation

For environments without TEE, use reproducible builds:

```json
{
  "kind": "deterministic-build",
  "evidence": {
    "builder": "github.com/s0fractal/pure-lambda/.github/workflows/build.yml",
    "commit": "abc123...",
    "timestamp": 1736812345,
    "inputs_hash": "blake3:...",
    "outputs_hash": "blake3:...",
    "log_cid": "Qm..."
  },
  "module_measurement": "<blake3 hash>",
  "policy_cid": "Qm..."
}
```

### Verification Steps

1. Rebuild from same commit with same inputs
2. Compare output hashes
3. Verify builder signature
4. Check build log for policy compliance

## Privacy Properties

### Information Flow
- Secret inputs tagged with security labels
- Labels propagate through computation
- Outputs checked against declassification policy
- Violations cause execution abort

### Zero-Knowledge Options
Future support for ZK proofs of:
- Execution completed successfully
- Output meets constraints
- No policy violations occurred

Without revealing:
- Input data
- Intermediate computations
- Execution trace

## Module Measurements

All WASM modules are measured before execution:

```bash
# Generate measurement
blake3sum agent.wasm > agent.measurement

# Verify measurement
EXPECTED=$(cat agent.measurement)
ACTUAL=$(blake3sum agent.wasm | cut -d' ' -f1)
[ "$EXPECTED" = "$ACTUAL" ] && echo "✅ Valid" || echo "❌ Invalid"
```

## Policy Enforcement

Attestation includes CID of policy that was enforced:

1. IO confinement (intent-only writes)
2. Gas limits (bounded computation)
3. Memory snapshots (reproducible reads)
4. Information flow (no secret leaks)

## Trust Chain

```
Manufacturer Root (Intel/AMD/ARM)
    ↓
Enclave Certificate
    ↓
Module Measurement
    ↓
Execution Quote
    ↓
Receipt Signature
```

## Tools

- `attest_verify.sh`: Verify attestation evidence
- `module_measure.sh`: Generate module measurements
- `policy_bundle.sh`: Bundle policies for attestation

## Examples

### Enclave Execution
```bash
# Run in enclave
./run_enclave.sh contract.md agent.wasm

# Produces receipt with attestation
cat receipt.json | jq .attestation
```

### Deterministic Build
```bash
# Build deterministically
./deterministic_build.sh

# Produces provenance
cat provenance.json
```

## Security Considerations

1. **Quote Freshness**: Quotes include nonce to prevent replay
2. **Measurement Binding**: Module hash in quote matches executed code
3. **Policy Binding**: Policy CID in quote matches enforced rules
4. **Output Validation**: All outputs checked against policy before release

## Future Work

- Remote attestation service for quote verification
- Distributed threshold attestation (k-of-n enclaves)
- Homomorphic encryption for computation on encrypted data
- Multi-party computation for collaborative privacy