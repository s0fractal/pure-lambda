use std::path::{Path, PathBuf};
use std::collections::HashMap;
use std::fs;
use std::io;
use sha3::{Sha3_256, Digest};

mod lens;
use lens::{Lens, ROI, Observation};

/// λFS - Reactive File System
pub struct LambdaFS {
    /// Root directory of the file system
    root: PathBuf,
    
    /// Content-addressed storage
    store: ContentStore,
    
    /// Lens cache
    lenses: HashMap<PathBuf, Lens>,
    
    /// Materialization cache
    cache: HashMap<String, Vec<u8>>,
}

/// Content-Addressed Storage
pub struct ContentStore {
    root: PathBuf,
}

impl ContentStore {
    pub fn new(root: PathBuf) -> Self {
        fs::create_dir_all(&root).unwrap();
        ContentStore { root }
    }
    
    /// Store content and return CID
    pub fn put(&self, content: &[u8]) -> String {
        let mut hasher = Sha3_256::new();
        hasher.update(content);
        let hash = hasher.finalize();
        let cid = format!("bafy{:x}", hash);
        
        let path = self.root.join(&cid);
        if !path.exists() {
            fs::write(path, content).unwrap();
        }
        
        cid
    }
    
    /// Retrieve content by CID
    pub fn get(&self, cid: &str) -> Option<Vec<u8>> {
        let path = self.root.join(cid);
        fs::read(path).ok()
    }
}

impl LambdaFS {
    pub fn new(root: PathBuf) -> Self {
        let store_path = root.join("store");
        LambdaFS {
            root: root.clone(),
            store: ContentStore::new(store_path),
            lenses: HashMap::new(),
            cache: HashMap::new(),
        }
    }
    
    /// Main entry point: open a file
    pub fn open(&mut self, path: &Path) -> io::Result<Vec<u8>> {
        // Check if this is a reactive view
        if path.starts_with("views/") {
            self.materialize_view(path)
        } else {
            // Regular file read
            fs::read(self.root.join(path))
        }
    }
    
    /// Materialize a view by executing its lens
    fn materialize_view(&mut self, path: &Path) -> io::Result<Vec<u8>> {
        // Find the lens file
        let lens_path = self.find_lens_for_path(path)?;
        
        // Load lens if not cached
        if !self.lenses.contains_key(&lens_path) {
            let lens = Lens::from_file(&lens_path)
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
            self.lenses.insert(lens_path.clone(), lens);
        }
        
        let lens = self.lenses.get(&lens_path).unwrap();
        
        // Resolve inputs to CIDs
        let resolved_inputs = self.resolve_inputs(&lens.inputs.files)?;
        
        // Check cache
        let cache_key = lens.cache_key_hash(&resolved_inputs);
        if let Some(cached) = self.cache.get(&cache_key) {
            return Ok(cached.clone());
        }
        
        // Execute derivation (simplified - would call WASI component)
        let result = self.execute_derivation(lens, &resolved_inputs)?;
        
        // Store in CAS
        let cid = self.store.put(&result);
        println!("Materialized {} -> CID: {}", path.display(), cid);
        
        // Cache result
        self.cache.insert(cache_key, result.clone());
        
        Ok(result)
    }
    
    /// Find the appropriate lens file for a path
    fn find_lens_for_path(&self, path: &Path) -> io::Result<PathBuf> {
        // Look for exact match first
        let lens_name = format!("{}.lens", path.file_name().unwrap().to_str().unwrap());
        let lens_path = self.root.join("lenses").join(lens_name);
        
        if lens_path.exists() {
            return Ok(lens_path);
        }
        
        // Check for pattern-based lenses (ROI, observation angles)
        if let Some(roi) = Lens::parse_roi_from_path(path) {
            // Use ROI-specific lens
            let roi_lens = self.root.join("lenses/roi.lens");
            if roi_lens.exists() {
                return Ok(roi_lens);
            }
        }
        
        if let Some(obs) = Lens::parse_observation_from_path(path) {
            // Use observation-specific lens
            let obs_lens = self.root.join("lenses/observe.lens");
            if obs_lens.exists() {
                return Ok(obs_lens);
            }
        }
        
        Err(io::Error::new(io::ErrorKind::NotFound, "No lens found"))
    }
    
    /// Resolve file inputs to CIDs
    fn resolve_inputs(&self, files: &HashMap<String, PathBuf>) -> io::Result<HashMap<String, String>> {
        let mut resolved = HashMap::new();
        
        for (key, path) in files {
            let full_path = self.root.join(path);
            let content = fs::read(&full_path)?;
            let cid = self.store.put(&content);
            resolved.insert(key.clone(), cid);
        }
        
        Ok(resolved)
    }
    
