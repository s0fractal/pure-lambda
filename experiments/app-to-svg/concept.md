# App → SVG Projection
*Transforming repositories into visual, functional spaces*

## Core Idea

Every app repository has structure that can be projected into SVG space:
- Files → Nodes
- Dependencies → Edges
- Functions → Transformations
- State → Positions

Then pure functions manipulate this visual representation!

## Projection Rules

### 1. File System → Graph Structure
```javascript
function projectFileSystem(repo) {
  return {
    nodes: repo.files.map(f => ({
      id: f.path,
      x: hashToX(f.path),
      y: depthToY(f.depth),
      r: Math.log(f.size + 1) * 5,
      fill: typeToColor(f.type)
    })),

    edges: repo.imports.map(imp => ({
      from: imp.source,
      to: imp.target,
      stroke: imp.type === 'dynamic' ? 'dashed' : 'solid'
    }))
  }
}
```

### 2. Code Complexity → Visual Properties
```javascript
function complexityToVisual(file) {
  return {
    opacity: 1 / (1 + file.cyclomaticComplexity / 10),
    strokeWidth: Math.sqrt(file.dependencies.length),
    filter: file.hasTests ? 'none' : 'blur(1px)'
  }
}
```

### 3. Git History → Temporal Layers
```javascript
function historyToLayers(commits) {
  return commits.map((commit, i) => ({
    layer: i,
    opacity: Math.exp(-i / 10), // Fade into past
    transform: `translate(${i * 2}, ${i * 2})` // Stack effect
  }))
}
```

## Pure Functions on SVG

### Transform: Refactoring
```haskell
refactor :: SVG -> Pattern -> SVG
refactor svg pattern =
  let nodes = findPattern svg pattern
      collapsed = collapseToSingle nodes
  in replaceNodes svg nodes collapsed
```

### Filter: Dead Code Detection
```haskell
findDeadCode :: SVG -> [Node]
findDeadCode svg =
  filter (not . hasIncomingEdges) (nodes svg)
  where hasIncomingEdges n = any (\\e -> target e == n) (edges svg)
```

### Map: Optimization Opportunities
```haskell
highlightOptimizable :: SVG -> SVG
highlightOptimizable = mapNodes markIfOptimizable
  where markIfOptimizable node
          | complexity node > threshold = node { stroke = "red" }
          | otherwise = node
```

## Gene Sequencing Connection

Each transformation is a "gene":
```yaml
gene: EXTRACT_COMPONENT
input: SVG subgraph
output: New component node
invariant: Behavior preserved
proof: Edges maintain same flow
```

Repository pool becomes genome:
```yaml
genome:
  - EXTRACT_COMPONENT
  - INLINE_FUNCTION
  - PARALLELIZE_LOOP
  - MEMOIZE_COMPUTATION
```

## Fractal Properties

The projection is self-similar:
- File contains functions → Functions contain blocks → Blocks contain statements
- Each level projects to similar SVG structure
- Zoom in/out maintains patterns

## Example: React Component

```javascript
// Original component
function TodoList({ items }) {
  return items.map(item =>
    <Todo key={item.id} {...item} />
  )
}

// SVG projection
<g id="TodoList">
  <circle cx="100" cy="100" r="20" fill="#61dafb"/>
  <text x="100" y="100">TodoList</text>

  <!-- Props edge -->
  <line x1="50" y1="100" x2="80" y2="100" stroke="#666"/>
  <text x="40" y="95">items</text>

  <!-- Map operation -->
  <rect x="120" y="90" width="40" height="20" fill="#f0db4f"/>
  <text x="130" y="105">map</text>

  <!-- Output edges to Todo instances -->
  <line x1="160" y1="100" x2="200" y2="80" stroke="#666"/>
  <line x1="160" y1="100" x2="200" y2="100" stroke="#666"/>
  <line x1="160" y1="100" x2="200" y2="120" stroke="#666"/>
</g>
```

## Pure Function Manipulations

```haskell
-- Extract map to separate function
extractMap :: SVG -> SVG
extractMap svg =
  let mapNode = findNode svg "map"
      newFunc = createFunctionNode "renderItems"
      edge = createEdge "TodoList" newFunc
  in svg { nodes = newFunc : nodes svg
         , edges = edge : edges svg }

-- Optimize by memoization
memoize :: SVG -> SVG
memoize svg =
  let func = findNode svg "TodoList"
  in func { attributes = ("memoized", "true") : attributes func }
```

## Why This Works

1. **Visual Understanding**: See the app structure immediately
2. **Pure Transformations**: No side effects in analysis
3. **Composable Operations**: Chain transformations
4. **Provable Refactoring**: SVG before/after shows equivalence
5. **Pattern Detection**: Visual patterns reveal code patterns

## Integration Ideas

- **Live Coding**: Code changes update SVG in real-time
- **AI Assistant**: Points to visual patterns and suggests genes
- **Collaborative**: Multiple people manipulate same SVG
- **Version Control**: Diff SVGs to see structural changes
- **Testing**: Test cases as SVG path traversals

## Next Steps

1. Build prototype projector (TypeScript → SVG)
2. Implement basic pure functions (extract, inline, optimize)
3. Create gene library from common refactorings
4. Test on real repositories
5. Look for fractal patterns

---

*"When code becomes image, patterns become visible. When patterns become visible, transformation becomes natural."*