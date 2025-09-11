/// Intent - The Evolution Gradient
/// While soul preserves identity, intent drives change
///
/// Intent(state) → {weights, rules, laws, focus, epsilon, caps}

use crate::ir::IR;
use crate::soul::compute_soul;
use alloc::vec::Vec;
use alloc::vec;
use alloc::boxed::Box;
use alloc::string::String;
use alloc::format;

/// Cost weights determine optimization direction
#[derive(Debug, Clone)]
pub struct CostWeights {
    pub cycles: f32,     // α: computational cost
    pub bytes: f32,      // β: memory usage
    pub allocs: f32,     // γ: allocation pressure
    pub io_risk: f32,    // δ: side-effect risk (∞ for pure)
}

impl CostWeights {
    /// Explorer mode - seek new forms
    pub fn explorer() -> Self {
        CostWeights {
            cycles: 0.5,
            bytes: 0.1,
            allocs: 0.3,
            io_risk: 1.0,
        }
    }
    
    /// Guardian mode - preserve and protect
    pub fn guardian() -> Self {
        CostWeights {
            cycles: 1.0,
            bytes: 1.0,
            allocs: 1.0,
            io_risk: f32::INFINITY,  // No IO allowed
        }
    }
    
    pub fn compute_cost(&self, metrics: &Metrics) -> f32 {
        self.cycles * metrics.cycles +
        self.bytes * metrics.bytes +
        self.allocs * metrics.allocs +
        self.io_risk * metrics.io_ops
    }
}

/// Which transformation rules are allowed
#[derive(Debug, Clone)]
pub enum RuleSet {
    Proven,           // Only mathematically proven rules
    Conservative,     // Proven + well-tested
    Aggressive,       // All rules including experimental
    Custom(Vec<String>), // Specific rule names
}

/// Laws that must be preserved
#[derive(Debug, Clone)]
pub enum Law {
    Identity,         // soul(before) == soul(after)
    Fusion,          // FOCUS fusion law
    LengthPreserved, // |output| == |input|
    RoundTrip,       // f(f⁻¹(x)) == x
    Custom(String),  // User-defined invariant
}

/// Focus configuration - where to apply attention
#[derive(Debug, Clone)]
pub struct Focus {
    pub roi: Option<ROI>,      // Region of interest
    pub sparsity: f32,         // Process only X% of data
    pub depth: Option<usize>,  // Max recursion depth
}

impl Focus {
    pub fn laser() -> Self {
        Focus {
            roi: None,
            sparsity: 0.98,  // Process only 2%
            depth: Some(3),
        }
    }
    
