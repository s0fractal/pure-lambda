#!/usr/bin/env node
/**
 * B2-Hex Converter
 * Bidirectional conversion between B2 graphs and hexagonal fields
 */

import { createHash } from 'crypto';

// === Hexagonal Coordinate System ===
class HexCoord {
  constructor(q, r, t = 0) {
    this.q = q;  // Column
    this.r = r;  // Row
    this.t = t;  // Time layer
    this.s = -q - r;  // Cube coordinate constraint
  }

  // 6 neighbor directions (60° apart)
  static getDirections() {
    return {
      N:  { q: 0, r: -1 },
      NE: { q: 1, r: -1 },
      E:  { q: 1, r: 0 },   // East = SE in hex
      SE: { q: 1, r: 0 },
      S:  { q: 0, r: 1 },
      SW: { q: -1, r: 1 },
      W:  { q: -1, r: 0 },  // West = NW in hex
      NW: { q: -1, r: 0 }
    };
  }

  neighbor(dir) {
    const directions = HexCoord.getDirections();
    const d = directions[dir];
    if (!d) {
      throw new Error(`Invalid direction: ${dir}`);
    }
    return new HexCoord(this.q + d.q, this.r + d.r, this.t);
  }

  distance(other) {
    return (Math.abs(this.q - other.q) +
            Math.abs(this.q + this.r - other.q - other.r) +
            Math.abs(this.r - other.r)) / 2;
  }
}

// === Hex Tile (6-key operator card) ===
class HexTile {
  constructor(op, ph, ports, cost, law, cid) {
    this.op = op;        // Operator name
    this.ph = ph;        // phash
    this.ports = ports;  // Port mapping (e.g., "W->E" or "W->NE,SE")
    this.cost = cost;    // Execution cost
    this.law = law;      // Semantic law
    this.cid = cid;      // Receipt CID
  }

  static fromYAML(yaml) {
    const lines = yaml.trim().split('\n');
    const obj = {};
    lines.forEach(line => {
      const [key, ...val] = line.split(':');
      obj[key.trim()] = val.join(':').trim();
    });
    return new HexTile(
      obj.op, obj.ph, obj.ports,
      obj.cost, obj.law, obj.cid
    );
  }

  toYAML() {
    return [
      `op: ${this.op}`,
      `ph: ${this.ph}`,
      `ports: ${this.ports}`,
      `cost: ${this.cost}`,
      `law: ${this.law}`,
      `cid: ${this.cid}`
    ].join('\n');
  }
}

// === Hex Field (the execution space) ===
class HexField {
  constructor() {
    this.tiles = new Map();  // coord_key -> HexTile
    this.edges = new Map();  // "from->to" -> edge_data
  }

  place(coord, tile) {
    const key = `${coord.q},${coord.r},${coord.t}`;
    this.tiles.set(key, tile);
  }

  connect(from, to, port) {
    const key = `${from.q},${from.r},${from.t}->${to.q},${to.r},${to.t}`;
    this.edges.set(key, { from, to, port });
  }

  getTile(coord) {
    const key = `${coord.q},${coord.r},${coord.t}`;
    return this.tiles.get(key);
  }
}

// === B2 AST Representation ===
class B2Node {
  constructor(op, left = null, right = null, name = null) {
    this.op = op;
    this.left = left;
    this.right = right;
    this.name = name;  // For atoms
  }

  static atom(name) {
    return new B2Node('ATOM', null, null, name);
  }

  static then(left, right) {
    return new B2Node('THEN', left, right);
  }

  static split(left, right) {
    return new B2Node('SPLIT', left, right);
  }

  toJSON() {
    if (this.op === 'ATOM') {
      return { op: 'ATOM', name: this.name };
    }
    return {
      op: this.op,
      left: this.left?.toJSON(),
      right: this.right?.toJSON()
    };
  }
}

