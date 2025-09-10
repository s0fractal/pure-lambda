use anyhow::Result;
use blake3::Hasher;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};

/// Content-addressable storage with Blake3
pub struct Store {
    root: PathBuf,
    cas: sled::Db,
    index: SqlitePool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Object {
    pub cid: String,
    pub data: Vec<u8>,
    pub metadata: ObjectMeta,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ObjectMeta {
    pub typ: ObjectType,
    pub source: Option<String>,
    pub timestamp: i64,
    pub size: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum ObjectType {
    Source,
    Gene,
    IR,
    Proof,
    Organism,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Gene {
    pub soul: String,
    pub ir: String,
    pub source: String,
    pub signatures: Vec<String>,
    pub metrics: GeneMetrics,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct GeneMetrics {
    pub size: usize,
    pub complexity: f32,
    pub purity: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Status {
    pub sources: usize,
    pub total_genes: usize,
    pub unique_souls: usize,
    pub equiv_classes: usize,
    pub champions: usize,
    pub organisms: usize,
    pub storage_size: String,
}

impl Store {
    pub async fn open(path: &str) -> Result<Self> {
        let root = PathBuf::from(path);
        std::fs::create_dir_all(&root)?;
        
        // Content-addressable store (sled)
        let cas = sled::open(root.join("cas"))?;
        
        // Index database (SQLite)
        let db_url = format!("sqlite:{}/index.db", path);
        let index = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&db_url)
            .await?;
        
        // Initialize schema
        sqlx::migrate!("./migrations").run(&index).await?;
        
        Ok(Store { root, cas, index })
    }
    
    /// Store object and return CID
    pub async fn put(&self, data: &[u8], meta: ObjectMeta) -> Result<String> {
        // Compute CID
        let mut hasher = Hasher::new();
        hasher.update(data);
        let hash = hasher.finalize();
        let cid = format!("b3:{}", hex::encode(hash.as_bytes()));
        
        // Store in CAS
        let obj = Object {
            cid: cid.clone(),
            data: data.to_vec(),
            metadata: meta,
        };
        
        let serialized = bincode::serialize(&obj)?;
        self.cas.insert(cid.as_bytes(), serialized)?;
        
        // Update index
        sqlx::query!(
            "INSERT OR IGNORE INTO objects (cid, type, source, size) VALUES (?, ?, ?, ?)",
            cid,
            format!("{:?}", obj.metadata.typ),
            obj.metadata.source,
            obj.metadata.size as i64
        )
        .execute(&self.index)
        .await?;
        
        Ok(cid)
    }
    
    /// Get object by CID
    pub async fn get(&self, cid: &str) -> Result<Option<Object>> {
        match self.cas.get(cid.as_bytes())? {
            Some(data) => Ok(Some(bincode::deserialize(&data)?)),
            None => Ok(None),
        }
    }
    
    /// Store gene
    pub async fn put_gene(&self, gene: &Gene) -> Result<()> {
        // Store gene object
        let data = serde_json::to_vec(gene)?;
        let meta = ObjectMeta {
            typ: ObjectType::Gene,
            source: Some(gene.source.clone()),
            timestamp: chrono::Utc::now().timestamp(),
            size: data.len(),
        };
        
        let cid = self.put(&data, meta).await?;
        
        // Index gene
        sqlx::query!(
            "INSERT OR REPLACE INTO genes (soul, cid, source, ir, purity) VALUES (?, ?, ?, ?, ?)",
            gene.soul,
            cid,
            gene.source,
            gene.ir,
            gene.metrics.purity
        )
        .execute(&self.index)
        .await?;
        
        Ok(())
    }
    
    /// Get gene by soul
    pub async fn get_gene(&self, soul: &str) -> Result<Option<Gene>> {
        let row = sqlx::query!(
            "SELECT cid FROM genes WHERE soul = ?",
            soul
        )
        .fetch_optional(&self.index)
        .await?;
        
        match row {
            Some(r) => {
                if let Some(obj) = self.get(&r.cid).await? {
                    Ok(Some(serde_json::from_slice(&obj.data)?))
                } else {
                    Ok(None)
                }
            }
            None => Ok(None),
        }
    }
    
    /// Find equivalent genes
    pub async fn find_equivalents(&self, soul: &str) -> Result<Vec<String>> {
        let rows = sqlx::query!(
            "SELECT DISTINCT g2.soul 
             FROM genes g1
             JOIN equivalences e ON g1.soul = e.soul1
             JOIN genes g2 ON e.soul2 = g2.soul
             WHERE g1.soul = ?",
            soul
        )
        .fetch_all(&self.index)
        .await?;
        
        Ok(rows.into_iter().map(|r| r.soul).collect())
    }
    
    /// Add equivalence
    pub async fn add_equivalence(&self, soul1: &str, soul2: &str, confidence: f32) -> Result<()> {
        sqlx::query!(
            "INSERT OR REPLACE INTO equivalences (soul1, soul2, confidence) VALUES (?, ?, ?)",
            soul1,
            soul2,
            confidence
        )
        .execute(&self.index)
        .await?;
        
        Ok(())
    }
    
    /// Get status
    pub async fn status(&self) -> Result<Status> {
        let sources = sqlx::query!("SELECT COUNT(*) as count FROM objects WHERE type = 'Source'")
            .fetch_one(&self.index)
            .await?
            .count as usize;
        
        let total_genes = sqlx::query!("SELECT COUNT(*) as count FROM genes")
            .fetch_one(&self.index)
            .await?
            .count as usize;
        
        let unique_souls = sqlx::query!("SELECT COUNT(DISTINCT soul) as count FROM genes")
            .fetch_one(&self.index)
            .await?
            .count as usize;
        
        let equiv_classes = sqlx::query!("SELECT COUNT(DISTINCT soul1) as count FROM equivalences")
            .fetch_one(&self.index)
            .await?
            .count as usize;
        
        let champions = sqlx::query!("SELECT COUNT(*) as count FROM champions")
            .fetch_one(&self.index)
            .await?
            .count as usize;
        
        let organisms = sqlx::query!("SELECT COUNT(*) as count FROM organisms")
            .fetch_one(&self.index)
            .await?
            .count as usize;
        
        // Calculate storage size
        let size = self.cas.size_on_disk()?;
        let storage_size = if size > 1_000_000_000 {
            format!("{:.1} GB", size as f64 / 1_000_000_000.0)
        } else if size > 1_000_000 {
            format!("{:.1} MB", size as f64 / 1_000_000.0)
        } else {
            format!("{} KB", size / 1000)
        };
        
        Ok(Status {
            sources,
            total_genes,
            unique_souls,
            equiv_classes,
            champions,
            organisms,
            storage_size,
        })
    }
}

/// Add source to store
pub async fn add(store: &Store, source: &str, version: Option<&str>) -> Result<String> {
    // Fetch source (simplified - would handle npm/github/crates)
    let data = if source.starts_with("http") {
        reqwest::get(source).await?.bytes().await?.to_vec()
    } else if source.contains("github.com") {
        // Clone with git2
        fetch_github(source).await?
    } else {
        // NPM package
        fetch_npm(source, version).await?
    };
    
    let meta = ObjectMeta {
        typ: ObjectType::Source,
        source: Some(source.to_string()),
        timestamp: chrono::Utc::now().timestamp(),
        size: data.len(),
    };
    
    store.put(&data, meta).await
}

async fn fetch_github(repo: &str) -> Result<Vec<u8>> {
    // Simplified - would use git2 to clone
    Ok(vec![])
}

async fn fetch_npm(package: &str, version: Option<&str>) -> Result<Vec<u8>> {
    // Fetch from NPM registry
    let url = if let Some(v) = version {
        format!("https://registry.npmjs.org/{}/{}", package, v)
    } else {
        format!("https://registry.npmjs.org/{}/latest", package)
    };
    
    let resp = reqwest::get(&url).await?;
    Ok(resp.bytes().await?.to_vec())
}