    /// Execute the derivation (simplified - would use WASI)
    fn execute_derivation(&self, lens: &Lens, inputs: &HashMap<String, String>) -> io::Result<Vec<u8>> {
        // This would normally:
        // 1. Load WASI component from lens.derivation
        // 2. Set up sandbox with lens.capabilities
        // 3. Pass inputs and params
        // 4. Execute and capture output
        // 5. Verify lens.proofs
        
        // For now, return mock data based on derivation type
        match lens.derivation.as_str() {
            "wasm://proteomics#graph_spectrum" => {
                // Mock protein vector (32 floats)
                let mut vec = Vec::new();
                for i in 0..32 {
                    vec.extend_from_slice(&((i as f32 / 32.0).to_le_bytes()));
                }
                Ok(vec)
            }
            "wasm://wave#observe" => {
                // Mock wave observation
                Ok(b"wave observation at angle".to_vec())
            }
            "wasm://forge#bundle_champions" => {
                // Mock WASM bundle
                Ok(b"\0asm\x01\0\0\0".to_vec())  // Minimal WASM header
            }
            _ => {
                Err(io::Error::new(io::ErrorKind::Other, "Unknown derivation"))
            }
        }
    }
}

/// CLI for testing λFS
fn main() {
    use clap::{Command, Arg};
    
    let matches = Command::new("lambda-fs")
        .version("0.1.0")
        .about("Reactive File System - files that materialize when read")
        .subcommand(
            Command::new("cat")
                .about("Read a file (triggers materialization)")
                .arg(Arg::new("path")
                    .required(true)
                    .help("Path to read"))
        )
        .subcommand(
            Command::new("ls")
                .about("List directory contents")
                .arg(Arg::new("path")
                    .default_value(".")
                    .help("Directory to list"))
        )
        .subcommand(
            Command::new("init")
                .about("Initialize λFS structure")
                .arg(Arg::new("root")
                    .default_value("./lambda-fs")
                    .help("Root directory"))
        )
        .get_matches();
    
    match matches.subcommand() {
        Some(("cat", sub_matches)) => {
            let path = sub_matches.get_one::<String>("path").unwrap();
            let mut fs = LambdaFS::new(PathBuf::from("./lambda-fs"));
            
            match fs.open(Path::new(path)) {
                Ok(content) => {
                    if path.ends_with(".vec") {
                        // Display as floats
                        for chunk in content.chunks(4) {
                            if chunk.len() == 4 {
                                let float = f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
                                print!("{:.4} ", float);
                            }
                        }
                        println!();
                    } else {
                        // Display as text or hex
                        match String::from_utf8(content.clone()) {
                            Ok(text) => print!("{}", text),
                            Err(_) => {
                                for byte in content {
                                    print!("{:02x} ", byte);
                                }
                                println!();
                            }
                        }
                    }
                }
                Err(e) => eprintln!("Error: {}", e),
            }
        }
        Some(("ls", sub_matches)) => {
            let path = sub_matches.get_one::<String>("path").unwrap();
            let full_path = PathBuf::from("./lambda-fs").join(path);
            
            if let Ok(entries) = fs::read_dir(full_path) {
                for entry in entries {
                    if let Ok(entry) = entry {
                        println!("{}", entry.file_name().to_string_lossy());
                    }
                }
            }
        }
        Some(("init", sub_matches)) => {
            let root = sub_matches.get_one::<String>("root").unwrap();
            let root_path = PathBuf::from(root);
            
            // Create directory structure
            fs::create_dir_all(root_path.join("store")).unwrap();
            fs::create_dir_all(root_path.join("genes/FOCUS")).unwrap();
            fs::create_dir_all(root_path.join("views")).unwrap();
            fs::create_dir_all(root_path.join("lenses")).unwrap();
            fs::create_dir_all(root_path.join("wave/observations")).unwrap();
            
            // Write example lens files
            fs::write(
                root_path.join("lenses/protein.vec.lens"),
                lens::example_protein_lens()
            ).unwrap();
            
            fs::write(
                root_path.join("lenses/observation.vec.lens"),
                lens::example_wave_lens()
            ).unwrap();
            
            fs::write(
                root_path.join("lenses/organism.wasm.lens"),
                lens::example_organism_lens()
            ).unwrap();
            
            println!("Initialized λFS at {}", root);
            println!("Structure created:");
            println!("  /store/        - Content-addressed storage");
            println!("  /genes/        - Gene documents");
            println!("  /views/        - Reactive views");
            println!("  /lenses/       - Derivation rules");
            println!("  /wave/         - Wave-file integration");
        }
        _ => {
            println!("Use 'lambda-fs help' for usage information");
        }
    }
}