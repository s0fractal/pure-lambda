#!/usr/bin/env node

import fs from 'fs';
import { createHash } from 'crypto';

async function updateIndex() {
  try {
    console.log('📊 Updating snapshots index...');

    const snapshotsDir = 'dist/snapshots';
    fs.mkdirSync(snapshotsDir, { recursive: true });

    const files = fs.readdirSync(snapshotsDir)
      .filter(f => f.endsWith('.car'))
      .sort();

    console.log(`📦 Found ${files.length} CAR files`);

    const entries = [];
    for (const f of files) {
      const path = `${snapshotsDir}/${f}`;
      const buf = fs.readFileSync(path);
      const stat = fs.statSync(path);

      let hash;
      try {
        const { blake3 } = await import('blake3-wasm');
        hash = Buffer.from(await blake3(buf)).toString('hex');
      } catch (e) {
        // Fallback to SHA256
        hash = createHash('sha256').update(buf).digest('hex');
      }

      entries.push({
        date: f.replace('.car', ''),
        path: path,
        size: stat.size,
        modified: stat.mtime.toISOString(),
        blake3_or_sha256: hash
      });

      console.log(`✅ Indexed: ${f} (${stat.size} bytes, ${hash.slice(0, 12)}...)`);
    }

    const index = {
      kind: 'pl/snapshots-index@v1',
      generated: new Date().toISOString(),
      count: entries.length,
      snapshots: entries
    };

    const indexPath = `${snapshotsDir}/index.json`;
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

    console.log(`📊 Index updated: ${indexPath}`);

  } catch (error) {
    console.error('❌ Failed to update index:', error.message);
    process.exit(1);
  }
}

updateIndex();