/**
 * Fractal-Flow Lens
 * Code/process → λ-IR + facts
 */

import { BridgeOut, LambdaIR, FactGraph, FactAtom } from '../types';
import { canonicalize } from '../canonicalizer';

/**
 * FF emission - code to canonical form
 */
export async function ff_emit(input: any): Promise<Partial<BridgeOut>> {
  const ir = codeToIR(input);
  const facts = extractCodeFacts(input);
  
  return {
    ir,
    facts,
    protein: [] // Will be computed by canonicalizer
  };
}

/**
 * Convert code to λ-IR
 */
function codeToIR(code: any): LambdaIR {
  // Handle different input types
  if (typeof code === 'string') {
    return parseCodeString(code);
  }
  
  if (typeof code === 'object' && code.type) {
    // Already structured
    return code as LambdaIR;
  }
  
  // Pipeline example: filter → map → reduce
  if (code.pipeline) {
    return pipelineToIR(code.pipeline);
  }
  
  // Default
  return { type: 'var', value: 'unknown' };
}

/**
 * Parse code string to IR
 */
function parseCodeString(code: string): LambdaIR {
  // Simple parser for demo
  
  // Lambda: \x. body
  if (code.startsWith('\\') || code.startsWith('λ')) {
    const match = code.match(/^[\\λ](\w+)\.\s*(.+)$/);
    if (match) {
      return {
        type: 'lam',
        param: match[1],
        body: parseCodeString(match[2])
      };
    }
  }
  
  // Application: (f x)
  if (code.startsWith('(') && code.endsWith(')')) {
    const inner = code.slice(1, -1);
    const parts = splitApplication(inner);
    if (parts.length === 2) {
      return {
        type: 'app',
        fn: parseCodeString(parts[0]),
        arg: parseCodeString(parts[1])
      };
    }
  }
  
  // Number
  if (/^\d+$/.test(code)) {
    return { type: 'num', value: parseInt(code) };
  }
  
  // Boolean
  if (code === 'true' || code === 'false') {
    return { type: 'bool', value: code === 'true' };
  }
  
  // Variable
  return { type: 'var', value: code };
}

/**
 * Convert pipeline to IR
 */
function pipelineToIR(pipeline: any[]): LambdaIR {
  if (pipeline.length === 0) {
    return { type: 'var', value: 'id' };
  }
  
  // Build composition: f ∘ g ∘ h
  let result: LambdaIR = stageToIR(pipeline[0]);
  
  for (let i = 1; i < pipeline.length; i++) {
    const stage = stageToIR(pipeline[i]);
    result = {
      type: 'app',
      fn: { type: 'var', value: 'compose' },
      arg: {
        type: 'app',
        fn: result,
        arg: stage
      }
    };
  }
  
  return result;
}

/**
 * Convert pipeline stage to IR
 */
function stageToIR(stage: any): LambdaIR {
  switch (stage.type) {
    case 'filter':
      return {
        type: 'app',
        fn: { type: 'var', value: 'filter' },
        arg: predicateToIR(stage.predicate)
      };
    
    case 'map':
      return {
        type: 'app',
        fn: { type: 'var', value: 'map' },
        arg: functionToIR(stage.fn)
      };
    
    case 'reduce':
      return {
        type: 'app',
        fn: {
          type: 'app',
          fn: { type: 'var', value: 'reduce' },
          arg: functionToIR(stage.fn)
        },
        arg: { type: 'var', value: stage.initial || '0' }
      };
    
    default:
      return { type: 'var', value: stage.type || 'unknown' };
  }
}

/**
 * Convert predicate to IR
 */
function predicateToIR(pred: any): LambdaIR {
  if (typeof pred === 'string') {
    return { type: 'var', value: pred };
  }
  
  if (pred.op) {
    // Comparison: x > 5
    return {
      type: 'lam',
      param: 'x',
      body: {
        type: 'app',
        fn: {
          type: 'app',
          fn: { type: 'var', value: pred.op },
          arg: { type: 'var', value: 'x' }
        },
        arg: { type: 'num', value: pred.value || 0 }
      }
    };
  }
  
  return { type: 'var', value: 'true' };
}

/**
 * Convert function to IR
 */
function functionToIR(fn: any): LambdaIR {
  if (typeof fn === 'string') {
    return { type: 'var', value: fn };
  }
  
  if (fn.op) {
    // Binary op: x + 1
    return {
      type: 'lam',
      param: 'x',
      body: {
        type: 'app',
        fn: {
          type: 'app',
          fn: { type: 'var', value: fn.op },
          arg: { type: 'var', value: 'x' }
        },
        arg: { type: 'num', value: fn.value || 0 }
      }
    };
  }
  
  return { type: 'var', value: 'id' };
}

/**
 * Extract facts from code
 */
function extractCodeFacts(code: any): FactGraph {
  const facts: FactAtom[] = [];
  const entities = new Map();
  const relations = new Set<string>();
  
  // Extract pipeline facts
  if (code.pipeline) {
    for (let i = 0; i < code.pipeline.length; i++) {
      const stage = code.pipeline[i];
      
      facts.push({
        s: `pipeline:main`,
        p: 'hasStage',
        o: `stage:${i}`,
        prov: {
          hash: hashObject(stage),
          date: new Date().toISOString()
        }
      });
      
      facts.push({
        s: `stage:${i}`,
        p: 'hasType',
        o: stage.type,
        prov: {
          hash: hashObject(stage),
          date: new Date().toISOString()
        }
      });
      
      if (i > 0) {
        facts.push({
          s: `stage:${i-1}`,
          p: 'flowsTo',
          o: `stage:${i}`,
          prov: {
            hash: hashObject(code.pipeline),
            date: new Date().toISOString()
          }
        });
      }
      
      entities.set(`stage:${i}`, {
        id: `stage:${i}`,
        aliases: [stage.name || `${stage.type}_${i}`],
        type: 'operation'
      });
      
      relations.add('hasStage');
      relations.add('hasType');
      relations.add('flowsTo');
    }
  }
  
  // Extract source facts
  if (code.source) {
    facts.push({
      s: 'pipeline:main',
      p: 'hasSource',
      o: code.source,
      prov: {
        url: code.source,
        hash: hashObject(code.source),
        date: new Date().toISOString()
      }
    });
    
    relations.add('hasSource');
  }
  
  return { facts, entities, relations };
}

// Helpers

function splitApplication(str: string): string[] {
  // Split "f x" into ["f", "x"] handling nested parens
  let depth = 0;
  let lastSplit = 0;
  const parts: string[] = [];
  
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '(') depth++;
    if (str[i] === ')') depth--;
    if (str[i] === ' ' && depth === 0) {
      parts.push(str.slice(lastSplit, i));
      lastSplit = i + 1;
    }
  }
  
  if (lastSplit < str.length) {
    parts.push(str.slice(lastSplit));
  }
  
  return parts;
}

function hashObject(obj: any): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256')
    .update(JSON.stringify(obj))
    .digest('hex');
}

// Export wrapped FF lens
export const FF = async (x: any): Promise<BridgeOut> => {
  const raw = await ff_emit(x);
  return canonicalize(raw);
};