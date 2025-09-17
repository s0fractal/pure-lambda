// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

//! Pure Lambda Rust SDK
//!
//! Minimal implementation for working with PL-SEED-01 format seeds and operons.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, BinaryHeap};
use std::cmp::Reverse;

/// ABI specification for a tile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TileABI {
    pub types: String,
    pub effects: Vec<String>,
    pub ports: HashMap<String, String>,
}

/// A single tile in an operon
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TileObject {
    pub op: String,
    pub abi: TileABI,
    pub law: String,
    pub cost: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
}

/// Statistics for a seed
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeedStats {
    pub hops: u32,
    pub latency: f64,
    pub mem: u64,
}

/// Metadata for a seed
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeedMeta {
    #[serde(rename = "gidSet")]
    pub gid_set: Vec<String>,
    #[serde(rename = "iidSet")]
    pub iid_set: Vec<String>,
    #[serde(rename = "xidSet")]
    pub xid_set: Vec<String>,
    pub stats: SeedStats,
}

/// PL-SEED-01 format seed
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Seed {
    pub pl_seed: String,
    pub name: String,
    pub version: u32,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub tiles: Vec<TileObject>,
    pub meta: SeedMeta,
}

/// A node in an operon
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperonNode {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub op: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub abi: Option<TileABI>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ports: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub law: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub iid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub xid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub links: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub receipt: Option<serde_json::Value>,
    // For meta nodes
    #[serde(skip_serializing_if = "Option::is_none")]
    pub oids: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub root: Option<String>,
}

/// Expected results for an operon
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperonExpected {
    #[serde(rename = "minRouteLen")]
    pub min_route_len: u32,
    pub invariants: Vec<String>,
}

/// Operon JSON format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperonJson {
    pub nodes: HashMap<String, OperonNode>,
    pub root: String,
    pub name: String,
    #[serde(rename = "gidSet")]
    pub gid_set: Vec<String>,
    #[serde(rename = "iidSet")]
    pub iid_set: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expected: Option<OperonExpected>,
}

/// Autopilot result
#[derive(Debug, Clone)]
pub struct AutopilotResult {
    pub l_best: f64,
    pub route: Vec<usize>,
}

/// Validation error
#[derive(Debug)]
pub enum ValidationError {
    InvalidFormat(String),
    MissingField(String),
    InvalidValue(String),
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ValidationError::InvalidFormat(msg) => write!(f, "Invalid format: {}", msg),
            ValidationError::MissingField(field) => write!(f, "Missing field: {}", field),
            ValidationError::InvalidValue(msg) => write!(f, "Invalid value: {}", msg),
        }
    }
}

impl std::error::Error for ValidationError {}

/// Load and validate a seed from JSON value
pub fn load_seed(json_value: serde_json::Value) -> Result<Seed, ValidationError> {
    let seed: Seed = serde_json::from_value(json_value)
        .map_err(|e| ValidationError::InvalidFormat(e.to_string()))?;

    // Validate pl_seed format
    if seed.pl_seed != "PL-SEED-01" {
        return Err(ValidationError::InvalidValue(
            format!("Expected pl_seed 'PL-SEED-01', got '{}'", seed.pl_seed)
        ));
    }

    // Validate version
    if seed.version == 0 {
        return Err(ValidationError::InvalidValue(
            "Version must be positive".to_string()
        ));
    }

    // Validate name
    if seed.name.is_empty() {
        return Err(ValidationError::InvalidValue(
            "Name cannot be empty".to_string()
        ));
    }

    // Validate tiles
    if seed.tiles.is_empty() {
        return Err(ValidationError::InvalidValue(
            "Tiles array cannot be empty".to_string()
        ));
    }

    Ok(seed)
}

