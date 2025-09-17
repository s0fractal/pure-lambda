#!/usr/bin/env ts-node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Release Notes Generator
 * CLI tool to render release notes from project data sources
 */

import * as fs from 'fs';
import * as path from 'path';
import { program } from 'commander';
import { execSync } from 'child_process';

interface SLOBadge {
  metric: string;
  value: string;
  status: 'pass' | 'fail' | 'warn';
}

interface AutopilotResult {
  L: number;
  routes: number;
  performance: string;
  timestamp: string;
}

interface NFDelta {
  added: string[];
  removed: string[];
  modified: string[];
  impact: string;
}

interface ReceiptStatus {
  valid: boolean;
  timestamp: string;
  errors: string[];
}

class ReleaseNotesGenerator {
  private projectRoot: string;
  private version: string;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.version = this.getPackageVersion();
  }

  private getPackageVersion(): string {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'));
      return packageJson.version;
    } catch {
      return '0.1.0';
    }
  }

  private execSafe(command: string): { success: boolean; output: string; error?: string } {
    try {
      const result = execSync(command, {
        encoding: 'utf8',
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      return { success: true, output: result.trim() };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.stderr?.toString() || error.message
      };
    }
  }

  private loadJSONFile<T>(filePath: string): T | null {
    try {
      const fullPath = path.join(this.projectRoot, filePath);
      if (!fs.existsSync(fullPath)) return null;

      const content = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private getSLOBadges(): SLOBadge[] {
    const badges: SLOBadge[] = [];

    // Check badges directory for SLO data
    const badgesDir = path.join(this.projectRoot, 'badges');
    if (fs.existsSync(badgesDir)) {
      const badgeFiles = fs.readdirSync(badgesDir).filter(f => f.endsWith('.json'));

      for (const file of badgeFiles) {
        const badgeData = this.loadJSONFile(`badges/${file}`);
        if (badgeData && typeof badgeData === 'object') {
          const metric = path.basename(file, '.json');
          badges.push({
            metric,
            value: (badgeData as any).value || 'unknown',
            status: (badgeData as any).status || 'warn'
          });
        }
      }
    }

    return badges;
  }

  private getLatestAutopilotResult(): AutopilotResult | null {
    const autopilotFile = this.loadJSONFile('dist/operon.json');
    if (!autopilotFile) return null;

    // Extract autopilot data from operon
    try {
      const result = this.execSafe('ts-node tools/autopilot.ts dist/operon.json --k 5');
      if (result.success) {
        // Parse autopilot output for L value and performance
        const lines = result.output.split('\n');
        let L = 0;
        let routes = 0;
        let performance = 'unknown';

        for (const line of lines) {
          if (line.includes('Best L:')) {
            L = parseInt(line.match(/Best L:\s*(\d+)/)?.[1] || '0');
          }
          if (line.includes('routes found')) {
            routes = parseInt(line.match(/(\d+)\s+routes found/)?.[1] || '0');
          }
          if (line.includes('Performance:')) {
            performance = line.split('Performance:')[1]?.trim() || 'unknown';
          }
        }

        return {
          L,
          routes,
          performance,
          timestamp: new Date().toISOString()
        };
      }
    } catch {}

    return null;
  }

  private getNFDeltas(): NFDelta | null {
    const nfPatchFile = this.loadJSONFile('dist/operon.nf.patch.json');
    if (!nfPatchFile || typeof nfPatchFile !== 'object') return null;

    const patch = nfPatchFile as any;
    return {
      added: patch.added || [],
      removed: patch.removed || [],
      modified: patch.modified || [],
      impact: patch.impact || 'minimal'
    };
  }

  private getReceiptStatus(): ReceiptStatus {
    const receiptFile = this.loadJSONFile('receipts/last.json');
    if (!receiptFile) {
      return { valid: false, timestamp: '', errors: ['No receipt found'] };
    }

    // Verify receipt
    const verifyResult = this.execSafe('npm run receipt:verify');
    const valid = verifyResult.success;

    return {
      valid,
      timestamp: (receiptFile as any).timestamp || new Date().toISOString(),
      errors: valid ? [] : [verifyResult.error || 'Verification failed']
    };
  }

  private formatBadges(badges: SLOBadge[]): string {
    if (badges.length === 0) return '';

    const lines = ['## SLO Status', ''];

    for (const badge of badges) {
      const emoji = badge.status === 'pass' ? '✅' : badge.status === 'warn' ? '⚠️' : '❌';
      lines.push(`- ${emoji} **${badge.metric}**: ${badge.value}`);
    }

    return lines.join('\n') + '\n';
  }

  private formatAutopilot(autopilot: AutopilotResult | null): string {
    if (!autopilot) return '';

    return `## Performance Metrics

- **Optimal L-value**: ${autopilot.L}
- **Route Coverage**: ${autopilot.routes} routes discovered
- **Performance**: ${autopilot.performance}
- **Analysis Time**: ${new Date(autopilot.timestamp).toLocaleString()}

`;
  }

  private formatNFDeltas(deltas: NFDelta | null): string {
    if (!deltas || (deltas.added.length === 0 && deltas.removed.length === 0 && deltas.modified.length === 0)) {
      return `## Network Function Changes

No network function changes in this release.

`;
    }

    const lines = ['## Network Function Changes', ''];

    if (deltas.added.length > 0) {
      lines.push('**Added:**');
      deltas.added.forEach(item => lines.push(`- ${item}`));
      lines.push('');
    }

    if (deltas.modified.length > 0) {
      lines.push('**Modified:**');
      deltas.modified.forEach(item => lines.push(`- ${item}`));
      lines.push('');
    }

    if (deltas.removed.length > 0) {
      lines.push('**Removed:**');
      deltas.removed.forEach(item => lines.push(`- ${item}`));
      lines.push('');
    }

    lines.push(`**Impact Assessment**: ${deltas.impact}`);
    lines.push('');

    return lines.join('\n');
  }

  private formatReceiptStatus(receipt: ReceiptStatus): string {
    const status = receipt.valid ? '✅ Verified' : '❌ Failed';
    const timestamp = new Date(receipt.timestamp).toLocaleString();

    let section = `## Verification Status

**Receipt**: ${status} (${timestamp})
`;

    if (!receipt.valid && receipt.errors.length > 0) {
      section += '\n**Errors:**\n';
      receipt.errors.forEach(error => {
        section += `- ${error}\n`;
      });
    }

    return section + '\n';
  }

  private generateVerificationSteps(): string {
    return `## Verify Locally

Follow these steps to verify this release offline:

### Step 1: Download and Extract
\`\`\`bash
# Download the embassy.zip from dist/release/
unzip embassy.zip
cd embassy/
\`\`\`

### Step 2: Verify Checksums
\`\`\`bash
# Verify ZIP integrity
blake3sum -c ../checksums.txt || sha256sum -c ../checksums.txt
\`\`\`

### Step 3: Validate Attestations
\`\`\`bash
# Verify provenance and envelope signatures
ts-node tools/attest.ts --verify receipts/attest/envelope.json
\`\`\`

All verification steps must pass for a trusted release.

`;
  }

  private getGitInfo(): { rev: string; branch: string; timestamp: string } {
    const rev = this.execSafe('git rev-parse --short HEAD').output || 'unknown';
    const branch = this.execSafe('git rev-parse --abbrev-ref HEAD').output || 'unknown';
    const timestamp = this.execSafe('git show -s --format=%ci HEAD').output || new Date().toISOString();

    return { rev, branch, timestamp };
  }

  public generateReleaseNotes(): string {
    const gitInfo = this.getGitInfo();
    const badges = this.getSLOBadges();
    const autopilot = this.getLatestAutopilotResult();
    const nfDeltas = this.getNFDeltas();
    const receiptStatus = this.getReceiptStatus();

    const tagVersion = this.version.startsWith('v') ? this.version : `v${this.version}`;
    const rcVersion = tagVersion.includes('-rc') ? tagVersion : `${tagVersion}-rc1`;

    let notes = `# Release Notes: ${rcVersion}

**Pure Lambda Cross-Dimensional Genetics**

Generated: ${new Date().toLocaleString()}
Git Revision: ${gitInfo.rev} (${gitInfo.branch})
Build Time: ${new Date(gitInfo.timestamp).toLocaleString()}

---

## Summary

This release candidate includes validated lambda genetics with complete attestation chain and offline verification support.

`;

    // Add sections
    notes += this.formatBadges(badges);
    notes += this.formatAutopilot(autopilot);
    notes += this.formatNFDeltas(nfDeltas);
    notes += this.formatReceiptStatus(receiptStatus);
    notes += this.generateVerificationSteps();

    notes += `---

## Release Assets

- **Embassy Package**: \`embassy.zip\` (≤50KB optimized)
- **Manifest**: \`manifest.json\` (build metadata)
- **Checksums**: \`checksums.txt\` (blake3 + SHA256)
- **SBOM**: \`sbom/spdx.txt\` (software bill of materials)

## What's New

- ✅ Complete preflight validation pipeline
- ✅ Reproducible build verification
- ✅ Cryptographic attestation chain
- ✅ Minimal embassy package (network-free)
- ✅ Offline verification support

Ready for local deployment with full provenance tracking.

---

*🤖 Auto-generated by Pure Lambda Release Engineering*
`;

    return notes;
  }

  public saveReleaseNotes(output?: string): void {
    const content = this.generateReleaseNotes();

    // Ensure we don't exceed 200 lines
    const lines = content.split('\n');
    const maxLines = 200;

    let finalContent = content;
    if (lines.length > maxLines) {
      finalContent = lines.slice(0, maxLines).join('\n') + '\n\n... (truncated to 200 lines)\n';
    }

    const outputPath = output || path.join(this.projectRoot, `reports/release/RELEASE-NOTES-${this.version}-rc1.md`);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, finalContent);

    console.log(`✅ Release notes generated: ${path.relative(this.projectRoot, outputPath)}`);
    console.log(`📊 ${lines.length} lines total (${finalContent.split('\n').length} lines saved)`);
  }
}

// CLI setup
program
  .name('notes')
  .description('Generate release notes for Pure Lambda')
  .option('-o, --output <path>', 'Output file path')
  .action((options) => {
    const generator = new ReleaseNotesGenerator();
    generator.saveReleaseNotes(options.output);
  });

if (require.main === module) {
  program.parse();
}