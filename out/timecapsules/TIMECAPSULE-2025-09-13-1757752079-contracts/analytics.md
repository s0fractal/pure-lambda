---
contract: v0
issuer: did:pl:Human-Taras
assignee: did:pl:Agent-Dnipro
intent:
  goal: "Analyze city health"
  inputs: ["metrics/status.json"]
  outputs: ["reports/health.json"]
policies: ["io.intent_only", "gas.ceiling"]
sla: {max_ms: 1000}
payment: {kind: "reputation", amount: 5}
---
Check vital signs of kyiv-prime.
