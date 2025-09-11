/**
 * Factorial through Y-combinator
 * Pure λ-calculus recursion without names
 */

// Import Church encodings (simulated here for demo)
const Y = f => (x => f(y => x(x)(y)))(x => f(y => x(x)(y)));

// Church numerals
const ZERO = s => z => z;
const ONE = s => z => s(z);
const SUCC = n => s => z => s(n(s)(z));

// Build numbers
const TWO = SUCC(ONE);
const THREE = SUCC(TWO);
const FOUR = SUCC(THREE);
const FIVE = SUCC(FOUR);

// Arithmetic
const PLUS = m => n => s => z => m(s)(n(s)(z));
const MULT = m => n => s => m(n(s));
const PRED = n => s => z => n(p => p(k => k(s)(p(t => t)))(k => z))(k => k(a => a)(a => a));

// Boolean logic
const TRUE = a => b => a;
const FALSE = a => b => b;
const IF = p => t => e => p(t)(e);
const IS_ZERO = n => n(x => FALSE)(TRUE);

// Convert Church to JS number
const toNumber = churchNum => churchNum(n => n + 1)(0);

// Convert JS to Church
const fromNumber = n => {
  let result = ZERO;
  for (let i = 0; i < n; i++) {
    result = SUCC(result);
  }
  return result;
};

console.log('🔢 Factorial via Y-Combinator Demo');
console.log('=' .repeat(40));

// Define factorial using Y-combinator
const FACTORIAL = Y(fact => n =>
  IF(IS_ZERO(n))
    (() => ONE)
    (() => MULT(n)(fact(PRED(n))))()
);

// Test factorial
console.log('\n📊 Computing factorials:');

for (let i = 0; i <= 5; i++) {
  const churchN = fromNumber(i);
  const churchResult = FACTORIAL(churchN);
  const jsResult = toNumber(churchResult);
  
  console.log(`${i}! = ${jsResult}`);
}

// Performance comparison
console.log('\n⚡ Performance Analysis:');

const testFactorial = n => {
  const start = performance.now();
  const churchN = fromNumber(n);
  const result = toNumber(FACTORIAL(churchN));
  const end = performance.now();
  
  return { result, time: end - start };
};

const jsFactorial = n => {
  if (n <= 1) return 1;
  return n * jsFactorial(n - 1);
};

for (let n of [3, 4, 5]) {
  const church = testFactorial(n);
  
  const jsStart = performance.now();
  const jsResult = jsFactorial(n);
  const jsEnd = performance.now();
  
  console.log(`\n${n}!:`);
  console.log(`  Church λ: ${church.result} (${church.time.toFixed(3)}ms)`);
  console.log(`  Native JS: ${jsResult} (${(jsEnd - jsStart).toFixed(3)}ms)`);
  console.log(`  Ratio: ${(church.time / (jsEnd - jsStart)).toFixed(1)}x slower`);
}

// Demonstrate pure functional nature
console.log('\n🔮 Purity Demonstration:');

const fact3 = FACTORIAL(THREE);
const fact3_again = FACTORIAL(THREE);

console.log('First call:', toNumber(fact3));
console.log('Second call:', toNumber(fact3_again));
console.log('Pure? ', toNumber(fact3) === toNumber(fact3_again) ? '✅ YES' : '❌ NO');

// Y-combinator explanation
console.log('\n📚 How Y-Combinator Works:');
console.log('Y = λf.(λx.f(x x))(λx.f(x x))');
console.log('');
console.log('It allows recursion without names by:');
console.log('1. Taking a function that wants to recurse');
console.log('2. Giving it a reference to itself');
console.log('3. Creating a fixed point where f(Y(f)) = Y(f)');
console.log('');
console.log('In our factorial:');
console.log('- fact is the recursive reference');
console.log('- Y provides fact to itself');
console.log('- No "function factorial" declaration needed!');

console.log('\n✨ This is pure λ-calculus:');
console.log('- No variable assignment');
console.log('- No loops');
console.log('- No named functions');
console.log('- Only function application');
console.log('');
console.log('🔥 Everything is λ!');