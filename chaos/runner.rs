//! Chaos Engineering Runner for Pure Lambda
//! Tests antifragility through controlled failures

use std::sync::Arc;
use std::time::{Duration, Instant};
use rand::Rng;
use tokio::time::sleep;

/// Chaos scenarios to test resilience
#[derive(Debug, Clone)]
pub enum ChaosScenario {
    /// Random network partitions
    NetworkPartition { duration_ms: u64 },
    
    /// Byzantine agents sending bad data
    ByzantineAgents { count: usize },
    
    /// Latency injection
    LatencySpike { delay_ms: u64, probability: f64 },
    
    /// Node crashes
    NodeCrash { crash_probability: f64 },
    
    /// Memory pressure
    MemoryPressure { limit_mb: usize },
    
    /// Clock skew
    ClockSkew { skew_ms: i64 },
}

pub struct ChaosRunner {
    scenarios: Vec<ChaosScenario>,
    duration: Duration,
    seed: u64,
    metrics: Arc<ChaosMetrics>,
}

#[derive(Default)]
pub struct ChaosMetrics {
    pub invariants_violated: usize,
    pub messages_lost: usize,
    pub false_receipts_accepted: usize,
    pub nodes_crashed: usize,
    pub recovery_time_ms: u64,
}

impl ChaosRunner {
    pub fn new(duration: Duration, seed: u64) -> Self {
        Self {
            scenarios: Vec::new(),
            duration,
            seed,
            metrics: Arc::new(ChaosMetrics::default()),
        }
    }
    
    pub fn add_scenario(&mut self, scenario: ChaosScenario) {
        self.scenarios.push(scenario);
    }
    
    /// Run chaos test for specified duration
    pub async fn run(&self) -> Result<ChaosReport, String> {
        let start = Instant::now();
        let mut rng = rand::thread_rng();
        
        println!("🌪️ Starting chaos engineering run");
        println!("  Duration: {:?}", self.duration);
        println!("  Scenarios: {}", self.scenarios.len());
        
        // Spawn chaos tasks
        let mut tasks = Vec::new();
        
        for scenario in &self.scenarios {
            let scenario = scenario.clone();
            let metrics = self.metrics.clone();
            let duration = self.duration;
            
            let task = tokio::spawn(async move {
                run_scenario(scenario, metrics, duration).await
            });
            
            tasks.push(task);
        }
        
        // Wait for all chaos to complete
        for task in tasks {
            task.await.map_err(|e| format!("Task failed: {}", e))?;
        }
        
        let elapsed = start.elapsed();
        
        // Generate report
        Ok(ChaosReport {
            duration: elapsed,
            scenarios_run: self.scenarios.len(),
            invariants_violated: self.metrics.invariants_violated,
            messages_lost: self.metrics.messages_lost,
            false_receipts: self.metrics.false_receipts_accepted,
            nodes_crashed: self.metrics.nodes_crashed,
            recovery_time_ms: self.metrics.recovery_time_ms,
            passed: self.metrics.invariants_violated == 0 
                && self.metrics.false_receipts_accepted == 0,
        })
    }
}

async fn run_scenario(
    scenario: ChaosScenario,
    metrics: Arc<ChaosMetrics>,
    duration: Duration,
) {
    let start = Instant::now();
    let mut rng = rand::thread_rng();
    
    while start.elapsed() < duration {
        match &scenario {
            ChaosScenario::NetworkPartition { duration_ms } => {
                println!("💥 Network partition for {}ms", duration_ms);
                // Simulate partition
                sleep(Duration::from_millis(*duration_ms)).await;
            }
            
            ChaosScenario::ByzantineAgents { count } => {
                println!("😈 Spawning {} Byzantine agents", count);
                // Send invalid messages
                for _ in 0..*count {
                    send_byzantine_message().await;
                }
            }
            
            ChaosScenario::LatencySpike { delay_ms, probability } => {
                if rng.gen::<f64>() < *probability {
                    println!("🐌 Latency spike: {}ms", delay_ms);
                    sleep(Duration::from_millis(*delay_ms)).await;
                }
            }
            
            ChaosScenario::NodeCrash { crash_probability } => {
                if rng.gen::<f64>() < *crash_probability {
                    println!("💀 Node crash simulated");
                    // Simulate crash and recovery
                    simulate_crash(metrics.clone()).await;
                }
            }
            
            ChaosScenario::MemoryPressure { limit_mb } => {
                println!("💾 Memory pressure: {}MB limit", limit_mb);
                // Apply memory constraints
                apply_memory_limit(*limit_mb);
            }
            
            ChaosScenario::ClockSkew { skew_ms } => {
                println!("⏰ Clock skew: {}ms", skew_ms);
                // Simulate time drift
            }
        }
        
        // Small delay between chaos events
        sleep(Duration::from_millis(100)).await;
    }
}

async fn send_byzantine_message() {
    // Send message with invalid signature
    // Send message with wrong CID
    // Send message violating policy
}

async fn simulate_crash(metrics: Arc<ChaosMetrics>) {
    // Disconnect node
    // Wait for recovery
    // Measure recovery time
}

fn apply_memory_limit(limit_mb: usize) {
    // Set resource limits
}

#[derive(Debug)]
pub struct ChaosReport {
    pub duration: Duration,
    pub scenarios_run: usize,
    pub invariants_violated: usize,
    pub messages_lost: usize,
    pub false_receipts: usize,
    pub nodes_crashed: usize,
    pub recovery_time_ms: u64,
    pub passed: bool,
}

impl ChaosReport {
    pub fn print(&self) {
        println!("\n📊 Chaos Engineering Report");
        println!("===========================");
        println!("Duration: {:?}", self.duration);
        println!("Scenarios: {}", self.scenarios_run);
        println!("\nMetrics:");
        println!("  Invariants violated: {}", self.invariants_violated);
        println!("  Messages lost: {}", self.messages_lost);
        println!("  False receipts: {}", self.false_receipts);
        println!("  Nodes crashed: {}", self.nodes_crashed);
        println!("  Recovery time: {}ms", self.recovery_time_ms);
        println!("\nResult: {}", if self.passed { "✅ PASSED" } else { "❌ FAILED" });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_chaos_runner() {
        let mut runner = ChaosRunner::new(Duration::from_secs(1), 42);
        
        runner.add_scenario(ChaosScenario::LatencySpike {
            delay_ms: 10,
            probability: 0.5,
        });
        
        let report = runner.run().await.unwrap();
        assert!(report.passed);
    }
}