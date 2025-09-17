#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

/**
 * Generate HTML snippet for embedding OTM
 */
function generateSnippet() {
  console.log('📝 Generating OTM Embed Snippet');
  console.log('=' .repeat(40));

  // Check if built file exists
  const minPath = path.join(projectRoot, 'docs', 'otm', 'otm.min.js');
  if (!fs.existsSync(minPath)) {
    console.error('❌ OTM not built yet. Run: node scripts/otm/build.mjs');
    process.exit(1);
  }

  // Load build info
  let buildInfo = null;
  const infoPath = path.join(projectRoot, 'docs', 'otm', 'build-info.json');
  if (fs.existsSync(infoPath)) {
    buildInfo = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
  }

  // Generate snippets for different use cases
  const snippets = {
    cdn: `<!-- One-Tap Mirrors (OTM) - CDN Version -->
<script src="https://pure-lambda.org/otm/otm.min.js"></script>
<script>
  // Mount floating button (default)
  OTM.mount();

  // Optional: Pre-load a seed
  // OTM.load({ name: "my-seed", nodes: {...} });
</script>`,

    local: `<!-- One-Tap Mirrors (OTM) - Local Version -->
<script src="/docs/otm/otm.min.js"></script>
<script>
  // Mount with custom configuration
  OTM.mount({
    mode: 'floating',  // or 'inline'
    theme: 'auto'      // or 'light', 'dark'
  });
</script>`,

    inline: `<!-- One-Tap Mirrors (OTM) - Inline Mount -->
<div id="otm-container"></div>
<script src="/docs/otm/otm.min.js"></script>
<script>
  OTM.mount({
    target: '#otm-container',
    mode: 'inline'
  });
</script>`,

    minimal: `<!-- One-Tap Mirrors (OTM) - Minimal -->
<script src="/docs/otm/otm.min.js"></script>
<script>OTM.mount();</script>`,

    advanced: `<!-- One-Tap Mirrors (OTM) - Advanced Integration -->
<script src="/docs/otm/otm.min.js"></script>
<script>
  // Initialize OTM
  OTM.mount({ mode: 'floating' });

  // Load seed from URL or local storage
  async function loadSeedFromURL() {
    const params = new URLSearchParams(window.location.search);
    const seedURL = params.get('seed');

    if (seedURL) {
      try {
        const response = await fetch(seedURL);
        const seed = await response.json();
        OTM.load(seed);
        console.log('Seed loaded:', seed.name);
      } catch (error) {
        console.error('Failed to load seed:', error);
      }
    }
  }

  // Auto-load on page ready
  document.addEventListener('DOMContentLoaded', loadSeedFromURL);

  // Listen for verification results
  window.addEventListener('message', (event) => {
    if (event.data.type === 'otm:verify:result') {
      console.log('Verification result:', event.data.result);
      // Handle verification result
    }
  });
</script>`
  };

  // Create output directory
  const outputDir = path.join(projectRoot, 'dist', 'otm');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate HTML file with all snippets
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>One-Tap Mirrors - Embed Snippets</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 900px;
            margin: 40px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 15px;
        }
        .info {
            background: #e8f4fd;
            border-left: 4px solid #0366d6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .snippet-section {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .snippet-section h2 {
            margin-top: 0;
            color: #667eea;
        }
        pre {
            background: #1a1a2e;
            color: #e8e8e8;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 13px;
            line-height: 1.5;
        }
        .copy-btn {
            float: right;
            padding: 5px 10px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .copy-btn:hover {
            background: #5568d3;
        }
        .stats {
            display: flex;
            gap: 20px;
            margin: 10px 0;
        }
        .stat {
            background: #f0f0f0;
            padding: 10px;
            border-radius: 4px;
            text-align: center;
            flex: 1;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <h1>🔍 One-Tap Mirrors - Embed Snippets</h1>

    <div class="info">
        <h3>📊 Build Information</h3>
        <div class="stats">
            <div class="stat">
                <div class="stat-value">${buildInfo ? (buildInfo.sizes.gzipped / 1024).toFixed(2) : 'N/A'}KB</div>
                <div class="stat-label">Gzipped Size</div>
            </div>
            <div class="stat">
                <div class="stat-value">${buildInfo ? (buildInfo.sizes.minified / 1024).toFixed(2) : 'N/A'}KB</div>
                <div class="stat-label">Minified Size</div>
            </div>
            <div class="stat">
                <div class="stat-value">${buildInfo?.status === 'PASS' ? '✅' : '⚠️'}</div>
                <div class="stat-label">Size Target (≤7KB)</div>
            </div>
        </div>
        <p><strong>Built:</strong> ${buildInfo?.built || 'Unknown'}</p>
    </div>

    <div class="snippet-section">
        <h2>Minimal (Recommended)</h2>
        <p>The simplest way to add OTM to any page. Just two lines!</p>
        <button class="copy-btn" onclick="copySnippet('minimal')">Copy</button>
        <pre id="minimal">${escapeHtml(snippets.minimal)}</pre>
    </div>

    <div class="snippet-section">
        <h2>CDN Version</h2>
        <p>Load from Pure Lambda CDN with optional seed pre-loading.</p>
        <button class="copy-btn" onclick="copySnippet('cdn')">Copy</button>
        <pre id="cdn">${escapeHtml(snippets.cdn)}</pre>
    </div>

    <div class="snippet-section">
        <h2>Local Version</h2>
        <p>Self-hosted with custom configuration options.</p>
        <button class="copy-btn" onclick="copySnippet('local')">Copy</button>
        <pre id="local">${escapeHtml(snippets.local)}</pre>
    </div>

    <div class="snippet-section">
        <h2>Inline Mount</h2>
        <p>Embed OTM directly into a specific container element.</p>
        <button class="copy-btn" onclick="copySnippet('inline')">Copy</button>
        <pre id="inline">${escapeHtml(snippets.inline)}</pre>
    </div>

    <div class="snippet-section">
        <h2>Advanced Integration</h2>
        <p>Full integration with URL parameters, local storage, and message handling.</p>
        <button class="copy-btn" onclick="copySnippet('advanced')">Copy</button>
        <pre id="advanced">${escapeHtml(snippets.advanced)}</pre>
    </div>

    <script>
        function copySnippet(id) {
            const element = document.getElementById(id);
            const text = element.textContent;

            navigator.clipboard.writeText(text).then(() => {
                const button = element.previousElementSibling;
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                button.style.background = '#27ae60';

                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '#667eea';
                }, 2000);
            });
        }
    </script>
</body>
</html>`;

  // Helper function to escape HTML
  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Save HTML file
  const htmlPath = path.join(outputDir, 'snippet.html');
  fs.writeFileSync(htmlPath, html);

  // Save individual snippet files
  for (const [name, snippet] of Object.entries(snippets)) {
    const snippetPath = path.join(outputDir, `${name}.html`);
    fs.writeFileSync(snippetPath, snippet);
    console.log(`   ✅ ${name}: ${snippetPath}`);
  }

  console.log(`\n✅ Snippets generated!`);
  console.log(`   HTML: ${htmlPath}`);
  console.log(`   Open in browser: file://${htmlPath}`);

  return snippets;
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSnippet();
}

export { generateSnippet };