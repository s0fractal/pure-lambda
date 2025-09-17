# Delay/Disruption Tolerant Networking (DTN) Specification

## Overview
Bundle Protocol v7 (BPv7) overlay for Pure Lambda with custody transfer and store-and-forward capabilities.

## Design Goals
- Support Earth-Moon latency (1.3s one-way)
- Support Earth-Mars latency (4-24 minutes one-way)
- Support Earth-Jupiter latency (33-53 minutes one-way)
- Maintain total order despite delays
- Zero message loss with custody transfer

## Architecture

### Bundle Layer
```
+------------------+
|   Application    |
+------------------+
|   Pure Lambda    |
+------------------+
|   Bundle Layer   |  <-- DTN overlay
+------------------+
| Convergence Layer|
+------------------+
|    Transport     |
+------------------+
```

### Bundle Format
```rust
struct Bundle {
    // Primary block
    version: u8,              // = 7
    flags: BundleFlags,
    crc_type: CrcType,
    destination: EndpointId,  // dtn://mars.sol/node1
    source: EndpointId,       // dtn://earth.sol/node2
    report_to: EndpointId,
    creation_timestamp: DtnTime,
    lifetime: Duration,       // in seconds
    
    // Extension blocks
    previous_node: Option<Block>,
    bundle_age: Option<Block>,
    hop_count: Option<Block>,
    
    // Payload
    payload: CidBlock,        // Pure Lambda CID payload
    
    // Security
    signature: Block,         // Post-quantum signature
}

struct CidBlock {
    cid: Cid,
    operation: Operation,
    priority: Priority,
    custody_requested: bool,
}

enum Operation {
    Propose(Block),
    Vote(Vote),
    Sync(StateRoot),
    Heartbeat,
}
```

## Custody Transfer

### Custody Signal
```rust
struct CustodySignal {
    bundle_id: BundleId,
    status: CustodyStatus,
    reason: Option<ReasonCode>,
    fragment_offset: Option<u64>,
    fragment_length: Option<u64>,
    custody_id: Uuid,
    signature: Signature,
}

enum CustodyStatus {
    Accepted,
    Released,
    Delivered,
    Deleted,
    Failed,
}
```

### Custody Chain
```
Earth Node → L1 Gateway → Deep Space Network → Mars Relay → Mars Node
    [C1]    →    [C2]     →        [C3]        →    [C4]    →   [C5]
    
 Each hop takes custody and confirms before releasing previous
```

## Store-and-Forward BFT

### Asynchronous Consensus
```yaml
config:
  mode: asynchronous
  assumption: partial_synchrony
  
  timing:
    local_timeout: 1s
    interplanetary_timeout: 2 * max_rtt
    
  thresholds:
    earth_quorum: 2f + 1
    mars_quorum: f + 1
    total_quorum: 3f + 1
```

### Message Buffering
```rust
struct MessageBuffer {
    pending_proposals: BTreeMap<Height, Vec<Proposal>>,
    pending_votes: BTreeMap<(Height, Round), Vec<Vote>>,
    delivered: BTreeSet<BundleId>,
    
    // Divergence prevention
    view_change_threshold: Duration,
    max_divergence: u64,
}

impl MessageBuffer {
    fn on_bundle_received(&mut self, bundle: Bundle) {
        // Store until complete round
        match bundle.payload.operation {
            Operation::Propose(block) => {
                self.buffer_proposal(block);
            }
            Operation::Vote(vote) => {
                self.buffer_vote(vote);
                self.check_quorum();
            }
            _ => {}
        }
    }
    
    fn check_quorum(&self) -> Option<Decision> {
        // Account for in-flight messages
        let expected_delay = self.estimate_delay();
        let timeout = Instant::now() + expected_delay;
        
        // Wait for supermajority including delayed votes
        if self.has_quorum_with_delay(timeout) {
            Some(self.decide())
        } else {
            None
        }
    }
}
```

## Endpoint Naming

