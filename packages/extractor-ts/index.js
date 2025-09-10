#!/usr/bin/env node

/**
 * Lambda-IR Extractor for TypeScript
 * Extracts semantic core from TS code to verify soul equivalence
 */

const ts = require('typescript');
const crypto = require('crypto');
const fs = require('fs');

class LambdaIRExtractor {
  constructor() {
    this.ir = [];
    this.bindings = new Map();
    this.nextVar = 0;
  }
  
  /**
   * Extract λ-IR from TypeScript file
   */
  extractFromFile(filePath) {
    const source = fs.readFileSync(filePath, 'utf-8');
    return this.extractFromSource(source);
  }
  
  /**
   * Extract λ-IR from TypeScript source
   */
  extractFromSource(source) {
    const sourceFile = ts.createSourceFile(
      'temp.ts',
      source,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Find exported functions
    const functions = this.findExportedFunctions(sourceFile);
    
    // Extract IR for each function
    const irs = {};
    for (const [name, node] of functions) {
      irs[name] = this.extractFunctionIR(node);
    }
    
    return irs;
  }
  
  /**
   * Find all exported functions in source file
   */
  findExportedFunctions(sourceFile) {
    const functions = new Map();
    
    const visit = (node) => {
      // Check for export function declarations
      if (ts.isFunctionDeclaration(node) && 
          node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        const name = node.name?.text;
        if (name) {
          functions.set(name, node);
        }
      }
      
      // Check for exported arrow functions
      if (ts.isVariableStatement(node) &&
          node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        for (const decl of node.declarationList.declarations) {
          if (decl.initializer && ts.isArrowFunction(decl.initializer)) {
            const name = decl.name?.text;
            if (name) {
              functions.set(name, decl.initializer);
            }
          }
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return functions;
  }
  
  /**
   * Extract IR from function node
   */
  extractFunctionIR(node) {
    this.ir = [];
    this.bindings.clear();
    this.nextVar = 0;
    
    // Extract parameters
    const params = node.parameters.map(p => {
      const name = p.name?.text || `v${this.nextVar++}`;
      this.bindings.set(name, name);
      return name;
    });
    
    // Build lambda for each parameter
    let ir = this.extractExpression(node.body);
    
    // Wrap in LAM for each parameter (right to left for currying)
    for (let i = params.length - 1; i >= 0; i--) {
      ir = `LAM ${params[i]}\\n  ${ir}`;
    }
    
    return this.normalize(ir);
  }
  
  /**
   * Extract IR from expression
   */
  extractExpression(node) {
    if (!node) return 'NIL';
    
    // Handle different node types
    switch (node.kind) {
      case ts.SyntaxKind.Block:
        // Extract from block body
        const statements = node.statements;
        if (statements.length === 0) return 'NIL';
        
        // Look for return statement
        for (const stmt of statements) {
          if (ts.isReturnStatement(stmt)) {
            return this.extractExpression(stmt.expression);
          }
        }
        return 'NIL';
      
      case ts.SyntaxKind.Identifier:
        const name = node.text;
        return this.bindings.get(name) || name;
      
      case ts.SyntaxKind.CallExpression:
        const fn = this.extractExpression(node.expression);
        const args = node.arguments.map(arg => this.extractExpression(arg));
        
        // Special handling for array methods
        if (node.expression?.name?.text === 'map') {
          return `MAP ${args.join(' ')}`;
        }
        if (node.expression?.name?.text === 'filter') {
          return `FILTER ${args.join(' ')}`;
        }
        if (node.expression?.name?.text === 'reduce') {
          return `FOLD ${args.join(' ')}`;
        }
        
        // General application
        let result = fn;
        for (const arg of args) {
          result = `APP ${result} ${arg}`;
        }
        return result;
      
      case ts.SyntaxKind.ArrowFunction:
      case ts.SyntaxKind.FunctionExpression:
        return this.extractFunctionIR(node);
      
      case ts.SyntaxKind.ArrayLiteralExpression:
        const elements = node.elements.map(e => this.extractExpression(e));
        if (elements.length === 0) return 'NIL';
        
        // Build list as nested CONS
        let list = 'NIL';
        for (let i = elements.length - 1; i >= 0; i--) {
          list = `CONS ${elements[i]} ${list}`;
        }
        return list;
      
      case ts.SyntaxKind.ConditionalExpression:
        const cond = this.extractExpression(node.condition);
        const thenExpr = this.extractExpression(node.whenTrue);
        const elseExpr = this.extractExpression(node.whenFalse);
        return `IF ${cond} THEN ${thenExpr} ELSE ${elseExpr}`;
      
      case ts.SyntaxKind.BinaryExpression:
        const left = this.extractExpression(node.left);
        const right = this.extractExpression(node.right);
        const op = this.getOperator(node.operatorToken);
        return `OP:${op} ${left} ${right}`;
      
      case ts.SyntaxKind.NumericLiteral:
        return `NUM:${node.text}`;
      
      case ts.SyntaxKind.StringLiteral:
        return `STR:"${node.text}"`;
      
      case ts.SyntaxKind.TrueKeyword:
        return 'BOOL:true';
      
      case ts.SyntaxKind.FalseKeyword:
        return 'BOOL:false';
      
      case ts.SyntaxKind.NullKeyword:
        return 'NULL';
      
      default:
        return 'UNKNOWN';
    }
  }
  
  /**
   * Get operator symbol
   */
  getOperator(token) {
    switch (token.kind) {
      case ts.SyntaxKind.PlusToken: return '+';
      case ts.SyntaxKind.MinusToken: return '-';
      case ts.SyntaxKind.AsteriskToken: return '*';
      case ts.SyntaxKind.SlashToken: return '/';
      case ts.SyntaxKind.EqualsEqualsEqualsToken: return '===';
      case ts.SyntaxKind.GreaterThanToken: return '>';
      case ts.SyntaxKind.LessThanToken: return '<';
      default: return '?';
    }
  }
  
  /**
   * Normalize IR for consistent hashing
   */
  normalize(ir) {
    return ir
      .replace(/\\s+/g, ' ')     // Normalize whitespace
      .replace(/\\bv\\d+\\b/g, 'x') // Alpha-rename variables
      .trim();
  }
  
  /**
   * Compute soul from normalized IR
   */
  computeSoul(ir) {
    const hash = crypto.createHash('sha256');
    hash.update('SOUL:');
    hash.update(this.normalize(ir));
    return 'λ' + hash.digest('hex').substring(0, 8);
  }
}

// CLI interface
if (require.main === module) {
  const [,, command, ...args] = process.argv;
  
  if (command === 'extract') {
    const filePath = args[0];
    if (!filePath) {
      console.error('Usage: extractor-ts extract <file.ts>');
      process.exit(1);
    }
    
    const extractor = new LambdaIRExtractor();
    const irs = extractor.extractFromFile(filePath);
    
    console.log('Extracted λ-IR:');
    for (const [name, ir] of Object.entries(irs)) {
      const soul = extractor.computeSoul(ir);
      console.log(`\\n${name}:`);
      console.log('  IR:', ir);
      console.log('  Soul:', soul);
    }
  } else if (command === 'soul') {
    const filePath = args[0];
    if (!filePath) {
      console.error('Usage: extractor-ts soul <file.ts>');
      process.exit(1);
    }
    
    const extractor = new LambdaIRExtractor();
    const irs = extractor.extractFromFile(filePath);
    
    // Get first function's soul
    const firstIR = Object.values(irs)[0];
    if (firstIR) {
      const soul = extractor.computeSoul(firstIR);
      console.log(soul);
    }
  } else {
    console.log(`
λ-IR Extractor for TypeScript

Commands:
  extract <file.ts>  Extract λ-IR from TypeScript file
  soul <file.ts>     Compute soul hash from TypeScript file

Example:
  node extractor-ts extract genes/map/manifestations/ts/map.ts
  node extractor-ts soul genes/map/manifestations/ts/map.ts
    `);
  }
}

module.exports = LambdaIRExtractor;