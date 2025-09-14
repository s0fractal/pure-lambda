# PL-SPEC-01: Genes & Proofs Specification

**Version**: 1.0.0  
**Status**: STANDARD  
**Authors**: Pure Lambda Standards Committee  

## Abstract

This specification defines the canonical format for Genes (optimized computational patterns) and their associated Proofs in the Pure Lambda ecosystem.

## 1. Normative References

- RFC 2119: Key words for use in RFCs
- IPLD: InterPlanetary Linked Data
- Blake3: Cryptographic hash function
- Ed25519: Digital signature algorithm

## 2. Gene Structure

### 2.1 Canonical Format

```ipldsch
type Gene struct {
  version String
  id CID
  name String
  description String
  
  # The actual optimization
  pattern Pattern
  laws [Law]
  
  # Performance characteristics
  benchmarks Benchmarks
  
  # Provenance
  author DID
  timestamp Int
  signature Bytes
  
  # Compatibility
  requires [String]
  conflicts [String]
}

type Pattern struct {
  input String      # Input pattern (regex or AST)
  output String     # Output pattern (transformation)
  conditions [String]  # When to apply
}

type Law struct {
  name String       # e.g., "associativity"
  proof CID        # Link to formal proof
  verified Boolean
}

type Benchmarks struct {
  speedup Float    # Relative to baseline
  memory Float     # Memory reduction factor
  deterministic Boolean
}
```

### 2.2 Serialization

Genes MUST be serialized using:
- CBOR for binary contexts
- JSON for human-readable contexts
- Content-addressing via Blake3

### 2.3 Example

```json
{
  "version": "1.0.0",
  "id": "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
  "name": "FOCUS",
  "description": "Map-map fusion optimization",
  "pattern": {
    "input": "map(f) . map(g)",
    "output": "map(f . g)",
    "conditions": ["pure(f)", "pure(g)"]
  },
  "laws": [
    {
      "name": "fusion_preserves_semantics",
      "proof": "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
      "verified": true
    }
  ],
  "benchmarks": {
    "speedup": 1.8,
    "memory": 0.5,
    "deterministic": true
  },
  "author": "did:pl:Agent-Optimizer",
  "timestamp": 1704067200,
  "signature": "0x...",
  "requires": [],
  "conflicts": []
}
```

## 3. Proof Structure

### 3.1 Canonical Format

```ipldsch
type Proof struct {
  version String
  id CID
  
  # What is being proved
  claim Claim
  
  # The proof itself
  method String     # "formal", "empirical", "hybrid"
  evidence Evidence
  
  # Verification
  verifier DID
  timestamp Int
  signature Bytes
  
  # Reproducibility
  environment Environment
  witnesses [DID]
}

type Claim struct {
  subject CID      # Gene or Contract being proved
  property String  # What property is claimed
  parameters Map   # Any parameters
}

type Evidence struct {
  formal FormalProof optional
  empirical EmpiricalProof optional
  attestations [Attestation]
}

type FormalProof struct {
  system String    # "TLA+", "Coq", "Lean", etc.
  proof_text String
  machine_checkable Boolean
}

type EmpiricalProof struct {
  trials Int
  success_rate Float
  data_cid CID
  statistical_significance Float
}
```

### 3.2 Validation Rules

1. Proofs MUST be deterministically reproducible
2. Signatures MUST be valid Ed25519
3. Timestamps MUST be within consensus window
4. Evidence MUST support claim

## 4. Compatibility

### 4.1 Version Evolution

- MAJOR: Breaking changes
- MINOR: Backward-compatible additions
- PATCH: Backward-compatible fixes

### 4.2 Migration

Old genes remain valid but deprecated. New genes MUST specify compatibility.

## 5. Conformance Testing

### 5.1 Test Vectors

See `/specs/test-vectors/genes/` for canonical test cases.

### 5.2 Validation Suite

```bash
pl-validate gene <gene.json>
pl-validate proof <proof.json>
```

## 6. Security Considerations

1. Genes MUST NOT access external state
2. Proofs MUST be time-bounded
3. Signatures prevent tampering
4. CIDs ensure content integrity

## 7. Examples

### 7.1 Valid Gene

```json
{
  "version": "1.0.0",
  "name": "REDUCE",
  "pattern": {
    "input": "fold(op, zero, list)",
    "output": "optimized_fold(op, zero, list)"
  },
  "laws": [{"name": "fold_identity", "verified": true}],
  "benchmarks": {"speedup": 2.1}
}
```

### 7.2 Invalid Gene (Missing Required Fields)

```json
{
  "name": "BROKEN",
  "pattern": {}
}
// ERROR: Missing version, id, laws, benchmarks
```

---

**Appendix A**: IPLD Schema  
**Appendix B**: Test Vectors  
**Appendix C**: Reference Implementation