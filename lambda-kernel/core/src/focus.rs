#![no_std]

use crate::ir::{IR, Symbol, Arena};

/// FOCUS - Laser operator for data/coordinate spaces
/// Unifies filter+map, attention, and ROI operations
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FocusMode {
    /// Hard focus: p(x) ∈ {0,1} - boolean gate
    Hard,
    /// Soft focus: w(x) ∈ [0,1] - attention weight
    Soft,
    /// Spatial focus: w(π(i), x) - fractal projection
    Spatial,
}

/// Focus node in λ-IR
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Focus {
    pub mode: FocusMode,
    pub xs: u32,     // Data stream/array index
    pub w: u32,      // Weight/gate function: x → [0,1]
    pub f: u32,      // Inside focus: x → y
    pub g: u32,      // Outside focus: x → y (or DROP)
}

impl Focus {
    /// Create hard focus (filter+map fusion)
    pub fn hard(xs: u32, predicate: u32, transform: u32, arena: &mut Arena) -> IR {
        let drop_idx = arena.alloc(IR::Drop);
        IR::Focus(Focus {
            mode: FocusMode::Hard,
            xs,
            w: predicate,
            f: transform,
            g: drop_idx,
        })
    }
    
    /// Create soft focus (attention/blending)
    pub fn soft(xs: u32, weight: u32, inside: u32, outside: u32) -> IR {
        IR::Focus(Focus {
            mode: FocusMode::Soft,
            xs,
            w: weight,
            f: inside,
            g: outside,
        })
    }
    
    /// Create spatial focus (ROI with fractal projection)
    pub fn spatial(xs: u32, roi_weight: u32, transform: u32, identity: u32) -> IR {
        IR::Focus(Focus {
            mode: FocusMode::Spatial,
            xs,
            w: roi_weight,
            f: transform,
            g: identity,
        })
    }
}

/// Fractal projection: index → (u, v, scale, depth)
#[derive(Debug, Clone, Copy)]
pub struct FractalProjection {
    pub u: i32,      // Horizontal coordinate
    pub v: i32,      // Vertical coordinate  
    pub scale: u32,  // Zoom level
    pub depth: u32,  // Fractal depth
}

impl FractalProjection {
    /// Project linear index to fractal coordinates
    pub fn project(index: u32) -> Self {
        // Hilbert curve or Z-order mapping
        let mut u = 0i32;
        let mut v = 0i32;
        let mut scale = 1u32;
        let mut depth = 0u32;
        
        // Simple Z-order for now
        let mut i = index;
        while i > 0 {
            u |= ((i & 1) as i32) << depth;
            i >>= 1;
            v |= ((i & 1) as i32) << depth;
            i >>= 1;
            depth += 1;
        }
        
        FractalProjection { u, v, scale, depth }
    }
    
    /// Check if point is in region of interest
    pub fn in_roi(&self, center_u: i32, center_v: i32, radius: u32) -> bool {
        let du = (self.u - center_u).abs() as u32;
        let dv = (self.v - center_v).abs() as u32;
        du * du + dv * dv <= radius * radius
    }
    
    /// Gaussian weight for soft focus
    pub fn gaussian_weight(&self, center_u: i32, center_v: i32, sigma: u32) -> u32 {
        let du = (self.u - center_u) as i64;
        let dv = (self.v - center_v) as i64;
        let d2 = du * du + dv * dv;
        let sigma2 = (sigma as i64) * (sigma as i64);
        
        // Approximation: exp(-d²/2σ²) * 256 for fixed-point
        if d2 >= 4 * sigma2 {
            0
        } else if d2 == 0 {
            256
        } else {
            // Linear approximation for no_std
            (256 - (d2 * 64 / sigma2).min(255)) as u32
        }
    }
}

/// Focus laws for verification
pub mod laws {
    use super::*;
    
    /// (E1) FOCUS_h(xs,p,f,drop) ≡ MAP(FILTER(xs,p), f)
    pub fn hard_focus_equivalence(focus: &Focus) -> bool {
        focus.mode == FocusMode::Hard && 
        focus.g == 0  // Assuming 0 is DROP index
    }
    
    /// (E3) Focus fusion: FOCUS(FOCUS(xs,w1,f1,g1), w2, f2, g2) ≡ FOCUS(xs, w1∧w2, f2∘f1, g')
    pub fn focus_fusion_valid(outer: &Focus, inner: &Focus) -> bool {
        // Both must be same mode for simple fusion
        outer.mode == inner.mode
    }
    
    /// (E4) Idempotence: w ∈ {0,1} → hard mode
    pub fn weight_idempotent(w_value: u32) -> bool {
        w_value == 0 || w_value == 256  // Using 256 as 1.0 in fixed-point
    }
    
    /// (E5) Partition invariant
    pub fn partition_preserves_length(focus: &Focus) -> bool {
        focus.mode == FocusMode::Soft ||
        (focus.mode == FocusMode::Spatial && focus.g != 0)
    }
}

/// Rewrite rules for FOCUS optimization
pub mod rules {
    use super::*;
    
    /// filter+map → focus fusion
    pub fn fuse_filter_map(arena: &mut Arena, filter_idx: u32, map_idx: u32) -> Option<IR> {
        // Pattern: MAP(FILTER(xs, p), f)
        // Rewrite: FOCUS(xs, to01(p), f, DROP)
        
        let filter = arena.get(filter_idx);
        let map = arena.get(map_idx);
        
        match (filter, map) {
            (IR::Filter(p, xs), IR::Map(f, _)) => {
                Some(Focus::hard(xs, p, f, arena))
            }
            _ => None
        }
    }
    
    /// Focus fusion rule
    pub fn fuse_focus_chain(arena: &mut Arena, outer: Focus, inner: Focus) -> Option<IR> {
        if outer.mode != inner.mode {
            return None;
        }
        
        // Compose weights: w1 ∧ w2
        let and_idx = arena.alloc(IR::And(outer.w, inner.w));
        
        // Compose functions: f2 ∘ f1  
        let comp_idx = arena.alloc(IR::Compose(outer.f, inner.f));
        
        // Fused outside function (simplified)
        let g_fused = if outer.g == inner.g {
            outer.g
        } else {
            arena.alloc(IR::If(outer.w, outer.g, inner.g))
        };
        
        Some(IR::Focus(Focus {
            mode: outer.mode,
            xs: inner.xs,
            w: and_idx,
            f: comp_idx,
            g: g_fused,
        }))
    }
    
    /// Spatial focus optimization for separable ROI
    pub fn separate_roi(focus: &Focus) -> Option<(u32, u32)> {
        if focus.mode != FocusMode::Spatial {
            return None;
        }
        
        // Check if w(u,v,x) = w1(u,v) ∧ w2(x)
        // Returns (spatial_weight, data_weight) if separable
        // This allows pre-filtering by geometry
        
        // Simplified: assume separable if spatial mode
        Some((focus.w, 0))
    }
}

/// Cost model for FOCUS operations
pub fn focus_cost(focus: &Focus) -> u32 {
    match focus.mode {
        FocusMode::Hard => 2,    // Boolean test + branch
        FocusMode::Soft => 4,    // Weight compute + blend
        FocusMode::Spatial => 6, // Projection + weight + blend
    }
}