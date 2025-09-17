#!/usr/bin/env node

// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Pure Lambda Authors

/**
 * Pocket Embassy Build Script
 *
 * Generates optimized single-file index.htmlc ≤60KB
 * - Minifies HTML, CSS, and JavaScript
 * - Embeds Hello-City seed
 * - Includes MirrorBench-lite, AirGap receiver-lite, DSSE verify
 * - No external dependencies
 *
 * Usage:
 *   node scripts/pocket/build.mjs [--output path] [--verbose]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');

// === Configuration ===
const CONFIG = {
    input: join(PROJECT_ROOT, 'docs/pocket/index.htmlc'),
    output: join(PROJECT_ROOT, 'docs/pocket/index.htmlc'),
    maxSize: 60 * 1024, // 60KB
    verbose: false
};

// === Minification Functions ===

function minifyCSS(css) {
    return css
        // Remove comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove unnecessary whitespace
        .replace(/\s+/g, ' ')
        // Remove whitespace around selectors and braces
        .replace(/\s*{\s*/g, '{')
        .replace(/\s*}\s*/g, '}')
        .replace(/\s*;\s*/g, ';')
        .replace(/\s*:\s*/g, ':')
        .replace(/\s*,\s*/g, ',')
        // Remove trailing semicolons
        .replace(/;}/g, '}')
        // Remove leading/trailing whitespace
        .trim();
}

