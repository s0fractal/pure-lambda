/**
 * Bridge DR ↔ FF - Main interface
 * Two lenses, one truth
 */

import { FF } from './adapters/ff-lens';
import { DR } from './adapters/dr-lens';
import { agree, isBridgeOk } from './isomorphism';
import { BridgeOut, Agreement } from './types';

// Main bridge interface
export { FF, DR, agree, isBridgeOk };
export type { BridgeOut, Agreement };

/**
 * Test if two inputs produce equivalent results
 */
export async function bridgeEquivalent(
  ffInput: any, 
  drInput: any, 
  threshold: number = 0.9
): Promise<{ equivalent: boolean; agreement: Agreement }> {
  const [ffResult, drResult] = await Promise.all([
    FF(ffInput),
    DR(drInput)
  ]);
  
  const agreement = agree(ffResult, drResult);
  const equivalent = isBridgeOk(agreement, threshold);
  
  return { equivalent, agreement };
}

/**
 * Batch test multiple input pairs
 */
export async function batchBridgeTest(
  pairs: Array<{ ff: any; dr: any; name?: string }>,
  threshold: number = 0.9
): Promise<{
  passed: number;
  total: number;
  results: Array<{ name?: string; passed: boolean; score: number }>;
}> {
  const results = [];
  let passed = 0;
  
  for (const pair of pairs) {
    const { equivalent, agreement } = await bridgeEquivalent(pair.ff, pair.dr, threshold);
    
    if (equivalent) passed++;
    
    results.push({
      name: pair.name,
      passed: equivalent,
      score: agreement.score
    });
  }
  
  return { passed, total: pairs.length, results };
}

// Quick test function
export async function quickTest(): Promise<void> {
  console.log('🌉 Quick Bridge Test');
  
  const ffInput = {
    pipeline: [
      { type: 'filter', predicate: { op: '>', value: 0 } },
      { type: 'map', fn: { op: '*', value: 2 } }
    ]
  };
  
  const drInput = {
    description: 'Filter positive values, then double them'
  };
  
  const { equivalent, agreement } = await bridgeEquivalent(ffInput, drInput);
  
  console.log(`Equivalent: ${equivalent ? '✅' : '❌'}`);
  console.log(`Score: ${agreement.score.toFixed(3)}`);
  console.log(`IR Equal: ${agreement.ir_eq ? '✅' : '❌'}`);
  console.log(`Facts Jaccard: ${agreement.facts_j.toFixed(3)}`);
  console.log(`Souls Match: ${agreement.soul_eq ? '✅' : '❌'}`);
}

// Main exports
export * from './types';
export * from './canonicalizer';
export * from './isomorphism';
export * from './utils';