#![no_std]

use crate::ir::{IR, Arena};
use crate::normalize::normalize;

const FNV_PRIME: u64 = 1099511628211;
const FNV_OFFSET: u64 = 14695981039346656037;

pub fn compute_soul(ir: &IR, arena: &mut Arena) -> u64 {
    let normalized = normalize(ir, arena);
    hash_ir(&normalized)
}

fn hash_ir(ir: &IR) -> u64 {
    match ir {
        IR::Var(s) => hash_combine(1, s.0 as u64),
        IR::Lam(s, body_idx) => {
            let h1 = hash_combine(2, s.0 as u64);
            hash_combine(h1, *body_idx as u64)
        }
        IR::App(f_idx, a_idx) => {
            let h1 = hash_combine(3, *f_idx as u64);
            hash_combine(h1, *a_idx as u64)
        }
        IR::Num(n) => hash_combine(4, *n as u64),
        IR::Bool(b) => hash_combine(5, if *b { 1 } else { 0 }),
        IR::Nil => 6,
        IR::If(c_idx, t_idx, f_idx) => {
            let h1 = hash_combine(13, *c_idx as u64);
            let h2 = hash_combine(h1, *t_idx as u64);
            hash_combine(h2, *f_idx as u64)
        }
        IR::Let(s, e_idx, b_idx) => {
            let h1 = hash_combine(14, s.0 as u64);
            let h2 = hash_combine(h1, *e_idx as u64);
            hash_combine(h2, *b_idx as u64)
        }
        IR::Add(a_idx, b_idx) => {
            let h1 = hash_combine(16, *a_idx as u64);
            hash_combine(h1, *b_idx as u64)
        }
        IR::Sub(a_idx, b_idx) => {
            let h1 = hash_combine(17, *a_idx as u64);
            hash_combine(h1, *b_idx as u64)
        }
        IR::Mul(a_idx, b_idx) => {
            let h1 = hash_combine(18, *a_idx as u64);
            hash_combine(h1, *b_idx as u64)
        }
        IR::Div(a_idx, b_idx) => {
            let h1 = hash_combine(19, *a_idx as u64);
            hash_combine(h1, *b_idx as u64)
        }
        IR::Eq(a_idx, b_idx) => {
            let h1 = hash_combine(20, *a_idx as u64);
            hash_combine(h1, *b_idx as u64)
        }
        IR::Lt(a_idx, b_idx) => {
            let h1 = hash_combine(21, *a_idx as u64);
            hash_combine(h1, *b_idx as u64)
        }
        IR::Gt(a_idx, b_idx) => {
            let h1 = hash_combine(22, *a_idx as u64);
            hash_combine(h1, *b_idx as u64)
        }
        IR::And(a_idx, b_idx) => {
            let h1 = hash_combine(23, *a_idx as u64);
            hash_combine(h1, *b_idx as u64)
        }
        IR::Or(a_idx, b_idx) => {
            let h1 = hash_combine(24, *a_idx as u64);
            hash_combine(h1, *b_idx as u64)
        }
        IR::Not(x_idx) => hash_combine(25, *x_idx as u64),
        IR::Ref(idx) => hash_combine(26, *idx as u64),
        IR::Focus(focus) => {
            let h1 = hash_combine(27, focus.mode as u64);
            let h2 = hash_combine(h1, focus.xs as u64);
            let h3 = hash_combine(h2, focus.w as u64);
            let h4 = hash_combine(h3, focus.f as u64);
            hash_combine(h4, focus.g as u64)
        }
        IR::Map(f_idx, xs_idx) => {
            let h1 = hash_combine(28, *f_idx as u64);
            hash_combine(h1, *xs_idx as u64)
        }
        IR::Filter(p_idx, xs_idx) => {
            let h1 = hash_combine(29, *p_idx as u64);
            hash_combine(h1, *xs_idx as u64)
        }
        IR::Compose(f_idx, g_idx) => {
            let h1 = hash_combine(30, *f_idx as u64);
            hash_combine(h1, *g_idx as u64)
        }
        IR::Drop => 31,
        IR::Identity => 32,
        IR::Observe(observe) => {
            let h1 = hash_combine(33, observe.file as u64);
            let h2 = hash_combine(h1, observe.theta as u64);
            let h3 = hash_combine(h2, observe.phase as u64);
            hash_combine(h3, observe.mapping as u64)
        }
    }
}

fn hash_combine(h1: u64, h2: u64) -> u64 {
    let mut hash = h1;
    hash ^= h2.wrapping_add(0x9e3779b9).wrapping_add(hash << 6).wrapping_add(hash >> 2);
    hash
}

fn fnv_hash(data: &[u8]) -> u64 {
    let mut hash = FNV_OFFSET;
    for byte in data {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(FNV_PRIME);
    }
    hash
}