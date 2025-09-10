// FOCUS Demo - The Laser Operator
// Shows hard, soft, and spatial focus modes

use lambda_core::{Arena, IR, Symbol, Focus, FocusMode, FractalProjection};

fn main() {
    println!("=== FOCUS: The Laser Operator ===\n");
    
    let mut arena = Arena::new();
    
    // Example 1: Hard Focus (Filter+Map fusion)
    println!("1. HARD FOCUS - Boolean Gate");
    println!("   Traditional: map(filter(xs, isPrime), square)");
    println!("   With FOCUS:  FOCUS(xs, isPrime, square, DROP)\n");
    
    // Create example data [1,2,3,4,5]
    let data = arena.alloc(IR::Ref(100)); // Placeholder for data
    
    // Predicate: isPrime
    let is_prime = arena.alloc(IR::Lam(
        Symbol(0),
        arena.alloc(IR::Bool(true)) // Simplified
    ));
    
    // Transform: square
    let square = arena.alloc(IR::Lam(
        Symbol(1),
        arena.alloc(IR::Mul(
            arena.alloc(IR::Var(Symbol(1))),
            arena.alloc(IR::Var(Symbol(1)))
        ))
    ));
    
    // Hard focus
    let hard_focus = Focus::hard(data, is_prime, square, &mut arena);
    println!("   Result: {:?}\n", hard_focus);
    
    // Example 2: Soft Focus (Attention/Blending)
    println!("2. SOFT FOCUS - Attention Weight");
    println!("   weight(x) ∈ [0,1] - gradual blending");
    println!("   FOCUS(xs, confidence, enhance, identity)\n");
    
    // Weight function: confidence score
    let confidence = arena.alloc(IR::Lam(
        Symbol(2),
        arena.alloc(IR::Num(128)) // 0.5 in fixed-point
    ));
    
    // Inside: enhance
    let enhance = arena.alloc(IR::Lam(
        Symbol(3),
        arena.alloc(IR::Mul(
            arena.alloc(IR::Var(Symbol(3))),
            arena.alloc(IR::Num(2))
        ))
    ));
    
    // Outside: identity
    let identity = arena.alloc(IR::Identity);
    
    let soft_focus = Focus::soft(data, confidence, enhance, identity);
    println!("   Result: {:?}\n", soft_focus);
    
    // Example 3: Spatial Focus (ROI with fractal projection)
    println!("3. SPATIAL FOCUS - Region of Interest");
    println!("   Fractal projection π(i) → (u,v,scale,depth)");
    println!("   Apply transform only in circular ROI\n");
    
    // Project some indices
    for i in [0, 1, 7, 15, 31, 63] {
        let proj = FractalProjection::project(i);
        println!("   π({:2}) → (u:{:3}, v:{:3}, depth:{})", 
                 i, proj.u, proj.v, proj.depth);
        
        // Check if in ROI centered at (2,2) with radius 3
        let in_roi = proj.in_roi(2, 2, 3);
        let weight = proj.gaussian_weight(2, 2, 2);
        println!("        in_roi: {}, gaussian_weight: {}/256", in_roi, weight);
    }
    
    println!("\n=== FOCUS Laws ===\n");
    
    println!("(E1) FOCUS_h(xs,p,f,DROP) ≡ MAP(FILTER(xs,p), f)");
    println!("     Hard focus with DROP is exactly filter+map\n");
    
    println!("(E3) Focus Fusion:");
    println!("     FOCUS(FOCUS(xs,w1,f1,g1), w2,f2,g2)");
    println!("     ≡ FOCUS(xs, w1∧w2, f2∘f1, g')\n");
    
    println!("(E4) Weight Idempotence:");
    println!("     w ∈ {{0,1}} → automatically hard mode\n");
    
    println!("(E5) Partition Invariant:");
    println!("     Soft/spatial preserve length (no DROP)\n");
    
    println!("=== Performance ===\n");
    
    println!("Traditional filter+map:");
    println!("  - 2 passes over data");
    println!("  - Intermediate allocation");
    println!("  - Cost: O(2n)\n");
    
    println!("With FOCUS:");
    println!("  - 1 pass over data");
    println!("  - No intermediate allocation");
    println!("  - Cost: O(n)");
    println!("  - Branch prediction friendly\n");
    
    println!("=== The Laser Metaphor ===\n");
    
    println!("• Hard mode   = Sharp laser, binary cut");
    println!("• Soft mode   = Gaussian beam, gradual fade");
    println!("• Spatial     = Aimed laser, ROI targeting");
    println!("• w(π(i),x)   = Aperture control formula");
    println!("• f inside    = What the laser does");
    println!("• g outside   = Untouched by the beam\n");
    
    println!("FOCUS is not optimization - it's a **primitive**");
    println!("for attention, selection, and transformation!");
}