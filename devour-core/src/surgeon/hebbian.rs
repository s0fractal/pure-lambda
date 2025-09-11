/// Hebbian Learning - "Neurons that fire together, wire together"
/// Rules that succeed together get strengthened connections
///
/// This creates emergent optimization patterns from experience

use std::collections::HashMap;
use std::sync::Arc;
use lambda_core::IR;

/// Synaptic weight between rules
#[derive(Debug, Clone)]
pub struct Synapse {
    from_rule: String,
    to_rule: String,
    weight: f32,
    activations: u32,
    last_fired: u64,
}

/// Hebbian network of rule connections
pub struct HebbianNetwork {
    synapses: HashMap<(String, String), Synapse>,
    rule_potentials: HashMap<String, f32>,
    learning_rate: f32,
    decay_rate: f32,
    resonance_threshold: f32,
}

impl HebbianNetwork {
    pub fn new() -> Self {
        HebbianNetwork {
            synapses: HashMap::new(),
            rule_potentials: HashMap::new(),
            learning_rate: 0.1,
            decay_rate: 0.01,
            resonance_threshold: 0.7,
        }
    }
    
    /// Fire a rule and propagate activation
    pub fn fire_rule(&mut self, rule_id: &str, success: bool) {
        let potential = self.rule_potentials.entry(rule_id.to_string())
            .or_insert(0.0);
        
        // Update potential based on success
        if success {
            *potential = (*potential + self.learning_rate).min(1.0);
        } else {
            *potential = (*potential - self.decay_rate).max(0.0);
        }
        
        // Propagate to connected rules
        self.propagate_activation(rule_id, *potential);
    }
    
    /// Rules that fire together within a time window
    pub fn wire_together(&mut self, rule1: &str, rule2: &str, correlation: f32) {
        let key = (rule1.to_string(), rule2.to_string());
        
        let synapse = self.synapses.entry(key.clone())
            .or_insert(Synapse {
                from_rule: rule1.to_string(),
                to_rule: rule2.to_string(),
                weight: 0.5,
                activations: 0,
                last_fired: 0,
            });
        
        // Hebbian update: Δw = η * x * y
        synapse.weight = (synapse.weight + self.learning_rate * correlation)
            .min(1.0)
            .max(0.0);
        synapse.activations += 1;
        synapse.last_fired = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        // Also strengthen reverse connection (bidirectional)
        let reverse_key = (rule2.to_string(), rule1.to_string());
        if !self.synapses.contains_key(&reverse_key) {
            self.wire_together(rule2, rule1, correlation * 0.7);
        }
    }
    
    /// Find strongly connected rule clusters
    pub fn find_resonant_clusters(&self) -> Vec<Vec<String>> {
        let mut clusters: Vec<Vec<String>> = Vec::new();
        let mut visited: HashMap<String, bool> = HashMap::new();
        
        for rule in self.rule_potentials.keys() {
            if visited.contains_key(rule) {
                continue;
            }
            
            let cluster = self.explore_cluster(rule, &mut visited);
            if cluster.len() > 1 {
                clusters.push(cluster);
            }
        }
        
        clusters
    }
    
    /// Explore connected rules above resonance threshold
    fn explore_cluster(&self, start: &str, visited: &mut HashMap<String, bool>) -> Vec<String> {
        let mut cluster = vec![start.to_string()];
        visited.insert(start.to_string(), true);
        
        for ((from, to), synapse) in &self.synapses {
            if from == start && synapse.weight > self.resonance_threshold {
                if !visited.contains_key(to) {
                    let sub_cluster = self.explore_cluster(to, visited);
                    cluster.extend(sub_cluster);
                }
            }
        }
        
        cluster
    }
    
    /// Propagate activation through network
    fn propagate_activation(&mut self, rule_id: &str, potential: f32) {
        let connected: Vec<_> = self.synapses.iter()
            .filter(|((from, _), _)| from == rule_id)
            .map(|((_, to), synapse)| (to.clone(), synapse.weight))
            .collect();
        
        for (target, weight) in connected {
            let activation = potential * weight;
            if activation > 0.1 {
                // Update target potential
                let target_potential = self.rule_potentials.entry(target.clone())
                    .or_insert(0.0);
                *target_potential = (*target_potential + activation * 0.5).min(1.0);
            }
        }
    }
    
