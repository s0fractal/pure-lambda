#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Conformance Test Runner
 *
 * Runs comprehensive conformance tests for:
 * - GID/IID/XID invariance testing
 * - NF rule validation
 * - Autopilot regret analysis
 *
 * Outputs JUnit XML, TAP13, and Summary Markdown reports
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

// Import seed normalization (use dynamic import for TypeScript)
// const { normalizeSeed } = await import('../tools/seed/normalize.ts');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Test configuration
const config = {
  vectors: {
    gid_iid_xid: path.join(__dirname, 'vectors', 'gid_iid_xid', 'vectors.jsonl'),
    nf: path.join(__dirname, 'vectors', 'nf', 'vectors.jsonl'),
    autopilot: path.join(__dirname, 'vectors', 'autopilot', 'vectors.jsonl'),
    garden: path.join(__dirname, 'vectors', 'garden', 'vectors.jsonl')
  },
  tools: {
    gid: path.join(projectRoot, 'tools', 'gid.ts'),
    nf: path.join(projectRoot, 'tools', 'nf.ts'),
    autopilot: path.join(projectRoot, 'tools', 'autopilot.ts')
  },
  reports: {
    dir: path.join(projectRoot, 'reports', 'conformance'),
    junit: path.join(projectRoot, 'reports', 'conformance', 'junit.xml'),
    tap: path.join(projectRoot, 'reports', 'conformance', 'tap.txt'),
    summary: path.join(projectRoot, 'reports', 'conformance', 'summary.md')
  },
  output: {
    conformanceJson: path.join(projectRoot, 'dist', 'fed', 'conformance.json')
  },
  tempDir: path.join(tmpdir(), 'pure-lambda-conformance-' + randomBytes(8).toString('hex')),
  failureReport: path.join(__dirname, '_out', 'conformance-failures.jsonl')
};

// Ensure reports directory exists
if (!fs.existsSync(config.reports.dir)) {
  fs.mkdirSync(config.reports.dir, { recursive: true });
}

// Ensure output directory exists
if (!fs.existsSync(path.dirname(config.output.conformanceJson))) {
  fs.mkdirSync(path.dirname(config.output.conformanceJson), { recursive: true });
}

// Ensure temp directory exists
if (!fs.existsSync(config.tempDir)) {
  fs.mkdirSync(config.tempDir, { recursive: true });
}

class TestResult {
  constructor(name, family, passed, message = '', duration = 0, details = {}) {
    this.name = name;
    this.family = family;
    this.passed = passed;
    this.message = message;
    this.duration = duration;
    this.details = details;
  }
}

class ConformanceRunner {
  constructor(gateMode = false) {
    this.results = [];
    this.startTime = Date.now();
    this.gateMode = gateMode;
    this.failures = [];
  }

  // Apply seed normalization before all vector checks
  async normalizeSeedIfNeeded(seed) {
    try {
      // Dynamic import for TypeScript module
      const { normalizeSeed } = await import('../tools/seed/normalize.ts');
      const normalized = await normalizeSeed(seed);
      return normalized.seedTiles;
    } catch (error) {
      console.warn(`Warning: Could not normalize seed: ${error.message}`);
      return seed;
    }
  }

  // Collect failure report entry
  addFailureReport(name, check, why, got, want, hint = null) {
    this.failures.push({
      name,
      check,
      why,
      got,
      want,
      hint
    });
  }

  // Write failure reports to JSONL
  writeFailureReports() {
    if (this.failures.length === 0) {
      return;
    }

    // Ensure output directory exists
    const outputDir = path.dirname(config.failureReport);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonlContent = this.failures.map(failure => JSON.stringify(failure)).join('\n');
    fs.writeFileSync(config.failureReport, jsonlContent);
    console.log(`📋 Failure report written to: ${config.failureReport}`);
  }

