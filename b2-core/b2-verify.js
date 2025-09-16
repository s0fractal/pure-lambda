#!/usr/bin/env node
/**
 * B2 Verifier - Ensures B2 discipline compliance
 *
 * Rules:
 * - All λ are unary
 * - Only THEN (▶) and SPLIT (∆) at surface
 * - ≤2 external imports (excluding core atoms)
 * - No algebraic loops (DELAY required in cycles)
 */

const CORE_ATOMS = new Set([
  'id', 'FOCUS', 'SCAN', 'DELAY', 'MERGE', 'PAIR'
]);

const SURFACE_OPS = new Set([
  'THEN', '▶', 'SPLIT', '∆'
]);

/**
 * Verify B2 tree structure
 */
function verifyB2Tree(ast) {
  const errors = [];
  const warnings = [];
  const imports = new Set();

  function checkNode(node, depth = 0, inLoop = false) {
    switch (node.type) {
      case 'lambda':
        // Check unary constraint
        if (node.params && node.params.length > 1) {
          errors.push(`Non-unary λ at depth ${depth}: ${node.params.length} params`);
        }
        // Recurse into body
        if (node.body) checkNode(node.body, depth + 1, inLoop);
        break;

      case 'compose':
        // Check binary composition
        if (!SURFACE_OPS.has(node.op)) {
          errors.push(`Invalid surface op at depth ${depth}: ${node.op}`);
        }
        if (node.op === 'THEN' || node.op === '▶') {
          // Sequential - check order preservation
          checkNode(node.left, depth + 1, inLoop);
          checkNode(node.right, depth + 1, inLoop);
        } else if (node.op === 'SPLIT' || node.op === '∆') {
          // Parallel fork
          checkNode(node.left, depth + 1, inLoop);
          checkNode(node.right, depth + 1, inLoop);
        }
        break;

      case 'atom':
        if (!CORE_ATOMS.has(node.name)) {
          // External import
          imports.add(node.name);
        }
        if (node.name === 'DELAY') {
          // Mark that we've seen a delay in this path
          inLoop = false;
        }
        break;

      case 'loop':
        // Check for algebraic loop (no DELAY)
        if (!hasDelay(node.body)) {
          errors.push(`Algebraic loop detected at depth ${depth} - needs DELAY`);
        }
        checkNode(node.body, depth + 1, true);
        break;

      case 'import':
        if (!CORE_ATOMS.has(node.phash)) {
          imports.add(node.phash);
        }
        break;
    }
  }

  function hasDelay(node) {
    if (!node) return false;
    if (node.type === 'atom' && node.name === 'DELAY') return true;
    if (node.left && hasDelay(node.left)) return true;
    if (node.right && hasDelay(node.right)) return true;
    if (node.body && hasDelay(node.body)) return true;
    return false;
  }

  // Run verification
  checkNode(ast);

  // Check import limit
  if (imports.size > 2) {
    errors.push(`Too many external imports: ${imports.size} > 2`);
    errors.push(`  Imports: ${Array.from(imports).join(', ')}`);
  }

  return { errors, warnings, imports: Array.from(imports) };
}

/**
 * Parse simplified B2 notation
 */
function parseB2(source) {
  // Simplified parser for demo - real implementation would be more robust
  const lines = source.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  const ast = { type: 'module', statements: [] };

  for (const line of lines) {
    if (line.includes('import')) {
      const match = line.match(/import\s+(\w+)/);
      if (match) {
        ast.statements.push({ type: 'import', phash: match[1] });
      }
    } else if (line.includes('▶') || line.includes('THEN')) {
      const parts = line.split(/▶|THEN/).map(p => p.trim());
      ast.statements.push({
        type: 'compose',
        op: 'THEN',
        left: { type: 'atom', name: parts[0] },
        right: { type: 'atom', name: parts[1] }
      });
    } else if (line.includes('∆') || line.includes('SPLIT')) {
      const parts = line.split(/∆|SPLIT/).map(p => p.trim());
      ast.statements.push({
        type: 'compose',
        op: 'SPLIT',
        left: { type: 'atom', name: parts[0] },
        right: { type: 'atom', name: parts[1] }
      });
    }
  }

  return ast;
}

/**
 * Generate B2 tree visualization
 */
function visualizeB2(ast) {
  const lines = [];

  function drawNode(node, prefix = '', isLast = true) {
    const connector = isLast ? '└─' : '├─';
    const extension = isLast ? '  ' : '│ ';

    switch (node.type) {
      case 'compose':
        lines.push(`${prefix}${connector}${node.op}`);
        if (node.left) drawNode(node.left, prefix + extension, false);
        if (node.right) drawNode(node.right, prefix + extension, true);
        break;
      case 'atom':
        lines.push(`${prefix}${connector}${node.name}`);
        break;
      case 'lambda':
        lines.push(`${prefix}${connector}λ(${node.params?.join(',') || '_'})`);
        if (node.body) drawNode(node.body, prefix + extension, true);
        break;
    }
  }

  if (ast.statements) {
    ast.statements.forEach((stmt, i) => {
      drawNode(stmt, '', i === ast.statements.length - 1);
    });
  } else {
    drawNode(ast);
  }

  return lines.join('\n');
}

// CLI interface
if (require.main === module) {
  const fs = require('fs');
  const file = process.argv[2];

  if (!file) {
    console.log('🔍 B2 Verifier');
    console.log('Usage: node b2-verify.js <file.b2>');
    console.log('\nRules checked:');
    console.log('  ✓ All λ are unary');
    console.log('  ✓ Only THEN/SPLIT at surface');
    console.log('  ✓ ≤2 external imports');
    console.log('  ✓ No algebraic loops');
    process.exit(1);
  }

  try {
    const source = fs.readFileSync(file, 'utf8');
    const ast = parseB2(source);
    const result = verifyB2Tree(ast);

    console.log(`\n🔍 B2 Verification: ${file}\n`);

    if (result.errors.length === 0) {
      console.log('✅ B2 compliant!');
      if (result.imports.length > 0) {
        console.log(`📦 External imports: ${result.imports.join(', ')}`);
      }
      console.log('\n📊 Tree structure:');
      console.log(visualizeB2(ast));
    } else {
      console.log('❌ B2 violations found:\n');
      result.errors.forEach(err => console.log(`  • ${err}`));
      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(warn => console.log(`  • ${warn}`));
      }
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { verifyB2Tree, parseB2, visualizeB2, CORE_ATOMS };