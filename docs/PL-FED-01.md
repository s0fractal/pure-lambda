# PL-FED-01: Pure Lambda Federation Protocol

**Version:** 1
**Status:** Draft
**Date:** 2025-09-17

## Abstract

The PL-FED-01 protocol defines a standardized format for packaging, distributing, and verifying collections of Pure Lambda seeds as federation bundles. This enables secure sharing of seed collections with trust scoring and quarantine mechanisms.

## Manifest Format

A federation manifest is a JSON object with the following structure:

```json
{
  "pl_fed": "PL-FED-01",
  "version": 1,
  "createdAt": "<iso8601>",
  "seeds": [
    {
      "name": "...",
      "hash": "<blake3-hex32>",
      "gidSet": [...],
      "iidSet": [...],
      "xidSet": [...],
      "dsse": {
        "present": true|false,
        "valid": true|false
      },
      "source": {
        "kind": "cartridge|htmlc|seed",
        "file": "<relpath>"
      }
    }
  ],
  "trust": {
    "score": 0.0,
    "stats": {
      "dsseValid": 0,
      "conformant": 0,
      "ageMedian": "365"
    }
  },
  "quarantine": [
    {
      "hash": "<blake3-hex32>",
      "reason": "gid_clash",
      "details": "GID conflict with different IID"
    }
  ]
}
```

## Trust Score Formula

The trust score is calculated deterministically using:

```
score = 0.4 × dsse_ratio + 0.4 × conformance_ratio + 0.2 × freshness
```

Where:
- `dsse_ratio` = dsseValid / total_seeds
- `conformance_ratio` = conformant / total_seeds
- `freshness` = clamp(1 - ageMedian/365, 0, 1)

## Quarantine Rules

Seeds are automatically quarantined if they exhibit GID clashes:
- Same GID with different IID → quarantined with reason "gid_clash"
- Quarantined seeds are excluded from trust calculations
- Tools must exit with non-zero status when quarantined seeds exist (unless `--allow-quarantine`)

## Federation Bundle Format

Federation bundles are ZIP archives with `.fed.zip` extension containing:

```
manifest.json       # Federation manifest
seeds/
  <hash1>.seed.json # Canonical seed JSON
  <hash2>.seed.json # ...
dsse/              # Optional DSSE envelopes
  <hash1>.json     # DSSE envelope for hash1
checksums.txt      # File integrity checksums
```

### Size Constraints
- Federation bundles must not exceed 80KB
- Files are stored in deterministic order for reproducible builds

## Trust Levels

| Score Range | Level | Description |
|-------------|-------|-------------|
| 0.9 - 1.0   | Excellent | Fully signed, conformant, fresh |
| 0.7 - 0.89  | Good | Mostly signed/conformant |
| 0.5 - 0.69  | Fair | Mixed trust indicators |
| 0.3 - 0.49  | Poor | Limited verification |
| 0.0 - 0.29  | Untrusted | Unsigned/non-conformant |

## Implementation Requirements

1. **Deterministic Processing**: All operations must be reproducible
2. **Hash Verification**: All seed hashes must be verified against content
3. **DSSE Support**: Optional cryptographic signature verification
4. **Quarantine Safety**: Automatic conflict detection and isolation
5. **Size Limits**: Enforce bundle size constraints
6. **Offline Operation**: No network dependencies for core functionality

## Security Considerations

- Seeds with identical GIDs but different IIDs indicate potential conflicts
- DSSE signatures provide cryptographic proof of authenticity
- Trust scores enable informed decision-making about seed adoption
- Quarantine prevents problematic seeds from affecting federation integrity

## Tool Integration

The protocol integrates with existing Pure Lambda tools:
- Reuses PL-SEED-01 validation
- Leverages PL-CARTRIDGE-01 verification
- Compatible with existing DSSE infrastructure
- Supports both .htmlc and .cartridge inputs