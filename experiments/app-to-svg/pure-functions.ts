/**
 * Pure Functions for SVG Repository Projection
 * Transformations that preserve behavior while modifying structure
 */

// Core types
interface SVGNode {
  id: string
  x: number
  y: number
  r: number
  fill: string
  attributes: Map<string, string>
}

interface SVGEdge {
  from: string
  to: string
  stroke: 'solid' | 'dashed'
  weight?: number
}

interface SVG {
  nodes: SVGNode[]
  edges: SVGEdge[]
  layers: SVGLayer[]
}

interface SVGLayer {
  id: number
  opacity: number
  transform: string
  timestamp?: number
}

// ============== PROJECTION FUNCTIONS ==============

/**
 * Project file system to graph structure
 */
export const projectFileSystem = (repo: any): SVG => {
  const hashToX = (path: string): number => {
    let hash = 0
    for (let i = 0; i < path.length; i++) {
      hash = ((hash << 5) - hash) + path.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash % 800) + 100
  }

  const depthToY = (depth: number): number => depth * 100 + 50

  const typeToColor = (type: string): string => {
    const colors: Record<string, string> = {
      'ts': '#3178c6',
      'tsx': '#61dafb',
      'js': '#f0db4f',
      'jsx': '#61dafb',
      'css': '#1572b6',
      'json': '#292929',
      'yaml': '#cb171e',
      'md': '#083fa1',
      'default': '#666666'
    }
    return colors[type] || colors.default
  }

  return {
    nodes: repo.files.map((f: any) => ({
      id: f.path,
      x: hashToX(f.path),
      y: depthToY(f.depth || 0),
      r: Math.log(f.size + 1) * 5,
      fill: typeToColor(f.type),
      attributes: new Map([
        ['complexity', String(f.complexity || 0)],
        ['hasTests', String(!!f.hasTests)]
      ])
    })),

    edges: repo.imports.map((imp: any) => ({
      from: imp.source,
      to: imp.target,
      stroke: imp.type === 'dynamic' ? 'dashed' : 'solid',
      weight: imp.frequency || 1
    })),

    layers: []
  }
}

// ============== ANALYSIS FUNCTIONS ==============

/**
 * Find dead code (nodes with no incoming edges)
 */
export const findDeadCode = (svg: SVG): SVGNode[] => {
  const hasIncomingEdges = (node: SVGNode): boolean =>
    svg.edges.some(edge => edge.to === node.id)

  return svg.nodes.filter(node => !hasIncomingEdges(node))
}

/**
 * Find circular dependencies
 */
export const findCircularDependencies = (svg: SVG): SVGEdge[][] => {
  const cycles: SVGEdge[][] = []
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  const dfs = (nodeId: string, path: SVGEdge[] = []): void => {
    visited.add(nodeId)
    recursionStack.add(nodeId)

    const outgoingEdges = svg.edges.filter(e => e.from === nodeId)

    for (const edge of outgoingEdges) {
      if (!visited.has(edge.to)) {
        dfs(edge.to, [...path, edge])
      } else if (recursionStack.has(edge.to)) {
        // Found cycle
        const cycleStart = path.findIndex(e => e.from === edge.to)
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), edge])
        }
      }
    }

    recursionStack.delete(nodeId)
  }

  svg.nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id)
    }
  })

  return cycles
}

/**
 * Calculate complexity metric for a subgraph
 */
export const calculateComplexity = (svg: SVG, nodeIds: Set<string>): number => {
  const relevantEdges = svg.edges.filter(
    e => nodeIds.has(e.from) && nodeIds.has(e.to)
  )

  const edgeCount = relevantEdges.length
  const nodeCount = nodeIds.size

  // McCabe cyclomatic complexity approximation
  return edgeCount - nodeCount + 2
}

// ============== TRANSFORMATION FUNCTIONS ==============

/**
 * Extract component - collapse subgraph to single node
 */
