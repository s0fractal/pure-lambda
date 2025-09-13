//! Intent marketplace matching engine

use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, Write};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum MarketMessage {
    #[serde(rename = "offer")]
    Offer {
        contract_cid: String,
        price: u32,
        ttl: u32,
        issuer: String,
        sig: String,
        ts: u64,
    },
    #[serde(rename = "bid")]
    Bid {
        contract_cid: String,
        did: String,
        est_ms: u32,
        reputation: f64,
        sig: String,
        ts: u64,
    },
    #[serde(rename = "match")]
    Match {
        contract_cid: String,
        winner: String,
        score: f64,
        ts: u64,
    },
}

pub struct MatchingEngine {
    offers: HashMap<String, MarketMessage>,
    bids: HashMap<String, Vec<MarketMessage>>,
}

impl MatchingEngine {
    pub fn new() -> Self {
        Self {
            offers: HashMap::new(),
            bids: HashMap::new(),
        }
    }
    
    /// Load messages from queue file
    pub fn load_queue(&mut self, path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        
        for line in reader.lines() {
            let line = line?;
            let msg: MarketMessage = serde_json::from_str(&line)?;
            
            match msg {
                MarketMessage::Offer { ref contract_cid, .. } => {
                    self.offers.insert(contract_cid.clone(), msg);
                }
                MarketMessage::Bid { ref contract_cid, .. } => {
                    self.bids.entry(contract_cid.clone())
                        .or_insert_with(Vec::new)
                        .push(msg);
                }
                _ => {}
            }
        }
        
        Ok(())
    }
    
    /// Match bids to offers
    pub fn run_matching(&self) -> Vec<MarketMessage> {
        let mut matches = Vec::new();
        
        for (cid, _offer) in &self.offers {
            if let Some(bids) = self.bids.get(cid) {
                // Score each bid: reputation / est_ms
                let mut scored_bids: Vec<_> = bids.iter()
                    .filter_map(|bid| {
                        if let MarketMessage::Bid { did, est_ms, reputation, .. } = bid {
                            let score = reputation / (*est_ms as f64 / 1000.0);
                            Some((did.clone(), score))
                        } else {
                            None
                        }
                    })
                    .collect();
                
                // Sort by score (highest first)
                scored_bids.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
                
                // Select winner
                if let Some((winner, score)) = scored_bids.first() {
                    matches.push(MarketMessage::Match {
                        contract_cid: cid.clone(),
                        winner: winner.clone(),
                        score: *score,
                        ts: std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs(),
                    });
                }
            }
        }
        
        matches
    }
    
    /// Verify SLA compatibility
    pub fn verify_sla(&self, bid: &MarketMessage, max_ms: u32) -> bool {
        if let MarketMessage::Bid { est_ms, .. } = bid {
            *est_ms <= max_ms
        } else {
            false
        }
    }
    
    /// Update reputation after execution
    pub fn update_reputation(
        &self,
        did: &str,
        success: bool,
        sla_met: bool,
    ) -> f64 {
        // In real system, would persist to database
        let mut reputation = 0.5; // Default
        
        if success {
            if sla_met {
                reputation *= 1.1; // +10% for success
            } else {
                reputation *= 0.8; // -20% for SLA violation
            }
        } else {
            reputation *= 0.5; // -50% for failure
        }
        
        reputation.min(1.0).max(0.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_matching() {
        let mut engine = MatchingEngine::new();
        
        // Add offer
        engine.offers.insert(
            "Qm123".to_string(),
            MarketMessage::Offer {
                contract_cid: "Qm123".to_string(),
                price: 10,
                ttl: 3600,
                issuer: "did:alice".to_string(),
                sig: "sig".to_string(),
                ts: 0,
            },
        );
        
        // Add bids
        engine.bids.insert(
            "Qm123".to_string(),
            vec![
                MarketMessage::Bid {
                    contract_cid: "Qm123".to_string(),
                    did: "did:agent1".to_string(),
                    est_ms: 50,
                    reputation: 0.8,
                    sig: "sig1".to_string(),
                    ts: 1,
                },
                MarketMessage::Bid {
                    contract_cid: "Qm123".to_string(),
                    did: "did:agent2".to_string(),
                    est_ms: 40,
                    reputation: 0.9,
                    sig: "sig2".to_string(),
                    ts: 2,
                },
            ],
        );
        
        let matches = engine.run_matching();
        assert_eq!(matches.len(), 1);
        
        if let MarketMessage::Match { winner, score, .. } = &matches[0] {
            assert_eq!(winner, "did:agent2"); // Better score
            assert!(score > &20.0); // 0.9 / 0.04 = 22.5
        }
    }
}

fn main() {
    let mut engine = MatchingEngine::new();
    
    // Load queue
    if let Err(e) = engine.load_queue("market/queue.jsonl") {
        eprintln!("Error loading queue: {}", e);
        return;
    }
    
    // Run matching
    let matches = engine.run_matching();
    
    // Output matches
    for match_msg in matches {
        println!("{}", serde_json::to_string(&match_msg).unwrap());
        
        if let MarketMessage::Match { contract_cid, winner, score, .. } = match_msg {
            println!("🏆 Contract {} matched to {} (score: {:.2})", 
                     contract_cid, winner, score);
        }
    }
}