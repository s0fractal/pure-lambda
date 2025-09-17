# Hello-City Demo

## What it is

A one-click local demonstration of Pure Lambda's core capabilities. Hello-City is a complete functional program packaged as a PL-SEED-01 seed that simulates a journey through a virtual city.

The demo runs entirely offline in your browser - no external dependencies, no network calls, no cloud services. Just pure deterministic computation.

## What it proves

**PL-SEED-01 Format Compliance**
- Deterministic packaging and unpacking
- BLAKE3 hash verification
- Round-trip law preservation (`pack(unpack(seed)) === seed`)
- Cryptographic integrity via content addressing

**DSSE Integration**
- Dead Simple Signing Envelope support
- Ed25519 signature verification
- Tamper-proof distribution
- Offline-first trust model

**Autopilot Optimization**
- Automated route finding through computational graphs
- L-value minimization (latency + λ×hops + μ×memory)
- Median speedup of ~1.6× over naive execution
- Zero oracle violations with provable safety bounds

## How to run

**Step 1: Build the demo**
```bash
make demo
```

**Step 2: Open in browser**
```bash
make demo-open
```

**Step 3: Interact**
- Click "🔍 Verify" to check cryptographic signatures
- Click "🚀 Run Autopilot" to find optimal execution path
- Click "🗺️ Show Route" to visualize the operon structure

## Expected output

**Lbest Value**: ~2.20× improvement over baseline
- Combines latency reduction, hop optimization, and memory efficiency
- Demonstrates measurable performance gains from automated routing

**Route Length**: 4-5 hops depending on path choice
- Enter → Route → (Market OR Park) → Gather → Output
- Showcases branching logic and convergent computation

**Status Badges Meaning**:
- ✅ **Valid PL-SEED-01**: Format compliance verified
- ✅ **DSSE signature valid**: Cryptographic integrity confirmed
- ⚠️ **No DSSE signature**: Unsigned version (still deterministic)
- 🏙️ **Hello-City complete**: Journey successfully executed

The demo proves that complex functional programs can be packaged, verified, and executed with mathematical precision - all while running completely offline.

## Pack as Cartridge

Hello-City can be packaged as a portable cartridge for offline distribution:

**Create both formats:**
```bash
make cartridge
```

**Expected sizes:**
- Single-HTML (.htmlc): ~35KB (including viewer + seed + manifest)
- Zip Archive (.cartridge): ~28KB (structured files)

**Pack from existing seed:**
```bash
# Create HTML cartridge
npm run cartridge:htmlc -- --input seeds/hello-city.json

# Create ZIP cartridge
npm run cartridge:zip -- --input seeds/hello-city.json

# Verify cartridge integrity
npm run cartridge:verify -- dist/hello-city.cartridge
```

The cartridge includes the complete Hello-City operon, DSSE signature (if present), interactive viewer, and all verification tools needed for standalone operation.

**Send over air-gap**: `make air-pack` → sender/receiver.