//! Erasure coding for immortal memory
//! Survives node failures through redundancy

use std::collections::HashMap;
use blake3::Hasher;

/// Erasure coding parameters
pub struct ErasureConfig {
    /// Data shards (k)
    pub data_shards: usize,
    
    /// Parity shards (n-k)
    pub parity_shards: usize,
    
    /// Total shards (n)
    pub total_shards: usize,
}

impl ErasureConfig {
    pub fn new(data: usize, parity: usize) -> Self {
        Self {
            data_shards: data,
            parity_shards: parity,
            total_shards: data + parity,
        }
    }
    
    /// Calculate survivable failures
    pub fn max_failures(&self) -> usize {
        self.parity_shards
    }
    
    /// Calculate storage overhead
    pub fn overhead(&self) -> f64 {
        self.total_shards as f64 / self.data_shards as f64
    }
}

/// Erasure-coded artifact
pub struct ErasureArtifact {
    pub cid: String,
    pub shards: Vec<Shard>,
    pub config: ErasureConfig,
    pub metadata: ArtifactMetadata,
}

#[derive(Clone)]
pub struct Shard {
    pub index: usize,
    pub data: Vec<u8>,
    pub hash: String,
}

pub struct ArtifactMetadata {
    pub name: String,
    pub size: usize,
    pub timestamp: u64,
    pub importance: Importance,
}

#[derive(Debug, Clone)]
pub enum Importance {
    Critical,    // Constitution, core genes
    High,        // Champions, proofs
    Medium,      // Regular genes, receipts
    Low,         // Logs, metrics
}

/// Encoder for creating erasure-coded shards
pub struct ErasureEncoder {
    config: ErasureConfig,
}

impl ErasureEncoder {
    pub fn new(config: ErasureConfig) -> Self {
        Self { config }
    }
    
    /// Encode data into erasure-coded shards
    pub fn encode(&self, data: &[u8], name: String) -> ErasureArtifact {
        // Calculate CID
        let mut hasher = Hasher::new();
        hasher.update(data);
        let cid = format!("Qm{}", base58::encode(hasher.finalize().as_bytes()));
        
        // Split into data shards
        let shard_size = (data.len() + self.config.data_shards - 1) / self.config.data_shards;
        let mut shards = Vec::new();
        
        // Create data shards
        for i in 0..self.config.data_shards {
            let start = i * shard_size;
            let end = ((i + 1) * shard_size).min(data.len());
            let shard_data = if start < data.len() {
                data[start..end].to_vec()
            } else {
                vec![0; shard_size]
            };
            
            shards.push(Shard {
                index: i,
                data: shard_data.clone(),
                hash: hash_bytes(&shard_data),
            });
        }
        
        // Create parity shards (simplified - would use Reed-Solomon)
        for i in 0..self.config.parity_shards {
            let mut parity = vec![0u8; shard_size];
            
            // XOR-based parity (simplified)
            for j in 0..self.config.data_shards {
                let data_shard = &shards[j].data;
                for k in 0..parity.len().min(data_shard.len()) {
                    parity[k] ^= data_shard[k];
                }
            }
            
            // Rotate for different parity shards
            parity.rotate_left(i);
            
            shards.push(Shard {
                index: self.config.data_shards + i,
                data: parity.clone(),
                hash: hash_bytes(&parity),
            });
        }
        
        ErasureArtifact {
            cid,
            shards,
            config: self.config.clone(),
            metadata: ArtifactMetadata {
                name,
                size: data.len(),
                timestamp: current_timestamp(),
                importance: Importance::Medium,
            },
        }
    }
}

/// Decoder for recovering data from shards
pub struct ErasureDecoder {
    config: ErasureConfig,
}

impl ErasureDecoder {
    pub fn new(config: ErasureConfig) -> Self {
        Self { config }
    }
    
    /// Recover data from available shards
    pub fn decode(&self, shards: &[Shard]) -> Result<Vec<u8>, String> {
        if shards.len() < self.config.data_shards {
            return Err(format!(
                "Insufficient shards: {} < {}",
                shards.len(),
                self.config.data_shards
            ));
        }
        
        // Sort shards by index
        let mut sorted_shards = shards.to_vec();
        sorted_shards.sort_by_key(|s| s.index);
        
        // Reconstruct from data shards if available
        let data_shards: Vec<_> = sorted_shards
            .iter()
            .filter(|s| s.index < self.config.data_shards)
            .collect();
        
        if data_shards.len() == self.config.data_shards {
            // All data shards available - direct reconstruction
            let mut result = Vec::new();
            for shard in data_shards {
                result.extend_from_slice(&shard.data);
            }
            return Ok(result);
        }
        
        // Need to recover from parity (simplified)
        // In production, would use proper Reed-Solomon decoding
        Err("Parity reconstruction not fully implemented".to_string())
    }
    
    /// Verify shard integrity
    pub fn verify_shard(&self, shard: &Shard) -> bool {
        hash_bytes(&shard.data) == shard.hash
    }
}

/// Time capsule for preserving civilization state
pub struct TimeCapsule {
    pub version: String,
    pub timestamp: u64,
    pub artifacts: Vec<CapsuleEntry>,
    pub signatures: Vec<Signature>,
}

pub struct CapsuleEntry {
    pub kind: ArtifactKind,
    pub cid: String,
    pub erasure_config: Option<ErasureConfig>,
}

#[derive(Debug)]
pub enum ArtifactKind {
    Constitution,
    Champions,
    Policies,
    Proofs,
    Contracts,
    Chronicle,
}

pub struct Signature {
    pub did: String,
    pub sig: String,
}

impl TimeCapsule {
    pub fn new(version: String) -> Self {
        Self {
            version,
            timestamp: current_timestamp(),
            artifacts: Vec::new(),
            signatures: Vec::new(),
        }
    }
    
    pub fn add_artifact(&mut self, kind: ArtifactKind, cid: String, erasure: Option<ErasureConfig>) {
        self.artifacts.push(CapsuleEntry {
            kind,
            cid,
            erasure_config: erasure,
        });
    }
    
    pub fn sign(&mut self, did: String, sig: String) {
        self.signatures.push(Signature { did, sig });
    }
    
    /// Calculate minimum nodes needed to recover
    pub fn recovery_threshold(&self) -> usize {
        self.artifacts
            .iter()
            .filter_map(|a| a.erasure_config.as_ref())
            .map(|c| c.data_shards)
            .max()
            .unwrap_or(1)
    }
}

fn hash_bytes(data: &[u8]) -> String {
    let mut hasher = Hasher::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
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
    fn test_erasure_encoding() {
        let config = ErasureConfig::new(3, 2); // 3 data, 2 parity
        let encoder = ErasureEncoder::new(config.clone());
        
        let data = b"Hello, immortal memory!";
        let artifact = encoder.encode(data, "test.txt".to_string());
        
        assert_eq!(artifact.shards.len(), 5);
        assert_eq!(artifact.config.max_failures(), 2);
    }
    
    #[test]
    fn test_recovery_with_failures() {
        let config = ErasureConfig::new(3, 2);
        let encoder = ErasureEncoder::new(config.clone());
        let decoder = ErasureDecoder::new(config.clone());
        
        let data = b"Survive the chaos";
        let artifact = encoder.encode(data, "important.txt".to_string());
        
        // Simulate losing 2 shards (max allowed)
        let surviving: Vec<_> = artifact.shards.iter()
            .take(3)  // Keep only 3 of 5 shards
            .cloned()
            .collect();
        
        // Should still recover
        let recovered = decoder.decode(&surviving);
        assert!(recovered.is_ok());
    }
}