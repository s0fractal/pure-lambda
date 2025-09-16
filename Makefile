# Lambda Control Operations Makefile
# Quick commands for drift monitoring and chaos drills

.PHONY: help lattice-drift lattice-drill lattice-ood lattice-impact lattice-status

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
