# Gene Registry

This is a simple file-based registry for λ genes.

## Structure

- `index.json` - Main registry index with all genes
- `genes/<name>/metadata.json` - Detailed metadata per gene
- `scorecard.json` - Performance metrics for gene selection

## API

### Fetch Registry
```bash
curl https://raw.githubusercontent.com/s0fractal/pure-lambda/master/registry/index.json
```

### Search Genes
```javascript
const registry = await fetch('.../index.json').then(r => r.json());
const mapGene = registry.genes.find(g => g.name === 'map');
```

### Absorb Gene
```bash
# Fetch specific manifestation
curl -o map.ts https://raw.githubusercontent.com/.../map/manifestations/ts/map.ts

# Verify soul
gene soul map.ts
```

## Adding New Genes

1. Create gene structure in `genes/<name>/`
2. Add entry to `index.json`
3. Run verification: `gene verify <name>`
4. Update registry: `npm run update-registry`

## Future Enhancements

- IPFS content addressing
- Sigstore attestations
- NPM/PyPI/Crates.io publishing
- Automatic soul verification
- Performance benchmarks per manifestation