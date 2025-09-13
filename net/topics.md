# P2P Topics and Message Formats

## Gossipsub Topics

### pl.genes
Announces new gene publications
```json
{
  "type": "gene_announce",
  "cid": "bafyrei...",
  "soul": "λ-3f5c7b2a9",
  "name": "FOCUS",
  "version": "1.0.0",
  "did": "did:pl:...",
  "sig": "...",
  "ts": 1736812345
}
```

### pl.proofs
Announces new proof witnesses
```json
{
  "type": "proof_announce",
  "gene_cid": "bafyrei...",
  "suite": "FOCUS.laws",
  "proof_cid": "bafyrei...",
  "did": "did:pl:...",
  "sig": "...",
  "ts": 1736812345
}
```

### pl.receipts
Announces contract execution receipts
```json
{
  "type": "receipt_announce",
  "contract_cid": "bafyrei...",
  "receipt_cid": "bafyrei...",
  "agent": "did:pl:...",
  "success": true,
  "sig": "...",
  "ts": 1736812345
}
```

### pl.registry
Announces registry updates
```json
{
  "type": "registry_update",
  "head_cid": "bafyrei...",
  "changes": [
    {"gene": "FOCUS", "rank": 1, "score": 0.89}
  ],
  "did": "did:pl:RegistryService",
  "sig": "...",
  "ts": 1736812345
}
```

### pl.governance
Announces RFCs and voting results
```json
{
  "type": "rfc_announce",
  "rfc_id": 12,
  "title": "Enable map-map-fusion",
  "cid": "bafyrei...",
  "proposer": "did:pl:...",
  "sig": "...",
  "ts": 1736812345
}
```

## DHT Keys

Content is keyed in the DHT using normalized paths:

- `/pl/gene/<soul>/<version>` → CID
- `/pl/proof/<gene_cid>/<suite>` → CID  
- `/pl/receipt/<contract_cid>/<agent_did>/<timestamp>` → CID
- `/pl/registry/head` → CID
- `/pl/governance/rfc/<id>` → CID

## Message Validation

All messages must:
1. Have valid DID signatures
2. Reference existing CIDs (except announcements)
3. Include timestamps within 5 minutes of current time
4. Not exceed 1KB in size

## Rate Limiting

Per peer per topic:
- Announcements: 10/minute
- Queries: 100/minute
- Fetches: 1000/minute

## CAR Bundle Format

For offline/CI usage, related objects bundled as:
```
header.car
├── root CID (registry head)
├── genes/
│   ├── FOCUS
│   ├── OBSERVE
│   └── REDUCE
├── proofs/
│   └── FOCUS.laws
└── receipts/
    └── recent executions
```