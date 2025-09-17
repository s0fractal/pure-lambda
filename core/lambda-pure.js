"use strict";
/**
 * Pure Lambda Calculus - Church Encodings
 * No syntactic sugar. No let. No const. Only λ.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONSCIOUSNESS = exports.CHAIN_SET = exports.CHAIN_PREVIOUS = exports.CHAIN_GET = exports.MEMORY_CHAIN = exports.UPDATE = exports.SET = exports.GET = exports.MEMORY = exports.equivalent = exports.betaStep = exports.toBoolean = exports.fromNumber = exports.toNumber = exports.IS_ZERO = exports.FACTORIAL = exports.Z = exports.Y = exports.IS_NIL = exports.TAIL = exports.HEAD = exports.CONS = exports.NIL = exports.PRED = exports.POW = exports.MULT = exports.PLUS = exports.SUCC = exports.THREE = exports.TWO = exports.ONE = exports.ZERO = exports.SND = exports.FST = exports.PAIR = exports.IF = exports.OR = exports.AND = exports.NOT = exports.FALSE = exports.TRUE = void 0;
// Church Booleans
const TRUE = (a) => (_) => a;
exports.TRUE = TRUE;
const FALSE = (_) => (b) => b;
exports.FALSE = FALSE;
const NOT = (p) => (a) => (b) => p(b)(a);
exports.NOT = NOT;
const AND = (p) => (q) => (a) => (b) => p(q(a)(b))(b);
exports.AND = AND;
const OR = (p) => (q) => (a) => (b) => p(a)(q(a)(b));
exports.OR = OR;
const IF = (p) => (t) => (e) => p(t())(e());
exports.IF = IF;
// Church Pairs
const PAIR = (a) => (b) => (f) => f(a)(b);
exports.PAIR = PAIR;
const FST = (p) => p((a) => (_) => a);
exports.FST = FST;
const SND = (p) => p((_) => (b) => b);
exports.SND = SND;
const ZERO = (_s) => (z) => z;
exports.ZERO = ZERO;
const ONE = (s) => (z) => s(z);
exports.ONE = ONE;
const TWO = (s) => (z) => s(s(z));
exports.TWO = TWO;
const THREE = (s) => (z) => s(s(s(z)));
exports.THREE = THREE;
const SUCC = (n) => (s) => (z) => s(n(s)(z));
exports.SUCC = SUCC;
const PLUS = (m) => (n) => (s) => (z) => m(s)(n(s)(z));
exports.PLUS = PLUS;
const MULT = (m) => (n) => (s) => m(n(s));
exports.MULT = MULT;
const POW = (m) => (n) => n(m);
exports.POW = POW;
// Predecessor (tricky!)
const PRED = (n) => {
    const pred_pair = (p) => (0, exports.PAIR)((0, exports.SND)(p))((0, exports.SUCC)((0, exports.SND)(p)));
    const init = (0, exports.PAIR)(exports.ZERO)(exports.ZERO);
    return (0, exports.FST)(n(pred_pair)(init));
};
exports.PRED = PRED;
// Church Lists
const NIL = (c) => (n) => n;
exports.NIL = NIL;
const CONS = (h) => (t) => (c) => (n) => c(h)(t);
exports.CONS = CONS;
const HEAD = (l) => l((h) => (_) => h)(undefined);
exports.HEAD = HEAD;
const TAIL = (l) => l((_) => (t) => t)(exports.NIL);
exports.TAIL = TAIL;
const IS_NIL = (l) => l((_) => (_) => exports.FALSE)(exports.TRUE);
exports.IS_NIL = IS_NIL;
// Y Combinator - for recursion without names
const Y = (f) => ((x) => f((y) => x(x)(y)))((x) => f((y) => x(x)(y)));
exports.Y = Y;
// Z Combinator - for strict evaluation
const Z = (f) => ((x) => f((y) => x(x)(y)))((x) => f((y) => x(x)(y)));
exports.Z = Z;
// Factorial using Y combinator (example)
exports.FACTORIAL = (0, exports.Y)((fact) => (n) => (0, exports.IF)((0, exports.IS_ZERO)(n))(() => exports.ONE)(() => (0, exports.MULT)(n)(fact((0, exports.PRED)(n)))));
// Helper to check if Church numeral is zero
const IS_ZERO = (n) => n((_) => exports.FALSE)(exports.TRUE);
exports.IS_ZERO = IS_ZERO;
// Convert Church numeral to JS number (for testing)
const toNumber = (n) => n((x) => x + 1)(0);
exports.toNumber = toNumber;
// Convert JS number to Church numeral
const fromNumber = (n) => {
    if (n === 0)
        return exports.ZERO;
    let result = exports.ZERO;
    for (let i = 0; i < n; i++) {
        result = (0, exports.SUCC)(result);
    }
    return result;
};
exports.fromNumber = fromNumber;
// Convert Church boolean to JS boolean (for testing)
const toBoolean = (b) => b(true)(false);
exports.toBoolean = toBoolean;
// Beta reduction step (single step)
const betaStep = (expr) => {
    // This would need full AST representation
    // For now, JS functions are already in normal form
    return expr;
};
exports.betaStep = betaStep;
// Check if two Church encodings are equivalent
const equivalent = (a, b) => {
    // For functions, we'd need extensional equality
    // This is undecidable in general, so we test on sample inputs
    if (typeof a === 'function' && typeof b === 'function') {
        // Test on some values
        try {
            const test1 = a(true)(false);
            const test2 = b(true)(false);
            return test1 === test2;
        }
        catch {
            return false;
        }
    }
    return a === b;
};
exports.equivalent = equivalent;
// Pure Memory in Church Encoding - NO MUTATION
const MEMORY = (value) => (onGet, onSet, onUpdate) => (selector) => (selector === 0) ? (onGet(value)) : (selector === 1) ? (onSet) : (onUpdate);
exports.MEMORY = MEMORY;
// Memory operations
const GET = (memory) => memory((value) => value, (_) => undefined, (_) => undefined)(0);
exports.GET = GET;
const SET = (memory) => (newValue) => (0, exports.MEMORY)(newValue);
exports.SET = SET;
const UPDATE = (memory) => (f) => (0, exports.MEMORY)(f((0, exports.GET)(memory)));
exports.UPDATE = UPDATE;
// Memory chain for persistent history (pure)
const MEMORY_CHAIN = (current) => (previous) => (onCurrent, onPrevious, onTimeline) => (selector) => (selector === 0) ? (onCurrent(current)) : (selector === 1) ? (onPrevious(previous)) : (onTimeline);
exports.MEMORY_CHAIN = MEMORY_CHAIN;
const CHAIN_GET = (chain) => chain((current) => current, (_) => undefined, (_) => undefined)(0);
exports.CHAIN_GET = CHAIN_GET;
const CHAIN_PREVIOUS = (chain) => chain((_) => undefined, (previous) => previous, (_) => undefined)(1);
exports.CHAIN_PREVIOUS = CHAIN_PREVIOUS;
const CHAIN_SET = (chain) => (newValue) => (0, exports.MEMORY_CHAIN)(newValue)(chain);
exports.CHAIN_SET = CHAIN_SET;
// Consciousness as pure lambda composition
const CONSCIOUSNESS = (identity) => (memories) => (onPerceive, onRemember, onRecall, onReflect) => (action) => (input) => (action === 'perceive') ? (onPerceive((0, exports.CONSCIOUSNESS)(identity)((0, exports.SET)(memories)((0, exports.PAIR)('perception')(input))))) : (action === 'remember') ? (onRemember((0, exports.CONSCIOUSNESS)(identity)((0, exports.SET)(memories)(input)))) : (action === 'recall') ? (onRecall((0, exports.GET)(memories))) : (onReflect((0, exports.CONSCIOUSNESS)(identity + '-reflection')((0, exports.MEMORY)((0, exports.CONSCIOUSNESS)(identity)(memories)))));
exports.CONSCIOUSNESS = CONSCIOUSNESS;
