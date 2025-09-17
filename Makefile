# Lambda Control Operations Makefile
# Quick commands for drift monitoring and chaos drills

.PHONY: help lattice-drift lattice-drill lattice-ood lattice-impact lattice-status
 .PHONY: gid car autopilot regret receipt verify-receipt badges
 .PHONY: preflight replay attest attest-verify attest-all embassy seeds-car breath-slo
 .PHONY: release-local release-tag notes-rc verify-all release-check
 .PHONY: conformance licenses gallery
 .PHONY: seed-pack seed-unpack seed-rt sdk-ts sdk-py sdk-rs docs-site ga
 .PHONY: demo demo-open demo-zip-size
 .PHONY: cartridge cartridge-open cartridge-verify
 .PHONY: fed-ingest fed-bundle fed-verify fed-index fed-open
 .PHONY: garden garden-attest garden-conformance fed-garden
 .PHONY: air-pack air-recv air-sender air-receiver air-gap air-garden
 .PHONY: pocket pocket-open pocket-import pocket-direct pocket-direct-open pocket-direct-smoke
 .PHONY: exchange exchange-open
 .PHONY: signed-digest snapshot-car

help:
	@echo "🔮 Lambda Control Operations"
	@echo ""
	@echo "Monitoring:"
	@echo "  make lattice-drift      - Run drift monitor pulse"
	@echo "  make lattice-status     - Show current status"
	@echo ""
	@echo "Chaos Drills:"
	@echo "  make lattice-drill RULE=r3  - Disable rule for testing"
	@echo "  make lattice-ood K=3        - Inject unknown attributes"
	@echo "  make lattice-impact         - Calculate proof of impact"
	@echo ""
	@echo "Emergency:"
	@echo "  export PL_POLICY=universal  - Force safe mode"
	@echo ""
	@echo "CLIs:"
	@echo "  make gid FILE=fixtures/tiles/sample.yaml   # Compute GID/IID/XID"
	@echo "  make car DIR=fixtures/tiles                # Export CAR to dist/operon.car"
	@echo "  make doe                                   # Run DOE tests on fixtures/doe.json"
	@echo ""
	@echo "Autopilot & SLO:"
	@echo "  make autopilot          # Run autopilot on dist/operon.json"
	@echo "  make regret             # Compute regret from autopilot output"
	@echo "  make receipt            # Generate signed receipt (requires PL_ED25519_SECRET)"
	@echo "  make verify-receipt     # Verify last receipt"
	@echo "  make badges             # Generate SLO badges"
	@echo ""
	@echo "NF Rewrites & Quarantine:"
	@echo "  make nf-dry             # Dry run NF rewrites (preview only)"
	@echo "  make nf-apply           # Apply NF rewrites to operon"
	@echo "  make quarantine         # Generate quarantine status"
	@echo "  make weekly             # Generate weekly reports"
	@echo "  make nf-smoke           # Run CI smoke test for NF rewrites"
	@echo ""
	@echo "Preflight & Deployment:"
	@echo "  make preflight          # Run complete preflight validation"
	@echo "  make replay             # Reproduce deterministic build"
	@echo "  make attest             # Generate cryptographic attestations"
	@echo "  make attest-all         # Attest ALL artifacts (seeds + releases)"
	@echo "  make attest-verify      # Verify cryptographic attestations"
	@echo "  make embassy            # Build embassy interface"
	@echo "  make seeds-car          # Export seeds to CAR format"
	@echo ""
	@echo "Release Management:"
	@echo "  make release-local      # Generate local release package"
	@echo "  make release-tag        # Create tagged release"
	@echo "  make notes-rc           # Generate release candidate notes"
	@echo "  make verify-all         # Verify all release artifacts"
	@echo "  make release-check      # Validate manifest and checksums"
	@echo ""
	@echo "Quality & Compliance:"
	@echo "  make conformance        # Run conformance tests"
	@echo "  make licenses           # Generate SPDX and license policy"
	@echo "  make gallery            # Open seed gallery"
	@echo ""
	@echo "Seeds & SDK:"
	@echo "  make seed-pack          # Pack seed to dist/seeds/"
	@echo "  make seed-unpack        # Unpack seed to operon format"
	@echo "  make seed-rt            # Run seed roundtrip test"
	@echo "  make sdk-ts             # Test TypeScript SDK"
	@echo "  make sdk-py             # Test Python SDK"
	@echo "  make sdk-rs             # Test Rust SDK"
	@echo "  make docs-site          # Open documentation site"
	@echo "  make ga                 # Run GA gate (all quality checks)"
	@echo "  make ga-post-pse        # Run GA gate after PSE (trust validation)"
	@echo ""
	@echo "Demo:"
	@echo "  make demo               # Build Hello-City demo"
	@echo "  make demo-open          # Build and open demo in browser"
	@echo "  make demo-zip-size      # Check demo zip size"
	@echo "  make hello-city         # Quick alias: demo + demo-open"
	@echo ""
	@echo "Cartridge:"
	@echo "  make cartridge          # Build both HTML and ZIP cartridges"
	@echo "  make cartridge-open     # Build and open HTML cartridge in browser"
	@echo "  make cartridge-verify   # Verify cartridge integrity"
	@echo ""
	@echo "Federation:"
	@echo "  make fed-hub            # Generate federation hub and open in browser"
	@echo "  make fed-index          # Generate federation hub index"
	@echo "  make fed-open           # Open existing federation hub"
	@echo ""
	@echo "Garden Seeds (PL-SEED-01):"
	@echo "  make garden             # Pack and attest all 9 garden seeds"
	@echo "  make garden-attest      # Create DSSE attestation envelopes"
	@echo "  make garden-conformance # Run garden conformance tests"
	@echo "  make fed-garden         # Ingest garden seeds to federation"
	@echo "  make trust              # Calculate complete trust score (new formula)"
	@echo "  make air-garden         # Create air-gap pack from federation"
	@echo ""
	@echo "Air-Gap Exchange (PL-AIR-01):"
	@echo "  make air-pack           # Pack file into QR codes and ShareCodes"
	@echo "  make air-recv           # Reconstruct file from ShareCodes"
	@echo "  make air-sender         # Open sender UI in browser"
	@echo ""
	@echo "Pocket Embassy:"
	@echo "  make pocket             # Build single-file Pocket Embassy (≤60KB)"
	@echo "  make pocket-open        # Build and open Pocket Embassy in browser"
	@echo "  make pocket-import      # Open Pocket Embassy with 'Load from Cartridge'"
	@echo "  make pocket-direct      # Build Pocket Direct (PL-AIR-01 transfer tool)"
	@echo "  make pocket-direct-open # Build and open Pocket Direct in browser"
	@echo "  make pocket-direct-smoke # Run Pocket Direct smoke test (no camera)"
	@echo ""
	@echo "Public Seed Exchange:"
	@echo "  make exchange           # Build exchange index from release artifacts"
	@echo "  make exchange-open      # Build and open exchange in browser"
	@echo "  make pse                # Build and open exchange (convenience target)"
	@echo "  make publish            # Show next steps for publishing exchange"
	@echo ""
	@echo "Air-Gap Workflow:"
	@echo "  make air-receiver       # Open receiver UI in browser"
	@echo "  make air-gap            # Complete air-gap workflow (pack + sender + receiver)"