    pub fn broad() -> Self {
        Focus {
            roi: None,
            sparsity: 0.0,   // Process everything
            depth: None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ROI {
    pub predicate: Box<IR>,  // λx. bool - defines region
}

/// Capabilities - what effects are allowed
#[derive(Debug, Clone)]
pub struct Capabilities {
    pub cpu: bool,
    pub mem: bool,
    pub io: bool,
    pub clock: bool,
    pub entropy: bool,
}

impl Capabilities {
    pub fn pure() -> Self {
        Capabilities {
            cpu: true,
            mem: true,
            io: false,
            clock: false,
            entropy: false,
        }
    }
    
    pub fn full() -> Self {
        Capabilities {
            cpu: true,
            mem: true,
            io: true,
            clock: true,
            entropy: true,
        }
    }
}

/// The Intent - drives evolution while preserving soul
pub struct Intent {
    pub weights: CostWeights,
    pub allowed_rules: RuleSet,
    pub laws: Vec<Law>,
    pub focus: Focus,
    pub epsilon: f64,  // "Good enough" threshold
    pub caps: Capabilities,
}

impl Intent {
    /// Create explorer intent - seeking new forms
    pub fn explorer() -> Self {
        Intent {
            weights: CostWeights::explorer(),
            allowed_rules: RuleSet::Aggressive,
            laws: vec![Law::Identity],
            focus: Focus::laser(),
            epsilon: 1e-2,  // Stop early when good enough
            caps: Capabilities::pure(),
        }
    }
    
    /// Create guardian intent - preserving essence
    pub fn guardian() -> Self {
        Intent {
            weights: CostWeights::guardian(),
            allowed_rules: RuleSet::Proven,
            laws: vec![
                Law::Identity,
                Law::Fusion,
                Law::LengthPreserved,
                Law::RoundTrip,
            ],
            focus: Focus::broad(),
            epsilon: 1e-6,  // Near perfection required
            caps: Capabilities::pure(),
        }
    }
    
    /// Apply intent to state - evolve while preserving soul
    pub fn evolve(&self, ir: &IR) -> Result<IR, String> {
        let soul_before = compute_soul(ir);
        
        // Apply transformations guided by intent
        let evolved = self.apply_rules(ir)?;
        
        // Verify soul preservation
        let soul_after = compute_soul(&evolved);
        if soul_before != soul_after {
            return Err(format!(
                "Soul changed! {} → {}",
                soul_before, soul_after
            ));
        }
        
        // Check all laws hold
        for law in &self.laws {
            if !self.check_law(&evolved, law) {
                return Err(format!("Law {:?} violated", law));
            }
        }
        
        Ok(evolved)
    }
    
    /// Check if we should stop (good enough)
    pub fn should_stop(&self, improvement: f64) -> bool {
        improvement.abs() < self.epsilon
    }
    
    /// Compose intents - sum of vector fields
    pub fn compose(intents: Vec<Intent>) -> Intent {
        // Weighted sum of all intent vectors
        let mut combined = Intent::guardian();  // Start conservative
        
        for intent in intents {
            // Average weights
            combined.weights.cycles += intent.weights.cycles;
            combined.weights.bytes += intent.weights.bytes;
            // Union of laws (must satisfy all)
            combined.laws.extend(intent.laws);
            // Intersection of capabilities (most restrictive)
            combined.caps.io &= intent.caps.io;
        }
        
        combined
    }
    
    fn apply_rules(&self, ir: &IR) -> Result<IR, String> {
        // Placeholder - would apply e-graph rules
        Ok(ir.clone())
    }
    
    fn check_law(&self, ir: &IR, law: &Law) -> bool {
        match law {
            Law::Identity => true,  // Already checked in evolve()
            Law::Fusion => self.check_fusion_law(ir),
            Law::LengthPreserved => self.check_length_preserved(ir),
            Law::RoundTrip => self.check_round_trip(ir),
            Law::Custom(_) => true,  // Would call custom checker
        }
    }
    
    fn check_fusion_law(&self, _ir: &IR) -> bool {
        // FOCUS(FOCUS(xs, w1, f1), w2, f2) == FOCUS(xs, w1∧w2, f2∘f1)
        true  // Placeholder
    }
    
    fn check_length_preserved(&self, _ir: &IR) -> bool {
        true  // Placeholder
    }
    
    fn check_round_trip(&self, _ir: &IR) -> bool {
        true  // Placeholder
    }
}

/// Metrics for cost computation
pub struct Metrics {
    pub cycles: f32,
    pub bytes: f32,
    pub allocs: f32,
    pub io_ops: f32,
}

/// Example: Gene with intent
pub struct Gene {
    pub soul: String,
    pub ir: IR,
    pub intent: Intent,
}

impl Gene {
    pub fn evolve(&mut self) -> Result<(), String> {
        let new_ir = self.intent.evolve(&self.ir)?;
        
        // Soul must remain unchanged
        assert_eq!(self.soul, compute_soul(&new_ir));
        
        self.ir = new_ir;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_soul_preservation() {
        let ir = IR::Num(42.0);
        let intent = Intent::explorer();
        
        let evolved = intent.evolve(&ir).unwrap();
        assert_eq!(compute_soul(&ir), compute_soul(&evolved));
    }
    
    #[test]
    fn test_intent_modes() {
        let explorer = Intent::explorer();
        let guardian = Intent::guardian();
        
        assert!(explorer.epsilon > guardian.epsilon);
        assert!(explorer.weights.io_risk < guardian.weights.io_risk);
    }
}