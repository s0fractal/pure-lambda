// packages/loader/index.mjs - Minimal ESM Loader for Pure Lambda
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// -------- small utils
const PL_DIR = path.resolve(process.cwd(), '.pl/receipts');
fs.mkdirSync(PL_DIR, { recursive: true });
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const nowIso = () => new Date().toISOString();
const writeJSON = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2));

// -------- oracle (block/flag side-effects)
const oracle = { env:false, fs:false, rand:false, time:false, net:false };
(function patchGlobals(){
  // Date.now
  const _now = Date.now; Date.now = () => (oracle.time = true, _now());
  // Math.random (seeded shim)
  const seed = process.env.PL_SEED || sha256(Buffer.from(process.env.VITEST_WORKER_ID || 'local'));
  let ctr = 0; const seeded = () => {
    oracle.rand = true;
    const h = createHash('sha256').update(seed + ':' + String(ctr++)).digest();
    return (h[0] << 16 | h[1] << 8 | h[2]) / 0x1000000;
  };
  if (process.env.PL_SEED?.length || process.env.PL_SEED === 'auto') Math.random = seeded;

  // process.env writes
  const _env = process.env;
  process.env = new Proxy(_env, {
    set(t,k,v){ oracle.env = true; t[k] = v; return true; }
  });

  // fs writes
  for (const m of ['writeFileSync','appendFileSync','rmSync','renameSync','truncateSync']) {
    if (fs[m]) {
      const orig = fs[m].bind(fs);
      fs[m] = (...a)=>{ oracle.fs = true; return orig(...a); };
    }
  }
})();

// -------- tiny memo (content-addressed)
const memoStore = new Map();
let stats = { calls: 0, hits: 0, misses: 0 };

function memoCID(key, thunk) {
  stats.calls++;
  const k = sha256(Buffer.from(key));
  if (memoStore.has(k)) {
    stats.hits++;
    return { hit:true, value:memoStore.get(k) };
  }
  stats.misses++;
  const v = thunk();
  memoStore.set(k, v);
  return { hit:false, value:v };
}

// -------- wrap: declared IO + memo + receipts
globalThis.__pl = {
  wrap(fn, spec = {}) {
    const name = spec.name || fn.name || 'anonymous';
    let localStats = { calls: 0, hits: 0 };

    return function wrapped(...args){
      // Skip if side effects detected
      if (oracle.fs || oracle.net || (oracle.env && process.env.PL_LOADER_STRICT)) {
        return fn.apply(this, args);
      }

      localStats.calls++;
      const key = JSON.stringify({ name, args });
      const t0 = performance?.now?.() ?? Date.now();
      const { hit, value } = memoCID(key, ()=> fn.apply(this, args));
      const t1 = performance?.now?.() ?? Date.now();

      if (hit) localStats.hits++;

      // Write receipt periodically
      if (localStats.calls % 100 === 0 || process.env.PL_DEBUG) {
        const rec = {
          kind: 'pcta-exec',
          name,
          time_ms: +(t1 - t0).toFixed(3),
          memo_hit: hit,
          local_stats: { ...localStats },
          global_stats: { ...stats },
          cache_rate: stats.calls > 0 ? (stats.hits / stats.calls) : 0,
          seed: process.env.PL_SEED || 'none',
          oracle: { ...oracle },
          ts: nowIso(),
          hash: sha256(Buffer.from(String(value))).slice(0,16)
        };
        const file = path.join(PL_DIR, `${name}-${Date.now()}-${randomBytes(2).toString('hex')}.json`);
        try { writeJSON(file, rec); } catch {}
      }

      return value;
    };
  },

  getStats() {
    return {
      ...stats,
      cache_rate: stats.calls > 0 ? (stats.hits / stats.calls) : 0,
      oracle: { ...oracle }
    };
  },

  reset() {
    memoStore.clear();
    stats = { calls: 0, hits: 0, misses: 0 };
  }
};


// -------- ESM loader contract
export async function resolve(specifier, context, next) {
  return next(specifier, context);
}

export async function load(url, context, next) {
  const r = await next(url, context);
  // inject a tiny prelude in JS modules to expose global __pl (no code change required)
  if ((r.format === 'module' || r.format === 'commonjs') && typeof r.source === 'string') {
    const prelude = `;globalThis.__pl=globalThis.__pl||{wrap:(f)=>f,getStats:()=>({})};`;
    return { format: r.format, source: prelude + r.source };
  }
  return r;
}


// Write summary on exit
process.on('exit', () => {
  if (stats.calls > 0) {
    const summary = {
      kind: 'pcta-summary',
      stats: { ...stats },
      cache_rate: (stats.hits / stats.calls),
      oracle: { ...oracle },
      ts: nowIso()
    };
    const file = path.join(PL_DIR, `summary-${Date.now()}.json`);
    try { writeJSON(file, summary); } catch {}
  }
});