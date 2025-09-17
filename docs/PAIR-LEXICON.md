# Pair-Lexicon: 2-Gram Pattern Aliases

The Pair-Lexicon provides human-readable aliases for common 2-gram operation patterns in Pure Lambda. These aliases serve as documentation and UI helpers, making complex functional patterns more accessible.

## Overview

The Pair-Lexicon maps frequently used operator sequences to semantic aliases, similar to how programming languages provide syntactic sugar. These patterns are purely for convenience—the underlying NF (Normal Form) representation remains canonical.

---

## Complete Reference Table

| Pattern | NF | Alias | Description | SQL Equivalent | RxJS Equivalent |
|---------|-----|-------|-------------|----------------|-----------------|
| `map▶filter` | `FOCUS(p∘f,f)` | **SELECT** | Select elements matching predicate after transformation | `SELECT f(x) FROM table WHERE p(f(x))` | `map(f).filter(p)` |
| `filter▶map` | `FOCUS(f,p)` | **TRANSFORM_IF** | Transform elements that match predicate | `SELECT f(x) FROM table WHERE p(x)` | `filter(p).map(f)` |
| `split▶merge` | `PARTITION(λx.p(x), λy.¬p(y))` | **BIFURCATE** | Separate into two streams then recombine | `CASE WHEN p(x) THEN f1(x) ELSE f2(x) END` | `partition(p).mergeMap([f1, f2])` |
| `scan▶reduce` | `ACCUMULATE(⊕, ε)` | **AGGREGATE** | Accumulate values with final reduction | `SUM(x) OVER (ORDER BY t)` | `scan(op, initial).reduce(final)` |
| `delay▶timeout` | `TEMPORAL(δt, τmax)` | **BOUNDED_DELAY** | Delay with maximum time limit | `WAIT FOR DELAY δt TIMEOUT τmax` | `delay(dt).timeout(tmax)` |
| `group▶sort` | `CLUSTER(≡, ≤)` | **ORDERED_GROUPS** | Group by equivalence then sort within groups | `ORDER BY key, value` | `groupBy(key).map(g => g.sort(compare))` |
| `take▶drop` | `WINDOW(n, m)` | **SLICE** | Take n elements, skip m elements | `OFFSET m LIMIT n` | `skip(m).take(n)` |
| `flatten▶distinct` | `UNIQUE(⊔)` | **DEDUPE_FLATTEN** | Flatten nested structures and remove duplicates | `SELECT DISTINCT x FROM table, UNNEST(array_col) AS x` | `flatMap(identity).distinct()` |
| `switch▶merge` | `MULTIPLEX(σ, ⊔)` | **ROUTE_MERGE** | Route based on selector then merge results | `UNION ALL SELECT * FROM table1 WHERE p UNION ALL SELECT * FROM table2 WHERE NOT p` | `switchMap(selector).merge()` |
| `zip▶map` | `COMBINE(⊗, f)` | **PAIRED_TRANSFORM** | Combine paired elements with transformation | `SELECT f(a.x, b.y) FROM tableA a JOIN tableB b ON a.id = b.id` | `zip(streamA, streamB).map(([a, b]) => f(a, b))` |
| `buffer▶batch` | `SEGMENT(n, τ)` | **WINDOWED_BATCH** | Buffer elements into batches by count or time | `SELECT ARRAY_AGG(x) FROM table GROUP BY FLOOR(row_number()/n)` | `buffer(timer(dt)).filter(b => b.length > 0)` |
| `retry▶fallback` | `RESILIENT(n, φ)` | **FAULT_TOLERANT** | Retry operation n times then use fallback | `TRY_CONVERT(type, value) ?? default_value` | `retry(n).catchError(() => of(fallback))` |

**Note**: Pair-Lexicon aliases are preserved during federation exchange. The Normal Form (NF) representation remains unchanged when seeds are packaged, distributed, or ingested through federation bundles.

---

## Pattern Categories

### 🔍 Data Selection & Filtering
- **SELECT** (`map▶filter`): Transform then filter results
- **TRANSFORM_IF** (`filter▶map`): Filter then transform
- **SLICE** (`take▶drop`): Window-based selection
- **DEDUPE_FLATTEN** (`flatten▶distinct`): Flatten and deduplicate

