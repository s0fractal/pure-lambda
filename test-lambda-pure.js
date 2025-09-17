#!/usr/bin/env node

/**
 * Test suite for pure lambda core
 * Tests Church encoding laws
 */

// Helper for assertions
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Church Booleans
const TRUE = (a) => (_) => a;
const FALSE = (_) => (b) => b;
const NOT = (p) => (a) => (b) => p(b)(a);
const AND = (p) => (q) => (a) => (b) => p(q(a)(b))(b);
const OR = (p) => (q) => (a) => (b) => p(a)(q(a)(b));

// Church Numerals
const ZERO = (_s) => (z) => z;
const ONE = (s) => (z) => s(z);
const TWO = (s) => (z) => s(s(z));
const THREE = (s) => (z) => s(s(s(z)));

const SUCC = (n) => (s) => (z) => s(n(s)(z));
const PLUS = (m) => (n) => (s) => (z) => m(s)(n(s)(z));
const MULT = (m) => (n) => (s) => m(n(s));

// Predecessor
const PRED = (n) => {
  const PAIR = (a) => (b) => (f) => f(a)(b);
  const FST = (p) => p((a) => (_) => a);
  const SND = (p) => p((_) => (b) => b);
  
  const pred_pair = (p) => PAIR(SND(p))(SUCC(SND(p)));
  const init = PAIR(ZERO)(ZERO);
  
  return FST(n(pred_pair)(init));
};

// Church Pairs
const PAIR = (a) => (b) => (f) => f(a)(b);
const FST = (p) => p((a) => (_) => a);
const SND = (p) => p((_) => (b) => b);

// Church Lists (simplified encoding)
const NIL = PAIR(TRUE)(TRUE);
const CONS = (h) => (t) => PAIR(FALSE)(PAIR(h)(t));
const IS_NIL = (l) => FST(l);
const HEAD = (l) => FST(SND(l));
const TAIL = (l) => SND(SND(l));

// Y Combinator
const Y = (f) => ((x) => f((y) => x(x)(y)))((x) => f((y) => x(x)(y)));

// Helper to check if zero
const IS_ZERO = (n) => n((_) => FALSE)(TRUE);

// Conversion helpers
const toNumber = (n) => n((x) => x + 1)(0);
const toBoolean = (b) => b(true)(false);
const fromNumber = (n) => {
  let result = ZERO;
  for (let i = 0; i < n; i++) {
    result = SUCC(result);
  }
  return result;
};

// Test Boolean laws
function testBooleanLaws() {
  console.log('Testing Boolean laws...');
  
  // NOT NOT = identity
  assert(toBoolean(NOT(NOT(TRUE))) === true, 'NOT NOT TRUE = TRUE');
  assert(toBoolean(NOT(NOT(FALSE))) === false, 'NOT NOT FALSE = FALSE');
  
  // De Morgan's laws
  const testDeMorgan = (a, b) => {
    const left = NOT(AND(a)(b));
    const right = OR(NOT(a))(NOT(b));
    return toBoolean(left) === toBoolean(right);
  };
  
  assert(testDeMorgan(TRUE, TRUE), "De Morgan's law 1");
  assert(testDeMorgan(TRUE, FALSE), "De Morgan's law 2");
  assert(testDeMorgan(FALSE, TRUE), "De Morgan's law 3");
  assert(testDeMorgan(FALSE, FALSE), "De Morgan's law 4");
  
  console.log('✓ Boolean laws hold');
}

// Test Arithmetic laws
function testArithmeticLaws() {
  console.log('Testing Arithmetic laws...');
  
  // SUCC properties
  assert(toNumber(SUCC(ZERO)) === 1, 'SUCC ZERO = ONE');
  assert(toNumber(SUCC(ONE)) === 2, 'SUCC ONE = TWO');
  assert(toNumber(SUCC(TWO)) === 3, 'SUCC TWO = THREE');
  
  // PLUS commutativity
  const testComm = (a, b) => {
    return toNumber(PLUS(a)(b)) === toNumber(PLUS(b)(a));
  };
  
  assert(testComm(ONE, TWO), 'PLUS commutativity 1');
  assert(testComm(ZERO, THREE), 'PLUS commutativity 2');
  
  // PLUS identity
  assert(toNumber(PLUS(TWO)(ZERO)) === 2, 'PLUS identity');
  
  // MULT properties
  assert(toNumber(MULT(TWO)(THREE)) === 6, 'MULT 2 3 = 6');
  assert(toNumber(MULT(ONE)(THREE)) === 3, 'MULT identity');
  assert(toNumber(MULT(ZERO)(THREE)) === 0, 'MULT zero');
  
  // PRED properties
  assert(toNumber(PRED(ONE)) === 0, 'PRED ONE = ZERO');
  assert(toNumber(PRED(THREE)) === 2, 'PRED THREE = TWO');
  
  console.log('✓ Arithmetic laws hold');
}

