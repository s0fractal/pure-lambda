# Federation: Offline Seed Exchange Hub

Federation is Pure Lambda's **offline-safe** hub for exchanging verified seed collections. It enables secure sharing of seed packages with trust scoring and automatic quarantine mechanisms.

## What is Federation

Federation provides a decentralized way to package, distribute, and verify collections of Pure Lambda seeds without network dependencies. Each federation bundle contains:

- **Verified seeds** with integrity checksums
- **Trust scoring** based on signatures and conformance
- **Quarantine rules** for automatic conflict detection
- **Offline operation** with zero external dependencies

## PL-FED-01 Manifest

Federation bundles use the PL-FED-01 manifest format with these key fields:

### Core Fields
- `pl_fed`: Protocol version ("PL-FED-01")
- `version`: Manifest version (1)
- `createdAt`: ISO8601 timestamp
- `seeds[]`: Array of seed metadata

### Trust Scoring
- `trust.score`: 0.0-1.0 calculated as:
  ```
  score = 0.4 × dsse_ratio + 0.4 × conformance_ratio + 0.2 × freshness
  ```
- `trust.stats`: Aggregated statistics (dsseValid, conformant, ageMedian)

#### Trust Scoring Example
For a federation with all Seed Garden seeds (9 seeds) plus conformance vectors:
```
dsseValid: 9/9 (100%) → dsse_ratio = 1.0
conformant: 9/9 (100%) → conformance_ratio = 1.0
ageMedian: 2 hours → freshness = 0.9

score = 0.4 × 1.0 + 0.4 × 1.0 + 0.2 × 0.9 = 0.98
```
Result: **Excellent** trust level (≥0.96 indicates production-ready bundle)

### Quarantine Rules
Seeds are automatically quarantined if they exhibit:
- **GID clashes**: Same GID with different IID → reason "gid_clash"
- Quarantined seeds are excluded from trust calculations
- Tools exit non-zero when quarantined seeds exist (unless `--allow-quarantine`)

## How to Use

### 1) Ingest Seeds
```bash
# Create federation from existing seeds/cartridges
make fed-ingest PATHS="dist/release/hello-city.htmlc dist/release/example.cartridge"
```

### 2) Browse & Verify
```bash
# Open federation hub in browser (drag & drop interface)
open docs/federation/index.html
```

### 3) Bundle & Verify
```bash
# Create distributable federation bundle
make fed-bundle && make fed-verify
```

## Service Level Objectives (SLOs)

### For General Availability
- **Quarantine Count**: 0 (zero quarantined seeds)
- **Trust Score**: ≥ 0.8 recommended for production use
- **Bundle Size**: ≤ 80KB maximum
- **DSSE Coverage**: ≥ 80% for "Good" rating

### Trust Levels
| Score Range | Level | Characteristics |
|-------------|-------|----------------|
| 0.9 - 1.0   | Excellent | Fully signed, conformant, fresh |
| 0.7 - 0.89  | Good | Mostly signed/conformant |
| 0.5 - 0.69  | Fair | Mixed trust indicators |
| 0.3 - 0.49  | Poor | Limited verification |
| 0.0 - 0.29  | Untrusted | Unsigned/non-conformant |

## Technical Details

### Bundle Structure
```
manifest.json       # Federation manifest
seeds/
  <hash1>.seed.json # Canonical seed JSON
  <hash2>.seed.json # ...
dsse/              # Optional DSSE envelopes
  <hash1>.json     # DSSE envelope for hash1
checksums.txt      # File integrity checksums
```

### Security Properties
- **Deterministic processing** - identical results across environments
- **Hash verification** - BLAKE3 integrity for all seeds
- **DSSE signatures** - optional cryptographic attestation
- **Offline operation** - zero network dependencies after download

**Send over air-gap**: `make air-pack` → sender/receiver.

## See Also

- **[PL-FED-01 Specification](./PL-FED-01.md)** - Complete protocol details
- **[Federation Hub](./federation/index.html)** - Interactive browser interface
- **[Trust Model](./TRUST-MODEL.md)** - Security and verification details

---

*Federation v1.0 | Offline-first seed exchange with cryptographic trust*