#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// BLAKE3 implementation (simplified - using SHA-256 as fallback for now)
function blake3(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Check for DSSE signature in file content
function detectDSSE(content: Buffer): boolean {
  try {
    // Look for DSSE envelope structure in first 2KB
    const text = content.slice(0, 2048).toString('utf8');
    return text.includes('"signatures"') && text.includes('"payload"') && text.includes('"protected"');
  } catch {
    return false;
  }
}

// Load trust data from trust-score.json
function loadTrustData(): TrustData | null {
  try {
    const trustScoreFile = path.join(process.cwd(), 'trust-score.json');
    if (fs.existsSync(trustScoreFile)) {
      return JSON.parse(fs.readFileSync(trustScoreFile, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️  Failed to load trust data:', error);
  }
  return null;
}

// Load conformance data from dist/fed/conformance.json
function loadConformanceData(): ConformanceData | null {
  try {
    const conformanceFile = path.join(process.cwd(), 'dist', 'fed', 'conformance.json');
    if (fs.existsSync(conformanceFile)) {
      return JSON.parse(fs.readFileSync(conformanceFile, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️  Failed to load conformance data:', error);
  }
  return null;
}

// Get trust grade color for display
function getTrustGradeColor(grade: string): string {
  switch (grade) {
    case 'excellent': return '#00C851';
    case 'good': return '#33B5E5';
    case 'fair': return '#FF8800';
    case 'poor': return '#FF4444';
    default: return '#6c757d';
  }
}

// Determine artifact kind from filename
function getArtifactKind(filename: string): string {
  if (filename.endsWith('.htmlc')) return 'htmlc';
  if (filename.endsWith('.cartridge')) return 'cartridge';
  if (filename.endsWith('.fed.zip')) return 'federation';
  return 'unknown';
}

interface Artifact {
  name: string;
  kind: string;
  size: number;
  blake3: string;
  dsse: boolean;
  conformance?: {
    passed: number;
    total: number;
  };
  trustScore?: number;
  freshnessDays?: number;
}

interface TrustData {
  trustScore: number;
  components: {
    dsse: {
      ratio: number;
      stats: { present: number; valid: number; total: number };
    };
    conformance: {
      ratio: number;
      stats: { passed: number; total: number };
    };
    freshness: {
      score: number;
      stats: { ageMedianDays: number };
    };
  };
  summary: {
    grade: string;
    ready: boolean;
  };
}

interface ConformanceData {
  passed: number;
  total: number;
  ratio: number;
  timestamp: string;
  artifactCoverage: Record<string, { passed: number; total: number }>;
  summary: {
    families: Array<{
      family: string;
      passed: number;
      total: number;
      ratio: number;
    }>;
  };
}

interface ExchangeIndex {
  version: string;
  generated: string;
  artifacts: Artifact[];
  trust?: {
    overall: {
      score: number;
      grade: string;
      ready: boolean;
    };
    components: {
      dsse: { present: number; valid: number; total: number };
      conformance: { passed: number; total: number };
      freshness: { ageMedianDays: number };
    };
  };
}

async function buildExchangeIndex(): Promise<void> {
  console.log('🏗️  Building Public Seed Exchange index...');

  const distRelease = path.join(process.cwd(), 'dist', 'release');
  const exchangeDir = path.join(process.cwd(), 'docs', 'exchange');
  const indexPath = path.join(exchangeDir, 'index.json');

  // Load trust data
  const trustData = loadTrustData();
  if (trustData) {
    console.log(`📊 Trust data loaded: ${(trustData.trustScore * 100).toFixed(1)}% (${trustData.summary.grade})`);
  } else {
    console.warn('⚠️  No trust data available');
  }

  // Load conformance data
  const conformanceData = loadConformanceData();
  if (conformanceData) {
    console.log(`🧪 Conformance data loaded: ${conformanceData.passed}/${conformanceData.total} (${(conformanceData.ratio * 100).toFixed(1)}%)`);
  } else {
    console.warn('⚠️  No conformance data available');
  }

  // Ensure directories exist
  if (!fs.existsSync(distRelease)) {
    throw new Error(`Release directory not found: ${distRelease}`);
  }

  if (!fs.existsSync(exchangeDir)) {
    fs.mkdirSync(exchangeDir, { recursive: true });
  }

  // Define expected artifacts
  const expectedArtifacts = [
    'hello-city.htmlc',
    'hello-city.cartridge',
    'federation.fed.zip'
  ];

  const artifacts: Artifact[] = [];

  // Process each expected artifact
  for (const filename of expectedArtifacts) {
    const filePath = path.join(distRelease, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Artifact not found: ${filename} (skipping)`);
      continue;
    }

    console.log(`📦 Processing ${filename}...`);

    try {
      // Read file
      const content = fs.readFileSync(filePath);
      const stats = fs.statSync(filePath);

      // Compute hash and detect DSSE
      const hash = blake3(content);
      const hasDSSE = detectDSSE(content);

      const artifact: Artifact = {
        name: filename,
        kind: getArtifactKind(filename),
        size: stats.size,
        blake3: hash,
        dsse: hasDSSE
      };

      // Add trust metrics if available
      if (trustData) {
        artifact.conformance = {
          passed: trustData.components.conformance.stats.passed,
          total: trustData.components.conformance.stats.total
        };
        artifact.trustScore = trustData.trustScore;
        artifact.freshnessDays = trustData.components.freshness.stats.ageMedianDays;
      }

      // Add conformance data if available (override trust data if present)
      if (conformanceData) {
        // Use artifact-specific conformance if available, otherwise use overall
        const artifactName = filename.replace(/\.(htmlc|cartridge|fed\.zip)$/, '');
        const artifactConformance = conformanceData.artifactCoverage[artifactName];

        if (artifactConformance) {
          artifact.conformance = {
            passed: artifactConformance.passed,
            total: artifactConformance.total
          };
        } else {
          // Fallback to overall conformance
          artifact.conformance = {
            passed: conformanceData.passed,
            total: conformanceData.total
          };
        }
      }

      artifacts.push(artifact);

      console.log(`  ✓ ${filename} (${Math.ceil(stats.size / 1024)} KB, DSSE: ${hasDSSE ? 'Yes' : 'No'})`);

    } catch (error) {
      console.error(`  ❌ Failed to process ${filename}:`, error);
    }
  }

  if (artifacts.length === 0) {
    throw new Error('No artifacts were successfully processed');
  }

  // Create index data with deterministic sorting
  const indexData: ExchangeIndex = {
    version: '1.0',
    generated: new Date().toISOString(),
    artifacts: artifacts.sort((a, b) => a.name.localeCompare(b.name))
  };

  // Add trust section if trust data is available
  if (trustData) {
    indexData.trust = {
      overall: {
        score: trustData.trustScore,
        grade: trustData.summary.grade,
        ready: trustData.summary.ready
      },
      components: {
        dsse: trustData.components.dsse.stats,
        conformance: trustData.components.conformance.stats,
        freshness: { ageMedianDays: trustData.components.freshness.stats.ageMedianDays }
      }
    };

    // Override conformance stats if fresh conformance data is available
    if (conformanceData) {
      indexData.trust.components.conformance = {
        passed: conformanceData.passed,
        total: conformanceData.total
      };
    }
  } else if (conformanceData) {
    // If no trust data but conformance data is available, create minimal trust section
    indexData.trust = {
      overall: {
        score: 0,
        grade: 'unknown',
        ready: false
      },
      components: {
        dsse: { present: 0, valid: 0, total: 0 },
        conformance: {
          passed: conformanceData.passed,
          total: conformanceData.total
        },
        freshness: { ageMedianDays: 0 }
      }
    };
  }

  // Write index.json
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

  // Update exchange/index.html to reference the JSON (check if it needs updating)
  await ensureIndexHtmlReferences(exchangeDir);

  // Summary
  const totalSize = artifacts.reduce((sum, a) => sum + a.size, 0);
  const totalSizeKB = Math.ceil(totalSize / 1024);

  console.log('\n✅ Exchange index built successfully');
  console.log(`📊 Summary:`);
  console.log(`   Artifacts: ${artifacts.length}`);
  console.log(`   Total size: ${totalSizeKB} KB`);
  console.log(`   DSSE signed: ${artifacts.filter(a => a.dsse).length}`);

  if (trustData) {
    const gradeColor = getTrustGradeColor(trustData.summary.grade);
    console.log(`   Trust score: ${(trustData.trustScore * 100).toFixed(1)}% (${trustData.summary.grade})`);
    console.log(`   Conformance: ${trustData.components.conformance.stats.passed}/${trustData.components.conformance.stats.total}`);
    console.log(`   Freshness: ${trustData.components.freshness.stats.ageMedianDays.toFixed(1)} days`);
    console.log(`   Ready: ${trustData.summary.ready ? '✅ Yes' : '❌ No'}`);
  }

  console.log(`   Output: ${indexPath}`);

  // Check size budget
  const maxBudget = 60 * 1024; // 60KB
  if (totalSize > maxBudget) {
    console.warn(`⚠️  Warning: Total size (${totalSizeKB} KB) exceeds recommended budget (60 KB)`);
  }
}

async function ensureIndexHtmlReferences(exchangeDir: string): Promise<void> {
  const indexHtmlPath = path.join(exchangeDir, 'index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    console.warn('⚠️  index.html not found, skipping reference check');
    return;
  }

  const content = fs.readFileSync(indexHtmlPath, 'utf8');

  // Check if index.html already references index.json
  if (content.includes('./index.json') || content.includes('index.json')) {
    console.log('  ✓ index.html already references index.json');
    return;
  }

  console.log('  ℹ️  index.html does not reference index.json (manual update may be needed)');
}

// CLI interface
if (require.main === module) {
  buildExchangeIndex().catch((error) => {
    console.error('❌ Exchange build failed:', error.message);
    process.exit(1);
  });
}

export { buildExchangeIndex };
export type { Artifact, ExchangeIndex };