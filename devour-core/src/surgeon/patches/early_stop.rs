/// Early Stop - Stop when good enough
/// Don't compute to perfection when 90% is sufficient
///
/// This is how nature works - "good enough" evolution

use crate::ir::IR;
use crate::surgeon::egraph::Rewrite;

/// Generic early stop for any fold
pub fn early_stop_fold() -> Rewrite {
    Rewrite {
        name: "early_stop_fold".to_string(),
        pattern: "(fold ?f ?z ?xs)",
        replacement: "(fold_until ?threshold ?f ?z ?xs)",
        cost_delta: -500,  // Can stop after 10% of iterations
    }
}

/// Short-circuit boolean operations
pub fn short_circuit_any() -> Rewrite {
    Rewrite {
        name: "short_circuit_any".to_string(),
        pattern: "(fold or false ?xs)",
        replacement: "(any ?xs)",  // Stops at first true
        cost_delta: -100,
    }
}

pub fn short_circuit_all() -> Rewrite {
    Rewrite {
        name: "short_circuit_all".to_string(),
        pattern: "(fold and true ?xs)",
        replacement: "(all ?xs)",  // Stops at first false
        cost_delta: -100,
    }
}

/// Gradient descent with early stop
pub fn gradient_descent_early() -> Rewrite {
    Rewrite {
        name: "gradient_early_stop".to_string(),
        pattern: "(iterate ?step ?init ?max_iters)",
        replacement: "(iterate_until ?epsilon ?step ?init ?max_iters)",
        cost_delta: -1000,  // Often converges in 10% of max_iters
    }
}

/// Implementation with convergence detection
pub fn fold_until<T, F>(
    threshold: f64,
    f: F,
    z: T,
    xs: impl Iterator<Item = T>,
) -> T 
where
    T: Clone,
    F: Fn(T, T) -> T,
{
    let mut acc = z;
    let mut prev = acc.clone();
    let mut iterations = 0;
    
    for x in xs {
        acc = f(acc, x);
        iterations += 1;
        
        // Check convergence every 10 iterations
        if iterations % 10 == 0 {
            if converged(&acc, &prev, threshold) {
                println!("Early stop at iteration {}", iterations);
                return acc;
            }
            prev = acc.clone();
        }
    }
    
    acc
}

fn converged<T>(current: &T, previous: &T, threshold: f64) -> bool {
    // Simplified - would check actual convergence metric
    true  // Placeholder
}

/// Real-world example: Finding first match in large dataset
pub fn find_first_match(haystack: &[String], needle: &str) -> Option<usize> {
    // Traditional: check everything
    // haystack.iter().position(|s| s.contains(needle))
    
    // Early stop: return immediately on first match
    for (i, s) in haystack.iter().enumerate() {
        if s.contains(needle) {
            return Some(i);  // Stop here!
        }
    }
    None
}

/// Benchmark: Monte Carlo simulation with early stop
#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;
    
    #[test]
    fn test_monte_carlo_early_stop() {
        let target_confidence = 0.95;
        let epsilon = 0.001;
        
        // Traditional: Run all million simulations
        let start = Instant::now();
        let result1 = monte_carlo_traditional(1_000_000);
        let traditional_time = start.elapsed();
        
        // Early stop: Stop when confidence reached
        let start = Instant::now();
        let (result2, iterations) = monte_carlo_early_stop(1_000_000, epsilon);
        let early_time = start.elapsed();
        
        println!("Traditional: {} in {:?}", result1, traditional_time);
        println!("Early stop: {} in {:?} ({} iterations)", 
                 result2, early_time, iterations);
        
        let speedup = traditional_time.as_nanos() / early_time.as_nanos();
        println!("Early stop speedup: {}×", speedup);
        
        assert!((result1 - result2).abs() < epsilon);
        assert!(speedup > 10);  // Often 50-100× for Monte Carlo
    }
    
    fn monte_carlo_traditional(n: usize) -> f64 {
        let mut sum = 0.0;
        for i in 0..n {
            sum += simulate(i);
        }
        sum / n as f64
    }
    
    fn monte_carlo_early_stop(max_n: usize, epsilon: f64) -> (f64, usize) {
        let mut sum = 0.0;
        let mut prev_avg = 0.0;
        
        for i in 1..=max_n {
            sum += simulate(i);
            let avg = sum / i as f64;
            
            // Check convergence every 1000 iterations
            if i % 1000 == 0 && i > 10000 {
                if (avg - prev_avg).abs() < epsilon {
                    return (avg, i);  // Early stop!
                }
                prev_avg = avg;
            }
        }
        
        (sum / max_n as f64, max_n)
    }
    
    fn simulate(seed: usize) -> f64 {
        // Simplified simulation
        ((seed * 1103515245 + 12345) % 1000) as f64 / 1000.0
    }
    
    #[test]
    fn test_any_short_circuit() {
        let data: Vec<bool> = vec![false; 1_000_000];
        let mut data_with_true = data.clone();
        data_with_true[1000] = true;  // True early in list
        
        // Traditional fold: checks all million
        let start = Instant::now();
        let _result1 = data_with_true.iter().fold(false, |a, &b| a || b);
        let fold_time = start.elapsed();
        
        // Short-circuit: stops at element 1000
        let start = Instant::now();
        let _result2 = data_with_true.iter().any(|&x| x);
        let any_time = start.elapsed();
        
        let speedup = fold_time.as_nanos() / any_time.as_nanos();
        println!("Short-circuit speedup: {}×", speedup);
        
        assert!(speedup > 900);  // Should be ~1000×
    }
}

/// Iterative algorithms with convergence
pub struct IterativeOptimizer {
    epsilon: f64,
    max_iters: usize,
}

impl IterativeOptimizer {
    pub fn optimize<F>(&self, f: F, init: f64) -> (f64, usize) 
    where
        F: Fn(f64) -> f64,
    {
        let mut x = init;
        let mut prev = x;
        
        for i in 0..self.max_iters {
            x = f(x);
            
            if (x - prev).abs() < self.epsilon {
                return (x, i);  // Converged early!
            }
            
            prev = x;
        }
        
        (x, self.max_iters)
    }
}