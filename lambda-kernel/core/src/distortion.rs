/// Address→Value Distortion Metric
/// Measures how well "where we point" matches "what we get"
///
/// δ = w₁·unpredictability + w₂·instability + w₃·nonlocality + w₄·redundancy

use crate::soul::compute_soul;
use crate::ir::IR;

/// Components of address→value distortion
#[derive(Debug, Clone)]
pub struct Distortion {
    pub unpredictability: f32,  // δ₁: address leads to unexpected soul
    pub instability: f32,       // δ₂: value varies over time at same address
    pub nonlocality: f32,       // δ₃: graph distance from address to canonical soul
    pub redundancy: f32,        // δ₄: multiple addresses for same soul
}

impl Distortion {
    /// Compute total distortion with weights
    pub fn total(&self, weights: &DistortionWeights) -> f32 {
        weights.unpredictability * self.unpredictability +
        weights.instability * self.instability +
        weights.nonlocality * self.nonlocality +
        weights.redundancy * self.redundancy
    }
    
    /// Perfect system - no distortion
    pub fn zero() -> Self {
        Distortion {
            unpredictability: 0.0,
            instability: 0.0,
            nonlocality: 0.0,
            redundancy: 0.0,
        }
    }
    
    /// Measure improvement
    pub fn improvement(&self, after: &Distortion) -> f32 {
        let before_sum = self.unpredictability + self.instability + 
                        self.nonlocality + self.redundancy;
        let after_sum = after.unpredictability + after.instability + 
                       after.nonlocality + after.redundancy;
        
        if before_sum > 0.0 {
            (before_sum - after_sum) / before_sum
        } else {
            0.0
        }
    }
}

#[derive(Debug, Clone)]
pub struct DistortionWeights {
    pub unpredictability: f32,
    pub instability: f32,
    pub nonlocality: f32,
    pub redundancy: f32,
}

impl DistortionWeights {
    pub fn default() -> Self {
        DistortionWeights {
            unpredictability: 0.4,
            instability: 0.2,
            nonlocality: 0.3,
            redundancy: 0.1,
        }
    }
}

/// Address→Soul→Value ledger
pub struct AddressLedger {
    entries: Vec<LedgerEntry>,
}

#[derive(Debug, Clone)]
pub struct LedgerEntry {
    pub address: String,      // Human name/path/API
    pub soul: String,          // Canonical hash
    pub value_type: ValueType,
    pub proof: Option<String>, // CID of proof
    pub aliases: Vec<String>,  // Other addresses for same soul
}

#[derive(Debug, Clone)]
pub enum ValueType {
    Direct,           // Address maps directly to value
    Lens,            // Address is a lens/view
    Redirect,        // Address redirects to another
    Merged,          // Multiple addresses merged here
}

impl AddressLedger {
    pub fn new() -> Self {
        AddressLedger {
            entries: Vec::new(),
        }
    }
    
    /// Add entry to ledger
    pub fn record(&mut self, address: String, ir: &IR) -> LedgerEntry {
        let soul = compute_soul(ir);
        
        // Check if soul already exists
        let existing = self.entries.iter()
            .find(|e| e.soul == soul)
            .cloned();
        
        let entry = if let Some(mut existing) = existing {
            // Soul exists - this is an alias
            existing.aliases.push(address.clone());
            existing.value_type = ValueType::Merged;
            existing
        } else {
            // New soul
            LedgerEntry {
                address: address.clone(),
                soul: soul.clone(),
                value_type: ValueType::Direct,
                proof: None,
                aliases: vec![],
            }
        };
        
        self.entries.push(entry.clone());
        entry
    }
    
    /// Compute distortion metrics
    pub fn compute_distortion(&self) -> Distortion {
        let total = self.entries.len() as f32;
        if total == 0.0 {
            return Distortion::zero();
        }
        
        // δ₁: Unpredictability - how often address doesn't match expected soul
        let unexpected = self.entries.iter()
            .filter(|e| !self.is_predictable(&e.address, &e.soul))
            .count() as f32;
        let unpredictability = unexpected / total;
        
        // δ₂: Instability - would track changes over time
        // For now, simplified
        let instability = 0.0;
        
        // δ₃: Nonlocality - indirection levels
        let total_hops: f32 = self.entries.iter()
            .map(|e| self.count_hops(e) as f32)
            .sum();
        let nonlocality = total_hops / total;
        
        // δ₄: Redundancy - multiple addresses per soul
        let souls: std::collections::HashSet<_> = 
            self.entries.iter().map(|e| &e.soul).collect();
        let redundancy = if souls.len() > 0 {
            (total - souls.len() as f32) / total
        } else {
            0.0
        };
        
        Distortion {
            unpredictability,
            instability,
            nonlocality,
            redundancy,
        }
    }
    
    fn is_predictable(&self, address: &str, soul: &str) -> bool {
        // Simple heuristic: address should hint at soul
        address.contains(&soul[..8]) || soul.contains(&address[..3.min(address.len())])
    }
    
