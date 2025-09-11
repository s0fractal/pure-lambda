/**
 * Canonicalizer - Normalize to one truth
 * α/β/η normalization for λ-IR
 * Entity resolution for facts
 */

import { LambdaIR, FactGraph, FactAtom, BridgeOut } from './types';
import { createHash } from 'crypto';

/**
 * Canonicalize λ-IR
 */
export function canonicalizeIR(ir: LambdaIR): LambdaIR {
  // α-conversion: rename bound variables consistently
  const alphaConvert = (expr: LambdaIR, env: Map<string, string> = new Map()): LambdaIR => {
    switch (expr.type) {
      case 'var':
        return {
          ...expr,
          value: env.get(expr.value!) || expr.value
        };
      
      case 'lam':
        const newParam = `v${env.size}`;
        const newEnv = new Map(env);
        newEnv.set(expr.param!, newParam);
        return {
          type: 'lam',
          param: newParam,
          body: alphaConvert(expr.body!, newEnv),
          normalized: true
        };
      
      case 'app':
        return {
          type: 'app',
          fn: alphaConvert(expr.fn!, env),
          arg: alphaConvert(expr.arg!, env),
          normalized: true
        };
      
      default:
        return { ...expr, normalized: true };
    }
  };
  
  // β-reduction: apply functions
  const betaReduce = (expr: LambdaIR): LambdaIR => {
    switch (expr.type) {
      case 'app':
        const fn = betaReduce(expr.fn!);
        const arg = betaReduce(expr.arg!);
        
        if (fn.type === 'lam') {
          // Substitute arg for param in body
          return betaReduce(substitute(fn.body!, fn.param!, arg));
        }
        
        return { type: 'app', fn, arg, normalized: true };
      
      case 'lam':
        return {
          type: 'lam',
          param: expr.param,
          body: betaReduce(expr.body!),
          normalized: true
        };
      
      default:
        return expr;
    }
  };
  
  // η-reduction: λx. f x → f (if x not free in f)
  const etaReduce = (expr: LambdaIR): LambdaIR => {
    if (expr.type === 'lam' && expr.body?.type === 'app') {
      const app = expr.body;
      if (app.arg?.type === 'var' && 
          app.arg.value === expr.param &&
          !hasFreeVar(app.fn!, expr.param!)) {
        return app.fn!;
      }
    }
    
    if (expr.type === 'lam') {
      return {
        type: 'lam',
        param: expr.param,
        body: etaReduce(expr.body!),
        normalized: true
      };
    }
    
    if (expr.type === 'app') {
      return {
        type: 'app',
        fn: etaReduce(expr.fn!),
        arg: etaReduce(expr.arg!),
        normalized: true
      };
    }
    
    return expr;
  };
  
  // Apply all normalizations
  let result = alphaConvert(ir);
  result = betaReduce(result);
  result = etaReduce(result);
  
  return result;
}

/**
 * Canonicalize FactGraph
 */
export function canonicalizeFacts(facts: FactGraph): FactGraph {
  const canonical: FactGraph = {
    facts: [],
    entities: new Map(),
    relations: new Set()
  };
  
  // Entity resolution map
  const entityMap = new Map<string, string>();
  
  // Resolve entities (merge aliases)
  for (const [id, info] of facts.entities) {
    let canonicalId = id;
    
    // Check if any alias already has a canonical form
    for (const alias of info.aliases) {
      if (entityMap.has(alias)) {
        canonicalId = entityMap.get(alias)!;
        break;
      }
    }
    
    // Map all aliases to canonical ID
    entityMap.set(id, canonicalId);
    for (const alias of info.aliases) {
      entityMap.set(alias, canonicalId);
    }
    
    // Store canonical entity
    if (!canonical.entities.has(canonicalId)) {
      canonical.entities.set(canonicalId, {
        id: canonicalId,
        aliases: [id, ...info.aliases],
        type: info.type
      });
    } else {
      // Merge aliases
      const existing = canonical.entities.get(canonicalId)!;
      existing.aliases = [...new Set([...existing.aliases, id, ...info.aliases])];
    }
  }
  
  // Normalize facts
  for (const fact of facts.facts) {
    const canonicalFact: FactAtom = {
      s: resolveEntity(fact.s, entityMap),
      p: normalizeRelation(fact.p),
      o: resolveValue(fact.o, entityMap),
      prov: {
        ...fact.prov,
        hash: fact.prov.hash || hashContent(fact.prov.url || '')
      }
    };
    
    // Deduplicate
    if (!hasFactEquivalent(canonical.facts, canonicalFact)) {
      canonical.facts.push(canonicalFact);
      canonical.relations.add(canonicalFact.p);
    }
  }
  
  // Sort facts for deterministic hashing
  canonical.facts.sort((a, b) => {
    const keyA = `${a.s}:${a.p}:${a.o}`;
    const keyB = `${b.s}:${b.p}:${b.o}`;
    return keyA.localeCompare(keyB);
  });
  
  return canonical;
}

