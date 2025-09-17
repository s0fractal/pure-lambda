/**
 * Deep-Research Lens
 * Text/knowledge → λ-IR + facts
 */

import { BridgeOut, LambdaIR, FactGraph, FactAtom } from '../types';
import { canonicalize } from '../canonicalizer';

/**
 * DR emission - text/knowledge to canonical form
 */
export async function dr_emit(input: any): Promise<Partial<BridgeOut>> {
  const facts = extractKnowledgeFacts(input);
  const ir = knowledgeToIR(input, facts);
  
  return {
    ir,
    facts,
    protein: [] // Will be computed by canonicalizer
  };
}

/**
 * Extract facts from knowledge input
 */
function extractKnowledgeFacts(input: any): FactGraph {
  const facts: FactAtom[] = [];
  const entities = new Map();
  const relations = new Set<string>();
  
  // Handle text input
  if (typeof input === 'string') {
    return parseTextToFacts(input);
  }
  
  // Handle structured input
  if (input.description) {
    const textFacts = parseTextToFacts(input.description);
    facts.push(...textFacts.facts);
    for (const [id, info] of textFacts.entities) {
      entities.set(id, info);
    }
    for (const rel of textFacts.relations) {
      relations.add(rel);
    }
  }
  
  // Handle task specification
  if (input.task) {
    const taskFacts = extractTaskFacts(input.task);
    facts.push(...taskFacts.facts);
    for (const [id, info] of taskFacts.entities) {
      entities.set(id, info);
    }
    for (const rel of taskFacts.relations) {
      relations.add(rel);
    }
  }
  
  // Handle data source
  if (input.dataSource) {
    facts.push({
      s: 'task:main',
      p: 'usesData',
      o: input.dataSource,
      prov: {
        url: input.dataSource,
        hash: hashObject(input.dataSource),
        date: new Date().toISOString()
      }
    });
    
    relations.add('usesData');
  }
  
  return { facts, entities, relations };
}

/**
 * Parse natural language text to facts
 */
function parseTextToFacts(text: string): FactGraph {
  const facts: FactAtom[] = [];
  const entities = new Map();
  const relations = new Set<string>();
  
  // Simple pattern matching for task descriptions
  
  // "filter data where X > Y"
  const filterMatch = text.match(/filter\s+(\w+)\s+where\s+(\w+)\s*(>|<|=|>=|<=)\s*(\w+)/i);
  if (filterMatch) {
    const [, data, field, op, value] = filterMatch;
    
    facts.push({
      s: 'task:main',
      p: 'hasOperation',
      o: 'op:filter',
      prov: { hash: hashObject(text), date: new Date().toISOString() }
    });
    
    facts.push({
      s: 'op:filter',
      p: 'hasField',
      o: field,
      prov: { hash: hashObject(text), date: new Date().toISOString() }
    });
    
    facts.push({
      s: 'op:filter',
      p: 'hasOperator',
      o: op,
      prov: { hash: hashObject(text), date: new Date().toISOString() }
    });
    
    facts.push({
      s: 'op:filter',
      p: 'hasValue',
      o: value,
      prov: { hash: hashObject(text), date: new Date().toISOString() }
    });
    
    entities.set('op:filter', {
      id: 'op:filter',
      aliases: ['filter', 'filtering'],
      type: 'operation'
    });
    
    relations.add('hasOperation');
    relations.add('hasField');
    relations.add('hasOperator');
    relations.add('hasValue');
  }
  
  // "transform X by multiplying by Y"
  const transformMatch = text.match(/transform\s+(\w+)\s+by\s+(\w+)\s+by\s+(\w+)/i);
  if (transformMatch) {
    const [, field, operation, factor] = transformMatch;
    
    facts.push({
      s: 'task:main',
      p: 'hasOperation',
      o: 'op:transform',
      prov: { hash: hashObject(text), date: new Date().toISOString() }
    });
    
    facts.push({
      s: 'op:transform',
      p: 'hasType',
      o: operation,
      prov: { hash: hashObject(text), date: new Date().toISOString() }
    });
    
    facts.push({
      s: 'op:transform',
      p: 'hasFactor',
      o: factor,
      prov: { hash: hashObject(text), date: new Date().toISOString() }
    });
    
    entities.set('op:transform', {
      id: 'op:transform',
      aliases: ['map', 'transform', 'apply'],
      type: 'operation'
    });
    
    relations.add('hasType');
    relations.add('hasFactor');
  }
  
  // "sum all values" / "reduce to total"
  const reduceMatch = text.match(/(sum|reduce|total|aggregate|count)\s+(all\s+)?(\w+)/i);
  if (reduceMatch) {
    const [, operation, , field] = reduceMatch;
    
    facts.push({
      s: 'task:main',
      p: 'hasOperation',
      o: 'op:reduce',
      prov: { hash: hashObject(text), date: new Date().toISOString() }
    });
    
    facts.push({
      s: 'op:reduce',
      p: 'hasType',
      o: operation.toLowerCase(),
      prov: { hash: hashObject(text), date: new Date().toISOString() }
    });
    
    entities.set('op:reduce', {
      id: 'op:reduce',
      aliases: ['reduce', 'fold', 'aggregate', 'sum'],
      type: 'operation'
    });
    
    relations.add('hasOperation');
    relations.add('hasType');
  }
  
  // Extract multilingual variants
  const multilingual = extractMultilingualFacts(text);
  facts.push(...multilingual.facts);
  for (const [id, info] of multilingual.entities) {
    entities.set(id, info);
  }
  for (const rel of multilingual.relations) {
    relations.add(rel);
  }
  
  return { facts, entities, relations };
}

