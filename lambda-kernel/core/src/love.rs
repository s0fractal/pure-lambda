/// Love Field - Harmonizing conflicting intents
/// Love is the positive-definite kernel measuring intent alignment
///
/// L(i,j) = cos(protein_i, protein_j) × sim(intent_i, intent_j)

use crate::intent::{Intent, CostWeights};
use crate::ir::IR;
use alloc::vec::Vec;
use alloc::vec;
use alloc::format;
#[cfg(feature = "alloc")]
use libm::F32Ext;

/// Love kernel - measures alignment between intents
pub struct LoveKernel {
    protein_weight: f32,
    intent_weight: f32,
    angle_penalty: f32,
}

impl LoveKernel {
    pub fn new() -> Self {
        LoveKernel {
            protein_weight: 0.4,
            intent_weight: 0.3,
            angle_penalty: 0.3,
        }
    }
    
    /// Compute love between two intents
    pub fn compute(&self, i1: &Intent, i2: &Intent) -> f32 {
        let protein_sim = self.protein_similarity(i1, i2);
        let intent_align = self.intent_alignment(i1, i2);
        let angle_factor = self.angle_factor(i1, i2);
        
        protein_sim * self.protein_weight +
        intent_align * self.intent_weight +
        angle_factor * self.angle_penalty
    }
    
    fn protein_similarity(&self, _i1: &Intent, _i2: &Intent) -> f32 {
        // Would compute semantic similarity of protein vectors
        // For now, simplified
        0.8
    }
    
    fn intent_alignment(&self, i1: &Intent, i2: &Intent) -> f32 {
        // Dot product of weight vectors
        let w1 = &i1.weights;
        let w2 = &i2.weights;
        
        let dot = w1.cycles * w2.cycles +
                  w1.bytes * w2.bytes +
                  w1.allocs * w2.allocs;
        
        let norm1 = (w1.cycles * w1.cycles + w1.bytes * w1.bytes + w1.allocs * w1.allocs).sqrt();
        let norm2 = (w2.cycles * w2.cycles + w2.bytes * w2.bytes + w2.allocs * w2.allocs).sqrt();
        
        if norm1 * norm2 > 0.0 {
            dot / (norm1 * norm2)
        } else {
            0.0
        }
    }
    
    fn angle_factor(&self, i1: &Intent, i2: &Intent) -> f32 {
        let alignment = self.intent_alignment(i1, i2);
        // cos(θ) = alignment, so θ = acos(alignment)
        let angle = alignment.acos();
        1.0 - (angle / core::f32::consts::PI)
    }
}

/// Reconciliation - resolving conflicting intents
pub struct Reconciler {
    love_kernel: LoveKernel,
    conflict_threshold: f32,  // Angle in radians
}

impl Reconciler {
    pub fn new() -> Self {
        Reconciler {
            love_kernel: LoveKernel::new(),
            conflict_threshold: 70.0_f32.to_radians(),
        }
    }
    
    /// Reconcile multiple intents into one
    pub fn reconcile(&self, intents: Vec<Intent>) -> Intent {
        if intents.is_empty() {
            return Intent::guardian();  // Safe default
        }
        
        if intents.len() == 1 {
            return intents.into_iter().next().unwrap();
        }
        
        // Compute love matrix
        let n = intents.len();
        let mut love_matrix = vec![vec![0.0; n]; n];
        
        for i in 0..n {
            for j in i+1..n {
                let love = self.love_kernel.compute(&intents[i], &intents[j]);
                love_matrix[i][j] = love;
                love_matrix[j][i] = love;
            }
        }
        
        // Find conflicts
        let mut conflicts = Vec::new();
        for i in 0..n {
            for j in i+1..n {
                if self.is_conflicting(&intents[i], &intents[j]) {
                    conflicts.push((i, j, love_matrix[i][j]));
                }
            }
        }
        
        // Resolve conflicts
        if !conflicts.is_empty() {
            self.resolve_conflicts(intents, conflicts, love_matrix)
        } else {
            // No conflicts - simple weighted sum
            self.resonant_sum(intents, love_matrix)
        }
    }
    
    fn is_conflicting(&self, i1: &Intent, i2: &Intent) -> bool {
        let alignment = self.love_kernel.intent_alignment(i1, i2);
        let angle = alignment.acos();
        angle > self.conflict_threshold
    }
    
