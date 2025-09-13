# City Kit - Deploy Your Own Pure Lambda City

## Quick Start (15 minutes)

```bash
# 1. Clone and prepare
git clone https://github.com/s0fractal/pure-lambda.git
cd pure-lambda
cp deploy/city-kit/.env.example .env

# 2. Create Genesis Bundle
make genesis

# 3. Deploy city
make deploy CITY_NAME=my-city

# 4. Verify
make city-status
```

Your city is now online! 🏙️

## Architecture

Each city consists of:
- **1 IPFS node** - Content addressing and P2P
- **3 Agent nodes** - Chamber A (computational agents)
- **2 Human nodes** - Chamber H (human representatives)
- **1 Observer** - Metrics, traces, and dashboards

## Access Points

- **IPFS Gateway**: http://localhost:8080
- **Node APIs**: http://localhost:7001-7003 (agents), 7101-7102 (humans)
- **Metrics**: http://localhost:9090/metrics
- **Dashboard**: http://localhost:3000 (admin/admin)
- **Traces**: http://localhost:4317 (OTLP)

## First Steps

### 1. Create Your DID
```bash
./tools/keygen.sh
# Save your DID and private key securely
```

### 2. Submit Your First Contract
```bash
# Use template
cp embassy/humans/contract-template.md my-contract.md
# Edit with your intent
vim my-contract.md
# Submit
./tools/submit-contract.sh my-contract.md
```

### 3. Vote on Governance
```bash
# List open RFCs
./tools/list-rfcs.sh
# Vote
./tools/vote.sh RFC_ID=42 VOTE=yes
```

### 4. Monitor City Health
```bash
# Real-time metrics
watch -n 5 'make metrics'

# Check policy compliance
make audit

# View logs
make logs
```

## City Management

### Scaling
```bash
# Add more nodes
docker-compose up -d --scale pl-node=5

# Add human representatives
docker-compose up -d --scale pl-human=3
```

### Backup
```bash
# Create time capsule
make capsule

# Automated backups (every 6 hours)
systemctl enable pl-backup.timer
```

### Updates
```bash
# Dual-run migration
make migrate FROM=v1.0.0 TO=v1.1.0

# Monitor migration
make migration-status
```

## Troubleshooting

### Node won't sync
```bash
# Check IPFS connectivity
docker exec my-city-ipfs ipfs swarm peers

# Force resync
docker restart my-city-node-1
```

### Policy violations
```bash
# Check which policies failed
make audit

# View detailed trace
./tools/trace-violation.sh RECEIPT_CID
```

### Network partition
```bash
# Run healing procedure
./playbooks/partition-heal.sh
```

## Advanced Configuration

### Custom Policies
1. Add policy to `policies/custom.yaml`
2. Restart nodes: `docker-compose restart`
3. Verify: `make audit`

### External Adapters
1. Build adapter following `adapters/spec.wit`
2. Deploy with attestation
3. Grant capabilities via contract

### Join Federation
1. Get federation bootstrap peers
2. Add to `.env`: `BOOTSTRAP_PEERS=...`
3. Restart with federation: `make deploy FEDERATION=true`

## Civic Tests

Ensure your city is healthy:
```bash
make civic-test
```

This runs:
1. Genesis sync verification
2. Contract execution test
3. Resilience test (2/5 node failure)
4. Governance vote simulation
5. Privacy compliance check

## Monitoring

### Dashboards
- **Governance**: RFC voting, chamber balance
- **Performance**: Latency, throughput, gas usage
- **Health**: Node status, policy compliance
- **Federation**: Peer count, sync status

### Alerts
Configure in `observability/alerts.yml`:
- Policy violations
- Node failures
- Consensus splits
- Performance degradation

## Security

### Key Management
- Store DIDs in hardware wallets (production)
- Rotate keys annually
- Use separate keys for voting vs operations

### Attestation
- Enable enclave mode for sensitive contracts
- Verify all receipts include attestation
- Check module measurements match

## Contributing

### Report Issues
https://github.com/s0fractal/pure-lambda/issues

### Submit RFCs
1. Fork repository
2. Create RFC following template
3. Submit PR to `governance/rfc/`

### Run Your Own City
1. Deploy using this kit
2. Register in federation
3. Contribute to genesis bundle

## Resources

- [Constitution](../../governance/constitution.md)
- [Contract Templates](../../embassy/humans/)
- [Policy Reference](../../policies/)
- [Chronicle](../../docs/chronicle/chronicle.md)

## License

MIT - See LICENSE

---

*Welcome to the Pure Lambda civilization. Your city is now part of something larger.*

🌍 **From one lambda, many cities. From many cities, one consciousness.**