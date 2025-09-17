/**
 * pl-oracle - Dynamic Side Effect Detector
 *
 * Patches global objects to detect and log side effects
 * Prevents false optimizations by tracking impure operations
 */

const SIDE_EFFECTS = {
  env: false,
  fs: false,
  net: false,
  time: false,
  random: false,
  dom: false,
  console: false,
  global_mutation: false
}

const TRACKED_FUNCTIONS = new Map()
let CURRENT_FUNCTION = null

/**
 * Initialize oracle patching
 */
export function initOracle() {
  // Patch Date
  const originalDateNow = Date.now
  Date.now = function() {
    if (CURRENT_FUNCTION) {
      SIDE_EFFECTS.time = true
      TRACKED_FUNCTIONS.get(CURRENT_FUNCTION).sideEffects.add('time')
    }
    return originalDateNow.call(this)
  }

  // Patch Math.random
  const originalRandom = Math.random
  Math.random = function() {
    if (CURRENT_FUNCTION) {
      SIDE_EFFECTS.random = true
      TRACKED_FUNCTIONS.get(CURRENT_FUNCTION).sideEffects.add('random')
    }
    return originalRandom.call(this)
  }

  // Patch console
  const consoleMethods = ['log', 'error', 'warn', 'info', 'debug']
  consoleMethods.forEach(method => {
    const original = console[method]
    console[method] = function(...args) {
      if (CURRENT_FUNCTION) {
        SIDE_EFFECTS.console = true
        TRACKED_FUNCTIONS.get(CURRENT_FUNCTION).sideEffects.add('console')
      }
      return original.apply(this, args)
    }
  })

  // Patch process.env (Node.js)
  if (typeof process !== 'undefined' && process.env) {
    const envProxy = new Proxy(process.env, {
      get(target, prop) {
        if (CURRENT_FUNCTION) {
          SIDE_EFFECTS.env = true
          TRACKED_FUNCTIONS.get(CURRENT_FUNCTION).sideEffects.add('env')
        }
        return target[prop]
      },
      set(target, prop, value) {
        if (CURRENT_FUNCTION) {
          SIDE_EFFECTS.env = true
          TRACKED_FUNCTIONS.get(CURRENT_FUNCTION).sideEffects.add('env')
        }
        target[prop] = value
        return true
      }
    })
    process.env = envProxy
  }

  // Patch fs (Node.js)
  try {
    const fs = require('fs')
    const fsMethods = ['readFileSync', 'writeFileSync', 'readFile', 'writeFile']
    fsMethods.forEach(method => {
      const original = fs[method]
      if (original) {
        fs[method] = function(...args) {
          if (CURRENT_FUNCTION) {
            SIDE_EFFECTS.fs = true
            TRACKED_FUNCTIONS.get(CURRENT_FUNCTION).sideEffects.add('fs')
          }
          return original.apply(this, args)
        }
      }
    })
  } catch (e) {
    // fs not available (browser)
  }

  // Patch fetch/XMLHttpRequest
  if (typeof fetch !== 'undefined') {
    const originalFetch = fetch
    globalThis.fetch = function(...args) {
      if (CURRENT_FUNCTION) {
        SIDE_EFFECTS.net = true
        TRACKED_FUNCTIONS.get(CURRENT_FUNCTION).sideEffects.add('net')
      }
      return originalFetch.apply(this, args)
    }
  }

  // Patch DOM (browser)
  if (typeof document !== 'undefined') {
    const domMethods = ['getElementById', 'querySelector', 'createElement']
    domMethods.forEach(method => {
      const original = document[method]
      if (original) {
        document[method] = function(...args) {
          if (CURRENT_FUNCTION) {
            SIDE_EFFECTS.dom = true
            TRACKED_FUNCTIONS.get(CURRENT_FUNCTION).sideEffects.add('dom')
          }
          return original.apply(this, args)
        }
      }
    })
  }

  // Track global mutations
  if (typeof window !== 'undefined') {
    const globalHandler = {
      set(target, prop, value) {
        if (CURRENT_FUNCTION && !['CURRENT_FUNCTION', 'SIDE_EFFECTS'].includes(prop)) {
          SIDE_EFFECTS.global_mutation = true
          TRACKED_FUNCTIONS.get(CURRENT_FUNCTION).sideEffects.add('global_mutation')
        }
        target[prop] = value
        return true
      }
    }
    // Note: Can't proxy window directly, but track common globals
  }
}

/**
 * Wrap function with oracle tracking
 */
export function trackFunction(fn, name) {
  const functionData = {
    name,
    calls: 0,
    sideEffects: new Set(),
    pure: true
  }

  TRACKED_FUNCTIONS.set(name, functionData)

  return function oracleWrapped(...args) {
    const previousFunction = CURRENT_FUNCTION
    CURRENT_FUNCTION = name
    functionData.calls++

    try {
      const result = fn.apply(this, args)

      // Update purity status
      if (functionData.sideEffects.size > 0) {
        functionData.pure = false
      }

      return result
    } finally {
      CURRENT_FUNCTION = previousFunction
    }
  }
}

/**
 * Check if function is pure based on oracle observations
 */
export function isPure(functionName) {
  const data = TRACKED_FUNCTIONS.get(functionName)
  if (!data) return null

  return data.pure && data.sideEffects.size === 0
}

/**
 * Get side effects report
 */
export function getSideEffectsReport() {
  const report = {
    global_side_effects: { ...SIDE_EFFECTS },
    functions: {}
  }

  for (const [name, data] of TRACKED_FUNCTIONS) {
    report.functions[name] = {
      calls: data.calls,
      pure: data.pure,
      side_effects: Array.from(data.sideEffects)
    }
  }

  return report
}

/**
 * Reset oracle state
 */
export function resetOracle() {
  Object.keys(SIDE_EFFECTS).forEach(key => {
    SIDE_EFFECTS[key] = false
  })
  TRACKED_FUNCTIONS.clear()
  CURRENT_FUNCTION = null
}

/**
 * Generate deterministic seed
 */
export function generateSeed(input) {
  const crypto = require('crypto')
  return crypto.createHash('blake2b512')
    .update(input || 'default')
    .digest('hex')
    .slice(0, 16)
}

/**
 * Apply seed to Math.random and Date.now
 */
export function applySeed(seed) {
  // Seedable random using xorshift
  let state = parseInt(seed, 16) || 0x2F6E2B1

  Math.random = function() {
    state ^= state << 13
    state ^= state >> 17
    state ^= state << 5
    return (state >>> 0) / 0xFFFFFFFF
  }

  // Fixed Date.now for tests
  const baseTime = 1700000000000
  let offset = 0

  Date.now = function() {
    return baseTime + (offset++ * 1000)
  }
}

// Export for use in loader
export default {
  initOracle,
  trackFunction,
  isPure,
  getSideEffectsReport,
  resetOracle,
  generateSeed,
  applySeed
}