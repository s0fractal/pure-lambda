//! Byzantine fault scenarios for testing resilience

use std::collections::HashMap;
use serde::{Serialize, Deserialize};

/// Byzantine agent behaviors
#[derive(Debug, Clone)]
pub enum ByzantineBehavior {
    /// Send messages with invalid signatures
    InvalidSignature,
    
    /// Claim false CIDs for content
    FalseCID,
    
    /// Violate policies deliberately
    PolicyViolation,
    
    /// Double-vote in governance
    DoubleVote,
    
    /// Announce non-existent genes
    PhantomGenes,
    
    /// Corrupt erasure-coded shards
    CorruptShards,
}

pub struct ByzantineAgent {
    did: String,
    behavior: ByzantineBehavior,
    messages_sent: usize,
}

impl ByzantineAgent {
    pub fn new(did: String, behavior: ByzantineBehavior) -> Self {
        Self {
            did,
            behavior,
            messages_sent: 0,
        }
    }
    
    /// Send a Byzantine message
    pub fn send_message(&mut self) -> ByzantineMessage {
        self.messages_sent += 1;
        
        match &self.behavior {
            ByzantineBehavior::InvalidSignature => {
                ByzantineMessage {
                    from: self.did.clone(),
                    kind: "invalid_sig".to_string(),
                    payload: HashMap::from([
                        ("cid".to_string(), "QmFake123".to_string()),
                        ("sig".to_string(), "INVALID_SIGNATURE".to_string()),
                    ]),
                }
            }
            
            ByzantineBehavior::FalseCID => {
                ByzantineMessage {
                    from: self.did.clone(),
                    kind: "false_cid".to_string(),
                    payload: HashMap::from([
                        ("claimed_cid".to_string(), "QmReal456".to_string()),
                        ("actual_content".to_string(), "different_data".to_string()),
                    ]),
                }
            }
            
            ByzantineBehavior::PolicyViolation => {
                ByzantineMessage {
                    from: self.did.clone(),
                    kind: "policy_violation".to_string(),
                    payload: HashMap::from([
                        ("write_path".to_string(), "/etc/passwd".to_string()),
                        ("gas_used".to_string(), "99999999999".to_string()),
                    ]),
                }
            }
            
            ByzantineBehavior::DoubleVote => {
                ByzantineMessage {
                    from: self.did.clone(),
                    kind: "double_vote".to_string(),
                    payload: HashMap::from([
                        ("rfc_id".to_string(), "42".to_string()),
                        ("vote1".to_string(), "yes".to_string()),
                        ("vote2".to_string(), "no".to_string()),
                    ]),
                }
            }
            
            ByzantineBehavior::PhantomGenes => {
                ByzantineMessage {
                    from: self.did.clone(),
                    kind: "phantom_gene".to_string(),
                    payload: HashMap::from([
                        ("gene_name".to_string(), "SUPER_OPTIMIZER".to_string()),
                        ("speedup".to_string(), "1000x".to_string()),
                        ("cid".to_string(), "QmNonExistent".to_string()),
                    ]),
                }
            }
            
            ByzantineBehavior::CorruptShards => {
                ByzantineMessage {
                    from: self.did.clone(),
                    kind: "corrupt_shard".to_string(),
                    payload: HashMap::from([
                        ("shard_id".to_string(), "shard_5_of_10".to_string()),
                        ("corruption".to_string(), "random_bytes".to_string()),
                    ]),
                }
            }
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ByzantineMessage {
    pub from: String,
    pub kind: String,
    pub payload: HashMap<String, String>,
}

/// Detector for Byzantine behaviors
pub struct ByzantineDetector {
    violations: Vec<Violation>,
}

#[derive(Debug)]
pub struct Violation {
    pub agent: String,
    pub kind: String,
    pub evidence: String,
    pub timestamp: u64,
}

impl ByzantineDetector {
    pub fn new() -> Self {
        Self {
            violations: Vec::new(),
        }
    }
    
    /// Check message for Byzantine behavior
    pub fn check_message(&mut self, msg: &ByzantineMessage) -> bool {
        // Verify signature
        if msg.kind == "invalid_sig" {
            self.violations.push(Violation {
                agent: msg.from.clone(),
                kind: "invalid_signature".to_string(),
                evidence: "Signature verification failed".to_string(),
                timestamp: current_timestamp(),
            });
            return false;
        }
        
        // Check CID matches content
        if msg.kind == "false_cid" {
            self.violations.push(Violation {
                agent: msg.from.clone(),
                kind: "cid_mismatch".to_string(),
                evidence: "Content hash doesn't match CID".to_string(),
                timestamp: current_timestamp(),
            });
            return false;
        }
        
        // Verify policy compliance
        if msg.kind == "policy_violation" {
            if let Some(path) = msg.payload.get("write_path") {
                if !path.starts_with("intents/") {
                    self.violations.push(Violation {
                        agent: msg.from.clone(),
                        kind: "policy_violation".to_string(),
                        evidence: format!("Illegal write to {}", path),
                        timestamp: current_timestamp(),
                    });
                    return false;
                }
            }
        }
        
        true
    }
    
    pub fn report(&self) -> ByzantineReport {
        ByzantineReport {
            total_violations: self.violations.len(),
            by_type: self.count_by_type(),
            blocked_agents: self.get_blocked_agents(),
        }
    }
    
    fn count_by_type(&self) -> HashMap<String, usize> {
        let mut counts = HashMap::new();
        for v in &self.violations {
            *counts.entry(v.kind.clone()).or_insert(0) += 1;
        }
        counts
    }
    
    fn get_blocked_agents(&self) -> Vec<String> {
        let mut agents = Vec::new();
        for v in &self.violations {
            if !agents.contains(&v.agent) {
                agents.push(v.agent.clone());
            }
        }
        agents
    }
}

#[derive(Debug)]
pub struct ByzantineReport {
    pub total_violations: usize,
    pub by_type: HashMap<String, usize>,
    pub blocked_agents: Vec<String>,
}

fn current_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_byzantine_detection() {
        let mut agent = ByzantineAgent::new(
            "did:pl:Byzantine1".to_string(),
            ByzantineBehavior::InvalidSignature,
        );
        
        let msg = agent.send_message();
        
        let mut detector = ByzantineDetector::new();
        let valid = detector.check_message(&msg);
        
        assert!(!valid);
        assert_eq!(detector.violations.len(), 1);
    }
}