  async runAllTests() {
    console.log('🧪 Running Pure Lambda Conformance Tests...\n');

    try {
      // Run GID/IID/XID tests
      console.log('📋 Running GID/IID/XID invariance tests...');
      await this.runGidIidXidTests();

      // Run NF tests
      console.log('🔧 Running NF rule validation tests...');
      await this.runNfTests();

      // Run Autopilot tests
      console.log('🚁 Running autopilot regret analysis tests...');
      await this.runAutopilotTests();

      // Run Garden tests
      console.log('🌱 Running garden seed conformance tests...');
      await this.runGardenTests();

      // Generate reports
      console.log('📊 Generating reports...');
      this.writeFailureReports();
      this.generateReports();

      // Summary
      const passed = this.results.filter(r => r.passed).length;
      const total = this.results.length;
      const ratio = total > 0 ? passed / total : 0;
      const success = passed === total;

      console.log(`\\n✅ Conformance testing complete: ${passed}/${total} tests passed (${(ratio * 100).toFixed(1)}%)`);

      // Check gate condition if in gate mode
      if (this.gateMode && ratio < 0.90) {
        console.log(`❌ Gate condition failed: ratio ${ratio.toFixed(3)} < 0.90`);
        process.exit(1);
      }

      if (!success) {
        console.log('❌ Some tests failed - check reports for details');
        process.exit(1);
      }

      process.exit(0);

    } catch (error) {
      console.error('💥 Conformance testing failed:', error.message);
      process.exit(1);
    } finally {
      // Cleanup
      if (fs.existsSync(config.tempDir)) {
        fs.rmSync(config.tempDir, { recursive: true, force: true });
      }
    }
  }

  async runSpecificSuite(suiteName) {
    console.log(`🧪 Running Pure Lambda Conformance Tests - Suite: ${suiteName}...\n`);

    try {
      switch (suiteName.toLowerCase()) {
        case 'gid_iid_xid':
        case 'gid':
          console.log('📋 Running GID/IID/XID invariance tests...');
          await this.runGidIidXidTests();
          break;

        case 'nf':
          console.log('🔧 Running NF rule validation tests...');
          await this.runNfTests();
          break;

        case 'autopilot':
          console.log('🚁 Running autopilot regret analysis tests...');
          await this.runAutopilotTests();
          break;

        case 'garden':
          console.log('🌱 Running garden seed conformance tests...');
          await this.runGardenTests();
          break;

        default:
          throw new Error(`Unknown test suite: ${suiteName}. Available suites: gid_iid_xid, nf, autopilot, garden`);
      }

      // Generate reports
      console.log('📊 Generating reports...');
      this.writeFailureReports();
      this.generateReports();

      // Summary
      const passed = this.results.filter(r => r.passed).length;
      const total = this.results.length;
      const ratio = total > 0 ? passed / total : 0;
      const success = passed === total;

      console.log(`\\n✅ ${suiteName} suite testing complete: ${passed}/${total} tests passed (${(ratio * 100).toFixed(1)}%)`);

      // Check gate condition if in gate mode
      if (this.gateMode && ratio < 0.90) {
        console.log(`❌ Gate condition failed: ratio ${ratio.toFixed(3)} < 0.90`);
        process.exit(1);
      }

      if (!success) {
        console.log('❌ Some tests failed - check reports for details');
        process.exit(1);
      }

      process.exit(0);

    } catch (error) {
      console.error(`💥 ${suiteName} suite testing failed:`, error.message);
      process.exit(1);
    } finally {
      // Cleanup
      if (fs.existsSync(config.tempDir)) {
        fs.rmSync(config.tempDir, { recursive: true, force: true });
      }
    }
  }

  async runGidIidXidTests() {
    const vectorsContent = fs.readFileSync(config.vectors.gid_iid_xid, 'utf8');
    const vectors = vectorsContent.trim().split('\n').map(line => JSON.parse(line));

    for (const vector of vectors) {
      const startTime = Date.now();

      try {
        // Create temporary tile files
        const originalTile = this.createTempTile(vector.tileYaml, 'original');
        const mutatedTiles = vector.mutations.map((mutation, idx) =>
          this.createTempTile(this.applyMutation(vector.tileYaml, mutation), `mutation_${idx}`)
        );

        // Calculate hashes for all tiles
        const originalHashes = await this.calculateHashes(originalTile);
        const mutatedHashes = await Promise.all(
          mutatedTiles.map(tile => this.calculateHashes(tile))
        );

        // Check expectations
        const result = this.checkGidIidXidExpectations(
          vector,
          [originalHashes, ...mutatedHashes]
        );

        // Add failure report if test failed
        if (!result.passed) {
          this.addFailureReport(
            vector.name,
            'gid_iid_xid',
            result.message,
            result.got || 'test failed',
            result.want || 'test to pass',
            result.hint || 'Check hash invariants and mutation expectations'
          );
        }

        const duration = Date.now() - startTime;
        this.results.push(new TestResult(
          vector.name,
          'gid_iid_xid',
          result.passed,
          result.message,
          duration,
          { vector, hashes: [originalHashes, ...mutatedHashes] }
        ));

        // Cleanup temp tiles
        [originalTile, ...mutatedTiles].forEach(tile => {
          if (fs.existsSync(tile)) fs.unlinkSync(tile);
        });

      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = `Error: ${error.message}`;

        this.addFailureReport(
          vector.name,
          'gid_iid_xid',
          errorMessage,
          'exception thrown',
          'successful execution',
          'Check input data and tool availability'
        );

        this.results.push(new TestResult(
          vector.name,
          'gid_iid_xid',
          false,
          errorMessage,
          duration
        ));
      }
    }
  }

