# Changelog

All notable changes to Pure Lambda will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.1.0-rc1+ga-pre] - 2025-09-17

### Added
- **PL-SEED-01 specification** - Comprehensive format definition with hashing algorithms, DSSE integration, and round-trip law
- **SDK stubs for TypeScript, Python, and Rust** - Cross-platform development libraries with identical APIs for seed manipulation
- **Offline documentation site** - Static HTML documentation at `docs/site/` with sidebar navigation and interactive features
- **SDK Quickstart guide** - Ready-to-compile examples demonstrating `loadSeed`, `toOperon`, and `runAutopilot` functions
- **Seed Workflows documentation** - CLI examples for pack/unpack operations, DSSE signing/verification, and round-trip testing
- **Interactive documentation features** - Search functionality, code copy buttons, syntax highlighting, and mobile responsiveness

### Improved
- **Release manifests** - Now include conformance testing results and NOTICE files for compliance tracking
- **PL-SEED-01 conformance** - Enhanced specification with detailed hashing algorithms (GID/IID/XID), DSSE envelope format, and mandatory round-trip preservation
- **Documentation organization** - Structured docs with embedded content, offline-first design, and cross-referenced examples
- **SDK interoperability** - All language implementations produce identical outputs for cross-platform compatibility

### Security
- **BIOLOCK retention** - Existing security gates preserved during documentation and SDK development
- **DSSE cryptographic signatures** - Ed25519 signing and verification workflows documented and integrated
- **Offline verification** - Complete trust validation capabilities without network dependencies
- **Round-trip law enforcement** - Mandatory `pack(unpack(seed)) === seed` invariant for all implementations

---

## [v1.0.0-rc1] - 2025-09-16

### Added
- **Release orchestrator** - Automated build pipeline with deterministic outputs and M1 compatibility
- **DSSE attestation system** - Cryptographic provenance tracking for all build artifacts using Dead Simple Signing Envelope
- **Embassy v3 interface** - Modern web-based verification UI with offline-first design
- **Preflight validation pipeline** - Comprehensive pre-deployment checks including BIOLOCK gates
- **Offline verification support** - Complete trust validation without network dependencies
- **Software Bill of Materials (SBOM)** - Complete dependency tracking and vulnerability assessment
- **JSON fallback mode** - Graceful degradation when CAR format is blocked by security policies

### Changed
- **PNF-LITE engine** - Migrated to deterministic processing for reproducible network function results
- **Build system** - Switched to surgical release engineering with minimal diffs and no external network calls
- **Embassy packaging** - Optimized to <50KB with all dependencies bundled for offline operation
- **Verification workflow** - Streamlined to 3-step process for faster local deployment

### Fixed
- **BIOLOCK gate stability** - Resolved intermittent failures in preflight security validation
- **Cross-platform builds** - Ensured reproducible outputs across macOS and Linux environments
- **Attestation chain integrity** - Fixed edge cases in cryptographic signature verification
- **Memory optimization** - Reduced runtime footprint for resource-constrained environments

### Security
- **BIOLOCK security gates** - Multi-layer runtime protection against unauthorized modifications
- **Cryptographic attestation** - All artifacts signed with SHA-256 and BLAKE3 hash verification
- **Fail-safe operation** - System degrades gracefully to secure JSON mode if primary formats compromised
- **Zero-network deployment** - Complete offline operation eliminates network-based attack vectors

---

## Release Notes

For detailed release information, see [reports/release/RELEASE-NOTES-rc1.tpl.md](/reports/release/RELEASE-NOTES-rc1.tpl.md).

## Quick Start

See [docs/QUICKSTART.md](/docs/QUICKSTART.md) for rapid local deployment.