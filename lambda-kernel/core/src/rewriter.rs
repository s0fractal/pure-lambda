#![no_std]

#[cfg(feature = "alloc")]
use alloc::{vec::Vec, vec, boxed::Box, collections::BTreeMap};

use crate::ir::{IR, Symbol};
use crate::normalize::normalize;

#[derive(Debug, Clone)]
pub struct Pattern {
    pub id: u32,
    pub kind: PatternKind,
}

#[derive(Debug, Clone)]
pub enum PatternKind {
    Var(u32),                      // Pattern variable ?x
    Concrete(IR),                  // Concrete IR node
    App(Box<Pattern>, Box<Pattern>),
    Lam(u32, Box<Pattern>),
    Map(Box<Pattern>, Box<Pattern>),
    Filter(Box<Pattern>, Box<Pattern>),
    Fold(Box<Pattern>, Box<Pattern>, Box<Pattern>),
}

#[derive(Debug, Clone)]
pub struct Rule {
    pub name: &'static str,
    pub pattern: Pattern,
    pub rewrite: Pattern,
    pub cost_delta: i32,
}

pub struct EGraph {
    nodes: Vec<EClass>,
    rules: Vec<Rule>,
    iteration_limit: usize,
}

#[derive(Debug, Clone)]
struct EClass {
    id: u32,
    nodes: Vec<IR>,
    cost: u32,
}

impl EGraph {
    pub fn new() -> Self {
        EGraph {
            nodes: Vec::new(),
            rules: builtin_rules(),
            iteration_limit: 100,
        }
    }
    
    pub fn add(&mut self, ir: IR) -> u32 {
        let normalized = normalize(&ir);
        
        // Check if equivalent node exists
        for eclass in &self.nodes {
            for node in &eclass.nodes {
                if equivalent(&normalized, node) {
                    return eclass.id;
                }
            }
        }
        
        // Create new equivalence class
        let id = self.nodes.len() as u32;
        self.nodes.push(EClass {
            id,
            nodes: vec![normalized],
            cost: compute_cost(&ir),
        });
        id
    }
    
    pub fn saturate(&mut self) {
        for _ in 0..self.iteration_limit {
            let mut changed = false;
            
            for rule in self.rules.clone() {
                for eclass in &mut self.nodes {
                    for node in eclass.nodes.clone() {
                        if let Some(rewritten) = apply_rule(&rule, &node) {
                            let new_cost = compute_cost(&rewritten);
                            if new_cost < eclass.cost {
                                eclass.nodes.push(rewritten);
                                eclass.cost = new_cost;
                                changed = true;
                            }
                        }
                    }
                }
            }
            
            if !changed {
                break;
            }
        }
    }
    
    pub fn extract_best(&self, id: u32) -> Option<IR> {
        self.nodes
            .iter()
            .find(|e| e.id == id)
            .and_then(|e| e.nodes.first())
            .cloned()
    }
}

fn builtin_rules() -> Vec<Rule> {
    vec![
        // Map fusion: map f . map g = map (f . g)
        Rule {
            name: "map_fusion",
            pattern: Pattern {
                id: 0,
                kind: PatternKind::Map(
                    Box::new(Pattern { id: 1, kind: PatternKind::Var(1) }),
                    Box::new(Pattern {
                        id: 2,
                        kind: PatternKind::Map(
                            Box::new(Pattern { id: 3, kind: PatternKind::Var(2) }),
                            Box::new(Pattern { id: 4, kind: PatternKind::Var(3) }),
                        )
                    }),
                ),
            },
            rewrite: Pattern {
                id: 5,
                kind: PatternKind::Map(
                    Box::new(Pattern {
                        id: 6,
                        kind: PatternKind::App(
                            Box::new(Pattern { id: 7, kind: PatternKind::Var(1) }),
                            Box::new(Pattern { id: 8, kind: PatternKind::Var(2) }),
                        )
                    }),
                    Box::new(Pattern { id: 9, kind: PatternKind::Var(3) }),
                ),
            },
            cost_delta: -10,
        },
        
        // Filter-map fusion
        Rule {
            name: "filter_map_fusion",
            pattern: Pattern {
                id: 10,
                kind: PatternKind::Map(
                    Box::new(Pattern { id: 11, kind: PatternKind::Var(4) }),
                    Box::new(Pattern {
                        id: 12,
                        kind: PatternKind::Filter(
                            Box::new(Pattern { id: 13, kind: PatternKind::Var(5) }),
                            Box::new(Pattern { id: 14, kind: PatternKind::Var(6) }),
                        )
                    }),
                ),
            },
            rewrite: Pattern {
                id: 15,
                kind: PatternKind::Filter(
                    Box::new(Pattern { id: 16, kind: PatternKind::Var(5) }),
                    Box::new(Pattern {
                        id: 17,
                        kind: PatternKind::Map(
                            Box::new(Pattern { id: 18, kind: PatternKind::Var(4) }),
                            Box::new(Pattern { id: 19, kind: PatternKind::Var(6) }),
                        )
                    }),
                ),
            },
            cost_delta: -5,
        },
    ]
}

