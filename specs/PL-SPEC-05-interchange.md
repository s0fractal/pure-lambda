# PL-SPEC-05: Zero-Trust Interchange Protocol

## Abstract
Zero-trust cross-ecosystem interoperability through cryptographic receipts and capability-based access control.

## Status
**Version**: 1.0.0
**State**: Draft
**Horizon**: H11

## Specification

### 1. IPLD/CBOR Profile

```typescript
interface ForeignReceipt {
  cid: CID              // Content identifier
  origin: DID           // Issuer identity
  proof: ZKProof        // Zero-knowledge proof
  capabilities: UCAN[]  // Delegated capabilities
  ttl: number          // Time-to-live
}

interface BridgeProof {
  source: ChainID
  target: ChainID
  receipt: ForeignReceipt
  validators: Signature[]
  threshold: number
}
```

### 2. Zero-Knowledge Receipts

Each critical contract MUST provide ZK receipts without data leakage:

```rust
trait ZKReceiptProvider {
    fn generate_receipt(&self, action: Action) -> Result<ZKReceipt>;
    fn verify_receipt(&self, receipt: &ZKReceipt) -> Result<bool>;
}
```

### 3. Adapter Requirements

#### OCI Adapter
- Container attestation via Sigstore
- SBOM generation for all images
- Runtime policy enforcement

#### S3 Adapter
- Object-level encryption with KMS
- Versioning and audit trails
- Cross-region replication support

#### SQL Adapter
- Row-level security policies
- Encrypted connections only
- Query result attestation

### 4. UCAN Policies

```yaml
policy:
  default_ttl: 3600
  max_delegation_depth: 3
  revocation_check: mandatory
  capabilities:
    - resource: "ipld:*"
      action: ["read"]
      constraints:
        rate_limit: 1000/hour
    - resource: "bridge:*"
      action: ["verify"]
      constraints:
        require_multisig: true
```

## Security Considerations

1. **Replay Protection**: Nonces in all receipts
2. **Time Bounds**: Max 24h validity for cross-system ops
3. **Revocation**: CRL distribution via IPFS
4. **Quantum Resistance**: Ready for PQ signatures (see PL-SPEC-06)

## Test Vectors

```json
{
  "foreign_receipt": {
    "cid": "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
    "origin": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "proof": "0x1234...abcd",
    "capabilities": ["ipld:read:*"],
    "ttl": 3600
  }
}
```

## References
- [IPLD Specifications](https://ipld.io/specs/)
- [UCAN Specification](https://ucan.xyz/specs/)
- [zkSTARK Paper](https://eprint.iacr.org/2018/046)