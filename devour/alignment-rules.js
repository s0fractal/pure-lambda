#!/usr/bin/env node

/**
 * Alignment Rules - Cross-library equivalence mappings
 * Maps functions from lodash/ramda/underscore to canonical gene names
 */

const alignmentMap = {
  // Array manipulation
  map: {
    lodash: ['map', 'collect'],
    ramda: ['map'],
    underscore: ['map', 'collect'],
    canonical: 'map'
  },
  
  filter: {
    lodash: ['filter', 'select'],
    ramda: ['filter'],
    underscore: ['filter', 'select'],
    canonical: 'filter'
  },
  
  reduce: {
    lodash: ['reduce', 'inject', 'foldl'],
    ramda: ['reduce'],
    underscore: ['reduce', 'inject', 'foldl'],
    canonical: 'reduce'
  },
  
  // Composition
  compose: {
    lodash: ['flowRight'],
    ramda: ['compose'],
    underscore: ['compose'],
    canonical: 'compose'
  },
  
  pipe: {
    lodash: ['flow'],
    ramda: ['pipe'],
    underscore: null, // doesn't have pipe
    canonical: 'pipe'
  },
  
  // Array utilities
  chunk: {
    lodash: ['chunk'],
    ramda: ['splitEvery'],
    underscore: null, // custom implementation needed
    canonical: 'chunk'
  },
  
  uniq: {
    lodash: ['uniq', 'unique'],
    ramda: ['uniq'],
    underscore: ['uniq', 'unique'],
    canonical: 'uniq'
  },
  
  groupBy: {
    lodash: ['groupBy'],
    ramda: ['groupBy'],
    underscore: ['groupBy'],
    canonical: 'groupBy'
  },
  
  // Object manipulation
  get: {
    lodash: ['get'],
    ramda: ['path', 'prop'],
    underscore: null,
    canonical: 'get'
  },
  
  set: {
    lodash: ['set'],
    ramda: ['assocPath'],
    underscore: null,
    canonical: 'set'
  },
  
  // Collection utilities
  flatten: {
    lodash: ['flatten'],
    ramda: ['flatten'],
    underscore: ['flatten'],
    canonical: 'flatten'
  },
  
  zip: {
    lodash: ['zip'],
    ramda: ['zip'],
    underscore: ['zip'],
    canonical: 'zip'
  },
  
  range: {
    lodash: ['range'],
    ramda: ['range'],
    underscore: ['range'],
    canonical: 'range'
  },
  
  // Functional utilities
  curry: {
    lodash: ['curry'],
    ramda: ['curry'],
    underscore: null,
    canonical: 'curry'
  },
  
  partial: {
    lodash: ['partial'],
    ramda: ['partial'],
    underscore: ['partial'],
    canonical: 'partial'
  },
  
  memoize: {
    lodash: ['memoize'],
    ramda: ['memoize'],
    underscore: ['memoize'],
    canonical: 'memoize'
  },
  
  // Type checking
  isArray: {
    lodash: ['isArray'],
    ramda: ['is'],
    underscore: ['isArray'],
    canonical: 'isArray'
  },
  
  isFunction: {
    lodash: ['isFunction'],
    ramda: null,
    underscore: ['isFunction'],
    canonical: 'isFunction'
  },
  
  // Collection predicates
  every: {
    lodash: ['every'],
    ramda: ['all'],
    underscore: ['every', 'all'],
    canonical: 'every'
  },
  
  some: {
    lodash: ['some'],
    ramda: ['any'],
    underscore: ['some', 'any'],
    canonical: 'some'
  },
  
  // Array operations
  head: {
    lodash: ['head', 'first'],
    ramda: ['head'],
    underscore: ['first', 'head'],
    canonical: 'head'
  },
  
  tail: {
    lodash: ['tail'],
    ramda: ['tail'],
    underscore: ['rest', 'tail'],
    canonical: 'tail'
  },
  
  last: {
    lodash: ['last'],
    ramda: ['last'],
    underscore: ['last'],
    canonical: 'last'
  },
  
  take: {
    lodash: ['take'],
    ramda: ['take'],
    underscore: ['first'], // with n parameter
    canonical: 'take'
  },
  
  drop: {
    lodash: ['drop'],
    ramda: ['drop'],
    underscore: ['rest'], // with n parameter
    canonical: 'drop'
  },
  
  // String operations
  split: {
    lodash: ['split'],
    ramda: ['split'],
    underscore: null,
    canonical: 'split'
  },
  
  join: {
    lodash: ['join'],
    ramda: ['join'],
    underscore: null,
    canonical: 'join'
  },
  
  // Math operations
  sum: {
    lodash: ['sum'],
    ramda: ['sum'],
    underscore: null,
    canonical: 'sum'
  },
  
  mean: {
    lodash: ['mean'],
    ramda: ['mean'],
    underscore: null,
    canonical: 'mean'
  },
  
  // Object utilities
  keys: {
    lodash: ['keys'],
    ramda: ['keys'],
    underscore: ['keys'],
    canonical: 'keys'
  },
  
  values: {
    lodash: ['values'],
    ramda: ['values'],
    underscore: ['values'],
    canonical: 'values'
  },
  
  pick: {
    lodash: ['pick'],
    ramda: ['pick'],
    underscore: ['pick'],
    canonical: 'pick'
  },
  
  omit: {
    lodash: ['omit'],
    ramda: ['omit'],
    underscore: ['omit'],
    canonical: 'omit'
  }
};