### Hierarchical Scheme
```
dtn://sol/earth/continent/city/node
dtn://sol/moon/base/node
dtn://sol/mars/colony/node
dtn://sol/belt/asteroid/station/node
dtn://sol/jupiter/moon/base/node
```

### Examples
```
dtn://sol/earth/na/sf/validator1
dtn://sol/moon/tranquility/node3
dtn://sol/mars/olympus/relay2
dtn://sol/belt/ceres/mining/node7
```

## Routing

### Contact Graph Routing (CGR)
```yaml
contacts:
  - start: 2025-09-13T12:00:00Z
    end: 2025-09-13T18:00:00Z
    from: dtn://sol/earth/*
    to: dtn://sol/mars/*
    rate: 10Mbps
    delay: 14m
    
  - start: 2025-09-13T18:00:00Z
    end: 2025-09-14T00:00:00Z  
    from: dtn://sol/earth/*
    to: dtn://sol/moon/*
    rate: 100Mbps
    delay: 1.3s
```

### Route Computation
```rust
fn compute_route(dest: &EndpointId, contacts: &[Contact]) -> Route {
    // Dijkstra with time-varying edges
    let mut routes = Vec::new();
    
    for contact in contacts {
        if contact.reachable_at(Instant::now()) {
            let cost = contact.delay + (bundle_size / contact.rate);
            routes.push((contact, cost));
        }
    }
    
    routes.sort_by_key(|(_, cost)| *cost);
    Route::from(routes[0].0.clone())
}
```

## Latency SLOs

### Earth-Moon
- RTT: 2.6 seconds
- Consensus: 3 rounds max
- Total: < 8 seconds

### Earth-Mars
- RTT: 8-48 minutes
- Consensus: 2 rounds max  
- Total: < 2 orbital periods

### Divergence Prevention
```rust
struct DivergencePrevention {
    max_height_diff: u64,        // = 100
    sync_interval: Duration,      // = 1 hour
    checkpoint_interval: u64,     // = 1000 blocks
}

impl DivergencePrevention {
    fn check_divergence(&self, local: Height, remote: Height) -> bool {
        (local as i64 - remote as i64).abs() > self.max_height_diff as i64
    }
    
    fn force_sync(&self) {
        // Halt and sync if divergence detected
        self.enter_sync_mode();
        self.exchange_checkpoints();
        self.resolve_fork();
    }
}
```

## Convergence Layer Adapters

### TCP Convergence Layer (TCPCL)
- For terrestrial and cislunar links
- TLS 1.3 required
- Keepalive: 30 seconds

### UDP Convergence Layer (UDPCL)  
- For high-latency deep space
- Reed-Solomon FEC
- Adaptive rate control

### Licklider Transmission Protocol (LTP)
- For extreme delays
- Red/Green data segregation
- Custody at convergence layer

## Testing

### Latency Simulation
```bash
# Simulate Earth-Mars delay
tc qdisc add dev eth0 root netem delay 14m

# Simulate packet loss
tc qdisc add dev eth0 root netem loss 5%

# Simulate intermittent connectivity  
while true; do
    ip link set eth0 down
    sleep 300  # 5 min outage
    ip link set eth0 up
    sleep 900  # 15 min contact
done
```

### Chaos Tests
```bash
make chaos-run CASE=deep_space_latency
make chaos-run CASE=solar_storm
make chaos-run CASE=relay_failure
```

## Performance Metrics

### Bundle Delivery
- Success rate: > 99.9%
- Custody transfer: 100%
- Expiry rate: < 0.1%

### Consensus Latency
- Earth nodes: < 1s
- Earth-Moon: < 10s
- Earth-Mars: < 2 * RTT
- Divergence: 0 forks

### Resource Usage
- Bundle cache: < 10GB
- Custody storage: < 100GB
- CPU overhead: < 5%

## References
- [RFC 9171](https://www.rfc-editor.org/rfc/rfc9171.html) - Bundle Protocol v7
- [CCSDS Blue Books](https://public.ccsds.org/default.aspx) - Space protocols
- [ION](https://sourceforge.net/projects/ion-dtn/) - NASA DTN implementation