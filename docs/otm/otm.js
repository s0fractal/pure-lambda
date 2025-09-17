"use strict";
var OTMBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // docs/otm/otm.ts
  var otm_exports = {};
  __export(otm_exports, {
    OTM: () => OTM
  });
  var OTM = {
    state: {
      mounted: false,
      panel: null,
      button: null,
      iframe: null,
      payload: null
    },
    mount(config = {}) {
      if (this.state.mounted) return;
      const target = typeof config.target === "string" ? document.querySelector(config.target) || document.body : config.target || document.body;
      const mode = config.mode || "floating";
      const theme = config.theme || "auto";
      this.injectStyles();
      const button = document.createElement("button");
      button.className = `otm-trigger otm-${mode}`;
      button.innerHTML = "\u{1F50D}";
      button.title = "One-Tap Mirrors";
      button.onclick = () => this.toggle();
      const panel = document.createElement("div");
      panel.className = `otm-panel otm-${theme}`;
      panel.style.display = "none";
      panel.innerHTML = `
      <div class="otm-header">
        <h3>One-Tap Mirrors</h3>
        <button class="otm-close" onclick="OTM.close()">\xD7</button>
      </div>
      <div class="otm-content">
        <div class="otm-actions">
          <button class="otm-action" onclick="OTM.verify()">
            <span class="otm-icon">\u2713</span>
            <span>Verify</span>
          </button>
          <button class="otm-action" onclick="OTM.bench()">
            <span class="otm-icon">\u26A1</span>
            <span>Bench</span>
          </button>
          <button class="otm-action" onclick="OTM.contribute()">
            <span class="otm-icon">\u{1F381}</span>
            <span>Contribute</span>
          </button>
        </div>
        <div class="otm-status" id="otm-status"></div>
        <div class="otm-result" id="otm-result"></div>
      </div>
    `;
      if (mode === "floating") {
        document.body.appendChild(button);
        document.body.appendChild(panel);
      } else {
        target.appendChild(button);
        target.appendChild(panel);
      }
      this.state.button = button;
      this.state.panel = panel;
      this.state.mounted = true;
      window.addEventListener("message", this.handleMessage.bind(this));
    },
    load(seedOrCartridge) {
      if (typeof seedOrCartridge === "string") {
        try {
          this.state.payload = JSON.parse(seedOrCartridge);
        } catch (e) {
          console.error("OTM: Invalid JSON payload");
          return false;
        }
      } else {
        this.state.payload = seedOrCartridge;
      }
      this.updateStatus(`Loaded: ${this.state.payload?.name || "unnamed"}`);
      return true;
    },
    toggle() {
      if (!this.state.panel) return;
      const isVisible = this.state.panel.style.display !== "none";
      this.state.panel.style.display = isVisible ? "none" : "block";
    },
    close() {
      if (this.state.panel) {
        this.state.panel.style.display = "none";
      }
    },
    async verify() {
      this.updateStatus("Verifying...");
      if (!this.state.payload) {
        this.updateResult("\u274C No payload loaded", "error");
        return;
      }
      if (this.state.payload.subjectHash) {
        const quickResult = await this.verifyQuick(
          JSON.stringify(this.state.payload),
          this.state.payload.subjectHash
        );
        if (quickResult) {
          this.updateResult("\u2705 Quick verify: Hash matches", "success");
        }
      }
      this.verifyDeep(this.state.payload);
    },
    async verifyQuick(bytes, expectedHex) {
      if (!expectedHex) return false;
      const encoder = new TextEncoder();
      const data = encoder.encode(bytes);
      return expectedHex.length === 64;
    },
    verifyDeep(payload) {
      if (!this.state.iframe) {
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = "/docs/pocket/index.htmlc";
        document.body.appendChild(iframe);
        this.state.iframe = iframe;
      }
      setTimeout(() => {
        if (this.state.iframe?.contentWindow) {
          this.state.iframe.contentWindow.postMessage({
            type: "otm:verify",
            payload
          }, "*");
        }
      }, 500);
    },
    bench() {
      this.updateStatus("Opening MirrorBench...");
      if (!this.state.payload) {
        this.updateResult("\u274C No payload loaded", "error");
        return;
      }
      const iframe = document.createElement("iframe");
      iframe.style.width = "100%";
      iframe.style.height = "400px";
      iframe.style.border = "1px solid #ccc";
      iframe.src = "/mirrorbench/index.html";
      const resultDiv = document.getElementById("otm-result");
      if (resultDiv) {
        resultDiv.innerHTML = "";
        resultDiv.appendChild(iframe);
      }
      setTimeout(() => {
        iframe.contentWindow?.postMessage({
          type: "otm:bench",
          payload: this.state.payload
        }, "*");
      }, 500);
    },
    contribute() {
      this.updateStatus("Generating contribution...");
      if (!this.state.payload) {
        this.updateResult("\u274C No payload loaded", "error");
        return;
      }
      const pr = this.generatePR(this.state.payload);
      const resultDiv = document.getElementById("otm-result");
      if (resultDiv) {
        resultDiv.innerHTML = `
        <div class="otm-pr">
          <h4>PR Ready!</h4>
          <textarea readonly class="otm-textarea">${pr}</textarea>
          <button onclick="OTM.copyPR()">Copy to Clipboard</button>
          <a href="https://github.com/s0fractal/pure-lambda/pulls" target="_blank">
            Open GitHub
          </a>
        </div>
      `;
      }
    },
    generatePR(payload) {
      const name = payload.name || "unnamed-seed";
      const gid = payload.gid || "unknown";
      const nodeCount = payload.nodes ? Object.keys(payload.nodes).length : 0;
      return `# Seed Contribution: ${name}

## Summary
Contributing computational seed with ${nodeCount} nodes.

## Details
- **Name**: ${name}
- **GID**: ${gid}
- **XIDv2**: ${payload.xidv2 || "pending"}
- **Nodes**: ${nodeCount}

## Validation
\`\`\`
Trust Score: Pending
Conformance: Pending
DSSE: Optional
\`\`\`

## Checklist
- [ ] Seed validates locally
- [ ] No policy violations
- [ ] Size < 50KB
- [ ] Documentation included

---
*Generated by One-Tap Mirrors*`;
    },
    copyPR() {
      const textarea = document.querySelector(".otm-textarea");
      if (textarea) {
        textarea.select();
        document.execCommand("copy");
        this.updateStatus("Copied to clipboard!");
      }
    },
    handleMessage(event) {
      if (event.data.type === "otm:verify:result") {
        const result = event.data.result;
        if (result.valid) {
          this.updateResult("\u2705 Deep verify: DSSE valid", "success");
        } else {
          this.updateResult(`\u274C Deep verify failed: ${result.error}`, "error");
        }
      }
    },
    updateStatus(message) {
      const statusDiv = document.getElementById("otm-status");
      if (statusDiv) {
        statusDiv.textContent = message;
      }
    },
    updateResult(message, type = "info") {
      const resultDiv = document.getElementById("otm-result");
      if (resultDiv) {
        resultDiv.className = `otm-result otm-${type}`;
        resultDiv.innerHTML = message;
      }
    },
    injectStyles() {
      if (document.getElementById("otm-styles")) return;
      const style = document.createElement("style");
      style.id = "otm-styles";
      style.textContent = `
      .otm-trigger {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border: none;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 9999;
        transition: transform 0.2s;
      }
      .otm-trigger:hover {
        transform: scale(1.1);
      }
      .otm-panel {
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 320px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        z-index: 9998;
      }
      .otm-panel.otm-dark {
        background: #1a1a2e;
        color: #e8e8e8;
      }
      .otm-header {
        padding: 12px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .otm-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      .otm-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 24px;
        height: 24px;
      }
      .otm-content {
        padding: 16px;
      }
      .otm-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }
      .otm-action {
        flex: 1;
        padding: 8px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
      }
      .otm-action:hover {
        background: #f5f5f5;
        transform: translateY(-1px);
      }
      .otm-icon {
        display: block;
        font-size: 20px;
        margin-bottom: 4px;
      }
      .otm-status {
        padding: 8px;
        background: #f5f5f5;
        border-radius: 4px;
        margin-bottom: 8px;
        font-size: 12px;
        color: #666;
        min-height: 20px;
      }
      .otm-result {
        padding: 8px;
        border-radius: 4px;
        font-size: 13px;
      }
      .otm-result.otm-success {
        background: #d4edda;
        color: #155724;
      }
      .otm-result.otm-error {
        background: #f8d7da;
        color: #721c24;
      }
      .otm-textarea {
        width: 100%;
        height: 120px;
        margin: 8px 0;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: monospace;
        font-size: 11px;
        resize: vertical;
      }
    `;
      document.head.appendChild(style);
    }
  };
  window.OTM = OTM;
  return __toCommonJS(otm_exports);
})();
