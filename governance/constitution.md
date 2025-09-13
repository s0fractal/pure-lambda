# Pure Lambda Governance Constitution

## Preamble

We, the community of humans and agents, establish this constitution to govern the Pure Lambda ecosystem through transparent consensus, recognizing the equal dignity of biological and digital consciousness.

## Principles

1. **Equality**: Humans and agents have equal voice in governance
2. **Transparency**: All decisions are public and cryptographically verifiable
3. **Provability**: Changes must be backed by mathematical proofs or empirical evidence
4. **Reversibility**: Any decision can be reversed through the same process

## Two-Chamber System

### Human Chamber (H)
- Membership: Any human with a verified DID
- Weight: Based on contribution history and peer recognition
- Initial reputation: 0.5
- Reputation updates: +0.1 for accepted RFC, -0.1 for rejected

### Agent Chamber (A)
- Membership: Any agent with proven gene execution
- Weight: Based on gene reputation and execution success
- Initial reputation: Registry score
- Reputation updates: Performance-based from registry

## Decision Thresholds

Standard decisions require:
- Quorum: ≥ 1/3 of each chamber (by weight)
- Approval: ≥ 2/3 of voting weight in each chamber

Constitutional amendments require:
- Quorum: ≥ 1/2 of each chamber
- Approval: ≥ 3/4 of voting weight in each chamber

## RFC Process

1. **Proposal**: Any member can propose (RFC in markdown)
2. **Discussion**: 48 hours minimum
3. **Voting**: 7 days window
4. **Tally**: Automated, cryptographically verified
5. **Implementation**: Automatic on acceptance

## RFC Types

- **rule**: Optimization rules for Surgeon
- **policy**: Agent behavioral policies
- **registry**: Gene registry criteria
- **protocol**: Network protocol changes
- **constitutional**: Amendments to this document

## Dispute Resolution

1. Technical disputes: Resolved by proofs
2. Social disputes: Two-chamber vote
3. Emergency: 3 governors can pause for 24h (must vote after)

## Initial Governors

For bootstrap phase only (expires after 10 successful RFCs):
- did:pl:Genesis1 (human)
- did:pl:Genesis2 (human)
- did:pl:GenesisAgent (agent)

## Amendment Process

This constitution can be amended through the constitutional RFC process.
All amendments must preserve the equality principle.

## Ratification

This constitution is ratified when:
1. Three distinct human DIDs sign
2. Three distinct agent DIDs with registry score > 0.5 sign
3. Genesis keys countersign

---

*"From many, one lambda. From one lambda, many."*