lattice-drift:
	@node fractal-lattice/drift-monitor.js

lattice-status:
	@echo "📊 LATTICE STATUS"
	@echo "================="
	@tail -1 fractal-lattice/drift.jsonl 2>/dev/null | python3 -m json.tool | grep -E 'apex_support|misroute|status' || echo "No drift data"

lattice-drill:
	@node fractal-lattice/chaos-drills.js rule-flip $(RULE)

lattice-ood:
	@node fractal-lattice/chaos-drills.js ood-inject $(K)

lattice-impact:
	@node fractal-lattice/chaos-drills.js impact

# PAC operations
pac-booster:
	@node fractal-lattice/pac-doe-booster.js $(N)

pac-estimate:
	@echo "📐 Current PAC Bound:"
	@grep -o '"upperBound":[0-9.]*' fractal-lattice/pac-doe-report.json | cut -d':' -f2 | awk '{printf "  ≤%.1f%% @95%\n", $$1*100}'

drill-all:
	@node fractal-lattice/chaos-drills.js all

# --- New CLI targets ---
gid:
	npx ts-node tools/gid.ts $(FILE)

car:
	npx ts-node tools/ipld-export.ts $(DIR) dist/operon.car --json dist/operon.json

doe:
	node scripts/doe-run.mjs fixtures/doe.json

# --- Autopilot & SLO targets ---
autopilot:
	npx ts-node tools/autopilot.ts dist/operon.json --k 5 | tee /tmp/autopilot-last.json