### 🔀 Flow Control & Routing
- **BIFURCATE** (`split▶merge`): Parallel branch processing
- **ROUTE_MERGE** (`switch▶merge`): Conditional routing with merge
- **MULTIPLEX**: Advanced routing patterns

### 📊 Aggregation & Reduction
- **AGGREGATE** (`scan▶reduce`): Incremental then final aggregation
- **PAIRED_TRANSFORM** (`zip▶map`): Combine and transform pairs
- **WINDOWED_BATCH** (`buffer▶batch`): Temporal or count-based batching

### ⏱️ Temporal & Resilience
- **BOUNDED_DELAY** (`delay▶timeout`): Time-limited delays
- **FAULT_TOLERANT** (`retry▶fallback`): Resilient error handling
- **ORDERED_GROUPS** (`group▶sort`): Temporal ordering within groups

---

## Usage in Examples

The Pair-Lexicon patterns appear in our example seeds:

### [map-filter.json](../seeds/examples/map-filter.json)
```json
{
  "abi": {
    "patterns": ["SELECT"]
  },
  "expected": {
    "invariants": ["Pair-Lexicon pattern: map▶filter → SELECT"]
  }
}
```

### [fork-join.json](../seeds/examples/fork-join.json)
```json
{
  "abi": {
    "patterns": ["BIFURCATE"]
  },
  "expected": {
    "invariants": ["Pair-Lexicon pattern: split▶merge → BIFURCATE"]
  }
}
```

### [recursive.json](../seeds/examples/recursive.json)
```json
{
  "abi": {
    "patterns": ["BOUNDED_DELAY"]
  },
  "expected": {
    "invariants": ["Pair-Lexicon pattern: delay▶timeout → BOUNDED_DELAY"]
  }
}
```

---

## Pattern Recognition

### Automatic Detection
The Pair-Lexicon supports automatic pattern recognition in operons:

```typescript
import { detectPairPatterns } from '../tools/pairs/translate';

const operon = loadOperon('seeds/examples/map-filter.json');
const patterns = detectPairPatterns(operon);
// Returns: ["SELECT"]
```

### Manual Annotation
Developers can manually annotate operons with expected patterns:

```json
{
  "abi": {
    "patterns": ["SELECT", "AGGREGATE"],
    "description": "Combined selection and aggregation pattern"
  }
}
```

---

## NF Transformation Rules

### Core Operators
The NF representations use these fundamental operators:

- **FOCUS**: `FOCUS(f, p)` - Apply function f with predicate p
- **PARTITION**: `PARTITION(λx.p(x), λy.¬p(y))` - Split by predicate
- **ACCUMULATE**: `ACCUMULATE(⊕, ε)` - Fold with operator ⊕ and identity ε
- **TEMPORAL**: `TEMPORAL(δt, τmax)` - Time-bounded operations
- **CLUSTER**: `CLUSTER(≡, ≤)` - Group by equivalence and order
- **WINDOW**: `WINDOW(n, m)` - Sliding window operations
- **UNIQUE**: `UNIQUE(⊔)` - Deduplication with join ⊔
- **MULTIPLEX**: `MULTIPLEX(σ, ⊔)` - Route with selector σ and merge ⊔
- **COMBINE**: `COMBINE(⊗, f)` - Pair combination with operator ⊗
- **SEGMENT**: `SEGMENT(n, τ)` - Batch by count n or time τ
- **RESILIENT**: `RESILIENT(n, φ)` - Retry n times with fallback φ

### Composition Laws
Pattern composition follows these laws:

1. **Associativity**: `(f ▶ g) ▶ h ≡ f ▶ (g ▶ h)`
2. **Identity**: `f ▶ id ≡ id ▶ f ≡ f`
3. **Commutativity**: Some patterns are commutative, others are not
4. **Distributivity**: Certain operators distribute over others

---

## External Mappings

### SQL Integration
Most Pair-Lexicon patterns have direct SQL equivalents, enabling seamless database integration:

