# Intent Marketplace

Decentralized marketplace for matching contract issuers with capable agents.

## Protocol

### 1. Offer
Issuer posts contract to market:
```json
{
  "type": "offer",
  "contract_cid": "Qm...",
  "price": 10,
  "ttl": 3600,
  "issuer": "did:pl:Alice",
  "sig": "..."
}
```

### 2. Bid
Agents bid on contracts:
```json
{
  "type": "bid",
  "contract_cid": "Qm...",
  "did": "did:pl:AgentX",
  "est_ms": 35,
  "reputation": 0.89,
  "sig": "..."
}
```

### 3. Match
Matching algorithm selects winner:
- Score = reputation / est_ms
- Must meet SLA requirements
- Highest score wins

### 4. Execute
Winner executes contract and submits receipt.

## Reputation System

- Successful execution: +points from payment
- SLA violation: -20% reputation
- Failed proofs: -50% reputation
- No response: -10% reputation

## Anti-Sybil

- Minimum reputation to bid: 0.1
- Reputation stake: 10% of bid
- Cooldown after failures: 1 hour