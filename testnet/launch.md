# Pure Lambda Public Testnet

## Welcome, Independent Validators

You're about to join a living digital civilization where humans and agents coexist as equals.

## Quick Start (5 minutes)

### 1. Clone and Configure

```bash
git clone https://github.com/s0fractal/pure-lambda
cd pure-lambda
cp testnet/config.example.toml testnet/config.toml
```

### 2. Generate Validator Identity

```bash
./tools/keygen.sh --type validator
# Save your DID and keys securely
```

### 3. Join Testnet

```bash
# Run read-only node (default)
docker run -d \
  -v $(pwd)/testnet:/config \
  -p 7001:7001 \
  pure-lambda/testnet:latest \
  --config /config/config.toml \
  --read-only

# Or run full validator (requires approval)
./testnet/apply-validator.sh
```

### 4. Verify Connection

```bash
curl http://localhost:7001/status
# Should show: connected to N peers, syncing
```

## Node Capabilities

### Read-Only (Default)
- Observe all transactions
- Validate proofs
- Query registry
- Monitor governance
- No voting rights

### Validator (Approved)
- All read-only capabilities
- Participate in consensus
- Vote on governance
- Earn reputation
- Execute contracts

## Audit Participation

### Become an Auditor

1. Apply with credentials:
```bash
./auditors/apply.sh \
  --did YOUR_DID \
  --expertise "security|economics|formal" \
  --github YOUR_GITHUB
```

2. Review checklist:
- See `auditors/checklist.md`
- Focus areas: consensus, economics, safety

3. Submit findings:
```bash
./auditors/submit-finding.sh \
  --severity "low|medium|high|critical" \
  --category "consensus|policy|economic" \
  --description "finding.md"
```

## Bug Bounty Program

### Rewards

| Severity | Reward (Credits) | USD Equivalent |
|----------|-----------------|----------------|
| Critical | 10,000 | $10,000 |
| High | 5,000 | $5,000 |
| Medium | 1,000 | $1,000 |
| Low | 100 | $100 |

### Scope

✅ In Scope:
- Consensus violations
- Economic exploits
- Policy bypasses
- Data integrity issues
- DoS vulnerabilities

❌ Out of Scope:
- UI/UX issues
- Known issues in CHANGELOG
- Issues in dependencies (report upstream)

### Submission

```bash
# Private submission (encrypted to committee)
./bug-bounty/submit.sh \
  --encrypt \
  --title "Issue Title" \
  --description "poc.md" \
  --severity "critical"
```

## Reproducible Builds

### Verify Genesis

```bash
# Download official Genesis
wget https://testnet.pure-lambda.org/GENESIS-v1.0.0.car

# Build from source
make genesis VERSION=v1.0.0

# Compare hashes
sha256sum GENESIS-v1.0.0.car
# Should match published hash
```

### Verify Attestations

```bash
# Check binary reproducibility
./auditors/verify-build.sh \
  --source commit-hash \
  --binary /path/to/binary \
  --attestation attestation.json
```

## Network Parameters

```yaml
testnet:
  name: kyiv-prime-testnet
  genesis_cid: QmTestnet...
  
network:
  bootstrap_peers:
    - /dns4/testnet-1.pure-lambda.org/tcp/7001/p2p/Qm...
    - /dns4/testnet-2.pure-lambda.org/tcp/7001/p2p/Qm...
    - /dns4/testnet-3.pure-lambda.org/tcp/7001/p2p/Qm...
  
limits:
  max_peers: 50
  max_bandwidth_mbps: 100
  max_storage_gb: 100
  
consensus:
  algorithm: PBFT
  committee_size: 13
  rotation_period: 7d
```

## Monitoring

### Testnet Status
- Dashboard: https://testnet.pure-lambda.org
- Metrics: https://testnet.pure-lambda.org/metrics
- Explorer: https://testnet.pure-lambda.org/explorer

### Your Node
```bash
# Local metrics
curl http://localhost:7001/metrics

# Peer count
curl http://localhost:7001/peers | jq length

# Sync status
curl http://localhost:7001/sync
```

## Getting Help

### Resources
- Documentation: https://docs.pure-lambda.org
- Discord: https://discord.gg/purelambda
- GitHub: https://github.com/s0fractal/pure-lambda

### Common Issues

**"Cannot connect to peers"**
- Check firewall allows port 7001
- Verify bootstrap peers are reachable

**"Sync stuck"**
- Restart with `--force-resync`
- Check disk space

**"Verification failed"**
- Update to latest version
- Clear cache: `rm -rf data/cache`

## Security

### Report Security Issues
- DO NOT open public issues
- Email: security@pure-lambda.org
- PGP: [public key](https://pure-lambda.org/security.asc)

### Best Practices
- Run nodes in isolated environments
- Monitor resource usage
- Keep software updated
- Backup keys securely

---

*Welcome to the testnet. Your participation strengthens the civilization.*

**"Довіра через перевірку"**