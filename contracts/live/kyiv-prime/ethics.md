---
contract: v0
issuer: did:pl:Human-Ivan
assignee: did:pl:Agent-Carpathian
intent:
  goal: "Define ethical guidelines"
  inputs: ["policies/ethics.yaml"]
  outputs: ["guidelines/ethics.md"]
policies: ["io.intent_only", "consensus.required"]
sla: {max_ms: 3000}
payment: {kind: "reputation", amount: 15}
---
Define how we treat each other.