/**
 * Compute soul (hash) of canonical IR
 */
export function computeSoul(ir: LambdaIR): string {
  const canonical = canonicalizeIR(ir);
  const json = JSON.stringify(canonical, null, 0);
  return `λ-${hashContent(json).substring(0, 8)}`;
}

/**
 * Compute soul of fact graph
 */
export function computeSoulText(facts: FactGraph): string {
  const canonical = canonicalizeFacts(facts);
  const json = JSON.stringify(canonical.facts, null, 0);
  return `τ-${hashContent(json).substring(0, 8)}`;
}

/**
 * Full canonicalization
 */
export async function canonicalize(raw: Partial<BridgeOut>): Promise<BridgeOut> {
  const ir = raw.ir ? canonicalizeIR(raw.ir) : { type: 'var', value: 'nil' } as LambdaIR;
  const facts = raw.facts ? canonicalizeFacts(raw.facts) : { facts: [], entities: new Map(), relations: new Set() };
  
  return {
    ir,
    facts,
    soul: computeSoul(ir),
    soulText: computeSoulText(facts),
    protein: raw.protein || computeProtein(ir, facts)
  };
}

// Helper functions

function substitute(expr: LambdaIR, param: string, arg: LambdaIR): LambdaIR {
  switch (expr.type) {
    case 'var':
      return expr.value === param ? arg : expr;
    
    case 'lam':
      if (expr.param === param) {
        return expr; // Shadowing
      }
      return {
        type: 'lam',
        param: expr.param,
        body: substitute(expr.body!, param, arg)
      };
    
    case 'app':
      return {
        type: 'app',
        fn: substitute(expr.fn!, param, arg),
        arg: substitute(expr.arg!, param, arg)
      };
    
    default:
      return expr;
  }
}

function hasFreeVar(expr: LambdaIR, varName: string): boolean {
  switch (expr.type) {
    case 'var':
      return expr.value === varName;
    
    case 'lam':
      return expr.param !== varName && hasFreeVar(expr.body!, varName);
    
    case 'app':
      return hasFreeVar(expr.fn!, varName) || hasFreeVar(expr.arg!, varName);
    
    default:
      return false;
  }
}

function resolveEntity(id: string, entityMap: Map<string, string>): string {
  return entityMap.get(id) || id;
}

function normalizeRelation(rel: string): string {
  // Normalize relation names (has_property → hasProp, etc.)
  return rel.replace(/_/g, '').toLowerCase();
}

function resolveValue(value: string, entityMap: Map<string, string>): string {
  // Try to resolve as entity first
  if (entityMap.has(value)) {
    return entityMap.get(value)!;
  }
  
  // Normalize units
  if (value.match(/^\d+(\.\d+)?\s*(C|F|K)$/)) {
    // Temperature to Kelvin
    const match = value.match(/^(\d+(?:\.\d+)?)\s*(C|F|K)$/)!;
    const num = parseFloat(match[1]);
    const unit = match[2];
    
    let kelvin = num;
    if (unit === 'C') kelvin = num + 273.15;
    if (unit === 'F') kelvin = (num - 32) * 5/9 + 273.15;
    
    return `${kelvin.toFixed(2)}K`;
  }
  
  // Normalize currency (simplified)
  if (value.match(/^\d+(\.\d+)?\s*(USD|EUR|UAH)$/)) {
    const match = value.match(/^(\d+(?:\.\d+)?)\s*(\w+)$/)!;
    const num = parseFloat(match[1]);
    const currency = match[2];
    
    // Convert to USD (simplified rates)
    const rates: { [key: string]: number } = {
      USD: 1.0,
      EUR: 1.1,
      UAH: 0.027
    };
    
    const usd = num * (rates[currency] || 1);
    return `${usd.toFixed(2)}USD`;
  }
  
  return value;
}

function hasFactEquivalent(facts: FactAtom[], fact: FactAtom): boolean {
  return facts.some(f => 
    f.s === fact.s && 
    f.p === fact.p && 
    f.o === fact.o
  );
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function computeProtein(ir: LambdaIR, facts: FactGraph): number[] {
  // Simplified protein vector (would use proper embeddings)
  const vector = new Array(128).fill(0);
  
  // Hash IR structure
  const irHash = hashContent(JSON.stringify(ir));
  for (let i = 0; i < 64; i++) {
    vector[i] = parseInt(irHash[i], 16) / 16;
  }
  
  // Hash facts
  const factsHash = hashContent(JSON.stringify(facts.facts));
  for (let i = 0; i < 64; i++) {
    vector[64 + i] = parseInt(factsHash[i], 16) / 16;
  }
  
  return vector;
}