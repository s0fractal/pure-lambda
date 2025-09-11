// The Surgeon - Pure mathematical transformation engine
// No models, no heuristics, only laws and measurements

use anyhow::Result;
use std::collections::HashMap;
use std::time::{Duration, Instant};

pub mod egraph;
pub mod rules;
pub mod cost;
pub mod verifier;
pub mod learner;
pub mod patches;
pub mod leverage;
pub mod proof_cache;
pub mod hebbian;

use egraph::{EGraph, EClassId};
use lambda_core::IR;
use rules::{Rule, RuleSet};
use cost::{Cost, CostModel};
use verifier::Verifier;
use learner::RuleLearner;

/// The mathematical surgeon - operates on code through pure transformations
pub struct Surgeon {
    egraph: EGraph,
    rules: RuleSet,
    cost_model: CostModel,
    verifier: Verifier,
    learner: RuleLearner,
    experience: ExperienceDB,
}

impl Surgeon {
    pub fn new() -> Self {
        Surgeon {
            egraph: EGraph::new(),
            rules: RuleSet::default(),
            cost_model: CostModel::default(),
            verifier: Verifier::new(),
            learner: RuleLearner::new(),
            experience: ExperienceDB::new(),
        }
    }
    
    /// Perform surgery on IR - pure transformation
    pub fn operate(&mut self, ir: &IR, budget: Duration) -> OperationResult {
        let start = Instant::now();
        let initial_cost = self.cost_model.compute(ir);
        
        // Add to e-graph
        self.egraph.clear();
        let root = self.egraph.add(ir.clone());
        
        // Saturate with rules (bounded by time)
        let mut iterations = 0;
        while start.elapsed() < budget {
            let rule = self.learner.suggest_rule(&self.rules);
            let matches = self.egraph.search(&rule);
            
            if matches.is_empty() {
                break;
            }
            
            for m in matches {
                self.egraph.apply_rule(&rule, m);
            }
            
            iterations += 1;
            if iterations > 1000 { break; } // Safety bound
        }
        
        // Extract minimal cost candidates
        let candidates = self.egraph.extract_min_k(&self.cost_model, 3);
        
        // Verify and select best
        for candidate in candidates {
            if self.verifier.check_equivalence(ir, &candidate) {
                let new_cost = self.cost_model.compute(&candidate);
                let improvement = initial_cost.score() - new_cost.score();
                
                // Learn from this operation
                self.learner.update(rule.id, improvement);
                self.experience.record(ir, &candidate, improvement);
                
                return OperationResult {
                    original: ir.clone(),
                    transformed: candidate,
                    initial_cost,
                    final_cost: new_cost,
                    rules_applied: self.egraph.get_applied_rules(),
                    verified: true,
                    duration: start.elapsed(),
                };
            }
        }
        
        // No improvement found - return original
        OperationResult {
            original: ir.clone(),
            transformed: ir.clone(),
            initial_cost,
            final_cost: initial_cost.clone(),
            rules_applied: vec![],
            verified: true,
            duration: start.elapsed(),
        }
    }
    
    /// Batch operate on multiple IRs
    pub fn operate_batch(&mut self, irs: Vec<IR>, budget: Duration) -> Vec<OperationResult> {
        let budget_per_ir = budget / irs.len() as u32;
        irs.into_iter()
            .map(|ir| self.operate(&ir, budget_per_ir))
            .collect()
    }
    
    /// Learn new rule from anti-unification
    pub fn discover_rule(&mut self, traces: &[OperationTrace]) -> Option<Rule> {
        self.learner.discover_pattern(traces)
    }
    
    /// Self-play: operate on own outputs repeatedly
    pub fn self_improve(&mut self, ir: IR, rounds: usize) -> Vec<OperationResult> {
        let mut current = ir;
        let mut results = Vec::new();
        
        for _ in 0..rounds {
            let result = self.operate(&current, Duration::from_millis(100));
            if result.final_cost.score() >= result.initial_cost.score() {
                break; // No more improvements
            }
            current = result.transformed.clone();
            results.push(result);
        }
        
        results
    }
}

#[derive(Debug, Clone)]
pub struct OperationResult {
    pub original: IR,
    pub transformed: IR,
    pub initial_cost: Cost,
    pub final_cost: Cost,
    pub rules_applied: Vec<String>,
    pub verified: bool,
    pub duration: Duration,
}

impl OperationResult {
    pub fn improvement(&self) -> f64 {
        self.initial_cost.score() - self.final_cost.score()
    }
    
    pub fn improvement_ratio(&self) -> f64 {
        if self.initial_cost.score() == 0.0 {
            0.0
        } else {
            self.improvement() / self.initial_cost.score()
        }
    }
}

/// Experience database - remembers what worked
pub struct ExperienceDB {
    memory: HashMap<String, Vec<Experience>>,
}

#[derive(Debug, Clone)]
struct Experience {
    pattern_hash: String,
    context_hash: String,
    improvement: f64,
    timestamp: u64,
}

impl ExperienceDB {
    pub fn new() -> Self {
        ExperienceDB {
            memory: HashMap::new(),
        }
    }
    
    pub fn record(&mut self, original: &IR, transformed: &IR, improvement: f64) {
        let pattern = self.extract_pattern(original);
        let context = self.extract_context(original);
        
        let exp = Experience {
            pattern_hash: hash_ir(&pattern),
            context_hash: hash_ir(&context),
            improvement,
            timestamp: now_timestamp(),
        };
        
        self.memory.entry(exp.pattern_hash.clone())
            .or_default()
            .push(exp);
    }
    
    fn extract_pattern(&self, ir: &IR) -> IR {
        // Extract structural pattern (alpha-renamed)
        ir.alpha_normalize()
    }
    
    fn extract_context(&self, ir: &IR) -> IR {
        // Extract surrounding context
        ir.get_context(3) // 3 levels up
    }
}

#[derive(Debug)]
pub struct OperationTrace {
    pub before: IR,
    pub after: IR,
    pub rule: String,
    pub cost_delta: f64,
}

fn hash_ir(ir: &IR) -> String {
    use blake3::Hasher;
    let mut hasher = Hasher::new();
    hasher.update(ir.to_canonical_string().as_bytes());
    hex::encode(hasher.finalize().as_bytes())
}

fn now_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs()
}