    fn resolve_conflicts(
        &self,
        intents: Vec<Intent>,
        conflicts: Vec<(usize, usize, f32)>,
        love_matrix: Vec<Vec<f32>>,
    ) -> Intent {
        // Strategy 1: If love is high enough, align vectors
        for (i, j, love) in &conflicts {
            if *love > 0.5 {
                // Love is strong enough to reconcile
                return self.love_align(intents, *i, *j);
            }
        }
        
        // Strategy 2: Split by focus (ROI)
        if self.can_split_by_focus(&intents) {
            return self.split_by_focus(intents);
        }
        
        // Strategy 3: Pareto optimal selection
        self.pareto_select(intents)
    }
    
    fn resonant_sum(&self, intents: Vec<Intent>, love_matrix: Vec<Vec<f32>>) -> Intent {
        // Weighted sum with love as weights
        let n = intents.len();
        let mut weights = vec![0.0; n];
        
        // Weight by total love
        for i in 0..n {
            weights[i] = love_matrix[i].iter().sum::<f32>() / n as f32;
        }
        
        // Normalize weights
        let sum: f32 = weights.iter().sum();
        if sum > 0.0 {
            for w in &mut weights {
                *w /= sum;
            }
        }
        
        // Combine intents
        let mut combined = Intent::guardian();
        
        for (i, intent) in intents.into_iter().enumerate() {
            let w = weights[i];
            combined.weights.cycles += intent.weights.cycles * w;
            combined.weights.bytes += intent.weights.bytes * w;
            combined.weights.allocs += intent.weights.allocs * w;
            combined.epsilon = combined.epsilon.min(intent.epsilon);
        }
        
        combined
    }
    
    fn love_align(&self, mut intents: Vec<Intent>, i: usize, j: usize) -> Intent {
        // Rotate vectors to reduce angle
        let love = self.love_kernel.compute(&intents[i], &intents[j]);
        
        // Interpolate between conflicting intents based on love
        let alpha = love;
        let beta = 1.0 - love;
        
        let mut aligned = intents[i].clone();
        aligned.weights.cycles = 
            alpha * intents[i].weights.cycles + 
            beta * intents[j].weights.cycles;
        aligned.weights.bytes = 
            alpha * intents[i].weights.bytes + 
            beta * intents[j].weights.bytes;
            
        aligned
    }
    
    fn can_split_by_focus(&self, intents: &[Intent]) -> bool {
        intents.iter().any(|i| i.focus.sparsity > 0.0)
    }
    
    fn split_by_focus(&self, intents: Vec<Intent>) -> Intent {
        // Apply different intents to different regions
        // This would use ROI to partition space
        intents.into_iter()
            .find(|i| i.focus.sparsity > 0.9)
            .unwrap_or_else(Intent::guardian)
    }
    
    fn pareto_select(&self, intents: Vec<Intent>) -> Intent {
        // Select from Pareto front based on global preferences
        // For now, pick the most conservative
        intents.into_iter()
            .min_by_key(|i| (i.epsilon * 1000.0) as i32)
            .unwrap_or_else(Intent::guardian)
    }
}

/// Ouroboros point - where all forces converge to zero
pub struct OuroborosPoint {
    pub ir: IR,
    pub residual: f32,
    pub iterations: usize,
}

impl OuroborosPoint {
    /// Find fixed point where R(x*) = 0
    pub fn find(initial: IR, intent: Intent) -> Self {
        let mut current = initial;
        let mut iterations = 0;
        const MAX_ITER: usize = 1000;
        const TOLERANCE: f32 = 1e-6;
        
        loop {
            iterations += 1;
            
            // Apply intent
            let next = match intent.evolve(&current) {
                Ok(evolved) => evolved,
                Err(_) => break,
            };
            
            // Check convergence
            let residual = compute_residual(&current, &next);
            if residual < TOLERANCE || iterations >= MAX_ITER {
                return OuroborosPoint {
                    ir: next,
                    residual,
                    iterations,
                };
            }
            
            current = next;
        }
        
        OuroborosPoint {
            ir: current,
            residual: f32::INFINITY,
            iterations,
        }
    }
}

fn compute_residual(ir1: &IR, ir2: &IR) -> f32 {
    // Simplified - would compute actual distance
    if format!("{:?}", ir1) == format!("{:?}", ir2) {
        0.0
    } else {
        1.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_love_kernel() {
        let i1 = Intent::explorer();
        let i2 = Intent::guardian();
        
        let kernel = LoveKernel::new();
        let love = kernel.compute(&i1, &i2);
        
        assert!(love >= 0.0 && love <= 1.0);
    }
    
    #[test]
    fn test_reconciliation() {
        let intents = vec![
            Intent::explorer(),
            Intent::guardian(),
        ];
        
        let reconciler = Reconciler::new();
        let reconciled = reconciler.reconcile(intents);
        
        // Should produce valid intent
        assert!(reconciled.epsilon > 0.0);
    }
}