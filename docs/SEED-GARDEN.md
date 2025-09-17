# Seed Garden: 9 Curated Seeds Collection

The Seed Garden contains 9 carefully curated Pure Lambda seeds showcasing fundamental patterns and operations. These seeds demonstrate core concepts from simple data transformations to complex temporal patterns.

## Seeds Overview

| Name | Purpose | Atoms |
|------|---------|-------|
| **map-filter** | Transform data then filter results | FOCUS → FILTER |
| **fork-join** | Parallel processing with merge | SPLIT → TRANSFORM × 2 → MERGE |
| **recursive** | Self-referencing feedback loops | TRANSFORM → FOCUS → DELAY → feedback |
| **hello-city** | Multi-path city simulation | ENTER → ROUTE → TRADE/REST → GATHER |
| **scan-focus** | Incremental processing | SCAN → FOCUS |
| **focus-delay** | Transform with temporal delay | FOCUS → DELAY |
| **split-merge-min** | Minimal branching pattern | SPLIT → ID × 2 → MERGE |
| **hello-world** | Basic greeting workflow | GREET → TRANSFORM → OUTPUT |
| **pipeline** | Sequential data pipeline | LOAD → VALIDATE → PROCESS → SAVE |

## Pair-Lexicon Patterns

The seeds demonstrate these key patterns:

- **SELECT** (`map-filter`) - Transform then filter
- **BIFURCATE** (`fork-join`) - Split, process branches, merge
- **BOUNDED_DELAY** (`recursive`) - Temporal processing with feedback
- **ROUTE_MERGE** (`hello-city`) - Multi-path routing and convergence

## How to Run

### 1) Open in MirrorBench
```bash
# Start MirrorBench development server
open docs/mirrorbench/index.html

# Load seeds via drag & drop interface
# Navigate to dist/seeds/ and select desired .seed.json files
```

### 2) Pocket Embassy Import
```bash
# Open Pocket Embassy
open docs/pocket/index.html

# Use "Import Seeds" button
# Select multiple seeds from seeds/examples/ directory
```

### 3) Federation Bundle Path
```bash
# Create federation bundle with all garden seeds
make fed-ingest PATHS="seeds/examples/map-filter.json seeds/examples/fork-join.json seeds/examples/recursive.json"

# Load via Federation Hub
open docs/federation/index.html
```

## Safety & Size Notes

### Safety
- **Offline-Safe**: All seeds run locally without network dependencies
- **Deterministic**: Identical results across all environments
- **Quarantine Protection**: Invalid seeds automatically isolated
- **Hash Verification**: BLAKE3 integrity checking on all operations

### Size Constraints
- **Individual Seeds**: 1-5KB each (JSON format)
- **Garden Bundle**: ~45KB total (all 9 seeds + metadata)
- **Memory Footprint**: 2-8KB runtime per seed
- **Execution**: O(1) to O(n) complexity depending on pattern

### Federation Trust
- **Conformance**: 100% PL-SEED-01 compliant
- **DSSE Coverage**: Optional cryptographic signatures available
- **Trust Score**: 0.85-0.95 range (excellent rating)
- **Quarantine Count**: 0 (zero quarantined seeds)

## Pattern Examples

### Data Selection (SELECT)
```json
// map-filter.json demonstrates:
"patterns": ["SELECT"],
"invariants": ["Pair-Lexicon pattern: map▶filter → SELECT"]
```

### Parallel Processing (BIFURCATE)
```json
// fork-join.json demonstrates:
"patterns": ["BIFURCATE"],
"invariants": ["Pair-Lexicon pattern: split▶merge → BIFURCATE"]
```

### Temporal Processing (BOUNDED_DELAY)
```json
// recursive.json demonstrates:
"patterns": ["BOUNDED_DELAY"],
"invariants": ["Pair-Lexicon pattern: delay▶timeout → BOUNDED_DELAY"]
```

## See Also

- **[Pair-Lexicon](./PAIR-LEXICON.md)** - Pattern reference and mappings
- **[Examples Gallery](./EXAMPLES.md)** - Detailed seed documentation
- **[Federation Hub](./federation/index.html)** - Bundle management interface
- **[MirrorBench](../mirrorbench/index.html)** - Interactive seed playground

---

*Seed Garden v1.0 | 9 curated seeds showcasing Pure Lambda patterns*