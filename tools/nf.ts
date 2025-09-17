#!/usr/bin/env ts-node
// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors


import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

interface Node {
  cost: string;
  gid: string;
  iid: string;
  law: string;
  links: Record<string, any>;
  op: string;
  ports: Record<string, string>;
  receipt: any;
  xid: string;
  oids?: string[];
  root?: string;
}

interface Graph {
  nodes: Record<string, Node>;
  root: string;
}

interface Rule {
  id: string;
  name: string;
  description: string;
  pattern: any;
  replacement: any;
  constraints: {
    pure_only: boolean;
    law_compatible: boolean;
    breath_governor_check: string;
    [key: string]: any;
  };
  cost_delta: {
    hops: number;
    latency: number;
    memory: number;
  };
  composition?: {
    method: string;
    gid_update: string;
  };
}

interface RuleSet {
  version: string;
  description: string;
  rules: Rule[];
  constraints: {
    global: {
      breath_governor_expand_mode: boolean;
      kappa_threshold: number;
      purity_required: boolean;
      law_compatibility_required: boolean;
    };
    safety: {
      max_rewrites_per_pass: number;
      max_passes: number;
      preserve_semantics: boolean;
      preserve_types: boolean;
    };
  };
}

interface Patch {
  rule: string;
  nodes: string[];
  before: {
    node_ids: string[];
    structure: any;
  };
  after: {
    node_ids: string[];
    structure: any;
  };
  delta: {
    hops: number;
    latency: number;
    memory: number;
  };
  timestamp: string;
}

interface BreathState {
  kappa: number;
  expandMode: boolean;
}

class NFRewriter {
  private rules: Rule[];
  private constraints: RuleSet['constraints'];
  private breathState: BreathState;
  private patches: Patch[] = [];

  constructor(ruleset: RuleSet) {
    this.rules = ruleset.rules;
    this.constraints = ruleset.constraints;
    this.breathState = { kappa: 0, expandMode: false }; // Mock state
  }

  public rewrite(graph: Graph, mode: 'dry' | 'apply'): { graph: Graph; patches: Patch[] } {
    const workingGraph = JSON.parse(JSON.stringify(graph));
    this.patches = [];

    for (let pass = 0; pass < this.constraints.safety.max_passes; pass++) {
      let rewrites = 0;

      for (const rule of this.rules) {
        const ruleRewrites = this.applyRule(workingGraph, rule, mode);
        rewrites += ruleRewrites;

        if (rewrites >= this.constraints.safety.max_rewrites_per_pass) {
          break;
        }
      }

      if (rewrites === 0) {
        break; // No more rewrites possible
      }
    }

    return { graph: workingGraph, patches: this.patches };
  }

  private applyRule(graph: Graph, rule: Rule, mode: 'dry' | 'apply'): number {
    let rewrites = 0;
    const nodeIds = Object.keys(graph.nodes);

    for (const nodeId of nodeIds) {
      if (this.matchesPattern(graph, nodeId, rule)) {
        if (this.checkConstraints(graph, nodeId, rule)) {
          this.performRewrite(graph, nodeId, rule, mode);
          rewrites++;
        }
      }
    }

    return rewrites;
  }

  private matchesPattern(graph: Graph, nodeId: string, rule: Rule): boolean {
    const node = graph.nodes[nodeId];
    if (!node) return false;

    switch (rule.id) {
      case 'THEN_IDENTITY':
        return node.op === 'THEN' && this.hasIdentityLeft(graph, nodeId);

      case 'SPLIT_MERGE_IDENTITY':
        return node.op === 'SPLIT' && this.hasMatchingMerge(graph, nodeId);

      case 'FOCUS_COMPOSE':
        return node.op === 'FOCUS' && this.hasConsecutiveFocus(graph, nodeId);

      default:
        return false;
    }
  }

  private hasIdentityLeft(graph: Graph, nodeId: string): boolean {
    // Simplified check for identity on left side
    return true; // Mock implementation
  }

