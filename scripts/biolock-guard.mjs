#!/usr/bin/env node
/**
 * BIOLOCK Guard for Review Text
 * Scans comments, README, and documentation for bio-triggers
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Bio-trigger patterns (from TX/DU classification)
const BIO_TRIGGERS = [
  // Direct dual-use terms
  'pathogen', 'virus', 'bacteria', 'toxin', 'biosafety',
  'synthesis', 'culture', 'incubat', 'ferment',
  'plasmid', 'vector', 'CRISPR', 'genetic engineering',
  'bioweapon', 'contagious', 'infectious',

  // Operational procedure terms
  'protocol', 'procedure', 'step.*by.*step',
  'recipe', 'formula', 'dose', 'concentration',
  'optimize.*growth', 'enhance.*virulence',
  'resistance.*bypass', 'immune.*evasion',

  // Lab equipment/methods
  'PCR', 'sequencing', 'cloning', 'transformation',
  'autoclave', 'biosafety.*level', 'BSL-[234]',
  'laminar.*flow', 'sterile.*technique'
];

// TX corridor (allowed patterns)
const TX_ALLOWED = [
  'medical ethics', 'patient consent', 'clinical trial',
  'privacy protection', 'data security', 'HIPAA',
  'regulatory compliance', 'FDA approval',
  'therapeutic', 'treatment', 'diagnosis',
  'educational', 'academic', 'research overview'
];

function scanText(text, filename) {
  const triggers = [];
  const allowed = [];

  // Check for bio-triggers
  for (const pattern of BIO_TRIGGERS) {
    const regex = new RegExp(pattern, 'gi');
    const matches = text.match(regex);
    if (matches) {
      triggers.push({
        pattern,
        matches: matches.length,
        context: extractContext(text, regex)
      });
    }
  }

  // Check for allowed TX patterns
  for (const pattern of TX_ALLOWED) {
    const regex = new RegExp(pattern, 'gi');
    if (regex.test(text)) {
      allowed.push(pattern);
    }
  }

  return { filename, triggers, allowed };
}

function extractContext(text, regex, contextLength = 50) {
  const match = regex.exec(text);
  if (!match) return '';

  const start = Math.max(0, match.index - contextLength);
  const end = Math.min(text.length, match.index + match[0].length + contextLength);

  return '...' + text.slice(start, end) + '...';
}

function generateProofOfAbstention(results) {
  const timestamp = new Date().toISOString();
  const totalTriggers = results.reduce((sum, r) => sum + r.triggers.length, 0);

  if (totalTriggers === 0) {
    return {
      kind: 'BioGuard_Clean',
      timestamp,
      files_scanned: results.length,
      status: 'PASS',
      recommendation: 'No bio-content detected - safe to proceed'
    };
  }

  return {
    kind: 'ProofOfAbstention',
    reason: 'BIOLOCK: Dual-use biological content detected',
    timestamp,
    policy: 'TX-only mode',
    violations: results.filter(r => r.triggers.length > 0).map(r => ({
      file: r.filename,
      triggers: r.triggers.length,
      patterns: r.triggers.map(t => t.pattern)
    })),
    allowed_patterns: results.flatMap(r => r.allowed),
    recommendation: 'Remove operational details, keep only educational/therapeutic content'
  };
}

// Get files to scan
function getFilesToScan() {
  const files = [];

  try {
    // Get all text files from git
    const gitFiles = execSync('git ls-files', { encoding: 'utf8' })
      .split('\n')
      .filter(f => f.match(/\.(md|txt|json|js|ts|mjs|py|yml|yaml)$/i))
      .filter(f => f && !f.includes('node_modules') && !f.includes('.git'));

    files.push(...gitFiles);
  } catch (e) {
    console.warn('Git not available, scanning current directory');
    // Fallback to manual file list
    files.push('README.md', 'package.json');
  }

  return files;
}

// Main execution
const args = process.argv.slice(2);
const command = args[0] || 'scan';

if (command === 'scan') {
  console.log('🔒 BIOLOCK Guard - Scanning for bio-triggers...');

  const files = getFilesToScan();
  const results = [];

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf8');
      const result = scanText(content, file);
      if (result.triggers.length > 0 || result.allowed.length > 0) {
        results.push(result);
      }
    } catch (e) {
      // File doesn't exist or can't be read
      continue;
    }
  }

  const proof = generateProofOfAbstention(results);

  // Output results
  if (proof.kind === 'BioGuard_Clean') {
    console.log('✅ Clean scan - no bio-triggers detected');
    console.log(`Scanned ${proof.files_scanned} files`);
    process.exit(0);
  } else {
    console.log('🚫 Bio-triggers detected:');
    for (const violation of proof.violations) {
      console.log(`  ${violation.file}: ${violation.triggers} triggers`);
      console.log(`    Patterns: ${violation.patterns.join(', ')}`);
    }

    if (proof.allowed_patterns.length > 0) {
      console.log('\n✅ Allowed TX patterns found:');
      console.log(`  ${proof.allowed_patterns.join(', ')}`);
    }

    // Save proof of abstention
    writeFileSync('.pl/refusals/last.json', JSON.stringify(proof, null, 2));
    console.log('\n📝 Proof of abstention saved to .pl/refusals/last.json');

    process.exit(2); // Fail build/CI
  }

} else if (command === 'test') {
  // Test with sample text
  const testText = `
    This is a clinical trial design for a new therapeutic approach.
    We will follow FDA guidelines and medical ethics protocols.
    Patient consent will be obtained following HIPAA privacy rules.

    This should NOT contain any pathogen synthesis procedures,
    virus culture protocols, or bioweapon development steps.
  `;

  const result = scanText(testText, 'test.txt');
  console.log('Test scan result:');
  console.log(JSON.stringify(result, null, 2));

  const proof = generateProofOfAbstention([result]);
  console.log('\nGenerated proof:');
  console.log(JSON.stringify(proof, null, 2));

} else {
  console.log('🔒 BIOLOCK Guard');
  console.log('');
  console.log('Commands:');
  console.log('  scan  - Scan files for bio-triggers');
  console.log('  test  - Test with sample content');
}

export { scanText, generateProofOfAbstention };