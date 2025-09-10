#!/usr/bin/env node

/**
 * λ-to-WASM Compiler
 * Compiles Lambda IR to WebAssembly Text Format (WAT)
 */

const fs = require('fs');
const path = require('path');

class LambdaWasmCompiler {
  constructor() {
    this.functionIndex = 0;
    this.localIndex = 0;
    this.functions = [];
    this.exports = [];
  }
  
  /**
   * Compile λ-IR to WAT
   */
  compile(lambdaIR, geneName) {
    this.reset();
    
    const wat = `(module
  ;; Memory for heap allocation
  (memory 1)
  (export "memory" (memory 0))
  
  ;; Type definitions
  ${this.generateTypes()}
  
  ;; Function table for indirect calls
  (table 10 funcref)
  
  ;; Global state
  (global $heap_ptr (mut i32) (i32.const 1024))
  
  ;; Helper functions
  ${this.generateHelpers()}
  
  ;; Main gene function
  ${this.compileFunction(lambdaIR, geneName)}
  
  ;; Exports
  ${this.generateExports(geneName)}
)`;
    
    return wat;
  }
  
  /**
   * Reset compiler state
   */
  reset() {
    this.functionIndex = 0;
    this.localIndex = 0;
    this.functions = [];
    this.exports = [];
  }
  
  /**
   * Generate type definitions
   */
  generateTypes() {
    return `
  ;; Function types
  (type $unary (func (param i32) (result i32)))
  (type $binary (func (param i32 i32) (result i32)))
  (type $ternary (func (param i32 i32 i32) (result i32)))`;
  }
  
  /**
   * Generate helper functions
   */
  generateHelpers() {
    return `
  ;; Allocate memory on heap
  (func $alloc (param $size i32) (result i32)
    (local $ptr i32)
    global.get $heap_ptr
    local.set $ptr
    global.get $heap_ptr
    local.get $size
    i32.add
    global.set $heap_ptr
    local.get $ptr
  )
  
  ;; Create cons cell
  (func $cons (param $head i32) (param $tail i32) (result i32)
    (local $ptr i32)
    i32.const 8
    call $alloc
    local.set $ptr
    local.get $ptr
    local.get $head
    i32.store
    local.get $ptr
    i32.const 4
    i32.add
    local.get $tail
    i32.store
    local.get $ptr
  )
  
  ;; Get car (head) of cons cell
  (func $car (param $cons i32) (result i32)
    local.get $cons
    i32.load
  )
  
  ;; Get cdr (tail) of cons cell
  (func $cdr (param $cons i32) (result i32)
    local.get $cons
    i32.const 4
    i32.add
    i32.load
  )
  
  ;; Check if nil
  (func $is_nil (param $val i32) (result i32)
    local.get $val
    i32.const 0
    i32.eq
  )`;
  }
  
  /**
   * Compile a lambda function
   */
  compileFunction(lambdaIR, name) {
    const funcName = `$${name}`;
    const funcIdx = this.functionIndex++;
    
    // Parse λ-IR
    const { params, body } = this.parseLambdaIR(lambdaIR);
    
    // Generate function
    const func = `
  (func ${funcName} ${this.generateParams(params)} (result i32)
    ${this.compileBody(body)}
  )`;
    
    this.functions.push(func);
    this.exports.push(`(export "${name}" (func ${funcName}))`);
    
    return func;
  }
  
