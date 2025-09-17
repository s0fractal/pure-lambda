# PL-CARTRIDGE-01: Pure Lambda Cartridge Specification

**Version**: 1.0
**Status**: Draft
**Author**: Pure Lambda Project

## Overview

PL-CARTRIDGE-01 defines a standardized packaging format for Pure Lambda seeds, enabling offline distribution, verification, and execution. Cartridges encapsulate seeds with manifests, signatures, and viewers in two encoding formats.

## Cartridge Manifest

Every cartridge contains a manifest with the following fields:

```typescript
interface CartridgeManifest {
  version: number;           // Cartridge format version (1)
  createdAt: string;         // ISO 8601 timestamp
  seedHash: string;          // BLAKE3 hash of canonical seed JSON
  envelopeHash?: string;     // BLAKE3 hash of DSSE envelope (if signed)
  viewerHash: string;        // BLAKE3 hash of viewer HTML
  manifestHash: string;      // BLAKE3 hash of this manifest
  size: number;              // Total cartridge size in bytes
}
```

## Encoding Formats

### A) Single-HTML (.htmlc)

A self-contained HTML file with embedded cartridge data:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Pure Lambda Cartridge</title>
  <!-- Minimal inline CSS -->
</head>
<body>
  <!-- Cartridge viewer interface -->
  <script id="pl-cartridge" type="application/json">
    {MANIFEST_JSON}
  </script>
  <script id="pl-seed" type="text/plain">
    {BASE64_ENCODED_SEED}
  </script>
  <script id="pl-envelope" type="text/plain">
    {BASE64_ENCODED_ENVELOPE}
  </script>
  <!-- Viewer JavaScript -->
</body>
</html>
```

### B) Zip Archive (.cartridge)

A zip file containing discrete components:

```
hello-city.cartridge
├── index.html         # Cartridge viewer
├── seed.json         # Packed seed (PL-SEED-01)
├── envelope.json     # DSSE signature (optional)
└── manifest.json     # Cartridge manifest
```

## Hash Computation

All hashes use BLAKE3 with canonical JSON serialization:

1. **Seed Hash**: BLAKE3 of canonical seed JSON (PL-SEED-01 format)
2. **Envelope Hash**: BLAKE3 of canonical DSSE envelope JSON (if present)
3. **Viewer Hash**: BLAKE3 of viewer HTML content
4. **Manifest Hash**: BLAKE3 of canonical manifest JSON (excluding manifestHash field)

## Digital Signatures (Optional)

Cartridges MAY include DSSE (Dead Simple Signing Envelope) signatures:

- **Key**: Ed25519 private key from `PL_ED25519_SECRET` environment variable
- **Payload**: Canonical seed JSON
- **PayloadType**: `application/vnd.pure-lambda.seed+json`

## Viewer Interface

The cartridge viewer provides:

- **Verify**: Validate all hashes and signatures
- **Run Autopilot**: Execute seed routing simulation
- **Show Route**: Display execution graph
- **Open in MirrorBench**: Launch in development environment

Footer displays: "Offline • Deterministic • DSSE-Verified"

## Size Constraints

- **Single-HTML (.htmlc)**: ≤ 40KB target
- **Zip Archive (.cartridge)**: ≤ 80KB maximum

## Tools

### pack-htmlc.ts
Creates single-HTML cartridges from seeds:
```bash
npm run cartridge:htmlc
```

### pack-zip.ts
Creates zip archive cartridges:
```bash
npm run cartridge:zip
```

### verify.ts
Validates cartridge integrity:
```bash
npm run cartridge:verify -- path/to/cartridge
```

## Examples

```bash
# Create both formats
make cartridge

# Open cartridge in browser
make cartridge-open

# Verify cartridge integrity
make cartridge-verify
```

---

**Pure Lambda Project** • Offline • Deterministic • DSSE-Verified