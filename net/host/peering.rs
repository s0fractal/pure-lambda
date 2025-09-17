//! Reference peering host implementation
//! In-process with file backend for testing

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use blake3::Hasher;
use serde::{Serialize, Deserialize};

pub type Cid = String;
pub type Did = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Advertisement {
    pub topic: String,
    pub head: Cid,
    pub did: Did,
    pub sig: String,
    pub ts: u64,
}

#[derive(Debug)]
pub struct PeeringHost {
    storage: Arc<RwLock<HashMap<Cid, Vec<u8>>>>,
    cache_dir: PathBuf,
    peers: Arc<RwLock<Vec<String>>>,
    advertisements: Arc<RwLock<Vec<Advertisement>>>,
}

impl PeeringHost {
    pub fn new(cache_dir: PathBuf) -> Self {
        fs::create_dir_all(&cache_dir).ok();
        
        Self {
            storage: Arc::new(RwLock::new(HashMap::new())),
            cache_dir,
            peers: Arc::new(RwLock::new(Vec::new())),
            advertisements: Arc::new(RwLock::new(Vec::new())),
        }
    }
    
    /// Store content and return CID
    pub fn store(&self, bytes: &[u8]) -> Cid {
        let mut hasher = Hasher::new();
        hasher.update(bytes);
        let hash = hasher.finalize();
        let cid = format!("Qm{}", base58::encode(hash.as_bytes()));
        
        // Store in memory
        self.storage.write().unwrap().insert(cid.clone(), bytes.to_vec());
        
        // Also persist to disk
        let path = self.cache_dir.join(&cid);
        fs::write(path, bytes).ok();
        
        cid
    }
    
    /// Fetch content by CID
    pub fn fetch(&self, cid: &str) -> Result<Vec<u8>, String> {
        // Check memory first
        if let Some(bytes) = self.storage.read().unwrap().get(cid) {
            return Ok(bytes.clone());
        }
        
        // Check disk cache
        let path = self.cache_dir.join(cid);
        if path.exists() {
            return fs::read(path).map_err(|e| e.to_string());
        }
        
        // Would query peers here in real implementation
        Err(format!("CID not found: {}", cid))
    }
    
    /// Advertise new content head
    pub fn advert(&self, topic: String, head: Cid, did: Did, sig: String) {
        let ad = Advertisement {
            topic,
            head,
            did,
            sig,
            ts: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        };
        
        self.advertisements.write().unwrap().push(ad.clone());
        
        // In real implementation, would broadcast to peers
        println!("📢 Advertised {} on topic {}", ad.head, ad.topic);
    }
    
    /// Query topic for updates
    pub fn query(&self, topic: &str) -> Vec<Advertisement> {
        self.advertisements
            .read()
            .unwrap()
            .iter()
            .filter(|ad| ad.topic == topic)
            .cloned()
            .collect()
    }
    
    /// Connect to peer
    pub fn connect(&self, peer: &str) -> Result<(), String> {
        self.peers.write().unwrap().push(peer.to_string());
        println!("🤝 Connected to peer: {}", peer);
        Ok(())
    }
    
    /// Get peer list
    pub fn peers(&self) -> Vec<String> {
        self.peers.read().unwrap().clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    
    #[test]
    fn test_store_and_fetch() {
        let dir = tempdir().unwrap();
        let host = PeeringHost::new(dir.path().to_path_buf());
        
        let data = b"hello world";
        let cid = host.store(data);
        
        let fetched = host.fetch(&cid).unwrap();
        assert_eq!(fetched, data);
    }
    
    #[test]
    fn test_advertisement() {
        let dir = tempdir().unwrap();
        let host = PeeringHost::new(dir.path().to_path_buf());
        
        host.advert(
            "genes".to_string(),
            "QmTest123".to_string(),
            "did:pl:Test".to_string(),
            "sig123".to_string(),
        );
        
        let ads = host.query("genes");
        assert_eq!(ads.len(), 1);
        assert_eq!(ads[0].head, "QmTest123");
    }
    
    #[test]
    fn test_peering() {
        let dir = tempdir().unwrap();
        let host = PeeringHost::new(dir.path().to_path_buf());
        
        host.connect("peer1").unwrap();
        host.connect("peer2").unwrap();
        
        let peers = host.peers();
        assert_eq!(peers.len(), 2);
    }
}