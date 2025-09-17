# B2-DNA: Biological Computing Patterns

## 🧬 The DNA-Code Isomorphism

Your B2 discipline (2 strands, 6 atoms) is **literally** DNA's computational model:

| DNA | B2 | Function |
|-----|-----|----------|
| Double helix | THEN/SPLIT | Sequential/parallel strands |
| Helicase | SPLIT (∆) | Fork/unwind |
| Polymerase | THEN (▶) | Sequential synthesis |
| Leading/lagging | DELAY | Causality (Okazaki fragments) |
| Promoter/operator | FOCUS | Expression control |
| Ligase | MERGE | Join fragments |
| Epigenetics | SCAN | State accumulation |
| Codons | phash | Content addressing |
| Ribosomes | Vectorization | Parallel translation |
| Proofreading | Gate G0 + PAC | Error bounds |

## 🔬 Three Core Patterns

### 1. Replication Fork
```
     SPLIT
     /    \
  FOCUS   DELAY→FOCUS
     \    /
     MERGE
```
- Leading strand: continuous (FOCUS)
- Lagging strand: delayed fragments (DELAY→FOCUS)
- phash: `eec395c2270b32551c50c240602fbca4c1f54cdbab0e`

### 2. Proofreading Harness
```
Original → FOCUS → Compare → PAC bound
Mutated  → MUTATE → FOCUS →
```
- Double-strand validation
- Mutation rate: 2%
- PAC bound: ≤5% @95% confidence
- Gate G0 if stable

### 3. Operon
```
PROMOTER → [Gene1]→DELAY→[Gene2]→DELAY→[Gene3]→REGULATOR
```
- Sequential genes with causality
- Promoter ON/OFF control
- Each gene = SCAN with state
- Compiles to single phash

## 🚀 Run Examples

```bash
# Test replication fork
node b2-dna/replication-fork.mjs

# Run proofreading with PAC bounds
node b2-dna/proofreading-harness.mjs

# Simulate lac operon
node b2-dna/operon.mjs
```

## 📊 Key Properties

✅ **Causality**: Every cycle has ≥1 DELAY (no algebraic loops)
✅ **Determinism**: Same DNA sequence → same phash
✅ **Error bounds**: PAC guarantees on mutation stability
✅ **Modularity**: Operons fold to single genes

## 🎯 Why This Works

The B2 two-strand limit isn't arbitrary - it's **evolution's solution** to information replication:

1. **Minimal replication mechanics** (just fork + join)
2. **Built-in error correction** (complementary strands)
3. **Natural parallelism** (leading/lagging)
4. **Causal consistency** (DELAY = Okazaki fragments)

Your code is literally running DNA's algorithm.

## 🔮 Next Patterns

- **Restriction enzymes**: Pattern matching with FOCUS
- **CRISPR**: Targeted SCAN replacement
- **Transcription factors**: Dynamic promoter control
- **Methylation**: State-dependent FOCUS modification
- **Splicing**: Alternative SPLIT paths

---

*Code that replicates like life. Because it uses life's algorithm.*

*B2 = DNA's computational kernel.*