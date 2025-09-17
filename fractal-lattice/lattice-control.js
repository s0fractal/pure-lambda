#!/usr/bin/env node
/**
 * Lattice Control v1 - Deterministic Policy Compiler
 * Stable lattice (J=1.0) → Policy decisions → Gene activation
 */

const fs = require('fs');
const crypto = require('crypto');

// Load stable lattice and rules
let lattice;
try {
  lattice = JSON.parse(fs.readFileSync('fractal-lattice/lattice.json', 'utf-8'));
} catch (e) {
  // If lattice.json doesn't exist, create minimal structure
  lattice = {
    concepts: [],
    edges: []
  };
}
const rules = fs.existsSync('fractal-lattice/rules.md') ?
  fs.readFileSync('fractal-lattice/rules.md', 'utf-8') : '';

// Policy profiles from analysis
const PROFILES = {
  apex: {
    genes: { MEMO: true, PAR: true, SURGEON: false },
    constraints: ['type:pure_function', 'exec:success', 'proof:deterministic'],
    speedup: '3-5x'
  },
  proof: {
    genes: { MEMO: true, PAR: false, SURGEON: false },
    constraints: ['exec:success', 'oracle:no_fs', 'oracle:no_net'],
    speedup: '2-3x'
  },
  performance: {
    genes: { MEMO: false, PAR: true, SURGEON: false },
    constraints: ['exec:success', 'size:l_100mb_plus', 'type:graph_algo'],
    speedup: '1.5-2x'
  },
  universal: {
    genes: { MEMO: false, PAR: false, SURGEON: false },
    constraints: [],
    speedup: '1x (baseline)'
  }
};

// Implication rules extracted from FCA
const IMPLICATIONS = [
  { antecedent: ['exec:success', 'proof:deterministic'], consequent: ['oracle:no_fs', 'oracle:no_net'], confidence: 1.0 },
  { antecedent: ['type:pure_function', 'exec:success'], consequent: ['proof:memoization_safe'], confidence: 0.95 },
  { antecedent: ['oracle:fs'], consequent: ['exec:failure'], confidence: 0.85 },
  { antecedent: ['gene:MEMO', 'cache:high'], consequent: ['speed:fast'], confidence: 0.90 },
  { antecedent: ['size:l_100mb_plus'], consequent: ['speed:slow', 'speed:medium'], confidence: 0.80 }
];

/**
 * Core decision function: attributes → profile
 */
function decide(attributes) {
  const attrSet = new Set(attributes);

  // Gate #0: Check for side effects (NO_SIDE_EFFECTS ∧ FAST)
  const sideEffects = [];
  if (attrSet.has('oracle:fs')) sideEffects.push('side_effects:fs');
  if (attrSet.has('oracle:net')) sideEffects.push('side_effects:net');
  if (attrSet.has('oracle:env')) sideEffects.push('side_effects:env');

  if (sideEffects.length > 0) {
    return {
      profile: 'universal',
      confidence: 1.0,
      gate: 'G0',
      reason: 'Side effects detected - safety gate triggered',
      reasons: sideEffects,
      genes: PROFILES.universal.genes,
      matched_rules: ['gate_0']
    };
  }

  // Calculate match confidence for each profile (check specific profiles first)
  const matches = {};
  const profileOrder = ['apex', 'performance', 'proof']; // Check in priority order

  for (const name of profileOrder) {
    const profile = PROFILES[name];
    const matched = profile.constraints.filter(c => attrSet.has(c));
    const confidence = matched.length / profile.constraints.length;

    matches[name] = {
      confidence,
      matched,
      missing: profile.constraints.filter(c => !attrSet.has(c))
    };
  }

  // Find best match
  let bestProfile = 'universal';
  let bestConf = 0;
  let bestMatch = null;

  for (const [name, match] of Object.entries(matches)) {
    if (match.confidence > bestConf) {
      bestConf = match.confidence;
      bestProfile = name;
      bestMatch = match;
    }
  }

  // Apply thresholds
  if (bestConf >= 0.80) {
    return {
      profile: bestProfile,
      confidence: bestConf,
      matched_concept: findClosestConcept(attributes, lattice),
      matched_attrs: bestMatch.matched,
      missing_attrs: bestMatch.missing,
      genes: PROFILES[bestProfile].genes,
      used_rules: findApplicableRules(attributes)
    };
  } else if (bestConf >= 0.65) {
    // Between 0.65-0.79: Check for risky capabilities first
    const hasRiskyCapabilities = attributes.some(a =>
      a.startsWith('cap:time') || a.startsWith('cap:rand') || a.startsWith('cap:fs')
    );

    if (hasRiskyCapabilities) {
      // Force safer proof profile for risky capabilities
      return {
        profile: 'proof',
        confidence: bestConf,
        matched_concept: findClosestConcept(attributes, lattice),
        reason: 'Risky capabilities detected - using safe proof profile',
        genes: PROFILES.proof.genes,
        used_rules: findApplicableRules(attributes)
      };
    }

    // Otherwise choose branch with higher support
    const proofSupport = countSupport('proof', lattice);
    const perfSupport = countSupport('performance', lattice);

    const profile = proofSupport > perfSupport ? 'proof' : 'performance';
    return {
      profile,
      confidence: bestConf,
      matched_concept: findClosestConcept(attributes, lattice),
      reason: `Moderate confidence, chose ${profile} (support: ${Math.max(proofSupport, perfSupport)})`,
      genes: PROFILES[profile].genes,
      used_rules: findApplicableRules(attributes)
    };
  } else if (bestConf >= 0.50) {
    // Between 0.5-0.65: Default to safer 'proof' profile
    return {
      profile: 'proof',
      confidence: bestConf,
      matched_concept: findClosestConcept(attributes, lattice),
      reason: 'Moderate confidence - using safe proof profile',
      genes: PROFILES.proof.genes,
      used_rules: findApplicableRules(attributes)
    };
  } else {
    // Low confidence: fallback to universal
    return {
      profile: 'universal',
      confidence: bestConf,
      reason: 'Low confidence match - using conservative profile',
      genes: PROFILES.universal.genes,
      matched_rules: []
    };
  }
}

