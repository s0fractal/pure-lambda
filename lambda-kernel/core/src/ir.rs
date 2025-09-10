#![no_std]

use core::mem;

// For no_std, we use fixed-size arrays and stack allocation
// When alloc is available, we use heap allocation

#[cfg(not(feature = "alloc"))]
const MAX_ITEMS: usize = 32;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Symbol(pub u32);

// Simplified IR for no_std - uses indices into a global arena
// instead of Box pointers
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IR {
    Var(Symbol),
    Lam(Symbol, u32),  // u32 is index to body
    App(u32, u32),     // indices to function and argument
    
    // Primitives
    Num(i64),
    Bool(bool),
    Nil,
    
    // Operators with indices
    Add(u32, u32),
    Sub(u32, u32),
    Mul(u32, u32),
    Div(u32, u32),
    Eq(u32, u32),
    Lt(u32, u32),
    Gt(u32, u32),
    And(u32, u32),
    Or(u32, u32),
    Not(u32),
    
    // Control with indices
    If(u32, u32, u32),
    Let(Symbol, u32, u32),
    
    // Reference to arena slot
    Ref(u32),
    
    // FOCUS operator - laser for data/coordinate spaces
    Focus(crate::focus::Focus),
    Map(u32, u32),      // function, data
    Filter(u32, u32),   // predicate, data  
    Compose(u32, u32),  // f ∘ g
    Drop,               // Remove element
    Identity,           // Pass through
}

// Simple arena for IR nodes in no_std environment
pub struct Arena {
    nodes: [IR; 256],
    next: usize,
}

impl Arena {
    pub const fn new() -> Self {
        Arena {
            nodes: [IR::Nil; 256],
            next: 0,
        }
    }
    
    pub fn alloc(&mut self, ir: IR) -> u32 {
        if self.next >= 256 {
            panic!("Arena overflow");
        }
        let idx = self.next;
        self.nodes[idx] = ir;
        self.next += 1;
        idx as u32
    }
    
    pub fn get(&self, idx: u32) -> IR {
        self.nodes[idx as usize]
    }
}

impl IR {
    pub fn is_value(&self) -> bool {
        match self {
            IR::Lam(_, _) | IR::Num(_) | IR::Bool(_) | IR::Nil => true,
            _ => false,
        }
    }
    
    pub fn free_vars(&self, arena: &Arena) -> [Symbol; 32] {
        let mut result = [Symbol(0); 32];
        let mut count = 0;
        
        match self {
            IR::Var(x) => {
                result[0] = *x;
                result
            },
            IR::Lam(x, _body_idx) => {
                // In no_std, we skip free var calculation for now
                result
            },
            IR::App(_f_idx, _a_idx) => {
                // In no_std, we skip free var calculation for now
                result
            },
            _ => result,
        }
    }
    
    pub fn substitute(&self, var: &Symbol, replacement: &IR, arena: &mut Arena) -> IR {
        match self {
            IR::Var(x) if x == var => *replacement,
            IR::Var(_) => *self,
            IR::Lam(x, body_idx) if x == var => *self,
            IR::Lam(x, body_idx) => {
                let body = arena.get(*body_idx);
                let new_body = body.substitute(var, replacement, arena);
                let new_idx = arena.alloc(new_body);
                IR::Lam(*x, new_idx)
            }
            _ => *self,
        }
    }
}