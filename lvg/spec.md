# LVG (Lambda View Graph) Specification v1.0

*Universal intermediate representation for code → form projection*

## Core Structure

### Node
```typescript
interface LVGNode {
  id: string      // blake3(kind || canonical(sig))
  kind: NodeKind  // module|fn|type|resource|asset|concept
  sig: string     // Semantic signature (stable content hash)
  attrs: Map<string, any>
}
```

**Attributes**:
- `complexity`: Cyclomatic complexity (number)
- `size`: Bytes or LOC (number)
- `owner`: Author/maintainer (did:pl:*)
- `ts`: Last modified timestamp
- `coverage`: Test coverage percentage
- `heat`: Modification frequency

### Edge
```typescript
interface LVGEdge {
  src: string    // Source node ID
  dst: string    // Destination node ID
  rel: EdgeRel   // calls|imports|refines|tests|generates|proves
  weight?: number // Frequency/strength
}
```

### Graph
```typescript
interface LVG {
  version: "1.0.0"
  nodes: LVGNode[]
  edges: LVGEdge[]
  metadata: {
    repo_cid: string
    timestamp: number
    lang: string
    deterministic: boolean
  }
}
```

## Stable Identity

### Signature Generation
```typescript
function computeSignature(ast: AST): string {
  // 1. Remove all positional info
  const cleaned = removePositions(ast)

  // 2. Remove comments and whitespace
  const normalized = normalize(cleaned)

  // 3. Sort all unordered collections
  const canonical = canonicalize(normalized)

  // 4. Serialize deterministically
  const serialized = cbor.encode(canonical)

  // 5. Hash
  return blake3(serialized)
}
```

### ID Computation
```typescript
function computeId(node: LVGNode): string {
  const input = `${node.kind}:${node.sig}`
  return blake3(input).slice(0, 16) // 128-bit ID
}
```

## Canonicalization Rules

1. **Deterministic ordering**:
   - Nodes: Sort by ID lexicographically
   - Edges: Sort by (src, dst, rel) tuple
   - Attributes: Sort keys alphabetically

2. **Numeric precision**:
   - Floats: 3 decimal places
   - Timestamps: Unix milliseconds

3. **String normalization**:
   - UTF-8 encoding
   - NFC normalization
   - Trim all strings

## Serialization

### IPLD CAR Format
```typescript
async function serialize(lvg: LVG): Promise<CID> {
  const dag = {
    nodes: await Promise.all(lvg.nodes.map(n => ipld.put(n))),
    edges: await Promise.all(lvg.edges.map(e => ipld.put(e))),
    metadata: await ipld.put(lvg.metadata)
  }

  const root = await ipld.put(dag)
  return car.write([root, ...dag.nodes, ...dag.edges])
}
```

### JSON Format
```json
{
  "version": "1.0.0",
  "nodes": [...],
  "edges": [...],
  "metadata": {...}
}
```

## Language Adapters

Each adapter must implement:

```typescript
interface LVGAdapter {
  // Parse source to LVG
  parse(source: string, path: string): LVG

  // Generate source from LVG (if possible)
  generate?(lvg: LVG): string

  // Incremental update
  patch?(lvg: LVG, change: FileChange): LVGPatch
}
```

## Verification

### Determinism Check
```bash
# Same input → same output
lvg-pack repo1 --seed 42 > out1.car
lvg-pack repo1 --seed 42 > out2.car
diff out1.car out2.car  # Must be empty
```

### Invariants
- No duplicate node IDs
- All edge endpoints exist
- No self-loops (unless explicit)
- Graph is weakly connected

---

*LVG: Where code becomes form, deterministically.*