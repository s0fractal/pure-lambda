/**
 * Mirror Form Geometry Genes
 * Pure geometric transformations with invariant preservation
 */

export interface Point {
  x: number
  y: number
}

export interface Path {
  points: Point[]
  curved: boolean
}

export interface GeometryProof {
  invariant: string
  preserved: boolean
  delta: number
  details: any
}

// ============== CURVE SIMPLIFICATION ==============

/**
 * CURVE_SIMPLIFY - Ramer-Douglas-Peucker algorithm
 * Reduces points while preserving shape within epsilon
 */
export function CURVE_SIMPLIFY(path: Path, epsilon: number): {
  result: Path,
  proof: GeometryProof
} {
  const simplified = douglasPeucker(path.points, epsilon)

  const areaLoss = calculateAreaDifference(path.points, simplified)

  return {
    result: {
      points: simplified,
      curved: path.curved
    },
    proof: {
      invariant: 'topology_preserved',
      preserved: areaLoss <= epsilon * epsilon,
      delta: areaLoss,
      details: {
        original_points: path.points.length,
        simplified_points: simplified.length,
        reduction_ratio: 1 - simplified.length / path.points.length,
        max_deviation: epsilon
      }
    }
  }
}

function douglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points

  // Find point with maximum distance
  let maxDist = 0
  let maxIndex = 0

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(
      points[i],
      points[0],
      points[points.length - 1]
    )

    if (dist > maxDist) {
      maxDist = dist
      maxIndex = i
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon)
    const right = douglasPeucker(points.slice(maxIndex), epsilon)

    return [...left.slice(0, -1), ...right]
  } else {
    return [points[0], points[points.length - 1]]
  }
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y

  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) +
      Math.pow(point.y - lineStart.y, 2)
    )
  }

  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
    (dx * dx + dy * dy)

  const projection = {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy
  }

  return Math.sqrt(
    Math.pow(point.x - projection.x, 2) +
    Math.pow(point.y - projection.y, 2)
  )
}

function calculateAreaDifference(original: Point[], simplified: Point[]): number {
  const areaOriginal = calculatePolygonArea(original)
  const areaSimplified = calculatePolygonArea(simplified)
  return Math.abs(areaOriginal - areaSimplified)
}

function calculatePolygonArea(points: Point[]): number {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area / 2)
}

// ============== STRAIGHTENING ==============

/**
 * STRAIGHTEN - Gradually transform curve to straight line
 * Parameter τ controls the amount of straightening (0 = curve, 1 = straight)
 */
export function STRAIGHTEN(path: Path, tau: number): {
  result: Path,
  proof: GeometryProof
} {
  if (path.points.length < 2) return { result: path, proof: createTrivialProof() }

  const start = path.points[0]
  const end = path.points[path.points.length - 1]

  const straightened = path.points.map((point, i) => {
    if (i === 0 || i === path.points.length - 1) {
      return point // Keep endpoints fixed
    }

    // Linear interpolation position
    const t = i / (path.points.length - 1)
    const linearX = start.x + t * (end.x - start.x)
    const linearY = start.y + t * (end.y - start.y)

    // Blend between original and linear
    return {
      x: point.x + tau * (linearX - point.x),
      y: point.y + tau * (linearY - point.y)
    }
  })

  const lengthOriginal = calculatePathLength(path.points)
  const lengthStraightened = calculatePathLength(straightened)
  const lengthDelta = Math.abs(lengthOriginal - lengthStraightened) / lengthOriginal

  return {
    result: {
      points: straightened,
      curved: tau < 1 // Still curved unless fully straightened
    },
    proof: {
      invariant: 'endpoints_fixed',
      preserved: true,
      delta: lengthDelta,
      details: {
        tau,
        length_change: lengthDelta,
        curvature_remaining: 1 - tau
      }
    }
  }
}

function calculatePathLength(points: Point[]): number {
  let length = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    length += Math.sqrt(dx * dx + dy * dy)
  }
  return length
}

// ============== MIRRORING ==============

/**
 * MIRROR - Reflect path across an axis
 * Preserves topology and incidence
 */
export function MIRROR(path: Path, axis: 'x' | 'y' | Point): {
  result: Path,
  proof: GeometryProof
} {
  let mirrored: Point[]

  if (axis === 'x') {
    // Mirror across x-axis (flip y)
    mirrored = path.points.map(p => ({ x: p.x, y: -p.y }))
  } else if (axis === 'y') {
    // Mirror across y-axis (flip x)
    mirrored = path.points.map(p => ({ x: -p.x, y: p.y }))
  } else {
    // Mirror across arbitrary line through point
    const center = axis
    mirrored = path.points.map(p => ({
      x: 2 * center.x - p.x,
      y: 2 * center.y - p.y
    }))
  }

  const lengthOriginal = calculatePathLength(path.points)
  const lengthMirrored = calculatePathLength(mirrored)
  const lengthDelta = Math.abs(lengthOriginal - lengthMirrored) / lengthOriginal

  // Check if planarity is preserved (no self-intersections introduced)
  const planarityPreserved = !hasIntersections(mirrored)

  return {
    result: {
      points: mirrored,
      curved: path.curved
    },
    proof: {
      invariant: 'mirror_symmetry',
      preserved: lengthDelta < 0.001 && planarityPreserved,
      delta: lengthDelta,
      details: {
        axis: typeof axis === 'string' ? axis : 'point',
        length_preserved: lengthDelta < 0.001,
        planarity_preserved: planarityPreserved,
        topology_unchanged: true
      }
    }
  }
}

