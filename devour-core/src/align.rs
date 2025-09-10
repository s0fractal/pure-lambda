use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

use crate::storage::Store;

#[derive(Debug, Serialize, Deserialize)]
pub struct AlignmentRules {
    pub mappings: HashMap<String, EquivalenceClass>,
    pub signatures: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EquivalenceClass {
    pub canonical: String,
    pub lodash: Vec<String>,
    pub ramda: Vec<String>,
    pub underscore: Vec<String>,
    pub others: HashMap<String, Vec<String>>,
}

/// Align genes into equivalence classes
pub async fn align(store: &Store, rules_path: Option<&str>) -> Result<usize> {
    // Load alignment rules
    let rules = if let Some(path) = rules_path {
        load_rules(path)?
    } else {
        default_rules()
    };
    
    // Get all genes from store
    let genes = get_all_genes(store).await?;
    
    // Build equivalence classes
    let mut classes: HashMap<String, HashSet<String>> = HashMap::new();
    
    for (soul1, gene1) in &genes {
        for (soul2, gene2) in &genes {
            if soul1 >= soul2 { continue; }
            
            // Check if equivalent
            if are_equivalent(gene1, gene2, &rules) {
                // Add to equivalence class
                let class = classes.entry(soul1.clone()).or_default();
                class.insert(soul2.clone());
                
                // Store in database
                store.add_equivalence(soul1, soul2, confidence(gene1, gene2)).await?;
            }
        }
    }
    
    // Merge transitive equivalences
    let merged = merge_equivalence_classes(classes);
    
    tracing::info!("Found {} equivalence classes", merged.len());
    
    Ok(merged.len())
}

/// Check if two genes are equivalent
fn are_equivalent(gene1: &GeneInfo, gene2: &GeneInfo, rules: &AlignmentRules) -> bool {
    // Check name mapping
    if let Some(class) = rules.mappings.get(&gene1.name) {
        if class.lodash.contains(&gene2.name) ||
           class.ramda.contains(&gene2.name) ||
           class.underscore.contains(&gene2.name) {
            return true;
        }
    }
    
    // Check signature similarity
    if signature_match(&gene1.signature, &gene2.signature) > 0.9 {
        return true;
    }
    
    // Check IR similarity
    if ir_similarity(&gene1.ir, &gene2.ir) > 0.95 {
        return true;
    }
    
    false
}

/// Calculate confidence score for equivalence
fn confidence(gene1: &GeneInfo, gene2: &GeneInfo) -> f32 {
    let mut score = 0.0;
    
    // Name similarity
    score += name_similarity(&gene1.name, &gene2.name) * 0.2;
    
    // Signature match
    score += signature_match(&gene1.signature, &gene2.signature) * 0.3;
    
    // IR similarity
    score += ir_similarity(&gene1.ir, &gene2.ir) * 0.5;
    
    score.min(1.0)
}

/// Calculate name similarity (Levenshtein-based)
fn name_similarity(name1: &str, name2: &str) -> f32 {
    let n1 = normalize_name(name1);
    let n2 = normalize_name(name2);
    
    if n1 == n2 { return 1.0; }
    
    // Simple Levenshtein ratio
    let distance = levenshtein(&n1, &n2);
    let max_len = n1.len().max(n2.len()) as f32;
    
    1.0 - (distance as f32 / max_len)
}

fn normalize_name(name: &str) -> String {
    name.to_lowercase()
        .replace("_", "")
        .replace("-", "")
}

/// Calculate signature match
fn signature_match(sig1: &str, sig2: &str) -> f32 {
    // Parse signatures (simplified)
    let parts1: Vec<&str> = sig1.split("->").collect();
    let parts2: Vec<&str> = sig2.split("->").collect();
    
    if parts1.len() != parts2.len() { return 0.0; }
    
    let mut matches = 0;
    for (p1, p2) in parts1.iter().zip(parts2.iter()) {
        if normalize_type(p1) == normalize_type(p2) {
            matches += 1;
        }
    }
    
    matches as f32 / parts1.len() as f32
}

fn normalize_type(typ: &str) -> String {
    typ.trim()
        .replace("Array", "[]")
        .replace("List", "[]")
        .replace("Function", "->")
}

/// Calculate IR similarity
fn ir_similarity(ir1: &str, ir2: &str) -> f32 {
    // Normalize IRs
    let norm1 = normalize_ir(ir1);
    let norm2 = normalize_ir(ir2);
    
    if norm1 == norm2 { return 1.0; }
    
    // Token-based similarity
    let tokens1: HashSet<&str> = norm1.split_whitespace().collect();
    let tokens2: HashSet<&str> = norm2.split_whitespace().collect();
    
    let intersection = tokens1.intersection(&tokens2).count();
    let union = tokens1.union(&tokens2).count();
    
    if union == 0 { return 0.0; }
    
    intersection as f32 / union as f32
}

fn normalize_ir(ir: &str) -> String {
    ir.lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty() && !line.starts_with("//"))
        .collect::<Vec<_>>()
        .join(" ")
}