// Test Pair laws
function testPairLaws() {
  console.log('Testing Pair laws...');
  
  // FST (PAIR a b) = a
  const p1 = PAIR(ONE)(TWO);
  assert(toNumber(FST(p1)) === 1, 'FST (PAIR 1 2) = 1');
  assert(toNumber(SND(p1)) === 2, 'SND (PAIR 1 2) = 2');
  
  // Nested pairs
  const p2 = PAIR(TRUE)(PAIR(ONE)(FALSE));
  assert(toBoolean(FST(p2)) === true, 'FST nested');
  const innerPair = SND(p2);
  assert(toBoolean(SND(innerPair)) === false, 'SND SND nested');
  
  console.log('✓ Pair laws hold');
}

// Test List laws
function testListLaws() {
  console.log('Testing List laws...');
  
  // IS_NIL NIL = TRUE
  assert(toBoolean(IS_NIL(NIL)) === true, 'IS_NIL NIL = TRUE');
  
  // IS_NIL (CONS x xs) = FALSE
  const list1 = CONS(ONE)(NIL);
  assert(toBoolean(IS_NIL(list1)) === false, 'IS_NIL (CONS x xs) = FALSE');
  
  // HEAD (CONS x xs) = x
  assert(toNumber(HEAD(list1)) === 1, 'HEAD (CONS 1 NIL) = 1');
  
  // TAIL (CONS x xs) = xs
  assert(toBoolean(IS_NIL(TAIL(list1))) === true, 'TAIL (CONS x NIL) = NIL');
  
  // Multi-element list
  const list2 = CONS(ONE)(CONS(TWO)(CONS(THREE)(NIL)));
  assert(toNumber(HEAD(list2)) === 1, 'HEAD of multi-list');
  assert(toNumber(HEAD(TAIL(list2))) === 2, 'HEAD TAIL of multi-list');
  assert(toNumber(HEAD(TAIL(TAIL(list2)))) === 3, 'HEAD TAIL TAIL of multi-list');
  
  console.log('✓ List laws hold');
}

// Test Y combinator
function testYCombinator() {
  console.log('Testing Y combinator...');
  
  // Factorial using Y
  const fact = Y((f) => (n) =>
    toBoolean(IS_ZERO(n))
      ? ONE
      : MULT(n)(f(PRED(n)))
  );
  
  assert(toNumber(fact(ZERO)) === 1, 'factorial 0 = 1');
  assert(toNumber(fact(ONE)) === 1, 'factorial 1 = 1');
  assert(toNumber(fact(TWO)) === 2, 'factorial 2 = 2');
  assert(toNumber(fact(THREE)) === 6, 'factorial 3 = 6');
  
  // Fibonacci using Y
  const fib = Y((f) => (n) =>
    toBoolean(IS_ZERO(n))
      ? ZERO
      : toBoolean(IS_ZERO(PRED(n)))
        ? ONE
        : PLUS(f(PRED(n)))(f(PRED(PRED(n))))
  );
  
  assert(toNumber(fib(ZERO)) === 0, 'fib 0 = 0');
  assert(toNumber(fib(ONE)) === 1, 'fib 1 = 1');
  assert(toNumber(fib(TWO)) === 1, 'fib 2 = 1');
  assert(toNumber(fib(THREE)) === 2, 'fib 3 = 2');
  assert(toNumber(fib(fromNumber(4))) === 3, 'fib 4 = 3');
  assert(toNumber(fib(fromNumber(5))) === 5, 'fib 5 = 5');
  
  console.log('✓ Y combinator works');
}

// Run all tests
function runAllTests() {
  console.log('=== Pure Lambda Core Tests ===\n');
  
  try {
    testBooleanLaws();
    testArithmeticLaws();
    testPairLaws();
    testListLaws();
    testYCombinator();
    
    console.log('\n✅ All tests passed! Core is PURE.');
    return true;
  } catch (e) {
    console.error('\n❌ Test failed:', e.message);
    return false;
  }
}

// Run tests
process.exit(runAllTests() ? 0 : 1);