  private hasMatchingMerge(graph: Graph, nodeId: string): boolean {
    // Check if SPLIT is followed by MERGE with identical branches
    return true; // Mock implementation
  }

  private hasConsecutiveFocus(graph: Graph, nodeId: string): boolean {
    // Check if FOCUS is followed by another FOCUS
    return true; // Mock implementation
  }

  private checkConstraints(graph: Graph, nodeId: string, rule: Rule): boolean {
    const node = graph.nodes[nodeId];
    if (!node) return false;

    // Check if tiles are pure (no effects in ABI)
    if (rule.constraints.pure_only && !this.isPure(node)) {
      return false;
    }

    // Check law compatibility
    if (rule.constraints.law_compatible && !this.isLawCompatible(node)) {
      return false;
    }

    // Check Breath governor is NOT in expand mode (kappa≥0)
    if (rule.constraints.breath_governor_check === 'kappa >= 0' &&
        (this.breathState.expandMode || this.breathState.kappa < 0)) {
      return false;
    }

    return true;
  }

  private isPure(node: Node): boolean {
    // Check if node has no side effects
    return !node.ports.out || node.law === 'identity' || node.law === 'associative';
  }

  private isLawCompatible(node: Node): boolean {
    // Check if law is preserved under rewrite
    return ['identity', 'associative', 'commutative'].includes(node.law);
  }

  private performRewrite(graph: Graph, nodeId: string, rule: Rule, mode: 'dry' | 'apply'): void {
    const node = graph.nodes[nodeId];
    if (!node) return;

    const beforeNodes = [nodeId];
    const beforeStructure = JSON.parse(JSON.stringify(node));

    switch (rule.id) {
      case 'THEN_IDENTITY':
        this.applyThenIdentityRewrite(graph, nodeId, rule);
        break;

      case 'SPLIT_MERGE_IDENTITY':
        this.applySplitMergeRewrite(graph, nodeId, rule);
        break;

      case 'FOCUS_COMPOSE':
        this.applyFocusComposeRewrite(graph, nodeId, rule);
        break;
    }

    const afterNodes = [nodeId];
    const afterNode = graph.nodes[nodeId];
    const afterStructure = afterNode ? JSON.parse(JSON.stringify(afterNode)) : null;

    const patch: Patch = {
      rule: rule.id,
      nodes: [nodeId],
      before: {
        node_ids: beforeNodes,
        structure: beforeStructure
      },
      after: {
        node_ids: afterNodes,
        structure: afterStructure
      },
      delta: rule.cost_delta,
      timestamp: new Date().toISOString()
    };

    this.patches.push(patch);
  }

  private applyThenIdentityRewrite(graph: Graph, nodeId: string, rule: Rule): void {
    // THEN(id,f) → f: Remove identity from THEN operation
    const node = graph.nodes[nodeId];
    if (!node) return;
    node.op = 'IDENTITY_REMOVED';
    node.cost = this.updateCost(node.cost, rule.cost_delta);
  }

  private applySplitMergeRewrite(graph: Graph, nodeId: string, rule: Rule): void {
    // SPLIT▶MERGE(id,id) → id: Replace with identity
    const node = graph.nodes[nodeId];
    if (!node) return;
    node.op = 'IDENTITY';
    node.cost = this.updateCost(node.cost, rule.cost_delta);
  }

  private applyFocusComposeRewrite(graph: Graph, nodeId: string, rule: Rule): void {
    // FOCUS∘FOCUS → FOCUS': Compose two FOCUS operations
    const node = graph.nodes[nodeId];
    if (!node) return;
    node.op = 'FOCUS';
    // Generate new GID using PNF-LITE
    node.gid = this.generateNewGid(node.gid);
    node.cost = this.updateCost(node.cost, rule.cost_delta);
  }

