use anyhow::Result;
use clap::{Parser, Subcommand};
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

mod storage;
mod digest;
mod align;
mod distill;
mod forge;
mod attest;
mod runtime;
mod recipe;

use crate::storage::Store;

#[derive(Parser)]
#[command(name = "devour")]
#[command(about = "Native devourer - consumes ecosystems, distills to pure genes")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Command,
    
    #[arg(long, default_value = ".store")]
    store: String,
    
    #[arg(long)]
    verbose: bool,
}

#[derive(Subcommand)]
enum Command {
    /// Consume external source (npm/github/crate)
    Add {
        source: String,
        #[arg(long)]
        version: Option<String>,
    },
    
    /// Extract genes from consumed sources
    Digest {
        #[arg(long)]
        source: Option<String>,
        #[arg(long)]
        parallel: bool,
    },
    
    /// Find equivalent functions across sources
    Align {
        #[arg(long)]
        rules: Option<String>,
    },
    
    /// Select champion implementations
    Distill {
        #[arg(long)]
        objectives: Option<String>,
    },
    
    /// Build organism from champions
    Forge {
        organism: String,
        #[arg(long, value_delimiter = ',')]
        targets: Vec<String>,
        #[arg(long)]
        shims: Vec<String>,
    },
    
    /// Generate attestation proofs
    Attest {
        organism: String,
        #[arg(long)]
        sign: bool,
    },
    
    /// Run complete pipeline from recipe
    Run {
        #[arg(long, default_value = "devour.yaml")]
        recipe: String,
        #[arg(long)]
        watch: bool,
    },
    
    /// Show current state
    Status,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    
    // Setup tracing
    let level = if cli.verbose { Level::DEBUG } else { Level::INFO };
    let subscriber = FmtSubscriber::builder()
        .with_max_level(level)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;
    
    // Initialize store
    let store = Store::open(&cli.store).await?;
    
    match cli.command {
        Command::Add { source, version } => {
            info!("🦖 Consuming {}", source);
            let cid = storage::add(&store, &source, version.as_deref()).await?;
            info!("✓ Stored as {}", cid);
        }
        
        Command::Digest { source, parallel } => {
            info!("🧬 Digesting into genes");
            let stats = digest::digest(&store, source.as_deref(), parallel).await?;
            info!("✓ Extracted {} genes, {} unique souls", stats.total, stats.unique);
        }
        
        Command::Align { rules } => {
            info!("🔄 Aligning equivalent genes");
            let classes = align::align(&store, rules.as_deref()).await?;
            info!("✓ Found {} equivalence classes", classes);
        }
        
        Command::Distill { objectives } => {
            info!("🏆 Distilling champion implementations");
            let champions = distill::distill(&store, objectives.as_deref()).await?;
            info!("✓ Selected {} champions", champions);
        }
        
        Command::Forge { organism, targets, shims } => {
            info!("🔨 Forging organism: {}", organism);
            let soulset = forge::forge(&store, &organism, &targets, &shims).await?;
            info!("✓ Forged with soulset: {}", soulset);
        }
        
        Command::Attest { organism, sign } => {
            info!("📜 Generating attestation for {}", organism);
            let proof = attest::attest(&store, &organism, sign).await?;
            info!("✓ Attestation: {}", proof);
        }
        
        Command::Run { recipe, watch } => {
            info!("🚀 Running recipe: {}", recipe);
            recipe::run(&store, &recipe, watch).await?;
        }
        
        Command::Status => {
            let status = store.status().await?;
            println!("🦖 DEVOUR STATUS\n");
            println!("Sources: {}", status.sources);
            println!("Genes: {} total, {} unique", status.total_genes, status.unique_souls);
            println!("Equivalence classes: {}", status.equiv_classes);
            println!("Champions: {}", status.champions);
            println!("Organisms: {}", status.organisms);
            println!("\nStorage: {}", status.storage_size);
        }
    }
    
    Ok(())
}