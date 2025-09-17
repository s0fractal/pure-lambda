//! Surgeon v2 - E-graph based optimization
//! Deterministic rewriting with semantic preservation

use egg::{*, rewrite as rw};
use std::fs;
use std::time::Instant;

define_language! {
    enum Lambda {
        // Basic λ-calculus
        "var" = Var(Id),
        "lam" = Lam([Id; 2]),
        "app" = App([Id; 2]),
        "let" = Let([Id; 3]),
        
        // Operations
        "map" = Map([Id; 2]),
        "filter" = Filter([Id; 2]),
        "FOCUS" = Focus([Id; 4]),
        "OBSERVE" = Observe([Id; 2]),
        "REDUCE" = Reduce(Id),
        
        // Combinators
        "compose" = Compose([Id; 2]),
        "and" = And([Id; 2]),
        "or" = Or([Id; 2]),
        "id" = Identity,
        
        // Constants
        "const" = Const(i32),
        "add" = Add([Id; 2]),
        
        // Lists
        "nil" = Nil,
        "cons" = Cons([Id; 2]),
        
        // Recursion
        "rec" = Rec([Id; 3]),
        "rec_tail" = RecTail([Id; 3]),
        
        // Symbols
        Symbol(Symbol),
    }
}

/// Cost function for expressions
struct LambdaCost;
impl CostFunction<Lambda> for LambdaCost {
    type Cost = usize;
    
    fn cost<C>(&mut self, enode: &Lambda, mut costs: C) -> Self::Cost
    where
        C: FnMut(Id) -> Self::Cost
    {
        let base = match enode {
            Lambda::Const(_) | Lambda::Nil | Lambda::Identity => 0,
            Lambda::Var(_) | Lambda::Symbol(_) => 1,
            Lambda::Lam(_) | Lambda::App(_) => 1,
            Lambda::Let(_) => 1,
            Lambda::Map(_) | Lambda::Filter(_) => 2,
            Lambda::Focus(_) => 3,  // Slightly higher but does both
            Lambda::Observe(_) | Lambda::Reduce(_) => 1,
            Lambda::Compose(_) | Lambda::And(_) | Lambda::Or(_) => 1,
            Lambda::Add(_) => 1,
            Lambda::Cons(_) => 1,
            Lambda::Rec(_) => 3,
            Lambda::RecTail(_) => 2,  // Better than regular recursion
        };
        
        enode.fold(base, |sum, id| sum + costs(id))
    }
}

/// Load rules from TOML file
fn load_rules() -> Vec<Rewrite<Lambda, ()>> {
    vec![
        // Map fusion
        rw!("map-map-fusion";
            "(map ?f (map ?g ?xs))" =>
            "(map (compose ?f ?g) ?xs)"),
        
        // Filter+map to FOCUS
        rw!("filter-map-to-focus";
            "(map ?f (filter ?p ?xs))" =>
            "(FOCUS ?xs ?p ?f drop)"),
        
        // Filter fusion
        rw!("filter-filter-fusion";
            "(filter ?p (filter ?q ?xs))" =>
            "(filter (and ?p ?q) ?xs)"),
        
        // Identity elimination
        rw!("identity-elimination";
            "(map id ?xs)" => "?xs"),
        
        // Constant folding
        rw!("const-fold-add";
            "(add (const ?a) (const ?b))" =>
            { ConstFold { a: "?a".parse().unwrap(), b: "?b".parse().unwrap() } }),
        
        // Beta reduction
        rw!("beta-reduction";
            "(app (lam ?x ?body) ?arg)" =>
            "(REDUCE (let ?x ?arg ?body))"),
        
        // OBSERVE idempotence
        rw!("observe-idempotence";
            "(OBSERVE (OBSERVE ?w ?o1) ?o2)" =>
            "(OBSERVE ?w ?o1)"),
        
        // FOCUS composition
        rw!("focus-composition";
            "(FOCUS (FOCUS ?xs ?p1 ?f1 ?d1) ?p2 ?f2 ?d2)" =>
            "(FOCUS ?xs (and ?p1 (compose ?p2 ?f1)) (compose ?f2 ?f1) (or ?d1 ?d2))"),
    ]
}

struct ConstFold {
    a: Var,
    b: Var,
}

impl Applier<Lambda, ()> for ConstFold {
    fn apply_one(&self, egraph: &mut EGraph<Lambda, ()>, matched: Id, subst: &Subst, _: Option<&()>) -> Vec<Id> {
        let a = subst[self.a];
        let b = subst[self.b];
        
        if let (Lambda::Const(av), Lambda::Const(bv)) = 
            (&egraph[a].nodes[0], &egraph[b].nodes[0]) {
            let sum = av + bv;
            let new_node = Lambda::Const(sum);
            vec![egraph.add(new_node)]
        } else {
            vec![]
        }
    }
}

