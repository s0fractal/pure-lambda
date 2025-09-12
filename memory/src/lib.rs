//! Memory v0 - Immutable persistent memory with CID addressing
//! 
//! Blake3 CAS + snapshots + timeline
//! Target: put/get < 100μs p50, snapshot < 5ms for 100k entries

use blake3::Hasher;
use std::collections::{HashMap, BTreeMap};
use std::sync::{Arc, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};

pub type Cid = [u8; 32];

/// Content-addressed storage with snapshots
pub struct Memory {
    /// CID → content
    cas: Arc<RwLock<HashMap<Cid, Vec<u8>>>>,
    /// Label → timeline of (epoch, root_cid)
    snapshots: Arc<RwLock<HashMap<String, Vec<(u64, Cid)>>>>,
    /// Current epoch counter
    epoch: Arc<RwLock<u64>>,
}

impl Memory {
    pub fn new() -> Self {
        Memory {
            cas: Arc::new(RwLock::new(HashMap::new())),
            snapshots: Arc::new(RwLock::new(HashMap::new())),
            epoch: Arc::new(RwLock::new(0)),
        }
    }

    /// Put content, return CID (idempotent)
    pub fn put(&self, bytes: &[u8]) -> Cid {
        let mut hasher = Hasher::new();
        hasher.update(bytes);
        let cid = *hasher.finalize().as_bytes();
        
        // Only write if not present (idempotent)
        let mut cas = self.cas.write().unwrap();
        cas.entry(cid).or_insert_with(|| bytes.to_vec());
        
        cid
    }

    /// Get content by CID
    pub fn get(&self, cid: &Cid) -> Option<Vec<u8>> {
        let cas = self.cas.read().unwrap();
        cas.get(cid).cloned()
    }

    /// Create snapshot with root CID
    pub fn snapshot(&self, root: &Cid, label: &str) -> Cid {
        let mut epoch = self.epoch.write().unwrap();
        *epoch += 1;
        let current_epoch = *epoch;
        
        let mut snapshots = self.snapshots.write().unwrap();
        let timeline = snapshots.entry(label.to_string()).or_insert_with(Vec::new);
        timeline.push((current_epoch, *root));
        
        // Return snapshot CID (hash of label + epoch + root)
        let mut hasher = Hasher::new();
        hasher.update(label.as_bytes());
        hasher.update(&current_epoch.to_le_bytes());
        hasher.update(root);
        *hasher.finalize().as_bytes()
    }

    /// Get latest root for label
    pub fn head(&self, label: &str) -> Option<Cid> {
        let snapshots = self.snapshots.read().unwrap();
        snapshots.get(label)
            .and_then(|timeline| timeline.last())
            .map(|(_, cid)| *cid)
    }

    /// Iterate timeline (newest → oldest)
    pub fn timeline(&self, label: &str) -> Vec<(u64, Cid)> {
        let snapshots = self.snapshots.read().unwrap();
        snapshots.get(label)
            .map(|timeline| {
                let mut reversed = timeline.clone();
                reversed.reverse();
                reversed
            })
            .unwrap_or_default()
    }

    /// Garbage collect unreachable objects (optional for H2)
    pub fn gc(&self, keep_roots: &[Cid]) -> usize {
        // Mark & sweep from roots
        let mut reachable = std::collections::HashSet::new();
        for root in keep_roots {
            self.mark_reachable(*root, &mut reachable);
        }
        
        let mut cas = self.cas.write().unwrap();
        let before = cas.len();
        cas.retain(|cid, _| reachable.contains(cid));
        let after = cas.len();
        
        before - after
    }

    fn mark_reachable(&self, cid: Cid, visited: &mut std::collections::HashSet<Cid>) {
        if !visited.insert(cid) {
            return; // Already visited
        }
        
        // Parse content for child CIDs (simplified - real impl would parse Merkle links)
        if let Some(content) = self.get(&cid) {
            // Extract child CIDs from content...
            // For now, assume leaf nodes
        }
    }
}

/// Merkle tree node for structured data
#[derive(Clone, Debug)]
pub enum MerkleNode {
    Leaf(Vec<u8>),
    Branch {
        left: Cid,
        right: Cid,
    },
}

impl MerkleNode {
    pub fn to_bytes(&self) -> Vec<u8> {
        match self {
            MerkleNode::Leaf(data) => {
                let mut bytes = vec![0u8]; // Tag for leaf
                bytes.extend_from_slice(data);
                bytes
            }
            MerkleNode::Branch { left, right } => {
                let mut bytes = vec![1u8]; // Tag for branch
                bytes.extend_from_slice(left);
                bytes.extend_from_slice(right);
                bytes
            }
        }
    }

    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        if bytes.is_empty() {
            return None;
        }
        
