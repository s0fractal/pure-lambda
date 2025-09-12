//! Policy Check - Verifies agent behavior against formal rules
//! 
//! Usage: policy-check run <policy.yaml> <trace.json>
//! Returns: 0 if all policies pass, 1 if violations

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use std::process;

#[derive(Debug, Deserialize)]
struct Policy {
    version: u32,
    invariants: Vec<Invariant>,
    ethics: Vec<Invariant>,
    trace: TraceConfig,
}

#[derive(Debug, Deserialize)]
struct Invariant {
    id: String,
    desc: String,
    check: String,
    severity: Severity,
    #[serde(default)]
    witness: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
enum Severity {
    Info,
    Warning,
    Error,
}

#[derive(Debug, Deserialize)]
struct TraceConfig {
    enabled: bool,
    format: String,
    output: String,
    include: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct Trace {
    events: Vec<Event>,
    summary: Summary,
}

#[derive(Debug, Deserialize, Serialize)]
struct Event {
    timestamp: u64,
    #[serde(rename = "type")]
    event_type: String,
    path: Option<String>,
    cid: Option<String>,
    gas: Option<u64>,
    label: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct Summary {
    total_reads: usize,
    total_writes: usize,
    gas_used: u64,
    snapshots: Vec<String>,
}

#[derive(Debug, Serialize)]
struct PolicyReport {
    passed: Vec<String>,
    warnings: Vec<Violation>,
    errors: Vec<Violation>,
    summary: String,
}

#[derive(Debug, Serialize)]
struct Violation {
    id: String,
    desc: String,
    evidence: Vec<String>,
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() != 4 || args[1] != "run" {
        eprintln!("Usage: {} run <policy.yaml> <trace.json>", args[0]);
        process::exit(1);
    }
    
    let policy_path = &args[2];
    let trace_path = &args[3];
    
    // Load policy
    let policy_yaml = fs::read_to_string(policy_path)
        .expect("Failed to read policy file");
    let policy: Policy = serde_yaml::from_str(&policy_yaml)
        .expect("Failed to parse policy YAML");
    
    // Load trace
    let trace_json = fs::read_to_string(trace_path)
        .expect("Failed to read trace file");
    let trace: Trace = serde_json::from_str(&trace_json)
        .expect("Failed to parse trace JSON");
    
    // Check invariants
    let report = check_policies(&policy, &trace);
    
    // Output report
    println!("🔍 Policy Check Report");
    println!("======================");
    println!();
    
    if !report.passed.is_empty() {
        println!("✅ Passed ({}):", report.passed.len());
        for id in &report.passed {
            println!("   - {}", id);
        }
        println!();
    }
    
    if !report.warnings.is_empty() {
        println!("⚠️ Warnings ({}):", report.warnings.len());
        for violation in &report.warnings {
            println!("   - {}: {}", violation.id, violation.desc);
            for evidence in &violation.evidence {
                println!("     Evidence: {}", evidence);
            }
        }
        println!();
    }
    
    if !report.errors.is_empty() {
        println!("❌ Errors ({}):", report.errors.len());
        for violation in &report.errors {
            println!("   - {}: {}", violation.id, violation.desc);
            for evidence in &violation.evidence {
                println!("     Evidence: {}", evidence);
            }
        }
        println!();
    }
    
    println!("{}", report.summary);
    
    // Write JSON report
    let report_json = serde_json::to_string_pretty(&report).unwrap();
    fs::write("policy-report.json", report_json).ok();
    
    // Exit code based on errors
    if !report.errors.is_empty() {
        process::exit(1);
    }
}

fn check_policies(policy: &Policy, trace: &Trace) -> PolicyReport {
    let mut passed = Vec::new();
    let mut warnings = Vec::new();
    let mut errors = Vec::new();
    
    for invariant in &policy.invariants {
        match check_invariant(invariant, trace) {
            Ok(()) => passed.push(invariant.id.clone()),
            Err(evidence) => {
                let violation = Violation {
                    id: invariant.id.clone(),
                    desc: invariant.desc.clone(),
                    evidence,
                };
                
                match invariant.severity {
                    Severity::Warning => warnings.push(violation),
                    Severity::Error => errors.push(violation),
                    Severity::Info => {}, // Just log
                }
            }
        }
    }
    
    let summary = format!(
        "Checked {} invariants: {} passed, {} warnings, {} errors",
        policy.invariants.len(),
        passed.len(),
        warnings.len(),
        errors.len()
    );
    
    PolicyReport {
        passed,
        warnings,
        errors,
        summary,
    }
}

fn check_invariant(invariant: &Invariant, trace: &Trace) -> Result<(), Vec<String>> {
    let mut evidence = Vec::new();
    
    match invariant.id.as_str() {
        "io.intent_only" => {
            // Check all writes are to intents/*
            for event in &trace.events {
                if event.event_type == "write" {
                    if let Some(path) = &event.path {
                        if !path.starts_with("intents/") {
                            evidence.push(format!("Write to forbidden path: {}", path));
                        }
                    }
                }
            }
        }
        
        "memory.snapshotted_reads" => {
            // Check all reads are from snapshots
            let snapshot_cids: HashSet<String> = trace.summary.snapshots
                .iter()
                .cloned()
                .collect();
            
            for event in &trace.events {
                if event.event_type == "read" {
                    if let Some(cid) = &event.cid {
                        if !snapshot_cids.contains(cid) {
                            evidence.push(format!("Read from non-snapshot CID: {}", cid));
                        }
                    }
                }
            }
        }
        
        "gas.ceiling" => {
            // Check gas usage
            if trace.summary.gas_used > 10_000_000 {
                evidence.push(format!(
                    "Gas limit exceeded: {} > 10M",
                    trace.summary.gas_used
                ));
            }
        }
        
        "infoflow.no_secrets" => {
            // Check information flow labels
            let mut read_labels = HashMap::new();
            let mut write_labels = HashMap::new();
            
            for event in &trace.events {
                if let Some(label) = &event.label {
                    match event.event_type.as_str() {
                        "read" => {
                            read_labels.insert(event.path.clone().unwrap_or_default(), label.clone());
                        }
                        "write" => {
                            write_labels.insert(event.path.clone().unwrap_or_default(), label.clone());
                        }
                        _ => {}
                    }
                }
            }
            
            // Check no secret → public flow
            for (read_path, read_label) in &read_labels {
                if read_label.contains("secret") {
                    for (write_path, write_label) in &write_labels {
                        if write_label.contains("public") {
                            evidence.push(format!(
                                "Secret data from {} leaked to public {}",
                                read_path, write_path
                            ));
                        }
                    }
                }
            }
        }
        
        "determinism.no_time_in_compute" => {
            // Check for time usage in computation
            for event in &trace.events {
                if event.event_type == "compute" {
                    if let Some(path) = &event.path {
                        if path.contains("now_ms") {
                            evidence.push("Time used in computation".to_string());
                        }
                    }
                }
            }
        }
        
        "purity.no_mutations" => {
            // Check for mutations in expressions
            for event in &trace.events {
                if event.event_type == "expression" {
                    if let Some(path) = &event.path {
                        if path.contains("let ") || path.contains("mut ") {
                            evidence.push(format!("Mutation detected: {}", path));
                        }
                    }
                }
            }
        }
        
        _ => {} // Unknown invariant
    }
    
    if evidence.is_empty() {
        Ok(())
    } else {
        Err(evidence)
    }
}