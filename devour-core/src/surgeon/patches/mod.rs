/// 100× Optimization Patches
/// These aren't micro-optimizations - they're leverage points
pub mod fold_sink;
pub mod focus_fusion;
pub mod early_stop;
pub mod benchmark_100x;

pub use fold_sink::*;
pub use focus_fusion::*;
pub use early_stop::*;
pub use benchmark_100x::*;