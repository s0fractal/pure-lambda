# Public Verifier Notary

## Trust Root

### Public Key Fingerprint
```
PLACEHOLDER:KEY:FINGERPRINT
```

### Signature Chain (Last 7 Days)
- No signatures yet

### Latest CAR Archive
- **IPFS CID**: `bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi`
- **Gateway**: https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi

## Verification Instructions

### Online Verification
```bash
# Verify latest digest
make notary-verify

# Verify specific date
make verify-digest DATE=2025-09-17
```

### Offline Verification
1. Download the verification tool: `docs/verify/index.html`
2. Open in any browser (works offline)
3. Drag & drop any seed.json or digest.json file
4. Tool will verify signatures using embedded public key

### Manual Verification
```bash
# Verify DSSE envelope
openssl dgst -sha256 -verify keys/current.pub -signature <(
  echo "$ENVELOPE" | jq -r '.signatures[0].sig' | base64 -d
) <(
  echo "$ENVELOPE" | jq -r '.payload' | base64 -d
)

# Verify CAR archive
ipfs dag get bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
```

## Trust Anchors
- **GitHub Actions**: Signed by `github.com/anthropics/pure-lambda/.github/workflows`
- **Local Development**: Signed by `PL_ED25519_SECRET` environment variable
- **CAR Archives**: Daily snapshots with IPLD DAG verification

## Chain of Trust
```
Public Key (Ed25519)
    ↓
DSSE Envelopes (daily digests)
    ↓
Hash Chain (prevEnvelopeHash)
    ↓
CAR Archives (IPFS CIDs)
    ↓
Seed Receipts (per-seed attestation)
```

## Contact
- **Repository**: https://github.com/anthropics/pure-lambda
- **Issues**: https://github.com/anthropics/pure-lambda/issues

---
*Generated: 2025-09-17T16:55:24.622Z*
*Notary Version: 1.0.0*
