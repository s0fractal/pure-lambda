#!/usr/bin/env node
/**
 * λ-ASM v0 Runner
 * Minimal 6-opcode interpreter with SVG output mapping
 */

import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

// === OPCODES ===
const OPCODES = {
  CONST: 0x00,  // CONST r, value
  LOAD:  0x01,  // LOAD r, input[i]
  ADD:   0x02,  // ADD rA, rB -> rC
  MUL:   0x03,  // MUL rA, rB -> rC
  SIN:   0x04,  // SIN rA -> rB
  OUT:   0x05   // OUT r, "target"
};

/**
 * Parse λ-ASM source to instruction array
 */
function parse(source) {
  const instructions = [];
  const lines = source.split('\n');

  for (const line of lines) {
    // Skip comments and empty lines
    const cleaned = line.split(';')[0].trim();
    if (!cleaned) continue;

    // Parse instruction
    const parts = cleaned.split(/\s+/);
    const op = parts[0].toUpperCase();

    if (op === 'CONST') {
      // CONST r, value
      const reg = parseInt(parts[1].replace('r', ''));
      const value = parseFloat(parts[2].replace(',', ''));
      instructions.push({ op: OPCODES.CONST, reg, value });
    }
    else if (op === 'LOAD') {
      // LOAD r, input[i]
      const reg = parseInt(parts[1].replace('r', ''));
      const inputMatch = parts[2].match(/input\[(\d+)\]/);
      const inputIdx = inputMatch ? parseInt(inputMatch[1]) : 0;
      instructions.push({ op: OPCODES.LOAD, reg, inputIdx });
    }
    else if (op === 'ADD' || op === 'MUL') {
      // ADD/MUL rA, rB -> rC  OR  ADD rA, value -> rB
      const firstArg = parts[1].replace(',', '');
      const regA = parseInt(firstArg.replace('r', ''));

      const secondArg = parts[2];
      if (secondArg.startsWith('r')) {
        // Register to register
        const regB = parseInt(secondArg.replace('r', ''));
        const regC = parseInt(parts[4].replace('r', ''));
        instructions.push({
          op: OPCODES[op],
          regA, regB, regC
        });
      } else {
        // Register and immediate value
        const value = parseFloat(secondArg);
        const regC = parseInt(parts[4].replace('r', ''));
        instructions.push({
          op: OPCODES[op],
          regA, value, regC, immediate: true
        });
      }
    }
    else if (op === 'SIN') {
      // SIN rA -> rB
      const regA = parseInt(parts[1].replace('r', ''));
      const regB = parseInt(parts[3].replace('r', ''));
      instructions.push({ op: OPCODES.SIN, regA, regB });
    }
    else if (op === 'OUT') {
      // OUT r, "target"
      const reg = parseInt(parts[1].replace('r', '').replace(',', ''));
      const target = parts[2].replace(/[",]/g, '');
      instructions.push({ op: OPCODES.OUT, reg, target });
    }
  }

  return instructions;
}

/**
 * Execute λ-ASM program
 */
function execute(instructions, inputs = []) {
  const registers = new Float64Array(32); // r0..r31
  const outputs = {};

  for (const inst of instructions) {
    switch (inst.op) {
      case OPCODES.CONST:
        registers[inst.reg] = inst.value;
        break;

      case OPCODES.LOAD:
        registers[inst.reg] = inputs[inst.inputIdx] || 0;
        break;

      case OPCODES.ADD:
        if (inst.immediate) {
          registers[inst.regC] = registers[inst.regA] + inst.value;
        } else {
          registers[inst.regC] = registers[inst.regA] + registers[inst.regB];
        }
        break;

      case OPCODES.MUL:
        if (inst.immediate) {
          registers[inst.regC] = registers[inst.regA] * inst.value;
        } else {
          registers[inst.regC] = registers[inst.regA] * registers[inst.regB];
        }
        break;

      case OPCODES.SIN:
        registers[inst.regB] = Math.sin(registers[inst.regA]);
        break;

      case OPCODES.OUT:
        outputs[inst.target] = registers[inst.reg];
        break;
    }
  }

  return outputs;
}

/**
 * Calculate program hash (phash for λ-ASM)
 */
function phash(instructions) {
  const opseq = instructions.map(inst => {
    const bytes = [inst.op];
    if (inst.reg !== undefined) bytes.push(inst.reg);
    if (inst.regA !== undefined) bytes.push(inst.regA);
    if (inst.regB !== undefined) bytes.push(inst.regB);
    if (inst.regC !== undefined) bytes.push(inst.regC);
    if (inst.inputIdx !== undefined) bytes.push(inst.inputIdx);
    if (inst.value !== undefined) {
      const buf = Buffer.allocUnsafe(8);
      buf.writeDoubleLE(inst.value);
      bytes.push(...buf);
    }
    return bytes;
  }).flat();

  const prefix = Buffer.from('pl/lasm-v0', 'utf8');
  const combined = Buffer.concat([prefix, Buffer.from(opseq)]);

  return createHash('sha256').update(combined).digest('hex').substring(0, 44);
}

/**
 * Generate animated HTML with embedded SVG
 */
function generateHTML(instructions) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>λ-ASM v0 Animation</title>
  <style>
    body { margin: 0; padding: 20px; background: #0a0e27; display: flex; justify-content: center; align-items: center; height: 100vh; }
    svg { background: #161b22; border: 1px solid #30363d; border-radius: 8px; }
    .info { position: absolute; top: 20px; left: 20px; color: #8b949e; font-family: monospace; }
    #circle { fill: #58a6ff; opacity: 0.8; }
    #orbit { fill: #f85149; }
  </style>
</head>
<body>
  <div class="info">
    <div>λ-ASM v0</div>
    <div>t: <span id="time">0.00</span></div>
    <div>fps: <span id="fps">0</span></div>
  </div>

  <svg viewBox="0 0 300 300" width="500" height="500" id="scene">
    <circle id="circle" cx="150" cy="150" r="30" />
    <circle id="orbit" cx="150" cy="150" r="8" />
  </svg>

  <script type="module">
    const instructions = ${JSON.stringify(instructions)};
    const registers = new Float64Array(32);

    function execute(inputs) {
      const outputs = {};

      for (const inst of instructions) {
        switch (inst.op) {
          case ${OPCODES.CONST}:
            registers[inst.reg] = inst.value;
            break;
          case ${OPCODES.LOAD}:
            registers[inst.reg] = inputs[inst.inputIdx] || 0;
            break;
          case ${OPCODES.ADD}:
            if (inst.immediate) {
              registers[inst.regC] = registers[inst.regA] + inst.value;
            } else {
              registers[inst.regC] = registers[inst.regA] + registers[inst.regB];
            }
            break;
          case ${OPCODES.MUL}:
            if (inst.immediate) {
              registers[inst.regC] = registers[inst.regA] * inst.value;
            } else {
              registers[inst.regC] = registers[inst.regA] * registers[inst.regB];
            }
            break;
          case ${OPCODES.SIN}:
            registers[inst.regB] = Math.sin(registers[inst.regA]);
            break;
          case ${OPCODES.OUT}:
            outputs[inst.target] = registers[inst.reg];
            break;
        }
      }

      return outputs;
    }

    let t = 0;
    let lastTime = 0;
    let frameCount = 0;

    function animate(timestamp) {
      // Calculate FPS
      frameCount++;
      if (timestamp - lastTime > 1000) {
        document.getElementById('fps').textContent = frameCount;
        frameCount = 0;
        lastTime = timestamp;
      }

      // Execute program
      const outputs = execute([t, 30]); // inputs: [time, scale]

      // Apply outputs to SVG
      for (const [target, value] of Object.entries(outputs)) {
        const [elementId, attr] = target.split('.');
        const element = document.getElementById(elementId);
        if (element) {
          element.setAttribute(attr, value);
        }
      }

      // Update time display
      document.getElementById('time').textContent = t.toFixed(2);

      // Advance time
      t += 0.05;

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  </script>
</body>
</html>`;

  return html;
}

// === MAIN ===
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  if (command === 'run') {
    // Run once with given inputs
    const source = readFileSync('prog.lasm', 'utf8');
    const instructions = parse(source);
    const inputs = process.argv.slice(3).map(parseFloat);

    const outputs = execute(instructions, inputs.length ? inputs : [0, 30]);

    console.log('🔷 λ-ASM v0 Execution');
    console.log('Inputs:', inputs.length ? inputs : '[0, 30]');
    console.log('Outputs:', outputs);
    console.log('Program hash:', phash(instructions));
  }
  else if (command === 'animate') {
    // Generate animated HTML
    const source = readFileSync('prog.lasm', 'utf8');
    const instructions = parse(source);
    const html = generateHTML(instructions);

    writeFileSync('animation.html', html);
    console.log('✨ Animation saved to animation.html');
    console.log('Program hash:', phash(instructions));
    console.log('Open in browser to view');
  }
  else {
    // Default: parse and show info
    const source = readFileSync('prog.lasm', 'utf8');
    const instructions = parse(source);

    console.log('📜 λ-ASM v0 Program');
    console.log('Instructions:', instructions.length);
    console.log('Program hash:', phash(instructions));
    console.log('\nUsage:');
    console.log('  node runner.mjs run [t] [s]    - Execute once');
    console.log('  node runner.mjs animate         - Generate animation');
  }
}

export { parse, execute, phash, OPCODES };