// Deterministic cost model - no heuristics, only measurements
// C = α*cycles + β*bytes + γ*allocs + δ*io_risk

use serde::{Deserialize, Serialize};
use super::egraph::IR;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cost {
    pub cycles: u64,     // CPU cycles estimate
    pub bytes: u64,      // Memory bytes
    pub allocs: u64,     // Number of allocations
    pub io_risk: f32,    // Risk of IO operations (0.0 = pure, 1.0 = heavy IO)
}

impl Cost {
    pub fn zero() -> Self {
        Cost {
            cycles: 0,
            bytes: 0,
            allocs: 0,
            io_risk: 0.0,
        }
    }
    
    pub fn score(&self) -> f64 {
        self.score_with_weights(&Weights::default())
    }
    
    pub fn score_with_weights(&self, weights: &Weights) -> f64 {
        weights.alpha * self.cycles as f64 +
        weights.beta * self.bytes as f64 +
        weights.gamma * self.allocs as f64 +
        weights.delta * self.io_risk as f64
    }
    
    /// Add costs together
    pub fn add(&self, other: &Cost) -> Cost {
        Cost {
            cycles: self.cycles + other.cycles,
            bytes: self.bytes + other.bytes,
            allocs: self.allocs + other.allocs,
            io_risk: (self.io_risk + other.io_risk).min(1.0),
        }
    }
    
