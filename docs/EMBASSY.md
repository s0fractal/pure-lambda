<!-- SPDX-License-Identifier: MIT -->
<!-- Copyright (c) 2025 Pure Lambda Authors -->

# Embassy Pack v3 Usage Guide

Embassy Pack v3 is Pure Lambda's single-file offline verification system. It combines data loading, cryptographic verification, and SLO badge display in one HTML file that requires no network access.

## Quick Start

1. **Open** `embassy/index.html` in your browser
2. **Load** your `operon.json` or `operon.car` file
3. **Load** your `receipts/last.json` and `envelope.json` files
4. **Click** "Run Verify" to execute the verification process

## File Requirements

### Primary Data
- **operon.json**: Your compiled Pure Lambda operon (JSON format)
- **operon.car**: Your compiled Pure Lambda operon (IPLD CAR format) *[v3.1+]*

### Attestation Files
- **receipts/last.json**: Latest execution receipt with performance metrics
- **envelope.json**: DSSE-signed provenance envelope from `receipts/attest/`

## Verification Process

Embassy Pack v3 performs a 4-step verification:

### Step 1: DSSE Envelope Loading
- Validates payload type (`purelambda/provenance+json`)
- Extracts and parses the base64-encoded provenance data
- Displays timestamp, git revision, and tool versions

### Step 2: Ed25519 Signature Verification
- Checks signature format and key IDs
- Validates cryptographic signatures against payload
- Reports the number of valid signatures found

### Step 3: Hash Recomputation
- Computes SHA-256 hash of your operon.json
- Measures file size and displays hash prefix
- Prepares for integrity comparison

### Step 4: Provenance Comparison
- Locates the `dist/operon.json` entry in provenance outputs
- Compares computed hash with recorded hash
- **PASS**: Hashes match → File integrity verified ✅
- **FAIL**: Hash mismatch → Potential tampering detected ❌

## SLO Badge Interpretation

Embassy Pack displays Service Level Objective badges extracted from your data:

- **W-SLO**: Worst-case performance guarantee
- **κ-SLO**: Complexity bound coefficient
- **Regret (avg)**: Average optimization regret from autopilot
- **Git Rev**: Source code revision (first 8 characters)

## Offline Guarantee

Embassy Pack v3 makes **zero network calls**. All verification logic is contained in the HTML file:

- Cryptographic functions use browser WebCrypto API
- File loading uses local FileReader API
- No external dependencies or CDN resources
- Works in air-gapped environments

## Safety Features

### BIOLOCK Lint Integration
Embassy Pack includes preflight safety checking:
- **Unsafe operations**: Rejected before processing
- **Malformed data**: Validated against expected schemas
- **Resource limits**: File size and complexity bounds enforced

### Security Boundaries
Embassy Pack v3 **only verifies**:
- File integrity (SHA-256 hash matching)
- Signature validity (Ed25519 cryptographic verification)
- Provenance completeness (required fields present)

Embassy Pack v3 **does not verify**:
- Code semantics or business logic
- Security properties beyond our invariants
- Fitness for any particular use case

## Troubleshooting

### "Hash mismatch" Error
- **Cause**: Operon file modified after signing
- **Solution**: Re-download original signed files

### "Invalid signature format" Error
- **Cause**: Corrupted or incomplete envelope.json
- **Solution**: Verify envelope.json is complete and valid JSON

### "CAR files not yet supported"
- **Cause**: Loaded .car file in current version
- **Solution**: Use .json format, or upgrade to Embassy Pack v3.1+

### "Missing: [files]" Warning
- **Cause**: Required files not loaded
- **Solution**: Load all three file types before verification

## Integration Examples

### CI/CD Pipeline
```bash
# Generate embassy pack as part of build
./embassy-pack-v3.sh dist/operon.json receipts/last.json receipts/attest/envelope.json

# Publish embassy-pack-v3.zip for verification
```

### Local Development
```bash
# Quick verification after build
open embassy/index.html
# Load files through UI, verify locally
```

Embassy Pack v3 enables trustless verification of Pure Lambda executions with full offline capability and cryptographic guarantees.