// Signature patterns for semantic matching
const signaturePatterns = {
  map: {
    pattern: '(a -> b) -> [a] -> [b]',
    variants: [
      '(collection, iteratee)',
      'R.map(fn, list)',
      '_.map(list, fn)'
    ]
  },
  
  filter: {
    pattern: '(a -> Bool) -> [a] -> [a]',
    variants: [
      '(collection, predicate)',
      'R.filter(pred, list)',
      '_.filter(list, pred)'
    ]
  },
  
  reduce: {
    pattern: '((b, a) -> b) -> b -> [a] -> b',
    variants: [
      '(collection, iteratee, accumulator)',
      'R.reduce(fn, init, list)',
      '_.reduce(list, fn, memo)'
    ]
  },
  
  compose: {
    pattern: '(...(a -> b)) -> (a -> b)',
    variants: [
      '(...funcs)',
      'R.compose(f, g, h)',
      '_.compose(f, g, h)'
    ]
  }
};

// Behavioral equivalence tests
const behaviorTests = {
  map: {
    test: (impl) => {
      const double = x => x * 2;
      const result = impl([1, 2, 3], double);
      return JSON.stringify(result) === '[2,4,6]';
    }
  },
  
  filter: {
    test: (impl) => {
      const isEven = x => x % 2 === 0;
      const result = impl([1, 2, 3, 4], isEven);
      return JSON.stringify(result) === '[2,4]';
    }
  },
  
  reduce: {
    test: (impl) => {
      const sum = (acc, x) => acc + x;
      const result = impl([1, 2, 3, 4], sum, 0);
      return result === 10;
    }
  }
};

// Library-specific quirks and adaptations
const libraryQuirks = {
  lodash: {
    iterateeFirst: false,  // _.map(collection, iteratee)
    autoChain: true,        // _([1,2,3]).map(x => x * 2).value()
    thisBinding: true       // supports this binding in iteratees
  },
  
  ramda: {
    iterateeFirst: true,    // R.map(iteratee, collection)
    curried: true,          // All functions auto-curried
    dataLast: true          // Data comes last in arguments
  },
  
  underscore: {
    iterateeFirst: false,   // _.map(collection, iteratee)
    contextArg: true,       // Many functions accept context as 3rd arg
    chainWrapper: true      // _.chain() for chaining
  }
};

// Export alignment functions
module.exports = {
  alignmentMap,
  signaturePatterns,
  behaviorTests,
  libraryQuirks,
  
  /**
   * Find canonical gene name for a library function
   */
  findCanonical(library, functionName) {
    for (const [canonical, mappings] of Object.entries(alignmentMap)) {
      const libMappings = mappings[library];
      if (libMappings && libMappings.includes(functionName)) {
        return canonical;
      }
    }
    return null;
  },
  
  /**
   * Get all equivalent functions across libraries
   */
  getEquivalents(canonicalName) {
    const mapping = alignmentMap[canonicalName];
    if (!mapping) return null;
    
    return {
      canonical: canonicalName,
      lodash: mapping.lodash,
      ramda: mapping.ramda,
      underscore: mapping.underscore
    };
  },
  
  /**
   * Test if two implementations are behaviorally equivalent
   */
  areEquivalent(canonicalName, impl1, impl2) {
    const test = behaviorTests[canonicalName];
    if (!test) return false;
    
    try {
      return test.test(impl1) && test.test(impl2);
    } catch (e) {
      return false;
    }
  },
  
  /**
   * Adapt function call based on library quirks
   */
  adaptCall(library, canonicalName, args) {
    const quirks = libraryQuirks[library];
    const mapping = alignmentMap[canonicalName];
    
    if (!quirks || !mapping) return args;
    
    // Handle argument order differences
    if (quirks.iterateeFirst && !quirks.dataLast) {
      // Ramda style: fn comes first
      if (args.length >= 2) {
        return [args[1], args[0], ...args.slice(2)];
      }
    }
    
    return args;
  },
  
  /**
   * Generate compatibility report
   */
  generateReport() {
    const report = {
      totalGenes: Object.keys(alignmentMap).length,
      coverage: {
        lodash: 0,
        ramda: 0,
        underscore: 0
      },
      missing: {
        lodash: [],
        ramda: [],
        underscore: []
      }
    };
    
    for (const [canonical, mapping] of Object.entries(alignmentMap)) {
      for (const lib of ['lodash', 'ramda', 'underscore']) {
        if (mapping[lib] && mapping[lib].length > 0) {
          report.coverage[lib]++;
        } else {
          report.missing[lib].push(canonical);
        }
      }
    }
    
    return report;
  }
};