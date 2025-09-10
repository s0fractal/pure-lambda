#!/usr/bin/env node

/**
 * Shim Generator - Creates compatibility layers for seamless migration
 * Generates drop-in replacements that redirect to pure genes
 */

const fs = require('fs');
const path = require('path');
const { alignmentMap, libraryQuirks } = require('./alignment-rules');

class ShimGenerator {
  constructor(organism, targetLibrary) {
    this.organism = organism;
    this.targetLibrary = targetLibrary;
    this.quirks = libraryQuirks[targetLibrary];
  }
  
  /**
   * Generate complete shim for a library
   */
  generateShim() {
    const shimName = `@pure-lambda/${this.targetLibrary}-shim`;
    const shimPath = path.join('devour', 'shims', this.targetLibrary);
    
    // Create shim directory
    if (!fs.existsSync(shimPath)) {
      fs.mkdirSync(shimPath, { recursive: true });
    }
    
    // Generate main shim file
    const mainShim = this.generateMainShim();
    fs.writeFileSync(path.join(shimPath, 'index.js'), mainShim);
    
    // Generate TypeScript definitions
    const dts = this.generateTypeDefinitions();
    fs.writeFileSync(path.join(shimPath, 'index.d.ts'), dts);
    
    // Generate package.json
    const packageJson = this.generatePackageJson(shimName);
    fs.writeFileSync(path.join(shimPath, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    // Generate migration guide
    const guide = this.generateMigrationGuide();
    fs.writeFileSync(path.join(shimPath, 'MIGRATION.md'), guide);
    
    return shimPath;
  }
  
  /**
   * Generate main JavaScript shim
   */
  generateMainShim() {
    const imports = this.generateImports();
    const adapters = this.generateAdapters();
    const exports = this.generateExports();
    const chainWrapper = this.quirks.autoChain || this.quirks.chainWrapper 
      ? this.generateChainWrapper() 
      : '';
    
    return `/**
 * ${this.targetLibrary} compatibility shim
 * Redirects to pure-lambda genes with behavioral compatibility
 * Generated: ${new Date().toISOString()}
 */

${imports}

// Adapter functions for library-specific behavior
${adapters}

// Chain wrapper for method chaining
${chainWrapper}

// Exports with ${this.targetLibrary} API compatibility
${exports}

// Default export
module.exports = _;
`;
  }
  
  /**
   * Generate imports from pure-lambda organism
   */
  generateImports() {
    const genes = this.organism.genes || {};
    const imports = [];
    
    for (const [geneName, geneData] of Object.entries(genes)) {
      if (geneData.verified) {
        imports.push(`const ${geneName} = require('@pure-lambda/core/${geneName}');`);
      }
    }
    
    return imports.join('\n');
  }
  
  /**
   * Generate adapter functions
   */
  generateAdapters() {
    const adapters = [];
    
    for (const [canonical, mapping] of Object.entries(alignmentMap)) {
      const libFuncs = mapping[this.targetLibrary];
      if (!libFuncs || libFuncs.length === 0) continue;
      
      const adapter = this.generateAdapter(canonical, libFuncs[0]);
      if (adapter) {
        adapters.push(adapter);
      }
    }
    
    return adapters.join('\n\n');
  }
  
  /**
   * Generate single adapter function
   */
  generateAdapter(canonicalName, libFuncName) {
    const quirks = this.quirks;
    
    // Handle argument order differences
    let argAdapter = '';
    if (quirks.iterateeFirst && canonicalName in ['map', 'filter', 'reduce']) {
      // Ramda style: function first
      argAdapter = `
  // Adapt argument order for ${this.targetLibrary}
  if (quirks.iterateeFirst) {
    [iteratee, collection] = [collection, iteratee];
  }`;
    }
    
    // Handle currying
    let curryWrapper = '';
    if (quirks.curried) {
      curryWrapper = `
  // Auto-curry for ${this.targetLibrary} compatibility
  if (arguments.length === 1) {
    return function(collection) {
      return ${canonicalName}(collection, iteratee);
    };
  }`;
    }
    
    // Handle context binding
    let contextHandler = '';
    if (quirks.contextArg || quirks.thisBinding) {
      contextHandler = `
  // Handle context binding
  if (context) {
    iteratee = iteratee.bind(context);
  }`;
    }
    
    return `function ${libFuncName}_adapter(collection, iteratee, context) {${argAdapter}${curryWrapper}${contextHandler}
  return ${canonicalName}(collection, iteratee);
}`;
  }
  
  /**
   * Generate exports object
   */
  generateExports() {
    const exports = ['const _ = {'];
    const methods = [];
    
    for (const [canonical, mapping] of Object.entries(alignmentMap)) {
      const libFuncs = mapping[this.targetLibrary];
      if (!libFuncs || libFuncs.length === 0) continue;
      
      // Export all aliases
      for (const funcName of libFuncs) {
        methods.push(`  ${funcName}: ${funcName}_adapter`);
      }
    }
    
    // Add utility methods specific to library
    if (this.targetLibrary === 'lodash') {
      methods.push(`  chain: createChain`);
      methods.push(`  value: (x) => x`);
    }
    
    exports.push(methods.join(',\n'));
    exports.push('};');
    
    return exports.join('\n');
  }
  
  /**
   * Generate chain wrapper for method chaining
   */
  generateChainWrapper() {
    if (!this.quirks.autoChain && !this.quirks.chainWrapper) {
      return '';
    }
    
    return `
function createChain(value) {
  const wrapped = {
    _value: value,
    
    // Chain methods
    ${this.generateChainMethods()},
    
    // Unwrap value
    value() {
      return this._value;
    }
  };
  
  return wrapped;
}`;
  }
  
  /**
   * Generate chained method implementations
   */
  generateChainMethods() {
    const methods = [];
    
    for (const [canonical, mapping] of Object.entries(alignmentMap)) {
      const libFuncs = mapping[this.targetLibrary];
      if (!libFuncs || libFuncs.length === 0) continue;
      
      const funcName = libFuncs[0];
      methods.push(`    ${funcName}(iteratee) {
      this._value = ${funcName}_adapter(this._value, iteratee);
      return this;
    }`);
    }
    
    return methods.join(',\n');
  }
  
  /**
   * Generate TypeScript definitions
   */
  generateTypeDefinitions() {
    return `/**
 * TypeScript definitions for ${this.targetLibrary} shim
 */

declare module '@pure-lambda/${this.targetLibrary}-shim' {
  // Collection types
  type Collection<T> = T[] | Record<string, T>;
  type Iteratee<T, R> = (value: T, index?: number | string, collection?: Collection<T>) => R;
  type Predicate<T> = (value: T, index?: number | string, collection?: Collection<T>) => boolean;
  
  interface LoDashStatic {
    // Array functions
    map<T, R>(collection: Collection<T>, iteratee: Iteratee<T, R>): R[];
    filter<T>(collection: Collection<T>, predicate: Predicate<T>): T[];
    reduce<T, R>(collection: Collection<T>, iteratee: (acc: R, value: T) => R, initial: R): R;
    
    // Composition
    compose<T>(...funcs: Function[]): (arg: T) => any;
    pipe<T>(...funcs: Function[]): (arg: T) => any;
    
    // Utilities
    chunk<T>(array: T[], size: number): T[][];
    uniq<T>(array: T[]): T[];
    groupBy<T>(collection: Collection<T>, iteratee: Iteratee<T, string>): Record<string, T[]>;
    
    // Chain wrapper
    chain<T>(value: T): ChainWrapper<T>;
  }
  
  interface ChainWrapper<T> {
    map<R>(iteratee: Iteratee<T, R>): ChainWrapper<R[]>;
    filter(predicate: Predicate<T>): ChainWrapper<T[]>;
    value(): T;
  }
  
  const _: LoDashStatic;
  export = _;
}`;
  }
  
  /**
   * Generate package.json for shim
   */
  generatePackageJson(name) {
    return {
      name,
      version: '1.0.0',
      description: `${this.targetLibrary} compatibility shim for pure-lambda`,
      main: 'index.js',
      types: 'index.d.ts',
      keywords: [this.targetLibrary, 'shim', 'compatibility', 'pure-lambda'],
      dependencies: {
        '@pure-lambda/core': '^0.1.0'
      },
      peerDependencies: {},
      repository: {
        type: 'git',
        url: 'https://github.com/s0fractal/pure-lambda.git'
      },
      license: 'MIT'
    };
  }
  
  /**
   * Generate migration guide
   */
  generateMigrationGuide() {
    return `# Migration Guide: ${this.targetLibrary} to Pure Lambda

## Quick Start

Replace your ${this.targetLibrary} import with the shim:

\`\`\`javascript
// Before
const _ = require('${this.targetLibrary}');

// After
const _ = require('@pure-lambda/${this.targetLibrary}-shim');
\`\`\`

## Compatibility

This shim provides ${this.getCompatibilityPercentage()}% compatibility with ${this.targetLibrary}.

### Supported Functions

${this.getSupportedFunctions()}

### Not Yet Supported

${this.getUnsupportedFunctions()}

## Performance

Pure Lambda genes are optimized for:
- Zero dependencies
- Minimal memory footprint
- Cross-language compatibility
- WASM compilation

## Advanced Migration

For gradual migration, you can use both libraries:

\`\`\`javascript
const _old = require('${this.targetLibrary}');
const _ = require('@pure-lambda/${this.targetLibrary}-shim');

// Use new pure functions where possible
const result = _.map(data, transformer);

// Fall back to old for unsupported features
const special = _old.someSpecialFunction(data);
\`\`\`

## Behavioral Differences

${this.getBehavioralDifferences()}

## Getting Help

- GitHub Issues: https://github.com/s0fractal/pure-lambda/issues
- Documentation: https://pure-lambda.dev/migration
`;
  }
  
  /**
   * Calculate compatibility percentage
   */
  getCompatibilityPercentage() {
    let supported = 0;
    let total = 0;
    
    for (const [, mapping] of Object.entries(alignmentMap)) {
      total++;
      if (mapping[this.targetLibrary] && mapping[this.targetLibrary].length > 0) {
        supported++;
      }
    }
    
    return Math.round((supported / total) * 100);
  }
  
  /**
   * Get list of supported functions
   */
  getSupportedFunctions() {
    const supported = [];
    
    for (const [canonical, mapping] of Object.entries(alignmentMap)) {
      const libFuncs = mapping[this.targetLibrary];
      if (libFuncs && libFuncs.length > 0) {
        supported.push(`- \`${libFuncs.join('`, `')}\` → \`${canonical}\``);
      }
    }
    
    return supported.join('\n');
  }
  
  /**
   * Get list of unsupported functions
   */
  getUnsupportedFunctions() {
    const unsupported = [];
    
    for (const [canonical, mapping] of Object.entries(alignmentMap)) {
      const libFuncs = mapping[this.targetLibrary];
      if (!libFuncs || libFuncs.length === 0) {
        unsupported.push(`- \`${canonical}\` (no equivalent)`);
      }
    }
    
    return unsupported.join('\n');
  }
  
  /**
   * Document behavioral differences
   */
  getBehavioralDifferences() {
    const differences = [];
    
    if (this.quirks.iterateeFirst) {
      differences.push('- Argument order: Pure Lambda uses data-first, ' + 
                      this.targetLibrary + ' uses function-first');
    }
    
    if (this.quirks.curried) {
      differences.push('- Currying: Functions are not auto-curried in Pure Lambda');
    }
    
    if (this.quirks.thisBinding) {
      differences.push('- Context binding: Use arrow functions or .bind() explicitly');
    }
    
    return differences.join('\n');
  }
}

// Export generator
module.exports = ShimGenerator;