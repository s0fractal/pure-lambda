# App → SVG Projection System

*Transforming repositories into visual, functional spaces*

## Overview

This system projects application repositories into SVG space where:
- **Files** → Visual nodes
- **Dependencies** → Edges between nodes
- **Functions** → Pure transformations
- **State** → Spatial positions

Then pure functions manipulate these visual representations to refactor, optimize, and evolve the codebase.

## Core Components

### 1. Projector (`projector.ts`)
Analyzes TypeScript/JavaScript repositories and creates SVG projections:
- Scans file system structure
- Extracts import dependencies
- Calculates complexity metrics
- Generates deterministic SVG visualization

### 2. Pure Functions (`pure-functions.ts`)
Library of pure transformations on SVG graphs:
- **Analysis**: Find dead code, detect cycles, measure complexity
- **Transformation**: Extract components, inline functions, parallelize
- **Optimization**: Remove redundancy, cluster nodes, balance load
- **Composition**: Chain transformations, rollback capability

### 3. Gene Pool (`gene-pool.yaml`)
Catalog of transformation "genes" that can be:
- Applied individually or in sequences
- Evolved through mutation and crossover
- Composed into complex refactoring pipelines

### 4. Test Harness (`test-harness.ts`)
Comprehensive testing of all transformations with mock repository data.

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Project current directory to SVG
npm run example

# Project any repository
npx ts-node projector.ts /path/to/repo output.svg
```

## Transformation Examples

### Extract Component
Collapse multiple related nodes into a single component:
```typescript
const nodeIds = new Set(['Button.tsx', 'Modal.tsx'])
const svg = extractComponent(originalSvg, nodeIds, 'UIComponents')
```

### Parallelize Bottleneck
Split sequential processing into parallel paths:
```typescript
const svg = parallelize(originalSvg, 'expensive-processor.ts', 3)
```

### Remove Dead Code
Eliminate unreachable nodes:
```typescript
const deadNodes = findDeadCode(svg)
const cleaned = removeDeadNodes(svg, deadNodes)
```

### Composition Pipeline
Chain multiple transformations:
```typescript
const pipeline = compose(
  removeDeadCode,
  memoizeExpensive,
  parallelizeBottlenecks,
  clusterRelated
)

const optimized = pipeline(originalSvg)
```

## Gene Sequencing

Each transformation is a "gene" with:
- **Input**: What it operates on
- **Output**: What it produces
- **Invariant**: What properties it preserves
- **Proof**: Verification of correctness

Genes can be:
- Combined into sequences (MODULARIZE, OPTIMIZE_PERFORMANCE)
- Evolved through genetic algorithms
- Applied recursively at different scales

## Fractal Properties

The system exhibits self-similarity:
- Repository → Modules → Files → Functions → Blocks
- Each level uses the same transformation genes
- Patterns repeat across scales
- Zoom in/out maintains structure

## Integration Points

### With Negentropy
- Thought graphs guide clustering decisions
- Pheromone paths optimize transformation sequences
- Semantic hashing identifies similar patterns

### With Autopoiesis
- System evolves its own transformation strategies
- Successful patterns become new genes
- Micro-hypotheses test transformation effects

### With Causal Receipts
- Each transformation generates causal proof
- Counterfactuals verify behavior preservation
- Do-operator shows intervention effects

## Scientific Grounding

Based on research insights:
1. **Graph Theory**: Repository as directed graph
2. **Category Theory**: Transformations as functors
3. **Complexity Theory**: McCabe metrics, coupling analysis
4. **Genetic Algorithms**: Evolution of architectures
5. **Visualization Theory**: Spatial encoding of properties

## Why This Works

1. **Visual Understanding**: See code structure immediately
2. **Pure Transformations**: No side effects, always safe
3. **Composable Operations**: Build complex from simple
4. **Provable Refactoring**: Visual before/after verification
5. **Pattern Detection**: Visual patterns reveal code smells

## Future Directions

- [ ] Real-time collaborative editing
- [ ] ML-guided transformation suggestions
- [ ] Cross-language projections
- [ ] 3D temporal visualization
- [ ] Quantum superposition of architectures

## Philosophy

*"When code becomes image, patterns become visible.
When patterns become visible, transformation becomes natural.
When transformation becomes natural, evolution becomes inevitable."*

The repository is not static text - it's a living, breathing organism that can be seen, understood, and transformed through pure functional manipulation of its visual projection.

## License

Part of Pure Lambda - transforming how we see and shape code.