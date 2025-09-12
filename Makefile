# Pure Lambda - Build & Test Makefile

.PHONY: all test bench wasm clean

# Default target
all: build test

# Build everything
build:
	@echo "🔨 Building Memory v0..."
	cd memory && cargo build --release
	@echo "🔨 Building λKernel..."
	cd lambda-kernel/core && cargo build --release --no-default-features
	@echo "✅ Build complete"

# Run all tests
test:
	@echo "🧪 Testing Memory v0..."
	cd memory && cargo test
	@echo "🧪 Testing λFS integration..."
	cd lambda-fs && cargo test --test integration_live_files
	@echo "🧪 Verifying genes..."
	node gene-md-simple.js verify docs/genome/*.md || true
	@echo "✅ Tests complete"

# Run benchmarks with KPI gates
bench:
	@echo "📊 Running benchmarks..."
	cd memory && cargo test --release bench_ -- --nocapture > ../bench.out 2>&1
	@echo "🎯 Checking KPIs..."
	./tools/kpi_gate.sh bench.out
	@echo "✅ Benchmarks complete"

# Build WASM agent
wasm:
	@echo "🌐 Building WASM agent..."
	cargo install wit-bindgen-cli 2>/dev/null || true
	cd agents/hello-focus && cargo build --target wasm32-unknown-unknown --release
	@echo "✅ WASM build complete"
	@ls -lh agents/hello-focus/target/wasm32-unknown-unknown/release/*.wasm 2>/dev/null || echo "No WASM files built yet"

# Test WASM agent
wasm-test: wasm
	@echo "🧪 Testing WASM agent..."
	cd agents/hello-focus && cargo test
	@echo "✅ WASM tests complete"

# Clean all build artifacts
clean:
	@echo "🧹 Cleaning..."
	cd memory && cargo clean
	cd lambda-kernel/core && cargo clean
	cd agents/hello-focus && cargo clean
	rm -f bench.out
	rm -rf test-views test-data test-intents
	@echo "✅ Clean complete"

# Install dependencies
deps:
	@echo "📦 Installing dependencies..."
	npm install
	cargo install wit-bindgen-cli
	cargo install wasm-pack
	@echo "✅ Dependencies installed"

# Quick development cycle
dev: build test
	@echo "🚀 Ready for development"

# CI simulation
ci: clean build test bench wasm-test
	@echo "✅ CI simulation complete"

# Help
help:
	@echo "Pure Lambda - Available targets:"
	@echo "  make build      - Build all components"
	@echo "  make test       - Run all tests"
	@echo "  make bench      - Run benchmarks with KPI gates"
	@echo "  make wasm       - Build WASM agent"
	@echo "  make wasm-test  - Test WASM agent"
	@echo "  make clean      - Clean build artifacts"
	@echo "  make deps       - Install dependencies"
	@echo "  make dev        - Quick dev cycle (build+test)"
	@echo "  make ci         - Simulate CI pipeline"