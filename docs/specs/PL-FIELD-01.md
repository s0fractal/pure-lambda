# PL-FIELD-01: Field Trial Receipt Specification

## Overview

Field receipts track **opt-in, privacy-preserving** usage metrics for Pure Lambda seeds during field trials. No PII is collected. Consent defaults to OFF.

## Schema

```json
{
  "schema": "PL-FIELD-01",
  "version": "1.0.0",
  "ts": "2025-09-17T12:00:00.000Z",
  "seedGID": "gid_hash_64chars",
  "seedXIDv2": "xidv2_hash_64chars",
  "action": "verify|bench|contribute",
  "runs": 1,
  "deviceHint": "browser|mobile|kiosk",
  "subjectHash": "blake3_hash_64chars",
  "signer": {
    "did": "did:plc:ephemeral-field-key",
    "pub": "ed25519:base64:..."
  },
  "sig": "ed25519_signature_base64"
}
```

## Fields

### Required Fields

- **schema**: Must be "PL-FIELD-01"
- **version**: Schema version (currently "1.0.0")
- **ts**: ISO 8601 timestamp of action
- **seedGID**: Group identifier of the seed
- **seedXIDv2**: Extended identifier v2 of the seed
- **action**: One of ["verify", "bench", "contribute"]
- **runs**: Number of times action performed (usually 1)
- **subjectHash**: BLAKE3 hash of canonical seed bytes

### Privacy Fields

- **deviceHint**: Generic device category, NO user-agent string
- **signer**: Ephemeral Ed25519 key generated per session
  - **did**: Ephemeral DID (not linked to user identity)
  - **pub**: Public key for verification
- **sig**: DSSE signature over canonical payload

### Explicitly Excluded

- IP addresses
- User agents
- Session IDs
- Browser fingerprints
- Location data
- Any personally identifiable information

## Privacy Guarantees

1. **Opt-in by default OFF**: User must explicitly enable "Count this run"
2. **Ephemeral keys**: New key pair per browser session
3. **No tracking**: Cannot link receipts across sessions
4. **Local first**: Receipts saved locally before any transmission
5. **Transparent**: User can inspect receipt before export

## Signature

Receipts are signed using ephemeral Ed25519 keys:

```javascript
const keyPair = nacl.sign.keyPair();
const canonicalPayload = canonicalize({
  schema, version, ts, seedGID, seedXIDv2,
  action, runs, deviceHint, subjectHash
});
const signature = nacl.sign.detached(canonicalPayload, keyPair.secretKey);
```

## Verification

```javascript
function verifyFieldReceipt(receipt) {
  // 1. Check schema version
  if (receipt.schema !== 'PL-FIELD-01') return false;

  // 2. Verify timestamp is reasonable (not future, not too old)
  const age = Date.now() - new Date(receipt.ts).getTime();
  if (age < 0 || age > 30 * 24 * 60 * 60 * 1000) return false;

  // 3. Verify signature
  const payload = extractPayload(receipt);
  const valid = nacl.sign.detached.verify(
    canonicalize(payload),
    base64Decode(receipt.sig),
    base64Decode(receipt.signer.pub)
  );

  return valid;
}
```

## Aggregation

Field receipts are aggregated into anonymous statistics:

```json
{
  "period": "2025-09-17",
  "actions": {
    "verify": 150,
    "bench": 87,
    "contribute": 12
  },
  "uniqueSeeds": 23,
  "totalRuns": 249,
  "deviceDistribution": {
    "browser": 180,
    "mobile": 45,
    "kiosk": 24
  }
}
```

## Consent UI

```html
<label>
  <input type="checkbox" id="consent-count" />
  Count this run (anonymous, no tracking)
  <a href="#privacy">Privacy Policy</a>
</label>
```

## Data Retention

- Local receipts: User-controlled (browser storage)
- Aggregated stats: 90 days
- Individual receipts: Never stored centrally

## Compliance

- GDPR: No personal data collected
- CCPA: No sale of information (no PII to sell)
- COPPA: No collection from minors (no age tracking)