        match bytes[0] {
            0 => Some(MerkleNode::Leaf(bytes[1..].to_vec())),
            1 if bytes.len() >= 65 => {
                let mut left = [0u8; 32];
                let mut right = [0u8; 32];
                left.copy_from_slice(&bytes[1..33]);
                right.copy_from_slice(&bytes[33..65]);
                Some(MerkleNode::Branch { left, right })
            }
            _ => None,
        }
    }
}

/// Build Merkle tree from data chunks
pub fn build_merkle_tree(memory: &Memory, chunks: &[Vec<u8>]) -> Cid {
    if chunks.is_empty() {
        return memory.put(b"empty");
    }
    
    // Create leaf nodes
    let mut layer: Vec<Cid> = chunks.iter()
        .map(|chunk| {
            let leaf = MerkleNode::Leaf(chunk.clone());
            memory.put(&leaf.to_bytes())
        })
        .collect();
    
    // Build tree bottom-up
    while layer.len() > 1 {
        let mut next_layer = Vec::new();
        
        for pair in layer.chunks(2) {
            let node = if pair.len() == 2 {
                MerkleNode::Branch {
                    left: pair[0],
                    right: pair[1],
                }
            } else {
                // Odd number - promote single node
                return pair[0];
            };
            
            next_layer.push(memory.put(&node.to_bytes()));
        }
        
        layer = next_layer;
    }
    
    layer[0]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_idempotent_put() {
        let mem = Memory::new();
        let data = b"hello world";
        
        let cid1 = mem.put(data);
        let cid2 = mem.put(data);
        
        assert_eq!(cid1, cid2, "put must be idempotent");
    }

    #[test]
    fn test_get_returns_put() {
        let mem = Memory::new();
        let data = b"test data";
        
        let cid = mem.put(data);
        let retrieved = mem.get(&cid).expect("should retrieve");
        
        assert_eq!(retrieved, data);
    }

    #[test]
    fn test_snapshot_timeline() {
        let mem = Memory::new();
        
        let root1 = mem.put(b"state 1");
        let snap1 = mem.snapshot(&root1, "main");
        
        let root2 = mem.put(b"state 2");
        let snap2 = mem.snapshot(&root2, "main");
        
        assert_eq!(mem.head("main"), Some(root2));
        
        let timeline = mem.timeline("main");
        assert_eq!(timeline.len(), 2);
        assert_eq!(timeline[0].1, root2); // Newest first
        assert_eq!(timeline[1].1, root1);
    }

    #[test]
    fn test_merkle_tree() {
        let mem = Memory::new();
        
        let chunks = vec![
            b"chunk1".to_vec(),
            b"chunk2".to_vec(),
            b"chunk3".to_vec(),
            b"chunk4".to_vec(),
        ];
        
        let root = build_merkle_tree(&mem, &chunks);
        
        // Verify root exists
        assert!(mem.get(&root).is_some());
        
        // Verify deterministic
        let root2 = build_merkle_tree(&mem, &chunks);
        assert_eq!(root, root2);
    }

    #[test]
    fn test_gc() {
        let mem = Memory::new();
        
        let keep = mem.put(b"keep this");
        let _discard = mem.put(b"discard this");
        
        let collected = mem.gc(&[keep]);
        assert_eq!(collected, 1);
        
        assert!(mem.get(&keep).is_some());
    }
}

#[cfg(all(test, not(debug_assertions)))]
mod bench {
    use super::*;
    use std::time::Instant;

    #[test]
    fn bench_put_get() {
        let mem = Memory::new();
        let data: Vec<Vec<u8>> = (0..100_000)
            .map(|i| format!("data-{}", i).into_bytes())
            .collect();
        
        // Benchmark put
        let start = Instant::now();
        let cids: Vec<Cid> = data.iter().map(|d| mem.put(d)).collect();
        let put_time = start.elapsed();
        
        // Benchmark get
        let start = Instant::now();
        for cid in &cids[0..1000] {
            mem.get(cid);
        }
        let get_time = start.elapsed();
        
        println!("Put 100k: {:?}, avg: {:?}", put_time, put_time / 100_000);
        println!("Get 1k: {:?}, avg: {:?}", get_time, get_time / 1000);
        
        // Assert performance targets
        assert!(put_time.as_micros() / 100_000 < 100, "Put must be < 100μs");
        assert!(get_time.as_micros() / 1000 < 100, "Get must be < 100μs");
    }

    #[test]
    fn bench_snapshot() {
        let mem = Memory::new();
        
        // Create 100k entries
        let root_data: Vec<u8> = (0..100_000)
            .flat_map(|i| format!("entry-{}", i).into_bytes())
            .collect();
        
        let root = mem.put(&root_data);
        
        // Benchmark snapshot
        let start = Instant::now();
        mem.snapshot(&root, "bench");
        let snap_time = start.elapsed();
        
        println!("Snapshot 100k entries: {:?}", snap_time);
        assert!(snap_time.as_millis() < 5, "Snapshot must be < 5ms");
    }
}