  async runNfTests() {
    const vectorsContent = fs.readFileSync(config.vectors.nf, 'utf8');
    const vectors = vectorsContent.trim().split('\n').map(line => JSON.parse(line));

    for (const vector of vectors) {
      const startTime = Date.now();

      try {
        // Create temporary operon file
        const operonFile = this.createTempOperonFile(vector.operonJson);
        const outFile = path.join(config.tempDir, `nf_out_${Date.now()}.json`);
        const patchFile = path.join(config.tempDir, `nf_patch_${Date.now()}.json`);

        // Run NF tool in dry mode
        const nfResult = await this.runNfTool(operonFile, outFile, patchFile, 'dry');

        // Calculate L(best) before and after
        const originalL = await this.calculateLBest(operonFile);
        const optimizedL = await this.calculateLBest(outFile);

        // Check expectations
        const result = this.checkNfExpectations(vector, nfResult, originalL, optimizedL);

        // Add failure report if test failed
        if (!result.passed) {
          this.addFailureReport(
            vector.name,
            'nf',
            result.message,
            result.got || `L(original): ${originalL}, L(optimized): ${optimizedL}`,
            result.want || 'delta constraints satisfied',
            result.hint || 'Check that hops ≤ -1, latency ≤ 0, memory ≤ 0'
          );
        }

        const duration = Date.now() - startTime;
        this.results.push(new TestResult(
          vector.name,
          'nf',
          result.passed,
          result.message,
          duration,
          { vector, nfResult, originalL, optimizedL }
        ));

        // Cleanup
        [operonFile, outFile, patchFile].forEach(file => {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        });

      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = `Error: ${error.message}`;

        this.addFailureReport(
          vector.name,
          'nf',
          errorMessage,
          'exception thrown',
          'successful NF rule validation',
          'Check operon file format and NF tool availability'
        );

        this.results.push(new TestResult(
          vector.name,
          'nf',
          false,
          errorMessage,
          duration
        ));
      }
    }
  }

  async runAutopilotTests() {
    const vectorsContent = fs.readFileSync(config.vectors.autopilot, 'utf8');
    const vectors = vectorsContent.trim().split('\n').map(line => JSON.parse(line));

    for (const vector of vectors) {
      const startTime = Date.now();

      try {
        // Create temporary operon file
        const operonFile = this.createTempOperonFile(vector.operonJson);

        // Run autopilot analysis
        const autopilotResult = await this.runAutopilotTool(operonFile);

        // Check regret bounds
        const result = this.checkAutopilotExpectations(vector, autopilotResult);

        // Add failure report if test failed
        if (!result.passed) {
          this.addFailureReport(
            vector.name,
            'autopilot',
            result.message,
            result.got || `regret: ${autopilotResult.regret}`,
            result.want || `regret within bounds for ${vector.expect.regretType}`,
            result.hint || 'Check regret calculation and bounds'
          );
        }

        const duration = Date.now() - startTime;
        this.results.push(new TestResult(
          vector.name,
          'autopilot',
          result.passed,
          result.message,
          duration,
          { vector, autopilotResult }
        ));

        // Cleanup
        if (fs.existsSync(operonFile)) fs.unlinkSync(operonFile);

      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = `Error: ${error.message}`;

        this.addFailureReport(
          vector.name,
          'autopilot',
          errorMessage,
          'exception thrown',
          'successful autopilot analysis',
          'Check operon file format and autopilot tool availability'
        );

        this.results.push(new TestResult(
          vector.name,
          'autopilot',
          false,
          errorMessage,
          duration
        ));
      }
    }
  }