fn apply_rule(rule: &Rule, ir: &IR) -> Option<IR> {
    let bindings = match_pattern(&rule.pattern, ir)?;
    Some(instantiate_pattern(&rule.rewrite, &bindings))
}

fn match_pattern(pattern: &Pattern, ir: &IR) -> Option<BTreeMap<u32, IR>> {
    let mut bindings = BTreeMap::new();
    match_helper(pattern, ir, &mut bindings)?;
    Some(bindings)
}

fn match_helper(pattern: &Pattern, ir: &IR, bindings: &mut BTreeMap<u32, IR>) -> Option<()> {
    match &pattern.kind {
        PatternKind::Var(id) => {
            if let Some(bound) = bindings.get(id) {
                if equivalent(bound, ir) {
                    Some(())
                } else {
                    None
                }
            } else {
                bindings.insert(*id, ir.clone());
                Some(())
            }
        }
        PatternKind::Concrete(pat_ir) => {
            if equivalent(pat_ir, ir) {
                Some(())
            } else {
                None
            }
        }
        PatternKind::Map(p_f, p_xs) => {
            if let IR::Map(f, xs) = ir {
                match_helper(p_f, f, bindings)?;
                match_helper(p_xs, xs, bindings)
            } else {
                None
            }
        }
        PatternKind::Filter(p_f, p_xs) => {
            if let IR::Filter(f, xs) = ir {
                match_helper(p_f, f, bindings)?;
                match_helper(p_xs, xs, bindings)
            } else {
                None
            }
        }
        _ => None,
    }
}

fn instantiate_pattern(pattern: &Pattern, bindings: &BTreeMap<u32, IR>) -> IR {
    match &pattern.kind {
        PatternKind::Var(id) => {
            bindings.get(id).cloned().unwrap_or(IR::Nil)
        }
        PatternKind::Concrete(ir) => ir.clone(),
        PatternKind::Map(p_f, p_xs) => {
            IR::Map(
                Box::new(instantiate_pattern(p_f, bindings)),
                Box::new(instantiate_pattern(p_xs, bindings)),
            )
        }
        PatternKind::Filter(p_f, p_xs) => {
            IR::Filter(
                Box::new(instantiate_pattern(p_f, bindings)),
                Box::new(instantiate_pattern(p_xs, bindings)),
            )
        }
        _ => IR::Nil,
    }
}

fn equivalent(ir1: &IR, ir2: &IR) -> bool {
    normalize(ir1) == normalize(ir2)
}

fn compute_cost(ir: &IR) -> u32 {
    match ir {
        IR::Var(_) | IR::Num(_) | IR::Bool(_) | IR::Nil => 1,
        IR::Lam(_, body) => 1 + compute_cost(body),
        IR::App(f, a) => 2 + compute_cost(f) + compute_cost(a),
        IR::Map(f, xs) | IR::Filter(f, xs) => 3 + compute_cost(f) + compute_cost(xs),
        IR::Fold(f, z, xs) | IR::Scan(f, z, xs) => {
            4 + compute_cost(f) + compute_cost(z) + compute_cost(xs)
        }
        IR::List(items) => 1 + items.iter().map(compute_cost).sum::<u32>(),
        _ => 2,
    }
}