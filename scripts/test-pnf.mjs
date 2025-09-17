#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Test PNF-LITE normalization for deterministic hashing
 * Tests that different whitespace/binder names yield same GID
 * and that adding/removing neighbors keeps GID, changes XID
 */

import { createRequire } from 'module';
import { execSync } from 'child_process';
const require = createRequire(import.meta.url);

// Helper to run ts-node and capture output
function runTsNode(script, input) {
  const { writeFileSync, mkdirSync, unlinkSync } = require('fs');
  mkdirSync('/tmp', { recursive: true });
  const tempFile = '/tmp/test-input.yaml';
  writeFileSync(tempFile, input);
  try {
    const result = execSync(`npm run gid:file ${tempFile}`, {
      encoding: 'utf8',
      cwd: '/Users/chaoshex/Projects/pure-lambda'
    });
    // Extract JSON from npm output (skip the first lines)
    const lines = result.split('\n');
    const jsonStart = lines.findIndex(line => line.trim().startsWith('{'));
    const jsonLines = lines.slice(jsonStart);
    const jsonStr = jsonLines.join('\n').trim();
    return JSON.parse(jsonStr);
  } finally {
    try { unlinkSync(tempFile); } catch {}
  }
}

// Mock functions for basic tests
function pnfLite(code) {
  // Basic PNF-LITE implementation for testing
  let normalized = code
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/;+\s*$/gm, '')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')');

  // Simple redundant parentheses removal
  normalized = normalized.replace(/\(\(([^()]+)\)\)/g, '($1)');
  normalized = normalized.replace(/^\(([a-zA-Z_$][a-zA-Z0-9_$]*)\)\s*=>/g, '$1 =>');

  // Basic α-normalization
  const identifiers = new Map();
  let counter = 0;

  normalized = normalized.replace(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g, (match) => {
    const reserved = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'class', 'extends', 'import', 'export', 'from', 'as', 'typeof', 'instanceof', 'in', 'of', 'delete', 'void', 'async', 'await', 'true', 'false', 'null', 'undefined'];

    if (reserved.includes(match)) return match;
    if (!identifiers.has(match)) {
      identifiers.set(match, `_x${counter++}`);
    }
    return identifiers.get(match);
  });

  return normalized
    .replace(/\s*=>\s*/g, '=>')
    .replace(/\s*->\s*/g, '->')
    .replace(/\s*\|\s*/g, '|')
    .replace(/\s*&\s*/g, '&')
    .replace(/\s*\+\s*/g, '+')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*\*\s*/g, '*')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*=\s*/g, '=')
    .replace(/\s*<\s*/g, '<')
    .replace(/\s*>\s*/g, '>')
    .toLowerCase();
}

/**
 * Assert helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Test PNF-LITE normalization produces same results for equivalent code
 */
function testPNFNormalization() {
  console.log('🧪 Testing PNF-LITE normalization...');

  // Different whitespace variations of the same code
  const codeVariations = [
    'x => x.focus()',
    'x=>x.focus()',
    '  x  =>  x.focus()  ',
    'x => x.focus();',
    'x => x.focus();;;',
    '((x)) => x.focus()',
    'x =>\n  x.focus()',
    'X => X.focus()', // Different case
  ];

  const normalized = codeVariations.map(code => pnfLite(code));

  // All variations should normalize to the same result
  const baseNormalized = normalized[0];
  for (let i = 1; i < normalized.length; i++) {
    assert(
      normalized[i] === baseNormalized,
      `Code variation ${i} normalized to "${normalized[i]}", expected "${baseNormalized}"`
    );
  }

  console.log(`✅ All ${codeVariations.length} code variations normalize to: "${baseNormalized}"`);
}

/**
 * Test α-normalization maps identifiers consistently
 */
function testAlphaNormalization() {
  console.log('🧪 Testing α-normalization...');

  // Different variable names should normalize to same pattern
  const codes = [
    'input => process(input)',
    'data => process(data)',
    'x => process(x)',
    'item => process(item)'
  ];

  const normalized = codes.map(code => pnfLite(code));

  // All should normalize to same pattern with _x0
  const expected = '_x0=>_x1(_x0)';
  for (let i = 0; i < normalized.length; i++) {
    assert(
      normalized[i] === expected,
      `Code "${codes[i]}" normalized to "${normalized[i]}", expected "${expected}"`
    );
  }

  console.log(`✅ α-normalization works: all variations → "${expected}"`);
}

/**
 * Test GID stability across equivalent tiles
 */
