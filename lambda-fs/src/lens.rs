use std::collections::HashMap;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use sha3::{Sha3_256, Digest};

/// Lens describes how to materialize a file when read
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lens {
    /// WASI component and function to call
    pub derivation: String,
    
    /// Input files and parameters
    pub inputs: LensInputs,
    
    /// Output configuration
    pub outputs: LensOutputs,
    
    /// Cache key components
    pub cache_key: Vec<String>,
    
    /// Required capabilities
    pub capabilities: Vec<Capability>,
    
    /// Properties to verify
    pub proofs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LensInputs {
    /// File inputs (path -> CID resolved)
    #[serde(flatten)]
    pub files: HashMap<String, PathBuf>,
    
    /// Parameters (static values)
    pub params: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LensOutputs {
    /// Output file name
    pub file: String,
    
    /// Output format hint
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Capability {
    Cpu,
    Mem,
    Time,
    Randomness,
}

impl Lens {
    /// Load lens from YAML file
    pub fn from_file(path: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let lens: Lens = serde_yaml::from_str(&content)?;
        Ok(lens)
    }
    
    /// Compute cache key hash
    pub fn cache_key_hash(&self, resolved_inputs: &HashMap<String, String>) -> String {
        let mut hasher = Sha3_256::new();
        
        for key_component in &self.cache_key {
            if key_component.starts_with("inputs.") {
                let input_key = key_component.strip_prefix("inputs.").unwrap();
                if let Some(cid) = resolved_inputs.get(input_key) {
                    hasher.update(cid.as_bytes());
                }
            } else if key_component.starts_with("params.") {
                let param_key = key_component.strip_prefix("params.").unwrap();
                if let Some(value) = self.inputs.params.get(param_key) {
                    hasher.update(format!("{:?}", value).as_bytes());
                }
            }
        }
        
        format!("cache-{:x}", hasher.finalize())
    }
    
    /// Parse ROI from path like /roi=(x:120..320,y:50..180,σ:12)/
    pub fn parse_roi_from_path(path: &Path) -> Option<ROI> {
        let path_str = path.to_str()?;
        
        // Match pattern: roi=(x:min..max,y:min..max,σ:val)
        let roi_regex = regex::Regex::new(
            r"roi=\(x:(\d+)\.\.(\d+),y:(\d+)\.\.(\d+),σ:(\d+)\)"
        ).ok()?;
        
        let caps = roi_regex.captures(path_str)?;
        
        Some(ROI {
            x_min: caps[1].parse().ok()?,
            x_max: caps[2].parse().ok()?,
            y_min: caps[3].parse().ok()?,
            y_max: caps[4].parse().ok()?,
            sigma: caps[5].parse().ok()?,
        })
    }
    
    /// Parse observation angle from path like /theta=45/phase=0.5/
    pub fn parse_observation_from_path(path: &Path) -> Option<Observation> {
        let path_str = path.to_str()?;
        
        let theta_regex = regex::Regex::new(r"theta=(\d+(?:\.\d+)?)")?;
        let phase_regex = regex::Regex::new(r"phase=(\d+(?:\.\d+)?)")?;
        
        let theta = theta_regex.captures(path_str)
            .and_then(|c| c[1].parse().ok())?;
        let phase = phase_regex.captures(path_str)
            .and_then(|c| c[1].parse().ok())
            .unwrap_or(0.0);
        
        Some(Observation { theta, phase })
    }
}

/// Region of Interest for spatial operations
#[derive(Debug, Clone)]
pub struct ROI {
    pub x_min: u32,
    pub x_max: u32,
    pub y_min: u32,
    pub y_max: u32,
    pub sigma: u32,
}

/// Observation parameters for wave-files
#[derive(Debug, Clone)]
pub struct Observation {
    pub theta: f64,  // Angle in degrees
    pub phase: f64,  // Phase in [0, 1]
}

/// Example lens files
pub fn example_protein_lens() -> &'static str {
    r#"
derivation: "wasm://proteomics#graph_spectrum"
inputs:
  canon: "../genes/FOCUS/canon.json"
  params:
    k: 32
    norm: "L2"
outputs:
  file: "protein.vec"
  format: "f32[32]"
cache_key:
  - inputs.canon
  - params.k
  - params.norm
capabilities:
  - cpu
  - mem
proofs:
  - "len(vec) == k"
  - "norm(vec) == 1.0"
  - "stable_hash(vec)"
"#
}

pub fn example_wave_lens() -> &'static str {
    r#"
derivation: "wasm://wave#observe"
inputs:
  file: "../../content.wave"
  params:
    theta_deg: 45
    phase: 0.5
    mapping: "../../wave-mapping.yaml"
outputs:
  file: "observation.vec"
  format: "complex64[256]"
cache_key:
  - inputs.file
  - params.theta_deg
  - params.phase
  - inputs.mapping
capabilities:
  - cpu
  - mem
  - time
proofs:
  - "linearity"
  - "unitarity"
  - "432Hz_resonance"
"#
}

pub fn example_organism_lens() -> &'static str {
    r#"
derivation: "wasm://forge#bundle_champions"
inputs:
  align: "../genes/*/rewrites.yaml"
  laws: "../genes/*/laws.yaml"
  canon: "../genes/*/canon.json"
  policy: "./policy.yaml"
outputs:
  file: "organism.wasm"
  format: "wasm"
cache_key:
  - inputs.align
  - inputs.laws
  - inputs.canon
  - inputs.policy
capabilities:
  - cpu
  - mem
proofs:
  - "all_laws_pass"
  - "no_regressions"
  - "deterministic_build"
"#
}