/// Convert seed to operon JSON format
pub fn to_operon(seed: &Seed) -> OperonJson {
    let mut nodes = HashMap::new();
    let mut operational_nodes = Vec::new();

    // Create nodes from tiles
    for (i, tile) in seed.tiles.iter().enumerate() {
        let gid = seed.meta.gid_set.get(i).cloned().unwrap_or_else(|| "0".repeat(64));
        let iid = seed.meta.iid_set.get(i).cloned().unwrap_or_else(|| "0".repeat(64));
        let xid = seed.meta.xid_set.get(i).cloned().unwrap_or_else(|| "0".repeat(64));

        // Generate deterministic node ID
        let node_id = format!("baf{}{}", &gid[..32.min(gid.len())], &iid[..32.min(iid.len())])
            .chars().take(62).collect::<String>();

        operational_nodes.push(node_id.clone());

        let node = OperonNode {
            op: Some(tile.op.clone()),
            code: tile.code.clone(),
            abi: Some(tile.abi.clone()),
            ports: Some(tile.abi.ports.clone()),
            law: Some(tile.law.clone()),
            cost: Some(tile.cost.clone()),
            gid: Some(gid),
            iid: Some(iid),
            xid: Some(xid),
            links: Some(HashMap::new()),
            receipt: None,
            oids: None,
            root: None,
        };

        nodes.insert(node_id, node);
    }

    // Create meta node if multiple tiles
    let root_id = if operational_nodes.len() > 1 {
        let meta_node_id = format!("{}meta", operational_nodes[0])
            .chars().take(62).collect::<String>();

        let meta_node = OperonNode {
            op: Some("META".to_string()),
            code: None,
            abi: None,
            ports: None,
            law: None,
            cost: None,
            gid: None,
            iid: None,
            xid: None,
            links: None,
            receipt: None,
            oids: Some(operational_nodes.clone()),
            root: operational_nodes.first().cloned(),
        };

        nodes.insert(meta_node_id.clone(), meta_node);
        meta_node_id
    } else {
        operational_nodes.first().cloned().unwrap_or_else(|| "unknown".to_string())
    };

    OperonJson {
        nodes,
        root: root_id,
        name: seed.name.clone(),
        gid_set: seed.meta.gid_set.clone(),
        iid_set: seed.meta.iid_set.clone(),
        expected: Some(OperonExpected {
            min_route_len: seed.tiles.len() as u32,
            invariants: vec![
                "GID independent of ports".to_string(),
                "IID equal for abi-equal".to_string(),
            ],
        }),
    }
}

/// Get cost for a node based on its properties
fn get_node_cost(node: &OperonNode) -> f64 {
    if let Some(cost_str) = &node.cost {
        let cost_lower = cost_str.to_lowercase();
        if cost_lower.contains("o(1)") {
            return 1.0;
        } else if cost_lower.contains("o(n)") && !cost_lower.contains("o(n²)") && !cost_lower.contains("o(n^2)") {
            return 10.0;
        } else if cost_lower.contains("o(n²)") || cost_lower.contains("o(n^2)") {
            return 100.0;
        } else if cost_lower.contains("o(log n)") {
            return 5.0;
        }
    }

    // Cost based on operation type
    if let Some(op) = &node.op {
        match op.to_uppercase().as_str() {
            "FOCUS" => 1.0,
            "DELAY" => 2.0,
            "TRANSFORM" => 3.0,
            "MERGE" => 4.0,
            "SPLIT" => 5.0,
            _ => 2.0,
        }
    } else {
        2.0
    }
}

