#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * Load rate limiting policy
 */
function loadPolicy() {
  // For simplicity, using hardcoded policy since TOML parsing requires deps
  return {
    limits: {
      window_days: 7,
      weekly_cap: 20,
      daily_burst: 5
    },
    global: {
      hourly_cap: 10,
      daily_cap: 50,
      weekly_cap: 200
    },
    exemptions: {
      stewards: [
        'did:plc:pure-lambda-steward-1',
        'did:plc:pure-lambda-steward-2'
      ],
      trusted: ['did:plc:trusted-contributor-1'],
      trusted_multiplier: 2.0
    },
    actions: {
      on_limit_exceeded: 'quarantine',
      notify_stewards: true,
      cool_down_hours: 24
    }
  };
}

/**
 * Load ingest receipts and extract submission data
 */
function loadIngestHistory() {
  const receiptsDir = path.join(projectRoot, 'receipts', 'ingest');
  const history = [];

  if (!fs.existsSync(receiptsDir)) {
    return history;
  }

  const files = fs.readdirSync(receiptsDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse(); // Most recent first

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(receiptsDir, file), 'utf8');
      const receipt = JSON.parse(content);

      if (receipt.timestamp || receipt.ts) {
        history.push({
          timestamp: new Date(receipt.timestamp || receipt.ts),
          did: receipt.operator?.did || 'unknown',
          seeds_count: receipt.seeds_added?.length || 1,
          file: file
        });
      }
    } catch (error) {
      console.warn(`Failed to parse receipt ${file}:`, error.message);
    }
  }

  return history;
}

/**
 * Calculate rate limit status for a DID
 */
function calculateRateLimitStatus(did, history, policy) {
  const now = new Date();

  // Check exemptions
  if (policy.exemptions.stewards.includes(did)) {
    return { ok: true, reason: 'Steward exemption', exempt: true };
  }

  // Calculate multiplier for trusted contributors
  let multiplier = 1.0;
  if (policy.exemptions.trusted.includes(did)) {
    multiplier = policy.exemptions.trusted_multiplier;
  }

  // Filter history for this DID
  const didHistory = history.filter(h => h.did === did);

  // Calculate windows
  const hourAgo = new Date(now - 60 * 60 * 1000);
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now - policy.limits.window_days * 24 * 60 * 60 * 1000);

  // Count submissions in each window
  const hourlyCount = didHistory
    .filter(h => h.timestamp > hourAgo)
    .reduce((sum, h) => sum + h.seeds_count, 0);

  const dailyCount = didHistory
    .filter(h => h.timestamp > dayAgo)
    .reduce((sum, h) => sum + h.seeds_count, 0);

  const weeklyCount = didHistory
    .filter(h => h.timestamp > weekAgo)
    .reduce((sum, h) => sum + h.seeds_count, 0);

  // Check against limits (with multiplier)
  const limits = {
    hourly: policy.global.hourly_cap * multiplier,
    daily: Math.min(policy.limits.daily_burst, policy.global.daily_cap) * multiplier,
    weekly: policy.limits.weekly_cap * multiplier
  };

  if (hourlyCount >= limits.hourly) {
    return {
      ok: false,
      reason: `RATE_LIMIT: Hourly limit exceeded (${hourlyCount}/${limits.hourly})`,
      cooldown_until: new Date(now.getTime() + 60 * 60 * 1000)
    };
  }

  if (dailyCount >= limits.daily) {
    return {
      ok: false,
      reason: `RATE_LIMIT: Daily burst limit exceeded (${dailyCount}/${limits.daily})`,
      cooldown_until: new Date(now.getTime() + policy.actions.cool_down_hours * 60 * 60 * 1000)
    };
  }

  if (weeklyCount >= limits.weekly) {
    return {
      ok: false,
      reason: `RATE_LIMIT: Weekly cap exceeded (${weeklyCount}/${limits.weekly})`,
      cooldown_until: weekAgo // Next week
    };
  }

  return {
    ok: true,
    reason: 'Within limits',
    usage: {
      hourly: `${hourlyCount}/${limits.hourly}`,
      daily: `${dailyCount}/${limits.daily}`,
      weekly: `${weeklyCount}/${limits.weekly}`
    }
  };
}

/**
 * Check global rate limits
 */
