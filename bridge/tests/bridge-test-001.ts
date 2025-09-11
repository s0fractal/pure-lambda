/**
 * Bridge Test 001 - The ultimate isomorphism test
 * Same task described in Ukrainian, English, and code
 * Must produce IDENTICAL souls and IR
 */

import { FF } from '../adapters/ff-lens';
import { DR } from '../adapters/dr-lens';
import { agree, isBridgeOk } from '../isomorphism';
import { prettyPrintIR, prettyPrintFacts } from '../utils';

/**
 * Test data: filter → map → reduce pipeline
 * Described in 3 ways that should be equivalent
 */

// 1. Code representation
const codeInput = {
  pipeline: [
    {
      type: 'filter',
      predicate: { op: '>', value: 2 }
    },
    {
      type: 'map',
      fn: { op: '*', value: 2 }
    },
    {
      type: 'reduce',
      fn: { op: '+' },
      initial: 0
    }
  ],
  source: 'data.json'
};

// 2. Ukrainian description
const ukrainianInput = {
  description: `
    Фільтрувати дані де значення більше 2,
    потім перетворювати кожен елемент помноженням на 2,
    нарешті сумувати всі результати.
  `,
  task: {
    steps: [
      { action: 'фільтрувати', condition: 'значення > 2' },
      { action: 'перетворювати', operation: 'множення', factor: '2' },
      { action: 'сумувати', type: 'всі результати' }
    ]
  },
  dataSource: 'data.json'
};

// 3. English description  
const englishInput = {
  description: `
    Filter data where value is greater than 2,
    then transform each element by multiplying by 2,
    finally sum all results.
  `,
  task: {
    steps: [
      { action: 'filter', condition: 'value > 2' },
      { action: 'transform', operation: 'multiplying', factor: '2' },
      { action: 'reduce', type: 'sum' }
    ]
  },
  dataSource: 'data.json'
};

/**
 * Run the isomorphism test
 */
