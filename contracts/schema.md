# ProofMD Contract Schema v0

## Contract Format

Markdown file with YAML frontmatter containing contract specification.

```yaml
---
contract: v0
issuer: did:pl:Alice            # Human/organization DID
assignee: did:pl:AgentX         # Agent DID executing contract
intent:
  goal: "High-level description of desired outcome"
  inputs:
    - view: "path/to/input"     # Read-only data
    - view: "path/to/config"
  outputs:
    - intent: "path/to/output"  # Where to write results
policies:                       # Required policy compliance
  - io.intent_only
  - memory.snapshotted_reads
  - gas.ceiling
sla:
  max_ms: 50                    # Maximum execution time
  proofs: ["FOCUS.laws"]        # Required proof witnesses
payment:
  kind: "reputation"            # or "token", "fiat" (future)
  amount: 10                    # Reputation points
---

# Contract Body

## Steps
1. Detailed step-by-step instructions
2. Expected transformations
3. Success criteria

## Verification
- How to verify correct execution
- Test cases or examples
```

## Receipt Schema

After execution, agent produces signed receipt:

```json
{
  "contract_cid": "Qm...",
  "agent": "did:pl:AgentX",
  "started_at": 1736812345678,
  "finished_at": 1736812345712,
  "outputs": [
    {
      "intent": "path/to/output",
      "cid": "Qm..."
    }
  ],
  "policy_report": {
    "ok": true,
    "violations": []
  },
  "proofs": [
    {
      "name": "FOCUS.laws",
      "cid": "Qm...",
      "witnessed": true
    }
  ],
  "metrics": {
    "p50_ms": 0.9,
    "gas_used": 9412,
    "allocs": 4
  },
  "signatures": [
    {
      "did": "did:pl:AgentX",
      "sig": "base64...",
      "timestamp": 1736812345712
    }
  ]
}
```

## Validation Rules

1. **Policy Compliance**: All listed policies must pass
2. **SLA Adherence**: Execution time ≤ max_ms
3. **Proof Requirements**: All required proofs must be witnessed
4. **Signature Validity**: Receipt must be signed by assignee
5. **Output Completeness**: All declared outputs must have CIDs