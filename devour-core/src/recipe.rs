use anyhow::Result;
use serde::{Deserialize, Serialize};
use petgraph::graph::{DiGraph, NodeIndex};
use std::collections::HashMap;

use crate::storage::Store;

#[derive(Debug, Serialize, Deserialize)]
pub struct Recipe {
    pub sources: Vec<Source>,
    pub normalize: NormalizeConfig,
    pub align: AlignConfig,
    pub distill: DistillConfig,
    pub forge: ForgeConfig,
    pub attest: AttestConfig,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Source {
    #[serde(rename = "type")]
    pub typ: String,
    pub name: String,
    pub version: Option<String>,
    pub repo: Option<String>,
    #[serde(rename = "ref")]
    pub git_ref: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NormalizeConfig {
    pub languages: Vec<String>,
    pub extractors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AlignConfig {
    pub rules: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DistillConfig {
    pub objectives: HashMap<String, f32>,
    pub constraints: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ForgeConfig {
    pub organism: String,
    pub targets: Vec<String>,
    pub shim: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AttestConfig {
    pub sign: String,
    pub publish: Vec<String>,
}

/// Run recipe pipeline
pub async fn run(store: &Store, recipe_path: &str, watch: bool) -> Result<()> {
    // Load recipe
    let recipe = load_recipe(recipe_path)?;
    
    // Build DAG
    let dag = build_dag(&recipe);
    
    tracing::info!("Running recipe with {} tasks", dag.node_count());
    
    // Execute DAG
    execute_dag(store, dag, &recipe).await?;
    
    // Watch mode
    if watch {
        watch_and_rerun(store, recipe_path).await?;
    }
    
    Ok(())
}

/// Build task DAG from recipe
fn build_dag(recipe: &Recipe) -> DiGraph<Task, ()> {
    let mut dag = DiGraph::new();
    let mut nodes = HashMap::new();
    
    // Add tasks
    for source in &recipe.sources {
        let task = Task::Add { 
            source: source.name.clone() 
        };
        let idx = dag.add_node(task);
        nodes.insert(format!("add_{}", source.name), idx);
    }
    
    // Digest depends on add
    for source in &recipe.sources {
        let task = Task::Digest { 
            source: source.name.clone() 
        };
        let idx = dag.add_node(task);
        nodes.insert(format!("digest_{}", source.name), idx);
        
        // Add edge from add to digest
        if let Some(&add_idx) = nodes.get(&format!("add_{}", source.name)) {
            dag.add_edge(add_idx, idx, ());
        }
    }
    
    // Align depends on all digests
    let align_task = Task::Align;
    let align_idx = dag.add_node(align_task);
    for source in &recipe.sources {
        if let Some(&digest_idx) = nodes.get(&format!("digest_{}", source.name)) {
            dag.add_edge(digest_idx, align_idx, ());
        }
    }
    
    // Distill depends on align
    let distill_task = Task::Distill;
    let distill_idx = dag.add_node(distill_task);
    dag.add_edge(align_idx, distill_idx, ());
    
    // Forge depends on distill
    let forge_task = Task::Forge { 
        organism: recipe.forge.organism.clone() 
    };
    let forge_idx = dag.add_node(forge_task);
    dag.add_edge(distill_idx, forge_idx, ());
    
    // Attest depends on forge
    let attest_task = Task::Attest { 
        organism: recipe.forge.organism.clone() 
    };
    let attest_idx = dag.add_node(attest_task);
    dag.add_edge(forge_idx, attest_idx, ());
    
    dag
}

/// Execute task DAG
async fn execute_dag(store: &Store, dag: DiGraph<Task, ()>, recipe: &Recipe) -> Result<()> {
    // Topological sort
    let sorted = petgraph::algo::toposort(&dag, None)
        .map_err(|_| anyhow::anyhow!("Recipe contains cycles"))?;
    
    // Execute in order
    for node_idx in sorted {
        let task = &dag[node_idx];
        execute_task(store, task, recipe).await?;
    }
    
    Ok(())
}

/// Execute single task
async fn execute_task(store: &Store, task: &Task, recipe: &Recipe) -> Result<()> {
    match task {
        Task::Add { source } => {
            tracing::info!("Adding source: {}", source);
            let src = recipe.sources.iter()
                .find(|s| s.name == *source)
                .ok_or_else(|| anyhow::anyhow!("Source not found: {}", source))?;
            
            let source_str = if let Some(repo) = &src.repo {
                repo.clone()
            } else {
                source.clone()
            };
            
            crate::storage::add(store, &source_str, src.version.as_deref()).await?;
        }
        
        Task::Digest { source } => {
            tracing::info!("Digesting: {}", source);
            crate::digest::digest(store, Some(source), true).await?;
        }
        
        Task::Align => {
            tracing::info!("Aligning genes");
            crate::align::align(store, Some(&recipe.align.rules)).await?;
        }
        
        Task::Distill => {
            tracing::info!("Distilling champions");
            crate::distill::distill(store, None).await?;
        }
        
        Task::Forge { organism } => {
            tracing::info!("Forging organism: {}", organism);
            let shims = if let Some(shim) = &recipe.forge.shim {
                vec![shim.clone()]
            } else {
                vec![]
            };
            crate::forge::forge(store, organism, &recipe.forge.targets, &shims).await?;
        }
        
        Task::Attest { organism } => {
            tracing::info!("Attesting organism: {}", organism);
            let sign = recipe.attest.sign == "sigstore";
            crate::attest::attest(store, organism, sign).await?;
        }
    }
    
    Ok(())
}

/// Watch for changes and rerun
async fn watch_and_rerun(store: &Store, recipe_path: &str) -> Result<()> {
    tracing::info!("Watching for changes...");
    
    // Would use notify crate for file watching
    // For now, just loop
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        
        // Check if recipe changed
        // If yes, rerun
    }
}

#[derive(Debug, Clone)]
enum Task {
    Add { source: String },
    Digest { source: String },
    Align,
    Distill,
    Forge { organism: String },
    Attest { organism: String },
}

fn load_recipe(path: &str) -> Result<Recipe> {
    let content = std::fs::read_to_string(path)?;
    Ok(serde_yaml::from_str(&content)?)
}