export async function runBridgeTest001(): Promise<boolean> {
  console.log('🌉 Bridge Test 001 - Ultimate Isomorphism');
  console.log('=' .repeat(50));
  
  try {
    // Process all three inputs
    console.log('Processing inputs...');
    const [codeResult, ukResult, enResult] = await Promise.all([
      FF(codeInput),
      DR(ukrainianInput), 
      DR(englishInput)
    ]);
    
    console.log('\n📊 Results:');
    console.log('Code IR:    ', prettyPrintIR(codeResult.ir));
    console.log('UK IR:      ', prettyPrintIR(ukResult.ir));
    console.log('EN IR:      ', prettyPrintIR(enResult.ir));
    
    console.log('\n🔮 Souls:');
    console.log('Code:       ', codeResult.soul);
    console.log('Ukrainian:  ', ukResult.soul);
    console.log('English:    ', enResult.soul);
    
    console.log('\n📝 Soul Text:');
    console.log('Code:       ', codeResult.soulText);
    console.log('Ukrainian:  ', ukResult.soulText);  
    console.log('English:    ', enResult.soulText);
    
    // Check all pairwise agreements
    const agreements = [
      { pair: 'Code ↔ Ukrainian', agreement: agree(codeResult, ukResult) },
      { pair: 'Code ↔ English', agreement: agree(codeResult, enResult) },
      { pair: 'Ukrainian ↔ English', agreement: agree(ukResult, enResult) }
    ];
    
    console.log('\n🤝 Agreements:');
    let allPassed = true;
    
    for (const { pair, agreement } of agreements) {
      const passed = isBridgeOk(agreement, 0.9);
      allPassed = allPassed && passed;
      
      console.log(`${pair}:`);
      console.log(`  IR Equiv:     ${agreement.ir_eq ? '✅' : '❌'}`);
      console.log(`  Facts Jaccard: ${agreement.facts_j.toFixed(3)} ${agreement.facts_j >= 0.8 ? '✅' : '❌'}`);
      console.log(`  Provenance:   ${agreement.prov_ok ? '✅' : '❌'}`);
      console.log(`  Soul Match:   ${agreement.soul_eq ? '✅' : '❌'}`);
      console.log(`  Bridge Score: ${agreement.score.toFixed(3)} ${passed ? '✅' : '❌'}`);
      console.log('');
    }
    
    // Detailed fact analysis
    console.log('📋 Fact Analysis:');
    console.log('\nCode Facts:');
    prettyPrintFacts(codeResult.facts).forEach(f => console.log('  ', f));
    
    console.log('\nUkrainian Facts:');
    prettyPrintFacts(ukResult.facts).forEach(f => console.log('  ', f));
    
    console.log('\nEnglish Facts:');
    prettyPrintFacts(enResult.facts).forEach(f => console.log('  ', f));
    
    // Final verdict
    console.log('\n🏁 Final Verdict:');
    if (allPassed) {
      console.log('✅ BRIDGE TEST PASSED - All lenses see the SAME truth');
      console.log('🌟 Isomorphism confirmed: DR ↔ FF work identically');
      console.log('🗺️  Multilingual fact: Ukrainian ≡ English ≡ Code');
      return true;
    } else {
      console.log('❌ BRIDGE TEST FAILED - Lenses see different truths');
      
      // Show detailed differences
      for (const { pair, agreement } of agreements) {
        if (!isBridgeOk(agreement, 0.9)) {
          console.log(`\n🔍 ${pair} differences:`);
          // Would show detailed diff here
        }
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('💥 Bridge test crashed:', error);
    return false;
  }
}

/**
 * Property-based test - generate random equivalent descriptions
 */
export async function runPropertyTest(): Promise<boolean> {
  console.log('\n🎲 Property Test - Random Equivalents');
  
  const operations = ['filter', 'map', 'reduce', 'sort', 'group'];
  const conditions = ['> 0', '< 10', '= 5', '!= null'];
  const transformations = ['* 2', '+ 1', '/ 3', '** 2'];
  
  let passed = 0;
  let total = 10;
  
  for (let i = 0; i < total; i++) {
    // Generate random pipeline
    const pipeline = [];
    const numOps = Math.floor(Math.random() * 3) + 1;
    
    for (let j = 0; j < numOps; j++) {
      const op = operations[Math.floor(Math.random() * operations.length)];
      pipeline.push({
        type: op,
        predicate: op === 'filter' ? { op: '>', value: Math.floor(Math.random() * 10) } : undefined,
        fn: op === 'map' ? { op: '*', value: Math.floor(Math.random() * 5) + 1 } : undefined
      });
    }
    
    // Test code vs generated description
    const codeInput = { pipeline };
    const textInput = {
      description: generateDescription(pipeline),
      task: { steps: generateSteps(pipeline) }
    };
    
    const [codeResult, textResult] = await Promise.all([
      FF(codeInput),
      DR(textInput)
    ]);
    
    const agreement = agree(codeResult, textResult);
    if (isBridgeOk(agreement, 0.8)) {
      passed++;
      console.log(`  Test ${i + 1}: ✅ Score ${agreement.score.toFixed(3)}`);
    } else {
      console.log(`  Test ${i + 1}: ❌ Score ${agreement.score.toFixed(3)}`);
    }
  }
  
  console.log(`\n📊 Property Test Results: ${passed}/${total} passed`);
  return passed >= total * 0.8; // 80% threshold
}

// Helper functions

function generateDescription(pipeline: any[]): string {
  const descriptions = pipeline.map(stage => {
    switch (stage.type) {
      case 'filter':
        return `filter where value ${stage.predicate?.op || '>'} ${stage.predicate?.value || 0}`;
      case 'map':
        return `transform by ${stage.fn?.op === '*' ? 'multiplying' : 'adding'} ${stage.fn?.value || 1}`;
      case 'reduce':
        return 'sum all values';
      default:
        return stage.type;
    }
  });
  
  return descriptions.join(', then ') + '.';
}

function generateSteps(pipeline: any[]): any[] {
  return pipeline.map((stage, i) => ({
    action: stage.type,
    condition: stage.predicate ? `value ${stage.predicate.op} ${stage.predicate.value}` : undefined,
    operation: stage.fn?.op,
    factor: stage.fn?.value?.toString()
  }));
}

// Run tests if executed directly
if (require.main === module) {
  (async () => {
    const test1 = await runBridgeTest001();
    const test2 = await runPropertyTest();
    
    const overall = test1 && test2;
    console.log(`\n🏆 Overall Result: ${overall ? 'PASSED' : 'FAILED'}`);
    
    if (overall) {
      console.log('🌉 Bridge is SOLID - DR and FF see identical truth');
    } else {
      console.log('🔧 Bridge needs adjustment - lenses misaligned');
    }
    
    process.exit(overall ? 0 : 1);
  })();
}