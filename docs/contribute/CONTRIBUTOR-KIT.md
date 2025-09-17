# Pure Lambda Contributor Kit

## What is a Seed?

A **seed** is a Pure Lambda program specification containing:
- **Graph structure**: nodes and edges defining computational flow
- **Canonical representation**: deterministic JSON format with sorted keys
- **Identity markers**: GID (graph), IID (interface), XIDv2 (execution context)
- **Metadata**: route costs, profile constraints, provenance

Seeds enable reproducible, verifiable distributed computation with mathematical purity guarantees.

## Size & Quality Gates

**Hard Limits:**
- Seed file: ≤ 80KB
- Node count: ≤ 1000 nodes
- Edge density: ≤ 5000 edges
- DSSE envelope: ≤ 20KB

**Quality Requirements:**
- **Trust Score ≥ 95%** (weighted: 40% DSSE + 40% conformance + 20% freshness)
- **DSSE attestation**: cryptographic integrity proof
- **Conformance**: passes invariant tests (GID/IID/XID stability, route validation)
- **Canonical format**: deterministic serialization with sorted keys

## DSSE (Digital Signature Standard Envelope)

**Purpose**: Cryptographic attestation proving seed integrity and provenance.

**Structure**:
```json
{
  "schema": "PL-DSSE-01",
  "subject": {
    "name": "my-seed.json",
    "blake3": "cf84f257cb41a463...",
    "size": 2048,
    "gitRev": "873a585bafdafa41..."
  },
  "provenance": {
    "builder": "pure-lambda/contributor",
    "reproducible": true
  }
}
```

**Verification**: Trust gate validates signature, subject hash, and provenance chain.

## Submission Workflow (Air-Gapped)

### 1. QR Code Generation
```bash
npm run ck:qr your-seed.json
# → out/seed-qr.svg (deterministic QR containing base64url canonical seed)
```

### 2. Offline Validation
- Scan QR with **Pocket Contribute** (≤60KB offline tool)
- Validates: canonicalization → conformance → XIDv2 computation → DSSE verification
- Shows **Trust Score** or failure reasons

### 3. Optional Signing
- Generate DSSE envelope with your DID key
- Proves authorship and integrity

### 4. Bundle Creation
```bash
node scripts/ck/bundle.mjs your-seed.json
# → out/ck/your-seed.cartridge (seed + envelope + manifest)
```

### 5. PR Generation
```bash
node scripts/ck/pr.mjs out/ck/your-seed.cartridge
# → out/ck/PR.md (GitHub-ready pull request)
```

### 6. Transfer
- Use **Pocket Direct** for air-gapped transfer
- Submit PR.md via any method (even copy-paste)

## Trust Gate Requirements

**Automatic Acceptance** (trust ≥ 95%):
- ✅ Valid DSSE signature
- ✅ Conformance tests pass (GID/IID/XID invariants)
- ✅ Size within limits
- ✅ Canonical format
- ✅ Fresh submission (≤7 days)

**Manual Review** (trust < 95%):
- Auto-comment with diagnostic details
- Link to Pocket Contribute for local debugging
- Maintainer approval required

## Quality Assurance

**Federation Integration**:
- XIDv2 collision detection with existing seeds
- Family relationships (same GID, different IID/XID)
- Quarantine system for conflicts

**Reproducibility**:
- Same canonicalBytes() as federation ingest
- Deterministic XIDv2 computation
- Identical DSSE verification logic

**Security**:
- Key rotation support
- DID-based provenance
- Rate limiting (20 seeds/week maximum)

## Getting Started

1. **Study examples**: `seeds/garden/` contains reference implementations
2. **Test locally**: Use Pocket Contribute for validation
3. **Follow workflow**: QR → validate → bundle → PR
4. **Monitor status**: Trust dashboard shows acceptance criteria

**Questions?** Open an issue with the `seed-proposal` template.