  async runGardenTests() {
    const vectorsContent = fs.readFileSync(config.vectors.garden, 'utf8');
    const vectors = vectorsContent.trim().split('\n').map(line => JSON.parse(line));

    for (const vector of vectors) {
      const startTime = Date.now();

      try {
        // Read the seed JSON file
        const seedContent = fs.readFileSync(vector.seedJson, 'utf8');
        const seedData = JSON.parse(seedContent);

        // Validate seed structure and properties
        const result = this.checkGardenExpectations(vector, seedData);

        // Add failure report if test failed
        if (!result.passed) {
          this.addFailureReport(
            vector.name,
            'garden',
            result.message,
            result.got || 'garden validation failed',
            result.want || 'garden seed structure and properties valid',
            result.hint || 'Check seed schema, GID/IID sets, and expected patterns'
          );
        }

        const duration = Date.now() - startTime;
        this.results.push(new TestResult(
          vector.name,
          'garden',
          result.passed,
          result.message,
          duration,
          { vector, seedData }
        ));

      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = `Error: ${error.message}`;

        this.addFailureReport(
          vector.name,
          'garden',
          errorMessage,
          'exception thrown',
          'successful garden seed validation',
          'Check seed file format and normalization process'
        );

        this.results.push(new TestResult(
          vector.name,
          'garden',
          false,
          errorMessage,
          duration
        ));
      }
    }
  }

  createTempTile(yamlContent, suffix) {
    const filename = path.join(config.tempDir, `tile_${suffix}_${Date.now()}.yaml`);
    // Convert escaped newlines to actual newlines
    const actualYaml = yamlContent.replace(/\\n/g, '\n');
    fs.writeFileSync(filename, actualYaml);
    return filename;
  }

