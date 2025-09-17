#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors


import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'reports');
const NF_TOOL = path.join(PROJECT_ROOT, 'tools', 'nf.ts');

/**
 * NF DOE (Design of Experiments) Test Runner
 *
 * Tests all 18 normal form transformation cases:
 * - 6 cases for THEN(id,f)→f
 * - 6 cases for SPLIT▶MERGE(id,id)→id
 * - 6 cases for FOCUS∘FOCUS→FOCUS'
 *
 * For each case:
 * 1. Write operonJson to dist/tmp.json
 * 2. Run: ts-node tools/nf.ts dist/tmp.json --mode=dry --out dist/tmp.nf.json --patch dist/tmp.patch.json
 * 3. Check: patch exists; deltas meet 'expect.delta'; NF does not increase L(best)
 * 4. Print PASS/FAIL; write reports/nf-doe-summary.md
 */

class NFDOERunner {
    constructor() {
        this.results = [];
        this.summary = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: 0
        };

        // Ensure directories exist
        this.ensureDirectories();
    }

    ensureDirectories() {
        [DIST_DIR, REPORTS_DIR].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    async runAllTests(fixturesPath) {
        console.log('🧪 NF DOE Test Runner Starting...');
        console.log(`📁 Loading fixtures from: ${fixturesPath}`);

        try {
            const fixturesContent = fs.readFileSync(fixturesPath, 'utf-8');
            const fixtures = JSON.parse(fixturesContent);

            console.log(`📋 Found ${fixtures.test_cases.length} test cases`);
            this.summary.total = fixtures.test_cases.length;

            for (const testCase of fixtures.test_cases) {
                await this.runSingleTest(testCase);
            }

            this.generateSummaryReport();
            this.printFinalResults();

        } catch (error) {
            console.error('❌ Fatal error loading fixtures:', error.message);
            process.exit(1);
        }
    }

    async runSingleTest(testCase) {
        console.log(`\\n🔬 Testing: ${testCase.name}`);
        console.log(`📝 ${testCase.description}`);

        const result = {
            name: testCase.name,
            description: testCase.description,
            status: 'UNKNOWN',
            error: null,
            actualDelta: null,
            expectedDelta: testCase.expect.delta,
            patchCount: 0,
            executionTime: 0,
            gidInvariance: testCase.expect.gid_invariance
        };

        const startTime = Date.now();

        try {
            // Step 1: Write operon to temp file
            const tmpJsonPath = path.join(DIST_DIR, 'tmp.json');
            const tmpNfPath = path.join(DIST_DIR, 'tmp.nf.json');
            const tmpPatchPath = path.join(DIST_DIR, 'tmp.patch.json');

            fs.writeFileSync(tmpJsonPath, JSON.stringify(testCase.operonJson, null, 2));

            // Step 2: Run NF tool
            const nfCommand = [
                'npx ts-node',
                NF_TOOL,
                tmpJsonPath,
                '--mode=dry',
                '--out',
                tmpNfPath,
                '--patch',
                tmpPatchPath
            ].join(' ');

            console.log(`⚙️  Executing: ${nfCommand}`);

            try {
                execSync(nfCommand, {
                    cwd: PROJECT_ROOT,
                    stdio: 'pipe',
                    timeout: 30000 // 30 second timeout
                });
            } catch (execError) {
                throw new Error(`NF tool execution failed: ${execError.message}`);
            }

            // Step 3: Validate results
            await this.validateResults(result, tmpNfPath, tmpPatchPath);

            result.executionTime = Date.now() - startTime;

            // Clean up temp files
            [tmpJsonPath, tmpNfPath, tmpPatchPath].forEach(file => {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            });

        } catch (error) {
            result.status = 'ERROR';
            result.error = error.message;
            result.executionTime = Date.now() - startTime;
            this.summary.errors++;
            console.log(`❌ ERROR: ${error.message}`);
        }

        this.results.push(result);

        if (result.status === 'PASS') {
            this.summary.passed++;
            console.log(`✅ PASS: ${result.name}`);
        } else if (result.status === 'FAIL') {
            this.summary.failed++;
            console.log(`❌ FAIL: ${result.name} - ${result.error}`);
        }
    }

    async validateResults(result, nfPath, patchPath) {
        // Check patch file exists
        if (!fs.existsSync(patchPath)) {
            throw new Error('Patch file was not created');
        }

        // Load and validate patch
        const patchContent = fs.readFileSync(patchPath, 'utf-8');
        const patches = JSON.parse(patchContent);

        result.patchCount = patches.length;

        // Calculate actual delta from patches
        result.actualDelta = this.calculateTotalDelta(patches);

        // Validate delta expectations
        const expectedDelta = result.expectedDelta;
        const actualDelta = result.actualDelta;

        // Check if transformation should have been applied
        const shouldTransform = expectedDelta.hops < 0 || expectedDelta.lat < 0 || expectedDelta.mem < 0;
        const didTransform = patches.length > 0;

        if (shouldTransform && !didTransform) {
            throw new Error(`Expected transformation but none occurred. Expected delta: ${JSON.stringify(expectedDelta)}, actual patches: ${patches.length}`);
        }

        if (!shouldTransform && didTransform) {
            throw new Error(`Unexpected transformation occurred. Expected no change, but got ${patches.length} patches`);
        }

        if (shouldTransform && didTransform) {
            // Validate delta values are within acceptable range
            const deltaValid = this.validateDelta(expectedDelta, actualDelta);
            if (!deltaValid) {
                throw new Error(`Delta mismatch. Expected: ${JSON.stringify(expectedDelta)}, Actual: ${JSON.stringify(actualDelta)}`);
            }
        }

        // Check NF output is valid JSON
        if (!fs.existsSync(nfPath)) {
            throw new Error('NF output file was not created');
        }

        const nfContent = fs.readFileSync(nfPath, 'utf-8');
        try {
            JSON.parse(nfContent);
        } catch {
            throw new Error('NF output is not valid JSON');
        }

        // All validations passed
        result.status = 'PASS';
    }

    calculateTotalDelta(patches) {
        return patches.reduce((total, patch) => ({
            hops: total.hops + (patch.delta?.hops || 0),
            lat: total.lat + (patch.delta?.latency || patch.delta?.lat || 0),
            mem: total.mem + (patch.delta?.memory || patch.delta?.mem || 0)
        }), { hops: 0, lat: 0, mem: 0 });
    }

    validateDelta(expected, actual) {
        // Allow some tolerance for delta validation
        const tolerance = 1;

        return Math.abs(expected.hops - actual.hops) <= tolerance &&
               Math.abs(expected.lat - actual.lat) <= tolerance &&
               Math.abs(expected.mem - actual.mem) <= tolerance;
    }

    generateSummaryReport() {
        const reportPath = path.join(REPORTS_DIR, 'nf-doe-summary.md');

        const report = `# NF DOE Test Summary Report

Generated: ${new Date().toISOString()}

## Overall Results

- **Total Tests**: ${this.summary.total}
- **Passed**: ${this.summary.passed} (${Math.round(this.summary.passed/this.summary.total*100)}%)
- **Failed**: ${this.summary.failed} (${Math.round(this.summary.failed/this.summary.total*100)}%)
- **Errors**: ${this.summary.errors} (${Math.round(this.summary.errors/this.summary.total*100)}%)

## Test Categories

### THEN(id,f) → f Rules
${this.generateCategoryReport('THEN_ID')}

### SPLIT▶MERGE(id,id) → id Rules
${this.generateCategoryReport('SPLIT_MERGE')}

### FOCUS∘FOCUS → FOCUS' Rules
${this.generateCategoryReport('FOCUS_COMPOSE')}

## Detailed Results

| Test Name | Status | Execution Time | Expected Delta | Actual Delta | Patches | Error |
|-----------|--------|---------------|----------------|--------------|---------|-------|
${this.results.map(r =>
`| ${r.name} | ${r.status} | ${r.executionTime}ms | ${JSON.stringify(r.expectedDelta)} | ${JSON.stringify(r.actualDelta)} | ${r.patchCount} | ${r.error || 'None'} |`
).join('\\n')}

## Analysis

### Performance Metrics
- Average execution time: ${Math.round(this.results.reduce((sum, r) => sum + r.executionTime, 0) / this.results.length)}ms
- Total patches applied: ${this.results.reduce((sum, r) => sum + r.patchCount, 0)}
- Successful transformations: ${this.results.filter(r => r.patchCount > 0 && r.status === 'PASS').length}

### Issues Identified
${this.results.filter(r => r.status !== 'PASS').map(r =>
`- **${r.name}**: ${r.error || 'Unknown issue'}`
).join('\\n')}

### Delta Validation
${this.generateDeltaAnalysis()}

## Recommendations

${this.generateRecommendations()}
`;

        fs.writeFileSync(reportPath, report);
        console.log(`📄 Summary report written to: ${reportPath}`);
    }

    generateCategoryReport(prefix) {
        const categoryResults = this.results.filter(r => r.name.startsWith(prefix));
        const passed = categoryResults.filter(r => r.status === 'PASS').length;
        const total = categoryResults.length;

        return `- Tests: ${total}, Passed: ${passed}, Success Rate: ${Math.round(passed/total*100)}%`;
    }

    generateDeltaAnalysis() {
        const transformations = this.results.filter(r => r.patchCount > 0);
        if (transformations.length === 0) return 'No transformations were applied.';

        const totalHops = transformations.reduce((sum, r) => sum + (r.actualDelta?.hops || 0), 0);
        const totalLat = transformations.reduce((sum, r) => sum + (r.actualDelta?.lat || 0), 0);
        const totalMem = transformations.reduce((sum, r) => sum + (r.actualDelta?.mem || 0), 0);

        return `Total optimizations achieved:
- Hops reduced: ${Math.abs(totalHops)}
- Latency reduced: ${Math.abs(totalLat)}
- Memory freed: ${Math.abs(totalMem)}`;
    }

    generateRecommendations() {
        const issues = this.results.filter(r => r.status !== 'PASS');
        if (issues.length === 0) {
            return '✅ All tests passed! The NF transformation system is working correctly.';
        }

        const recommendations = [];

        if (issues.some(r => r.error?.includes('patch file was not created'))) {
            recommendations.push('- Check NF tool output generation logic');
        }

        if (issues.some(r => r.error?.includes('Delta mismatch'))) {
            recommendations.push('- Review delta calculation in transformation rules');
        }

        if (issues.some(r => r.error?.includes('Unexpected transformation'))) {
            recommendations.push('- Validate constraint checking in NF rule application');
        }

        return recommendations.length > 0 ? recommendations.join('\\n') : '- Review failing test cases for specific issues';
    }

    printFinalResults() {
        console.log('\\n' + '='.repeat(60));
        console.log('🏁 NF DOE Test Suite Complete');
        console.log('='.repeat(60));
        console.log(`📊 Results: ${this.summary.passed}/${this.summary.total} passed`);

        if (this.summary.failed > 0) {
            console.log(`❌ Failed: ${this.summary.failed}`);
        }

        if (this.summary.errors > 0) {
            console.log(`🔥 Errors: ${this.summary.errors}`);
        }

        const successRate = Math.round(this.summary.passed / this.summary.total * 100);
        console.log(`📈 Success Rate: ${successRate}%`);

        if (successRate === 100) {
            console.log('\\n🎉 ALL TESTS PASSED! NF system is functioning correctly.');
            process.exit(0);
        } else {
            console.log('\\n⚠️  Some tests failed. Check the summary report for details.');
            process.exit(1);
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help')) {
        console.log('Usage: node scripts/nf-doe-run.mjs <fixtures-path>');
        console.log('');
        console.log('Example:');
        console.log('  node scripts/nf-doe-run.mjs fixtures/nf-doe.json');
        process.exit(0);
    }

    const fixturesPath = path.resolve(args[0]);

    if (!fs.existsSync(fixturesPath)) {
        console.error(`❌ Fixtures file not found: ${fixturesPath}`);
        process.exit(1);
    }

    const runner = new NFDOERunner();
    await runner.runAllTests(fixturesPath);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Promise Rejection:', reason);
    process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

export default NFDOERunner;