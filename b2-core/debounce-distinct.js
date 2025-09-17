#!/usr/bin/env node
/**
 * B2 Pattern: Debounce + DistinctUntilChanged
 *
 * Shows how complex RxJS patterns translate to B2 core
 */

// Core atoms (kernel - don't count as imports)
const { FOCUS, SCAN, DELAY, MERGE } = require('./kernel');

// Only 2 external imports allowed
const timeWindow = 'ph_8a7c3f2b...'; // phash for 100ms window
const equalityFn = 'ph_2d4e6a9c...'; // phash for deep equality

/**
 * Debounce pattern in B2
 * SCAN maintains last emission time
 */
const debounce = SCAN((lastT, { t, x }) => {
  const shouldEmit = t - lastT >= 100; // timeWindow constant
  return shouldEmit
    ? [t, { emit: true, value: x }]  // Update time, emit
    : [lastT, { emit: false }];      // Keep time, don't emit
});

/**
 * DistinctUntilChanged in B2
 * SCAN maintains previous value
 */
const distinct = SCAN((prev, x) => {
  const changed = !prev || !equal(prev, x); // equalityFn
  return [x, changed ? { emit: true, value: x } : { emit: false }];
});

/**
 * Combined pipeline using THEN (▶)
 * Sequential composition preserves causality
 */
const pipeline = compose(
  debounce,    // First: time-based filtering
  FOCUS(({ emit, value }) => emit ? Some(value) : None), // Extract emissions
  distinct,    // Then: uniqueness filtering
  FOCUS(({ emit, value }) => emit ? Some(value) : None)  // Final extraction
);

/**
 * B2 helper: Sequential composition
 */
function compose(...fns) {
  return fns.reduce((f, g) => x => g(f(x)));
}

/**
 * B2 helper: Option monad
 */
const None = { type: 'none' };
const Some = value => ({ type: 'some', value });

// Demo execution
function demo() {
  console.log('🔷 B2 Pattern: Debounce + Distinct');
  console.log('=====================================\n');

  const events = [
    { t: 0, x: 'a' },
    { t: 50, x: 'a' },   // Too soon + duplicate
    { t: 60, x: 'b' },   // Too soon
    { t: 200, x: 'b' },  // OK time, but duplicate
    { t: 350, x: 'c' },  // OK: time passed + unique
    { t: 500, x: 'c' },  // OK time, but duplicate
    { t: 700, x: 'd' }   // OK: time passed + unique
  ];

  // Initialize pipeline state
  let debounceState = [0, null];
  let distinctState = [null, null];

  console.log('Input events:');
  events.forEach(e => console.log(`  t=${e.t}ms: "${e.x}"`));

  console.log('\nOutput (after debounce + distinct):');

  events.forEach(event => {
    // Run through debounce
    const [newDebounceState, debounceOut] = debounce(debounceState, event);
    debounceState = newDebounceState;

    if (debounceOut.emit) {
      // Run through distinct
      const [newDistinctState, distinctOut] = distinct(distinctState, debounceOut.value);
      distinctState = newDistinctState;

      if (distinctOut.emit) {
        console.log(`  t=${event.t}ms: "${distinctOut.value}" ✓`);
      }
    }
  });

  console.log('\n📊 B2 Properties:');
  console.log('  • Pure functions only (Gate G0)');
  console.log('  • Explicit state in SCAN pairs');
  console.log('  • Time as data (t,x) not effects');
  console.log('  • Composable via THEN (▶)');
  console.log('  • phash: deterministic identity');
}

// Simplified helpers for demo
function equal(a, b) {
  return a === b; // Real version would use equalityFn phash
}

if (require.main === module) {
  demo();
}

module.exports = { debounce, distinct, pipeline };