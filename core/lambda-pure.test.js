"use strict";
/**
 * Property tests for pure lambda core
 * Prove Church encoding laws hold
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testBooleanLaws = testBooleanLaws;
exports.testArithmeticLaws = testArithmeticLaws;
exports.testPairLaws = testPairLaws;
exports.testListLaws = testListLaws;
exports.testYCombinator = testYCombinator;
exports.testBetaEquivalence = testBetaEquivalence;
exports.runAllTests = runAllTests;
const lambda_pure_1 = require("./lambda-pure");
// Test helpers
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
};
// Boolean laws
function testBooleanLaws() {
    console.log('Testing Boolean laws...');
    // NOT NOT = identity
    assert((0, lambda_pure_1.toBoolean)((0, lambda_pure_1.NOT)((0, lambda_pure_1.NOT)(lambda_pure_1.TRUE))) === true, 'NOT NOT TRUE = TRUE');
    assert((0, lambda_pure_1.toBoolean)((0, lambda_pure_1.NOT)((0, lambda_pure_1.NOT)(lambda_pure_1.FALSE))) === false, 'NOT NOT FALSE = FALSE');
    // De Morgan's laws
    // NOT (A AND B) = (NOT A) OR (NOT B)
    const testDeMorgan = (a, b) => {
        const left = (0, lambda_pure_1.NOT)((0, lambda_pure_1.AND)(a)(b));
        const right = (0, lambda_pure_1.OR)((0, lambda_pure_1.NOT)(a))((0, lambda_pure_1.NOT)(b));
        return (0, lambda_pure_1.toBoolean)(left) === (0, lambda_pure_1.toBoolean)(right);
    };
    assert(testDeMorgan(lambda_pure_1.TRUE, lambda_pure_1.TRUE), "De Morgan's law 1");
    assert(testDeMorgan(lambda_pure_1.TRUE, lambda_pure_1.FALSE), "De Morgan's law 2");
    assert(testDeMorgan(lambda_pure_1.FALSE, lambda_pure_1.TRUE), "De Morgan's law 3");
    assert(testDeMorgan(lambda_pure_1.FALSE, lambda_pure_1.FALSE), "De Morgan's law 4");
    console.log('✓ Boolean laws hold');
}
// Arithmetic laws
function testArithmeticLaws() {
    console.log('Testing Arithmetic laws...');
    // SUCC properties
    assert((0, lambda_pure_1.toNumber)((0, lambda_pure_1.SUCC)(lambda_pure_1.ZERO)) === 1, 'SUCC ZERO = ONE');
    assert((0, lambda_pure_1.toNumber)((0, lambda_pure_1.SUCC)(lambda_pure_1.ONE)) === 2, 'SUCC ONE = TWO');
    assert((0, lambda_pure_1.toNumber)((0, lambda_pure_1.SUCC)(lambda_pure_1.TWO)) === 3, 'SUCC TWO = THREE');
    // PLUS commutativity: a + b = b + a
    const testComm = (a, b) => {
        return (0, lambda_pure_1.toNumber)((0, lambda_pure_1.PLUS)(a)(b)) === (0, lambda_pure_1.toNumber)((0, lambda_pure_1.PLUS)(b)(a));
    };
    assert(testComm(lambda_pure_1.ONE, lambda_pure_1.TWO), 'PLUS commutativity 1');
    assert(testComm(lambda_pure_1.ZERO, lambda_pure_1.THREE), 'PLUS commutativity 2');
    // PLUS identity: a + 0 = a
    assert((0, lambda_pure_1.toNumber)((0, lambda_pure_1.PLUS)(lambda_pure_1.TWO)(lambda_pure_1.ZERO)) === 2, 'PLUS identity');
    // MULT properties
    assert((0, lambda_pure_1.toNumber)((0, lambda_pure_1.MULT)(lambda_pure_1.TWO)(lambda_pure_1.THREE)) === 6, 'MULT 2 3 = 6');
    assert((0, lambda_pure_1.toNumber)((0, lambda_pure_1.MULT)(lambda_pure_1.ONE)(lambda_pure_1.THREE)) === 3, 'MULT identity');
    assert((0, lambda_pure_1.toNumber)((0, lambda_pure_1.MULT)(lambda_pure_1.ZERO)(lambda_pure_1.THREE)) === 0, 'MULT zero');
    // PRED properties
    assert((0, lambda_pure_1.toNumber)((0, lambda_pure_1.PRED)(lambda_pure_1.ONE)) === 0, 'PRED ONE = ZERO');
    assert((0, lambda_pure_1.toNumber)((0, lambda_pure_1.PRED)(lambda_pure_1.THREE)) === 2, 'PRED THREE = TWO');
    console.log('✓ Arithmetic laws hold');
}
// Pair laws
function testPairLaws() {
    console.log('Testing Pair laws...');
    // FST (PAIR a b) = a
    const p1 = (0, lambda_pure_1.PAIR)(lambda_pure_1.ONE)(lambda_pure_1.TWO);
    assert((0, lambda_pure_1.toNumber)((0, lambda_pure_1.FST)(p1)) === 1, 'FST (PAIR 1 2) = 1');
    assert((0, lambda_pure_1.toNumber)((0, lambda_pure_1.SND)(p1)) === 2, 'SND (PAIR 1 2) = 2');
    // Nested pairs
    const p2 = (0, lambda_pure_1.PAIR)(lambda_pure_1.TRUE)((0, lambda_pure_1.PAIR)(lambda_pure_1.ONE)(lambda_pure_1.FALSE));
    assert((0, lambda_pure_1.toBoolean)((0, lambda_pure_1.FST)(p2)) === true, 'FST nested');
    const innerPair = (0, lambda_pure_1.SND)(p2);
    assert((0, lambda_pure_1.toBoolean)((0, lambda_pure_1.SND)(innerPair)) === false, 'SND SND nested');
    console.log('✓ Pair laws hold');
}
// List laws
function testListLaws() {
    console.log('Testing List laws...');
    // IS_NIL NIL = TRUE
    assert((0, lambda_pure_1.toBoolean)((0, lambda_pure_1.IS_NIL)(lambda_pure_1.NIL)) === true, 'IS_NIL NIL = TRUE');
    // IS_NIL (CONS x xs) = FALSE
    const list1 = (0, lambda_pure_1.CONS)(lambda_pure_1.ONE)(lambda_pure_1.NIL);
    assert((0, lambda_pure_1.toBoolean)((0, lambda_pure_1.IS_NIL)(list1)) === false, 'IS_NIL (CONS x xs) = FALSE');
    // HEAD (CONS x xs) = x
    assert((0, lambda_pure_1.toNumber)((0, lambda_pure_1.HEAD)(list1)) === 1, 'HEAD (CONS 1 NIL) = 1');
    // TAIL (CONS x xs) = xs
    assert((0, lambda_pure_1.toBoolean)((0, lambda_pure_1.IS_NIL)((0, lambda_pure_1.TAIL)(list1))) === true, 'TAIL (CONS x NIL) = NIL');
    // Multi-element list
    const list2 = (0, lambda_pure_1.CONS)(lambda_pure_1.ONE)((0, lambda_pure_1.CONS)(lambda_pure_1.TWO)((0, lambda_pure_1.CONS)(lambda_pure_1.THREE)(lambda_pure_1.NIL)));
    assert((0, lambda_pure_1.toNumber)((0, lambda_pure_1.HEAD)(list2)) === 1, 'HEAD of multi-list');
    assert((0, lambda_pure_1.toNumber)((0, lambda_pure_1.HEAD)((0, lambda_pure_1.TAIL)(list2))) === 2, 'HEAD TAIL of multi-list');
    assert((0, lambda_pure_1.toNumber)((0, lambda_pure_1.HEAD)((0, lambda_pure_1.TAIL)((0, lambda_pure_1.TAIL)(list2)))) === 3, 'HEAD TAIL TAIL of multi-list');
    console.log('✓ List laws hold');
}
// Y combinator (recursion)
function testYCombinator() {
    console.log('Testing Y combinator...');
    // Factorial using Y
    const fact = (0, lambda_pure_1.Y)((f) => (n) => (0, lambda_pure_1.toBoolean)((0, lambda_pure_1.IS_ZERO)(n))
        ? lambda_pure_1.ONE
        : (0, lambda_pure_1.MULT)(n)(f((0, lambda_pure_1.PRED)(n))));
    assert((0, lambda_pure_1.toNumber)(fact(lambda_pure_1.ZERO)) === 1, 'factorial 0 = 1');
    assert((0, lambda_pure_1.toNumber)(fact(lambda_pure_1.ONE)) === 1, 'factorial 1 = 1');
    assert((0, lambda_pure_1.toNumber)(fact(lambda_pure_1.TWO)) === 2, 'factorial 2 = 2');
    assert((0, lambda_pure_1.toNumber)(fact(lambda_pure_1.THREE)) === 6, 'factorial 3 = 6');
    // Fibonacci using Y
    const fib = (0, lambda_pure_1.Y)((f) => (n) => (0, lambda_pure_1.toBoolean)((0, lambda_pure_1.IS_ZERO)(n))
        ? lambda_pure_1.ZERO
        : (0, lambda_pure_1.toBoolean)((0, lambda_pure_1.IS_ZERO)((0, lambda_pure_1.PRED)(n)))
            ? lambda_pure_1.ONE
            : (0, lambda_pure_1.PLUS)(f((0, lambda_pure_1.PRED)(n)))(f((0, lambda_pure_1.PRED)((0, lambda_pure_1.PRED)(n)))));
    assert((0, lambda_pure_1.toNumber)(fib(lambda_pure_1.ZERO)) === 0, 'fib 0 = 0');
    assert((0, lambda_pure_1.toNumber)(fib(lambda_pure_1.ONE)) === 1, 'fib 1 = 1');
    assert((0, lambda_pure_1.toNumber)(fib(lambda_pure_1.TWO)) === 1, 'fib 2 = 1');
    assert((0, lambda_pure_1.toNumber)(fib(lambda_pure_1.THREE)) === 2, 'fib 3 = 2');
    assert((0, lambda_pure_1.toNumber)(fib((0, lambda_pure_1.fromNumber)(4))) === 3, 'fib 4 = 3');
    assert((0, lambda_pure_1.toNumber)(fib((0, lambda_pure_1.fromNumber)(5))) === 5, 'fib 5 = 5');
    console.log('✓ Y combinator works');
}
// Beta equivalence
function testBetaEquivalence() {
    console.log('Testing beta equivalence...');
    // (λx. x) y = y
    const id = (x) => x;
    assert(id(5) === 5, '(λx. x) 5 = 5');
    // (λx. λy. x) a b = a
    const K = (x) => (_) => x;
    assert(K(lambda_pure_1.TRUE)(lambda_pure_1.FALSE) === lambda_pure_1.TRUE, 'K combinator');
    // (λx. λy. λz. x z (y z)) f g h = f h (g h)
    const S = (x) => (y) => (z) => x(z)(y(z));
    // S K K = I
    const SKK = S(K)(K);
    assert(SKK(5) === 5, 'S K K = I');
    console.log('✓ Beta equivalence holds');
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
        testBetaEquivalence();
        console.log('\n✅ All tests passed! Core is PURE.');
        return true;
    }
    catch (e) {
        console.error('\n❌ Test failed:', e);
        return false;
    }
}
// Run if executed directly
if (require.main === module) {
    process.exit(runAllTests() ? 0 : 1);
}
