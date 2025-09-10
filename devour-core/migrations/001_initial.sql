-- Initial schema for devour-core

-- Objects in CAS
CREATE TABLE IF NOT EXISTS objects (
    cid TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    source TEXT,
    size INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_objects_type ON objects(type);
CREATE INDEX idx_objects_source ON objects(source);

-- Genes
CREATE TABLE IF NOT EXISTS genes (
    soul TEXT PRIMARY KEY,
    cid TEXT NOT NULL,
    source TEXT NOT NULL,
    ir TEXT NOT NULL,
    complexity REAL,
    purity REAL,
    size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cid) REFERENCES objects(cid)
);

CREATE INDEX idx_genes_source ON genes(source);
CREATE INDEX idx_genes_purity ON genes(purity);

-- Equivalence classes
CREATE TABLE IF NOT EXISTS equivalences (
    soul1 TEXT NOT NULL,
    soul2 TEXT NOT NULL,
    confidence REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (soul1, soul2),
    FOREIGN KEY (soul1) REFERENCES genes(soul),
    FOREIGN KEY (soul2) REFERENCES genes(soul)
);

CREATE INDEX idx_equiv_soul1 ON equivalences(soul1);
CREATE INDEX idx_equiv_soul2 ON equivalences(soul2);

-- Champions
CREATE TABLE IF NOT EXISTS champions (
    canonical TEXT PRIMARY KEY,
    soul TEXT NOT NULL,
    score REAL NOT NULL,
    objectives TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (soul) REFERENCES genes(soul)
);

-- Organisms
CREATE TABLE IF NOT EXISTS organisms (
    name TEXT PRIMARY KEY,
    soulset TEXT NOT NULL,
    manifest TEXT NOT NULL,
    targets TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organisms_soulset ON organisms(soulset);

-- Attestations
CREATE TABLE IF NOT EXISTS attestations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organism TEXT NOT NULL,
    cid TEXT NOT NULL,
    signature TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organism) REFERENCES organisms(name),
    FOREIGN KEY (cid) REFERENCES objects(cid)
);

-- Metrics
CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    soul TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    value REAL NOT NULL,
    measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (soul) REFERENCES genes(soul)
);

CREATE INDEX idx_metrics_soul ON metrics(soul);
CREATE INDEX idx_metrics_type ON metrics(metric_type);