// === B2 → Hex Converter ===
function b2ToHex(ast) {
  const field = new HexField();
  let nextQ = 0;
  let nextR = 0;

  function layout(node, coord = new HexCoord(0, 0)) {
    if (!node) return null;

    if (node.op === 'ATOM') {
      // Place atom tile
      const tile = new HexTile(
        node.name,
        `ph_${node.name.toLowerCase()}`,
        'W->E',
        'lat=10µs',
        `${node.name} law`,
        `Qm_${node.name}`
      );
      field.place(coord, tile);
      return coord;
    }

    if (node.op === 'THEN') {
      // Sequential layout: left -> right
      const leftCoord = layout(node.left, coord);
      const rightCoord = layout(node.right, leftCoord.neighbor('E'));
      field.connect(leftCoord, rightCoord, 'E');
      return rightCoord;
    }

    if (node.op === 'SPLIT') {
      // Fan-out layout: split to NE and SE
      const splitTile = new HexTile(
        'SPLIT', 'ph_split', 'W->NE,SE',
        'lat=1µs', 'fanout', 'Qm_split'
      );
      field.place(coord, splitTile);

      const leftCoord = layout(node.left, coord.neighbor('NE'));
      const rightCoord = layout(node.right, coord.neighbor('SE'));

      field.connect(coord, leftCoord, 'NE');
      field.connect(coord, rightCoord, 'SE');

      // Place merge after split branches
      const mergeCoord = new HexCoord(
        Math.max(leftCoord.q, rightCoord.q) + 1,
        (leftCoord.r + rightCoord.r) / 2
      );
      const mergeTile = new HexTile(
        'MERGE', 'ph_merge', 'NW,SW->E',
        'lat=2µs', 'Option monoid', 'Qm_merge'
      );
      field.place(mergeCoord, mergeTile);

      field.connect(leftCoord, mergeCoord, 'SW');
      field.connect(rightCoord, mergeCoord, 'NW');

      return mergeCoord;
    }

    return coord;
  }

  layout(ast);
  return field;
}

// === Hex → B2 Converter ===
function hexToB2(field) {
  // Find entry point (leftmost tile)
  let entry = null;
  let minQ = Infinity;

  for (const [key, tile] of field.tiles) {
    const [q] = key.split(',').map(Number);
    if (q < minQ) {
      minQ = q;
      entry = key;
    }
  }

  function trace(coordKey, visited = new Set()) {
    if (!coordKey || visited.has(coordKey)) return null;
    visited.add(coordKey);

    const tile = field.tiles.get(coordKey);
    if (!tile) return null;

    // Check if it's an atom
    if (!['THEN', 'SPLIT', 'MERGE'].includes(tile.op)) {
      return B2Node.atom(tile.op);
    }

    // Find connected tiles based on ports
    const ports = tile.ports.split('->')[1].split(',');

    if (tile.op === 'SPLIT' && ports.length === 2) {
      // Find NE and SE connections
      const connections = [];
      for (const [edgeKey, edge] of field.edges) {
        if (edgeKey.startsWith(coordKey + '->')) {
          connections.push(edge.to);
        }
      }

      if (connections.length === 2) {
        const left = trace(`${connections[0].q},${connections[0].r},${connections[0].t}`, visited);
        const right = trace(`${connections[1].q},${connections[1].r},${connections[1].t}`, visited);
        return B2Node.split(left, right);
      }
    }

    // Default: follow the main path
    for (const [edgeKey, edge] of field.edges) {
      if (edgeKey.startsWith(coordKey + '->')) {
        const next = `${edge.to.q},${edge.to.r},${edge.to.t}`;
        const nextNode = trace(next, visited);
        if (nextNode) {
          return B2Node.then(B2Node.atom(tile.op), nextNode);
        }
      }
    }

    return B2Node.atom(tile.op);
  }

  return trace(entry);
}

// === Vector Field Router (A* on hex grid) ===
class VectorRouter {
  constructor(field, profile = 'balanced') {
    this.field = field;
    this.profile = profile;
    this.weights = {
      'apex': { lat: 0.1, mem: 0.9 },      // Optimize for memory
      'proof': { lat: 0.5, mem: 0.5 },     // Balanced
      'perf': { lat: 0.9, mem: 0.1 },      // Optimize for speed
      'balanced': { lat: 0.5, mem: 0.5 }
    }[profile];
  }

