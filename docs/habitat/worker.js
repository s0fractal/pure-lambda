// LLM Habitat Worker - Isolated WebWorker for seed generation
// OFF by default - requires explicit enable in config/llm.toml

// BIOLOCK safety checks
const BIOLOCK_PATTERNS = [
  /exploit/i,
  /malware/i,
  /ransomware/i,
  /backdoor/i,
  /trojan/i,
  /keylogger/i,
  /rootkit/i,
  /botnet/i,
  /cryptominer/i,
  /\bexec\b/i,
  /\beval\b/i,
  /Function\s*\(/i
];

function checkBiolock(input) {
  const text = JSON.stringify(input);
  for (const pattern of BIOLOCK_PATTERNS) {
    if (pattern.test(text)) {
      return { blocked: true, reason: `Pattern matched: ${pattern}` };
    }
  }
  return { blocked: false };
}

// Resource tracking
let startTime = Date.now();
let operationCount = 0;
const MAX_OPERATIONS = 1000;
const MAX_RUNTIME_MS = 300000; // 5 minutes

function checkResourceLimits() {
  operationCount++;

  if (operationCount > MAX_OPERATIONS) {
    throw new Error("Operation limit exceeded");
  }

  if (Date.now() - startTime > MAX_RUNTIME_MS) {
    throw new Error("Runtime limit exceeded");
  }
}

// Seed generation (mock - would call LLM API in real implementation)
function generateSeed(pattern, params) {
  checkResourceLimits();

  const biolock = checkBiolock({ pattern, params });
  if (biolock.blocked) {
    return { error: "BIOLOCK", reason: biolock.reason };
  }

  // Mock seed generation
  const templates = {
    "select-focus": {
      strategy: "weighted_score",
      weights: { latency: 0.4, throughput: 0.3, reliability: 0.3 }
    },
    "bounded-delay": {
      min_delay_ms: 10,
      max_delay_ms: 1000,
      backoff_factor: 1.5
    },
    "route-audit": {
      sample_rate: 0.1,
      metrics: ["latency_p99", "error_rate", "throughput"],
      alert_threshold: 0.95
    },
    "scan-metrics": {
      window_size: 60,
      aggregation: "avg",
      emit_interval: 10
    }
  };

  const seed = {
    name: params.name || `${pattern}-${Date.now()}`,
    pattern: pattern,
    version: "1",
    xidv2: "xid2:" + Math.random().toString(36).substring(2, 18),
    params: templates[pattern] || {},
    metadata: {
      novelty: Math.random() * 0.5 + 0.3,
      generated_at: new Date().toISOString(),
      habitat_version: "0.1.0"
    }
  };

  // Apply user params
  if (params.threshold) {
    seed.params.threshold = params.threshold;
  }

  return seed;
}

// Message handling
self.onmessage = function(e) {
  try {
    checkResourceLimits();

    const { type, ...data } = e.data;

    switch(type) {
      case "init":
        self.postMessage({ type: "ready", data: { version: "0.1.0" } });
        break;

      case "generate":
        const start = performance.now();
        const seed = generateSeed(data.pattern, data.params || {});

        if (seed.error === "BIOLOCK") {
          self.postMessage({ type: "biolock", data: { reason: seed.reason } });
        } else {
          const time = performance.now() - start;
          self.postMessage({ type: "seed", data: { ...seed, time } });
        }
        break;

      case "metrics":
        // Estimate memory usage (not accurate in workers)
        const metrics = {
          operations: operationCount,
          runtime: Date.now() - startTime,
          memory: 1024 * 1024 * 10 // Mock 10MB
        };
        self.postMessage({ type: "metrics", data: metrics });
        break;

      default:
        self.postMessage({
          type: "error",
          data: { message: `Unknown command: ${type}` }
        });
    }

  } catch (error) {
    self.postMessage({
      type: "error",
      data: { message: error.message }
    });

    // Self-terminate on critical errors
    if (error.message.includes("limit exceeded")) {
      self.close();
    }
  }
};

// Heartbeat to check limits
setInterval(() => {
  try {
    checkResourceLimits();
  } catch (error) {
    self.postMessage({
      type: "error",
      data: { message: `Auto-terminating: ${error.message}` }
    });
    self.close();
  }
}, 10000);