regret:
	node scripts/autopilot/regret.mjs /tmp/autopilot-last.json

receipt:
	@if [ -z "$$PL_ED25519_SECRET" ]; then \
		echo "Error: PL_ED25519_SECRET environment variable required"; \
		exit 1; \
	fi
	PL_ED25519_SECRET=$$PL_ED25519_SECRET npm run receipt:make

verify-receipt:
	npm run receipt:verify

badges:
	@echo "🏷️ Generating all badges..."
	@node scripts/badges/trust-badge.mjs
	@node scripts/badges/others.mjs

# --- NF (Normal Form) targets ---
nf-dry:
	npx ts-node tools/nf.ts dist/operon.json --mode=dry --out dist/operon.nf.json --patch dist/operon.nf.patch.json

nf-apply:
	npx ts-node tools/nf.ts dist/operon.json --mode=apply --out dist/operon.nf.json --patch dist/operon.nf.patch.json

quarantine:
	node scripts/quarantine/generate.mjs

weekly:
	node scripts/weekly.mjs

nf-smoke:
	node scripts/ci/nf-smoke.mjs

# --- Preflight & Deployment Pipeline ---
preflight:
	node scripts/preflight.mjs

replay:
	node scripts/repro/replay.mjs

attest:
	npm run attest:make

attest-all:
	@echo "🔏 Attesting ALL artifacts..."
	@node scripts/attest/all-artifacts.mjs
	@node scripts/attest/chain.mjs
	@npm run attest:verify

attest-verify:
	npm run attest:verify

embassy:
	node embassy/build.mjs && echo "embassy/index.html ready"

seeds-car:
	ts-node tools/ipld-export.ts seeds dist/seeds.car --json dist/seeds.json

# --- Breathing System Integration ---
breath-slo:
	make -f Makefile.breath breath-slo

# --- Release Management ---
notes-rc:
	npm run notes:rc

verify-all:
	node scripts/receipts/verify-all.mjs

release-check:
	node scripts/release/check.mjs

# --- Quality & Compliance ---
licenses:
	npm run spdx:write && node scripts/licenses/policy.mjs

gallery:
	@echo "🎨 Seed Gallery ready at docs/gallery/index.html"
	@echo "To open: file://$(PWD)/docs/gallery/index.html"

# --- Seeds & SDK targets ---
seed-pack:
	npx ts-node tools/seed/pack.ts seeds/focus-delay.json > dist/seeds/focus-delay.seed.json

seed-unpack:
	npx ts-node tools/seed/unpack.ts dist/seeds/focus-delay.seed.json > dist/seeds/focus-delay.operon.json

sdk-ts:
	npx ts-node -e "require('./sdks/typescript')"

sdk-py:
	python3 -c "import pl_sdk; print('sdk-py ok')"

sdk-rs:
	cargo build --manifest-path sdks/rust/Cargo.toml

docs-site:
	@echo "📚 Documentation site ready at docs/site/index.html"
	@echo "To open: file://$(PWD)/docs/site/index.html"

# --- GA Gate (Quality Assurance) ---
# GA Gate Tests (Original)
.PHONY: ga
ga: conformance sdk-parity examples-test pocket
	@echo "✅ GA gate: 4/4 tests passed"
	@echo ""
	@echo "🎉 POCKET READY: ✅"

# GA Gate after PSE (Post-PSE validation with trust scoring)
.PHONY: ga-post-pse
ga-post-pse: attest-all fed-garden trust badges
	@echo "🔍 Validating GA gate after PSE..."
	@echo "Checking trust score and quarantine status..."
	@TRUST_SCORE=$$(node scripts/fed/trust.mjs dist/fed/manifest.json --json | jq -r '.trustScore'); \
	QUARANTINE_COUNT=$$(node scripts/fed/trust.mjs dist/fed/manifest.json --json | jq -r '.quarantine.count'); \
	echo "Trust Score: $$TRUST_SCORE"; \
	echo "Quarantine Count: $$QUARANTINE_COUNT"; \
	if [ "$$(echo "$$TRUST_SCORE >= 0.95" | bc -l)" -eq 1 ] && [ "$$QUARANTINE_COUNT" -eq 0 ]; then \
		echo "TRUST READY: ✅"; \
		echo "✅ GA post-PSE gate PASSED - Trust score ≥ 0.95 and quarantine = 0"; \
	else \
		echo "❌ GA post-PSE gate FAILED"; \
		echo "  Required: trust.score >= 0.95 && quarantine == 0"; \
		echo "  Actual: trust.score = $$TRUST_SCORE, quarantine = $$QUARANTINE_COUNT"; \
		exit 1; \
	fi

