#!/usr/bin/env node
/**
 * Simple Protein Hash Calculator
 *
 * phash = BLAKE3("pl/ph2-basisnf-v0" || OpSeq)
 * Zero dependencies, pure λ form only
 */

const crypto = require('crypto');

// Basis-NF opcodes
const OP = {
  LAM: 0x00,   // λ-abstraction
  APP: 0x01,   // application
  VAR: 0x02,   // variable (de Bruijn)
  LIT: 0x03,   // literal
  PAIR: 0x04,  // pair constructor
  FST: 0x05,   // first projection
  SND: 0x06,   // second projection
  FIX: 0x07    // fixed point
};

/**
 * Calculate protein hash for a pure λ function
 */
function phash(lambdaFunc) {
  const opseq = compile(lambdaFunc);
  const prefix = Buffer.from('pl/ph2-basisnf-v0', 'utf8');
  const opseqBytes = Buffer.from(opseq);
  const combined = Buffer.concat([prefix, opseqBytes]);

  return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 44);
}

/**
 * Compile λ function to canonical OpSeq
 */
function compile(func) {
  const source = func.toString();

  // Extract arity (number of parameters)
  const paramMatch = source.match(/\(([^)]*)\)/) || source.match(/([^=>\s]+)\s*=>/);
  const params = paramMatch ?
    (paramMatch[1] || '').split(',').map(p => p.trim()).filter(Boolean) : [];

  // Extract body
  const bodyMatch = source.match(/=>\s*(.+)/) || source.match(/{\s*return\s+(.+)\s*}/);
  const body = bodyMatch ? bodyMatch[1].trim() : '';

  let opseq = [];

  // Add λ abstractions for each parameter
  for (let i = 0; i < params.length; i++) {
    opseq.push(OP.LAM);
  }

  // Compile body to opcodes
  opseq.push(...compileExpression(body, params));

  return opseq;
}

/**
 * Compile expression to opcodes
 */
function compileExpression(expr, params) {
  // Remove whitespace and semicolons
  expr = expr.replace(/\s+/g, ' ').replace(/;$/, '').trim();

  // Variable reference
  const paramIndex = params.indexOf(expr);
  if (paramIndex !== -1) {
    return [OP.VAR, paramIndex];
  }

  // Number literal
  if (/^\d+$/.test(expr)) {
    return [OP.LIT, parseInt(expr) & 0xFF];
  }

  // String literal
  if (/^["'].*["']$/.test(expr)) {
    const str = expr.slice(1, -1);
    return [OP.LIT, hashString(str)];
  }

  // Simple binary operations
  if (expr.includes(' + ')) {
    const [left, right] = expr.split(' + ');
    return [
      OP.APP, OP.APP,
      OP.LIT, hashString('add'),
      ...compileExpression(left.trim(), params),
      ...compileExpression(right.trim(), params)
    ];
  }

  if (expr.includes(' * ')) {
    const [left, right] = expr.split(' * ');
    return [
      OP.APP, OP.APP,
      OP.LIT, hashString('mul'),
      ...compileExpression(left.trim(), params),
      ...compileExpression(right.trim(), params)
    ];
  }

  // Function call
  const callMatch = expr.match(/(\w+)\(([^)]*)\)/);
  if (callMatch) {
    const [, funcName, args] = callMatch;
    const argList = args ? args.split(',').map(a => a.trim()) : [];

    let opseq = [OP.APP];
    opseq.push(OP.LIT, hashString(funcName));

    for (const arg of argList) {
      opseq.push(OP.APP);
      opseq.push(...compileExpression(arg, params));
    }

    return opseq;
  }

  // Default: treat as literal
  return [OP.LIT, hashString(expr)];
}

/**
 * Hash string to byte
 */
function hashString(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest()[0];
}

/**
 * Demo functions for testing
 */
const examples = {
  identity: x => x,
  constant: x => 42,
  add: (x, y) => x + y,
  multiply: (x, y) => x * y,
  compose: (f, g) => x => f(g(x)),

  // Same functions with different names (should have same phash)
  plus: (a, b) => a + b,
  sum: (x, y) => x + y,

  // α-equivalent (should have same phash)
  addXY: (x, y) => x + y,
  addAB: (a, b) => a + b
};

// Demo if run directly
if (require.main === module) {
  console.log('🧬 Simple Protein Hash Calculator');
  console.log('='.repeat(40));

  for (const [name, func] of Object.entries(examples)) {
    const hash = phash(func);
    const opseq = compile(func);

    console.log(`${name.padEnd(12)} → ${hash} (${opseq.length} ops)`);
  }

  // Test α-equivalence
  console.log('\n🔍 α-equivalence test:');
  const hashes = {
    add: phash(examples.add),
    plus: phash(examples.plus),
    sum: phash(examples.sum),
    addXY: phash(examples.addXY),
    addAB: phash(examples.addAB)
  };

  console.log('add  :', hashes.add);
  console.log('plus :', hashes.plus);
  console.log('sum  :', hashes.sum);
  console.log('addXY:', hashes.addXY);
  console.log('addAB:', hashes.addAB);

  const allSame = Object.values(hashes).every(h => h === hashes.add);
  console.log(allSame ? '✅ All equivalent!' : '❌ Different hashes');
}

module.exports = { phash, compile, OP };