    /// Decay unused connections
    pub fn decay_synapses(&mut self) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        self.synapses.retain(|_, synapse| {
            // Decay weight based on time since last activation
            let time_delta = (now - synapse.last_fired) as f32;
            let decay = self.decay_rate * (time_delta / 3600.0); // Hourly decay
            
            synapse.weight -= decay;
            synapse.weight > 0.1 // Remove weak connections
        });
    }
    
    /// Get recommended rules based on current context
    pub fn recommend_rules(&self, context_rules: &[String]) -> Vec<String> {
        let mut recommendations: HashMap<String, f32> = HashMap::new();
        
        for rule in context_rules {
            // Find strongly connected rules
            for ((from, to), synapse) in &self.synapses {
                if from == rule && synapse.weight > self.resonance_threshold {
                    *recommendations.entry(to.clone()).or_insert(0.0) += synapse.weight;
                }
            }
        }
        
        // Sort by total weight
        let mut sorted: Vec<_> = recommendations.into_iter().collect();
        sorted.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        
        sorted.into_iter()
            .map(|(rule, _)| rule)
            .take(5)
            .collect()
    }
    
    /// Compute network coherence (overall health)
    pub fn coherence(&self) -> f32 {
        if self.synapses.is_empty() {
            return 0.0;
        }
        
        let total_weight: f32 = self.synapses.values()
            .map(|s| s.weight)
            .sum();
        
        let avg_weight = total_weight / self.synapses.len() as f32;
        
        // Coherence is high when weights are strong and balanced
        let variance: f32 = self.synapses.values()
            .map(|s| (s.weight - avg_weight).powi(2))
            .sum::<f32>() / self.synapses.len() as f32;
        
        // High average weight, low variance = high coherence
        (avg_weight * (1.0 - variance.sqrt())).min(1.0).max(0.0)
    }
}

/// Test Hebbian learning on a pattern
pub fn test_hebbian_on_pattern(ir: &IR) -> f32 {
    let mut network = HebbianNetwork::new();
    
    // Simulate rule applications
    let test_rules = vec![
        "fold_fusion",
        "map_compose", 
        "filter_push",
        "fold_fusion", // Repeated = stronger connection
        "map_compose"
    ];
    
    // Fire rules and build connections
    for i in 0..test_rules.len() {
        network.fire_rule(test_rules[i], true);
        
        // Wire adjacent rules
        if i > 0 {
            network.wire_together(test_rules[i-1], test_rules[i], 0.8);
        }
    }
    
    // Find emergent patterns
    let clusters = network.find_resonant_clusters();
    println!("🧠 Found {} resonant clusters", clusters.len());
    
    network.coherence()
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_hebbian_learning() {
        let mut network = HebbianNetwork::new();
        
        // Simulate successful rule sequence
        network.fire_rule("rule_a", true);
        network.fire_rule("rule_b", true);
        network.wire_together("rule_a", "rule_b", 0.9);
        
        // Check connection strength
        let key = ("rule_a".to_string(), "rule_b".to_string());
        assert!(network.synapses.contains_key(&key));
        assert!(network.synapses[&key].weight > 0.5);
    }
    
    #[test]
    fn test_resonant_clusters() {
        let mut network = HebbianNetwork::new();
        
        // Create a cluster
        network.wire_together("a", "b", 0.9);
        network.wire_together("b", "c", 0.9);
        network.wire_together("c", "a", 0.9);
        
        network.fire_rule("a", true);
        network.fire_rule("b", true);
        network.fire_rule("c", true);
        
        let clusters = network.find_resonant_clusters();
        assert_eq!(clusters.len(), 1);
        assert_eq!(clusters[0].len(), 3);
    }
    
    #[test]
    fn test_recommendations() {
        let mut network = HebbianNetwork::new();
        
        network.wire_together("map", "filter", 0.9);
        network.wire_together("filter", "fold", 0.8);
        network.wire_together("map", "fold", 0.6);
        
        network.fire_rule("map", true);
        network.fire_rule("filter", true);
        network.fire_rule("fold", true);
        
        let recs = network.recommend_rules(&["map".to_string()]);
        assert!(recs.contains(&"filter".to_string()));
    }
}