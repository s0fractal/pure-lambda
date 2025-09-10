use std::env;
use std::process::Command;
use anyhow::Result;

fn main() -> Result<()> {
    let task = env::args().nth(1);
    match task.as_deref() {
        Some("build") => build()?,
        Some("run") => run()?,
        Some("test") => test()?,
        _ => print_help(),
    }
    Ok(())
}

fn print_help() {
    eprintln!(
        "Tasks:
    build   Build the kernel
    run     Build and run in QEMU  
    test    Run tests"
    );
}

fn build() -> Result<()> {
    let mut cmd = Command::new("cargo");
    cmd.current_dir("../unikernel");
    cmd.args(&["build", "--release"]);
    let status = cmd.status()?;
    
    if !status.success() {
        anyhow::bail!("cargo build failed");
    }
    
    Ok(())
}

fn run() -> Result<()> {
    build()?;
    
    let mut cmd = Command::new("qemu-system-x86_64");
    cmd.args(&[
        "-drive", "format=raw,file=../target/x86_64-lambda/release/bootimage-lambda-unikernel.bin",
        "-serial", "mon:stdio",
        "-device", "isa-debug-exit,iobase=0xf4,iosize=0x04",
    ]);
    
    let status = cmd.status()?;
    
    if !status.success() {
        anyhow::bail!("QEMU failed");
    }
    
    Ok(())
}

fn test() -> Result<()> {
    let mut cmd = Command::new("cargo");
    cmd.current_dir("../core");
    cmd.args(&["test", "--no-default-features"]);
    let status = cmd.status()?;
    
    if !status.success() {
        anyhow::bail!("tests failed");
    }
    
    Ok(())
}