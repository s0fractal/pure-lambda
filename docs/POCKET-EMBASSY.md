<!-- SPDX-License-Identifier: MIT -->
<!-- Copyright (c) 2025 Pure Lambda Authors -->

# Pocket Embassy - Lightweight Offline Toolkit

Pocket Embassy is Pure Lambda's ultra-compact, offline-first verification toolkit. It combines seed verification, demo capabilities, and AirGap receiver functionality in a single self-contained HTML file (≤60KB).

## What is Pocket Embassy?

A portable, dependency-free HTML application that provides:
- **Demo Viewer**: Interactive visualization of the Hello-City seed with autopilot optimization
- **AirGap Receiver**: QR code and ShareCode assembly for offline data transfer
- **DSSE Verification**: Cryptographic integrity checking with Ed25519 signatures
- **Zero Dependencies**: Runs completely offline with no external resources

## Why Use Pocket Embassy?

Unlike the full Embassy Pack, Pocket Embassy prioritizes **portability and simplicity**:
- **Ultra-lightweight**: ≤60KB single file vs full Embassy's multi-file structure
- **No setup required**: Open in any browser, works immediately
- **Air-gapped friendly**: Perfect for secure, isolated environments
- **Educational**: Demonstrates core Pure Lambda concepts interactively

## How-to (2 Steps)

### Step 1: Access
```bash
# Open directly in browser
open docs/pocket/index.html

# Or via make target
make pocket-open
```

### Step 2: Interact
1. **Demo Tab**: Click "🚀 Run Autopilot" to see optimization in action
2. **AirGap Tab**: Paste QR frames or ShareCodes to assemble files offline
3. **Verify Tab**: Load envelope.json files for DSSE signature verification

## Expected Output

### Demo Performance
- **Lbest Score**: ~2.20× improvement over baseline execution
- **Route Optimization**: 4-hop path through Hello-City (ENTER → ROUTE → REST → GATHER)
- **Speedup**: +67% execution efficiency via autopilot route finding

### Verification Results
- ✅ **Seed Hash**: BLAKE3 integrity verification
- ✅ **Round-trip Law**: pack(unpack(seed)) === seed invariant
- ⚠️ **DSSE Signature**: Ed25519 verification (when envelope present)

### AirGap Assembly
- **Frame Processing**: Supports both QR frames and ShareCode blocks
- **Progress Tracking**: Visual progress bar for multi-frame assembly
- **Auto-Download**: Reconstructed files available for local save

## Safety Notes

### Security Boundaries
Pocket Embassy **verifies**:
- File integrity via cryptographic hashing
- Signature validity via Ed25519 verification
- Round-trip law preservation for deterministic operation

Pocket Embassy **does not verify**:
- Code semantics or business logic correctness
- Security properties beyond stated invariants
- Fitness for any particular production use case

### Offline Guarantee
- **Zero network calls**: All computation happens locally
- **No telemetry**: No data leaves your browser
- **No external dependencies**: Uses only browser WebCrypto API
- **Air-gap compatible**: Functions in completely isolated environments

### Size Constraints
- **Target size**: ≤60KB for optimal portability
- **Lite functionality**: Reduced feature set compared to full Embassy Pack
- **Memory efficient**: Minimal resource usage for embedded scenarios

### Usage Recommendations
- **Development**: Quick verification during local development cycles
- **Education**: Learning Pure Lambda concepts and optimization patterns
- **Air-gapped environments**: Secure verification without network access
- **Not recommended**: Production deployment verification (use full Embassy Pack)

---

**Pocket Embassy v1.0** • Mathematical rigor in ≤60KB • Operates without permission