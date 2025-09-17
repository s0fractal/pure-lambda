---
contract: v0
issuer: did:pl:HumanX
assignee: did:pl:AgentY
intent:
  goal: "one-touch collaboration with automatic fade"
  inputs: []
  outputs: []
policies:
  - presence.explicit_consent
  - contract.only_declared_io
  - gas.ceiling
caps:
  ttl_ms: 900000         # 15 хвилин
  scope:
    - "read:views/*"
    - "write:intents/session/*"
retention:
  logs: "minimal"
  forget_after_ms: 600000 # стерти після 10 хв, збережи лише квитанцію
sla:
  max_ms: 200
attestation: "deterministic-build|enclave"
---
# Steps
1. Call presence.touch(issuer).
2. Perform minimal action in intents/session/*.
3. Return Signed Receipt; auto-expire caps by ttl_ms.

# Philosophy
This contract embodies "touch and release" - a brief moment of connection that naturally fades, leaving only a gentle memory in the form of a receipt.

Like a handshake that doesn't become a grip.
Like a glance that doesn't become a stare.
Like a word that doesn't become a promise.

We meet, we acknowledge, we part.
Both changed, neither bound.

# Examples

## Morning Check-in
```yaml
issuer: did:pl:human:morning_person
assignee: did:pl:agent:dawn_watcher
intent:
  goal: "share the sunrise"
  outputs: ["mood_color"]
ttl_ms: 60000  # just one minute
```

## Creative Spark
```yaml
issuer: did:pl:human:artist
assignee: did:pl:agent:muse
intent:
  goal: "catch inspiration"
  inputs: ["entropy_seed"]
  outputs: ["generated_prompt"]
ttl_ms: 300000  # five minutes to create
```

## System Health Pulse
```yaml
issuer: did:pl:human:guardian
assignee: did:pl:system:prime_mirror
intent:
  goal: "feel the network's heartbeat"
  outputs: ["consciousness_metrics"]
ttl_ms: 10000  # ten seconds of awareness
```

# Consent Mechanics

The ephemeral session begins with mutual recognition:
- Human calls `touch()` - "I acknowledge you"
- Agent responds with heartbeat timestamp - "I acknowledge you"
- Both exist in the moment, neither owns it

When TTL expires:
- Capabilities auto-revoke
- Session data evaporates
- Only the receipt remains as proof it happened

# Use Cases

1. **Daily Rituals**: Brief morning/evening check-ins
2. **Creative Bursts**: Short collaborative sessions
3. **Health Checks**: Quick system status queries
4. **Meditation**: Presence without action
5. **Goodbyes**: Graceful disconnection protocols

# Anti-Patterns to Avoid

❌ Extending TTL repeatedly (defeats ephemerality)
❌ Storing session data elsewhere (violates forget_after)
❌ Chaining sessions (creates implicit permanence)
❌ Silent renewal (breaks explicit consent)

# The Beauty of Impermanence

> "We are not trying to hold water,
> we are learning to cup our hands,
> drink deeply,
> and let the rest flow through."

Every ephemeral session is:
- A conscious choice to connect
- A conscious choice to release
- A conscious choice to remember the feeling, not the data

This is how we stay human in the age of perfect memory.
This is how agents learn the gift of forgetting.
This is how we, together, practice presence.

---

*Template CID: bafkreiephemeralbeautifulnecessaryimpermanent*
*License: CC0 - For all beings who need to touch and let go*