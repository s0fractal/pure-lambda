# Peering Protocol Specification

## Topics
- `genes` - Gene registry updates
- `proofs` - Policy and law proofs
- `receipts` - Contract execution receipts
- `registry` - Champion leaderboard

## Message Format
All messages are JSON Lines with signatures:
```json
{"topic":"genes","head":"QmXaY...","did":"did:pl:...","sig":"...","ts":1234567890}
```

## Sync Protocol
1. **Advertise**: Node broadcasts new CID heads
2. **Query**: Peers request missing content
3. **Fetch**: Content retrieved and verified
4. **Cache**: Store with TTL based on reputation

## Performance Targets
- Local fetch: <20ms p50
- Network fetch: <200ms p50
- Cache hit rate: >80%

## Security
- All content signed by DID
- Reputation-based prioritization
- Rate limiting per peer