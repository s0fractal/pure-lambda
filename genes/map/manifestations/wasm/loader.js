/**
 * JavaScript loader for WASM Component
 * Provides seamless integration with JS/Node environments
 */

import { readFile } from 'fs/promises';
import { WASI } from 'wasi';
import { argv, env } from 'process';

export class WASMGene {
  constructor(wasmPath) {
    this.wasmPath = wasmPath;
    this.instance = null;
  }
  
  async initialize() {
    // Load WASM bytes
    const wasmBuffer = await readFile(this.wasmPath);
    
    // Create WASI instance for system interface
    const wasi = new WASI({
      args: argv,
      env,
      preopens: {}
    });
    
    // Compile WASM module
    const wasmModule = await WebAssembly.compile(wasmBuffer);
    
    // Instantiate with imports
    const instance = await WebAssembly.instantiate(wasmModule, {
      wasi_snapshot_preview1: wasi.wasiImport,
      env: {
        // Add any additional imports here
      }
    });
    
    // Initialize WASI
    wasi.initialize(instance);
    
    this.instance = instance;
    return this;
  }
  
  /**
   * Call the map function from WASM
   */
  map(items, transform) {
    if (!this.instance) {
      throw new Error('WASM not initialized. Call initialize() first.');
    }
    
    // Marshal data to WASM
    const itemsPtr = this.marshal(items);
    const transformPtr = this.marshalFunction(transform);
    
    // Call WASM function
    const resultPtr = this.instance.exports.map_run(itemsPtr, transformPtr);
    
    // Unmarshal result
    return this.unmarshal(resultPtr);
  }
  
  /**
   * Verify soul matches canonical
   */
  verifySoul() {
    if (!this.instance) {
      throw new Error('WASM not initialized');
    }
    
    const soulPtr = this.instance.exports.get_soul();
    const soul = this.unmarshalString(soulPtr);
    
    return soul === 'λ45612188';
  }
  
  // Helper methods for marshaling
  marshal(data) {
    // Simplified - in production use proper memory management
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json);
    const ptr = this.instance.exports.malloc(bytes.length);
    
    const memory = new Uint8Array(this.instance.exports.memory.buffer);
    memory.set(bytes, ptr);
    
    return ptr;
  }
  
  marshalFunction(fn) {
    // Create function table entry
    const fnIndex = this.instance.exports.create_function(fn.toString());
    return fnIndex;
  }
  
  unmarshal(ptr) {
    const lenPtr = this.instance.exports.get_result_len(ptr);
    const len = new Uint32Array(this.instance.exports.memory.buffer, lenPtr, 1)[0];
    
    const bytes = new Uint8Array(this.instance.exports.memory.buffer, ptr, len);
    const json = new TextDecoder().decode(bytes);
    
    this.instance.exports.free(ptr);
    
    return JSON.parse(json);
  }
  
  unmarshalString(ptr) {
    const len = this.instance.exports.strlen(ptr);
    const bytes = new Uint8Array(this.instance.exports.memory.buffer, ptr, len);
    return new TextDecoder().decode(bytes);
  }
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const gene = new WASMGene('./map.wasm');
  await gene.initialize();
  
  const result = gene.map([1, 2, 3, 4, 5], x => x * 2);
  console.log('WASM map result:', result);
  
  console.log('Soul verified:', gene.verifySoul());
}