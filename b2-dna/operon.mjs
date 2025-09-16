#!/usr/bin/env node
/**
 * B2-DNA: Operon Pattern
 *
 * DNA analogy:
 * - Promoter = FOCUS (gene expression control)
 * - Genes = SCAN sequence (functional units)
 * - Operator = conditional DELAY (regulation)
 * - Terminator = MERGE (end of transcription unit)
 */

import { createHash } from 'crypto';

// === B2 Core ===
const None = { type: 'none' };
const Some = value => ({ type: 'some', value });

// === Operon Constructor ===

/**
 * Build an operon - sequence of genes with regulation
 * Each gene can be turned on/off by promoter conditions
 */
function OPERON(promoter, genes, regulator = null) {
  // Build sequential gene chain with DELAYs for causality
  let chain = { op: 'ATOM', name: 'id' };

  genes.forEach((gene, idx) => {
    const geneBlock = {
      op: 'THEN',
      left: chain,
      right: {
        op: 'THEN',
        left: { op: 'SCAN', fn: gene.fn, name: gene.name },
        right: { op: 'DELAY' } // Causal delay between genes
      }
    };
    chain = geneBlock;
  });

  // Add promoter control at the start
  const regulated = {
    op: 'THEN',
    left: { op: 'FOCUS', fn: promoter }, // Promoter controls expression
    right: chain
  };

  // Add optional regulator (like lac repressor)
  if (regulator) {
    return {
      op: 'THEN',
      left: regulated,
      right: {
        op: 'THEN',
        left: { op: 'SCAN', fn: regulator },
        right: { op: 'MERGE' } // Terminator
      }
    };
  }

  return regulated;
}

/**
 * Compile operon to single gene (unary λ) with phash
 */
function compileOperon(operon, name = 'operon') {
  // Fold entire operon into single unary function
  const folded = input => {
    // This would be the actual execution logic
    // For demo, we'll just return a signature
    return {
      type: 'operon_output',
      name,
      input
    };
  };

  // Calculate phash for the operon structure
  const phash = createHash('sha256')
    .update('pl/b2-operon-v1')
    .update(JSON.stringify(operon))
    .digest('hex')
    .substring(0, 44);

  return {
    name,
    fn: folded,
    phash,
    structure: operon
  };
}

// === Example: Lac Operon (lactose metabolism) ===

// Promoter: activated by lactose presence
const lacPromoter = input => {
  if (input.lactose && input.lactose > 0.1) {
    return Some(input); // Express genes
  }
  return None; // No expression
};

// Gene Z: β-galactosidase (breaks down lactose)
const lacZ = (state, input) => {
  const enzyme = (state || 0) + 1;
  const lactose = input.lactose || 0;
  const glucose = lactose * 0.5 * enzyme; // Convert lactose to glucose

  return [
    enzyme, // New state
    Some({ ...input, glucose, enzyme, gene: 'lacZ' })
  ];
};

// Gene Y: permease (lactose transport)
const lacY = (state, input) => {
  const transporter = (state || 0) + 0.5;
  const uptake = Math.min(input.lactose || 0, transporter);

  return [
    transporter,
    Some({ ...input, uptake, transporter, gene: 'lacY' })
  ];
};

// Gene A: transacetylase (acetylates lactose metabolites)
const lacA = (state, input) => {
  const acetylase = (state || 0) + 0.3;
  const acetylation = (input.glucose || 0) * 0.1 * acetylase;

  return [
    acetylase,
    Some({ ...input, acetylation, acetylase, gene: 'lacA' })
  ];
};

// Regulator: CAP-cAMP (glucose effect)
const capRegulator = (state, input) => {
  // Low glucose → high cAMP → increased expression
  const glucose = input.glucose || 0;
  const cAMP = glucose < 0.5 ? 1.5 : 0.5;
  const boost = state ? state * cAMP : cAMP;

  return [
    boost,
    Some({ ...input, expression_boost: boost })
  ];
};

// === Run Operon Simulation ===

