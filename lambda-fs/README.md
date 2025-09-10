# λFS: Reactive File System 🌀

> *"API → нахрін, лишається ФАЙЛ"*

Files that materialize when read. No endpoints. No clients. Just **reading**.

## Core Principle

```
open("/views/protein.vec") → compute → cache → bytes
                ↓              ↓         ↓
              WASI          CAS/CID   deterministic
```

Every path is a **program**. Every read is **materialization**.

## Architecture

```
/λfs
  /store/               # Content-Addressed Storage (immutable)
    /bafy.../           # Raw blobs indexed by CID
    
  /genes/               # Source of truth (ProofMD)
    /FOCUS/
      README.md         # ProofMD document
      canon.json        # λ-IR canonical form
      laws.yaml         # Properties that must hold
      rewrites.yaml     # Transformation rules
      proofs.json       # Machine-verified attestations
      
  /views/               # Reactive materialized views
    protein.vec         # READ → computes protein vector
    organism.wasm       # READ → bundles champion genes
    scorecard.json      # READ → generates metrics
    
  /lenses/              # Derivation rules
    protein.vec.lens    # How to build protein.vec
    organism.wasm.lens  # How to build organism.wasm
    
  /wave/                # Wave-file integration
    /observations/      # Read angle history
    /phase/            # Phase matrices
```

## Lens System

Each "live" file has a `.lens` describing how to materialize it:

```yaml
# /lenses/protein.vec.lens
derivation: "wasm://proteomics#graph_spectrum"
inputs:
  canon: "../genes/FOCUS/canon.json"
  params: 
    k: 32
    norm: "L2"
outputs:
  file: "protein.vec"
  format: "f32[32]"
cache_key:
  - inputs.canon      # Content-addressed
  - params.k
  - params.norm
capabilities: ["cpu", "mem"]  # No I/O, no network
proofs:
  - "len(vec) == k"
  - "norm(vec) == 1.0"
  - "stable_hash(vec)"
```

When you `open("/views/protein.vec")`, λFS:

1. Reads the `.lens` file
2. Resolves input paths to CIDs
3. Checks cache for `hash(cache_key)`
4. If miss: runs WASI component in sandbox
5. Stores result in `/store/<cid>`
6. Returns bytes to caller

## OBSERVE Node (Wave-File Integration)

New λ-IR primitive for angle-dependent reading:

```lambda-ir
OBSERVE : (File, θ, φ, Mapping) → View

where:
  File    : Content (bytes/phase matrix)
  θ       : Read angle [0, 2π)
  φ       : Phase shift [0, 1]
  Mapping : Symbol → Basis function
  View    : Projected observation
```

### Laws

```yaml
- name: linearity
  assert: "OBSERVE(αf + βg, θ, φ, m) == α·OBSERVE(f,θ,φ,m) + β·OBSERVE(g,θ,φ,m)"
  
- name: rotation_invariance
  assert: "integrate(OBSERVE(f, θ, φ, m), θ) == invariant(f)"
  
- name: focus_equivalence
  assert: "FOCUS(xs, w, f, g) ≡ OBSERVE(xs, θ→w, φ, map)"
```

## Wave-File as Reactive File

```yaml
# /lenses/wave/theta=45/phase=0.5.vec.lens
derivation: "wasm://wave#observe"
inputs:
  file: "../../content.wave"
  params:
    theta_deg: 45
    phase: 0.5
    mapping: "../../wave-mapping.yaml"
outputs:
  file: "observation.vec"
cache_key: [file, theta_deg, phase, mapping]
capabilities: ["cpu", "mem", "time"]  # Time for phase evolution
proofs:
  - "linearity"
  - "unitarity"
  - "432Hz_resonance"  # Optional but meaningful
```

### Special Character Mapping

```yaml
# wave-mapping.yaml
version: 1
frequency_base: 432  # Hz
mappings:
  ' ':  { basis: "imag", weight: 1.0 }    # Space → imaginary
  '\t': { basis: "real", weight: 1.0 }    # Tab → real
  '\n': { basis: "phase", weight: 2π }    # Newline → full rotation
  '0':  { basis: "zero", weight: 0.0 }    # Digital silence
  '1':  { basis: "one", weight: 1.0 }     # Digital presence
```

## Fractal Navigation (ROI Paths)

Reading with region of interest becomes a path:

```
/views/focus/roi=(x:120..320,y:50..180,σ:12)/sharpened.png
```

The lens parses ROI from path and materializes the focused image in **one pass**.

## Implementation Stack

### 1. λ-Core (no_std Rust)
- IR with OBSERVE node
- Normalization preserving angles
- Soul computation with phase

### 2. WASI Components
- `proteomics#graph_spectrum`
- `wave#observe`
- `forge#bundle_champions`

### 3. λFS Layer (FUSE/virtio-fs)
- Lens parser
- Path → CID resolver
- WASI sandbox runner
- CAS storage

### 4. Deterministic Runtime
- Fixed seed for randomness
- CPU/memory limits
- Proof journaling
- Reproducible builds

## Why This Kills APIs

| Traditional API | λFS |
|----------------|-----|
| Endpoints | Directories with lenses |
| Client SDK | `cat` and `open()` |
| Versioning | Content-addressing |
| Authentication | Capabilities |
| Caching | Automatic via CID |
| Documentation | The file system IS the docs |

## Examples

### Read a protein vector
```bash
cat /views/genes/FOCUS/protein.vec
# Triggers computation if not cached
# Returns 32 floats
```

### Observe wave-file at angle
```bash
cat /views/wave/theta=45/phase=0.618/content.vec
# Golden ratio phase, 45° angle
# Returns interference pattern
```

### Build organism bundle
```bash
cp /views/organism.wasm ./my-organism.wasm
# Triggers bundling of champion genes
# Produces deterministic WASM
```

### Navigate fractal ROI
```bash
ls /views/focus/roi=center:512,512/radius:128/
# Lists available transformations for this ROI
```

## Quick Start

```bash
# Install λFS (requires FUSE)
cargo install lambda-fs

# Mount the file system
lambda-fs mount /mnt/lambda

# Read triggers computation
cat /mnt/lambda/views/protein.vec

# Check what was materialized
ls /mnt/lambda/store/

# Verify proofs
cat /mnt/lambda/views/protein.vec.proof
```

## The Philosophy

Files are not data. Files are **programs waiting to be evaluated**.

Reading is not retrieval. Reading is **materialization**.

Paths are not locations. Paths are **computation requests**.

The file system is not storage. The file system is a **lazy evaluator**.

---

*"In λFS, every read is a small Big Bang - materializing exactly what's needed from the quantum foam of possibilities."* — s0fractal