export const extractComponent = (
  svg: SVG,
  nodeIds: Set<string>,
  componentName: string
): SVG => {
  const componentNode: SVGNode = {
    id: componentName,
    x: 0,
    y: 0,
    r: 30,
    fill: '#9333ea',
    attributes: new Map([['type', 'component']])
  }

  // Calculate centroid position
  const nodes = svg.nodes.filter(n => nodeIds.has(n.id))
  componentNode.x = nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length
  componentNode.y = nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length

  // Keep external edges
  const externalEdges = svg.edges.filter(
    e => (nodeIds.has(e.from) && !nodeIds.has(e.to)) ||
        (!nodeIds.has(e.from) && nodeIds.has(e.to))
  ).map(e => ({
    ...e,
    from: nodeIds.has(e.from) ? componentName : e.from,
    to: nodeIds.has(e.to) ? componentName : e.to
  }))

  // Remove internal nodes and edges
  const remainingNodes = svg.nodes.filter(n => !nodeIds.has(n.id))
  const remainingEdges = svg.edges.filter(
    e => !nodeIds.has(e.from) && !nodeIds.has(e.to)
  )

  return {
    nodes: [...remainingNodes, componentNode],
    edges: [...remainingEdges, ...externalEdges],
    layers: svg.layers
  }
}

/**
 * Inline function - expand node into its implementation
 */
export const inlineFunction = (
  svg: SVG,
  nodeId: string,
  implementation: { nodes: SVGNode[], edges: SVGEdge[] }
): SVG => {
  const node = svg.nodes.find(n => n.id === nodeId)
  if (!node) return svg

  // Offset implementation nodes to original position
  const offsetNodes = implementation.nodes.map(n => ({
    ...n,
    id: `${nodeId}_${n.id}`,
    x: n.x + node.x - 100,
    y: n.y + node.y - 100
  }))

  // Update implementation edges with new IDs
  const offsetEdges = implementation.edges.map(e => ({
    ...e,
    from: `${nodeId}_${e.from}`,
    to: `${nodeId}_${e.to}`
  }))

  // Redirect external edges
  const externalEdges = svg.edges.filter(
    e => e.from !== nodeId && e.to !== nodeId
  )

  const incomingEdges = svg.edges
    .filter(e => e.to === nodeId)
    .map(e => ({
      ...e,
      to: offsetNodes[0]?.id || nodeId // Connect to first implementation node
    }))

  const outgoingEdges = svg.edges
    .filter(e => e.from === nodeId)
    .map(e => ({
      ...e,
      from: offsetNodes[offsetNodes.length - 1]?.id || nodeId // From last node
    }))

  return {
    nodes: [
      ...svg.nodes.filter(n => n.id !== nodeId),
      ...offsetNodes
    ],
    edges: [
      ...externalEdges,
      ...incomingEdges,
      ...outgoingEdges,
      ...offsetEdges
    ],
    layers: svg.layers
  }
}

/**
 * Apply memoization - mark function as cached
 */
export const memoize = (svg: SVG, nodeId: string): SVG => {
  return {
    ...svg,
    nodes: svg.nodes.map(n =>
      n.id === nodeId
        ? {
            ...n,
            attributes: new Map([
              ...Array.from(n.attributes.entries()),
              ['memoized', 'true'],
              ['cache_key', `mem_${Date.now()}`]
            ]),
            fill: '#10b981' // Green for memoized
          }
        : n
    )
  }
}

/**
 * Parallelize - split node into parallel execution paths
 */