/// Run autopilot algorithm using simple Dijkstra
pub fn run_autopilot(operon: &OperonJson, _k: u32) -> AutopilotResult {
    // Find operational nodes (not meta nodes)
    let operational_nodes: Vec<&String> = operon.nodes.keys()
        .filter(|node_id| {
            let node = &operon.nodes[*node_id];
            node.op.is_some() &&
            node.op.as_ref().map(|op| op != "META").unwrap_or(false) &&
            node.oids.is_none()
        })
        .collect();

    if operational_nodes.is_empty() {
        return AutopilotResult {
            l_best: 0.0,
            route: vec![],
        };
    }

    // Build adjacency list
    let mut graph: HashMap<String, Vec<(String, f64)>> = HashMap::new();
    for node_id in &operational_nodes {
        graph.insert((*node_id).clone(), vec![]);

        let node = &operon.nodes[*node_id];
        if let Some(links) = &node.links {
            for (_, target_id) in links {
                if operational_nodes.contains(&target_id) {
                    let target_node = &operon.nodes[target_id];
                    let cost = get_node_cost(target_node);
                    graph.get_mut(*node_id).unwrap().push((target_id.clone(), cost));
                }
            }
        }
    }

    // Dijkstra's algorithm
    let start_node = if operational_nodes.contains(&&operon.root) {
        operon.root.clone()
    } else {
        operational_nodes[0].clone()
    };

    let mut distances: HashMap<String, f64> = HashMap::new();
    let mut previous: HashMap<String, Option<String>> = HashMap::new();
    let mut heap = BinaryHeap::new();

    // Initialize
    for node_id in &operational_nodes {
        let distance = if *node_id == &start_node { 0.0 } else { f64::INFINITY };
        distances.insert((*node_id).clone(), distance);
        previous.insert((*node_id).clone(), None);
        heap.push(Reverse((distance as i64, (*node_id).clone())));
    }

    while let Some(Reverse((current_dist_i64, current_node))) = heap.pop() {
        let current_dist = current_dist_i64 as f64;

        if current_dist > *distances.get(&current_node).unwrap_or(&f64::INFINITY) {
            continue;
        }

        if let Some(neighbors) = graph.get(&current_node) {
            for (neighbor, edge_cost) in neighbors {
                let new_dist = current_dist + edge_cost;
                let neighbor_dist = *distances.get(neighbor).unwrap_or(&f64::INFINITY);

                if new_dist < neighbor_dist {
                    distances.insert(neighbor.clone(), new_dist);
                    previous.insert(neighbor.clone(), Some(current_node.clone()));
                    heap.push(Reverse((new_dist as i64, neighbor.clone())));
                }
            }
        }
    }

    // Find best path
    let (best_node, best_distance) = distances.iter()
        .min_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(node, dist)| (node.clone(), *dist))
        .unwrap_or((start_node.clone(), 0.0));

    // Reconstruct path
    let mut path = vec![];
    let mut current = Some(best_node);

    while let Some(node) = current {
        path.push(node.clone());
        current = previous.get(&node).and_then(|x| x.clone());
    }

    path.reverse();

    // Convert to indices
    let route_indices: Vec<usize> = path.iter()
        .filter_map(|node_id| {
            operational_nodes.iter().position(|&x| x == node_id)
        })
        .collect();

    AutopilotResult {
        l_best: best_distance,
        route: route_indices,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_load_seed() {
        let seed_json = json!({
            "pl_seed": "PL-SEED-01",
            "name": "test-seed",
            "version": 1,
            "createdAt": "2025-09-17T12:00:00.000Z",
            "tiles": [
                {
                    "op": "FOCUS",
                    "abi": {
                        "types": "data -> focused",
                        "effects": [],
                        "ports": {"in": "data", "out": "focused"}
                    },
                    "law": "identity",
                    "cost": "O(1)"
                }
            ],
            "meta": {
                "gidSet": ["abc123"],
                "iidSet": ["def456"],
                "xidSet": ["ghi789"],
                "stats": {
                    "hops": 1,
                    "latency": 0.001,
                    "mem": 1024
                }
            }
        });

        let seed = load_seed(seed_json).unwrap();
        assert_eq!(seed.pl_seed, "PL-SEED-01");
        assert_eq!(seed.name, "test-seed");
        assert_eq!(seed.tiles.len(), 1);
    }

    #[test]
    fn test_to_operon() {
        let seed = Seed {
            pl_seed: "PL-SEED-01".to_string(),
            name: "test".to_string(),
            version: 1,
            created_at: "2025-09-17T12:00:00.000Z".to_string(),
            tiles: vec![
                TileObject {
                    op: "FOCUS".to_string(),
                    abi: TileABI {
                        types: "data -> focused".to_string(),
                        effects: vec![],
                        ports: {
                            let mut ports = HashMap::new();
                            ports.insert("in".to_string(), "data".to_string());
                            ports.insert("out".to_string(), "focused".to_string());
                            ports
                        },
                    },
                    law: "identity".to_string(),
                    cost: "O(1)".to_string(),
                    code: None,
                }
            ],
            meta: SeedMeta {
                gid_set: vec!["abc123".to_string()],
                iid_set: vec!["def456".to_string()],
                xid_set: vec!["ghi789".to_string()],
                stats: SeedStats {
                    hops: 1,
                    latency: 0.001,
                    mem: 1024,
                },
            },
        };

        let operon = to_operon(&seed);
        assert_eq!(operon.name, "test");
        assert!(!operon.nodes.is_empty());
    }
}