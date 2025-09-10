#!/usr/bin/env node

/**
 * WASM Runtime for Pure Lambda Genes
 * Loads and executes WebAssembly modules
 */

const fs = require('fs');
const path = require('path');

class PureLambdaRuntime {
  constructor() {
    this.modules = new Map();
    this.memory = new WebAssembly.Memory({ initial: 1 });
    this.imports = this.createImports();
  }
  
  /**
   * Create import object for WASM modules
   */
  createImports() {
    return {
      env: {
        memory: this.memory,
        
        // Console for debugging
        print: (ptr) => {
          console.log('WASM:', this.readString(ptr));
        },
        
        // Math functions
        sin: Math.sin,
        cos: Math.cos,
        sqrt: Math.sqrt,
        pow: Math.pow,
        
        // Memory management
        malloc: (size) => {
          // Simple bump allocator
          const ptr = this.heapPtr || 1024;
          this.heapPtr = ptr + size;
          return ptr;
        },
        
        free: (ptr) => {
          // No-op for simple allocator
        }
      },
      
      // Cross-module imports
      genes: new Proxy({}, {
        get: (target, prop) => {
          if (this.modules.has(prop)) {
            return this.modules.get(prop).exports[prop];
          }
          return undefined;
        }
      })
    };
  }
  
  /**
   * Load a WASM module
   */
  async loadModule(wasmPath, name) {
    const wasmBuffer = fs.readFileSync(wasmPath);
    const module = await WebAssembly.compile(wasmBuffer);
    const instance = await WebAssembly.instantiate(module, this.imports);
    
    this.modules.set(name, instance);
    
    return instance.exports;
  }
  
  /**
   * Load a WAT file (text format)
   */
  async loadWAT(watPath, name) {
    // Need wabt or wasm-tools to compile WAT to WASM
    // For now, use mock implementation
    console.log(`Loading WAT: ${watPath}`);
    
    const mockExports = {
      [name]: this.createMockFunction(name)
    };
    
    // Store in modules map
    this.modules.set(name, { exports: mockExports });
    
    return mockExports;
  }
  
  /**
   * Create mock function for testing
   */
  createMockFunction(name) {
    const mocks = {
      map: (...args) => {
        // Handle both (arr, fn) and curried forms
        if (args.length === 1 && typeof args[0] === 'function') {
          return (arr) => Array.isArray(arr) ? arr.map(args[0]) : [];
        }
        const [arr, fn] = args;
        return Array.isArray(arr) ? arr.map(fn) : [];
      },
      
      filter: (...args) => {
        if (args.length === 1 && typeof args[0] === 'function') {
          return (arr) => Array.isArray(arr) ? arr.filter(args[0]) : [];
        }
        const [arr, pred] = args;
        return Array.isArray(arr) ? arr.filter(pred) : [];
      },
      
      reduce: (...args) => {
        if (args.length === 1) {
          return (arr, init) => Array.isArray(arr) ? arr.reduce(args[0], init) : init;
        }
        const [arr, fn, init] = args;
        return Array.isArray(arr) ? arr.reduce(fn, init) : init;
      }
    };
    
    return mocks[name] || ((x) => x);
  }
  
  /**
   * Load a gene (auto-detect format)
   */
  async loadGene(genePath) {
    const name = path.basename(genePath, path.extname(genePath));
    
    if (genePath.endsWith('.wasm')) {
      return this.loadModule(genePath, name);
    } else if (genePath.endsWith('.wat')) {
      return this.loadWAT(genePath, name);
    } else {
      throw new Error(`Unknown gene format: ${genePath}`);
    }
  }
  
  /**
   * Execute a gene function
   */
  execute(geneName, ...args) {
    const module = this.modules.get(geneName);
    if (!module) {
      throw new Error(`Gene not loaded: ${geneName}`);
    }
    
    const func = module.exports[geneName];
    if (!func) {
      throw new Error(`Gene function not found: ${geneName}`);
    }
    
    // For mock functions, just pass through JS values directly
    // Real WASM would need conversion
    if (typeof func === 'function') {
      return func(...args);
    }
    
    // Convert JS values to WASM-compatible format
    const wasmArgs = args.map(arg => this.toWasm(arg));
    
    // Execute function
    const result = func(...wasmArgs);
    
    // Convert result back to JS
    return this.fromWasm(result);
  }
  
