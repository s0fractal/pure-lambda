/**
 * Test Harness for App→SVG Projection System
 * Demonstrates pure functional transformations on repository projections
 */

import {
  projectFileSystem,
  findDeadCode,
  findCircularDependencies,
  extractComponent,
  memoize,
  parallelize,
  removeRedundantEdges,
  clusterNodes,
  compose,
  withRollback,
  GENE_POOL,
  SVG
} from './pure-functions'

// ============== MOCK DATA ==============

const mockRepository = {
  files: [
    { path: 'src/index.ts', size: 500, type: 'ts', depth: 1, complexity: 5 },
    { path: 'src/App.tsx', size: 2000, type: 'tsx', depth: 1, complexity: 15, hasTests: true },
    { path: 'src/components/Button.tsx', size: 300, type: 'tsx', depth: 2, complexity: 3 },
    { path: 'src/components/Modal.tsx', size: 800, type: 'tsx', depth: 2, complexity: 8 },
    { path: 'src/utils/helpers.ts', size: 400, type: 'ts', depth: 2, complexity: 12 },
    { path: 'src/utils/dead.ts', size: 100, type: 'ts', depth: 2, complexity: 2 },
    { path: 'src/hooks/useAuth.ts', size: 600, type: 'ts', depth: 2, complexity: 7 },
    { path: 'src/api/client.ts', size: 1200, type: 'ts', depth: 2, complexity: 20 },
    { path: 'package.json', size: 800, type: 'json', depth: 0 },
    { path: 'README.md', size: 2000, type: 'md', depth: 0 }
  ],
  imports: [
    { source: 'src/index.ts', target: 'src/App.tsx', type: 'static' as const },
    { source: 'src/App.tsx', target: 'src/components/Button.tsx', type: 'static' as const },
    { source: 'src/App.tsx', target: 'src/components/Modal.tsx', type: 'dynamic' as const },
    { source: 'src/App.tsx', target: 'src/hooks/useAuth.ts', type: 'static' as const },
    { source: 'src/components/Button.tsx', target: 'src/utils/helpers.ts', type: 'static' as const },
    { source: 'src/components/Modal.tsx', target: 'src/utils/helpers.ts', type: 'static' as const },
    { source: 'src/hooks/useAuth.ts', target: 'src/api/client.ts', type: 'static' as const },
    { source: 'src/api/client.ts', target: 'src/utils/helpers.ts', type: 'static' as const },
    // Circular dependency
    { source: 'src/utils/helpers.ts', target: 'src/api/client.ts', type: 'static' as const }
  ]
}

// ============== TEST RUNNER ==============

interface TestResult {
  name: string
  passed: boolean
  message: string
  data?: any
}

class TestRunner {
  private results: TestResult[] = []

  run(name: string, fn: () => void): void {
    try {
      fn()
      this.results.push({ name, passed: true, message: 'Passed' })
    } catch (error: any) {
      this.results.push({ name, passed: false, message: error.message })
    }
  }

  assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(message)
    }
  }

  report(): void {
    console.log('\n' + '='.repeat(60))
    console.log('TEST RESULTS')
    console.log('='.repeat(60))

    const passed = this.results.filter(r => r.passed).length
    const total = this.results.length

    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌'
      console.log(`${icon} ${result.name}: ${result.message}`)
      if (result.data) {
        console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`)
      }
    })

    console.log('\n' + '-'.repeat(60))
    console.log(`Summary: ${passed}/${total} tests passed`)
    console.log('='.repeat(60) + '\n')
  }
}

// ============== TESTS ==============

const runner = new TestRunner()

// Test 1: Basic projection
runner.run('Basic Projection', () => {
  const svg = projectFileSystem(mockRepository)
  runner.assert(svg.nodes.length === 10, 'Should have 10 nodes')
  runner.assert(svg.edges.length === 9, 'Should have 9 edges')
})

// Test 2: Dead code detection
runner.run('Dead Code Detection', () => {
  const svg = projectFileSystem(mockRepository)
  const deadNodes = findDeadCode(svg)
  runner.assert(deadNodes.length > 0, 'Should find dead code')
  runner.assert(
    deadNodes.some(n => n.id === 'src/utils/dead.ts'),
    'Should identify dead.ts as dead code'
  )
})

// Test 3: Circular dependency detection
runner.run('Circular Dependency Detection', () => {
  const svg = projectFileSystem(mockRepository)
  const cycles = findCircularDependencies(svg)
  runner.assert(cycles.length > 0, 'Should find circular dependencies')
})

// Test 4: Component extraction
runner.run('Component Extraction', () => {
  const svg = projectFileSystem(mockRepository)
  const nodeIds = new Set(['src/components/Button.tsx', 'src/components/Modal.tsx'])
  const extracted = extractComponent(svg, nodeIds, 'UIComponents')

  runner.assert(
    extracted.nodes.length < svg.nodes.length,
    'Should reduce node count'
  )
  runner.assert(
    extracted.nodes.some(n => n.id === 'UIComponents'),
    'Should create component node'
  )
})

// Test 5: Memoization
runner.run('Memoization', () => {
  const svg = projectFileSystem(mockRepository)
  const complexNode = svg.nodes.find(n => n.id === 'src/api/client.ts')!
  const memoized = memoize(svg, complexNode.id)

  const memoizedNode = memoized.nodes.find(n => n.id === complexNode.id)!
  runner.assert(
    memoizedNode.attributes.get('memoized') === 'true',
    'Should mark node as memoized'
  )
})

// Test 6: Parallelization
runner.run('Parallelization', () => {
  const svg = projectFileSystem(mockRepository)
  const bottleneck = 'src/utils/helpers.ts'
  const parallelized = parallelize(svg, bottleneck, 3)

  runner.assert(
    parallelized.nodes.length > svg.nodes.length,
    'Should add parallel nodes'
  )
  runner.assert(
    parallelized.nodes.filter(n => n.id.includes('parallel')).length === 3,
    'Should create 3 parallel nodes'
  )
})

// Test 7: Redundant edge removal
runner.run('Redundant Edge Removal', () => {
  const svg = projectFileSystem(mockRepository)
  // Add a redundant edge
  svg.edges.push({
    from: 'src/index.ts',
    to: 'src/utils/helpers.ts',
    stroke: 'solid'
  })

  const optimized = removeRedundantEdges(svg)
  runner.assert(
    optimized.edges.length <= svg.edges.length,
    'Should not increase edge count'
  )
})

// Test 8: Node clustering
runner.run('Node Clustering', () => {
  const svg = projectFileSystem(mockRepository)
  const clustered = clusterNodes(svg, 1)

  // Check that nodes have been repositioned
  const hasClusterAttribute = clustered.nodes.some(n =>
    n.attributes.has('cluster')
  )
  runner.assert(hasClusterAttribute, 'Should add cluster attributes')
})

// Test 9: Composition
runner.run('Function Composition', () => {
  const svg = projectFileSystem(mockRepository)

  const pipeline = compose(
    (s) => memoize(s, 'src/api/client.ts'),
    (s) => parallelize(s, 'src/utils/helpers.ts', 2),
    (s) => removeRedundantEdges(s)
  )

  const result = pipeline(svg)
  runner.assert(result.nodes.length > svg.nodes.length, 'Pipeline should transform SVG')
})

// Test 10: Rollback capability
runner.run('Rollback Capability', () => {
  const svg = projectFileSystem(mockRepository)
  const { result, rollback } = withRollback(svg, (s) =>
    extractComponent(s, new Set(['src/components/Button.tsx']), 'Button')
  )

  runner.assert(
    result.nodes.length !== svg.nodes.length,
    'Should modify SVG'
  )

  const rolledBack = rollback()
  runner.assert(
    rolledBack.nodes.length === svg.nodes.length,
    'Should restore original'
  )
})

// Test 11: Gene pool
runner.run('Gene Pool Transformations', () => {
  const svg = projectFileSystem(mockRepository)

  // Apply REMOVE_DEAD_CODE gene
  const cleaned = GENE_POOL.REMOVE_DEAD_CODE.transform(svg)
  runner.assert(
    cleaned.nodes.length < svg.nodes.length,
    'Should remove dead nodes'
  )

  // Verify invariant
  const proof = GENE_POOL.REMOVE_DEAD_CODE.proof(svg, cleaned)
  runner.assert(proof.valid, 'Gene invariant should hold')
})

// Test 12: Complex transformation
runner.run('Complex Multi-Step Transformation', () => {
  const svg = projectFileSystem(mockRepository)

  // Step 1: Find and remove dead code
  const deadNodes = findDeadCode(svg)
  let transformed = {
    ...svg,
    nodes: svg.nodes.filter(n => !deadNodes.includes(n))
  }

  // Step 2: Find bottlenecks and parallelize
  const bottlenecks = svg.nodes.filter(n => {
    const incomingCount = svg.edges.filter(e => e.to === n.id).length
    return incomingCount > 2
  })

  bottlenecks.forEach(bottleneck => {
    transformed = parallelize(transformed, bottleneck.id, 2)
  })

  // Step 3: Memoize expensive nodes
  const expensive = transformed.nodes.filter(n =>
    parseInt(n.attributes.get('complexity') || '0') > 10
  )

  expensive.forEach(node => {
    transformed = memoize(transformed, node.id)
  })

  // Step 4: Cluster related nodes
  transformed = clusterNodes(transformed, 2)

  runner.assert(
    transformed.nodes.length !== svg.nodes.length ||
    transformed.edges.length !== svg.edges.length,
    'Should transform the graph'
  )
})

// ============== DEMONSTRATION ==============

console.log('\n' + '='.repeat(60))
console.log('APP → SVG PROJECTION TEST HARNESS')
console.log('='.repeat(60))

console.log('\nOriginal Repository Structure:')
console.log(`- Files: ${mockRepository.files.length}`)
console.log(`- Imports: ${mockRepository.imports.length}`)
console.log(`- Languages: TypeScript, TSX, JSON, Markdown`)

console.log('\nRunning transformation tests...')

// Run all tests
runner.report()

// Demonstrate a complete transformation pipeline
console.log('\n' + '='.repeat(60))
console.log('DEMONSTRATION: Complete Transformation Pipeline')
console.log('='.repeat(60))

const originalSvg = projectFileSystem(mockRepository)

console.log('\n1. Original SVG:')
console.log(`   - Nodes: ${originalSvg.nodes.length}`)
console.log(`   - Edges: ${originalSvg.edges.length}`)

const deadCode = findDeadCode(originalSvg)
console.log(`\n2. Dead code found: ${deadCode.map(n => n.id).join(', ')}`)

const cycles = findCircularDependencies(originalSvg)
console.log(`\n3. Circular dependencies: ${cycles.length} cycle(s) detected`)

// Apply transformation pipeline
const transformationPipeline = compose(
  // Remove dead code
  (svg) => ({
    ...svg,
    nodes: svg.nodes.filter(n => !findDeadCode(svg).includes(n))
  }),
  // Memoize expensive operations
  (svg) => {
    const expensive = svg.nodes.find(n =>
      parseInt(n.attributes.get('complexity') || '0') > 15
    )
    return expensive ? memoize(svg, expensive.id) : svg
  },
  // Parallelize bottlenecks
  (svg) => {
    const bottleneck = svg.nodes.find(n =>
      svg.edges.filter(e => e.to === n.id).length > 2
    )
    return bottleneck ? parallelize(svg, bottleneck.id, 2) : svg
  },
  // Cluster related nodes
  (svg) => clusterNodes(svg, 2),
  // Remove redundant edges
  (svg) => removeRedundantEdges(svg)
)

const finalSvg = transformationPipeline(originalSvg)

console.log('\n4. After transformation pipeline:')
console.log(`   - Nodes: ${finalSvg.nodes.length} (${finalSvg.nodes.length - originalSvg.nodes.length > 0 ? '+' : ''}${finalSvg.nodes.length - originalSvg.nodes.length})`)
console.log(`   - Edges: ${finalSvg.edges.length} (${finalSvg.edges.length - originalSvg.edges.length > 0 ? '+' : ''}${finalSvg.edges.length - originalSvg.edges.length})`)

// Show gene application results
console.log('\n5. Gene pool application:')
Object.entries(GENE_POOL).forEach(([name, gene]) => {
  const result = gene.transform(originalSvg)
  const proof = gene.proof(originalSvg, result)
  console.log(`   - ${name}: ${proof.valid ? '✅ Valid' : '❌ Invalid'}`)
  if (proof.metrics) {
    console.log(`     Metrics: ${JSON.stringify(proof.metrics)}`)
  }
})

console.log('\n' + '='.repeat(60))
console.log('Test harness complete!')
console.log('='.repeat(60) + '\n')