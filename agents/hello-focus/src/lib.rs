//! Hello FOCUS - Minimal agent demonstrating FOCUS gene
//! Reads view, applies FOCUS, writes result

wit_bindgen::generate!({
    world: "agent",
    path: "../../abi",
});

use exports::pl::abi::agent::Guest;

struct HelloFocus {
    tick_count: u32,
}

impl Guest for HelloFocus {
    fn init(_config: Vec<u8>) {
        host::log(2, "HelloFocus agent initialized");
    }

    fn tick() -> u32 {
        // Read input view
        let input = host::read("views/numbers.vec");
        if input.is_empty() {
            host::log(3, "No input data found");
            return 1000; // Retry in 1 second
        }

        // Parse numbers (simplified - assume newline-separated integers)
        let numbers: Vec<i32> = String::from_utf8_lossy(&input)
            .lines()
            .filter_map(|line| line.parse().ok())
            .collect();

        host::log(2, &format!("Processing {} numbers", numbers.len()));

        // Apply FOCUS: filter even, map to double
        // FOCUS(numbers, is_even, double, drop_odd)
        let focused: Vec<i32> = numbers
            .into_iter()
            .filter(|&n| n % 2 == 0)  // Predicate: is_even
            .map(|n| n * 2)            // Transform: double
            .collect();

        // Serialize result
        let output = focused
            .iter()
            .map(|n| n.to_string())
            .collect::<Vec<_>>()
            .join("\n");

        // Write result as intent
        let cid = host::write(
            "intents/focused-numbers",
            output.as_bytes().to_vec()
        );

        host::log(2, &format!("Wrote result with CID: {}", cid));

        // Check gas
        let gas = host::gas_left();
        if gas < 1000 {
            host::log(4, "Low gas warning");
        }

        // Next tick in 5 seconds
        5000
    }

    fn handle_event(event: Vec<u8>) -> Vec<u8> {
        host::log(1, &format!("Received event: {} bytes", event.len()));
        
        // Echo event back (for testing)
        event
    }
}

export!(HelloFocus);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_focus_logic() {
        // Test FOCUS logic independently
        let numbers = vec![1, 2, 3, 4, 5, 6];
        
        let focused: Vec<i32> = numbers
            .into_iter()
            .filter(|&n| n % 2 == 0)
            .map(|n| n * 2)
            .collect();
        
        assert_eq!(focused, vec![4, 8, 12]);
    }
}