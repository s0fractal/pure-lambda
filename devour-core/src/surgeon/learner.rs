// Rule learning without models - pure reinforcement through experience
// Multi-armed bandit for rule selection, anti-unification for discovery

use std::collections::HashMap;
use super::rules::{Rule, RuleSet, Pattern};
use super::OperationTrace;

pub struct RuleLearner {
    bandits: HashMap<String, MultiArmedBandit>,
    novelty_search: NoveltySearch,
    experience_buffer: Vec<Experience>,
}

impl RuleLearner {
    pub fn new() -> Self {
        RuleLearner {
            bandits: HashMap::new(),
            novelty_search: NoveltySearch::new(),
            experience_buffer: Vec::new(),
        }
    }
    
    /// Suggest which rule to try next
    pub fn suggest_rule(&mut self, rules: &RuleSet) -> &Rule {
        // ε-greedy strategy
        let epsilon = 0.1;
        
        if fastrand::f64() < epsilon {
            // Explore: random rule
            let idx = fastrand::usize(0..rules.len());
            rules.get(idx).unwrap()
        } else {
            // Exploit: best known rule
            let mut best_rule = rules.get(0).unwrap();
            let mut best_score = self.get_score(&best_rule.id);
            
            for rule in rules.iter() {
                let score = self.get_score(&rule.id);
                if score > best_score {
                    best_score = score;
                    best_rule = rule;
                }
            }
            
            best_rule
        }
    }
    
    /// Update learner with operation result
    pub fn update(&mut self, rule_id: String, improvement: f64) {
        // Update bandit
        self.bandits.entry(rule_id.clone())
            .or_insert_with(MultiArmedBandit::new)
            .update(improvement);
        
        // Record experience
        self.experience_buffer.push(Experience {
            rule_id,
            improvement,
            timestamp: now(),
        });
        
        // Periodic cleanup
        if self.experience_buffer.len() > 10000 {
            self.compress_experience();
        }
    }
    
    /// Discover new pattern from traces
    pub fn discover_pattern(&mut self, traces: &[OperationTrace]) -> Option<Rule> {
        if traces.len() < 2 {
            return None;
        }
        
        // Anti-unify to find common pattern
        let pattern = self.anti_unify(&traces[0].before, &traces[1].before)?;
        let rewrite = self.anti_unify(&traces[0].after, &traces[1].after)?;
        
        // Check if pattern is novel
        if !self.novelty_search.is_novel(&pattern) {
            return None;
        }
        
        // Create new rule
        let rule = Rule {
            id: format!("discovered_{}", self.experience_buffer.len()),
            name: "Discovered pattern".to_string(),
            pattern,
            rewrite,
            guards: vec![], // Conservative: no guards
            cost_hint: None,
        };
        
        self.novelty_search.record(&rule.pattern);
        
        Some(rule)
    }
    
    /// Anti-unification: find most specific generalization
    fn anti_unify(&self, ir1: &super::egraph::IR, ir2: &super::egraph::IR) -> Option<Pattern> {
        use super::egraph::IR;
        
        match (ir1, ir2) {
            (IR::Map(xs1, f1), IR::Map(xs2, f2)) => {
                let xs_pat = self.anti_unify(xs1, xs2)?;
                let f_pat = self.anti_unify(f1, f2)?;
                Some(Pattern::Map(Box::new(xs_pat), Box::new(f_pat)))
            }
            (IR::Filter(xs1, p1), IR::Filter(xs2, p2)) => {
                let xs_pat = self.anti_unify(xs1, xs2)?;
                let p_pat = self.anti_unify(p1, p2)?;
                Some(Pattern::Filter(Box::new(xs_pat), Box::new(p_pat)))
            }
            (IR::Id, IR::Id) => Some(Pattern::Id),
            (IR::Nil, IR::Nil) => Some(Pattern::Nil),
            (IR::Num(n1), IR::Num(n2)) if n1 == n2 => Some(Pattern::Num(*n1)),
            (IR::Bool(b1), IR::Bool(b2)) if b1 == b2 => Some(Pattern::Bool(*b1)),
            _ => {
                // Different structure - generalize to pattern variable
                Some(Pattern::PatVar(format!("?x{}", fastrand::u32(0..1000))))
            }
        }
    }
    
