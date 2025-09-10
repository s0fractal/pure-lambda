# Gene Registry 🧬

> *Living documentation for λ-genes with proofs, laws, and content-addressing*

## What is ProofMD?

ProofMD is a literate programming approach where:
- **Humans read** the story, intent, and examples
- **Machines verify** the laws, proofs, and transformations
- **IPFS deduplicates** content automatically via CIDs
- **Every block is addressable** and verifiable

## Gene Index

| Gene | Soul | Intent | Laws | Status |
|------|------|--------|------|--------|
| [FOCUS](FOCUS.md) | λ-3f5c7b2a9 | Laser operator for data/coordinate spaces | 5 proven | Active |
| [MAP](MAP.md) | λ-pending | Pure transformation over collections | 3 pending | Draft |
| [FILTER](FILTER.md) | λ-pending | Predicate-based selection | 3 pending | Draft |
| [FOLD](FOLD.md) | λ-pending | Catamorphism with accumulator | 4 pending | Draft |
| [SCAN](SCAN.md) | λ-pending | Fold with intermediate results | 4 pending | Draft |

## Structure of a Gene Document

Each `.md` file contains:

1. **Front Matter** - Metadata (name, soul, intent, ancestry)
2. **Canon** - λ-IR in JSON (the mathematical truth)
3. **Laws** - Properties that must hold
4. **Rewrites** - Transformation rules
5. **Proofs** - Machine-verified properties
6. **Metrics** - Performance characteristics
7. **Examples** - For humans and compilers
8. **Links** - Content-addressed blocks (CIDs)

## Quick Start

```bash
# Install gene-md tool
npm install -g ./gene-md-package.json

# Extract blocks from a gene document
gene-md extract docs/genome/FOCUS.md

# Canonicalize λ-IR for deterministic CIDs
gene-md canonize docs/genome/.genome/*.json

# Compute soul hash
gene-md soul docs/genome/.genome/focus.canon.json

# Verify all laws are proven
gene-md attest docs/genome/FOCUS.md --strict

# Update CIDs in document
gene-md link docs/genome/FOCUS.md

# Publish to IPFS (requires running daemon)
gene-md ipfs add docs/genome/FOCUS.md --pin
```

## Why ProofMD?

### Self-Deduplication
- Same law in different genes → same CID → single storage
- Content addressing ensures no duplicate proofs
- Merkle root (`doc_soul`) identifies unique documents

### Machine Verification
- GitHub Actions run attestation on every push
- Laws are checked against proofs
- Souls are computed and verified
- Breaking changes are caught immediately

### Human Readability
- Markdown renders beautifully on GitHub
- Examples show real usage
- Evolution paths show gene lineage
- Metrics prove performance claims

## Contributing a Gene

1. **Create** `docs/genome/YOURGEN.md` from template
2. **Define** canon (λ-IR), laws, and rewrites
3. **Prove** properties (manually or via solver)
4. **Benchmark** performance metrics
5. **Submit** PR - CI will verify everything

## The Vision

```
Code → Gene → Proof → Publication → Evolution
         ↓       ↓          ↓           ↓
       λ-IR    Laws       CIDs      Mutations
```

Every piece of code becomes:
- **Addressable** via content hash
- **Verifiable** via embedded proofs  
- **Composable** via law-preserving rewrites
- **Evolvable** via ancestry tracking

## Example: FOCUS Discovery

The FOCUS gene emerged from recognizing that `map(filter(xs, p), f)` was doing two passes where one sufficed. This led to:

1. **Hard focus** - Boolean gate (filter+map fusion)
2. **Soft focus** - Attention weights (ML-inspired)
3. **Spatial focus** - ROI with fractal projection

The gene document [FOCUS.md](FOCUS.md) captures:
- The mathematical definition (λ-IR)
- Five proven laws (E1-E5)
- Rewrite rules for optimization
- Performance metrics (1.8x speedup)
- Real-world examples

## IPFS Integration

Each gene document and its blocks are published to IPFS:

```bash
# Local pinning
ipfs add docs/genome/FOCUS.md
# Returns: QmXyZ...abc

# Access via gateway
https://ipfs.io/ipfs/QmXyZ...abc

# Pin to remote service
ipfs pin remote add --service=pinata QmXyZ...abc
```

## Security & Trust

1. **Document soul** = hash of all block CIDs
2. **Signature** = GPG/minisign on document soul
3. **Verification** = Check signature + match CIDs
4. **No network needed** for verification (offline-first)

## Roadmap

- [x] ProofMD format specification
- [x] gene-md CLI tool
- [x] GitHub Actions integration
- [x] FOCUS gene as example
- [ ] Solver integration for automatic proofs
- [ ] IPNS for mutable references
- [ ] Gene mutation tracking
- [ ] Cross-gene law verification
- [ ] Visual gene explorer

---

*"Make genes readable by humans, verifiable by machines, and addressable by the universe."* — s0fractal