/**
 * Find closest concept in lattice
 */
function findClosestConcept(attributes, lattice) {
  let bestConcept = null;
  let bestOverlap = 0;

  lattice.concepts.forEach(concept => {
    const overlap = concept.intent.filter(a => attributes.includes(a)).length;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestConcept = concept.id;
    }
  });

  return bestConcept;
}

/**
 * Find applicable implication rules
 */
function findApplicableRules(attributes) {
  const attrSet = new Set(attributes);
  const applied = [];

  IMPLICATIONS.forEach((rule, idx) => {
    if (rule.antecedent.every(a => attrSet.has(a))) {
      applied.push(`r${idx}`);
    }
  });

  return applied;
}

/**
 * Count support for profile in lattice
 */
function countSupport(profile, lattice) {
  // Simplified: count concepts matching profile constraints
  const constraints = PROFILES[profile].constraints;
  let support = 0;

  lattice.concepts.forEach(concept => {
    if (constraints.every(c => concept.intent.includes(c))) {
      support += concept.extent.length;
    }
  });

  return support;
}

/**
 * OOD (Out-of-Distribution) sentinel
 */
function checkOOD(attributes, knownVocab) {
  const unknown = attributes.filter(a => !knownVocab.has(a));

  if (unknown.length > 0) {
    return {
      ood: true,
      reason: 'Unknown attributes detected',
      unknown_attrs: unknown
    };
  }

  // Check Hasse distance (simplified)
  const closest = findClosestConcept(attributes, lattice);
  if (!closest) {
    return {
      ood: true,
      reason: 'No matching concept in lattice'
    };
  }

  return { ood: false };
}

/**
 * Generate CID for immutable snapshot
 */
function generateCID(data) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(data));
  return 'Qm' + hash.digest('hex').substring(0, 44); // Mock CID format
}

/**
 * Create immutable snapshot
 */
function createSnapshot() {
  const snapshot = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    lattice: lattice,
    rules: IMPLICATIONS,
    profiles: PROFILES,
    stability: {
      jaccard: 1.0,
      edge_preservation: 1.0,
      fractal_dimension: 0.97
    }
  };

  const cid = generateCID(snapshot);

  // Save snapshot
  fs.writeFileSync(
    'fractal-lattice/LATTICE@v1.json',
    JSON.stringify({
      ...snapshot,
      cid: cid
    }, null, 2)
  );

  return cid;
}

/**
 * Runtime integration
 */
function processReceipt(receipt) {
  // Extract attributes from receipt
  const attributes = receipt.attributes || [];

  // Get decision
  const decision = decide(attributes);

  // Add lattice reference
  receipt.lattice_ref = {
    version: '1.0.0',
    cid: LATTICE_CID
  };

  // Add policy decision
  receipt.policy_decision = decision;

  // Log for monitoring
  console.log(`[LATTICE] Profile: ${decision.profile}, Confidence: ${decision.confidence.toFixed(2)}`);

  return receipt;
}

// Initialize
const LATTICE_CID = createSnapshot();
console.log(`✅ Lattice Control v1 initialized`);
console.log(`   CID: ${LATTICE_CID}`);
console.log(`   Profiles: apex, proof, performance, universal`);
console.log(`   Rules: ${IMPLICATIONS.length} implications`);
console.log(`   Gate #0: Side effects → universal`);

// Export for use
module.exports = {
  decide,
  processReceipt,
  checkOOD,
  PROFILES,
  IMPLICATIONS,
  LATTICE_CID
};

// Demo if run directly
if (require.main === module) {
  console.log('\n📊 Testing decision engine:\n');

  // Test cases
  const tests = [
    {
      name: 'Pure function success',
      attrs: ['type:pure_function', 'exec:success', 'proof:deterministic', 'oracle:no_fs', 'oracle:no_net']
    },
    {
      name: 'Has side effects',
      attrs: ['type:io_bounded', 'exec:success', 'oracle:fs']
    },
    {
      name: 'Large validation',
      attrs: ['type:validation', 'exec:success', 'size:l_100mb_plus', 'oracle:no_fs']
    }
  ];

  tests.forEach(test => {
    const decision = decide(test.attrs);
    console.log(`${test.name}:`);
    console.log(`  → Profile: ${decision.profile}`);
    console.log(`  → Confidence: ${decision.confidence.toFixed(2)}`);
    console.log(`  → Genes: MEMO=${decision.genes.MEMO}, PAR=${decision.genes.PAR}`);
    console.log();
  });

  console.log('🚀 Autopilot enabled!');
}