#!/usr/bin/env ts-node
// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors


import * as fs from 'fs';
import { program } from 'commander';

interface OperonNode {
  cost: string;
  gid: string;
  iid: string;
  law: string;
  links: Record<string, string>;
  op: string;
  ports: Record<string, string>;
  receipt: any;
  xid: string;
}

interface OperonData {
  nodes: Record<string, OperonNode | { oids: string[]; root: string }>;
  root: string;
}

interface Route {
  path: string[];
  latency: number;
  hops: number;
  memory: number;
}

interface RouteResult {
  route: string[];
  L: number;
}

interface AutopilotResult {
  bestRoute: string[];
  Lbest: number;
  topK: RouteResult[];
}

// Cost table mapping for latency calculation
const COST_LATENCY_MAP: Record<string, number> = {
  'O(1)': 1,
  'O(log n)': 2,
  'O(n)': 10,
  'O(n log n)': 20,
  'O(n^2)': 100,
  'O(n^3)': 1000,
  'O(2^n)': 10000
};

// Memory estimation based on operation type
const OP_MEMORY_MAP: Record<string, number> = {
  'SPLIT': 2,
  'FOCUS': 1,
  'MERGE': 3,
  'MAP': 2,
  'FILTER': 1,
  'REDUCE': 4
};

function parseOperonData(filePath: string): OperonData {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function isOperonNode(node: any): node is OperonNode {
  return node.hasOwnProperty('gid') && node.hasOwnProperty('op');
}

function getLatency(cost: string): number {
  return COST_LATENCY_MAP[cost] || 1;
}

function getMemory(op: string): number {
  return OP_MEMORY_MAP[op] || 1;
}

function findAllRoutes(data: OperonData, startNodeId: string, visited = new Set<string>()): Route[] {
  const routes: Route[] = [];
  const startNode = data.nodes[startNodeId];

  if (!startNode) {
    return routes;
  }

  if (!isOperonNode(startNode)) {
    // Handle composite node with oids
    if ('oids' in startNode && startNode.oids) {
      // Start from root node
      const rootRoutes = findAllRoutes(data, startNode.root, visited);
      return rootRoutes;
    }
    return routes;
  }

  visited.add(startNodeId);

  // Base case: no outgoing links, this is a leaf route
  const links = Object.values(startNode.links || {});
  if (links.length === 0) {
    const latency = getLatency(startNode.cost);
    const memory = getMemory(startNode.op);
    routes.push({
      path: [startNodeId],
      latency,
      hops: 1,
      memory
    });
  } else {
    // Recursive case: explore all linked nodes
    for (const linkNodeId of links) {
      if (!visited.has(linkNodeId)) {
        const subRoutes = findAllRoutes(data, linkNodeId, new Set(visited));

        for (const subRoute of subRoutes) {
          const latency = getLatency(startNode.cost) + subRoute.latency;
          const memory = getMemory(startNode.op) + subRoute.memory;
          routes.push({
            path: [startNodeId, ...subRoute.path],
            latency,
            hops: subRoute.hops + 1,
            memory
          });
        }
      }
    }
  }

  visited.delete(startNodeId);
  return routes;
}

function computeL(route: Route, lambda: number, mu: number): number {
  return route.latency + lambda * route.hops + mu * route.memory;
}

function autopilotSelection(
  operonFile: string,
  k: number = 5,
  lambda: number = 0.2,
  mu: number = 0.001
): AutopilotResult {
  const data = parseOperonData(operonFile);
  const routes = findAllRoutes(data, data.root);

  // Compute L for each route
  const routeResults: RouteResult[] = routes.map(route => ({
    route: route.path,
    L: computeL(route, lambda, mu)
  }));

  // Sort by L value (ascending, lower is better)
  routeResults.sort((a, b) => a.L - b.L);

  // Get top K results
  const topK = routeResults.slice(0, k);

  return {
    bestRoute: topK.length > 0 ? topK[0]!.route : [],
    Lbest: topK.length > 0 ? topK[0]!.L : 0,
    topK
  };
}

function main() {
  program
    .name('autopilot')
    .description('Autopilot route selection for Pure Lambda operons')
    .argument('<operon-file>', 'Path to operon JSON file')
    .option('-k, --k <number>', 'Number of top routes to return', '5')
    .option('--lambda <number>', 'Lambda coefficient for hops', '0.2')
    .option('--mu <number>', 'Mu coefficient for memory', '0.001')
    .action((operonFile, options) => {
      try {
        const k = parseInt(options.k);
        const lambda = parseFloat(options.lambda);
        const mu = parseFloat(options.mu);

        const result = autopilotSelection(operonFile, k, lambda, mu);

        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });

  program.parse();
}

if (require.main === module) {
  main();
}

export { autopilotSelection };
export type { AutopilotResult };