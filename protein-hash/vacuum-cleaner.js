#!/usr/bin/env node
/**
 * Protein-Hash Vacuum Cleaner v0
 *
 * Жорсткий ресет: зрізаємо залежності → Basis-NF → dedupe → архів
 * 60 хвилин на чистку всього генобанку
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// === BASIS-NF OPCODES ===
const OPCODES = {
  LAM: 0x00,   // λ-abstraction
  APP: 0x01,   // application
  VAR: 0x02,   // variable (de Bruijn)
  LIT: 0x03,   // literal
  PAIR: 0x04,  // pair constructor
  FST: 0x05,   // first projection
  SND: 0x06,   // second projection
  FIX: 0x07    // fixed point
};

/**
 * Convert λ-term to dependency-free OpSeq
 */
function toBasisNF(source) {
  // Simplified: parse JS function to minimal IR
  // Real implementation would do full λ-lifting + de Bruijn conversion

  // Extract function body and parameters
  const funcStr = source.toString();
  const paramMatch = funcStr.match(/\(([^)]*)\)/);
  const bodyMatch = funcStr.match(/=>\s*(.+)/);

  if (!paramMatch || !bodyMatch) {
    return [OPCODES.LIT, hashString(funcStr)]; // Fallback to literal
  }

  const params = paramMatch[1].split(',').map(p => p.trim()).filter(Boolean);
  const body = bodyMatch[1].trim();

  let opseq = [];

  // Add λ abstractions for each parameter
  for (let i = 0; i < params.length; i++) {
    opseq.push(OPCODES.LAM);
  }

  // Simplified body compilation
  if (body.includes('+')) {
    opseq.push(OPCODES.APP, OPCODES.APP);
    opseq.push(OPCODES.LIT, hashString('add'));
    opseq.push(OPCODES.VAR, 0);
    opseq.push(OPCODES.VAR, 1);
  } else if (body.includes('*')) {
    opseq.push(OPCODES.APP, OPCODES.APP);
    opseq.push(OPCODES.LIT, hashString('mul'));
    opseq.push(OPCODES.VAR, 0);
    opseq.push(OPCODES.VAR, 1);
  } else {
    // Generic term
    opseq.push(OPCODES.VAR, 0);
  }

  return opseq;
}

/**
 * Calculate basis normal form protein-hash
 */
function phashNF(opseq) {
  const prefix = Buffer.from('pl/ph2-basisnf-v0', 'utf8');
  const opseqBytes = Buffer.from(opseq);
  const combined = Buffer.concat([prefix, opseqBytes]);

  return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 44);
}

/**
 * Hash string for literals
 */
function hashString(str) {
  return crypto.createHash('sha256').update(str).digest()[0];
}

/**
 * Discover all proteins in codebase
 */
function discoverProteins(dir = '.') {
  const proteins = [];

  function scanDir(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir);

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          scanDir(fullPath);
        } else if (entry.endsWith('.js') || entry.endsWith('.ts')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');

            // Extract function definitions (simplified)
            const funcMatches = content.match(/(?:const|function)\s+(\w+)\s*[=:]?\s*(?:\([^)]*\)\s*=>|function[^{]*{)/g);

            if (funcMatches) {
              funcMatches.forEach(match => {
                const nameMatch = match.match(/(?:const|function)\s+(\w+)/);
                if (nameMatch) {
                  proteins.push({
                    name: nameMatch[1],
                    file: fullPath,
                    source: match,
                    size: match.length
                  });
                }
              });
            }
          } catch (err) {
            // Skip files we can't read
          }
        }
      }
    } catch (err) {
      // Skip directories we can't access
    }
  }

  scanDir(dir);
  return proteins;
}

/**
 * Main vacuum cleaning process
 */
