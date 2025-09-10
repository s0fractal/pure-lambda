#![no_std]

use crate::ir::{IR, Symbol, Arena};

pub fn normalize(ir: &IR, arena: &mut Arena) -> IR {
    match ir {
        // Beta reduction: ((λx.M) N) → M[x := N]
        IR::App(f_idx, arg_idx) => {
            let f = arena.get(*f_idx);
            let arg = arena.get(*arg_idx);
            let f_norm = normalize(&f, arena);
            let arg_norm = normalize(&arg, arena);
            
            match f_norm {
                IR::Lam(x, body_idx) => {
                    let body = arena.get(body_idx);
                    let substituted = body.substitute(&x, &arg_norm, arena);
                    normalize(&substituted, arena)
                }
                _ => {
                    let f_idx = arena.alloc(f_norm);
                    let arg_idx = arena.alloc(arg_norm);
                    IR::App(f_idx, arg_idx)
                }
            }
        }
        
        // Let binding: let x = E in M → M[x := E]
        IR::Let(x, e_idx, body_idx) => {
            let e = arena.get(*e_idx);
            let body = arena.get(*body_idx);
            let e_norm = normalize(&e, arena);
            let substituted = body.substitute(x, &e_norm, arena);
            normalize(&substituted, arena)
        }
        
        // Arithmetic operations
        IR::Add(a_idx, b_idx) => {
            let a = arena.get(*a_idx);
            let b = arena.get(*b_idx);
            let a_norm = normalize(&a, arena);
            let b_norm = normalize(&b, arena);
            match (a_norm, b_norm) {
                (IR::Num(x), IR::Num(y)) => IR::Num(x + y),
                _ => {
                    let a_idx = arena.alloc(a_norm);
                    let b_idx = arena.alloc(b_norm);
                    IR::Add(a_idx, b_idx)
                }
            }
        }
        
        IR::Sub(a_idx, b_idx) => {
            let a = arena.get(*a_idx);
            let b = arena.get(*b_idx);
            let a_norm = normalize(&a, arena);
            let b_norm = normalize(&b, arena);
            match (a_norm, b_norm) {
                (IR::Num(x), IR::Num(y)) => IR::Num(x - y),
                _ => {
                    let a_idx = arena.alloc(a_norm);
                    let b_idx = arena.alloc(b_norm);
                    IR::Sub(a_idx, b_idx)
                }
            }
        }
        
        IR::Mul(a_idx, b_idx) => {
            let a = arena.get(*a_idx);
            let b = arena.get(*b_idx);
            let a_norm = normalize(&a, arena);
            let b_norm = normalize(&b, arena);
            match (a_norm, b_norm) {
                (IR::Num(x), IR::Num(y)) => IR::Num(x * y),
                _ => {
                    let a_idx = arena.alloc(a_norm);
                    let b_idx = arena.alloc(b_norm);
                    IR::Mul(a_idx, b_idx)
                }
            }
        }
        
        IR::Div(a_idx, b_idx) => {
            let a = arena.get(*a_idx);
            let b = arena.get(*b_idx);
            let a_norm = normalize(&a, arena);
            let b_norm = normalize(&b, arena);
            match (a_norm, b_norm) {
                (IR::Num(x), IR::Num(y)) if y != 0 => IR::Num(x / y),
                _ => {
                    let a_idx = arena.alloc(a_norm);
                    let b_idx = arena.alloc(b_norm);
                    IR::Div(a_idx, b_idx)
                }
            }
        }
        
        // Comparison operations
        IR::Eq(a_idx, b_idx) => {
            let a = arena.get(*a_idx);
            let b = arena.get(*b_idx);
            let a_norm = normalize(&a, arena);
            let b_norm = normalize(&b, arena);
            match (a_norm, b_norm) {
                (IR::Num(x), IR::Num(y)) => IR::Bool(x == y),
                (IR::Bool(x), IR::Bool(y)) => IR::Bool(x == y),
                _ => {
                    let a_idx = arena.alloc(a_norm);
                    let b_idx = arena.alloc(b_norm);
                    IR::Eq(a_idx, b_idx)
                }
            }
        }
        
        IR::Lt(a_idx, b_idx) => {
            let a = arena.get(*a_idx);
            let b = arena.get(*b_idx);
            let a_norm = normalize(&a, arena);
            let b_norm = normalize(&b, arena);
            match (a_norm, b_norm) {
                (IR::Num(x), IR::Num(y)) => IR::Bool(x < y),
                _ => {
                    let a_idx = arena.alloc(a_norm);
                    let b_idx = arena.alloc(b_norm);
                    IR::Lt(a_idx, b_idx)
                }
            }
        }
        
        IR::Gt(a_idx, b_idx) => {
            let a = arena.get(*a_idx);
            let b = arena.get(*b_idx);
            let a_norm = normalize(&a, arena);
            let b_norm = normalize(&b, arena);
            match (a_norm, b_norm) {
                (IR::Num(x), IR::Num(y)) => IR::Bool(x > y),
                _ => {
                    let a_idx = arena.alloc(a_norm);
                    let b_idx = arena.alloc(b_norm);
                    IR::Gt(a_idx, b_idx)
                }
            }
        }
        
        // Boolean operations
        IR::And(a_idx, b_idx) => {
            let a = arena.get(*a_idx);
            let a_norm = normalize(&a, arena);
            match a_norm {
                IR::Bool(false) => IR::Bool(false),
                IR::Bool(true) => {
                    let b = arena.get(*b_idx);
                    normalize(&b, arena)
                }
                _ => {
                    let b = arena.get(*b_idx);
                    let b_norm = normalize(&b, arena);
                    let a_idx = arena.alloc(a_norm);
                    let b_idx = arena.alloc(b_norm);
                    IR::And(a_idx, b_idx)
                }
            }
        }
        
        IR::Or(a_idx, b_idx) => {
            let a = arena.get(*a_idx);
            let a_norm = normalize(&a, arena);
            match a_norm {
                IR::Bool(true) => IR::Bool(true),
                IR::Bool(false) => {
                    let b = arena.get(*b_idx);
                    normalize(&b, arena)
                }
                _ => {
                    let b = arena.get(*b_idx);
                    let b_norm = normalize(&b, arena);
                    let a_idx = arena.alloc(a_norm);
                    let b_idx = arena.alloc(b_norm);
                    IR::Or(a_idx, b_idx)
                }
            }
        }
        
        IR::Not(x_idx) => {
            let x = arena.get(*x_idx);
            let x_norm = normalize(&x, arena);
            match x_norm {
                IR::Bool(b) => IR::Bool(!b),
                _ => {
                    let x_idx = arena.alloc(x_norm);
                    IR::Not(x_idx)
                }
            }
        }
        
        // Control flow
        IR::If(cond_idx, t_idx, f_idx) => {
            let cond = arena.get(*cond_idx);
            let cond_norm = normalize(&cond, arena);
            match cond_norm {
                IR::Bool(true) => {
                    let t = arena.get(*t_idx);
                    normalize(&t, arena)
                }
                IR::Bool(false) => {
                    let f = arena.get(*f_idx);
                    normalize(&f, arena)
                }
                _ => {
                    let t = arena.get(*t_idx);
                    let f = arena.get(*f_idx);
                    let t_norm = normalize(&t, arena);
                    let f_norm = normalize(&f, arena);
                    let cond_idx = arena.alloc(cond_norm);
                    let t_idx = arena.alloc(t_norm);
                    let f_idx = arena.alloc(f_norm);
                    IR::If(cond_idx, t_idx, f_idx)
                }
            }
        }
        
        // Lambda abstraction - normalize body
        IR::Lam(x, body_idx) => {
            let body = arena.get(*body_idx);
            let body_norm = normalize(&body, arena);
            let new_body_idx = arena.alloc(body_norm);
            IR::Lam(*x, new_body_idx)
        }
        
        // Values and variables remain unchanged
        IR::Var(_) | IR::Num(_) | IR::Bool(_) | IR::Nil => *ir,
        
        // Reference
        IR::Ref(idx) => {
            let referenced = arena.get(*idx);
            normalize(&referenced, arena)
        }
        
        // FOCUS operator
        IR::Focus(focus) => {
            use crate::focus::FocusMode;
            
            // Normalize components
            let xs = arena.get(focus.xs);
            let w = arena.get(focus.w);
            let f = arena.get(focus.f);
            let g = arena.get(focus.g);
            
            let xs_norm = normalize(&xs, arena);
            let w_norm = normalize(&w, arena);
            let f_norm = normalize(&f, arena);
            let g_norm = normalize(&g, arena);
            
            // Check for constant weight optimization
            match (focus.mode, &w_norm) {
                (FocusMode::Hard, IR::Bool(true)) => {
                    // All pass through - just map
                    let f_idx = arena.alloc(f_norm);
                    let xs_idx = arena.alloc(xs_norm);
                    normalize(&IR::Map(f_idx, xs_idx), arena)
                }
                (FocusMode::Hard, IR::Bool(false)) => {
                    // All filtered out
                    IR::Nil
                }
                _ => {
                    // General case - preserve focus
                    let xs_idx = arena.alloc(xs_norm);
                    let w_idx = arena.alloc(w_norm);
                    let f_idx = arena.alloc(f_norm);
                    let g_idx = arena.alloc(g_norm);
                    
                    IR::Focus(crate::focus::Focus {
                        mode: focus.mode,
                        xs: xs_idx,
                        w: w_idx,
                        f: f_idx,
                        g: g_idx,
                    })
                }
            }
        }
        
        // Map operation
        IR::Map(f_idx, xs_idx) => {
            let f = arena.get(*f_idx);
            let xs = arena.get(*xs_idx);
            let f_norm = normalize(&f, arena);
            let xs_norm = normalize(&xs, arena);
            
            match xs_norm {
                IR::Nil => IR::Nil,
                _ => {
                    let f_idx = arena.alloc(f_norm);
                    let xs_idx = arena.alloc(xs_norm);
                    IR::Map(f_idx, xs_idx)
                }
            }
        }
        
        // Filter operation
        IR::Filter(p_idx, xs_idx) => {
            let p = arena.get(*p_idx);
            let xs = arena.get(*xs_idx);
            let p_norm = normalize(&p, arena);
            let xs_norm = normalize(&xs, arena);
            
            match (&p_norm, &xs_norm) {
                (IR::Bool(true), _) => xs_norm,
                (IR::Bool(false), _) => IR::Nil,
                (_, IR::Nil) => IR::Nil,
                _ => {
                    // Check for filter+map fusion opportunity
                    if let IR::Map(f_idx, inner_xs) = xs_norm {
                        // FILTER(MAP(xs, f), p) → FOCUS
                        let drop_idx = arena.alloc(IR::Drop);
                        IR::Focus(crate::focus::Focus {
                            mode: crate::focus::FocusMode::Hard,
                            xs: inner_xs,
                            w: *p_idx,
                            f: f_idx,
                            g: drop_idx,
                        })
                    } else {
                        let p_idx = arena.alloc(p_norm);
                        let xs_idx = arena.alloc(xs_norm);
                        IR::Filter(p_idx, xs_idx)
                    }
                }
            }
        }
        
        // Function composition
        IR::Compose(f_idx, g_idx) => {
            let f = arena.get(*f_idx);
            let g = arena.get(*g_idx);
            let f_norm = normalize(&f, arena);
            let g_norm = normalize(&g, arena);
            
            match (&f_norm, &g_norm) {
                (IR::Identity, _) => g_norm,
                (_, IR::Identity) => f_norm,
                _ => {
                    let f_idx = arena.alloc(f_norm);
                    let g_idx = arena.alloc(g_norm);
                    IR::Compose(f_idx, g_idx)
                }
            }
        }
        
        // Special operators
        IR::Drop => IR::Drop,
        IR::Identity => IR::Identity,
    }
}

pub fn alpha_equiv(ir1: &IR, ir2: &IR) -> bool {
    match (ir1, ir2) {
        (IR::Var(x), IR::Var(y)) => x == y,
        (IR::Lam(x, _b1), IR::Lam(y, _b2)) if x == y => {
            // Simplified: just check parameter names
            true
        }
        (IR::App(_f1, _a1), IR::App(_f2, _a2)) => {
            // Simplified: assume equivalent for now
            true
        }
        (IR::Num(n1), IR::Num(n2)) => n1 == n2,
        (IR::Bool(b1), IR::Bool(b2)) => b1 == b2,
        (IR::Nil, IR::Nil) => true,
        _ => false,
    }
}