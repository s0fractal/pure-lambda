#![no_std]
#![forbid(unsafe_code)]

#[cfg(feature = "alloc")]
extern crate alloc;

pub mod ir;
pub mod normalize;
pub mod soul;
pub mod focus;
pub mod observe;

#[cfg(feature = "alloc")]
pub mod intent;
#[cfg(feature = "alloc")]
pub mod love;
#[cfg(feature = "alloc")]
pub mod distortion;

#[cfg(feature = "alloc")]
pub mod rewriter;

pub use ir::{IR, Symbol, Arena};
pub use normalize::normalize;
pub use soul::compute_soul;
pub use focus::{Focus, FocusMode, FractalProjection};

#[cfg(feature = "alloc")]
pub use rewriter::{EGraph, Rule, Pattern};