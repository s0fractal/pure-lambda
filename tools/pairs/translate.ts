#!/usr/bin/env ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Pair-Lexicon Translation Helper
 *
 * Converts small 2-gram JSON patterns to NF, alias, and external representations
 * Used only for docs/UI; NOT in core NF processing
 *
 * Usage:
 *   ts-node tools/pairs/translate.ts '{"pattern": "map▶filter", "predicate": "p", "function": "f"}'
 */

import { readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';

// For CommonJS compatibility in Node.js
const scriptDir = __dirname;
const projectRoot = resolve(scriptDir, '../..');

interface PairEntry {
  pattern: string;
  nf: string;
  alias: string;
  description: string;
  external: {
    sql: string;
    rxjs: string;
  };
}

interface PairsDocument {
  pairs: PairEntry[];
}

interface TwoGramInput {
  pattern: string;
  predicate?: string;
  function?: string;
  operator?: string;
  [key: string]: any; // Additional parameters
}

interface TranslationResult {
  nf: string;
  alias: string;
  external: {
    sql: string;
    rxjs: string;
  };
}

/**
 * Load pairs documentation from YAML file
 */
function loadPairsDoc(): PairsDocument {
  try {
    const yaml = require('yaml');
    const pairsPath = join(projectRoot, 'docs/pairs.yaml');
    const pairsContent = readFileSync(pairsPath, 'utf8');
    return yaml.parse(pairsContent) as PairsDocument;
  } catch (error) {
    throw new Error(`Failed to load pairs.yaml: ${error}`);
  }
}

/**
 * Find matching pair entry by pattern
 */
function findPairEntry(pattern: string, pairsDoc: PairsDocument): PairEntry | null {
  return pairsDoc.pairs.find(entry => entry.pattern === pattern) || null;
}

/**
 * Substitute variables in template strings
 */
function substituteVariables(template: string, variables: Record<string, string>): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    // Handle common variable patterns
    const patterns = [
      new RegExp(`\\b${key}\\b`, 'g'),      // Direct match
      new RegExp(`${key}\\(`, 'g'),         // Function calls like p(x)
      new RegExp(`${key}\\.`, 'g'),         // Property access like f.prop
    ];

    for (const pattern of patterns) {
      result = result.replace(pattern, (match) => {
        if (match.endsWith('(')) return `${value}(`;
        if (match.endsWith('.')) return `${value}.`;
        return value;
      });
    }
  }

  return result;
}

/**
 * Translate 2-gram input to NF/alias/external representations
 */
export function translate(input: TwoGramInput): TranslationResult | null {
  try {
    const pairsDoc = loadPairsDoc();
    const pairEntry = findPairEntry(input.pattern, pairsDoc);

    if (!pairEntry) {
      return null; // Pattern not found
    }

    // Extract variables from input (excluding 'pattern')
    const variables: Record<string, string> = {};
    for (const [key, value] of Object.entries(input)) {
      if (key !== 'pattern' && typeof value === 'string') {
        variables[key] = value;
      }
    }

    // Substitute variables in templates
    const nf = substituteVariables(pairEntry.nf, variables);
    const sql = substituteVariables(pairEntry.external.sql, variables);
    const rxjs = substituteVariables(pairEntry.external.rxjs, variables);

    return {
      nf,
      alias: pairEntry.alias,
      external: {
        sql,
        rxjs
      }
    };
  } catch (error) {
    console.error(`Translation error: ${error}`);
    return null;
  }
}

/**
 * Command-line interface
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage:');
    console.log('  ts-node tools/pairs/translate.ts <json-input>');
    console.log('');
    console.log('Examples:');
    console.log('  ts-node tools/pairs/translate.ts \'{"pattern": "map▶filter", "predicate": "isEven", "function": "square"}\'');
    console.log('  ts-node tools/pairs/translate.ts \'{"pattern": "split▶merge", "predicate": "isPositive"}\'');
    console.log('');
    console.log('Available patterns:');

    try {
      const pairsDoc = loadPairsDoc();
      for (const entry of pairsDoc.pairs) {
        console.log(`  ${entry.pattern} -> ${entry.alias}`);
      }
    } catch (error) {
      console.error(`Failed to load patterns: ${error}`);
    }

    process.exit(0);
  }

  try {
    const inputJson = args[0];
    if (!inputJson) {
      console.error('Error: JSON input required');
      process.exit(1);
    }
    const input: TwoGramInput = JSON.parse(inputJson);

    if (!input.pattern) {
      console.error('Error: Input must include "pattern" field');
      process.exit(1);
    }

    const result = translate(input);

    if (!result) {
      console.error(`Error: Pattern "${input.pattern}" not found in pairs.yaml`);
      process.exit(1);
    }

    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('Error: Invalid JSON input');
    } else {
      console.error(`Error: ${error}`);
    }
    process.exit(1);
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  main();
}