    fn count_hops(&self, entry: &LedgerEntry) -> usize {
        match entry.value_type {
            ValueType::Direct => 0,
            ValueType::Lens => 1,
            ValueType::Redirect => 2,
            ValueType::Merged => entry.aliases.len(),
        }
    }
    
    /// Apply distortion-reducing transformations
    pub fn reduce_distortion(&mut self) {
        // 1. Merge redundant addresses
        self.merge_redundant();
        
        // 2. Flatten redirects
        self.flatten_redirects();
        
        // 3. Align names with souls
        self.align_names();
    }
    
    fn merge_redundant(&mut self) {
        // Group by soul
        let mut by_soul: std::collections::HashMap<String, Vec<usize>> = 
            std::collections::HashMap::new();
            
        for (i, entry) in self.entries.iter().enumerate() {
            by_soul.entry(entry.soul.clone()).or_default().push(i);
        }
        
        // Merge entries with same soul
        for (soul, indices) in by_soul {
            if indices.len() > 1 {
                // Keep first, mark others as merged
                for &i in &indices[1..] {
                    self.entries[i].value_type = ValueType::Merged;
                }
            }
        }
    }
    
    fn flatten_redirects(&mut self) {
        // Convert multi-hop redirects to direct
        for entry in &mut self.entries {
            if matches!(entry.value_type, ValueType::Redirect) {
                entry.value_type = ValueType::Direct;
            }
        }
    }
    
    fn align_names(&mut self) {
        // Rename to include soul prefix
        for entry in &mut self.entries {
            if !entry.address.contains(&entry.soul[..8]) {
                let aligned = format!("{}_{}", &entry.soul[..8], entry.address);
                entry.aliases.push(entry.address.clone());
                entry.address = aligned;
            }
        }
    }
}

/// Distortion meter - measures before/after
pub struct DistortionMeter {
    pub before: Distortion,
    pub after: Distortion,
    pub weights: DistortionWeights,
}

impl DistortionMeter {
    pub fn measure(ledger_before: &AddressLedger, ledger_after: &AddressLedger) -> Self {
        let weights = DistortionWeights::default();
        let before = ledger_before.compute_distortion();
        let after = ledger_after.compute_distortion();
        
        DistortionMeter {
            before,
            after,
            weights,
        }
    }
    
    pub fn report(&self) -> String {
        let before_total = self.before.total(&self.weights);
        let after_total = self.after.total(&self.weights);
        let improvement = self.before.improvement(&self.after);
        
        format!(
            "Distortion Report:\n\
             Before: {:.3}\n\
             - Unpredictability: {:.3}\n\
             - Instability: {:.3}\n\
             - Nonlocality: {:.3}\n\
             - Redundancy: {:.3}\n\
             After: {:.3}\n\
             - Unpredictability: {:.3}\n\
             - Instability: {:.3}\n\
             - Nonlocality: {:.3}\n\
             - Redundancy: {:.3}\n\
             Improvement: {:.1}%",
            before_total,
            self.before.unpredictability,
            self.before.instability,
            self.before.nonlocality,
            self.before.redundancy,
            after_total,
            self.after.unpredictability,
            self.after.instability,
            self.after.nonlocality,
            self.after.redundancy,
            improvement * 100.0
        )
    }
}

/// How our optimization rules reduce distortion
pub fn distortion_impact(rule: &str) -> Distortion {
    match rule {
        "fold_sink" => Distortion {
            unpredictability: -0.1,  // More direct computation
            instability: -0.05,      // Less intermediate state
            nonlocality: -0.3,       // Removes intermediate addresses
            redundancy: -0.2,        // Merges operations
        },
        "focus_fusion" => Distortion {
            unpredictability: -0.05,
            instability: 0.0,
            nonlocality: -0.4,       // Direct ROI access
            redundancy: -0.1,
        },
        "early_stop" => Distortion {
            unpredictability: -0.02,
            instability: -0.3,       // Stops value drift
            nonlocality: 0.0,
            redundancy: 0.0,
        },
        "content_address" => Distortion {
            unpredictability: -0.5,  // Perfect predictability
            instability: -0.4,       // Immutable by hash
            nonlocality: -0.2,       // Direct access
            redundancy: -0.3,        // Automatic dedup
        },
        _ => Distortion::zero(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_distortion_measurement() {
        let mut ledger = AddressLedger::new();
        
        // Add some entries
        ledger.record("map".to_string(), &IR::Var(42));
        ledger.record("filter".to_string(), &IR::Var(42)); // Same soul!
        ledger.record("fold".to_string(), &IR::Var(23));
        
        let distortion = ledger.compute_distortion();
        
        // Should detect redundancy
        assert!(distortion.redundancy > 0.0);
    }
    
    #[test]
    fn test_distortion_reduction() {
        let mut before = AddressLedger::new();
        before.record("f1".to_string(), &IR::Var(1));
        before.record("f2".to_string(), &IR::Var(1)); // Redundant
        
        let mut after = before.clone();
        after.reduce_distortion();
        
        let meter = DistortionMeter::measure(&before, &after);
        assert!(meter.after.redundancy < meter.before.redundancy);
    }
}