/**
 * Extract task-specific facts
 */
function extractTaskFacts(task: any): FactGraph {
  const facts: FactAtom[] = [];
  const entities = new Map();
  const relations = new Set<string>();
  
  if (task.steps) {
    for (let i = 0; i < task.steps.length; i++) {
      const step = task.steps[i];
      
      facts.push({
        s: 'task:main',
        p: 'hasStep',
        o: `step:${i}`,
        prov: { hash: hashObject(step), date: new Date().toISOString() }
      });
      
      facts.push({
        s: `step:${i}`,
        p: 'hasAction',
        o: step.action || step.type,
        prov: { hash: hashObject(step), date: new Date().toISOString() }
      });
      
      if (i > 0) {
        facts.push({
          s: `step:${i-1}`,
          p: 'precedes',
          o: `step:${i}`,
          prov: { hash: hashObject(task.steps), date: new Date().toISOString() }
        });
      }
      
      entities.set(`step:${i}`, {
        id: `step:${i}`,
        aliases: [step.name || `${step.action}_${i}`],
        type: 'step'
      });
    }
    
    relations.add('hasStep');
    relations.add('hasAction');
    relations.add('precedes');
  }
  
  return { facts, entities, relations };
}

/**
 * Extract multilingual facts
 */
function extractMultilingualFacts(text: string): FactGraph {
  const facts: FactAtom[] = [];
  const entities = new Map();
  const relations = new Set<string>();
  
  // Ukrainian patterns
  if (/фільтрувати|фільтр|відфільтрувати/i.test(text)) {
    facts.push({
      s: 'concept:filter',
      p: 'hasLabel',
      o: 'фільтрувати',
      prov: { hash: hashObject(text), date: new Date().toISOString() }
    });
    
    entities.set('concept:filter', {
      id: 'concept:filter',
      aliases: ['filter', 'фільтрувати', 'filtrer'],
      type: 'operation'
    });
    
    relations.add('hasLabel');
  }
  
  if (/перетворювати|трансформувати|змінити/i.test(text)) {
    facts.push({
      s: 'concept:transform',
      p: 'hasLabel',
      o: 'перетворювати',
      prov: { hash: hashObject(text), date: new Date().toISOString() }
    });
    
    entities.set('concept:transform', {
      id: 'concept:transform',
      aliases: ['transform', 'перетворювати', 'map'],
      type: 'operation'
    });
    
    relations.add('hasLabel');
  }
  
  if (/сумувати|підсумовувати|згорнути|редукувати/i.test(text)) {
    facts.push({
      s: 'concept:reduce',
      p: 'hasLabel',
      o: 'сумувати',
      prov: { hash: hashObject(text), date: new Date().toISOString() }
    });
    
    entities.set('concept:reduce', {
      id: 'concept:reduce',
      aliases: ['reduce', 'сумувати', 'fold', 'sum'],
      type: 'operation'
    });
    
    relations.add('hasLabel');
  }
  
  return { facts, entities, relations };
}

