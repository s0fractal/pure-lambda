# Cartridge - Portable Offline Packages

## What is Cartridge

Cartridge is Pure Lambda's **portable, verifiable, offline** packaging format for distributing and executing seeds without network dependencies. Each cartridge contains a complete functional program with cryptographic signatures, manifest metadata, and an interactive viewer - all bundled for standalone operation.

**Key Properties:**
- **Portable**: Runs anywhere - browser, CLI, embedded systems
- **Verifiable**: BLAKE3 + DSSE signatures ensure integrity
- **Offline**: Zero network dependencies after download
- **Deterministic**: Identical execution across all environments

## Two Encoding Formats

### A) Single-HTML (.htmlc)
Self-contained HTML file with embedded cartridge data:

```html
<!DOCTYPE html>
<html>
<head><title>Pure Lambda Cartridge</title></head>
<body>
  <!-- Interactive cartridge viewer -->
  <script id="pl-cartridge" type="application/json">
    {MANIFEST_JSON}
  </script>
  <script id="pl-seed" type="text/plain">
    {BASE64_ENCODED_SEED}
  </script>
  <script id="pl-envelope" type="text/plain">
    {BASE64_ENCODED_ENVELOPE}
  </script>
</body>
</html>
```

### B) Zip Archive (.cartridge)
Structured archive with discrete components:

```
hello-city.cartridge
├── index.html         # Interactive viewer
├── seed.json         # PL-SEED-01 format
├── envelope.json     # DSSE signature (optional)
└── manifest.json     # Cartridge metadata
```

## Verify Locally (3 Steps)

**Step 1: Hash Integrity**
```bash
npm run cartridge:verify -- path/to/cartridge
```

**Step 2: DSSE Signature (if present)**
```bash
# Automatic verification with PL_ED25519_SECRET
make cartridge-verify
```

**Step 3: Round-trip Law**
```bash
# Verify pack(unpack(cartridge)) === cartridge
./cli/test-roundtrip.js --seed cartridge.htmlc
```

## Size Limits & Notes

**Size Constraints:**
- Single-HTML (.htmlc): ≤ 40KB target
- Zip Archive (.cartridge): ≤ 80KB maximum

**DSSE Note:**
Cartridges MAY include Dead Simple Signing Envelope signatures using Ed25519 keys. Payload type: `application/vnd.pure-lambda.seed+json`

**MirrorBench Hash:**
Example seed hash with #seed=hello-city:
```
BLAKE3: 8f7e2a9c1b4d6e8f9a2b5c7d0e3f6a8b1c4d7e9f2a5b8c0d3e6f9a2b5c8d1e4f7
```

## Quick Commands

```bash
# Create both formats
make cartridge

# Open cartridge in browser
make cartridge-open

# Verify integrity
make cartridge-verify

# Pack from seed
npm run cartridge:htmlc -- --input seed.json
npm run cartridge:zip -- --input seed.json

# Extract from cartridge
npm run cartridge:extract -- --input hello.cartridge
```

---

See [PL-CARTRIDGE-01](PL-CARTRIDGE-01.md) for complete technical specification.

**Pure Lambda Project** • Offline • Deterministic • DSSE-Verified