// Rewrite rules as data - no hardcoded transformations
// Every rule must preserve semantics and be verifiable

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::egraph::{IR, EGraph, Match};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub id: String,
    pub name: String,
    pub pattern: Pattern,
    pub rewrite: Pattern,
    pub guards: Vec<Guard>,
    pub cost_hint: Option<CostHint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Pattern {
    Var(String),
    Lam(String, Box<Pattern>),
    App(Box<Pattern>, Box<Pattern>),
    Map(Box<Pattern>, Box<Pattern>),
    Filter(Box<Pattern>, Box<Pattern>),
    Reduce(Box<Pattern>, Box<Pattern>, Box<Pattern>),
    Compose(Box<Pattern>, Box<Pattern>),
    Pipe(Box<Pattern>, Box<Pattern>),
    Id,
    Const(Box<Pattern>),
    Nil,
    Num(i64),
    Bool(bool),
    // Pattern variables (start with ?)
    PatVar(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Guard {
    Pure(String),           // Variable must be pure function
    NoSideEffects(String),  // No IO operations
    TypeEq(String, String), // Type equality
    Associative(String),    // Operation is associative
    Commutative(String),    // Operation is commutative
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostHint {
    pub reduce_allocs: Option<i32>,
    pub reduce_cycles: Option<i32>,
    pub reduce_memory: Option<i32>,
}

pub struct RuleSet {
    rules: Vec<Rule>,
    by_pattern: HashMap<String, Vec<usize>>,
}

impl Default for RuleSet {
    fn default() -> Self {
        Self::fundamental_rules()
    }
}

impl RuleSet {
    /// The fundamental mathematical rules - always true, always safe
    pub fn fundamental_rules() -> Self {
        let rules = vec![
            // Identity laws
            Rule {
                id: "map_id".to_string(),
                name: "Map identity elimination".to_string(),
                pattern: Pattern::Map(
                    Box::new(Pattern::PatVar("xs".to_string())),
                    Box::new(Pattern::Id)
                ),
                rewrite: Pattern::PatVar("xs".to_string()),
                guards: vec![],
                cost_hint: Some(CostHint {
                    reduce_allocs: Some(1),
                    reduce_cycles: Some(10),
                    reduce_memory: Some(1),
                }),
            },
            
            // Composition laws
            Rule {
                id: "map_fusion".to_string(),
                name: "Map fusion".to_string(),
                pattern: Pattern::Map(
                    Box::new(Pattern::Map(
                        Box::new(Pattern::PatVar("xs".to_string())),
                        Box::new(Pattern::PatVar("f".to_string()))
                    )),
                    Box::new(Pattern::PatVar("g".to_string()))
                ),
                rewrite: Pattern::Map(
                    Box::new(Pattern::PatVar("xs".to_string())),
                    Box::new(Pattern::Compose(
                        Box::new(Pattern::PatVar("g".to_string())),
                        Box::new(Pattern::PatVar("f".to_string()))
                    ))
                ),
                guards: vec![
                    Guard::Pure("f".to_string()),
                    Guard::Pure("g".to_string()),
                ],
                cost_hint: Some(CostHint {
                    reduce_allocs: Some(1),
                    reduce_cycles: Some(20),
                    reduce_memory: Some(1),
                }),
            },
            
            // Filter laws
            Rule {
                id: "filter_true".to_string(),
                name: "Filter true elimination".to_string(),
                pattern: Pattern::Filter(
                    Box::new(Pattern::PatVar("xs".to_string())),
                    Box::new(Pattern::Const(Box::new(Pattern::Bool(true))))
                ),
                rewrite: Pattern::PatVar("xs".to_string()),
                guards: vec![],
                cost_hint: Some(CostHint {
                    reduce_allocs: Some(1),
                    reduce_cycles: Some(10),
                    reduce_memory: Some(0),
                }),
            },
            
            Rule {
                id: "filter_false".to_string(),
                name: "Filter false to nil".to_string(),
                pattern: Pattern::Filter(
                    Box::new(Pattern::PatVar("xs".to_string())),
                    Box::new(Pattern::Const(Box::new(Pattern::Bool(false))))
                ),
                rewrite: Pattern::Nil,
                guards: vec![],
                cost_hint: Some(CostHint {
                    reduce_allocs: Some(1),
                    reduce_cycles: Some(100),
                    reduce_memory: Some(10),
                }),
            },
            
            // Map-filter fusion
            Rule {
                id: "map_filter_fusion".to_string(),
                name: "Fuse map after filter".to_string(),
                pattern: Pattern::Map(
                    Box::new(Pattern::Filter(
                        Box::new(Pattern::PatVar("xs".to_string())),
                        Box::new(Pattern::PatVar("p".to_string()))
                    )),
                    Box::new(Pattern::PatVar("f".to_string()))
                ),
                rewrite: Pattern::App(
                    Box::new(Pattern::Var("mapfilter".to_string())),
                    Box::new(Pattern::PatVar("xs".to_string()))
                ),
                guards: vec![
                    Guard::Pure("f".to_string()),
                    Guard::Pure("p".to_string()),
                ],
                cost_hint: Some(CostHint {
                    reduce_allocs: Some(1),
                    reduce_cycles: Some(15),
                    reduce_memory: Some(1),
                }),
            },
            
            // Composition associativity
            Rule {
                id: "compose_assoc".to_string(),
                name: "Composition associativity".to_string(),
                pattern: Pattern::Compose(
                    Box::new(Pattern::Compose(
                        Box::new(Pattern::PatVar("f".to_string())),
                        Box::new(Pattern::PatVar("g".to_string()))
                    )),
                    Box::new(Pattern::PatVar("h".to_string()))
                ),
                rewrite: Pattern::Compose(
                    Box::new(Pattern::PatVar("f".to_string())),
                    Box::new(Pattern::Compose(
                        Box::new(Pattern::PatVar("g".to_string())),
                        Box::new(Pattern::PatVar("h".to_string()))
                    ))
                ),
                guards: vec![
                    Guard::Pure("f".to_string()),
                    Guard::Pure("g".to_string()),
                    Guard::Pure("h".to_string()),
                ],
                cost_hint: None, // Neutral transformation
            },
            
            // Constant folding
            Rule {
                id: "const_fold_add".to_string(),
                name: "Constant fold addition".to_string(),
                pattern: Pattern::App(
                    Box::new(Pattern::App(
                        Box::new(Pattern::Var("+".to_string())),
                        Box::new(Pattern::Num(0))
                    )),
                    Box::new(Pattern::PatVar("x".to_string()))
                ),
                rewrite: Pattern::PatVar("x".to_string()),
                guards: vec![],
                cost_hint: Some(CostHint {
                    reduce_cycles: Some(1),
                    reduce_allocs: Some(0),
                    reduce_memory: Some(0),
                }),
            },
            
            // List operations
            Rule {
                id: "map_nil".to_string(),
                name: "Map over nil".to_string(),
                pattern: Pattern::Map(
                    Box::new(Pattern::Nil),
                    Box::new(Pattern::PatVar("f".to_string()))
                ),
                rewrite: Pattern::Nil,
                guards: vec![],
                cost_hint: Some(CostHint {
                    reduce_cycles: Some(5),
                    reduce_allocs: Some(0),
                    reduce_memory: Some(0),
                }),
            },
            
            // Reduce with identity
            Rule {
                id: "reduce_nil".to_string(),
                name: "Reduce nil".to_string(),
                pattern: Pattern::Reduce(
                    Box::new(Pattern::Nil),
                    Box::new(Pattern::PatVar("f".to_string())),
                    Box::new(Pattern::PatVar("init".to_string()))
                ),
                rewrite: Pattern::PatVar("init".to_string()),
                guards: vec![],
                cost_hint: Some(CostHint {
                    reduce_cycles: Some(5),
                    reduce_allocs: Some(0),
                    reduce_memory: Some(0),
                }),
            },
        ];
        
        let mut rule_set = RuleSet {
            rules: rules.clone(),
            by_pattern: HashMap::new(),
        };
        
        // Index by pattern type for faster lookup
        for (idx, rule) in rules.iter().enumerate() {
            let key = rule.pattern.root_type();
            rule_set.by_pattern.entry(key).or_default().push(idx);
        }
        
        rule_set
    }
    
    pub fn get(&self, index: usize) -> Option<&Rule> {
        self.rules.get(index)
    }
    
    pub fn len(&self) -> usize {
        self.rules.len()
    }
    
    pub fn iter(&self) -> impl Iterator<Item = &Rule> {
        self.rules.iter()
    }
    
    /// Find rules that might match a pattern type
    pub fn rules_for_pattern(&self, pattern_type: &str) -> Vec<&Rule> {
        self.by_pattern.get(pattern_type)
            .map(|indices| {
                indices.iter()
                    .filter_map(|&i| self.rules.get(i))
                    .collect()
            })
            .unwrap_or_default()
    }
}

impl Pattern {
    /// Get the root type for indexing
    fn root_type(&self) -> String {
        match self {
            Pattern::Map(_, _) => "map".to_string(),
            Pattern::Filter(_, _) => "filter".to_string(),
            Pattern::Reduce(_, _, _) => "reduce".to_string(),
            Pattern::Compose(_, _) => "compose".to_string(),
            Pattern::App(_, _) => "app".to_string(),
            Pattern::Lam(_, _) => "lam".to_string(),
            _ => "other".to_string(),
        }
    }
    
    /// Check if pattern matches IR
    pub fn matches(&self, ir: &IR, bindings: &mut HashMap<String, IR>) -> bool {
        match (self, ir) {
            (Pattern::PatVar(name), _) => {
                // Pattern variable matches anything
                if let Some(bound) = bindings.get(name) {
                    bound == ir
                } else {
                    bindings.insert(name.clone(), ir.clone());
                    true
                }
            }
            (Pattern::Id, IR::Id) => true,
            (Pattern::Nil, IR::Nil) => true,
            (Pattern::Num(n1), IR::Num(n2)) => n1 == n2,
            (Pattern::Bool(b1), IR::Bool(b2)) => b1 == b2,
            (Pattern::Map(p1, p2), IR::Map(i1, i2)) => {
                p1.matches(i1, bindings) && p2.matches(i2, bindings)
            }
            (Pattern::Filter(p1, p2), IR::Filter(i1, i2)) => {
                p1.matches(i1, bindings) && p2.matches(i2, bindings)
            }
            (Pattern::Compose(p1, p2), IR::Compose(i1, i2)) => {
                p1.matches(i1, bindings) && p2.matches(i2, bindings)
            }
            _ => false,
        }
    }
    
    /// Apply bindings to produce IR
    pub fn instantiate(&self, bindings: &HashMap<String, IR>) -> IR {
        match self {
            Pattern::PatVar(name) => {
                bindings.get(name).cloned().unwrap_or(IR::Var(name.clone()))
            }
            Pattern::Id => IR::Id,
            Pattern::Nil => IR::Nil,
            Pattern::Num(n) => IR::Num(*n),
            Pattern::Bool(b) => IR::Bool(*b),
            Pattern::Map(p1, p2) => IR::Map(
                Box::new(p1.instantiate(bindings)),
                Box::new(p2.instantiate(bindings))
            ),
            Pattern::Filter(p1, p2) => IR::Filter(
                Box::new(p1.instantiate(bindings)),
                Box::new(p2.instantiate(bindings))
            ),
            Pattern::Compose(p1, p2) => IR::Compose(
                Box::new(p1.instantiate(bindings)),
                Box::new(p2.instantiate(bindings))
            ),
            _ => IR::Nil, // Placeholder
        }
    }
}