function checkGlobalLimits(history, policy) {
  const now = new Date();
  const hourAgo = new Date(now - 60 * 60 * 1000);
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const hourlyTotal = history
    .filter(h => h.timestamp > hourAgo)
    .reduce((sum, h) => sum + h.seeds_count, 0);

  const dailyTotal = history
    .filter(h => h.timestamp > dayAgo)
    .reduce((sum, h) => sum + h.seeds_count, 0);

  const weeklyTotal = history
    .filter(h => h.timestamp > weekAgo)
    .reduce((sum, h) => sum + h.seeds_count, 0);

  if (hourlyTotal >= policy.global.hourly_cap) {
    return {
      ok: false,
      reason: `GLOBAL_RATE_LIMIT: System hourly limit (${hourlyTotal}/${policy.global.hourly_cap})`
    };
  }

  if (dailyTotal >= policy.global.daily_cap) {
    return {
      ok: false,
      reason: `GLOBAL_RATE_LIMIT: System daily limit (${dailyTotal}/${policy.global.daily_cap})`
    };
  }

  if (weeklyTotal >= policy.global.weekly_cap) {
    return {
      ok: false,
      reason: `GLOBAL_RATE_LIMIT: System weekly limit (${weeklyTotal}/${policy.global.weekly_cap})`
    };
  }

  return {
    ok: true,
    global_usage: {
      hourly: `${hourlyTotal}/${policy.global.hourly_cap}`,
      daily: `${dailyTotal}/${policy.global.daily_cap}`,
      weekly: `${weeklyTotal}/${policy.global.weekly_cap}`
    }
  };
}

/**
 * Main rate limit check
 */
function checkRateLimit(did = null) {
  const policy = loadPolicy();
  const history = loadIngestHistory();

  const result = {
    timestamp: new Date().toISOString(),
    policy: 'fed-rate',
    did: did
  };

  // Check global limits first
  const globalStatus = checkGlobalLimits(history, policy);
  if (!globalStatus.ok) {
    return {
      ...result,
      ok: false,
      reason: globalStatus.reason,
      action: policy.actions.on_limit_exceeded
    };
  }

  // If DID provided, check per-DID limits
  if (did) {
    const didStatus = calculateRateLimitStatus(did, history, policy);
    return {
      ...result,
      ...didStatus,
      global: globalStatus.global_usage
    };
  }

  // No DID, just return global status
  return {
    ...result,
    ok: true,
    ...globalStatus
  };
}

/**
 * Generate rate limit report
 */
function generateReport() {
  const policy = loadPolicy();
  const history = loadIngestHistory();
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // Group by DID
  const byDID = {};
  for (const entry of history) {
    if (entry.timestamp > weekAgo) {
      if (!byDID[entry.did]) {
        byDID[entry.did] = {
          did: entry.did,
          submissions: 0,
          seeds: 0,
          first: entry.timestamp,
          last: entry.timestamp
        };
      }
      byDID[entry.did].submissions++;
      byDID[entry.did].seeds += entry.seeds_count;
      if (entry.timestamp < byDID[entry.did].first) {
        byDID[entry.did].first = entry.timestamp;
      }
      if (entry.timestamp > byDID[entry.did].last) {
        byDID[entry.did].last = entry.timestamp;
      }
    }
  }

  // Check each DID's status
  const report = {
    generated: now.toISOString(),
    window_days: policy.limits.window_days,
    contributors: []
  };

  for (const did in byDID) {
    const status = calculateRateLimitStatus(did, history, policy);
    report.contributors.push({
      ...byDID[did],
      status: status.ok ? 'ok' : 'limited',
      usage: status.usage,
      exempt: status.exempt || false
    });
  }

  // Sort by seeds descending
  report.contributors.sort((a, b) => b.seeds - a.seeds);

  return report;
}

// CLI interface
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log('Pure Lambda Federation Rate Limiter');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/fed/rate.mjs [did]        # Check rate limit');
    console.log('  node scripts/fed/rate.mjs --report    # Generate usage report');
    console.log('  node scripts/fed/rate.mjs --help      # Show this help');
    return;
  }

  if (args.includes('--report')) {
    const report = generateReport();
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Check rate limit for DID if provided
  const did = args[0] && !args[0].startsWith('--') ? args[0] : null;
  const result = checkRateLimit(did);

  // Output JSON result
  console.log(JSON.stringify(result, null, 2));

  // Exit with appropriate code
  process.exit(result.ok ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkRateLimit, loadIngestHistory, generateReport };