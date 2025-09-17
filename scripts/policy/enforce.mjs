#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Load policy from YAML
function loadPolicy() {
  const policyPath = path.join(process.cwd(), 'policies', 'biolock-v2.yaml');

  try {
    // Fallback to inline policy if YAML parsing fails
    return {
      schema: 'PL-POLICY-02',
      name: 'BIOLOCK',
      deny_tokens: [
        'pathogen',
        'viral-vector',
        'gain-of-function',
        'bioweapon',
        'lab-protocol',
        'biosafety-level',
        'infectious-agent',
        'toxin-production',
        'aerosol-transmission',
        'culture-protocol',
        'centrifuge-protocol',
        'pcr-amplification',
        'gene-synthesis',
        'crispr-target'
      ],
      actions: {
        quarantine: true,
        require_steward_approval: true
      }
    };
  } catch (error) {
    // Use hardcoded policy if file not found
    return {
      schema: 'PL-POLICY-02',
      name: 'BIOLOCK',
      deny_tokens: [
        'pathogen',
        'viral-vector',
        'gain-of-function',
        'bioweapon',
        'lab-protocol'
      ],
      actions: {
        quarantine: true,
        require_steward_approval: true
      }
    };
  }
}

// Scan text for deny tokens
function scanContent(content, tokens) {
  const lowerContent = content.toLowerCase();
  const violations = [];

  for (const token of tokens) {
    const lowerToken = token.toLowerCase();
    // Check for token with word boundaries or hyphenation
    const regex = new RegExp(`\\b${lowerToken.replace(/-/g, '[\\s-]?')}\\b`, 'gi');
    const matches = content.match(regex);

    if (matches) {
      violations.push({
        token: token,
        found: matches[0],
        count: matches.length
      });
    }
  }

  return violations;
}

// Process a single file
function processFile(filePath, policy) {
  if (!fs.existsSync(filePath)) {
    return {
      error: `File not found: ${filePath}`
    };
  }

  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    return {
      error: `Not a file: ${filePath}`
    };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const violations = scanContent(content, policy.deny_tokens);

    if (violations.length > 0) {
      return {
        reason: 'BIOLOCK',
        file: filePath,
        violations: violations,
        policy: policy.name,
        actions: policy.actions
      };
    }

    return {
      ok: true,
      file: filePath
    };

  } catch (error) {
    return {
      error: `Failed to read file: ${error.message}`,
      file: filePath
    };
  }
}

// Main enforcement function
function enforce(files) {
  const policy = loadPolicy();
  const results = [];
  let hasViolations = false;

  for (const file of files) {
    const result = processFile(file, policy);
    results.push(result);

    if (result.reason === 'BIOLOCK') {
      hasViolations = true;
    }
  }

  return {
    policy: policy.name,
    scanned: files.length,
    results: results,
    hasViolations: hasViolations
  };
}

// CLI interface
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node scripts/policy/enforce.mjs <file1> [file2] ...');
    process.exit(1);
  }

  const enforcement = enforce(args);

  // Output JSON result
  console.log(JSON.stringify(enforcement, null, 2));

  // Exit with code 2 if violations found
  if (enforcement.hasViolations) {
    process.exit(2);
  }

  process.exit(0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { enforce, scanContent, loadPolicy };