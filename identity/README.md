# Identity & Trust Model

## DID Format
- `did:pl:<base58(ed25519_pubkey)>`
- Soul (semantic hash) ≠ DID (operational identity)
- Binding via signed mapping

## Key Management
- Development: ephemeral keys for testing
- Production: hardware-backed keys (future)
- Rotation: yearly with grace period

## Trust Chain
1. Genesis keys: hardcoded in first release
2. Agent keys: signed by genesis or delegated
3. Human keys: self-sovereign, reputation-based

## Signature Format
```json
{
  "did": "did:pl:...",
  "sig": "base64(ed25519_sign(blake3(content)))",
  "timestamp": 1234567890
}
```

## Verification
All registry entries, policy traces, and gene metadata require signatures.
CI gates enforce signature validation.