    fn get_score(&self, rule_id: &str) -> f64 {
        self.bandits.get(rule_id)
            .map(|b| b.expected_reward())
            .unwrap_or(0.0)
    }
    
    fn compress_experience(&mut self) {
        // Keep only recent and significant experiences
        self.experience_buffer.sort_by(|a, b| {
            b.timestamp.partial_cmp(&a.timestamp).unwrap()
        });
        self.experience_buffer.truncate(5000);
    }
}

/// Multi-armed bandit for rule selection
struct MultiArmedBandit {
    successes: f64,
    failures: f64,
    total_reward: f64,
    pulls: u64,
}

impl MultiArmedBandit {
    fn new() -> Self {
        MultiArmedBandit {
            successes: 1.0,  // Optimistic initialization
            failures: 1.0,
            total_reward: 0.0,
            pulls: 0,
        }
    }
    
    fn update(&mut self, reward: f64) {
        self.pulls += 1;
        self.total_reward += reward;
        
        if reward > 0.0 {
            self.successes += 1.0;
        } else {
            self.failures += 1.0;
        }
    }
    
    fn expected_reward(&self) -> f64 {
        if self.pulls == 0 {
            1.0 // Optimistic for unexplored
        } else {
            // Thompson sampling with Beta distribution
            let alpha = self.successes;
            let beta = self.failures;
            
            // Sample from Beta(alpha, beta)
            // Simplified: use mean + exploration bonus
            let mean = alpha / (alpha + beta);
            let exploration_bonus = (2.0 * (self.pulls as f64).ln() / self.pulls as f64).sqrt();
            
            mean + exploration_bonus
        }
    }
}

/// Novelty search for pattern discovery
struct NoveltySearch {
    seen_patterns: Vec<PatternHash>,
    archive: Vec<Pattern>,
}

impl NoveltySearch {
    fn new() -> Self {
        NoveltySearch {
            seen_patterns: Vec::new(),
            archive: Vec::new(),
        }
    }
    
    fn is_novel(&self, pattern: &Pattern) -> bool {
        let hash = self.hash_pattern(pattern);
        !self.seen_patterns.contains(&hash)
    }
    
    fn record(&mut self, pattern: &Pattern) {
        let hash = self.hash_pattern(pattern);
        self.seen_patterns.push(hash);
        self.archive.push(pattern.clone());
        
        // Keep archive bounded
        if self.archive.len() > 1000 {
            self.archive.drain(0..500);
            self.seen_patterns.drain(0..500);
        }
    }
    
    fn hash_pattern(&self, pattern: &Pattern) -> PatternHash {
        // Simple structural hash
        let mut hasher = blake3::Hasher::new();
        hasher.update(format!("{:?}", pattern).as_bytes());
        PatternHash(hasher.finalize().as_bytes()[0..8].try_into().unwrap())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct PatternHash([u8; 8]);

#[derive(Debug, Clone)]
struct Experience {
    rule_id: String,
    improvement: f64,
    timestamp: f64,
}

fn now() -> f64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs_f64()
}

/// Self-improvement through repeated application
pub struct SelfPlay {
    rounds: usize,
    improvement_threshold: f64,
}

impl SelfPlay {
    pub fn new(rounds: usize) -> Self {
        SelfPlay {
            rounds,
            improvement_threshold: 0.01,
        }
    }
    
    pub fn improve(&self, surgeon: &mut super::Surgeon, ir: super::egraph::IR) -> Vec<super::OperationResult> {
        let mut results = Vec::new();
        let mut current = ir;
        
        for round in 0..self.rounds {
            let result = surgeon.operate(&current, std::time::Duration::from_millis(100));
            
            if result.improvement() < self.improvement_threshold {
                // No significant improvement - stop
                break;
            }
            
            // Learn from this round
            surgeon.learner.compress_experience();
            
            current = result.transformed.clone();
            results.push(result);
        }
        
        results
    }
}