/**
 * Convert knowledge to λ-IR
 */
function knowledgeToIR(input: any, facts: FactGraph): LambdaIR {
  // Infer computational structure from facts
  const operations = [];
  
  // Find operations in sequence
  for (const fact of facts.facts) {
    if (fact.p === 'hasOperation' && fact.s === 'task:main') {
      operations.push(fact.o);
    }
  }
  
  // Build pipeline from operations
  if (operations.length === 0) {
    return { type: 'var', value: 'id' };
  }
  
  // Convert each operation to IR
  const irOps = operations.map(op => operationToIR(op, facts));
  
  // Compose operations
  let result = irOps[0];
  for (let i = 1; i < irOps.length; i++) {
    result = {
      type: 'app',
      fn: { type: 'var', value: 'compose' },
      arg: {
        type: 'app',
        fn: result,
        arg: irOps[i]
      }
    };
  }
  
  return result;
}

/**
 * Convert operation to IR
 */
function operationToIR(opId: string, facts: FactGraph): LambdaIR {
  const opFacts = facts.facts.filter(f => f.s === opId);
  
  if (opId.includes('filter')) {
    // Build filter predicate
    const field = opFacts.find(f => f.p === 'hasField')?.o || 'x';
    const operator = opFacts.find(f => f.p === 'hasOperator')?.o || '>';
    const value = opFacts.find(f => f.p === 'hasValue')?.o || '0';
    
    return {
      type: 'app',
      fn: { type: 'var', value: 'filter' },
      arg: {
        type: 'lam',
        param: 'x',
        body: {
          type: 'app',
          fn: {
            type: 'app',
            fn: { type: 'var', value: operator },
            arg: { 
              type: 'app',
              fn: { type: 'var', value: 'get' },
              arg: { type: 'var', value: field }
            }
          },
          arg: { type: 'num', value: parseInt(value) || 0 }
        }
      }
    };
  }
  
  if (opId.includes('transform')) {
    // Build map function
    const opType = opFacts.find(f => f.p === 'hasType')?.o || 'id';
    const factor = opFacts.find(f => f.p === 'hasFactor')?.o || '1';
    
    return {
      type: 'app',
      fn: { type: 'var', value: 'map' },
      arg: {
        type: 'lam',
        param: 'x',
        body: {
          type: 'app',
          fn: {
            type: 'app',
            fn: { type: 'var', value: opType === 'multiplying' ? '*' : opType },
            arg: { type: 'var', value: 'x' }
          },
          arg: { type: 'num', value: parseInt(factor) || 1 }
        }
      }
    };
  }
  
  if (opId.includes('reduce')) {
    // Build reduce function
    const opType = opFacts.find(f => f.p === 'hasType')?.o || 'sum';
    
    return {
      type: 'app',
      fn: {
        type: 'app',
        fn: { type: 'var', value: 'reduce' },
        arg: { type: 'var', value: opType === 'sum' ? '+' : opType }
      },
      arg: { type: 'num', value: 0 }
    };
  }
  
  return { type: 'var', value: opId };
}

// Helpers

function hashObject(obj: any): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256')
    .update(JSON.stringify(obj))
    .digest('hex');
}

// Export wrapped DR lens
export const DR = async (x: any): Promise<BridgeOut> => {
  const raw = await dr_emit(x);
  return canonicalize(raw);
};