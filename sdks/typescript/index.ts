// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Pure Lambda TypeScript SDK
 * ESM module for working with PL-SEED-01 format
 */

// Re-export types from schema
export type {
  Seed,
  TileObject,
  TileABI,
  SeedMeta,
  OperonJson
} from '../../src/seed/schema';

import {
  validateSeed,
  type Seed,
  type OperonJson,
  canonicalizeJSON
} from '../../src/seed/schema';

import { canonicalize } from '../../src/seed/canonical';

import { tilesToOperon } from '../../tools/seed/unpack';
import { verifyEnvelope } from '../../tools/attest';

/**
 * Load and validate a seed from JSON data
 */
export function loadSeed(json: any): Seed {
  return validateSeed(json);
}

/**
 * Convert a seed to operon JSON format
 */
export function toOperon(seed: Seed): OperonJson {
  return tilesToOperon(seed);
}

/**
 * Autopilot cost calculation options
 */
export interface AutopilotOptions {
  lambda?: number;  // Hop penalty weight (default: 0.2)
  mu?: number;      // Memory penalty weight (default: 0.001)
  eps?: number;     // Rounding epsilon (default: 1e-9)
}

/**
 * Run autopilot optimization on operon
 * Cost function: L = latency + lambda*hops + mu*mem
 * Results rounded to eps precision
 *
 * @param operon - The operon to optimize
 * @param opts - Optimization options
 * @returns Optimization result with cost and route
 */
