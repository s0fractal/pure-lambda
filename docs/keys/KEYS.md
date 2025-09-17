# Pure Lambda Key Management

## Key Scopes

Pure Lambda uses Ed25519 keys with specific scopes:

### 1. `sign:seed` - Seed Signing Keys
- **Purpose**: Sign individual seed contributions
- **Rotation**: Every 90 days
- **Usage**: Contributors sign their seeds before submission
- **DID Format**: `did:plc:contributor-{identifier}`

### 2. `sign:release` - Release Signing Keys
- **Purpose**: Sign federation releases and manifests
- **Rotation**: Every 90 days or on major release
- **Usage**: Maintainers sign official releases
- **DID Format**: `did:plc:release-{version}`

### 3. `steward` - Steward Authority Keys
- **Purpose**: Override policy blocks, emergency operations
- **Rotation**: Every 180 days
- **Usage**: Stewards approve quarantined content
- **DID Format**: `did:plc:steward-{number}`

## Key Rotation Procedure

1. **Generate New Key Pair**:
   ```bash
   node scripts/keys/rotate.mjs --scope sign:seed
   ```

2. **Register DID**:
   - Add entry to `registry/dids.json`
   - Set `not_before` to activation date
   - Set `not_after` to expiration (90/180 days)

3. **Transition Period**:
   - Keep old key active for 7 days overlap
   - Update all signing operations to new key
   - Verify all signatures with new key

4. **Revocation**:
   - Mark old key as revoked in registry
   - Add to `registry/revoked.json` with reason
   - Reject any signatures from revoked keys

## DID Mapping

Each key is mapped to a Decentralized Identifier (DID):

```json
{
  "did": "did:plc:contributor-alice",
  "pubkey": "ed25519:base64:...",
  "role": "sign:seed",
  "not_before": "2025-09-17T00:00:00Z",
  "not_after": "2025-12-17T00:00:00Z"
}
```

## Security Requirements

1. **Private Key Storage**:
   - NEVER commit private keys
   - Use secure key management (HSM preferred)
   - Encrypt at rest with passphrase

2. **Signature Verification**:
   - Always verify DID validity
   - Check temporal bounds (not_before/not_after)
   - Verify role matches operation

3. **Audit Trail**:
   - Log all key operations
   - Track signature verification results
   - Maintain immutable audit log

## Emergency Procedures

### Key Compromise
1. Immediately add to `registry/revoked.json`
2. Generate new key with emergency rotation
3. Re-sign affected content with new key
4. Notify all stakeholders

### Lost Key Recovery
1. Use steward quorum (2 of 3) for recovery
2. Generate new key under supervision
3. Document incident in audit log

## Compliance

- Keys comply with NIST SP 800-57 recommendations
- Ed25519 provides 128-bit security strength
- Regular audits ensure key hygiene