#!/usr/bin/env node

/**
 * LoA3 Promotion Checker
 * Checks if system is ready for Level of Autonomy 3 promotion
 *
 * Requirements:
 * - Hit-rate ≥85%
 * - Regret ≤3%
 * - 0 BIOLOCK/Quarantine failures
 *
 * Outputs whether system is ready for LoA3
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';

const SHADOW_CSV = 'reports/autonomy/shadow.csv';
const REGRET_REPORTS = 'reports/autopilot';
const QUARANTINE_REPORTS = 'reports/quarantine';

function readLatestCSVData(csvPath) {
    try {
        if (!existsSync(csvPath)) {
            return null;
        }

        const csvContent = readFileSync(csvPath, 'utf8');
        const lines = csvContent.trim().split('\n');

        if (lines.length < 2) { // Header + at least one data row
            return null;
        }

        // Get the last data row
        const lastLine = lines[lines.length - 1];
        const [timestamp, hitRate, totalDecisions, matches] = lastLine.split(',');

        return {
            timestamp,
            hitRate: parseFloat(hitRate),
            totalDecisions: parseInt(totalDecisions),
            matches: parseInt(matches)
        };
    } catch (error) {
        console.error(`Error reading CSV ${csvPath}:`, error.message);
        return null;
    }
}

function getLatestRegretData() {
    try {
        if (!existsSync(REGRET_REPORTS)) {
            return null;
        }

        const files = readFileSync(REGRET_REPORTS, 'utf8')
            .split('\n')
            .filter(f => f.includes('regret') && f.endsWith('.json'))
            .sort()
            .reverse();

        if (files.length === 0) {
            return null;
        }

        const latestFile = path.join(REGRET_REPORTS, files[0]);
        if (!existsSync(latestFile)) {
            return null;
        }

        const regretData = JSON.parse(readFileSync(latestFile, 'utf8'));
        return regretData.regret || null;
    } catch (error) {
        console.error('Error reading regret data:', error.message);
        return null;
    }
}

function getQuarantineFailures() {
    try {
        if (!existsSync(QUARANTINE_REPORTS)) {
            return null;
        }

        const statusFile = path.join(QUARANTINE_REPORTS, 'status.json');
        if (!existsSync(statusFile)) {
            return null;
        }

        const quarantineData = JSON.parse(readFileSync(statusFile, 'utf8'));

        // Count BIOLOCK and quarantine failures
        const biolockFailures = quarantineData.biolock?.failures || 0;
        const quarantineFailures = quarantineData.quarantine?.count || 0;

        return biolockFailures + quarantineFailures;
    } catch (error) {
        console.error('Error reading quarantine data:', error.message);
        return null;
    }
}

function checkLoA3Readiness() {
    console.log('🔍 Checking LoA3 promotion eligibility...\n');

    // Check hit-rate from shadow monitoring
    const shadowData = readLatestCSVData(SHADOW_CSV);
    const hitRate = shadowData?.hitRate || null;
    const hitRateOK = hitRate !== null && hitRate >= 85;

    console.log(`📊 Hit-rate: ${hitRate !== null ? hitRate.toFixed(1) + '%' : 'No data'}`);
    console.log(`   Requirement: ≥85% ${hitRateOK ? '✅' : '❌'}`);

    // Check regret rate
    const regret = getLatestRegretData();
    const regretOK = regret !== null && regret <= 3;

    console.log(`\n📉 Regret: ${regret !== null ? regret.toFixed(1) + '%' : 'No data'}`);
    console.log(`   Requirement: ≤3% ${regretOK ? '✅' : '❌'}`);

    // Check quarantine failures
    const quarantineFailures = getQuarantineFailures();
    const quarantineOK = quarantineFailures !== null && quarantineFailures === 0;

    console.log(`\n🔒 BIOLOCK/Quarantine failures: ${quarantineFailures !== null ? quarantineFailures : 'No data'}`);
    console.log(`   Requirement: 0 failures ${quarantineOK ? '✅' : '❌'}`);

    // Overall assessment
    const allCriteriaMet = hitRateOK && regretOK && quarantineOK;
    const hasAllData = hitRate !== null && regret !== null && quarantineFailures !== null;

    console.log('\n' + '='.repeat(50));

    if (!hasAllData) {
        console.log('⚠️  INSUFFICIENT DATA - Cannot assess LoA3 readiness');
        console.log('   Missing required metrics for promotion assessment');
        return false;
    }

    if (allCriteriaMet) {
        console.log('🎉 READY FOR LoA3 PROMOTION!');
        console.log('   All criteria met - system eligible for Level 3 autonomy');
        return true;
    } else {
        console.log('❌ NOT READY for LoA3 promotion');
        console.log('   One or more criteria not met');

        // Detailed feedback
        if (!hitRateOK) {
            console.log(`   • Improve hit-rate: ${hitRate?.toFixed(1)}% → ≥85%`);
        }
        if (!regretOK) {
            console.log(`   • Reduce regret: ${regret?.toFixed(1)}% → ≤3%`);
        }
        if (!quarantineOK) {
            console.log(`   • Resolve quarantine failures: ${quarantineFailures} → 0`);
        }

        return false;
    }
}

function main() {
    try {
        const ready = checkLoA3Readiness();
        process.exit(ready ? 0 : 1);
    } catch (error) {
        console.error('❌ LoA3 promotion check failed:', error.message);
        process.exit(2);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}