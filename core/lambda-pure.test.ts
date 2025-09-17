/**
 * Property tests for pure lambda core
 * Prove Church encoding laws hold
 */

import {
  TRUE, FALSE, NOT, AND, OR,
  ZERO, ONE, TWO, THREE, SUCC, PLUS, MULT, PRED,
  PAIR, FST, SND,
  NIL, CONS, HEAD, TAIL, IS_NIL,
  Y, IS_ZERO,
  toNumber, toBoolean, fromNumber
} from './lambda-pure';

// Test helpers
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
};

// Boolean laws
export function testBooleanLaws() {
  console.log('Testing Boolean laws...');
  
  // NOT NOT = identity
  assert(toBoolean(NOT(NOT(TRUE))) === true, 'NOT NOT TRUE = TRUE');
  assert(toBoolean(NOT(NOT(FALSE))) === false, 'NOT NOT FALSE = FALSE');
  
  // De Morgan's laws
  // NOT (A AND B) = (NOT A) OR (NOT B)
  const testDeMorgan = (a: any, b: any) => {
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

// Arithmetic laws
export function testArithmeticLaws() {
  console.log('Testing Arithmetic laws...');
  
  // SUCC properties
  assert(toNumber(SUCC(ZERO)) === 1, 'SUCC ZERO = ONE');
  assert(toNumber(SUCC(ONE)) === 2, 'SUCC ONE = TWO');
  assert(toNumber(SUCC(TWO)) === 3, 'SUCC TWO = THREE');
  
  // PLUS commutativity: a + b = b + a
  const testComm = (a: any, b: any) => {
    return toNumber(PLUS(a)(b)) === toNumber(PLUS(b)(a));
  };
  
  assert(testComm(ONE, TWO), 'PLUS commutativity 1');
  assert(testComm(ZERO, THREE), 'PLUS commutativity 2');
  
  // PLUS identity: a + 0 = a
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

// Pair laws
export function testPairLaws() {
  console.log('Testing Pair laws...');
  
  // FST (PAIR a b) = a
  const p1 = PAIR(ONE)(TWO);
  assert(toNumber(FST(p1) as any) === 1, 'FST (PAIR 1 2) = 1');
  assert(toNumber(SND(p1) as any) === 2, 'SND (PAIR 1 2) = 2');
  
  // Nested pairs
  const p2 = PAIR(TRUE)(PAIR(ONE)(FALSE));
  assert(toBoolean(FST(p2)) === true, 'FST nested');
  const innerPair = SND(p2);
  assert(toBoolean(SND(innerPair)) === false, 'SND SND nested');
  
  console.log('✓ Pair laws hold');
}

// List laws
export function testListLaws() {
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

// Y combinator (recursion)
export function testYCombinator() {
  console.log('Testing Y combinator...');
  
  // Factorial using Y
  const fact = Y<any, any>(
    (f) => (n) => 
      toBoolean(IS_ZERO(n)) 
        ? ONE 
        : MULT(n)(f(PRED(n)))
  );
  
  assert(toNumber(fact(ZERO)) === 1, 'factorial 0 = 1');
  assert(toNumber(fact(ONE)) === 1, 'factorial 1 = 1');
  assert(toNumber(fact(TWO)) === 2, 'factorial 2 = 2');
  assert(toNumber(fact(THREE)) === 6, 'factorial 3 = 6');
  
  // Fibonacci using Y
  const fib = Y<any, any>(
    (f) => (n) =>
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

// Beta equivalence
export function testBetaEquivalence() {
  console.log('Testing beta equivalence...');
  
  // (λx. x) y = y
  const id = <T>(x: T) => x;
  assert(id(5) === 5, '(λx. x) 5 = 5');
  
  // (λx. λy. x) a b = a
  const K = <T>(x: T) => (_: any) => x;
  assert(K(TRUE)(FALSE) === TRUE, 'K combinator');
  
  // (λx. λy. λz. x z (y z)) f g h = f h (g h)
  const S = <A, B, C>(x: (a: A) => (b: B) => C) => 
    (y: (a: A) => B) => 
      (z: A) => x(z)(y(z));
  
  // S K K = I
  const SKK = S(K)(K);
  assert(SKK(5) === 5, 'S K K = I');
  
  console.log('✓ Beta equivalence holds');
}

// Run all tests
export function runAllTests() {
  console.log('=== Pure Lambda Core Tests ===\n');
  
  try {
    testBooleanLaws();
    testArithmeticLaws();
    testPairLaws();
    testListLaws();
    testYCombinator();
    testBetaEquivalence();
    
    console.log('\n✅ All tests passed! Core is PURE.');
    return true;
  } catch (e) {
    console.error('\n❌ Test failed:', e);
    return false;
  }
}

// Run if executed directly
if (require.main === module) {
  process.exit(runAllTests() ? 0 : 1);
}