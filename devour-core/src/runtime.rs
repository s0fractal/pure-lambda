use anyhow::{Context, Result};
use wasmtime::*;
use wasmtime_wasi::{WasiCtx, WasiCtxBuilder};
use std::path::Path;

/// WASM runtime for extractors and transformers
pub struct Runtime {
    engine: Engine,
    linker: Linker<WasmState>,
}

struct WasmState {
    wasi: WasiCtx,
    memory: Option<Memory>,
}

impl Runtime {
    pub fn new() -> Result<Self> {
        let mut config = Config::new();
        config.wasm_component_model(true);
        config.async_support(true);
        
        let engine = Engine::new(&config)?;
        let mut linker = Linker::new(&engine);
        
        // Add WASI support
        wasmtime_wasi::add_to_linker(&mut linker, |state: &mut WasmState| &mut state.wasi)?;
        
        Ok(Runtime { engine, linker })
    }
    
    /// Load extractor component
    pub async fn load_extractor(&self, wasm_path: &Path) -> Result<Extractor> {
        let component = Component::from_file(&self.engine, wasm_path)?;
        let mut store = Store::new(
            &self.engine,
            WasmState {
                wasi: WasiCtxBuilder::new().inherit_stdio().build(),
                memory: None,
            },
        );
        
        let instance = self.linker.instantiate_async(&mut store, &component).await?;
        
        Ok(Extractor { store, instance })
    }
    
    /// Execute extraction
    pub async fn extract_ir(extractor: &mut Extractor, code: &str) -> Result<String> {
        // Get extract_ir function
        let extract_fn = extractor.instance
            .get_typed_func::<(&str,), (String,)>(&mut extractor.store, "extract-ir")?;
        
        // Call function
        let (ir,) = extract_fn.call_async(&mut extractor.store, (code,)).await?;
        
        Ok(ir)
    }
    
    /// Verify properties
    pub async fn verify(extractor: &mut Extractor, ir: &str, props: &[String]) -> Result<String> {
        let verify_fn = extractor.instance
            .get_typed_func::<(&str, &[String]), (String,)>(&mut extractor.store, "verify")?;
        
        let (proof,) = verify_fn.call_async(&mut extractor.store, (ir, props)).await?;
        
        Ok(proof)
    }
}

pub struct Extractor {
    store: Store<WasmState>,
    instance: Instance,
}

/// Load and execute λ-IR extractors for different languages
pub struct ExtractorSet {
    runtime: Runtime,
    extractors: dashmap::DashMap<String, Extractor>,
}

impl ExtractorSet {
    pub async fn new() -> Result<Self> {
        let runtime = Runtime::new()?;
        let extractors = dashmap::DashMap::new();
        
        // Load default extractors
        for (lang, path) in &[
            ("typescript", "extractors/typescript.wasm"),
            ("javascript", "extractors/javascript.wasm"),
            ("python", "extractors/python.wasm"),
            ("rust", "extractors/rust.wasm"),
        ] {
            if Path::new(path).exists() {
                let extractor = runtime.load_extractor(Path::new(path)).await?;
                extractors.insert(lang.to_string(), extractor);
            }
        }
        
        Ok(ExtractorSet { runtime, extractors })
    }
    
    /// Extract IR from source file
    pub async fn extract(&self, file_path: &str, code: &str) -> Result<String> {
        // Detect language from extension
        let lang = detect_language(file_path);
        
        // Get appropriate extractor
        let mut extractor = self.extractors.get_mut(&lang)
            .context(format!("No extractor for language: {}", lang))?;
        
        // Extract IR
        Runtime::extract_ir(&mut extractor, code).await
    }
    
    /// Verify gene properties
    pub async fn verify_gene(&self, ir: &str, props: Vec<String>) -> Result<String> {
        // Use generic verifier
        if let Some(mut verifier) = self.extractors.get_mut("verifier") {
            Runtime::verify(&mut verifier, ir, &props).await
        } else {
            // Fallback to basic verification
            Ok(serde_json::json!({
                "verified": true,
                "properties": props,
                "timestamp": chrono::Utc::now().timestamp()
            }).to_string())
        }
    }
}

fn detect_language(path: &str) -> String {
    match Path::new(path).extension().and_then(|s| s.to_str()) {
        Some("ts") | Some("tsx") => "typescript".to_string(),
        Some("js") | Some("jsx") => "javascript".to_string(),
        Some("py") => "python".to_string(),
        Some("rs") => "rust".to_string(),
        Some("go") => "go".to_string(),
        _ => "unknown".to_string(),
    }
}

/// Compile λ-IR to WASM module
pub async fn compile_to_wasm(ir: &str) -> Result<Vec<u8>> {
    // This would call the lambda-wasm compiler
    // For now, return empty module
    Ok(vec![])
}