function minifyJS(js) {
    return js
        // Remove single-line comments (but preserve URLs)
        .replace(/\/\/(?![^\r\n]*https?:)[^\r\n]*/g, '')
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove unnecessary whitespace
        .replace(/\s+/g, ' ')
        // Remove whitespace around operators and punctuation (but preserve quotes)
        .replace(/\s*([{}();,=+\-*<>!&|:])\s*/g, '$1')
        // Restore necessary spaces
        .replace(/}([a-zA-Z])/g, '} $1')
        .replace(/;([a-zA-Z])/g, '; $1')
        // Remove trailing semicolons before }
        .replace(/;}/g, '}')
        // Fix specific SVG namespace issues
        .replace(/createElementNS\('http:/g, "createElementNS('http://www.w3.org/2000/svg',")
        // Remove leading/trailing whitespace
        .trim();
}

function minifyHTML(html) {
    return html
        // Remove HTML comments (but preserve conditional comments)
        .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
        // Remove unnecessary whitespace between tags
        .replace(/>\s+</g, '><')
        // Remove leading/trailing whitespace
        .trim();
}

// === Optimization Functions ===

function optimizeEmbeddedData(html) {
    // Find and optimize the Hello-City seed data
    const seedMatch = html.match(/const HELLO_CITY_SEED = ({[\s\S]*?});/);
    if (seedMatch) {
        try {
            const seedData = JSON.parse(seedMatch[1]);
            // Compress the seed by removing unnecessary whitespace
            const compressedSeed = JSON.stringify(seedData);
            html = html.replace(seedMatch[0], `const HELLO_CITY_SEED = ${compressedSeed};`);

            if (CONFIG.verbose) {
                console.log(`  📦 Compressed Hello-City seed: ${seedMatch[1].length} → ${compressedSeed.length} bytes`);
            }
        } catch (error) {
            console.warn('  ⚠️  Failed to optimize embedded seed data:', error.message);
        }
    }

    return html;
}

function removeDebugCode(html) {
    // Remove console.log statements
    html = html.replace(/console\.(log|warn|error|debug)\([^)]*\);?/g, '');

    // Remove verbose status messages (keep essential ones)
    html = html.replace(/setStatus\('(Running|Processing|Loading)[^']*'\);/g, '');

    return html;
}

function optimizeStrings(html) {
    // Compress repeated strings
    const commonStrings = {
        'background': 'bg',
        'border-radius': 'border-radius',
        'margin': 'm',
        'padding': 'p'
    };

    // Note: This is a simplified example. A full implementation would need
    // to be much more careful about context to avoid breaking functionality.
    return html;
}

// === Size Analysis ===

function analyzeSize(html) {
    const totalSize = Buffer.byteLength(html, 'utf8');

    // Estimate component sizes
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

    const cssSize = styleMatch ? Buffer.byteLength(styleMatch[1], 'utf8') : 0;
    const jsSize = scriptMatch ? Buffer.byteLength(scriptMatch[1], 'utf8') : 0;
    const htmlSize = totalSize - cssSize - jsSize;

    return {
        total: totalSize,
        html: htmlSize,
        css: cssSize,
        js: jsSize,
        percentage: {
            html: Math.round((htmlSize / totalSize) * 100),
            css: Math.round((cssSize / totalSize) * 100),
            js: Math.round((jsSize / totalSize) * 100)
        }
    };
}

// === Build Process ===

function buildPocketEmbassy() {
    console.log('🏗️  Building Pocket Embassy...\n');

    // Check if input file exists
    if (!existsSync(CONFIG.input)) {
        throw new Error(`Input file not found: ${CONFIG.input}`);
    }

    // Read source file
    let html = readFileSync(CONFIG.input, 'utf8');
    const originalSize = Buffer.byteLength(html, 'utf8');

    if (CONFIG.verbose) {
        console.log(`📄 Source file: ${CONFIG.input}`);
        console.log(`📏 Original size: ${originalSize.toLocaleString()} bytes\n`);
    }

    // Minification steps
    console.log('🔧 Minifying components...');

    // 1. Minify CSS
    const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    if (cssMatch) {
        const originalCSS = cssMatch[1];
        const minifiedCSS = minifyCSS(originalCSS);
        html = html.replace(cssMatch[0], `<style>${minifiedCSS}</style>`);

        if (CONFIG.verbose) {
            console.log(`  🎨 CSS: ${originalCSS.length} → ${minifiedCSS.length} bytes`);
        }
    }

    // 2. Minify JavaScript
    const jsMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    if (jsMatch) {
        const originalJS = jsMatch[1];
        const minifiedJS = minifyJS(originalJS);
        html = html.replace(jsMatch[0], `<script>${minifiedJS}</script>`);

        if (CONFIG.verbose) {
            console.log(`  ⚡ JavaScript: ${originalJS.length} → ${minifiedJS.length} bytes`);
        }
    }

    // 3. Optimize embedded data
    html = optimizeEmbeddedData(html);

    // 4. Remove debug code
    html = removeDebugCode(html);

    // 5. Minify HTML
    html = minifyHTML(html);

    // Final size analysis
    const analysis = analyzeSize(html);

    console.log('📊 Build Results:');
    console.log(`  📏 Final size: ${analysis.total.toLocaleString()} bytes`);
    console.log(`  📉 Compression: ${Math.round((1 - analysis.total / originalSize) * 100)}%`);
    console.log(`  🏗️  Components: HTML ${analysis.percentage.html}%, CSS ${analysis.percentage.css}%, JS ${analysis.percentage.js}%`);

    // Check size constraint
    if (analysis.total > CONFIG.maxSize) {
        console.log(`\n❌ FAILED: File size (${analysis.total.toLocaleString()} bytes) exceeds target (${CONFIG.maxSize.toLocaleString()} bytes)`);
        console.log(`  📊 Overage: ${(analysis.total - CONFIG.maxSize).toLocaleString()} bytes (${Math.round(((analysis.total - CONFIG.maxSize) / CONFIG.maxSize) * 100)}%)`);
        console.log(`\n🚨 Pocket Embassy build FAILED: Size constraint violation`);

        // Exit with error code when size constraint is violated
        return {
            success: false,
            size: analysis.total,
            withinBudget: false,
            analysis,
            error: 'Size constraint violation'
        };
    } else {
        console.log(`\n✅ Size constraint met: ${analysis.total.toLocaleString()}/${CONFIG.maxSize.toLocaleString()} bytes (${Math.round((analysis.total / CONFIG.maxSize) * 100)}%)`);
    }

    // Ensure output directory exists
    mkdirSync(dirname(CONFIG.output), { recursive: true });

    // Write output file
    writeFileSync(CONFIG.output, html, 'utf8');

    console.log(`\n✅ Pocket Embassy built successfully!`);
    console.log(`📍 Output: ${CONFIG.output}`);

    return {
        success: true,
        size: analysis.total,
        withinBudget: analysis.total <= CONFIG.maxSize,
        analysis
    };
}

// === CLI Interface ===

function parseArgs() {
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--output':
            case '-o':
                CONFIG.output = args[++i];
                break;
            case '--verbose':
            case '-v':
                CONFIG.verbose = true;
                break;
            case '--help':
            case '-h':
                console.log('Pocket Embassy Build Script');
                console.log('');
                console.log('Usage:');
                console.log('  node scripts/pocket/build.mjs [options]');
                console.log('');
                console.log('Options:');
                console.log('  -o, --output <path>    Output file path');
                console.log('  -v, --verbose          Verbose output');
                console.log('  -h, --help             Show this help');
                console.log('');
                console.log('Target: Single-file HTML ≤60KB with embedded components');
                process.exit(0);
                break;
            default:
                console.error(`Unknown argument: ${arg}`);
                process.exit(1);
        }
    }
}

// === Main Execution ===

function main() {
    try {
        parseArgs();
        const result = buildPocketEmbassy();

        // Exit with appropriate code
        process.exit(result.success && result.withinBudget ? 0 : 1);

    } catch (error) {
        console.error('\n❌ Build failed:', error.message);

        if (CONFIG.verbose) {
            console.error(error.stack);
        }

        process.exit(1);
    }
}

if (import.meta.url === `file://${__filename}`) {
    main();
}

export { buildPocketEmbassy, minifyCSS, minifyJS, minifyHTML };