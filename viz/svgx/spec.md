# SVGx Specification - Deterministic SVG for Pure Lambda

## Purpose

SVGx is a **minimal, deterministic subset of SVG** for visualizing genes, proofs, and traces.
Not for execution - purely for auditable, CID-stable visualization.

## Core Principle

**Same input → Same SVG → Same CID** across all nodes, all times.

## Allowed Elements (Strict Subset)

```xml
<svg viewBox="..." width="..." height="...">
  <g transform="...">
    <rect x="..." y="..." width="..." height="..." />
    <path d="..." />
    <line x1="..." y1="..." x2="..." y2="..." />
    <polyline points="..." />
    <text x="..." y="...">content</text>
  </g>
</svg>
```

## Determinism Rules

### 1. Attribute Order
All attributes in **lexicographic order**:
```xml
<!-- ✅ Correct -->
<rect fill="#000" height="10" width="20" x="0" y="0" />

<!-- ❌ Wrong -->
<rect x="0" y="0" width="20" height="10" fill="#000" />
```

### 2. Number Format
- Exactly **3 decimal places**
- No scientific notation
- No trailing zeros after decimal

```xml
<!-- ✅ Correct -->
<rect x="10.500" y="20.333" />

<!-- ❌ Wrong -->
<rect x="10.5" y="20.33333333" />
```

### 3. Fixed ViewBox
Always use standard viewBox for each type:
- Genes: `viewBox="0 0 1024 768"`
- Proofs: `viewBox="0 0 1280 960"`
- Traces: `viewBox="0 0 1600 900"`

### 4. No External Dependencies
- ❌ No CSS (inline or external)
- ❌ No fonts (use paths or fixed coordinates)
- ❌ No images or external refs
- ❌ No IDs, classes, or names
- ❌ No animations or scripts

### 5. Color Palette (Fixed)
```yaml
background: "#ffffff"
node: "#000000"
edge: "#666666"
highlight: "#0066cc"
error: "#cc0000"
success: "#00cc00"
```

### 6. Text Handling
Option A: Fixed monospace coordinates
```xml
<text font-family="monospace" font-size="12" x="100.000" y="50.000">λx.x</text>
```

Option B: Convert to paths (100% deterministic)
```xml
<path d="M 10.000 10.000 L 15.000 10.000 ..." />
```

### 7. Graph Layout
- Nodes sorted by: depth-first traversal with lexicographic tiebreaking
- Edges drawn in deterministic order
- Fixed spacing: 100 units horizontal, 80 units vertical

## File Structure

```
gene_svg := {
  nodes: [
    {id: "input", x: 100, y: 100, label: "Input"},
    {id: "gene", x: 300, y: 100, label: "FOCUS"},
    {id: "output", x: 500, y: 100, label: "Output"}
  ],
  edges: [
    {from: "input", to: "gene"},
    {from: "gene", to: "output"}
  ]
}
```

## Canonicalization Process

1. Parse SVG to AST
2. Sort all attributes lexicographically
3. Format all numbers to 3 decimals
4. Sort child elements by type, then position
5. Serialize with no whitespace variations
6. Compute BLAKE3 hash → CID

## Validation Rules

An SVG is valid SVGx if:
1. Contains only allowed elements
2. All attributes are sorted
3. All numbers have exactly 3 decimals
4. No forbidden features (CSS, IDs, etc.)
5. Matches expected viewBox for its type
6. Canonicalization is idempotent

## Example: Minimal Gene SVG

```xml
<svg height="768" viewBox="0 0 1024 768" width="1024" xmlns="http://www.w3.org/2000/svg">
  <g>
    <rect fill="#ffffff" height="768.000" width="1024.000" x="0.000" y="0.000"/>
    <rect fill="#000000" height="60.000" width="120.000" x="100.000" y="354.000"/>
    <text font-family="monospace" font-size="12.000" x="130.000" y="384.000">FOCUS</text>
    <line stroke="#666666" x1="220.000" x2="400.000" y1="384.000" y2="384.000"/>
    <rect fill="#000000" height="60.000" width="120.000" x="400.000" y="354.000"/>
    <text font-family="monospace" font-size="12.000" x="430.000" y="384.000">Output</text>
  </g>
</svg>
```

## CID Computation

```bash
cat gene.svg | ./canonicalize.sh | blake3sum
# → bafy2bzaceXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## Use Cases

### 1. Gene Visualization
- DAG structure
- Input/output types
- Invariants as annotations
- Champion path highlighting

### 2. Proof Trees
- Reduction steps
- Witness paths
- Law applications
- Verification trace

### 3. Execution Traces
- State transitions
- Gas consumption
- Policy checks
- Effects applied

## Non-Goals

SVGx is NOT for:
- Execution or computation
- Interactive graphics
- Large datasets (>1000 nodes)
- Artistic rendering
- Machine IR

## Benefits

1. **Auditable**: Every change visible in diffs
2. **Deterministic**: Same CID everywhere
3. **Readable**: Human can understand at a glance
4. **Portable**: Any SVG viewer works
5. **Versionable**: Git-friendly text format

---

*SVGx: Where mathematical truth becomes visible.*