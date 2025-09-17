#!/usr/bin/env node

import { createHash } from 'crypto';

const hex2bytes = h => Buffer.from(h.replace(/^0x/, ''), 'hex');

export function hamming(aHex, bHex) {
  const a = hex2bytes(aHex), b = hex2bytes(bHex);
  const n = Math.min(a.length, b.length);
  let d = 0;
  for (let i = 0; i < n; i++) {
    d += (a[i] ^ b[i]).toString(2).replace(/0/g, '').length;
  }
  return d + Math.max(a.length, b.length) - n; // невідповідні байти як повний розбіг
}

// простий структурний підпис: мультисет атомів + градуювання глибини
export function structuralSignature(seed) {
  const g = seed.graph ?? seed.operon ?? seed.nodes ? seed : {};
  const nodes = g.nodes ?? [];
  const edges = g.edges ?? [];

  // Витягуємо операції/атоми з вузлів
  const atoms = nodes.map(n => n.op || n.atom || n._type || 'UNK').sort();

  // Обчислюємо глибину графа
  const depth = Math.max(0, ...nodes.map(n => n.depth ?? 0));

  // Структурний підпис
  const shape = `${atoms.join(',')}|E=${edges.length}|D=${depth}|N=${nodes.length}`;

  try {
    return createHash('sha256').update(shape).digest('hex');
  } catch (e) {
    // Fallback для випадків, коли blake3 недоступний
    return createHash('sha256').update(shape).digest('hex');
  }
}

export function similarity(a, b) {
  // 0..1: 1 = ідентично
  const sA = structuralSignature(a);
  const sB = structuralSignature(b);
  const sHam = hamming(sA, sB);
  const sMax = (Math.max(sA.length, sB.length) / 2) * 8; // біти
  const sSim = Math.max(0, 1 - (sHam / sMax));

  // XIDv2 схожість
  const xA = a.meta?.xidv2 || a.meta?.XIDv2 || a.xidv2 || a.xid;
  const xB = b.meta?.xidv2 || b.meta?.XIDv2 || b.xidv2 || b.xid;

  let xSim = 0.5; // default якщо немає XID
  if (xA && xB && typeof xA === 'string' && typeof xB === 'string') {
    const xHam = hamming(xA, xB);
    const xMax = Math.max(hex2bytes(xA).length, hex2bytes(xB).length) * 8;
    xSim = Math.max(0, 1 - (xHam / xMax));
  }

  // Ваги: структура важливіша за хеш
  return 0.7 * sSim + 0.3 * xSim;
}

// CLI для тестування
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [,, fileA, fileB] = process.argv;
  if (!fileA || !fileB) {
    console.error('Usage: node similarity.mjs <seedA.json> <seedB.json>');
    process.exit(1);
  }

  try {
    const fs = await import('fs');
    const a = JSON.parse(fs.readFileSync(fileA, 'utf8'));
    const b = JSON.parse(fs.readFileSync(fileB, 'utf8'));
    const sim = similarity(a, b);
    console.log(`Similarity: ${sim.toFixed(3)} (${(sim * 100).toFixed(1)}%)`);
    console.log(`Structural: ${structuralSignature(a).slice(0, 12)}... vs ${structuralSignature(b).slice(0, 12)}...`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}