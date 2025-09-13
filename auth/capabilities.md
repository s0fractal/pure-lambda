# Capability-Based Authorization

## Overview

Pure Lambda uses capability-based security (ocaps) for fine-grained access control. Instead of identity-based permissions, agents receive transferable capabilities that precisely specify what they can do.

## Capability Format

```json
{
  "iss": "did:pl:Issuer",
  "aud": "did:pl:Recipient",
  "cap": [
    {
      "op": "read|write|execute",
      "res": "resource/path/pattern",
      "limit": {
        "max_bytes": 1048576,
        "max_ops": 100,
        "max_time_ms": 5000
      }
    }
  ],
  "exp": 1740000000,
  "sig": "base64(sign(hash(capability)))"
}
```

## Operations

### read
Read access to specified resources
```json
{"op": "read", "res": "views/protein.vec"}
{"op": "read", "res": "views/*.json"}  // Pattern matching
```

### write
Write access with optional size limits
```json
{"op": "write", "res": "intents/output.json", "limit": {"max_bytes": 1048576}}
```

### execute
Permission to run specific genes
```json
{"op": "execute", "res": "genes/FOCUS", "limit": {"max_time_ms": 5000}}
```

## Delegation

Capabilities can be delegated with attenuation:

```json
{
  "parent": "Qm... (CID of parent capability)",
  "iss": "did:pl:Delegator",
  "aud": "did:pl:Delegatee",
  "cap": [
    // Must be subset of parent capabilities
    {"op": "read", "res": "views/public/*"}
  ],
  "exp": 1739000000,  // Must not exceed parent expiry
  "sig": "..."
}
```

## Patterns

### Least Privilege
Grant minimal capabilities needed:
```json
{
  "cap": [
    {"op": "read", "res": "config/settings.json"},
    {"op": "write", "res": "intents/result.json", "limit": {"max_bytes": 1024}}
  ]
}
```

### Time-Bounded
Capabilities expire automatically:
```json
{
  "exp": 1737000000,  // Unix timestamp
  "cap": [{"op": "execute", "res": "genes/OBSERVE"}]
}
```

### Resource Patterns
Use wildcards for flexibility:
```json
{
  "cap": [
    {"op": "read", "res": "views/2024-*"},  // All 2024 data
    {"op": "write", "res": "intents/temp-*"}  // Temp files only
  ]
}
```

## Verification

The policy engine verifies capabilities:

1. **Signature**: Valid signature from issuer
2. **Expiry**: Current time < expiry time
3. **Delegation Chain**: All parent capabilities valid
4. **Attenuation**: Each delegation reduces scope
5. **Resource Match**: Requested action matches capability

## Revocation

Capabilities can be revoked by publishing to revocation list:

```json
{
  "revoked": [
    "Qm... (CID of revoked capability)",
    "Qm..."
  ],
  "issuer": "did:pl:Issuer",
  "timestamp": 1736812345,
  "sig": "..."
}
```

## Examples

### Contract Execution
Agent receives capabilities from contract:
```json
{
  "iss": "did:pl:ContractIssuer",
  "aud": "did:pl:AgentExecutor",
  "cap": [
    {"op": "read", "res": "views/input.vec"},
    {"op": "execute", "res": "genes/FOCUS"},
    {"op": "write", "res": "intents/output.vec"}
  ],
  "exp": 1737000000
}
```

### Collaborative Analysis
Multiple agents share data access:
```json
{
  "iss": "did:pl:DataOwner",
  "aud": "did:pl:AnalysisTeam",
  "cap": [
    {"op": "read", "res": "views/dataset/*"},
    {"op": "execute", "res": "genes/OBSERVE"},
    {"op": "write", "res": "intents/analysis/*", "limit": {"max_bytes": 10485760}}
  ]
}
```

### Temporary Debug Access
Developer gets time-limited access:
```json
{
  "iss": "did:pl:Admin",
  "aud": "did:pl:Developer",
  "cap": [
    {"op": "read", "res": "logs/*"},
    {"op": "read", "res": "traces/*"}
  ],
  "exp": 1736820000  // Expires in 2 hours
}
```

## Security Properties

1. **Unforgeable**: Cryptographic signatures prevent tampering
2. **Attenuating**: Delegation can only reduce, never increase permissions
3. **Composable**: Multiple capabilities combine safely
4. **Auditable**: All capability grants are logged
5. **Decentralized**: No central authority required

## Integration with Policies

Capabilities work with H2 policies:
- Policies define system-wide rules
- Capabilities grant specific permissions
- Both must be satisfied for action to proceed

```
Action allowed = Policy allows AND Capability grants
```

## Future Extensions

- **Conditional Capabilities**: Based on runtime conditions
- **Threshold Capabilities**: Require k-of-n signatures
- **Smart Capabilities**: Executable logic in capabilities
- **Privacy Capabilities**: Zero-knowledge proofs of possession