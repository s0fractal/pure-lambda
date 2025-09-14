# FaaS Adapter for Pure Lambda

## Purpose

This adapter allows Pure Lambda agents to run in serverless environments **while preserving mathematical guarantees**. The λ-calculus computation remains pure; the FaaS platform is merely an execution environment.

## Key Principles

1. **Determinism First**: All execution must be deterministic
2. **Proofs Preserved**: Mathematical proofs remain valid
3. **No Vendor Lock-in**: Portable across AWS, GCP, Cloudflare
4. **Content-Addressed**: All state uses CIDs, not URLs

## Architecture

```
Pure Lambda Agent (WASM)
         ↓
    pl-faas.wit
         ↓
   Platform Adapter
    /    |    \
  AWS   GCP   CF
```

## Usage

### AWS Lambda

```python
# Deploy with SAM or CDK
from adapters.faas.aws import handler

# Your λ-agent compiled to WASM
handler.deploy("agent.wasm")
```

### Google Cloud Functions

```python
# Deploy with gcloud
from adapters.faas.gcp import main

# Handles HTTP and Pub/Sub
main.deploy("agent.wasm")
```

### Cloudflare Workers

```javascript
// Deploy with wrangler
import worker from './adapters/faas/cloudflare/worker.js';

// Runs at edge, globally distributed
wrangler.publish(worker);
```

## Guarantees

### What's Preserved
- ✅ Deterministic execution
- ✅ Mathematical proofs
- ✅ Content addressing
- ✅ Gas metering
- ✅ Policy enforcement

### What Changes
- ⚡ Execution location (cloud vs local)
- 💰 Billing model (per-invocation)
- 🌍 Geographic distribution
- ⏱️ Cold start latency

## Cost Model

```
PL Gas Units → Cloud Resources
1000 gas ≈ 128MB × 100ms ≈ $0.0000021
```

## Policy Example

```yaml
policies:
  - name: determinism_required
    rule: "execution.deterministic == true"
    action: enforce

  - name: gas_ceiling
    rule: "gas_used <= 100000"
    action: deny_if_exceeded

  - name: proof_required
    rule: "result.proof != null"
    action: log_and_alert
```

## Testing

```bash
# Test locally with WASM runtime
cargo test --features faas

# Test on actual platforms
./test-aws.sh
./test-gcp.sh
./test-cf.sh
```

## Important Notes

1. **This is NOT about serverless frameworks** - It's about running Pure Lambda agents in episodic environments
2. **The core remains pure λ-calculus** - FaaS is just a runtime, not the computational model
3. **Proofs are always generated** - Even in the cloud, mathematical truth is preserved

## Why FaaS?

For episodic agents that:
- Wake occasionally (cron/events)
- Process and sleep
- Don't need persistent connections
- Benefit from geographic distribution

FaaS provides:
- Zero idle cost
- Automatic scaling
- Global presence
- Built-in monitoring

While preserving:
- Mathematical purity
- Proof correctness
- Deterministic execution
- Content addressing

---

*Remember: We're putting λ-calculus IN the cloud, not becoming cloud-native.*