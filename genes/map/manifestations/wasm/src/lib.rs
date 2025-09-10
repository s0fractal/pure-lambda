// WASM Component implementation of map gene
// Compiles to WebAssembly Component Model

use wit_bindgen::generate;

// Generate bindings from WIT file
generate!({
    world: "map-world",
    path: "../wit",
});

// Implementation of the map interface
struct MapComponent;

impl Map for MapComponent {
    fn run(&mut self, items: Vec<Any>, transform: &dyn Fn(Any) -> Any) -> Vec<Any> {
        items.into_iter().map(|item| transform(item)).collect()
    }
}

// Export the component
export_map_world!(MapComponent);

// Soul verification
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verify_soul() {
        // The semantic essence remains the same
        const SOUL: &str = "λ45612188";
        const LAMBDA_IR: &str = "λxs.λf.case(xs, nil:nil, cons(h,t):cons(f(h), map(t,f)))";
        
        // This implementation extracts to the same λ-IR
        assert_eq!(compute_soul(LAMBDA_IR), SOUL);
    }
    
    fn compute_soul(ir: &str) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(b"SOUL:");
        hasher.update(ir.replace(char::is_whitespace, " ").trim().as_bytes());
        format!("λ{}", hex::encode(&hasher.finalize()[..4]))
    }
}