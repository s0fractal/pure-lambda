# MVS Implementation Checklist

## ✅ Completed (H0 - Foundation)
- [x] AgentSpec formalization (Agent = ⟨Genome, Memory, Intent, Policy, Perception, Actuation⟩)
- [x] Genome v0: FOCUS, OBSERVE, REDUCE with proven laws
- [x] PROVENANCE.md with license policy and evolution tracking
- [x] Proof+Bench CI pipeline (.github/workflows/proof-bench-ci.yml)
- [x] Gene documentation with witnesses (docs/genome/*.md)

## 🔄 H1 - Organism that Breathes (Current Sprint)

### Memory v0 with Temporal Indexing
- [ ] Implement immutable snapshot chain in `core/memory-v0.ts`
- [ ] Add CAS (Blake3) for each snapshot
- [ ] Create λFS lens for memory access `/views/memory/snapshot-{n}`
- [ ] Test replay from any snapshot
- [ ] Benchmark memory growth over 1000 ticks

### WASM Runtime with Limited Host-ABI
- [ ] Setup `wasm-pack` for λKernel compilation
- [ ] Define minimal host ABI:
  - `read_view(lens: string) → bytes`
  - `write_intent(lens: string, data: bytes) → bool`
  - `get_time() → u64`
- [ ] Create WASI shim for sandboxed IO
- [ ] Test agent running in browser via WASM
- [ ] Benchmark WASM vs native performance

### SPDX License Filtering for Devour
- [ ] Add `spdx-license-list` dependency
- [ ] Implement `devour-core check-licenses` command
- [ ] Create allowlist: MIT, Apache-2.0, BSD, ISC
- [ ] Auto-reject: GPL, AGPL, proprietary
- [ ] Update PROVENANCE.md on each absorption

### Real λFS Integration Test
- [ ] Create working example: `/views/protein.vec`
- [ ] Implement lens that computes on read
- [ ] Add CID generation for materialized view
- [ ] Test with agent perception pipeline
- [ ] Generate fixtures in `tests/fixtures/`

## 📋 H2 - Nervous System & Immunity (Next Sprint)

### Policy as Proofs
- [ ] Formalize policy predicates as SMT constraints
- [ ] Integrate Z3 or similar solver
- [ ] Create audit trail with CIDs
- [ ] Test policy violation → halt
- [ ] Benchmark proof checking overhead

### Mathematical Surgeon in Loop
- [ ] Integrate e-graph library (egg-rs)
- [ ] Auto-surgery triggered by fitness < threshold
- [ ] Require witness for property preservation
- [ ] Test 10 surgery cycles without regression
- [ ] Track fitness evolution

### Gene Reputation System
- [ ] Add metrics to each gene: speed, memory, proof count
- [ ] Implement evolutionary selection
- [ ] Champion genes survive, weak genes deprecate
- [ ] Test population dynamics over 100 generations
- [ ] Visualize gene fitness landscape

## 🌐 H3 - Civilization (Future)

### IPFS Gene Peering
- [ ] Setup IPFS node for gene sharing
- [ ] Implement gene signing with ed25519
- [ ] Create reputation scores for contributors
- [ ] Test cross-agent gene transfer
- [ ] Build gene marketplace UI

### Human-Agent Contracts
- [ ] ProofMD as executable contracts
- [ ] Human specifies intent → agent proves completion
- [ ] Implement consent protocol
- [ ] Test human-agent collaboration scenarios
- [ ] Create training/calibration interface

## 📊 Success Metrics (KPIs)

### Performance
- [ ] λ-reduction: < 100μs for 100 nodes
- [ ] Memory: < 1MB for 1000 snapshots
- [ ] WASM overhead: < 20% vs native

### Quality
- [ ] Gene law coverage: 100%
- [ ] License compliance: 100%
- [ ] Fitness improvement: > 10% per generation

### Adoption
- [ ] Working examples: 5+
- [ ] Contributors: 3+
- [ ] Gene pool size: 10+

## 🚀 Quick Commands

```bash
# Verify all genes
node gene-md-simple.js verify docs/genome/*.md

# Run benchmarks
cd lambda-kernel/core && cargo bench --no-default-features

# Test agent
node examples/integration-demo.js

# Check licenses
./devour-core check-licenses

# Build WASM
wasm-pack build lambda-kernel/core --target web
```

## 📝 Notes

- **Priority**: H1 items block everything else
- **Dependencies**: Memory v0 needed before WASM (state persistence)
- **Risk**: WASM ABI design critical - keep minimal
- **Opportunity**: λFS integration could enable novel UX

---
*Checklist created: 2024-01-XX*
*Target H1 completion: 1-2 sprints*
*Maintainer: @s0fractal + @Claude*