  private updateCost(currentCost: string, delta: { hops: number; latency: number; memory: number }): string {
    // Simplified cost update
    return currentCost; // In real implementation, parse and update cost
  }

  private generateNewGid(oldGid: string): string {
    // Generate new GID via existing PNF-LITE approach
    return createHash('sha256').update(oldGid + Date.now()).digest('hex').substring(0, 64);
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: ts-node tools/nf.ts <input.json> --mode=<dry|apply> --out <output.json> --patch <patch.json>');
    console.log('');
    console.log('Options:');
    console.log('  --mode=dry|apply     Mode: dry-run (preview) or apply (modify)');
    console.log('  --out <file>        Output file path');
    console.log('  --patch <file>      Patch map output file');
    console.log('');
    console.log('Examples:');
    console.log('  ts-node tools/nf.ts dist/operon.json --mode=dry --out dist/operon.nf.json --patch dist/operon.nf.patch.json');
    console.log('  ts-node tools/nf.ts dist/operon.json --mode=apply --out dist/operon.nf.json --patch dist/operon.nf.patch.json');
    process.exit(0);
  }

  const inputFile = args[0];
  if (!inputFile) {
    console.error('Error: Input file is required');
    process.exit(1);
  }

  let mode: 'dry' | 'apply' = 'dry';
  let outFile = '';
  let patchFile = '';

  // Parse arguments
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg?.startsWith('--mode=')) {
      const modeValue = arg.split('=')[1];
      if (modeValue === 'dry' || modeValue === 'apply') {
        mode = modeValue;
      }
    } else if (arg === '--out' && i + 1 < args.length) {
      const nextArg = args[i + 1];
      if (nextArg) {
        outFile = nextArg;
        i++;
      }
    } else if (arg === '--patch' && i + 1 < args.length) {
      const nextArg = args[i + 1];
      if (nextArg) {
        patchFile = nextArg;
        i++;
      }
    }
  }

  if (!outFile || !patchFile) {
    console.error('Error: --out and --patch arguments are required');
    process.exit(1);
  }

  try {
    // Load ruleset
    const rulesetPath = path.join(__dirname, '..', 'rules', 'rules.nf.json');
    const rulesetContent = fs.readFileSync(rulesetPath, 'utf-8');
    const ruleset: RuleSet = JSON.parse(rulesetContent);

    // Load input graph
    const graphContent = fs.readFileSync(inputFile, 'utf-8');
    const graph: Graph = JSON.parse(graphContent);

    // Create rewriter
    const rewriter = new NFRewriter(ruleset);

    // Perform rewrite
    const { graph: resultGraph, patches } = rewriter.rewrite(graph, mode);

    // Check for constraint violations
    for (const patch of patches) {
      // In a real implementation, check if any rule violates constraints
    }

    // Write output
    fs.writeFileSync(outFile, JSON.stringify(resultGraph, null, 2));
    fs.writeFileSync(patchFile, JSON.stringify(patches, null, 2));

    if (mode === 'apply') {
      // Create backup of original
      const backupFile = inputFile.replace('.json', '.orig.json');
      fs.copyFileSync(inputFile, backupFile);

      // Overwrite original with result
      fs.writeFileSync(inputFile, JSON.stringify(resultGraph, null, 2));
    }

    console.log(`NF rewrite ${mode} completed successfully`);
    console.log(`Output written to: ${outFile}`);
    console.log(`Patch map written to: ${patchFile}`);
    console.log(`Applied ${patches.length} patches`);

    if (patches.length > 0) {
      const totalDelta = patches.reduce((sum, p) => ({
        hops: sum.hops + p.delta.hops,
        latency: sum.latency + p.delta.latency,
        memory: sum.memory + p.delta.memory
      }), { hops: 0, latency: 0, memory: 0 });

      console.log(`Total delta - hops: ${totalDelta.hops}, latency: ${totalDelta.latency}, memory: ${totalDelta.memory}`);
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}