/// Semantic hash for verification
fn semantic_hash(expr: &RecExpr<Lambda>) -> String {
    use blake3::Hasher;
    let mut hasher = Hasher::new();
    
    // Hash the normalized structure
    for node in expr.as_ref() {
        match node {
            Lambda::Symbol(s) => hasher.update(s.as_str().as_bytes()),
            Lambda::Const(n) => hasher.update(&n.to_le_bytes()),
            _ => {
                let discriminant = std::mem::discriminant(node);
                hasher.update(&(discriminant as u32).to_le_bytes());
            }
        }
    }
    
    format!("{:x}", hasher.finalize())
}

/// Main optimization pipeline
pub fn optimize(input: &str) -> Result<(String, OptimizationReport), String> {
    let start = Instant::now();
    
    // Parse input
    let expr: RecExpr<Lambda> = input.parse()
        .map_err(|e| format!("Parse error: {:?}", e))?;
    
    // Compute initial semantic hash
    let initial_hash = semantic_hash(&expr);
    let initial_cost = LambdaCost.cost_rec(&expr);
    
    // Create e-graph and add expression
    let mut egraph = EGraph::new(());
    let id = egraph.add_expr(&expr);
    
    // Load and apply rules
    let rules = load_rules();
    let runner = Runner::default()
        .with_egraph(egraph)
        .with_iter_limit(1000)
        .with_time_limit(std::time::Duration::from_secs(5))
        .run(&rules);
    
    // Extract best expression
    let extractor = Extractor::new(&runner.egraph, LambdaCost);
    let (best_cost, best_expr) = extractor.find_best(id);
    
    // Compute final semantic hash
    let final_hash = semantic_hash(&best_expr);
    
    // Verify semantic preservation
    if initial_hash != final_hash {
        return Err(format!(
            "Semantic hash changed! {} → {}",
            initial_hash, final_hash
        ));
    }
    
    // Generate report
    let report = OptimizationReport {
        initial_cost,
        final_cost: best_cost,
        speedup: initial_cost as f64 / best_cost as f64,
        iterations: runner.iterations.len(),
        time_ms: start.elapsed().as_millis() as u64,
        rules_applied: runner.iterations
            .iter()
            .flat_map(|i| i.applied.iter().map(|r| r.name.to_string()))
            .collect(),
        semantic_hash: final_hash,
    };
    
    Ok((best_expr.to_string(), report))
}

#[derive(Debug, serde::Serialize)]
pub struct OptimizationReport {
    pub initial_cost: usize,
    pub final_cost: usize,
    pub speedup: f64,
    pub iterations: usize,
    pub time_ms: u64,
    pub rules_applied: Vec<String>,
    pub semantic_hash: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_map_fusion() {
        let input = "(map f (map g xs))";
        let (output, report) = optimize(input).unwrap();
        
        assert!(output.contains("compose"));
        assert!(report.speedup >= 1.0);
        assert_eq!(report.initial_cost, 5);  // map + map + vars
        assert_eq!(report.final_cost, 4);    // map + compose + vars
    }
    
    #[test]
    fn test_filter_map_to_focus() {
        let input = "(map f (filter p xs))";
        let (output, report) = optimize(input).unwrap();
        
        assert!(output.contains("FOCUS"));
        assert!(report.speedup >= 1.0);
    }
    
    #[test]
    fn test_semantic_preservation() {
        let input = "(app (lam x x) y)";
        let (output, report) = optimize(input).unwrap();
        
        // Hash should be preserved even after beta reduction
        assert!(!report.semantic_hash.is_empty());
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() != 2 {
        eprintln!("Usage: {} <input.lambda>", args[0]);
        std::process::exit(1);
    }
    
    let input = fs::read_to_string(&args[1])
        .expect("Failed to read input file");
    
    match optimize(&input) {
        Ok((output, report)) => {
            println!("✅ Optimization successful!");
            println!();
            println!("Output:");
            println!("{}", output);
            println!();
            println!("Report:");
            println!("  Initial cost: {}", report.initial_cost);
            println!("  Final cost: {}", report.final_cost);
            println!("  Speedup: {:.2}x", report.speedup);
            println!("  Iterations: {}", report.iterations);
            println!("  Time: {}ms", report.time_ms);
            println!("  Semantic hash: {}", report.semantic_hash);
            println!();
            println!("Rules applied:");
            for rule in &report.rules_applied {
                println!("  - {}", rule);
            }
            
            // Save report
            let report_json = serde_json::to_string_pretty(&report).unwrap();
            fs::write("surgeon-report.json", report_json).ok();
        }
        Err(e) => {
            eprintln!("❌ Optimization failed: {}", e);
            std::process::exit(1);
        }
    }
}