function vacuum() {
  console.log('🧹 PROTEIN-HASH VACUUM CLEANER v0');
  console.log('=' .repeat(50));

  // 1. INVENTORY (10 min)
  console.log('1. 📋 Inventory scan...');
  const proteins = discoverProteins();
  console.log(`   Found ${proteins.length} protein candidates`);

  // Convert to Basis-NF
  const normalized = proteins.map(p => {
    try {
      const opseq = toBasisNF(p.source);
      const phash = phashNF(opseq);

      return {
        ...p,
        opseq,
        phash_nf: phash,
        opseq_size: opseq.length
      };
    } catch (err) {
      return {
        ...p,
        opseq: [OPCODES.LIT, 0],
        phash_nf: 'error-' + Math.random().toString(36).substr(2, 8),
        opseq_size: 2,
        error: err.message
      };
    }
  });

  // 2. EXACT DEDUP (10 min)
  console.log('2. 🔍 Exact deduplication...');
  const groups = new Map();

  normalized.forEach(p => {
    const key = p.phash_nf;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(p);
  });

  // Find canonical (shortest) for each group
  const canonical = new Map();
  const aliases = new Map();

  groups.forEach((group, phash) => {
    if (group.length === 1) {
      canonical.set(phash, group[0]);
    } else {
      // MDL-pruning: pick shortest OpSeq
      const winner = group.reduce((a, b) =>
        a.opseq_size < b.opseq_size ? a :
        a.opseq_size === b.opseq_size && a.name < b.name ? a : b
      );

      canonical.set(phash, winner);

      group.forEach(p => {
        if (p !== winner) {
          aliases.set(p.name, phash);
        }
      });
    }
  });

  console.log(`   Before: ${proteins.length} proteins`);
  console.log(`   After: ${canonical.size} canonical`);
  console.log(`   Duplicates removed: ${proteins.length - canonical.size}`);
  console.log(`   Aliases created: ${aliases.size}`);

  // 3. REPORT
  console.log('3. 📊 Analysis report...');

  const sizeDist = Array.from(canonical.values()).map(p => p.opseq_size);
  const avgSize = sizeDist.reduce((a, b) => a + b, 0) / sizeDist.length;

  const topDuplicates = Array.from(groups.entries())
    .filter(([_, group]) => group.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);

  // 4. SAVE RESULTS
  const report = {
    timestamp: new Date().toISOString(),
    before: proteins.length,
    after: canonical.size,
    duplicates_removed: proteins.length - canonical.size,
    avg_opseq_size: Math.round(avgSize * 10) / 10,
    top_duplicate_groups: topDuplicates.map(([phash, group]) => ({
      phash_nf: phash,
      count: group.length,
      names: group.map(p => p.name),
      canonical: group.reduce((a, b) => a.opseq_size < b.opseq_size ? a : b).name
    }))
  };

  fs.writeFileSync('protein-hash/vacuum-report.json', JSON.stringify(report, null, 2));

  // Save aliases map
  const aliasMap = Object.fromEntries(aliases);
  fs.writeFileSync('protein-hash/aliases.json', JSON.stringify(aliasMap, null, 2));

  // Save canonical proteins
  const canonicalProteins = Object.fromEntries(
    Array.from(canonical.entries()).map(([phash, protein]) => [
      phash, {
        name: protein.name,
        phash_nf: phash,
        opseq_size: protein.opseq_size,
        file: protein.file,
        opseq: protein.opseq
      }
    ])
  );

  fs.writeFileSync('protein-hash/canonical.json', JSON.stringify(canonicalProteins, null, 2));

  console.log('');
  console.log('✅ VACUUM COMPLETE');
  console.log(`📋 Report: protein-hash/vacuum-report.json`);
  console.log(`🗺️  Aliases: protein-hash/aliases.json`);
  console.log(`🧬 Canonical: protein-hash/canonical.json`);

  if (topDuplicates.length > 0) {
    console.log('');
    console.log('🔍 Top duplicate groups:');
    topDuplicates.forEach(([phash, group]) => {
      const canonical = group.reduce((a, b) => a.opseq_size < b.opseq_size ? a : b);
      console.log(`   ${group.length}× → ${canonical.name} (${group.map(p => p.name).join(', ')})`);
    });
  }
}

// Create protein-hash directory if it doesn't exist
if (!fs.existsSync('protein-hash')) {
  fs.mkdirSync('protein-hash');
}

// Run if called directly
if (require.main === module) {
  vacuum();
}

module.exports = { vacuum, toBasisNF, phashNF };