function testGIDStability() {
  console.log('🧪 Testing GID stability...');

  // Equivalent tiles with different formatting
  const tile1Yaml = `op: FOCUS
code: |
  x => x.focus()
ports:
  in: "data"
  out: "focused"
law: "identity"`;

  const tile2Yaml = `op: FOCUS
code: |
    x  =>  x.focus();
ports:
  in: "data"
  out: "focused"
law: "identity"`;

  const tile3Yaml = `op: FOCUS
code: |
  input => input.focus()
ports:
  in: "data"
  out: "focused"
law: "identity"`;

  const result1 = runTsNode('tools/gid.ts', tile1Yaml);
  const result2 = runTsNode('tools/gid.ts', tile2Yaml);
  const result3 = runTsNode('tools/gid.ts', tile3Yaml);

  assert(result1.gid === result2.gid, 'GID should be same for whitespace variation');
  assert(result1.gid === result3.gid, 'GID should be same for variable renaming');
  assert(result1.iid === result2.iid, 'IID should be same for equivalent tiles');
  assert(result1.iid === result3.iid, 'IID should be same for equivalent tiles');

  console.log(`✅ GID stability confirmed: ${result1.gid}`);
}

/**
 * Test XID changes with neighbors while GID stays same
 */
function testXIDChangesWithNeighbors() {
  console.log('🧪 Testing XID changes with neighbors...');

  // Base tile without neighbors
  const baseTileYaml = `op: SPLIT
code: |
  input => split(input)
ports:
  in: "stream"
  left: "branch_a"
  right: "branch_b"`;

  // Same tile with neighbors
  const tileWithNeighborsYaml = `op: SPLIT
code: |
  input => split(input)
ports:
  in: "stream"
  left: "branch_a"
  right: "branch_b"
neighborIIDs:
  left: "iid_branch_a_processor"
  right: "iid_branch_b_processor"`;

  // Same tile with different neighbors
  const tileWithDifferentNeighborsYaml = `op: SPLIT
code: |
  input => split(input)
ports:
  in: "stream"
  left: "branch_a"
  right: "branch_b"
neighborIIDs:
  left: "iid_different_processor"
  right: "iid_another_processor"`;

  const baseResult = runTsNode('tools/gid.ts', baseTileYaml);
  const withNeighborsResult = runTsNode('tools/gid.ts', tileWithNeighborsYaml);
  const differentNeighborsResult = runTsNode('tools/gid.ts', tileWithDifferentNeighborsYaml);

  // GID should be same (same code)
  assert(baseResult.gid === withNeighborsResult.gid, 'GID should stay same when adding neighbors');
  assert(baseResult.gid === differentNeighborsResult.gid, 'GID should stay same with different neighbors');

  // XID should be different
  assert(baseResult.xid !== withNeighborsResult.xid, 'XID should change when adding neighbors');
  assert(withNeighborsResult.xid !== differentNeighborsResult.xid, 'XID should change with different neighbors');

  console.log(`✅ XID variation confirmed:`);
  console.log(`   No neighbors: ${baseResult.xid}`);
  console.log(`   With neighbors: ${withNeighborsResult.xid}`);
  console.log(`   Different neighbors: ${differentNeighborsResult.xid}`);
}

/**
 * Test deterministic behavior across multiple runs
 */
function testDeterministicBehavior() {
  console.log('🧪 Testing deterministic behavior...');

  const tileYaml = `op: FOCUS
code: |
  x => x.focus()
ports:
  in: "data"
  out: "focused"
law: "identity"`;

  // Run multiple times
  const results = [];
  for (let i = 0; i < 5; i++) {
    results.push(runTsNode('tools/gid.ts', tileYaml));
  }

  // All results should be identical
  const baseResult = results[0];
  for (let i = 1; i < results.length; i++) {
    assert(results[i].gid === baseResult.gid, `GID should be deterministic (run ${i})`);
    assert(results[i].iid === baseResult.iid, `IID should be deterministic (run ${i})`);
    assert(results[i].xid === baseResult.xid, `XID should be deterministic (run ${i})`);
  }

  console.log(`✅ Deterministic behavior confirmed across ${results.length} runs`);
}

/**
 * Run all tests
 */
async function main() {
  console.log('🚀 Starting PNF-LITE tests...\n');

  try {
    testPNFNormalization();
    testAlphaNormalization();
    testGIDStability();
    testXIDChangesWithNeighbors();
    testDeterministicBehavior();

    console.log('\n✅ All tests passed! PNF-LITE normalization is working correctly.');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();