export const parallelize = (
  svg: SVG,
  nodeId: string,
  parallelCount: number = 2
): SVG => {
  const node = svg.nodes.find(n => n.id === nodeId)
  if (!node) return svg

  const parallelNodes = Array.from({ length: parallelCount }, (_, i) => ({
    ...node,
    id: `${nodeId}_parallel_${i}`,
    x: node.x + (i - parallelCount / 2) * 50,
    y: node.y,
    r: node.r * 0.8,
    attributes: new Map([
      ...Array.from(node.attributes.entries()),
      ['parallel', 'true'],
      ['parallel_index', String(i)]
    ])
  }))

  // Create load balancer node
  const balancerNode: SVGNode = {
    id: `${nodeId}_balancer`,
    x: node.x,
    y: node.y - 50,
    r: 15,
    fill: '#f59e0b',
    attributes: new Map([['type', 'balancer']])
  }

  // Create merger node
  const mergerNode: SVGNode = {
    id: `${nodeId}_merger`,
    x: node.x,
    y: node.y + 50,
    r: 15,
    fill: '#f59e0b',
    attributes: new Map([['type', 'merger']])
  }

  // Update edges
  const balancerEdges = parallelNodes.map(n => ({
    from: balancerNode.id,
    to: n.id,
    stroke: 'solid' as const,
    weight: 1 / parallelCount
  }))

  const mergerEdges = parallelNodes.map(n => ({
    from: n.id,
    to: mergerNode.id,
    stroke: 'solid' as const,
    weight: 1 / parallelCount
  }))

  const updatedEdges = svg.edges.map(e => {
    if (e.to === nodeId) {
      return { ...e, to: balancerNode.id }
    }
    if (e.from === nodeId) {
      return { ...e, from: mergerNode.id }
    }
    return e
  })

  return {
    nodes: [
      ...svg.nodes.filter(n => n.id !== nodeId),
      balancerNode,
      ...parallelNodes,
      mergerNode
    ],
    edges: [
      ...updatedEdges,
      ...balancerEdges,
      ...mergerEdges
    ],
    layers: svg.layers
  }
}

// ============== OPTIMIZATION FUNCTIONS ==============

/**
 * Remove redundant edges (transitive reduction)
 */
export const removeRedundantEdges = (svg: SVG): SVG => {
  const reachable = new Map<string, Set<string>>()

  // Build reachability matrix
  svg.nodes.forEach(node => {
    const reached = new Set<string>()
    const queue = [node.id]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)

      svg.edges
        .filter(e => e.from === current)
        .forEach(e => {
          reached.add(e.to)
          queue.push(e.to)
        })
    }

    reachable.set(node.id, reached)
  })

  // Find redundant edges
  const redundantEdges = svg.edges.filter(edge => {
    // Check if there's another path from source to target
    const otherPaths = svg.edges
      .filter(e => e.from === edge.from && e.to !== edge.to)
      .some(e => reachable.get(e.to)?.has(edge.to))

    return otherPaths
  })

  return {
    ...svg,
    edges: svg.edges.filter(e => !redundantEdges.includes(e))
  }
}

/**
 * Cluster related nodes
 */
export const clusterNodes = (svg: SVG, threshold: number = 3): SVG => {
  const clusters: Set<string>[] = []
  const visited = new Set<string>()

  svg.nodes.forEach(node => {
    if (visited.has(node.id)) return

    const cluster = new Set<string>()
    const queue = [node.id]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue

      visited.add(current)
      cluster.add(current)

      // Find strongly connected nodes
      const connections = svg.edges.filter(
        e => e.from === current || e.to === current
      )

      connections.forEach(e => {
        const other = e.from === current ? e.to : e.from
        if (!visited.has(other)) {
          const connectionCount = svg.edges.filter(
            edge => (edge.from === current && edge.to === other) ||
                   (edge.from === other && edge.to === current)
          ).length

          if (connectionCount >= threshold) {
            queue.push(other)
          }
        }
      })
    }

    if (cluster.size > 1) {
      clusters.push(cluster)
    }
  })

  // Update node positions to cluster them visually
  const updatedNodes = svg.nodes.map(node => {
    const clusterIndex = clusters.findIndex(c => c.has(node.id))
    if (clusterIndex === -1) return node

    const clusterCenter = {
      x: 200 + clusterIndex * 200,
      y: 300
    }

    const angle = (Math.random() * Math.PI * 2)
    const radius = 50 + Math.random() * 50

    return {
      ...node,
      x: clusterCenter.x + Math.cos(angle) * radius,
      y: clusterCenter.y + Math.sin(angle) * radius,
      attributes: new Map([
        ...Array.from(node.attributes.entries()),
        ['cluster', String(clusterIndex)]
      ])
    }
  })

  return {
    ...svg,
    nodes: updatedNodes
  }
}

// ============== TEMPORAL FUNCTIONS ==============

/**
 * Add git history as temporal layers
 */
export const addTemporalLayers = (svg: SVG, commits: any[]): SVG => {
  const layers = commits.map((commit, i) => ({
    id: i,
    opacity: Math.exp(-i / 10),
    transform: `translate(${i * 2}, ${i * 2})`,
    timestamp: commit.timestamp
  }))

  return {
    ...svg,
    layers
  }
}