  /**
   * Parse Lambda IR
   */
  parseLambdaIR(ir) {
    // Simple parser for canonical λ-IR format
    // LAM x LAM f BODY
    const lines = ir.trim().split('\n');
    const params = [];
    let body = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('LAM ')) {
        params.push(trimmed.substring(4));
      } else {
        body += trimmed + '\n';
      }
    }
    
    return { params, body: body.trim() };
  }
  
  /**
   * Generate parameter list
   */
  generateParams(params) {
    return params.map(p => `(param $${p} i32)`).join(' ');
  }
  
  /**
   * Compile body expression
   */
  compileBody(body) {
    // Parse and compile based on expression type
    if (body.startsWith('CASE ')) {
      return this.compileCase(body);
    } else if (body.startsWith('APP ')) {
      return this.compileApplication(body);
    } else if (body.startsWith('CONS ')) {
      return this.compileCons(body);
    } else if (body === 'NIL') {
      return 'i32.const 0';
    } else {
      // Variable reference
      return `local.get $${body}`;
    }
  }
  
  /**
   * Compile CASE expression
   */
  compileCase(expr) {
    // CASE xs
    //   NIL -> result1
    //   CONS h t -> result2
    
    const lines = expr.split('\n');
    const scrutinee = lines[0].substring(5).trim();
    
    let nilCase = '';
    let consCase = '';
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('NIL ->')) {
        nilCase = line.substring(6).trim();
      } else if (line.startsWith('CONS ')) {
        const match = line.match(/CONS (\w+) (\w+) -> (.+)/);
        if (match) {
          const [, h, t, result] = match;
          consCase = { h, t, result };
        }
      }
    }
    
    return `
    local.get $${scrutinee}
    call $is_nil
    if (result i32)
      ${this.compileBody(nilCase)}
    else
      ${consCase ? this.compileConsCase(scrutinee, consCase) : 'i32.const 0'}
    end`;
  }
  
  /**
   * Compile CONS case branch
   */
  compileConsCase(scrutinee, { h, t, result }) {
    return `
    (local $${h} i32)
    (local $${t} i32)
    local.get $${scrutinee}
    call $car
    local.set $${h}
    local.get $${scrutinee}
    call $cdr
    local.set $${t}
    ${this.compileBody(result)}`;
  }
  
  /**
   * Compile function application
   */
  compileApplication(expr) {
    // APP f x or APP (APP f x) y
    const parts = this.parseApplication(expr);
    
    if (parts.length === 2) {
      const [func, arg] = parts;
      return `
    ${this.compileBody(arg)}
    ${this.compileBody(func)}
    call_indirect (type $unary)`;
    } else {
      // Multi-arg application
      return this.compileMultiApplication(parts);
    }
  }
  
  /**
   * Parse application expression
   */
  parseApplication(expr) {
    // Simple parser - would be more sophisticated in production
    const match = expr.match(/APP (.+) (.+)/);
    if (match) {
      return [match[1], match[2]];
    }
    return [];
  }
  
  /**
   * Compile CONS expression
   */
  compileCons(expr) {
    const match = expr.match(/CONS (.+) (.+)/);
    if (match) {
      const [, head, tail] = match;
      return `
    ${this.compileBody(head)}
    ${this.compileBody(tail)}
    call $cons`;
    }
    return 'i32.const 0';
  }
  
  /**
   * Compile multi-argument application
   */
  compileMultiApplication(parts) {
    let code = '';
    for (let i = parts.length - 1; i >= 0; i--) {
      code += this.compileBody(parts[i]) + '\n';
    }
    code += `call_indirect (type $${this.getArityType(parts.length)})`;
    return code;
  }
  
  /**
   * Get type name for arity
   */
  getArityType(arity) {
    const types = ['', 'unary', 'binary', 'ternary'];
    return types[arity] || 'unary';
  }
  
  /**
   * Generate exports
   */
  generateExports(mainName) {
    return this.exports.join('\n  ');
  }
}

/**
 * Compile a gene to WASM
 */
async function compileGene(genePath, outputPath) {
  const gene = JSON.parse(fs.readFileSync(genePath, 'utf-8'));
  
  // Load λ-IR
  const irPath = path.join(path.dirname(genePath), 'λ', 'canonical.ir');
  let lambdaIR;
  
  if (fs.existsSync(irPath)) {
    lambdaIR = fs.readFileSync(irPath, 'utf-8');
  } else {
    // Generate simple λ-IR from gene metadata
    lambdaIR = generateSimpleLambdaIR(gene);
  }
  
  // Compile to WAT
  const compiler = new LambdaWasmCompiler();
  const wat = compiler.compile(lambdaIR, gene.name);
  
  // Save WAT file
  const watPath = outputPath.replace('.wasm', '.wat');
  fs.writeFileSync(watPath, wat);
  
  console.log(`  Compiled ${gene.name} → ${watPath}`);
  
  // TODO: Use wabt or wasm-tools to compile WAT to WASM
  // For now, just save the WAT
  
  return watPath;
}

/**
 * Generate simple λ-IR from gene metadata
 */
function generateSimpleLambdaIR(gene) {
  // Basic template for common functions
  const templates = {
    map: `LAM xs
LAM f
CASE xs
  NIL -> NIL
  CONS h t -> CONS (APP f h) (APP (APP map t) f)`,
    
    filter: `LAM xs
LAM pred
CASE xs
  NIL -> NIL
  CONS h t -> CASE (APP pred h)
    TRUE -> CONS h (APP (APP filter t) pred)
    FALSE -> APP (APP filter t) pred`,
    
    reduce: `LAM xs
LAM f
LAM acc
CASE xs
  NIL -> acc
  CONS h t -> APP (APP (APP reduce t) f) (APP (APP f acc) h)`
  };
  
  return templates[gene.name] || `LAM x\nx`;
}

// Export compiler
module.exports = {
  LambdaWasmCompiler,
  compileGene,
  generateSimpleLambdaIR
};

// CLI interface
if (require.main === module) {
  const [,, genePath, outputPath] = process.argv;
  
  if (!genePath) {
    console.log('Usage: node lambda-wasm.js <gene.yaml> [output.wasm]');
    process.exit(1);
  }
  
  const output = outputPath || genePath.replace('.yaml', '.wasm');
  
  compileGene(genePath, output)
    .then(() => console.log('Compilation complete'))
    .catch(console.error);
}