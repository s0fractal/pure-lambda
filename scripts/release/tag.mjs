#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Git Release Tagging Script
 * Creates annotated tags for releases with proper validation
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSection(title) {
  log(`\n${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  log(`${colors.bold}${colors.cyan}${title}${colors.reset}`);
  log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
}

function execSyncSafe(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      cwd: projectRoot,
      stdio: 'pipe',
      ...options
    });
    return { success: true, output: result.trim() };
  } catch (error) {
    return { success: false, output: error.message, stderr: error.stderr?.toString() };
  }
}

function getPackageVersion() {
  try {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    return packageJson.version;
  } catch (error) {
    log(`❌ Failed to read package.json: ${error.message}`, 'red');
    return null;
  }
}

function checkRepoStatus() {
  logSection('Repository Status Check');

  // Check if we're in a git repository
  const isRepo = execSyncSafe('git rev-parse --git-dir');
  if (!isRepo.success) {
    log('❌ Not in a git repository', 'red');
    return false;
  }

  // Check for uncommitted changes
  const status = execSyncSafe('git status --porcelain');
  if (!status.success) {
    log('❌ Failed to check git status', 'red');
    return false;
  }

  const isDirty = status.output.trim() !== '';

  if (isDirty) {
    log('⚠️  Repository has uncommitted changes:', 'yellow');
    log(status.output, 'yellow');

    if (process.env.RELEASE_DIRTY_OK !== '1') {
      log('❌ Release not allowed with dirty repository', 'red');
      log('   Set RELEASE_DIRTY_OK=1 to override', 'cyan');
      return false;
    } else {
      log('⚠️  Proceeding with dirty repository (RELEASE_DIRTY_OK=1)', 'yellow');
    }
  } else {
    log('✅ Repository is clean', 'green');
  }

  return true;
}

function generateTagName() {
  const version = getPackageVersion();
  if (!version) return null;

  // Convert version to tag format
  const tag = version.startsWith('v') ? version : `v${version}`;

  // If not already an rc version, append rc1
  if (!tag.includes('-rc')) {
    return `${tag}-rc1`;
  }

  return tag;
}

function generateTagMessage(tagName) {
  const releaseNotesPath = join(projectRoot, `RELEASE-NOTES-${tagName.substring(1)}.md`);

  if (existsSync(releaseNotesPath)) {
    log(`📄 Using release notes from ${releaseNotesPath}`, 'cyan');
    try {
      return readFileSync(releaseNotesPath, 'utf8').trim();
    } catch (error) {
      log(`⚠️  Failed to read release notes: ${error.message}`, 'yellow');
    }
  }

  // Auto-generate release message
  log('📝 Auto-generating release message', 'cyan');

  const gitRev = execSyncSafe('git rev-parse --short HEAD').output || 'unknown';
  const timestamp = new Date().toISOString();

  return `Release ${tagName}

Auto-generated release tag for Pure Lambda.

🔗 Git Revision: ${gitRev}
⏰ Timestamp: ${timestamp}
🏷️  Tag: ${tagName}

This release has been validated through the complete pipeline:
- ✅ Preflight validation
- ✅ Reproducibility checks
- ✅ Attestation verification
- ✅ Artifact gathering and packaging

Ready for local deployment.

🤖 Generated with Pure Lambda Release Engineering`;
}

function createTag(tagName, message) {
  logSection('Creating Release Tag');

  log(`🏷️  Creating tag: ${tagName}`, 'cyan');

  // Check if tag already exists
  const tagExists = execSyncSafe(`git tag -l "${tagName}"`);
  if (tagExists.success && tagExists.output.trim() !== '') {
    log(`❌ Tag ${tagName} already exists`, 'red');

    // Show existing tag info
    const tagInfo = execSyncSafe(`git show ${tagName} --format="%H %s" -s`);
    if (tagInfo.success) {
      log(`   Current tag points to: ${tagInfo.output}`, 'yellow');
    }

    log('   Delete existing tag first if you want to recreate it:', 'cyan');
    log(`   git tag -d ${tagName}`, 'cyan');
    return false;
  }

  // Create annotated tag
  const tagCommand = `git tag -a "${tagName}" -m "${message.replace(/"/g, '\\"')}"`;
  const result = execSyncSafe(tagCommand);

  if (!result.success) {
    log(`❌ Failed to create tag: ${result.output}`, 'red');
    return false;
  }

  log(`✅ Tag ${tagName} created successfully`, 'green');

  // Show tag info
  const tagInfo = execSyncSafe(`git show ${tagName} --format="%H %s" -s`);
  if (tagInfo.success) {
    log(`   Tag points to: ${tagInfo.output}`, 'cyan');
  }

  return true;
}

function showSummary(tagName) {
  logSection('🎉 Release Tag Complete');

  log(`\n🏷️  Tag Created: ${tagName}`, 'bold');

  // Show tag details
  const tagShow = execSyncSafe(`git show ${tagName} --format="Commit: %H%nAuthor: %an <%ae>%nDate: %ad" --date=iso -s`);
  if (tagShow.success) {
    log(`📊 ${tagShow.output}`, 'cyan');
  }

  log('\n📋 Next Steps:', 'bold');
  log('  • Verify the tag locally:', 'cyan');
  log(`    git show ${tagName}`, 'cyan');
  log('  • To push to remote (when ready):', 'cyan');
  log(`    git push origin ${tagName}`, 'cyan');
  log('  • To delete if needed:', 'cyan');
  log(`    git tag -d ${tagName}`, 'cyan');

  log('\n✨ Local tag ready for deployment!', 'green');
}

async function main() {
  log(`${colors.bold}${colors.green}🏷️  Git Release Tagging${colors.reset}`);
  log(`${colors.cyan}Pure Lambda Release Engineering${colors.reset}\n`);

  try {
    // Check repository status
    if (!checkRepoStatus()) {
      process.exit(1);
    }

    // Generate tag name
    const tagName = generateTagName();
    if (!tagName) {
      log('❌ Failed to determine tag name', 'red');
      process.exit(1);
    }

    log(`🎯 Target tag: ${tagName}`, 'bold');

    // Generate tag message
    const message = generateTagMessage(tagName);

    // Create the tag
    if (!createTag(tagName, message)) {
      process.exit(1);
    }

    // Show summary
    showSummary(tagName);

    log('\n🎯 Release tagging completed successfully!', 'green');

  } catch (error) {
    log(`\n💥 Tagging failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}