function simulateOperon() {
  console.log('🧬 B2-DNA: Operon Pattern\n');
  console.log('=' .repeat(50));

  // Build lac operon
  const lacOperon = OPERON(
    lacPromoter,
    [
      { name: 'lacZ', fn: lacZ },
      { name: 'lacY', fn: lacY },
      { name: 'lacA', fn: lacA }
    ],
    capRegulator
  );

  // Compile to single gene
  const compiled = compileOperon(lacOperon, 'lac_operon');

  console.log('\n📊 Lac Operon Structure:');
  console.log('```');
  console.log('PROMOTER → [lacZ]→DELAY→[lacY]→DELAY→[lacA]→DELAY→REGULATOR→MERGE');
  console.log('```');
  console.log(`\n🔑 Operon phash: ${compiled.phash}`);

  // Test conditions
  const conditions = [
    { t: 0, lactose: 0, glucose: 1 },    // No lactose, high glucose
    { t: 1, lactose: 0.5, glucose: 0.8 }, // Some lactose
    { t: 2, lactose: 1, glucose: 0.3 },   // High lactose, low glucose
    { t: 3, lactose: 0.8, glucose: 0.1 }, // Optimal conditions
    { t: 4, lactose: 0.2, glucose: 0.9 }  // Low lactose, high glucose
  ];

  console.log('\n🧪 Environmental Conditions:');
  conditions.forEach(c => {
    console.log(`  t=${c.t}: lactose=${c.lactose}, glucose=${c.glucose}`);
  });

  console.log('\n⚡ Operon Expression:');

  // Simulate execution
  const states = {
    lacZ: 0,
    lacY: 0,
    lacA: 0,
    regulator: 1
  };

  conditions.forEach(input => {
    // Check promoter
    const expressed = lacPromoter(input);

    if (expressed.type === 'some') {
      // Execute gene sequence with delays
      let current = expressed.value;

      // lacZ
      const [newZ, outZ] = lacZ(states.lacZ, current);
      states.lacZ = newZ;
      if (outZ.type === 'some') current = outZ.value;

      // DELAY (simulated)

      // lacY
      const [newY, outY] = lacY(states.lacY, current);
      states.lacY = newY;
      if (outY.type === 'some') current = outY.value;

      // DELAY

      // lacA
      const [newA, outA] = lacA(states.lacA, current);
      states.lacA = newA;
      if (outA.type === 'some') current = outA.value;

      // Regulator
      const [newReg, final] = capRegulator(states.regulator, current);
      states.regulator = newReg;

      console.log(`  t=${input.t}: EXPRESSED`);
      console.log(`    → Enzyme: ${states.lacZ.toFixed(2)}`);
      console.log(`    → Transporter: ${states.lacY.toFixed(2)}`);
      console.log(`    → Acetylase: ${states.lacA.toFixed(2)}`);
      console.log(`    → Boost: ${states.regulator.toFixed(2)}x`);
    } else {
      console.log(`  t=${input.t}: REPRESSED (no lactose)`);
    }
  });

  console.log('\n🔬 Properties:');
  console.log('  • Sequential genes with causal DELAY');
  console.log('  • Promoter controls expression (ON/OFF)');
  console.log('  • Each gene maintains state (SCAN)');
  console.log('  • Regulator modulates overall activity');
  console.log('  • Entire operon → single phash identity');

  return compiled;
}

// === Verification ===

function verifyOperon(operon) {
  const checks = {
    has_promoter: JSON.stringify(operon).includes('FOCUS'),
    has_genes: JSON.stringify(operon).includes('SCAN'),
    has_delays: JSON.stringify(operon).includes('DELAY'),
    is_sequential: JSON.stringify(operon).includes('THEN')
  };

  const causalityCheck = (JSON.stringify(operon).match(/DELAY/g) || []).length >= 2;

  console.log('\n✅ Operon Verification:');
  Object.entries(checks).forEach(([check, pass]) => {
    console.log(`  ${pass ? '✓' : '✗'} ${check}`);
  });
  console.log(`  ${causalityCheck ? '✓' : '✗'} multiple_delays_for_causality`);

  return Object.values(checks).every(v => v) && causalityCheck;
}

// === Main ===

if (import.meta.url === `file://${process.argv[1]}`) {
  const compiled = simulateOperon();
  const lacOperon = OPERON(
    lacPromoter,
    [
      { name: 'lacZ', fn: lacZ },
      { name: 'lacY', fn: lacY },
      { name: 'lacA', fn: lacA }
    ],
    capRegulator
  );

  const valid = verifyOperon(lacOperon);

  if (valid) {
    console.log('\n✨ Operon pattern verified!');
    console.log(`🧬 Compiled to single gene: ${compiled.phash}`);
  }
}

export { OPERON, compileOperon, simulateOperon };