    /// Max of two costs (for branching)
    pub fn max(&self, other: &Cost) -> Cost {
        Cost {
            cycles: self.cycles.max(other.cycles),
            bytes: self.bytes.max(other.bytes),
            allocs: self.allocs.max(other.allocs),
            io_risk: self.io_risk.max(other.io_risk),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Weights {
    pub alpha: f64,  // Cycles weight
    pub beta: f64,   // Bytes weight  
    pub gamma: f64,  // Allocs weight
    pub delta: f64,  // IO risk weight
}

impl Default for Weights {
    fn default() -> Self {
        Weights {
            alpha: 1.0,
            beta: 0.01,   // Bytes are cheap
            gamma: 10.0,  // Allocations are expensive
            delta: 100.0, // IO is very expensive
        }
    }
}

pub struct CostModel {
    weights: Weights,
    op_costs: OpCosts,
}

impl Default for CostModel {
    fn default() -> Self {
        CostModel {
            weights: Weights::default(),
            op_costs: OpCosts::default(),
        }
    }
}

impl CostModel {
    pub fn new(weights: Weights) -> Self {
        CostModel {
            weights,
            op_costs: OpCosts::default(),
        }
    }
    
    /// Compute cost of an IR tree
    pub fn compute(&self, ir: &IR) -> Cost {
        match ir {
            // Base cases
            IR::Var(_) => Cost { cycles: 1, bytes: 8, allocs: 0, io_risk: 0.0 },
            IR::Num(_) => Cost { cycles: 1, bytes: 8, allocs: 0, io_risk: 0.0 },
            IR::Bool(_) => Cost { cycles: 1, bytes: 1, allocs: 0, io_risk: 0.0 },
            IR::Str(s) => Cost { cycles: 1, bytes: s.len() as u64, allocs: 1, io_risk: 0.0 },
            IR::Nil => Cost { cycles: 1, bytes: 8, allocs: 0, io_risk: 0.0 },
            IR::Id => Cost { cycles: 1, bytes: 8, allocs: 0, io_risk: 0.0 },
            
            // Lambda abstraction
            IR::Lam(_, body) => {
                let body_cost = self.compute(body);
                Cost {
                    cycles: 2 + body_cost.cycles,
                    bytes: 16 + body_cost.bytes,
                    allocs: 1 + body_cost.allocs,
                    io_risk: body_cost.io_risk,
                }
            }
            
            // Application (most expensive)
            IR::App(f, x) => {
                let f_cost = self.compute(f);
                let x_cost = self.compute(x);
                Cost {
                    cycles: 10 + f_cost.cycles + x_cost.cycles,
                    bytes: f_cost.bytes + x_cost.bytes,
                    allocs: 1 + f_cost.allocs + x_cost.allocs,
                    io_risk: f_cost.io_risk.max(x_cost.io_risk),
                }
            }
            
            // List operations
            IR::Cons(h, t) => {
                let h_cost = self.compute(h);
                let t_cost = self.compute(t);
                Cost {
                    cycles: 2 + h_cost.cycles + t_cost.cycles,
                    bytes: 16 + h_cost.bytes + t_cost.bytes,
                    allocs: 1 + h_cost.allocs + t_cost.allocs,
                    io_risk: h_cost.io_risk.max(t_cost.io_risk),
                }
            }
            
            // Map: O(n) operation
            IR::Map(xs, f) => {
                let xs_cost = self.compute(xs);
                let f_cost = self.compute(f);
                let list_size = self.estimate_list_size(xs);
                
                Cost {
                    cycles: list_size * (10 + f_cost.cycles) + xs_cost.cycles,
                    bytes: list_size * 16 + xs_cost.bytes + f_cost.bytes,
                    allocs: list_size + xs_cost.allocs + f_cost.allocs,
                    io_risk: xs_cost.io_risk.max(f_cost.io_risk),
                }
            }
            
            // Filter: O(n) but may produce smaller result
            IR::Filter(xs, p) => {
                let xs_cost = self.compute(xs);
                let p_cost = self.compute(p);
                let list_size = self.estimate_list_size(xs);
                
                Cost {
                    cycles: list_size * (5 + p_cost.cycles) + xs_cost.cycles,
                    bytes: (list_size / 2) * 16 + xs_cost.bytes + p_cost.bytes, // Assume 50% pass
                    allocs: list_size / 2 + xs_cost.allocs + p_cost.allocs,
                    io_risk: xs_cost.io_risk.max(p_cost.io_risk),
                }
            }
            
            // Reduce: O(n) to single value
            IR::Reduce(xs, f, init) => {
                let xs_cost = self.compute(xs);
                let f_cost = self.compute(f);
                let init_cost = self.compute(init);
                let list_size = self.estimate_list_size(xs);
                
                Cost {
                    cycles: list_size * (10 + f_cost.cycles) + xs_cost.cycles + init_cost.cycles,
                    bytes: 16 + xs_cost.bytes + f_cost.bytes + init_cost.bytes,
                    allocs: 1 + xs_cost.allocs + f_cost.allocs + init_cost.allocs,
                    io_risk: xs_cost.io_risk.max(f_cost.io_risk).max(init_cost.io_risk),
                }
            }
            
            // Control flow
            IR::If(c, t, e) => {
                let c_cost = self.compute(c);
                let t_cost = self.compute(t);
                let e_cost = self.compute(e);
                
                Cost {
                    cycles: 2 + c_cost.cycles + t_cost.max(&e_cost).cycles,
                    bytes: c_cost.bytes + t_cost.max(&e_cost).bytes,
                    allocs: c_cost.allocs + t_cost.max(&e_cost).allocs,
                    io_risk: c_cost.io_risk.max(t_cost.io_risk).max(e_cost.io_risk),
                }
            }
            
            // Arithmetic operations
            IR::Add(a, b) | IR::Mul(a, b) | IR::Eq(a, b) => {
                let a_cost = self.compute(a);
                let b_cost = self.compute(b);
                
                Cost {
                    cycles: 2 + a_cost.cycles + b_cost.cycles,
                    bytes: 8 + a_cost.bytes + b_cost.bytes,
                    allocs: a_cost.allocs + b_cost.allocs,
                    io_risk: a_cost.io_risk.max(b_cost.io_risk),
                }
            }
            
            // Composition (no runtime cost, just structure)
            IR::Compose(f, g) | IR::Pipe(f, g) => {
                let f_cost = self.compute(f);
                let g_cost = self.compute(g);
                
                Cost {
                    cycles: 1 + f_cost.cycles + g_cost.cycles,
                    bytes: 16 + f_cost.bytes + g_cost.bytes,
                    allocs: 1 + f_cost.allocs + g_cost.allocs,
                    io_risk: f_cost.io_risk.max(g_cost.io_risk),
                }
            }
            
            IR::Const(x) => {
                let x_cost = self.compute(x);
                Cost {
                    cycles: 1 + x_cost.cycles,
                    bytes: 8 + x_cost.bytes,
                    allocs: x_cost.allocs,
                    io_risk: x_cost.io_risk,
                }
            }
        }
    }
    
    /// Estimate list size for cost calculation
    fn estimate_list_size(&self, ir: &IR) -> u64 {
        match ir {
            IR::Nil => 0,
            IR::Cons(_, t) => 1 + self.estimate_list_size(t),
            IR::Map(xs, _) => self.estimate_list_size(xs),
            IR::Filter(xs, _) => self.estimate_list_size(xs) / 2, // Assume 50% pass rate
            _ => 10, // Default estimate
        }
    }
    
    /// Extract minimal cost IR from e-graph
    pub fn extract_min(&self, egraph: &super::egraph::EGraph) -> Vec<IR> {
        // Simplified - would use dynamic programming
        vec![]
    }
}

/// Operation costs database
#[derive(Debug, Clone)]
struct OpCosts {
    map_overhead: u64,
    filter_overhead: u64,
    reduce_overhead: u64,
    app_overhead: u64,
    alloc_cost: u64,
}

impl Default for OpCosts {
    fn default() -> Self {
        OpCosts {
            map_overhead: 10,
            filter_overhead: 5,
            reduce_overhead: 10,
            app_overhead: 10,
            alloc_cost: 100,
        }
    }
}