```sql
-- SELECT pattern
SELECT transform(x) FROM table WHERE predicate(transform(x))

-- BIFURCATE pattern
SELECT CASE WHEN condition THEN branch_a(x) ELSE branch_b(x) END FROM table

-- AGGREGATE pattern
SELECT SUM(x) OVER (PARTITION BY key ORDER BY timestamp) FROM table
```

### RxJS Integration
Reactive programming patterns map naturally:

```typescript
// SELECT pattern
source.pipe(map(transform), filter(predicate))

// BIFURCATE pattern
source.pipe(partition(condition), mergeMap([branchA, branchB]))

// AGGREGATE pattern
source.pipe(scan(accumulator, initial), reduce(finalizer))
```

### Functional Programming
Standard functional patterns are well-represented:

```haskell
-- SELECT pattern
filter predicate . map transform

-- BIFURCATE pattern
either branchA branchB . partition condition

-- AGGREGATE pattern
foldl' finalizer initial . scanl1 accumulator
```

---

## Field Translator Widget

The Pair-Lexicon includes a field translator for understanding the genetics metaphor:

### GID → IID → XID Explainer

| Level | Description | Example | Stability |
|-------|-------------|---------|-----------|
| **GID** (Genotype) | Immutable operator DNA, independent of context | `8a7ea8...` | ♾️ Eternal |
| **IID** (Interface) | Stable signature for equivalent ABIs | `90fb5e...` | 🔒 Stable |
| **XID** (Execution) | Runtime context and state | `506bf0...` | ⚡ Dynamic |

### Translation Examples

```typescript
// From genetics to implementation
const gid = "8a7ea8..."; // FOCUS operator genotype
const iid = "90fb5e..."; // Interface: (data) → result
const xid = "506bf0..."; // Execution: runtime state

// Pattern recognition
const pattern = translateGID(gid); // "map▶filter"
const alias = getPairAlias(pattern); // "SELECT"
const nf = getNormalForm(pattern); // "FOCUS(p∘f,f)"
```

---

## Contributing Patterns

### Adding New Patterns
To contribute new 2-gram patterns to the Pair-Lexicon:

1. **Identify Common Usage**: Find frequently used operator pairs
2. **Define NF Representation**: Create canonical Normal Form
3. **Choose Semantic Alias**: Pick descriptive, memorable name
4. **Map External Equivalents**: Add SQL, RxJS, etc. mappings
5. **Update pairs.yaml**: Add entry to the lexicon
6. **Create Examples**: Build demonstration seeds
7. **Test Recognition**: Verify automatic detection works

### Pattern Requirements
- **Frequency**: Must appear in real-world usage
- **Semantics**: Clear, unambiguous meaning
- **Orthogonality**: Distinct from existing patterns
- **Composability**: Works well with other patterns
- **External Mappings**: Has equivalents in other systems

---

## Advanced Usage

### Nested Patterns
Pair-Lexicon patterns can be nested and composed:

```json
{
  "pattern": "SELECT ▶ AGGREGATE",
  "description": "Select then aggregate",
  "nf": "ACCUMULATE(⊕, FOCUS(p∘f,f))"
}
```

### Custom Domains
Create domain-specific lexicons:

```yaml
# Financial domain
patterns:
  - pattern: "validate▶price"
    alias: "QUOTE"
    domain: "finance"

  - pattern: "execute▶settle"
    alias: "TRADE"
    domain: "finance"
```

### Pattern Metrics
Track pattern usage and optimization:

```typescript
interface PatternMetrics {
  frequency: number;    // Usage count
  performance: string;  // Avg execution time
  errors: number;       // Failure rate
  variants: string[];   // Common variations
}
```

---

## See Also

- **[Examples Gallery](./EXAMPLES.md)**: See patterns in action
- **[SDK Quickstart](./SDK-QUICKSTART.md)**: Build with patterns
- **[NF Rules](./NF-RULES.md)**: Normal Form specifications
- **[Gallery Tool](../tools/gallery.ts)**: Generate pattern catalogs

---

*Pure Lambda v1.0.0 | Making functional patterns human-readable*