/// Merge transitive equivalence classes
fn merge_equivalence_classes(classes: HashMap<String, HashSet<String>>) -> Vec<HashSet<String>> {
    let mut merged = Vec::new();
    let mut visited = HashSet::new();
    
    for (root, members) in classes {
        if visited.contains(&root) { continue; }
        
        let mut class = HashSet::new();
        class.insert(root.clone());
        
        // Add all transitively connected souls
        let mut queue = members.clone();
        while let Some(soul) = queue.iter().next().cloned() {
            queue.remove(&soul);
            if visited.insert(soul.clone()) {
                class.insert(soul.clone());
                if let Some(more) = classes.get(&soul) {
                    queue.extend(more.clone());
                }
            }
        }
        
        merged.push(class);
    }
    
    merged
}

/// Simple Levenshtein distance
fn levenshtein(s1: &str, s2: &str) -> usize {
    let len1 = s1.len();
    let len2 = s2.len();
    
    if len1 == 0 { return len2; }
    if len2 == 0 { return len1; }
    
    let mut matrix = vec![vec![0; len2 + 1]; len1 + 1];
    
    for i in 0..=len1 { matrix[i][0] = i; }
    for j in 0..=len2 { matrix[0][j] = j; }
    
    for (i, c1) in s1.chars().enumerate() {
        for (j, c2) in s2.chars().enumerate() {
            let cost = if c1 == c2 { 0 } else { 1 };
            matrix[i + 1][j + 1] = (matrix[i][j] + cost)
                .min(matrix[i + 1][j] + 1)
                .min(matrix[i][j + 1] + 1);
        }
    }
    
    matrix[len1][len2]
}

#[derive(Debug)]
struct GeneInfo {
    soul: String,
    name: String,
    signature: String,
    ir: String,
}

async fn get_all_genes(store: &Store) -> Result<HashMap<String, GeneInfo>> {
    // Query all genes from store
    // Simplified - would query the database
    Ok(HashMap::new())
}

fn load_rules(path: &str) -> Result<AlignmentRules> {
    let content = std::fs::read_to_string(path)?;
    Ok(serde_yaml::from_str(&content)?)
}

fn default_rules() -> AlignmentRules {
    AlignmentRules {
        mappings: vec![
            ("map", vec!["map", "collect", "transform"], vec!["map"], vec!["map", "collect"]),
            ("filter", vec!["filter", "select"], vec!["filter"], vec!["filter", "select"]),
            ("reduce", vec!["reduce", "inject", "foldl"], vec!["reduce"], vec!["reduce", "inject"]),
            ("compose", vec!["flowRight"], vec!["compose"], vec!["compose"]),
            ("pipe", vec!["flow"], vec!["pipe"], vec![]),
        ].into_iter().map(|(canonical, lodash, ramda, underscore)| {
            (canonical.to_string(), EquivalenceClass {
                canonical: canonical.to_string(),
                lodash: lodash.into_iter().map(String::from).collect(),
                ramda: ramda.into_iter().map(String::from).collect(),
                underscore: underscore.into_iter().map(String::from).collect(),
                others: HashMap::new(),
            })
        }).collect(),
        signatures: HashMap::new(),
    }
}