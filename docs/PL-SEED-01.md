# PL-SEED-01 Specification

## Overview

PL-SEED-01 is a versioned JSON format for packaging and distributing Pure Lambda operons as deterministic, verifiable seeds.

## Format

### Core Structure

```json
{
  "pl_seed": "PL-SEED-01",
  "name": "focus-delay",
  "version": 1,
  "createdAt": "2025-09-17T12:00:00.000Z",
  "tiles": [
    {
      "op": "FOCUS",
      "code": "x => x",
      "abi": {
        "types": "data -> focused",
        "effects": [],
        "ports": { "in": "data", "out": "focused" }
      },
      "law": "identity",
      "cost": "O(1)"
    }
  ],
  "meta": {
    "gidSet": ["8a7ea8..."],
    "iidSet": ["90fb5e..."],
    "xidSet": ["506bf0..."],
    "stats": {
      "hops": 2,
      "latency": 0.001,
      "mem": 1024
    }
  }
}
```

## Fields

### Required Fields

- `pl_seed`: String literal "PL-SEED-01"
- `name`: Human-readable identifier (alphanumeric + hyphens)
- `version`: Positive integer version number
- `createdAt`: ISO 8601 timestamp in UTC
- `tiles`: Array of operon tile objects
- `meta`: Metadata object with computed sets and statistics

### Tile Objects

Each tile in the `tiles` array must contain:

- `op`: Operation name (string)
- `code`: Optional lambda code (string)
- `abi`: Interface specification object
  - `types`: Type signature (string)
  - `effects`: Array of effect names (string[])
  - `ports`: Input/output port mapping (Record<string, string>)
- `law`: Governing law (string, e.g., "identity", "temporal")
- `cost`: Complexity annotation (string, e.g., "O(1)", "O(n)")

### Meta Object

- `gidSet`: Array of GID hashes (hex strings)
- `iidSet`: Array of IID hashes (hex strings)
- `xidSet`: Array of XID hashes (hex strings)
- `stats`: Performance statistics
  - `hops`: Number of computation steps (integer)
  - `latency`: Expected latency in seconds (number)
  - `mem`: Memory usage in bytes (number)

## Invariants

1. **Deterministic Serialization**: JSON keys must be sorted alphabetically
2. **Hash Stability**: BLAKE3 hash of canonical JSON (no whitespace) must be deterministic
3. **Set Completeness**: gidSet/iidSet/xidSet must contain all computed hashes from tiles
4. **Temporal Ordering**: createdAt must be valid ISO 8601 UTC timestamp
5. **Version Monotonicity**: Version numbers must increase for updates to same name

## Canonical Form

For hashing and verification, seeds are serialized to canonical JSON:
- No whitespace between tokens
- Keys sorted alphabetically at all levels
- Numbers serialized without locale formatting
- No trailing commas

## DSSE Envelope (Optional)

Seeds may be wrapped in Dead Simple Signing Envelope (DSSE) format:

```json
{
  "payloadType": "purelambda/seed+json",
  "payloadBase64": "<base64-encoded-seed>",
  "signatures": [
    {
      "keyid": "abc12345",
      "sigBase64": "<ed25519-signature>"
    }
  ]
}
```

## Hashing Algorithm

### GID (Global Identifier)
The Global Identifier is computed as:
```
GID = BLAKE3(canonical_json(payload) + canonical_json(metadata) + schema_version)
```

Where:
- `payload` includes all tiles and their content
- `metadata` includes performance stats and identifiers
- `schema_version` is the literal string "PL-SEED-01"

### IID (Implementation Identifier)
The Implementation Identifier is computed as:
```
IID = BLAKE3(canonical_json(tiles[].code) + canonical_json(tiles[].abi))
```

### XID (Execution Identifier)
The Execution Identifier is computed as:
```
XID = BLAKE3(canonical_json(tiles[].law) + canonical_json(tiles[].cost) + runtime_context)
```

## Round-trip Law

**Invariant:** `pack(unpack(seed)) === seed`

All PL-SEED-01 implementations must preserve this property:

1. **Unpack Operation:** Extract seed content while preserving all metadata
2. **Pack Operation:** Recreate identical seed from extracted content
3. **Verification:** Compare original and round-trip seeds byte-for-byte

This ensures deterministic operation across all Pure Lambda implementations.

## DSSE Integration

### Signature Process
1. Compute canonical JSON of the seed
2. Encode payload as Base64
3. Create DSSE envelope with metadata
4. Sign using Ed25519 private key
5. Attach signature to envelope

### Verification Process
1. Extract payload from DSSE envelope
2. Verify Ed25519 signature against payload
3. Decode Base64 payload to JSON
4. Validate seed schema and invariants
5. Compute and verify hash identifiers

## Usage

Seeds enable:
- **Distribution**: Package operons for sharing
- **Verification**: Cryptographic integrity checking
- **Caching**: Content-addressed storage by hash
- **Composition**: Building larger operons from smaller seeds
- **Rollback**: Version-controlled operon evolution
- **Attestation**: Cryptographic proof of authorship and integrity

## Conformance Requirements

### Mandatory
- All required fields must be present and valid
- Canonical JSON serialization for hashing
- Deterministic hash computation (BLAKE3)
- Round-trip preservation guarantee
- ISO 8601 timestamp format
- Alphanumeric naming convention

### Optional
- DSSE envelope for signed distribution
- Extended metadata in `meta` object
- Custom tile properties beyond core schema
- Performance hints in `stats` object

## Implementation Notes

- Use `tools/gid.ts` functions for computing GID/IID/XID sets
- Pack/unpack tools handle DSSE envelope creation/verification
- All hashes use BLAKE3 with SHA-256 fallback
- Ed25519 signatures when `PL_ED25519_SECRET` environment variable is present
- Implementations should validate all invariants on pack/unpack
- Round-trip testing is mandatory for compliance