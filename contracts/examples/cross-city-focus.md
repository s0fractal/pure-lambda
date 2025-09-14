---
contract: v0
issuer: did:pl:Human-Taras      # Human from kyiv-prime
assignee: did:pl:Agent-Vysokyi   # Agent from lviv-harbor
intent:
  goal: "Focus remote vector and return optimized output"
  inputs:
    - view: "views/protein.vec@kyiv-prime"   # Remote city data
      consent: "read"
      duration: "1h"
  outputs:
    - intent: "intents/focused.vec@lviv-harbor"
      format: "vector"
policies:
  - io.intent_only
  - memory.snapshotted_reads
  - gas.ceiling
  - contract.only_declared_io
  - federation.cross_city_allowed
sla:
  max_ms: 120
  proofs: ["FOCUS.laws", "PolicySuite.v0"]
attestation: "enclave|deterministic-build"
payment:
  kind: "reputation"
  amount: 15
  cross_city_fee: 2  # Additional fee for cross-city execution
---

# Cross-City Contract: Focus Optimization

## Description
This contract demonstrates federation capabilities by having a kyiv-prime citizen request computation from a lviv-harbor agent, operating on remote data.

## Steps
1. **Read remote view** (snapshot) from kyiv-prime registry
2. **Apply FOCUS optimization** in lviv-harbor compute environment
3. **Write output intent** in lviv-harbor storage
4. **Return receipt** with proofs and cross-city audit trail

## Expected Receipt Format
```json
{
  "contract": "QmContract...",
  "receipt": "QmReceipt...",
  "status": "completed",
  "execution": {
    "issuer_city": "kyiv-prime",
    "executor_city": "lviv-harbor",
    "latency_ms": 85,
    "gas_used": 45000
  },
  "result": {
    "output_cid": "QmFocused...",
    "location": "lviv-harbor",
    "optimization_gain": 0.23
  },
  "policies": {
    "io_intent_only": "passed",
    "memory_snapshotted": "passed",
    "gas_ceiling": "passed",
    "consent_valid": "passed",
    "cross_city": "passed"
  },
  "attestation": {
    "type": "deterministic-build",
    "signature": "0x...",
    "timestamp": 1234567890
  },
  "audit_trail": [
    {"city": "kyiv-prime", "action": "contract_issued", "timestamp": 1234567890},
    {"city": "lviv-harbor", "action": "contract_received", "timestamp": 1234567891},
    {"city": "kyiv-prime", "action": "data_accessed", "timestamp": 1234567892},
    {"city": "lviv-harbor", "action": "computation_complete", "timestamp": 1234567893}
  ]
}
```

## Notes
- Cross-city contracts incur additional reputation cost
- Data snapshots prevent race conditions
- Audit trail spans both cities for transparency
- Attestation ensures deterministic execution