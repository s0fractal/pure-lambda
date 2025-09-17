/**
 * Bridge utilities for pretty printing and analysis
 */

import { LambdaIR, FactGraph, FactAtom } from './types';

/**
 * Pretty print λ-IR
 */
export function prettyPrintIR(ir: LambdaIR): string {
  switch (ir.type) {
    case 'var':
      return ir.value || '?';
    
    case 'lam':
      return `(λ${ir.param}. ${prettyPrintIR(ir.body!)})`;
    
    case 'app':
      return `(${prettyPrintIR(ir.fn!)} ${prettyPrintIR(ir.arg!)})`;
    
    case 'num':
      return ir.value?.toString() || '0';
    
    case 'bool':
      return ir.value ? 'TRUE' : 'FALSE';
    
    case 'list':
      return '[...]';
    
    default:
      return '?';
  }
}

/**
 * Pretty print facts
 */
export function prettyPrintFacts(fg: FactGraph): string[] {
  return fg.facts.map(fact => 
    `${fact.s} --${fact.p}--> ${fact.o} [${fact.prov.hash.substring(0, 8)}]`
  );
}

/**
 * Compare IR structures deeply
 */
export function deepCompareIR(ir1: LambdaIR, ir2: LambdaIR): {
  equal: boolean;
  differences: string[];
} {
  const differences: string[] = [];
  
  function compare(a: LambdaIR, b: LambdaIR, path: string): boolean {
    if (a.type !== b.type) {
      differences.push(`${path}: type ${a.type} !== ${b.type}`);
      return false;
    }
    
    switch (a.type) {
      case 'var':
      case 'num':
      case 'bool':
        if (a.value !== b.value) {
          differences.push(`${path}: value ${a.value} !== ${b.value}`);
          return false;
        }
        return true;
      
      case 'lam':
        if (a.param !== b.param) {
          differences.push(`${path}: param ${a.param} !== ${b.param}`);
          return false;
        }
        return compare(a.body!, b.body!, `${path}.body`);
      
      case 'app':
        const fnEq = compare(a.fn!, b.fn!, `${path}.fn`);
        const argEq = compare(a.arg!, b.arg!, `${path}.arg`);
        return fnEq && argEq;
      
      default:
        return true;
    }
  }
  
  const equal = compare(ir1, ir2, 'root');
  return { equal, differences };
}

/**
 * Analyze fact overlap
 */
export function analyzeFactOverlap(fg1: FactGraph, fg2: FactGraph): {
  shared: FactAtom[];
  only1: FactAtom[];
  only2: FactAtom[];
  jaccard: number;
} {
  const facts1 = new Set(fg1.facts.map(f => `${f.s}:${f.p}:${f.o}`));
  const facts2 = new Set(fg2.facts.map(f => `${f.s}:${f.p}:${f.o}`));
  
  const shared = fg1.facts.filter(f => facts2.has(`${f.s}:${f.p}:${f.o}`));
  const only1 = fg1.facts.filter(f => !facts2.has(`${f.s}:${f.p}:${f.o}`));
  const only2 = fg2.facts.filter(f => !facts1.has(`${f.s}:${f.p}:${f.o}`));
  
  const union = facts1.size + facts2.size - shared.length;
  const jaccard = union > 0 ? shared.length / union : 1.0;
  
  return { shared, only1, only2, jaccard };
}

/**
 * Generate minimal counterexample
 */
export function generateCounterexample(ir1: LambdaIR, ir2: LambdaIR, fg1: FactGraph, fg2: FactGraph): any {
  const irDiff = deepCompareIR(ir1, ir2);
  const factDiff = analyzeFactOverlap(fg1, fg2);
  
  return {
    ir_mismatch: irDiff.differences,
    facts_missing: factDiff.only2.slice(0, 3), // First 3
    facts_extra: factDiff.only1.slice(0, 3),
    jaccard_score: factDiff.jaccard,
    seed: Math.floor(Math.random() * 1000000)
  };
}

/**
 * Measure semantic distance
 */
export function semanticDistance(soul1: string, soul2: string): number {
  if (soul1 === soul2) return 0.0;
  
  // Hamming distance on soul strings
  let diff = 0;
  const len = Math.min(soul1.length, soul2.length);
  
  for (let i = 0; i < len; i++) {
    if (soul1[i] !== soul2[i]) diff++;
  }
  
  diff += Math.abs(soul1.length - soul2.length);
  
  return diff / Math.max(soul1.length, soul2.length);
}

/**
 * Bridge health metrics
 */
export function bridgeHealth(agreements: Array<{ score: number }>): {
  mean: number;
  std: number;
  min: number;
  max: number;
  health: 'excellent' | 'good' | 'poor' | 'critical';
} {
  const scores = agreements.map(a => a.score);
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
  const std = Math.sqrt(variance);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  
  let health: 'excellent' | 'good' | 'poor' | 'critical';
  if (mean >= 0.95) health = 'excellent';
  else if (mean >= 0.85) health = 'good';
  else if (mean >= 0.7) health = 'poor';
  else health = 'critical';
  
  return { mean, std, min, max, health };
}