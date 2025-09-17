<!-- SPDX-License-Identifier: MIT -->
<!-- Copyright (c) 2025 Pure Lambda Authors -->

# Trust Model

## What We Sign

Pure Lambda's trust model is built on cryptographic attestation of execution provenance, not semantic correctness of user code. Our signatures cover:

### 1. Receipts (Execution Summary)
- **Hash commitments** to input fixtures and generated outputs
- **Performance metrics** (route length, memory usage, computational complexity)
- **Timestamp** and **Git revision** of the execution environment
- **Tool versions** (Node.js, TypeScript, package version)

### 2. Provenance (Replay Capability)
- **Deterministic build inputs** with cryptographic fingerprints
- **Environment state** required for reproducible execution
- **Output file hashes** for integrity verification
- **Rule application logs** (if normalization was performed)

### 3. DSSE Envelope
- **Ed25519 signatures** over the complete provenance payload
- **Key identification** for signature verification
- **Structured metadata** following the DSSE specification

## What We Do NOT Sign

Pure Lambda explicitly **does not** attest to:
- **Semantic correctness** of user-provided operons or lambda functions
- **Security properties** of user code beyond our invariant checking
- **Business logic validity** or fitness for any particular purpose
- **Compliance** with external standards or regulations

Our signatures guarantee **structural integrity** and **execution provenance** only.

## Local Verification (3 Steps)

### Step 1: Extract and Validate Provenance
```bash
# Decode the DSSE envelope payload
cat receipts/attest/envelope.json | jq -r '.payloadBase64' | base64 -d > provenance.json

# Verify payload structure
jq '.ts, .gitRev, .outputs.files[].hash' provenance.json
```

### Step 2: Verify Cryptographic Signatures
```bash
# Extract signature components (requires ed25519 verification library)
# Verify each signature in envelope.signatures[] against the payload
# Implementation depends on your crypto library of choice
```

### Step 3: Recompute and Compare Hashes
```bash
# Compute hash of your operon file
sha256sum dist/operon.json

# Compare against the hash in provenance.json
jq -r '.outputs.files[] | select(.path=="dist/operon.json") | .hash' provenance.json
```

**Match = Integrity verified** ✅
**Mismatch = Potential tampering** ❌

## Threat Model

### Local Tampering → Hash/Signature Detection
- **Attack**: Modify operon files after signing
- **Detection**: SHA-256 hash mismatch during verification
- **Mitigation**: Always verify hashes before execution

### Environment Drift → Provenance Tools Detection
- **Attack**: Execute in different environment than claimed
- **Detection**: Tool version mismatches in provenance record
- **Mitigation**: Version-pin all dependencies and verify reproducibility

### Key Compromise → Signature Revocation
- **Attack**: Use compromised signing keys
- **Detection**: Key revocation lists and transparency logs
- **Mitigation**: Implement key rotation and multi-sig schemes

### Replay Attacks → Timestamp Validation
- **Attack**: Reuse old signed receipts
- **Detection**: Timestamp bounds checking
- **Mitigation**: Validate receipt freshness for your use case

## Trust Boundaries

- **Full trust**: Output files match their cryptographic commitments
- **Partial trust**: Execution environment matches claimed configuration
- **No trust**: User code correctness, semantic validity, or security properties

The Pure Lambda trust model is designed for **provenance verification** and **build reproducibility**, not comprehensive code auditing.