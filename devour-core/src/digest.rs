use anyhow::Result;
use rayon::prelude::*;
use std::path::Path;
use walkdir::WalkDir;
use blake3::Hasher;

use crate::storage::{Store, Gene, GeneMetrics};
use crate::runtime::ExtractorSet;

#[derive(Debug)]
pub struct DigestStats {
    pub total: usize,
    pub unique: usize,
    pub failed: usize,
}

/// Digest source into genes
pub async fn digest(store: &Store, source: Option<&str>, parallel: bool) -> Result<DigestStats> {
    // Load extractors
    let extractors = ExtractorSet::new().await?;
    
    // Get sources to digest
    let sources = if let Some(s) = source {
        vec![s.to_string()]
    } else {
        // Get all undigested sources from store
        get_undigested_sources(store).await?
    };
    
    let mut total = 0;
    let mut unique_souls = dashmap::DashSet::new();
    let mut failed = 0;
    
    for source_path in sources {
        tracing::info!("Digesting {}", source_path);
        
        // Extract source from CAS
        let source_data = extract_source(store, &source_path).await?;
        
        // Find all code files
        let files = find_code_files(&source_data);
        
        // Process files
        let genes: Vec<Result<Gene>> = if parallel {
            files.par_iter()
                .map(|file| extract_gene(&extractors, file, &source_path))
                .collect()
        } else {
            files.iter()
                .map(|file| extract_gene(&extractors, file, &source_path))
                .collect()
        };
        
        // Store genes
        for gene_result in genes {
            match gene_result {
                Ok(gene) => {
                    unique_souls.insert(gene.soul.clone());
                    store.put_gene(&gene).await?;
                    total += 1;
                }
                Err(e) => {
                    tracing::warn!("Failed to extract gene: {}", e);
                    failed += 1;
                }
            }
        }
    }
    
    Ok(DigestStats {
        total,
        unique: unique_souls.len(),
        failed,
    })
}

/// Extract gene from file
fn extract_gene(extractors: &ExtractorSet, file: &CodeFile, source: &str) -> Result<Gene> {
    // Read file content
    let code = std::fs::read_to_string(&file.path)?;
    
    // Extract λ-IR
    let ir = tokio::runtime::Handle::current()
        .block_on(extractors.extract(&file.path, &code))?;
    
    // Compute soul (semantic hash of IR)
    let soul = compute_soul(&ir);
    
    // Extract signatures
    let signatures = extract_signatures(&ir);
    
    // Compute metrics
    let metrics = compute_metrics(&code, &ir);
    
    Ok(Gene {
        soul,
        ir,
        source: source.to_string(),
        signatures,
        metrics,
    })
}

/// Compute soul from λ-IR
fn compute_soul(ir: &str) -> String {
    // Normalize IR (remove whitespace, sort components)
    let normalized = normalize_ir(ir);
    
    // Hash with Blake3
    let mut hasher = Hasher::new();
    hasher.update(b"SOUL:");
    hasher.update(normalized.as_bytes());
    let hash = hasher.finalize();
    
    format!("λ{}", hex::encode(&hash.as_bytes()[..8]))
}

/// Normalize λ-IR for consistent hashing
fn normalize_ir(ir: &str) -> String {
    // Parse and normalize (simplified)
    ir.lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty() && !line.starts_with("//"))
        .collect::<Vec<_>>()
        .join(" ")
}

/// Extract function signatures from IR
fn extract_signatures(ir: &str) -> Vec<String> {
    let mut signatures = Vec::new();
    
    for line in ir.lines() {
        if line.starts_with("LAM ") || line.starts_with("APP ") {
            signatures.push(line.to_string());
        }
    }
    
    signatures
}

/// Compute gene metrics
fn compute_metrics(code: &str, ir: &str) -> GeneMetrics {
    GeneMetrics {
        size: code.len(),
        complexity: compute_complexity(ir),
        purity: compute_purity(code),
    }
}

/// Compute cyclomatic complexity from IR
fn compute_complexity(ir: &str) -> f32 {
    let branches = ir.matches("CASE").count();
    let loops = ir.matches("REC").count();
    
    1.0 + branches as f32 + loops as f32
}

/// Compute purity score (0.0 to 1.0)
fn compute_purity(code: &str) -> f32 {
    let mut impurities = 0;
    
    // Check for side effects
    if code.contains("console.") { impurities += 1; }
    if code.contains("Math.random") { impurities += 1; }
    if code.contains("Date.now") { impurities += 1; }
    if code.contains("fs.") { impurities += 1; }
    if code.contains("process.") { impurities += 1; }
    if code.contains("window.") { impurities += 1; }
    if code.contains("document.") { impurities += 1; }
    
    // Check for mutations
    if code.contains("let ") { impurities += 1; }
    if code.contains("var ") { impurities += 1; }
    if code.contains(".push(") { impurities += 1; }
    if code.contains(".pop(") { impurities += 1; }
    
    // Calculate purity
    let max_impurities = 10.0;
    1.0 - (impurities as f32 / max_impurities).min(1.0)
}

#[derive(Debug)]
struct CodeFile {
    path: String,
    language: String,
}

/// Find all code files in source
fn find_code_files(source_path: &str) -> Vec<CodeFile> {
    let mut files = Vec::new();
    let extensions = vec!["js", "ts", "jsx", "tsx", "py", "rs", "go", "java", "c", "cpp"];
    
    for entry in WalkDir::new(source_path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        
        // Skip non-files
        if !path.is_file() { continue; }
        
        // Skip node_modules, vendor, etc
        if path.components().any(|c| {
            let s = c.as_os_str().to_string_lossy();
            s == "node_modules" || s == "vendor" || s == ".git" || s == "target"
        }) {
            continue;
        }
        
        // Check extension
        if let Some(ext) = path.extension() {
            let ext_str = ext.to_string_lossy().to_lowercase();
            if extensions.contains(&ext_str.as_str()) {
                files.push(CodeFile {
                    path: path.to_string_lossy().to_string(),
                    language: detect_language(&ext_str),
                });
            }
        }
    }
    
    files
}

fn detect_language(ext: &str) -> String {
    match ext {
        "ts" | "tsx" => "typescript",
        "js" | "jsx" => "javascript",
        "py" => "python",
        "rs" => "rust",
        "go" => "go",
        "java" => "java",
        "c" | "h" => "c",
        "cpp" | "cc" | "cxx" => "cpp",
        _ => "unknown",
    }.to_string()
}

async fn get_undigested_sources(store: &Store) -> Result<Vec<String>> {
    // Query for sources without genes
    // Simplified - would query the index
    Ok(vec![])
}

async fn extract_source(store: &Store, source: &str) -> Result<String> {
    // Extract source archive to temp directory
    // Simplified - would handle tar/zip extraction
    Ok(source.to_string())
}