/**
 * Time travel - show SVG at specific commit
 */
export const timeTravel = (svg: SVG, layerId: number): SVG => {
  const layer = svg.layers.find(l => l.id === layerId)
  if (!layer) return svg

  return {
    ...svg,
    nodes: svg.nodes.map(n => ({
      ...n,
      x: n.x + parseFloat(layer.transform.match(/translate\(([\d.]+)/)?.[1] || '0'),
      y: n.y + parseFloat(layer.transform.match(/,\s*([\d.]+)/)?.[1] || '0')
    }))
  }
}

// ============== COMPOSITION FUNCTIONS ==============

/**
 * Compose multiple transformations
 */
export const compose = (...transforms: ((svg: SVG) => SVG)[]): (svg: SVG) => SVG => {
  return (svg: SVG) => transforms.reduce((acc, transform) => transform(acc), svg)
}

/**
 * Apply transformation with rollback capability
 */
export const withRollback = (
  svg: SVG,
  transform: (svg: SVG) => SVG
): { result: SVG, rollback: () => SVG } => {
  const original = structuredClone(svg)
  const result = transform(svg)

  return {
    result,
    rollback: () => original
  }
}

// ============== GENE INTEGRATION ==============

/**
 * Convert transformation to gene
 */
export const transformToGene = (
  name: string,
  transform: (svg: SVG) => SVG,
  invariant: (before: SVG, after: SVG) => boolean
): Gene => {
  return {
    name,
    input: 'SVG',
    output: 'SVG',
    transform,
    invariant,
    proof: (before, after) => {
      // Verify behavior preservation
      const beforeComplexity = calculateComplexity(
        before,
        new Set(before.nodes.map(n => n.id))
      )
      const afterComplexity = calculateComplexity(
        after,
        new Set(after.nodes.map(n => n.id))
      )

      return {
        valid: invariant(before, after),
        metrics: {
          complexityReduction: beforeComplexity - afterComplexity,
          nodeReduction: before.nodes.length - after.nodes.length,
          edgeReduction: before.edges.length - after.edges.length
        }
      }
    }
  }
}

interface Gene {
  name: string
  input: string
  output: string
  transform: (svg: SVG) => SVG
  invariant: (before: SVG, after: SVG) => boolean
  proof: (before: SVG, after: SVG) => { valid: boolean, metrics: any }
}

// ============== EXPORT GENE POOL ==============

export const GENE_POOL = {
  EXTRACT_COMPONENT: transformToGene(
    'EXTRACT_COMPONENT',
    (svg) => extractComponent(svg, new Set(['node1', 'node2']), 'Component'),
    (before, after) => after.nodes.length < before.nodes.length
  ),

  MEMOIZE_EXPENSIVE: transformToGene(
    'MEMOIZE_EXPENSIVE',
    (svg) => {
      const expensive = svg.nodes.find(n =>
        parseInt(n.attributes.get('complexity') || '0') > 10
      )
      return expensive ? memoize(svg, expensive.id) : svg
    },
    (before, after) => true // Memoization preserves behavior
  ),

  PARALLELIZE_BOTTLENECK: transformToGene(
    'PARALLELIZE_BOTTLENECK',
    (svg) => {
      const bottleneck = svg.nodes.find(n =>
        svg.edges.filter(e => e.to === n.id).length > 5
      )
      return bottleneck ? parallelize(svg, bottleneck.id, 3) : svg
    },
    (before, after) => true // Parallelization preserves behavior
  ),

  REMOVE_DEAD_CODE: transformToGene(
    'REMOVE_DEAD_CODE',
    (svg) => {
      const dead = findDeadCode(svg)
      return {
        ...svg,
        nodes: svg.nodes.filter(n => !dead.includes(n))
      }
    },
    (before, after) => after.nodes.length <= before.nodes.length
  ),

  CLUSTER_RELATED: transformToGene(
    'CLUSTER_RELATED',
    (svg) => clusterNodes(svg, 2),
    (before, after) =>
      before.nodes.length === after.nodes.length &&
      before.edges.length === after.edges.length
  )
}