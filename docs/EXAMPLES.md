# Pure Lambda Examples Gallery

Welcome to the Pure Lambda Examples Gallery! This collection showcases canonical seed patterns that demonstrate the power and flexibility of the PL-SEED-01 protocol. Each example illustrates key concepts in cross-dimensional genetics and functional programming.

## Overview

These examples demonstrate the core operators and patterns available in Pure Lambda:
- **Operators**: FOCUS, DELAY, TRANSFORM, MERGE, SPLIT, FILTER, REDUCE, MAP
- **Patterns**: Pair-Lexicon aliases for common 2-gram operations
- **Genetics**: GID (genotype), IID (interface), XID (execution) relationships

---

## 🌱 Hello World
**The simplest seed - a single FOCUS operator**

```json
{
  "name": "hello-world",
  "tiles": 1,
  "pattern": "identity",
  "complexity": "O(1)"
}
```

A minimal example demonstrating the basic structure of a Pure Lambda seed. Contains a single FOCUS tile that performs identity transformation on input data.

- **Route Length**: 1
- **Use Case**: Basic data passthrough, template for building larger operons
- **NF Preview**: `FOCUS(identity, data → result)`

[View Seed JSON](../seeds/examples/hello-world.json) | [Generate NF](../tools/nf.ts)

---

## 🔍 Map-Filter Pattern (SELECT)
**Classic functional pattern with Pair-Lexicon alias**

```json
{
  "name": "map-filter",
  "tiles": 2,
  "pattern": "map▶filter → SELECT",
  "complexity": "O(n)"
}
```

Demonstrates the canonical map-filter pattern, aliased as "SELECT" in the Pair-Lexicon. This pattern transforms data through a function and then filters the results based on a predicate.

- **Route Length**: 2
- **Pair-Lexicon**: `map▶filter` → `SELECT`
- **External Equivalents**:
  - SQL: `SELECT f(x) FROM table WHERE p(f(x))`
  - RxJS: `map(f).filter(p)`
- **Use Case**: Data transformation with conditional selection

[View Seed JSON](../seeds/examples/map-filter.json) | [Generate NF](../tools/nf.ts)

---

## 🍴 Fork-Join Pattern (BIFURCATE)
**Split processing into parallel branches then merge**

```json
{
  "name": "fork-join",
  "tiles": 4,
  "pattern": "split▶merge → BIFURCATE",
  "complexity": "O(log n)"
}
```

Classic parallel processing pattern that splits input into multiple branches, processes them independently, then merges the results. Demonstrates Pure Lambda's support for concurrent execution.

- **Route Length**: 3 (minimum path through parallel branches)
- **Pair-Lexicon**: `split▶merge` → `BIFURCATE`
- **External Equivalents**:
  - SQL: `CASE WHEN p(x) THEN f1(x) ELSE f2(x) END`
  - RxJS: `partition(p).mergeMap([f1, f2])`
- **Use Case**: Parallel data processing, load distribution

[View Seed JSON](../seeds/examples/fork-join.json) | [Generate NF](../tools/nf.ts)

---

## 🏭 Pipeline Processing
**5-stage linear processing pipeline**

```json
{
  "name": "pipeline",
  "tiles": 5,
  "pattern": "MAP → FILTER → REDUCE → TRANSFORM → FOCUS",
  "complexity": "O(n)"
}
```

A comprehensive linear pipeline demonstrating sequential data transformation through multiple stages. Each stage performs a different type of operation, showcasing the variety of operators available.

- **Route Length**: 5 (linear sequential processing)
- **Stages**:
  1. MAP: Transform input data
  2. FILTER: Remove unwanted elements
  3. REDUCE: Aggregate/summarize data
  4. TRANSFORM: Apply final transformation
  5. FOCUS: Extract result
- **Use Case**: ETL pipelines, data processing workflows

[View Seed JSON](../seeds/examples/pipeline.json) | [Generate NF](../tools/nf.ts)

---

## 🔄 Recursive Processing (BOUNDED_DELAY)
**Self-referencing computation with temporal delay**

```json
{
  "name": "recursive",
  "tiles": 4,
  "pattern": "delay▶timeout → BOUNDED_DELAY",
  "complexity": "O(1) per iteration"
}
```

Demonstrates recursive computation patterns using feedback loops and temporal delays. The DELAY operator prevents infinite loops while allowing iterative refinement of results.

- **Route Length**: 3 (with feedback cycle)
- **Pair-Lexicon**: `delay▶timeout` → `BOUNDED_DELAY`
- **External Equivalents**:
  - SQL: `WAIT FOR DELAY δt TIMEOUT τmax`
  - RxJS: `delay(dt).timeout(tmax)`
- **Use Case**: Iterative algorithms, feedback control systems, temporal processing

[View Seed JSON](../seeds/examples/recursive.json) | [Generate NF](../tools/nf.ts)

---

## 🌐 Distributed Processing (ROUTE_MERGE)
**Multi-branch parallel processing with specialized operations**

```json
{
  "name": "distributed",
  "tiles": 6,
  "pattern": "switch▶merge → ROUTE_MERGE",
  "complexity": "O(n) parallel"
}
```

Advanced parallel processing pattern that routes data to specialized processing branches before merging results. Demonstrates Pure Lambda's capability for distributed computation patterns.

- **Route Length**: 3 (minimum through parallel branches)
- **Branches**:
  - Branch A: MAP transformation
  - Branch B: FILTER selection
  - Branch C: REDUCE aggregation
- **Pair-Lexicon**: `switch▶merge` → `ROUTE_MERGE`
- **Use Case**: Distributed computing, specialized data processing, microservices patterns

[View Seed JSON](../seeds/examples/distributed.json) | [Generate NF](../tools/nf.ts)

---

## 🧬 Genetics Metaphor

Each example demonstrates key aspects of the Pure Lambda genetics model:

- **GID (Genotype)**: Immutable operator identity independent of ports/context
- **IID (Interface)**: Stable interface signature for equivalent ABIs
- **XID (Execution)**: Runtime execution context and state

### Invariants Tested
- ✅ GID independence from port configurations
- ✅ IID equality for ABI-equivalent operations
- ✅ Temporal ordering preservation
- ✅ Parallel execution correctness
- ✅ Pair-Lexicon pattern recognition

---

## 🛠️ Using Examples

### Generate NF (Normal Form)
```bash
# Convert any example to NF
./tools/nf.ts seeds/examples/hello-world.json

# Run autopilot optimization
./tools/autopilot.ts seeds/examples/pipeline.json --lambda 0.2 --mu 0.001
```

### Create Your Own Seeds
Use these examples as templates for building custom operons:

1. Start with `hello-world.json` for simple transformations
2. Use `map-filter.json` for data selection patterns
3. Build on `fork-join.json` for parallel processing
4. Extend `pipeline.json` for complex workflows
5. Adapt `recursive.json` for iterative algorithms
6. Scale with `distributed.json` for multi-service architectures

### Validation
All examples pass conformance testing:
```bash
npm test -- --grep "examples"
```

---

## 📚 Next Steps

- **[Pair-Lexicon Reference](./PAIR-LEXICON.md)**: Complete catalog of 2-gram pattern aliases
- **[SDK Quickstart](./SDK-QUICKSTART.md)**: Build your first Pure Lambda application
- **[Seed Workflows](./SEED-WORKFLOWS.md)**: Advanced composition techniques
- **[Gallery Tool](../tools/gallery.ts)**: Generate custom example galleries

---

*Pure Lambda v1.0.0 | Cross-dimensional genetics for functional programming*