  /**
   * Convert JS value to WASM format
   */
  toWasm(value) {
    if (typeof value === 'number') {
      return value;
    } else if (typeof value === 'boolean') {
      return value ? 1 : 0;
    } else if (Array.isArray(value)) {
      return this.arrayToList(value);
    } else if (typeof value === 'function') {
      return this.functionToTable(value);
    } else {
      return 0; // nil
    }
  }
  
  /**
   * Convert WASM value to JS format
   */
  fromWasm(value) {
    if (typeof value === 'number') {
      // Check if it's a pointer to a list
      if (value > 1024) {
        return this.listToArray(value);
      }
      return value;
    }
    return value;
  }
  
  /**
   * Convert JS array to WASM linked list
   */
  arrayToList(arr) {
    if (arr.length === 0) {
      return 0; // nil
    }
    
    // Build list from end to start
    let list = 0;
    for (let i = arr.length - 1; i >= 0; i--) {
      const ptr = this.imports.env.malloc(8);
      const view = new DataView(this.memory.buffer, ptr, 8);
      view.setUint32(0, this.toWasm(arr[i]), true);
      view.setUint32(4, list, true);
      list = ptr;
    }
    
    return list;
  }
  
  /**
   * Convert WASM linked list to JS array
   */
  listToArray(ptr) {
    const arr = [];
    
    while (ptr !== 0) {
      const view = new DataView(this.memory.buffer, ptr, 8);
      const head = view.getUint32(0, true);
      const tail = view.getUint32(4, true);
      
      arr.push(this.fromWasm(head));
      ptr = tail;
    }
    
    return arr;
  }
  
  /**
   * Add function to table and return index
   */
  functionToTable(fn) {
    // Would add to function table in real implementation
    return 0;
  }
  
  /**
   * Read string from memory
   */
  readString(ptr) {
    const view = new Uint8Array(this.memory.buffer, ptr);
    let str = '';
    for (let i = 0; view[i] !== 0; i++) {
      str += String.fromCharCode(view[i]);
    }
    return str;
  }
  
  /**
   * Compose multiple genes
   */
  compose(...geneNames) {
    return (...args) => {
      // For composition, we need to apply functions in reverse order
      // compose(f, g)(x) = f(g(x))
      
      if (geneNames.length === 0) return args[0];
      if (geneNames.length === 1) return this.execute(geneNames[0], ...args);
      
      // Apply rightmost function first with all args
      let result = this.execute(geneNames[geneNames.length - 1], args[0], args[1]);
      
      // Then apply remaining functions in reverse order
      for (let i = geneNames.length - 2; i >= 0; i--) {
        // For subsequent functions, use the remaining args if any
        if (i === 0 && args.length > 2) {
          result = this.execute(geneNames[i], result, args[2]);
        } else {
          result = this.execute(geneNames[i], result, args[1]);
        }
      }
      
      return result;
    };
  }
  
  /**
   * Create organism from multiple genes
   */
  async createOrganism(genes) {
    const organism = {};
    
    for (const [name, path] of Object.entries(genes)) {
      await this.loadGene(path);
      organism[name] = (...args) => this.execute(name, ...args);
    }
    
    return organism;
  }
}

// Export runtime
module.exports = PureLambdaRuntime;

// CLI interface for testing
if (require.main === module) {
  const runtime = new PureLambdaRuntime();
  
  async function test() {
    // Load mock genes for testing
    await runtime.loadWAT('genes/map/wasm/map.wat', 'map');
    await runtime.loadWAT('genes/filter/wasm/filter.wat', 'filter');
    
    // Test execution
    console.log('Testing WASM runtime...\n');
    
    // Test map
    const mapped = runtime.execute('map', [1, 2, 3], x => x * 2);
    console.log('map([1, 2, 3], x => x * 2):', mapped);
    
    // Test filter
    const filtered = runtime.execute('filter', [1, 2, 3, 4], x => x % 2 === 0);
    console.log('filter([1, 2, 3, 4], x => x % 2 === 0):', filtered);
    
    // Test composition
    const composed = runtime.compose('filter', 'map');
    // First map x => x * 2: [1,2,3,4] → [2,4,6,8]
    // Then filter x => x > 4: [2,4,6,8] → [6,8]
    const result = composed([1, 2, 3, 4], x => x * 2, x => x > 4);
    console.log('compose(filter, map)([1, 2, 3, 4], x => x * 2, x => x > 4):', result);
  }
  
  test().catch(console.error);
}