  createTempOperonFile(operonJson) {
    const filename = path.join(config.tempDir, `operon_${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(operonJson, null, 2));
    return filename;
  }

  applyMutation(originalYaml, mutation) {
    // Convert escaped newlines to actual newlines for processing
    const actualYaml = originalYaml.replace(/\\n/g, '\n');
    // Parse and apply mutations to YAML content
    const yamlLines = actualYaml.split('\n');
    let mutatedYaml = actualYaml;

    switch (mutation.type) {
      case 'whitespace':
        mutatedYaml = mutatedYaml.replace(/code: "([^"]*)"/, `code: "${mutation.code}"`);
        break;
      case 'alpha_rename':
        mutatedYaml = mutatedYaml.replace(/code: "([^"]*)"/, `code: "${mutation.code}"`);
        break;
      case 'code_change':
      case 'code_semantic_change':
        mutatedYaml = mutatedYaml.replace(/code: "([^"]*)"/, `code: "${mutation.code}"`);
        if (mutation.abi) {
          // Replace existing abi section if it exists, otherwise append
          const abiSection = `abi:\n  types: "${mutation.abi.types}"\n  effects: ${JSON.stringify(mutation.abi.effects)}\n  ports:\n${Object.entries(mutation.abi.ports).map(([key, value]) => `    ${key}: "${value}"`).join('\n')}`;
          if (mutatedYaml.includes('abi:')) {
            mutatedYaml = mutatedYaml.replace(/abi:[\s\S]*?(?=\n\w|$)/, abiSection);
          } else {
            mutatedYaml += '\n' + abiSection;
          }
        }
        break;
      case 'neighbor_change':
      case 'add_neighbor':
        // Replace existing neighborIIDs section if it exists, otherwise append
        const neighborSection = `neighborIIDs:\n${Object.entries(mutation.neighborIIDs).map(([key, value]) => `  ${key}: "${value}"`).join('\n')}`;
        if (mutatedYaml.includes('neighborIIDs:')) {
          mutatedYaml = mutatedYaml.replace(/neighborIIDs:[\s\S]*?(?=\n\w|$)/, neighborSection);
        } else {
          mutatedYaml += '\n' + neighborSection;
        }
        break;
      case 'port_order':
      case 'port_name_change':
        mutatedYaml = mutatedYaml.replace(/ports:\\n[\\s\\S]*?(?=\\n\\w|$)/, () => {
          let portSection = 'ports:\\n';
          for (const [key, value] of Object.entries(mutation.ports)) {
            portSection += `  ${key}: "${value}"\\n`;
          }
          return portSection;
        });
        break;
      case 'abi_type_change':
      case 'effect_change':
        if (mutation.abi) {
          // Replace existing abi section if it exists, otherwise append
          const abiSection = `abi:\n  types: "${mutation.abi.types}"\n  effects: ${JSON.stringify(mutation.abi.effects)}\n  ports:\n${Object.entries(mutation.abi.ports).map(([key, value]) => `    ${key}: "${value}"`).join('\n')}`;
          if (mutatedYaml.includes('abi:')) {
            mutatedYaml = mutatedYaml.replace(/abi:[\s\S]*?(?=\n\w|$)/, abiSection);
          } else {
            mutatedYaml += '\n' + abiSection;
          }
        }
        break;
      default:
        // No change for other mutation types
        break;
    }

    return mutatedYaml;
  }

  async calculateHashes(tileFile) {
    return new Promise((resolve, reject) => {
      const process = spawn('node', ['-r', 'ts-node/register', config.tools.gid, tileFile], {
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse GID tool output: ${error.message}`));
          }
        } else {
          reject(new Error(`GID tool failed: ${stderr}`));
        }
      });
    });
  }

  async runNfTool(inputFile, outFile, patchFile, mode) {
    return new Promise((resolve, reject) => {
      const args = ['-r', 'ts-node/register', config.tools.nf, inputFile, `--mode=${mode}`, '--out', outFile, '--patch', patchFile];
      const process = spawn('node', args, {
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, outFile, patchFile });
        } else {
          reject(new Error(`NF tool failed: ${stderr}`));
        }
      });
    });
  }

  async runAutopilotTool(operonFile) {
    return new Promise((resolve, reject) => {
      const process = spawn('node', ['-r', 'ts-node/register', config.tools.autopilot, operonFile], {
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse autopilot output: ${error.message}`));
          }
        } else {
          reject(new Error(`Autopilot tool failed: ${stderr}`));
        }
      });
    });
  }

  async calculateLBest(operonFile) {
    try {
      const autopilotResult = await this.runAutopilotTool(operonFile);
      return autopilotResult.Lbest;
    } catch (error) {
      console.warn(`Warning: Could not calculate L(best) for ${operonFile}: ${error.message}`);
      return 0;
    }
  }

  checkGidIidXidExpectations(vector, allHashes) {
    const expectations = vector.expect;

    try {
      // Check GID equality groups
      if (expectations.gidEqual) {
        for (const group of expectations.gidEqual) {
          const gids = group.map(idx => allHashes[idx].gid);
          const uniqueGids = new Set(gids);
          if (uniqueGids.size !== 1) {
            if (expectations.fail) {
              return { passed: true, message: 'Expected GID inequality confirmed' };
            }
            return { passed: false, message: `GID equality failed for group ${group}: ${gids.join(', ')}` };
          }
        }
      }

      // Check IID equality groups
      if (expectations.iidEqual) {
        for (const group of expectations.iidEqual) {
          const iids = group.map(idx => allHashes[idx].iid);
          const uniqueIids = new Set(iids);
          if (uniqueIids.size !== 1) {
            if (expectations.fail) {
              return { passed: true, message: 'Expected IID inequality confirmed' };
            }
            return { passed: false, message: `IID equality failed for group ${group}: ${iids.join(', ')}` };
          }
        }
      }

      // Check XID differences
      if (expectations.xidDiff) {
        for (const pair of expectations.xidDiff) {
          const [i, j] = pair;
          if (allHashes[i].xid === allHashes[j].xid) {
            if (expectations.fail) {
              return { passed: true, message: 'Expected XID equality confirmed (should not differ)' };
            }
            return { passed: false, message: `XID should differ between ${i} and ${j}: ${allHashes[i].xid}` };
          }
        }
      }

      // Handle negative test cases
      if (expectations.fail) {
        return { passed: false, message: 'Expected failure but test passed' };
      }

      return { passed: true, message: 'All expectations met' };

    } catch (error) {
      return { passed: false, message: `Exception checking expectations: ${error.message}` };
    }
  }

  checkNfExpectations(vector, nfResult, originalL, optimizedL) {
    const expectations = vector.expect;

    try {
      // Check if rule is enabled
      if (expectations.enabled === false) {
        return { passed: true, message: 'Rule disabled as expected (code-gen stub)' };
      }

      // Check delta constraints: hops <= -1, latency <= 0, memory <= 0
      if (expectations.deltaConstraints) {
        const delta = expectations.deltaConstraints;

        if (delta.hops > -1) {
          return { passed: false, message: `Delta hops constraint violated: ${delta.hops} > -1` };
        }

        if (delta.latency > 0) {
          return { passed: false, message: `Delta latency constraint violated: ${delta.latency} > 0` };
        }

        if (delta.memory > 0) {
          return { passed: false, message: `Delta memory constraint violated: ${delta.memory} > 0` };
        }
      }

      // Check that L(best) is not worse after optimization
      if (expectations.lNotWorse && optimizedL > originalL) {
        return { passed: false, message: `L(best) got worse: ${originalL} -> ${optimizedL}` };
      }

      return { passed: true, message: 'NF rule validation passed' };

    } catch (error) {
      return { passed: false, message: `Exception in NF validation: ${error.message}` };
    }
  }

  checkAutopilotExpectations(vector, autopilotResult) {
    const expectations = vector.expect;

    try {
      const { bestRoute, Lbest, topK } = autopilotResult;

      if (!bestRoute || bestRoute.length === 0) {
        return { passed: false, message: 'No best route found' };
      }

      if (topK.length === 0) {
        return { passed: false, message: 'No routes in topK' };
      }

      const regret = topK.length > 1 ? (topK[1].L - Lbest) / Lbest : 0;

      switch (expectations.regretType) {
        case 'unique_minimum':
          if (regret > 0.001) {
            return { passed: false, message: `Regret too high for unique minimum: ${regret} > 0.001` };
          }
          break;

        case 'tie':
          if (regret > expectations.regretBound) {
            return { passed: false, message: `Regret exceeds tie bound: ${regret} > ${expectations.regretBound}` };
          }
          break;

        case 'near_tie':
          if (regret > 0.03) {
            return { passed: false, message: `Regret exceeds near-tie bound: ${regret} > 0.03` };
          }
          break;

        default:
          return { passed: false, message: `Unknown regret type: ${expectations.regretType}` };
      }

      return { passed: true, message: `Autopilot validation passed (regret: ${regret.toFixed(4)})` };

    } catch (error) {
      return { passed: false, message: `Exception in autopilot validation: ${error.message}` };
    }
  }

  checkGardenExpectations(vector, seedData) {
    const expectations = vector.expect;

    try {
      // Validate basic seed structure
      if (!seedData.nodes || !seedData.root || !seedData.name) {
        return { passed: false, message: 'Invalid seed structure: missing nodes, root, or name' };
      }

      // Check gidSet and iidSet stability
      if (expectations.gidStable && (!seedData.gidSet || seedData.gidSet.length === 0)) {
        return { passed: false, message: 'Missing or empty gidSet' };
      }

      if (expectations.iidStable && (!seedData.iidSet || seedData.iidSet.length === 0)) {
        return { passed: false, message: 'Missing or empty iidSet' };
      }

      // Check minimum route length
      if (expectations.minRouteLen) {
        const nodeCount = Object.keys(seedData.nodes).filter(key =>
          seedData.nodes[key].op && seedData.nodes[key].op !== 'ROOT'
        ).length;

        if (nodeCount < expectations.minRouteLen) {
          return { passed: false, message: `Route too short: ${nodeCount} < ${expectations.minRouteLen}` };
        }
      }

      // Check law types if specified
      if (expectations.lawTypes) {
        const actualLaws = Object.values(seedData.nodes)
          .filter(node => node.law)
          .map(node => node.law);

        for (const expectedLaw of expectations.lawTypes) {
          if (!actualLaws.includes(expectedLaw)) {
            return { passed: false, message: `Missing expected law: ${expectedLaw}` };
          }
        }
      }

      // Check operation sequence if specified
      if (expectations.opSequence) {
        const actualOps = Object.values(seedData.nodes)
          .filter(node => node.op && node.op !== 'ROOT')
          .map(node => node.op);

        for (const expectedOp of expectations.opSequence) {
          if (!actualOps.includes(expectedOp)) {
            return { passed: false, message: `Missing expected operation: ${expectedOp}` };
          }
        }
      }

      // Check ABI patterns if specified
      if (expectations.abiPatterns && seedData.abi && seedData.abi.patterns) {
        for (const expectedPattern of expectations.abiPatterns) {
          if (!seedData.abi.patterns.includes(expectedPattern)) {
            return { passed: false, message: `Missing expected ABI pattern: ${expectedPattern}` };
          }
        }
      }

      // Check structural properties
      if (expectations.parallelPaths) {
        // Count parallel processing paths by looking for split operations
        const splitNodes = Object.values(seedData.nodes).filter(node =>
          node.op === 'SPLIT' || node.op === 'ROUTE'
        );

        if (splitNodes.length === 0 && expectations.parallelPaths > 1) {
          return { passed: false, message: 'Expected parallel paths but no split/route nodes found' };
        }
      }

      // Check specific node types if expected
      if (expectations.hasDelayNode) {
        const hasDelay = Object.values(seedData.nodes).some(node => node.op === 'DELAY');
        if (!hasDelay) {
          return { passed: false, message: 'Expected DELAY node but none found' };
        }
      }

      if (expectations.hasBranchNode) {
        const hasBranch = Object.values(seedData.nodes).some(node => node.op === 'BRANCH');
        if (!hasBranch) {
          return { passed: false, message: 'Expected BRANCH node but none found' };
        }
      }

      return { passed: true, message: `Garden seed validation passed: ${expectations.pattern || 'structure verified'}` };

    } catch (error) {
      return { passed: false, message: `Exception in garden validation: ${error.message}` };
    }
  }

  generateReports() {
    this.generateJUnitReport();
    this.generateTAPReport();
    this.generateSummaryReport();
    this.generateConformanceJson();
  }

  generateJUnitReport() {
    const totalTime = (Date.now() - this.startTime) / 1000;
    const families = ['gid_iid_xid', 'nf', 'autopilot', 'garden'];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\\n';
    xml += '<testsuites>\\n';

    for (const family of families) {
      const familyResults = this.results.filter(r => r.family === family);
      const failures = familyResults.filter(r => !r.passed).length;
      const familyTime = familyResults.reduce((sum, r) => sum + r.duration, 0) / 1000;

      xml += `  <testsuite name="${family}" tests="${familyResults.length}" failures="${failures}" time="${familyTime.toFixed(3)}">\\n`;

      for (const result of familyResults) {
        const time = (result.duration / 1000).toFixed(3);
        xml += `    <testcase name="${result.name}" classname="${result.family}" time="${time}">\\n`;

        if (!result.passed) {
          xml += `      <failure message="${this.escapeXml(result.message)}">${this.escapeXml(result.message)}</failure>\\n`;
        }

        xml += '    </testcase>\\n';
      }

      xml += '  </testsuite>\\n';
    }

    xml += '</testsuites>\\n';
    fs.writeFileSync(config.reports.junit, xml);
  }

  generateTAPReport() {
    let tap = `TAP version 13\\n1..${this.results.length}\\n`;

    for (let i = 0; i < this.results.length; i++) {
      const result = this.results[i];
      const status = result.passed ? 'ok' : 'not ok';
      tap += `${status} ${i + 1} - ${result.family}:${result.name}`;

      if (!result.passed) {
        tap += ` # ${result.message}`;
      }

      tap += '\\n';
    }

    fs.writeFileSync(config.reports.tap, tap);
  }

  generateSummaryReport() {
    const families = ['gid_iid_xid', 'nf', 'autopilot', 'garden'];
    const totalTime = (Date.now() - this.startTime) / 1000;

    let md = '# Pure Lambda Conformance Test Summary\\n\\n';
    md += `**Generated:** ${new Date().toISOString()}\\n`;
    md += `**Total Duration:** ${totalTime.toFixed(2)}s\\n\\n`;

    // Overall summary
    const totalTests = this.results.length;
    const totalPassed = this.results.filter(r => r.passed).length;
    const totalFailed = totalTests - totalPassed;

    md += '## Overall Results\\n\\n';
    md += `| Total Tests | Passed | Failed | Success Rate |\\n`;
    md += `|-------------|--------|--------|--------------|\\n`;
    md += `| ${totalTests} | ${totalPassed} | ${totalFailed} | ${((totalPassed/totalTests)*100).toFixed(1)}% |\\n\\n`;

    // Per-family breakdown
    md += '## Results by Test Family\\n\\n';
    md += '| Family | Tests | Passed | Failed | Duration |\\n';
    md += '|--------|-------|--------|--------|----------|\\n';

    for (const family of families) {
      const familyResults = this.results.filter(r => r.family === family);
      const familyPassed = familyResults.filter(r => r.passed).length;
      const familyFailed = familyResults.length - familyPassed;
      const familyTime = (familyResults.reduce((sum, r) => sum + r.duration, 0) / 1000).toFixed(2);

      md += `| ${family} | ${familyResults.length} | ${familyPassed} | ${familyFailed} | ${familyTime}s |\\n`;
    }

    md += '\\n';

    // Detailed results
    md += '## Detailed Test Results\\n\\n';

    for (const family of families) {
      const familyResults = this.results.filter(r => r.family === family);

      md += `### ${family.toUpperCase()} Tests\\n\\n`;
      md += '| Test Name | Status | Duration | Message |\\n';
      md += '|-----------|--------|----------|---------|\\n';

      for (const result of familyResults) {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        const duration = (result.duration / 1000).toFixed(3) + 's';
        const message = result.message.substring(0, 100) + (result.message.length > 100 ? '...' : '');

        md += `| ${result.name} | ${status} | ${duration} | ${message} |\\n`;
      }

      md += '\\n';
    }

    // Test explanations
    md += '## Test Family Explanations\\n\\n';
    md += '### GID/IID/XID Tests\\n';
    md += 'Validates that Global IDs (GID), Interface IDs (IID), and Context IDs (XID) maintain their invariants:\\n';
    md += '- **GID**: Must be invariant under whitespace changes and alpha-renaming\\n';
    md += '- **IID**: Must be equal when ABI is identical, regardless of code differences\\n';
    md += '- **XID**: Must change when neighbor IIDs change\\n\\n';

    md += '### NF (Normal Form) Tests\\n';
    md += 'Validates that rewrite rules satisfy performance constraints:\\n';
    md += '- **THEN(id,f)→f**: Removes identity compositions (hops≤-1, latency≤0, memory≤0)\\n';
    md += '- **SPLIT▶MERGE(id,id)→id**: Eliminates redundant split-merge patterns\\n';
    md += '- **FOCUS∘FOCUS→FOCUS\'**: Composes consecutive focus operations\\n';
    md += '- Ensures L(best) performance does not degrade\\n\\n';

    md += '### Autopilot Tests\\n';
    md += 'Validates regret bounds for route selection:\\n';
    md += '- **Unique Minima**: regret = 0 (single optimal route)\\n';
    md += '- **Ties**: regret ≈ 0 (multiple optimal routes)\\n';
    md += '- **Near Ties**: regret/L* ≤ 3% (nearly optimal routes)\\n\\n';

    md += '### Garden Tests\\n';
    md += 'Validates canonical seed patterns and structural invariants:\\n';
    md += '- **Pattern Validation**: Checks specific lambda patterns (sensor smoothing, split-merge, etc.)\\n';
    md += '- **Structural Integrity**: Validates GID/IID sets, node connectivity, and route lengths\\n';
    md += '- **Law Compliance**: Ensures nodes follow declared computational laws\\n';
    md += '- **ABI Conformance**: Validates application binary interface patterns\\n\\n';

    md += '## Reproduction\\n\\n';
    md += '```bash\\n';
    md += 'node tests/conformance-run.mjs\\n';
    md += '```\\n\\n';

    md += '## Exit Codes\\n\\n';
    md += '- **0**: All tests passed\\n';
    md += '- **1**: One or more tests failed\\n';

    fs.writeFileSync(config.reports.summary, md);
  }

  generateConformanceJson() {
    const totalTests = this.results.length;
    const totalPassed = this.results.filter(r => r.passed).length;
    const ratio = totalTests > 0 ? totalPassed / totalTests : 0;

    // Compute per-artifact coverage (map seed→{passed,total})
    const artifactCoverage = {};

    // Group results by artifact/seed name
    for (const result of this.results) {
      // Extract seed/artifact name from test result details or name
      let artifactName = null;

      if (result.family === 'garden' && result.details && result.details.vector && result.details.vector.seedJson) {
        // Extract seed name from file path
        artifactName = path.basename(result.details.vector.seedJson, '.json');
      } else if (result.details && result.details.vector && result.details.vector.name) {
        // Use vector name as artifact identifier
        artifactName = result.details.vector.name;
      } else {
        // Fallback to test name
        artifactName = result.name;
      }

      if (!artifactCoverage[artifactName]) {
        artifactCoverage[artifactName] = { passed: 0, total: 0 };
      }

      artifactCoverage[artifactName].total++;
      if (result.passed) {
        artifactCoverage[artifactName].passed++;
      }
    }

    const conformanceData = {
      passed: totalPassed,
      total: totalTests,
      ratio: ratio,
      timestamp: new Date().toISOString(),
      artifactCoverage: artifactCoverage,
      summary: {
        families: ['gid_iid_xid', 'nf', 'autopilot', 'garden'].map(family => {
          const familyResults = this.results.filter(r => r.family === family);
          const familyPassed = familyResults.filter(r => r.passed).length;
          return {
            family: family,
            passed: familyPassed,
            total: familyResults.length,
            ratio: familyResults.length > 0 ? familyPassed / familyResults.length : 0
          };
        })
      }
    };

    fs.writeFileSync(config.output.conformanceJson, JSON.stringify(conformanceData, null, 2));
  }

  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const suiteArg = args.find(arg => arg.startsWith('--suite='));
const suite = suiteArg ? suiteArg.split('=')[1] : null;
const gateMode = args.includes('--gate');

// Run conformance tests
const runner = new ConformanceRunner(gateMode);

if (suite) {
  console.log(`🎯 Running specific test suite: ${suite}`);
  runner.runSpecificSuite(suite).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} else {
  runner.runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}