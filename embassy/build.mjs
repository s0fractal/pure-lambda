#!/usr/bin/env node
/**
 * Embassy Pack v3 Build Script
 *
 * Provides minimal build capability to inline/minify the embassy HTML
 * using esbuild if available, otherwise just copies the file.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = resolve(__dirname, '..');
const embassyDir = resolve(__dirname);
const sourceFile = join(embassyDir, 'index.html');
const outputFile = join(embassyDir, 'embassy-pack-v3.html');

function log(message) {
    console.log(`🏛️  ${message}`);
}

function checkEsbuildAvailable() {
    try {
        execSync('npx esbuild --version', { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function minifyHTML(html) {
    // Simple HTML minification (removes comments, extra whitespace)
    return html
        // Remove HTML comments
        .replace(/<!--[\s\S]*?-->/g, '')
        // Remove multiple spaces and newlines between tags
        .replace(/>\s+</g, '><')
        // Remove leading/trailing whitespace on lines
        .replace(/^\s+|\s+$/gm, '')
        // Compress CSS (remove extra spaces)
        .replace(/\s+/g, ' ')
        // Remove spaces around CSS selectors
        .replace(/\s*{\s*/g, '{')
        .replace(/;\s*/g, ';')
        .replace(/:\s*/g, ':')
        .replace(/,\s*/g, ',')
        .trim();
}

function extractAndMinifyJS(html) {
    // Extract JavaScript content
    const jsMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (!jsMatch) {
        return html;
    }

    const originalJS = jsMatch[1];

    // Simple JavaScript minification
    const minifiedJS = originalJS
        // Remove single-line comments
        .replace(/\/\/.*$/gm, '')
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Remove spaces around operators
        .replace(/\s*([{}();,=+\-*/%&|!<>])\s*/g, '$1')
        .trim();

    return html.replace(jsMatch[0], `<script>${minifiedJS}</script>`);
}

function buildWithEsbuild() {
    log('Building with esbuild...');

    try {
        // Create a temporary build file for esbuild processing
        const tempInput = join(embassyDir, 'temp-build.html');
        const html = readFileSync(sourceFile, 'utf8');

        // For HTML files, esbuild can't directly process them
        // So we'll use our manual minification approach
        const minified = minifyHTML(extractAndMinifyJS(html));

        writeFileSync(outputFile, minified);
        log(`Built embassy pack: ${outputFile}`);

        const originalSize = readFileSync(sourceFile, 'utf8').length;
        const minifiedSize = minified.length;
        const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);

        log(`Size: ${originalSize} → ${minifiedSize} bytes (${savings}% reduction)`);

    } catch (error) {
        log(`esbuild failed: ${error.message}`);
        log('Falling back to simple copy...');
        return buildSimple();
    }
}

function buildSimple() {
    log('Building with simple minification...');

    const html = readFileSync(sourceFile, 'utf8');
    const minified = minifyHTML(extractAndMinifyJS(html));

    writeFileSync(outputFile, minified);
    log(`Built embassy pack: ${outputFile}`);

    const originalSize = html.length;
    const minifiedSize = minified.length;
    const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);

    log(`Size: ${originalSize} → ${minifiedSize} bytes (${savings}% reduction)`);
}

function addMetadata() {
    // Add build metadata to the output
    const content = readFileSync(outputFile, 'utf8');
    const timestamp = new Date().toISOString();

    const metadataComment = `<!-- Embassy Pack v3 - Built ${timestamp} -->`;
    const updatedContent = metadataComment + '\n' + content;

    writeFileSync(outputFile, updatedContent);
}

async function main() {
    log('Embassy Pack v3 Build Starting...');

    if (!existsSync(sourceFile)) {
        console.error(`❌ Source file not found: ${sourceFile}`);
        process.exit(1);
    }

    const hasEsbuild = checkEsbuildAvailable();

    if (hasEsbuild) {
        log('esbuild available, using enhanced build');
        buildWithEsbuild();
    } else {
        log('esbuild not available, using simple build');
        buildSimple();
    }

    addMetadata();

    log('Build complete! ✅');

    // Provide usage information
    log('');
    log('Usage:');
    log(`  Open: ${outputFile}`);
    log('  Deploy: Copy to any web server (fully self-contained)');
    log('  Verify: Load operon.json + receipts/last.json + envelope.json');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Build failed:', error);
        process.exit(1);
    });
}