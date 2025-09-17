// packages/pcta-vitest/setup.js - Setup file for Vitest

// Auto-wrap common test utilities
if (globalThis.__pl) {
  // Wrap describe/it/test blocks
  const wrapTestFn = (fn) => {
    if (typeof fn === 'function' && fn.length <= 2) {
      return globalThis.__pl.wrap(fn, { name: fn.name || 'test' });
    }
    return fn;
  };

  // Hook into global test functions if available
  if (global.describe) {
    const originalDescribe = global.describe;
    global.describe = (name, fn) => originalDescribe(name, wrapTestFn(fn));
  }

  if (global.it) {
    const originalIt = global.it;
    global.it = (name, fn) => originalIt(name, wrapTestFn(fn));
  }

  if (global.test) {
    const originalTest = global.test;
    global.test = (name, fn) => originalTest(name, wrapTestFn(fn));
  }

  console.log('[PCTA] Test acceleration enabled via Pure Lambda');
}