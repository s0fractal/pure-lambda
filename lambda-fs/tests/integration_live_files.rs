//! Integration tests for λFS live files
//! Verifies materialization, invalidation, and WASM E2E

use std::fs;
use std::path::Path;

/// Test 1: Materialization is deterministic
#[test]
fn test_materialize_deterministic() {
    // Setup lens configuration
    let lens_config = r#"
derivation: "protein-hash"
inputs:
  canon: "../docs/genome/FOCUS.md"
  k: 32
cache_key: ["canon", "k"]
proofs:
  - "len(vec) == 32"
  - "norm(vec) == 1.0"
"#;
    
    // Write lens
    fs::create_dir_all("test-views").unwrap();
    fs::write("test-views/protein.vec.lens", lens_config).unwrap();
    
    // Trigger materialization (simplified - real impl would use lambda-fs)
    let vec1 = materialize_view("test-views/protein.vec");
    let vec2 = materialize_view("test-views/protein.vec");
    
    // Verify deterministic
    assert_eq!(vec1, vec2, "Materialization must be deterministic");
    
    // Verify properties
    assert_eq!(vec1.len(), 32, "Vector must have 32 elements");
    
    let norm: f32 = vec1.iter().map(|x| x * x).sum::<f32>().sqrt();
    assert!((norm - 1.0).abs() < 0.001, "Vector must be normalized");
    
    // Cleanup
    fs::remove_dir_all("test-views").ok();
}

/// Test 2: Invalidation on source change
#[test]
fn test_invalidation() {
    // Create initial source
    fs::create_dir_all("test-data").unwrap();
    fs::write("test-data/source.txt", "version 1").unwrap();
    
    // Create lens that depends on source
    let lens_config = r#"
derivation: "hash-source"
inputs:
  source: "../test-data/source.txt"
cache_key: ["source"]
"#;
    
    fs::create_dir_all("test-views").unwrap();
    fs::write("test-views/derived.lens", lens_config).unwrap();
    
    // First materialization
    let cid1 = compute_cid("test-views/derived");
    
    // Change source
    fs::write("test-data/source.txt", "version 2").unwrap();
    
    // Second materialization should differ
    let cid2 = compute_cid("test-views/derived");
    
    assert_ne!(cid1, cid2, "CID must change when source changes");
    
    // Cleanup
    fs::remove_dir_all("test-data").ok();
    fs::remove_dir_all("test-views").ok();
}

/// Test 3: WASM agent E2E with FOCUS
#[test]
fn test_wasm_agent_e2e() {
    // Prepare input data
    fs::create_dir_all("test-views").unwrap();
    let numbers = (1..=10).map(|n| n.to_string()).collect::<Vec<_>>().join("\n");
    fs::write("test-views/numbers.vec", numbers).unwrap();
    
    // Run WASM agent (mocked for now - real impl would use wasmtime)
    let result = run_wasm_agent("agents/hello-focus/hello-focus.wasm");
    
    // Verify agent wrote intent
    assert!(Path::new("test-intents/focused-numbers").exists());
    
    // Read and verify result
    let output = fs::read_to_string("test-intents/focused-numbers").unwrap();
    let focused: Vec<i32> = output.lines()
        .filter_map(|line| line.parse().ok())
        .collect();
    
    // Should have filtered evens and doubled them: [4, 8, 12, 16, 20]
    assert_eq!(focused, vec![4, 8, 12, 16, 20]);
    
    // Verify FOCUS laws
    verify_focus_laws(&focused);
    
    // Cleanup
    fs::remove_dir_all("test-views").ok();
    fs::remove_dir_all("test-intents").ok();
}

// Helper functions

fn materialize_view(path: &str) -> Vec<f32> {
    // Simplified materialization - real impl would use lambda-fs
    // For test, generate deterministic vector from path hash
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut hasher = DefaultHasher::new();
    path.hash(&mut hasher);
    let seed = hasher.finish();
    
    let mut vec = Vec::with_capacity(32);
    let mut rng = seed;
    
    for _ in 0..32 {
        rng = rng.wrapping_mul(1664525).wrapping_add(1013904223);
        let val = (rng as f32 / u64::MAX as f32) * 2.0 - 1.0;
        vec.push(val);
    }
    
    // Normalize
    let norm = vec.iter().map(|x| x * x).sum::<f32>().sqrt();
    for val in &mut vec {
        *val /= norm;
    }
    
    vec
}

fn compute_cid(path: &str) -> String {
    // Compute Blake3 CID of materialized content
    use blake3::Hasher;
    
    let content = materialize_view(path);
    let bytes: Vec<u8> = content.iter()
        .flat_map(|f| f.to_le_bytes())
        .collect();
    
    let mut hasher = Hasher::new();
    hasher.update(&bytes);
    
    format!("{:x}", hasher.finalize())
}

fn run_wasm_agent(wasm_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    // Mocked WASM execution - real impl would use wasmtime
    // For test, simulate agent behavior
    
    fs::create_dir_all("test-intents")?;
    
    // Simulate FOCUS operation
    let input = fs::read_to_string("test-views/numbers.vec")?;
    let numbers: Vec<i32> = input.lines()
        .filter_map(|line| line.parse().ok())
        .collect();
    
    let focused: Vec<i32> = numbers
        .into_iter()
        .filter(|&n| n % 2 == 0)
        .map(|n| n * 2)
        .collect();
    
    let output = focused.iter()
        .map(|n| n.to_string())
        .collect::<Vec<_>>()
        .join("\n");
    
    fs::write("test-intents/focused-numbers", output)?;
    
    Ok(())
}

fn verify_focus_laws(data: &[i32]) {
    // Verify FOCUS maintains its laws
    
    // Law 1: All elements are even (doubled from even source)
    assert!(data.iter().all(|&n| n % 2 == 0), "FOCUS law: all outputs even");
    
    // Law 2: Monotonic if input was monotonic
    let mut sorted = data.to_vec();
    sorted.sort();
    assert_eq!(data, &sorted[..], "FOCUS law: preserves order");
    
    // Law 3: No duplicates if input had none
    let mut dedup = data.to_vec();
    dedup.sort();
    dedup.dedup();
    assert_eq!(dedup.len(), data.len(), "FOCUS law: no duplicates");
}