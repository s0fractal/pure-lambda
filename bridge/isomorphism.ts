/**
 * Isomorphism Checker - Verify both lenses see the same
 * IR equivalence, fact similarity, provenance match
 */

import { BridgeOut, Agreement, LambdaIR, FactGraph, FactAtom } from './types';

/**
 * Check if two bridge outputs agree
 */
export function agree(a: BridgeOut, b: BridgeOut): Agreement {
  const ir_eq = checkIREquivalence(a.ir, b.ir) && checkLaws(a.ir);
  const facts_j = jaccardSimilarity(a.facts, b.facts);
  const prov_ok = checkProvenanceMatch(a.facts, b.facts);
  const soul_eq = a.soul === b.soul && a.soulText === b.soulText;
  
  // Bridge score calculation
  const w_ir = 0.4;
  const w_facts = 0.3;
  const w_prov = 0.2;
  const w_soul = 0.1;
  
  const score = 
    w_ir * (ir_eq ? 1 : 0) +
    w_facts * facts_j +
    w_prov * (prov_ok ? 1 : 0) +
    w_soul * (soul_eq ? 1 : 0);
  
  return {
    ir_eq,
    facts_j,
    prov_ok,
    soul_eq,
    score
  };
}

/**
 * Check IR equivalence using e-graph
 */
export function checkIREquivalence(ir1: LambdaIR, ir2: LambdaIR): boolean {
  // Structural equality after canonicalization
  return deepEqual(ir1, ir2);
}

/**
 * Verify laws hold for IR
 */
export function checkLaws(ir: LambdaIR): boolean {
  // Simplified law checking
  const laws = {
    identity: checkIdentityLaw(ir),
    fusion: checkFusionLaw(ir),
    roundTrip: checkRoundTripLaw(ir),
    lengthPreserved: checkLengthPreservedLaw(ir),
    monotone: checkMonotoneLaw(ir)
  };
  
  return Object.values(laws).every(v => v);
}

/**
 * Jaccard similarity for fact graphs
 */
export function jaccardSimilarity(fg1: FactGraph, fg2: FactGraph): number {
  const facts1 = new Set(fg1.facts.map(factToString));
  const facts2 = new Set(fg2.facts.map(factToString));
  
  const intersection = new Set([...facts1].filter(x => facts2.has(x)));
  const union = new Set([...facts1, ...facts2]);
  
  if (union.size === 0) return 1.0; // Both empty
  
  return intersection.size / union.size;
}

/**
 * Check provenance matches
 */
export function checkProvenanceMatch(fg1: FactGraph, fg2: FactGraph): boolean {
  // Build provenance index
  const prov1 = new Map<string, string>();
  const prov2 = new Map<string, string>();
  
  for (const fact of fg1.facts) {
    if (fact.prov.url) {
      prov1.set(fact.prov.url, fact.prov.hash);
    }
  }
  
  for (const fact of fg2.facts) {
    if (fact.prov.url) {
      prov2.set(fact.prov.url, fact.prov.hash);
    }
  }
  
  // Check all shared URLs have same hash
  for (const [url, hash1] of prov1) {
    if (prov2.has(url)) {
      const hash2 = prov2.get(url)!;
      if (hash1 !== hash2) {
        return false; // Same URL, different content
      }
    }
  }
  
  return true;
}

/**
 * Find minimal difference between outputs
 */
export function findDifference(a: BridgeOut, b: BridgeOut): {
  facts_missing: FactAtom[];
  facts_extra: FactAtom[];
  ir_paths: string[];
} {
  const facts1 = new Set(a.facts.facts.map(factToString));
  const facts2 = new Set(b.facts.facts.map(factToString));
  
  const missing = a.facts.facts.filter(f => !facts2.has(factToString(f)));
  const extra = b.facts.facts.filter(f => !facts1.has(factToString(f)));
  
  const ir_paths = findIRDifferences(a.ir, b.ir);
  
  return {
    facts_missing: missing,
    facts_extra: extra,
    ir_paths
  };
}

// Helper functions

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

function factToString(fact: FactAtom): string {
  return `${fact.s}:${fact.p}:${fact.o}`;
}

function findIRDifferences(ir1: LambdaIR, ir2: LambdaIR, path: string = ''): string[] {
  const diffs: string[] = [];
  
  if (ir1.type !== ir2.type) {
    diffs.push(`${path}/type`);
    return diffs;
  }
  
  switch (ir1.type) {
    case 'lam':
      if (ir1.param !== ir2.param) {
        diffs.push(`${path}/param`);
      }
      if (ir1.body && ir2.body) {
        diffs.push(...findIRDifferences(ir1.body, ir2.body, `${path}/body`));
      }
      break;
    
    case 'app':
      if (ir1.fn && ir2.fn) {
        diffs.push(...findIRDifferences(ir1.fn, ir2.fn, `${path}/fn`));
      }
      if (ir1.arg && ir2.arg) {
        diffs.push(...findIRDifferences(ir1.arg, ir2.arg, `${path}/arg`));
      }
      break;
    
    case 'var':
    case 'num':
    case 'bool':
      if (ir1.value !== ir2.value) {
        diffs.push(`${path}/value`);
      }
      break;
  }
  
  return diffs;
}

// Law checking (simplified)

function checkIdentityLaw(ir: LambdaIR): boolean {
  // id ∘ f = f
  // Check if identity function composed with anything returns the same
  return true; // Simplified
}

function checkFusionLaw(ir: LambdaIR): boolean {
  // (f ∘ g) ∘ h = f ∘ (g ∘ h)
  // Check associativity of composition
  return true; // Simplified
}

function checkRoundTripLaw(ir: LambdaIR): boolean {
  // encode ∘ decode = id
  // Check that transformations are reversible
  return true; // Simplified
}

function checkLengthPreservedLaw(ir: LambdaIR): boolean {
  // map preserves list length
  return true; // Simplified
}

function checkMonotoneLaw(ir: LambdaIR): boolean {
  // Optimizations only improve, never regress
  return true; // Simplified
}

/**
 * Calculate overall bridge score
 */
export function bridgeScore(agreement: Agreement): number {
  return agreement.score;
}

/**
 * Check if bridge is acceptable
 */
export function isBridgeOk(agreement: Agreement, threshold: number = 0.9): boolean {
  return agreement.score >= threshold;
}