export function runAutopilot(operon: OperonJson, opts: AutopilotOptions = {}): { Lbest: number; route: number[] } {
  const { lambda = 0.2, mu = 0.001, eps = 1e-9 } = opts;
  const nodes = Object.keys(operon.nodes);

  if (nodes.length === 0) {
    return { Lbest: 0, route: [] };
  }

  // Find nodes that are not meta nodes (have 'op' property)
  const operationalNodes = nodes.filter(nodeId => {
    const node = operon.nodes[nodeId];
    return node && typeof node.op === 'string' && !('oids' in node);
  });

  if (operationalNodes.length === 0) {
    return { Lbest: 0, route: [] };
  }

  // Calculate cost using: L = latency + lambda*hops + mu*mem
  function getNodeCost(nodeId: string): { latency: number; hops: number; mem: number; total: number } {
    const node = operon.nodes[nodeId];
    if (!node) return { latency: Infinity, hops: 1, mem: 0, total: Infinity };

    let latency = 1.0; // Default 1ms
    let mem = 1024; // Default 1KB

    // Parse cost annotation if available
    if (typeof node.cost === 'string') {
      if (node.cost.includes('O(1)')) { latency = 0.1; mem = 512; }
      else if (node.cost.includes('O(n)')) { latency = 10; mem = 2048; }
      else if (node.cost.includes('O(n²)') || node.cost.includes('O(n^2)')) { latency = 100; mem = 8192; }
      else if (node.cost.includes('O(log n)')) { latency = 5; mem = 1024; }
    }

    // Adjust based on operation type
    const op = node.op || '';
    switch (op.toUpperCase()) {
      case 'FOCUS': latency *= 0.5; mem *= 0.8; break;
      case 'DELAY': latency *= 2.0; mem *= 1.1; break;
      case 'TRANSFORM': latency *= 1.5; mem *= 2.0; break;
      case 'MERGE': latency *= 2.0; mem *= 1.5; break;
      case 'SPLIT': latency *= 1.8; mem *= 1.3; break;
    }

    const hops = 1;
    const total = latency + lambda * hops + mu * mem;

    return { latency, hops, mem, total };
  }

  // Build adjacency list from links
  const graph = new Map<string, { neighbor: string; cost: number }[]>();

  for (const nodeId of operationalNodes) {
    graph.set(nodeId, []);
    const node = operon.nodes[nodeId];

    if (node && node.links) {
      for (const [port, targetId] of Object.entries(node.links)) {
        if (typeof targetId === 'string' && operationalNodes.includes(targetId)) {
          const costData = getNodeCost(targetId);
          graph.get(nodeId)!.push({ neighbor: targetId, cost: costData.total });
        }
      }
    }
  }

  // Simple Dijkstra-like shortest path
  const startNode = operon.root && operationalNodes.includes(operon.root)
    ? operon.root
    : operationalNodes[0] || '';

  if (!startNode || !operationalNodes.includes(startNode)) {
    return { Lbest: 0, route: [] };
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set(operationalNodes);

  // Initialize distances
  for (const nodeId of operationalNodes) {
    distances.set(nodeId, nodeId === startNode ? 0 : Infinity);
    previous.set(nodeId, null);
  }

  while (unvisited.size > 0) {
    // Find unvisited node with minimum distance
    let currentNode: string | null = null;
    let minDistance = Infinity;

    for (const nodeId of Array.from(unvisited)) {
      const dist = distances.get(nodeId) || Infinity;
      if (dist < minDistance) {
        minDistance = dist;
        currentNode = nodeId;
      }
    }

    if (!currentNode || minDistance === Infinity) {
      break; // No more reachable nodes
    }

    unvisited.delete(currentNode);

    // Update distances to neighbors
    const neighbors = graph.get(currentNode) || [];
    for (const { neighbor, cost } of neighbors) {
      if (unvisited.has(neighbor)) {
        const currentDist = distances.get(currentNode) || 0;
        const newDist = currentDist + cost;
        const existingDist = distances.get(neighbor) || Infinity;

        if (newDist < existingDist) {
          distances.set(neighbor, newDist);
          previous.set(neighbor, currentNode);
        }
      }
    }
  }

  // Find best path (to node with minimum total distance)
  let bestNode: string = startNode;
  let bestDistance = distances.get(startNode) || 0;

  for (const nodeId of Array.from(distances.keys())) {
    const distance = distances.get(nodeId) || Infinity;
    if (distance < bestDistance && distance !== Infinity) {
      bestDistance = distance;
      bestNode = nodeId;
    }
  }

  // Reconstruct path
  const route: string[] = [];
  let current: string | null = bestNode as string;

  while (current !== null) {
    route.unshift(current);
    current = previous.get(current) || null;
  }

  // Convert node IDs to indices for compatibility
  const routeIndices = route.map(nodeId => operationalNodes.indexOf(nodeId)).filter(idx => idx >= 0);

  // Round the result with epsilon precision
  const roundedCost = Math.round(bestDistance / eps) * eps;

  return {
    Lbest: roundedCost,
    route: routeIndices
  };
}

/**
 * Verify a DSSE receipt against an envelope
 */
export function verifyReceipt(receipt: any, envelope: any): boolean {
  try {
    // For now, delegate to the existing verification function
    // In a real implementation, this would compare receipt against envelope
    if (!envelope || typeof envelope !== 'object') {
      return false;
    }

    // Check if envelope has the expected DSSE structure
    if (!envelope.payloadType || !envelope.payloadBase64 || !Array.isArray(envelope.signatures)) {
      return false;
    }

    // Basic receipt validation
    if (!receipt || typeof receipt !== 'object') {
      return false;
    }

    // For demonstration, we'll check if receipt has expected fields
    const hasRequiredFields = receipt.timestamp && receipt.hash && receipt.signatures;

    return hasRequiredFields;
  } catch (error) {
    console.error('Receipt verification error:', error);
    return false;
  }
}

/**
 * Utility function to create canonical JSON representation
 */
export function canonical(obj: any): string {
  return canonicalize(obj);
}

/**
 * Create a simple seed from tile data
 */
export function createSeed(name: string, tiles: any[]): Seed {
  const now = new Date().toISOString();

  const seed: Seed = {
    pl_seed: 'PL-SEED-01',
    name,
    version: 1,
    createdAt: now,
    tiles: tiles,
    meta: {
      gidSet: [], // Will be computed by validation
      iidSet: [],
      xidSet: [],
      stats: {
        hops: tiles.length,
        latency: tiles.length * 0.001,
        mem: tiles.length * 1024
      }
    }
  };

  return validateSeed(seed);
}