  route(start, goal) {
    const openSet = [{ coord: start, f: 0, g: 0 }];
    const cameFrom = new Map();
    const gScore = new Map();
    gScore.set(this.coordKey(start), 0);

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();

      if (current.coord.distance(goal) === 0) {
        // Reconstruct path
        const path = [];
        let node = current.coord;
        while (cameFrom.has(this.coordKey(node))) {
          path.unshift(node);
          node = cameFrom.get(this.coordKey(node));
        }
        path.unshift(start);
        return path;
      }

      // Check all neighbors
      for (const dir of Object.keys(HexCoord.getDirections())) {
        const neighbor = current.coord.neighbor(dir);
        const neighborKey = this.coordKey(neighbor);

        // Calculate cost
        const tile = this.field.getTile(neighbor);
        if (!tile) continue;  // No tile here

        const tileCost = this.calculateCost(tile);
        const tentativeG = current.g + tileCost;

        if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)) {
          cameFrom.set(neighborKey, current.coord);
          gScore.set(neighborKey, tentativeG);

          const h = neighbor.distance(goal);
          const f = tentativeG + h;

          openSet.push({ coord: neighbor, f, g: tentativeG });
        }
      }
    }

    return null;  // No path found
  }

  calculateCost(tile) {
    // Parse cost string like "lat=12µs,mem=1k"
    const costs = {};
    tile.cost.split(',').forEach(part => {
      const [key, val] = part.split('=');
      costs[key] = parseFloat(val);
    });

    return (costs.lat || 10) * this.weights.lat +
           (costs.mem || 1) * this.weights.mem;
  }

  coordKey(coord) {
    return `${coord.q},${coord.r},${coord.t}`;
  }
}

// === CLI Interface ===
const command = process.argv[2];

if (command === 'b2-to-hex') {
  // Example: Convert B2 AST to hex field
  const ast = B2Node.then(
    B2Node.atom('FOCUS'),
    B2Node.split(
      B2Node.atom('SCAN'),
      B2Node.atom('DELAY')
    )
  );

  const field = b2ToHex(ast);
  console.log('📐 B2 → Hex Conversion');
  console.log('Tiles placed:');
  for (const [coord, tile] of field.tiles) {
    console.log(`  [${coord}]: ${tile.op}`);
  }

} else if (command === 'hex-to-b2') {
  // Create a sample hex field
  const field = new HexField();
  field.place(new HexCoord(0, 0), new HexTile('FOCUS', 'ph_focus', 'W->E', 'lat=9µs', 'filter', 'Qm1'));
  field.place(new HexCoord(1, 0), new HexTile('SCAN', 'ph_scan', 'W->E', 'lat=14µs', 'accumulate', 'Qm2'));
  field.connect(new HexCoord(0, 0), new HexCoord(1, 0), 'E');

  const ast = hexToB2(field);
  console.log('🔄 Hex → B2 Conversion');
  console.log(JSON.stringify(ast.toJSON(), null, 2));

} else if (command === 'route') {
  // Demo vector routing
  const field = new HexField();
  // Place some tiles...
  for (let q = 0; q < 5; q++) {
    for (let r = 0; r < 5; r++) {
      const cost = `lat=${10 + q + r}µs,mem=${1 + q}k`;
      field.place(
        new HexCoord(q, r),
        new HexTile('NODE', `ph_${q}_${r}`, 'W->E', cost, 'passthrough', `Qm_${q}_${r}`)
      );
    }
  }

  const router = new VectorRouter(field, 'perf');
  const path = router.route(new HexCoord(0, 0), new HexCoord(4, 4));

  console.log('🚀 Vector Routing (profile: perf)');
  if (path) {
    console.log('Optimal path:');
    path.forEach((coord, i) => {
      console.log(`  Step ${i}: [${coord.q},${coord.r}]`);
    });
  }

} else {
  console.log('🔷 B2-Hex Converter');
  console.log('');
  console.log('Commands:');
  console.log('  b2-to-hex     - Convert B2 AST to hex field');
  console.log('  hex-to-b2     - Convert hex field to B2 AST');
  console.log('  route         - Demo vector routing on hex grid');
  console.log('');
  console.log('Hex coordinate system: axial (q,r) with time layer t');
  console.log('Port directions: N, NE, SE, S, SW, NW (60° apart)');
}

export { HexCoord, HexTile, HexField, B2Node, b2ToHex, hexToB2, VectorRouter };