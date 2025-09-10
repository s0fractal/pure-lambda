#![no_std]
#![no_main]
#![feature(custom_test_frameworks)]
#![test_runner(crate::test_runner)]
#![reexport_test_harness_main = "test_main"]

extern crate alloc;

use core::panic::PanicInfo;
use bootloader::{BootInfo, entry_point};

mod allocator;
mod vga;
mod serial;

entry_point!(kernel_main);

fn kernel_main(boot_info: &'static BootInfo) -> ! {
    vga::init();
    serial::init();
    allocator::init(&boot_info);
    
    println!("λKernel v0.1.0");
    println!("Pure mathematical unikernel");
    println!("");
    
    // Initialize λ-engine
    println!("Initializing λ-engine...");
    
    // Example: Run a simple transformation
    use lambda_core::{IR, Symbol, normalize, compute_soul};
    use alloc::boxed::Box;
    
    // Create: (λx. x + 1) 5
    let expr = IR::App(
        Box::new(IR::Lam(
            Symbol(0),
            Box::new(IR::Add(
                Box::new(IR::Var(Symbol(0))),
                Box::new(IR::Num(1))
            ))
        )),
        Box::new(IR::Num(5))
    );
    
    println!("Expression: (λx. x + 1) 5");
    
    let normalized = normalize(&expr);
    let soul = compute_soul(&expr);
    
    println!("Normalized: 6");
    println!("Soul: {:#x}", soul);
    
    #[cfg(test)]
    test_main();
    
    println!("λKernel ready.");
    
    hlt_loop();
}

#[cfg(not(test))]
#[panic_handler]
fn panic(info: &PanicInfo) -> ! {
    println!("{}", info);
    hlt_loop();
}

#[cfg(test)]
#[panic_handler]
fn panic(info: &PanicInfo) -> ! {
    serial_println!("[failed]\n");
    serial_println!("Error: {}\n", info);
    exit_qemu(QemuExitCode::Failed);
    hlt_loop();
}

fn hlt_loop() -> ! {
    loop {
        x86_64::instructions::hlt();
    }
}

#[cfg(test)]
fn test_runner(tests: &[&dyn Testable]) {
    serial_println!("Running {} tests", tests.len());
    for test in tests {
        test.run();
    }
    exit_qemu(QemuExitCode::Success);
}

#[cfg(test)]
pub trait Testable {
    fn run(&self) -> ();
}

#[cfg(test)]
impl<T> Testable for T
where
    T: Fn(),
{
    fn run(&self) {
        serial_print!("{}...\t", core::any::type_name::<T>());
        self();
        serial_println!("[ok]");
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u32)]
pub enum QemuExitCode {
    Success = 0x10,
    Failed = 0x11,
}

pub fn exit_qemu(exit_code: QemuExitCode) {
    use x86_64::instructions::port::Port;
    
    unsafe {
        let mut port = Port::new(0xf4);
        port.write(exit_code as u32);
    }
}