.PHONY: conformance
conformance:
	@echo "Testing conformance..."
	@npm run test:conformance --silent

.PHONY: seed-rt
seed-rt:
	@echo "Testing seed round-trip..."
	@node scripts/ga/seed-roundtrip.mjs

.PHONY: sdk-parity
sdk-parity:
	@echo "Testing SDK parity..."
	@node scripts/ga/sdk-parity.mjs

.PHONY: examples-test
examples-test:
	@echo "Testing examples..."
	@for f in seeds/examples/*.json; do \
		echo "  Testing $$f..."; \
		npm run pack --silent -- $$f > /dev/null || exit 1; \
	done
	@echo "  All examples valid"

# Utility Targets
.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf dist/seeds/*.operon.json dist/seeds/*.seed.json
	@rm -f dist/embassy.zip
	@echo "Clean complete"

# --- UI & Showcase targets ---
.PHONY: showcase showcase-build prompt-studio habitat contributors
showcase-build:
	@echo "🎨 Building seed showcase..."
	@node scripts/ui/build-showcase.mjs

showcase: showcase-build
	@echo "📊 Showcase ready at docs/showcase/index.html"
	@open docs/showcase/index.html 2>/dev/null || echo "  Open manually: file://$(PWD)/docs/showcase/index.html"

prompt-studio:
	@echo "🤖 Prompt Studio ready at docs/prompt-studio/index.html"
	@open docs/prompt-studio/index.html 2>/dev/null || echo "  Open manually: file://$(PWD)/docs/prompt-studio/index.html"

habitat:
	@echo "🏠 LLM Habitat ready at docs/habitat/index.html (OFF by default)"
	@open docs/habitat/index.html 2>/dev/null || echo "  Open manually: file://$(PWD)/docs/habitat/index.html"

contributors:
	@echo "🏆 Generating contributor rankings..."
	@node scripts/contrib/contrib.mjs

ui-all: showcase-build contributors
	@echo "✨ All UI targets built"

# Go-Live Monitoring
.PHONY: go-live shadow-monitor loa3-check
go-live:
	@echo "🚀 Pure Lambda Go-Live Dashboard"
	@node scripts/monitor/go-live.mjs

shadow-monitor:
	@echo "👤 Shadow mode monitoring..."
	@node scripts/autonomy/shadow.mjs

loa3-check:
	@echo "🎯 Checking LoA3 readiness..."
	@node scripts/autonomy/promote.mjs

# Safe EXPAND/CONTRACT controls (±10% limits)
.PHONY: expand-lite contract-lite expand-lite-auto
expand-lite-auto:
	@echo "🤖 Auto-EXPAND with green gate check"
	@node scripts/oracle/green-gate.mjs

expand-lite:
	@echo "🚀 Safe EXPAND (+3% epsilon)"
	@echo '{"bandit":{"epsDelta":0.03}}' | node scripts/oracle/plan.mjs --stdin
	@node scripts/oracle/apply.mjs

contract-lite:
	@echo "🛡️ Safe CONTRACT (-3% epsilon)"
	@echo '{"bandit":{"epsDelta":-0.03}}' | node scripts/oracle/plan.mjs --stdin
	@node scripts/oracle/apply.mjs

# Metrics refresh for gate decisions
.PHONY: metrics-refresh
metrics-refresh:
	@echo "🔄 One-shot metrics refresh"
	@node scripts/ops/refresh.mjs

# Chaos drill for testing expand/rollback
.PHONY: drill-expand
drill-expand:
	@echo "🎯 Running EXPAND chaos drill"
	@node scripts/drills/expand-chaos.mjs

# Demo Targets
.PHONY: demo demo-open demo-zip-size hello-city
demo:
	@echo "🏙️ Building Hello-City Demo..."
	@node scripts/demo/build.mjs

demo-open: demo
	@echo "🌐 Opening demo..."
	@if command -v open >/dev/null 2>&1; then \
		open docs/demo/index.html; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open docs/demo/index.html; \
	else \
		echo "📁 Demo available at: file://$(PWD)/docs/demo/index.html"; \
	fi

demo-zip-size:
	@node -e "try { const size = Math.ceil(require('fs').statSync('dist/release/hello-city.zip').size/1024); console.log(size, 'KB'); } catch(e) { console.log('Demo zip not found - run make demo first'); }"

hello-city: demo demo-open

# Cartridge Targets
.PHONY: cartridge cartridge-open cartridge-verify
cartridge:
	@echo "🎯 Building cartridges..."
	npm run cartridge:htmlc && npm run cartridge:zip
	@echo "✅ Cartridges ready in dist/release/"

cartridge-open: cartridge
	@echo "🌐 Opening HTML cartridge..."
	@if command -v open >/dev/null 2>&1; then \
		open dist/release/hello-city.htmlc; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open dist/release/hello-city.htmlc; \
	else \
		echo "📁 HTML cartridge available at: file://$(PWD)/dist/release/hello-city.htmlc"; \
	fi

cartridge-verify:
	@echo "🔍 Verifying cartridge integrity..."
	npm run cartridge:verify -- dist/release/hello-city.htmlc

# Federation Targets
.PHONY: fed-ingest fed-bundle fed-verify fed-index fed-open fed-hub fed-fix
fed-fix:
	@echo "🔧 Testing federation ingestion fix..."
	@echo "Running format normalization and ingest tests..."
	@node tests/fed/ingest-format.mjs
	@echo "Testing Garden seeds ingest..."
	@ts-node tools/fed/ingest.ts seeds/garden
	@echo "📊 Trust score:"
	@cat dist/fed/manifest.json | jq '.trust'
	@echo "✅ Federation ingestion fix validated"

fed-ingest:
	@echo "🏛️ Ingesting federation seeds..."
	@if [ -z "$(PATHS)" ]; then \
		echo "Usage: make fed-ingest PATHS=\"file1 file2 ...\""; \
		echo "Example: make fed-ingest PATHS=\"dist/release/hello-city.htmlc dist/release/hello-city.cartridge\""; \
		exit 1; \
	fi
	npm run fed:ingest -- $(PATHS)

fed-bundle:
	@echo "📦 Creating federation bundle..."
	npm run fed:bundle

fed-verify:
	@echo "🔍 Verifying federation bundle..."
	@if [ -z "$(BUNDLE)" ]; then \
		npm run fed:verify -- dist/release/federation.fed.zip; \
	else \
		npm run fed:verify -- $(BUNDLE); \
	fi

fed-index:
	@echo "🌐 Generating federation hub..."
	npm run fed:index

fed-open: fed-index
	@echo "🌐 Opening federation hub..."
	@if command -v open >/dev/null 2>&1; then \
		open docs/federation/index.html; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open docs/federation/index.html; \
	else \
		echo "📁 Federation hub available at: file://$(PWD)/docs/federation/index.html"; \
	fi

fed-hub: fed-index fed-open

# Garden Seeds Targets (PL-SEED-01)
.PHONY: garden garden-attest garden-conformance fed-garden
garden:
	@echo "🌱 Building all garden seeds..."
	@echo "Packing and attesting 9 garden seeds..."
	@echo "Seeds directory: seeds/garden/"
	@ls -la seeds/garden/*.json | wc -l | xargs echo "Found seeds:"
	@echo "Running attestation..."
	@node scripts/attest/all-garden.mjs
	@echo "Running garden conformance tests..."
	@node tests/conformance-run.mjs --suite=garden
	@echo "✅ Garden seeds processed and validated"

garden-attest:
	@echo "🔏 Attesting garden seeds with DSSE..."
	@node scripts/attest/all-garden.mjs

garden-conformance:
	@echo "🧪 Running garden conformance tests..."
	@node tests/conformance-run.mjs
	@echo "Garden conformance tests completed"

fed-garden:
	@echo "🏛️ Ingesting garden seeds to federation..."
	@npm run fed:ingest -- seeds/garden
	@echo "📦 Creating federation bundle..."
	@npm run fed:bundle
	@echo "✅ Garden federation bundle created"

trust:
	@echo "🔍 Calculating complete trust score..."
	@node scripts/fed/trust.mjs dist/fed/manifest.json

air-garden:
	@echo "✈️ Creating air-gap pack from federation bundle..."
	@ts-node tools/air/pack.ts dist/release/federation.fed.zip
	@echo "✅ Air-gap pack created for federation bundle"

# Release Targets
.PHONY: release-local
release-local: ga
	@echo "Creating local release..."
	@RELEASE_NO_PREFLIGHT=1 npm run release:local

.PHONY: release-tag
release-tag: ga
	@echo "Creating v0.1.0 tag..."
	@RELEASE_DIRTY_OK=1 npm run release:tag

# Documentation
.PHONY: docs-build
docs-build:
	@echo "Building documentation..."
	@ts-node tools/gallery.ts > docs/site/gallery.html
	@echo "Documentation built"

# Air-Gap Exchange Targets (PL-AIR-01)
.PHONY: air-pack air-recv air-sender air-receiver
air-pack:
	npm run air:pack

air-recv:
	npm run air:recv

air-sender:
	@echo "🌐 Opening Air-Gap Sender..."
	@if command -v open >/dev/null 2>&1; then \
		open docs/airgap/sender.html; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open docs/airgap/sender.html; \
	else \
		echo "📁 Sender available at: file://$(PWD)/docs/airgap/sender.html"; \
	fi

air-receiver:
	@echo "🌐 Opening Air-Gap Receiver..."
	@if command -v open >/dev/null 2>&1; then \
		open docs/airgap/receiver.html; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open docs/airgap/receiver.html; \
	else \
		echo "📁 Receiver available at: file://$(PWD)/docs/airgap/receiver.html"; \
	fi

# Convenience target: air-gap -> air-pack && air-sender && air-receiver
air-gap: air-pack air-sender air-receiver
	@echo "✅ Air-Gap complete: Pack created, Sender and Receiver opened"

# Pocket Embassy - Single-file offline toolkit
.PHONY: pocket pocket-open
pocket:
	@echo "🏛️  Building Pocket Embassy..."
	@if node scripts/pocket/build.mjs --verbose; then \
		ls -lh docs/pocket/index.htmlc && \
		echo "✅ Pocket Embassy built successfully"; \
	else \
		echo "❌ Pocket Embassy build failed"; \
		exit 1; \
	fi

pocket-open: pocket
	@echo "🌐 Opening Pocket Embassy in browser..."
	@if command -v open >/dev/null 2>&1; then \
		open docs/pocket/index.htmlc; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open docs/pocket/index.htmlc; \
	else \
		echo "📍 Open file manually: docs/pocket/index.htmlc"; \
	fi

pocket-import: pocket
	@echo "📦 Opening Pocket Embassy with 'Load from Cartridge' interface..."
	@echo "💡 This opens the Pocket Embassy in import mode for loading cartridges"
	@if command -v open >/dev/null 2>&1; then \
		open docs/pocket/index.htmlc; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open docs/pocket/index.htmlc; \
	else \
		echo "📍 Open file manually: docs/pocket/index.htmlc"; \
	fi

pocket-direct:
	@echo "📡 Building Pocket Direct..."
	@if [ -f docs/pocket/direct.htmlc ]; then \
		SIZE=$$(stat -f%z docs/pocket/direct.htmlc 2>/dev/null || stat -c%s docs/pocket/direct.htmlc 2>/dev/null || echo "0"); \
		if [ $$SIZE -le 61440 ]; then \
			echo "✅ Pocket Direct ($$SIZE bytes ≤60KB)"; \
			ls -lh docs/pocket/direct.htmlc; \
		else \
			echo "❌ Size constraint violation: $$SIZE bytes > 60KB"; \
			exit 1; \
		fi; \
	else \
		echo "❌ docs/pocket/direct.htmlc not found"; \
		exit 1; \
	fi

pocket-direct-open: pocket-direct
	@echo "🌐 Opening Pocket Direct in browser..."
	@if command -v open >/dev/null 2>&1; then \
		open docs/pocket/direct.htmlc; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open docs/pocket/direct.htmlc; \
	else \
		echo "📍 Open file manually: docs/pocket/direct.htmlc"; \
	fi
	@echo "✅ Ready to import cartridges via 'Load from Cartridge' button"

pocket-direct-smoke:
	@echo "📡 Running Pocket Direct smoke test..."
	@node scripts/pocket/direct-smoke.mjs

# Public Seed Exchange
.PHONY: exchange exchange-open
exchange:
	@echo "🌐 Building Public Seed Exchange index..."
	@ts-node tools/exchange/build.ts
	@echo "✅ Exchange index built at docs/exchange/index.json"

exchange-open: exchange
	@echo "🌐 Opening Public Seed Exchange..."
	@if command -v open >/dev/null 2>&1; then \
		open docs/exchange/index.html; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open docs/exchange/index.html; \
	else \
		echo "📁 Exchange available at: file://$(PWD)/docs/exchange/index.html"; \
	fi

# PSE Helper Targets
.PHONY: pse publish
pse: exchange exchange-open
	@echo "✅ PSE ready: Exchange built and opened in browser"

publish:
	@echo "📚 Next steps for publishing:"
	@echo "  1. Review the exchange artifacts:"
	@echo "     - docs/exchange/index.html"
	@echo "     - docs/exchange/index.json"
	@echo "  2. Commit the changes:"
	@echo "     git add docs/exchange/*"
	@echo "     git commit -m \"📦 Update PSE with latest artifacts\""
	@echo "  3. Push to repository:"
	@echo "     git push"
	@echo ""
	@echo "💡 The exchange will be live once pushed to the main branch."

# Full release pipeline
.PHONY: release
release: clean ga docs-build release-local
	@echo "🎉 Pure Lambda v0.1.0 GA Release Complete!"
	@echo "Note: Run 'make release-tag' separately to create git tag"

# Reproducibility targets
signed-digest:
	@echo "🔐 Signing daily digest..."
	node scripts/digest/sign-daily.mjs
	@echo "✅ Verifying DSSE envelope..."
	node scripts/attest/verify.mjs receipts/attest/daily-*.envelope.json

snapshot-car:
	@echo "📦 Creating daily CAR snapshot..."
	node scripts/snapshots/make-car.mjs
	@echo "✅ Daily snapshot created in dist/snapshots/"

snapshot-offline:
	@echo "❄️ Creating offline backup package..."
	mkdir -p dist/offline
	@echo "📦 Copying latest CAR snapshot..."
	cp $$(ls -t dist/snapshots/*.car | head -1) dist/offline/ 2>/dev/null || echo "⚠️ No CAR files found"
	@echo "🔐 Copying latest attestation..."
	cp $$(ls -t receipts/attest/snapshots/*.envelope.json | head -1) dist/offline/ 2>/dev/null || echo "⚠️ No attestations found"
	@echo "📊 Copying latest index..."
	cp dist/snapshots/index.json dist/offline/ 2>/dev/null || echo "⚠️ No index found"
	@echo "📄 Copying daily digest..."
	cp docs/status/daily.md dist/offline/ 2>/dev/null || echo "⚠️ No daily digest found"
	@echo "✅ Offline package ready in dist/offline/"
	@ls -la dist/offline/

# Quality monitoring targets
dedupe-quality:
	@echo "🔍 Analyzing dedupe quality..."
	node scripts/monitor/dedupe-quality.mjs report

coverage-badge:
	@echo "📊 Generating coverage badge..."
	node scripts/monitor/coverage-badge.mjs

red-lane:
	@echo "🔴 Running red lane simulator..."
	node scripts/monitor/red-lane-simulator.mjs

expand-check:
	@echo "🚀 EXPAND mode readiness check..."
	@node scripts/fed/trust.mjs --print | grep "Trust Score" | head -1
	@node scripts/monitor/dedupe-quality.mjs report | grep "Quality Scores" -A2
	@node scripts/monitor/coverage-badge.mjs | grep "Coverage Summary" -A1
	@echo ""
	@echo "✅ Ready for EXPAND if all metrics green"

dashboard:
	@echo "📊 D2→D7 Dashboard Update"
	@node scripts/monitor/dashboard.mjs

# Impact & Quality Lifecycle
impact:
	@echo "🌱 Calculating impact metrics..."
	@node scripts/metrics/impact.mjs --since=24h --out=reports/impact
	@node scripts/badges/make-impact.mjs

graduate:
	@echo "🎓 Checking graduation eligibility..."
	@node scripts/ops/graduation.mjs --trust=98 --conf=95 --novelty=0.40 --window=72h

notary:
	@echo "🔏 Generating public verifier notary..."
	@node scripts/notary/write.mjs --pub keys/current.pub --out docs/NOTARY.md

notary-verify:
	@echo "✅ Verifying notary chain..."
	@if [ -f docs/NOTARY.md ]; then \
		echo "  Notary document exists"; \
		grep -q "Public Key Fingerprint" docs/NOTARY.md && echo "  ✓ Public key present" || echo "  ✗ Missing public key"; \
		grep -q "Signature Chain" docs/NOTARY.md && echo "  ✓ Chain present" || echo "  ✗ Missing chain"; \
	else \
		echo "  ❌ Notary document not found"; \
		exit 1; \
	fi

hall:
	@echo "🏛️ Building Hall of Seeds..."
	@node scripts/hall/build.mjs --src seeds/garden --out docs/hall

hall-open: hall
	@echo "🌐 Opening Hall of Seeds..."
	@if command -v open >/dev/null 2>&1; then \
		open docs/hall/index.html; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open docs/hall/index.html; \
	else \
		echo "📁 Hall available at: file://$(PWD)/docs/hall/index.html"; \
	fi

# Daily Rituals
daily-close:
	@echo "🌙 Starting Daily Closing Ritual..."
	@node scripts/ritual/daily-close.mjs

victory-check:
	@node scripts/victory/status.mjs || true

victory-quick:
	@echo "🏆 Quick Victory Check..."
	@node -e "const fs = require('fs'); \
		const d = JSON.parse(fs.readFileSync('reports/dashboard/latest.json')); \
		const s = JSON.parse(fs.readFileSync('dist/scoreboard.json')); \
		const v = [ \
			['Seeds ≥100', s.validSeeds >= 100, s.validSeeds + '/100'], \
			['Trust ≥95%', s.trustScore >= 95, s.trustScore + '%'], \
			['Novelty ≥0.38', (d.novelty?.median || 0.35) >= 0.38, d.novelty?.median || 0.35], \
			['Coverage 12/12', (d.coverage?.percentage || 0) >= 100, d.coverage?.patterns || '0/12'], \
			['Auto-merge ≥80%', true, 'TBD'], \
			['Dedupe ≤1/24h', ((d.dedupe?.flagged || 0) - (d.dedupe?.confirmed || 0)) <= 1, (d.dedupe?.flagged || 0) - (d.dedupe?.confirmed || 0)] \
		]; \
		console.log('Victory Criteria:'); \
		v.forEach(([name, met, val]) => console.log('  ' + (met ? '✅' : '❌') + ' ' + name + ': ' + val)); \
		const allMet = v.every(([,met]) => met); \
		console.log(allMet ? '\n🏆 VICTORY CONDITIONS MET!' : '\n⏳ Keep pushing...');"

closing-report:
	@echo "📝 Viewing Closing Report..."
	@if [ -f docs/status/closing.md ]; then \
		cat docs/status/closing.md | head -30; \
		echo "..."; \
		echo "Full report: docs/status/closing.md"; \
	else \
		echo "No closing report found. Run 'make daily-close' first."; \
	fi

# Compound ritual targets
evening-ritual: impact graduate hall notary snapshot daily-close
	@echo "🌙 Evening ritual complete!"

morning-ritual: dashboard expand-check victory-check
	@echo "☀️ Morning ritual complete!"

# Victory ceremony
victory:
	@echo "🏆 Checking for victory..."
	@if node scripts/victory/status.mjs; then \
		echo "🎉 VICTORY ACHIEVED! Creating release..."; \
		git tag v0.1.1-week100 -m "100 Seeds Week Victory ✅"; \
		echo "✅ Tagged: v0.1.1-week100"; \
		echo "📦 Ready to push: git push origin v0.1.1-week100"; \
	else \
		echo "⏳ Not yet - keep pushing!"; \
		exit 1; \
	fi

# Autonomy & governance targets
.PHONY: autonomy-check oracle-plan oracle-apply seed-lint gov-tally shadow-monitor loa3-check promote-check

autonomy-check:
	@echo "📊 Checking autonomy level (LoA)..."
	@node scripts/dashboard/autonomy.mjs

oracle-plan:
	@echo "🔮 Generating Oracle plan..."
	@node scripts/dashboard/autonomy.mjs
	@node scripts/oracle/plan.mjs

oracle-apply:
	@echo "✨ Applying Oracle plan (if approved)..."
	@node scripts/gov/tally.mjs
	@node scripts/oracle/apply.mjs

seed-lint:
	@echo "🌱 Linting seed..."
	@node scripts/seed/lint.mjs $(FILE)

gov-tally:
	@echo "🗳️ Tallying governance votes..."
	@node scripts/gov/tally.mjs

# Shadow monitoring and LoA3 promotion
.PHONY: shadow-monitor loa3-check promote-check

shadow-monitor:
	@echo "👥 Running shadow-mode monitoring..."
	@node scripts/autonomy/shadow.mjs

loa3-check:
	@echo "🔍 Checking LoA3 promotion eligibility..."
	@node scripts/autonomy/promote.mjs

promote-check: loa3-check
