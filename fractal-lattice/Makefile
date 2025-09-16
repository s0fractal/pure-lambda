# Fractal Lattice Generation

.PHONY: all clean lattice context concepts hasse

all: lattice

lattice: context concepts hasse
	@echo "✅ Fractal lattice complete"
	@echo "   View: fractal-lattice/lattice.svg"

context:
	@echo "📊 Building FCA context from receipts..."
	@npx ts-node fractal-lattice/context.build.ts

concepts: context
	@echo "🔬 Computing concept closure..."
	@npx ts-node fractal-lattice/fca.nextclosure.ts

hasse: concepts
	@echo "🕸️ Generating Hasse diagram..."
	@npx ts-node fractal-lattice/lattice.hasse.ts

clean:
	@rm -f fractal-lattice/*.jsonl fractal-lattice/*.json fractal-lattice/*.svg
	@echo "🧹 Cleaned fractal-lattice/"

stats: lattice
	@echo "📈 Lattice Statistics:"
	@node -e "const l = require('./fractal-lattice/lattice.json'); \
		console.log('  Nodes:', l.nodes.length); \
		console.log('  Edges:', l.edges.length); \
		console.log('  Height:', Math.max(...l.nodes.map(n => n.level)));"