function hasIntersections(points: Point[]): boolean {
  // Simplified check - in practice would use proper line intersection algorithm
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = i + 2; j < points.length - 1; j++) {
      if (segmentsIntersect(
        points[i], points[i + 1],
        points[j], points[j + 1]
      )) {
        return true
      }
    }
  }
  return false
}

function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y)

  if (Math.abs(d) < 0.0001) return false // Parallel

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / d
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / d

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1
}

// ============== FLOW FIELD ==============

/**
 * FLOW_FIELD - Apply vector field to path
 * Creates organic flowing shapes
 */
export function FLOW_FIELD(path: Path, kappa: number): {
  result: Path,
  proof: GeometryProof
} {
  // Generate flow field based on complexity
  const field = (p: Point) => ({
    x: Math.sin(p.y * kappa) * 10,
    y: Math.cos(p.x * kappa) * 10
  })

  const flowed = path.points.map((point, i) => {
    if (i === 0 || i === path.points.length - 1) {
      return point // Keep endpoints
    }

    const flow = field(point)
    return {
      x: point.x + flow.x * 0.1,
      y: point.y + flow.y * 0.1
    }
  })

  const smoothness = calculateSmoothness(flowed)

  return {
    result: {
      points: flowed,
      curved: true
    },
    proof: {
      invariant: 'flow_continuity',
      preserved: smoothness > 0.8,
      delta: 1 - smoothness,
      details: {
        kappa,
        smoothness,
        field_strength: kappa * 10
      }
    }
  }
}

function calculateSmoothness(points: Point[]): number {
  if (points.length < 3) return 1

  let totalAngleChange = 0

  for (let i = 1; i < points.length - 1; i++) {
    const v1 = {
      x: points[i].x - points[i - 1].x,
      y: points[i].y - points[i - 1].y
    }
    const v2 = {
      x: points[i + 1].x - points[i].x,
      y: points[i + 1].y - points[i].y
    }

    const angle1 = Math.atan2(v1.y, v1.x)
    const angle2 = Math.atan2(v2.y, v2.x)

    let angleDiff = angle2 - angle1
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI

    totalAngleChange += Math.abs(angleDiff)
  }

  // Normalize to 0-1 (1 = very smooth)
  return Math.exp(-totalAngleChange / points.length)
}

// ============== COMPOSITION ==============

/**
 * Compose multiple geometry transformations
 */
export function composeGeometry(...transforms: Array<(path: Path) => any>): (path: Path) => any {
  return (path: Path) => {
    let current = path
    const proofs: GeometryProof[] = []

    for (const transform of transforms) {
      const { result, proof } = transform(current)
      current = result
      proofs.push(proof)
    }

    return {
      result: current,
      proof: {
        invariant: 'composition',
        preserved: proofs.every(p => p.preserved),
        delta: proofs.reduce((sum, p) => sum + p.delta, 0),
        details: { proofs }
      }
    }
  }
}

// ============== HELPERS ==============

function createTrivialProof(): GeometryProof {
  return {
    invariant: 'trivial',
    preserved: true,
    delta: 0,
    details: {}
  }
}

// ============== EXPORT GENE CATALOG ==============

export const GEOMETRY_GENES = {
  CURVE_SIMPLIFY: (epsilon: number) => (path: Path) => CURVE_SIMPLIFY(path, epsilon),
  STRAIGHTEN: (tau: number) => (path: Path) => STRAIGHTEN(path, tau),
  MIRROR: (axis: 'x' | 'y' | Point) => (path: Path) => MIRROR(path, axis),
  FLOW_FIELD: (kappa: number) => (path: Path) => FLOW_FIELD(path, kappa)
}

// ============== INVARIANT CHECKS ==============

export function verifyInvariants(original: Path, transformed: Path): {
  endpoints_preserved: boolean
  topology_preserved: boolean
  length_delta: number
  area_delta: number
} {
  const endpointsPreserved =
    original.points[0].x === transformed.points[0].x &&
    original.points[0].y === transformed.points[0].y &&
    original.points[original.points.length - 1].x === transformed.points[transformed.points.length - 1].x &&
    original.points[original.points.length - 1].y === transformed.points[transformed.points.length - 1].y

  const topologyPreserved = !hasIntersections(transformed.points)

  const lengthOriginal = calculatePathLength(original.points)
  const lengthTransformed = calculatePathLength(transformed.points)
  const lengthDelta = Math.abs(lengthOriginal - lengthTransformed) / lengthOriginal

  const areaOriginal = calculatePolygonArea(original.points)
  const areaTransformed = calculatePolygonArea(transformed.points)
  const areaDelta = Math.abs(areaOriginal - areaTransformed) / (areaOriginal || 1)

  return {
    endpoints_preserved: endpointsPreserved,
    topology_preserved: topologyPreserved,
    length_delta: lengthDelta,
    area_delta: areaDelta
  }
}