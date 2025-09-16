# SVGx Specification v1.0

*Deterministic, canonical SVG for reproducible visualization*

## Core Principles

1. **Deterministic**: Same input → exact same output (bit-for-bit)
2. **Minimal**: No redundancy, no decoration
3. **Canonical**: One correct representation

## Structure Rules

### Document
```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="1200" height="800"
     viewBox="0 0 1200 800">
  <!-- Content -->
</svg>
```

- Fixed dimensions: 1200×800
- No namespaces except base SVG
- No DOCTYPE
- No comments (except this spec)

### Elements

**Allowed**:
- `<g>` - grouping
- `<circle>`, `<rect>`, `<path>` - shapes
- `<line>`, `<polyline>` - connections
- `<text>` - labels

**Forbidden**:
- `<style>`, `<script>` - no dynamic content
- `<defs>`, `<use>` - no references
- `<animate>` - no animation
- External resources

### Attributes

**Required precision**:
```xml
<!-- Numbers: 3 decimal places -->
<circle cx="123.456" cy="789.012" r="45.678"/>

<!-- Colors: 6-digit hex only -->
<rect fill="#3178c6" stroke="#000000"/>

<!-- No CSS classes, only inline -->
<path d="..." stroke-width="2" fill="none"/>
```

## Layout Algorithm

### Deterministic Positioning
```typescript
function layout(lvg: LVG, seed: string): Positions {
  // Use seed for reproducible randomness
  const rng = seedrandom(seed)

  // Force-directed with fixed iterations
  const positions = forceLayout(lvg, {
    iterations: 100,
    alpha: 0.1,
    alphaDecay: 0.01,
    random: rng
  })

  // Snap to grid for stability
  return snapToGrid(positions, 5)
}
```

### Node Mapping

| LVG Kind | SVG Shape | Size Formula |
|----------|-----------|--------------|
| module | `<rect>` | `sqrt(size) * 10` |
| fn | `<circle>` | `log(complexity + 1) * 20` |
| type | `<rect>` dashed | `members * 15` |
| resource | `<ellipse>` | `log(size) * 25` |
| concept | `<polygon>` diamond | `30` fixed |

### Edge Mapping

| LVG Relation | SVG Style | Path Type |
|--------------|-----------|-----------|
| calls | solid black | straight |
| imports | solid gray | straight |
| refines | dashed blue | curve |
| tests | dotted green | straight |
| generates | solid purple | curve |
| proves | double orange | straight |

## Canonicalization Process

### 1. Sort Everything
```typescript
function canonicalize(svg: SVGDocument): SVGDocument {
  // Sort nodes by ID
  svg.nodes.sort((a, b) => a.id.localeCompare(b.id))

  // Sort edges by (src, dst, rel)
  svg.edges.sort((a, b) => {
    const srcCmp = a.src.localeCompare(b.src)
    if (srcCmp !== 0) return srcCmp
    const dstCmp = a.dst.localeCompare(b.dst)
    if (dstCmp !== 0) return dstCmp
    return a.rel.localeCompare(b.rel)
  })

  // Sort attributes alphabetically
  for (const el of svg.elements) {
    el.attrs = sortKeys(el.attrs)
  }

  return svg
}
```

### 2. Normalize Numbers
```typescript
function normalizeNumber(n: number): string {
  // Always 3 decimal places
  return n.toFixed(3)
    .replace(/\.?0+$/, '') // Remove trailing zeros
    .replace(/^-0$/, '0')  // Normalize negative zero
}
```

### 3. Stable Colors
```typescript
const COLOR_PALETTE = {
  typescript: '#3178c6',
  javascript: '#f0db4f',
  function: '#61dafb',
  type: '#692b7c',
  test: '#10b981',
  error: '#ef4444',
  default: '#666666'
}
```

## Path Geometry

### Curves (Deterministic Bezier)
```typescript
function computeCurve(src: Point, dst: Point): string {
  const dx = dst.x - src.x
  const dy = dst.y - src.y
  const dr = Math.sqrt(dx * dx + dy * dy)

  // Fixed control point calculation
  const cx = (src.x + dst.x) / 2
  const cy = (src.y + dst.y) / 2 - dr * 0.15

  return `M ${src.x},${src.y} Q ${cx},${cy} ${dst.x},${dst.y}`
}
```

### Straight Lines
```typescript
function computeLine(src: Point, dst: Point): string {
  return `M ${src.x},${src.y} L ${dst.x},${dst.y}`
}
```

## Verification

### Canonical Check
```bash
# Canonicalize twice - must be identical
svgx-canon input.svg > out1.svg
svgx-canon out1.svg > out2.svg
diff out1.svg out2.svg  # Must be empty
```

### Checksum
```typescript
function checksum(svg: string): string {
  // Remove all whitespace variations
  const normalized = svg.replace(/\s+/g, ' ').trim()
  return blake3(normalized)
}
```

## Example Output

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <!-- Nodes (sorted by ID) -->
  <circle cx="100.000" cy="100.000" r="20.000" fill="#3178c6" stroke="#000000" stroke-width="1"/>
  <rect x="200.000" y="150.000" width="80.000" height="60.000" fill="#f0db4f" stroke="#000000" stroke-width="1"/>

  <!-- Edges (sorted by src,dst,rel) -->
  <path d="M 100.000,100.000 L 200.000,150.000" stroke="#666666" stroke-width="2" fill="none"/>
</svg>
```

---

*SVGx: Your code's mirror form, always the same reflection.*