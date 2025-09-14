/**
 * Cloudflare Workers adapter for Pure Lambda agents
 * Maps Worker requests to PL:ABI pulses
 */

// Import WASM module (bundled with wrangler)
import wasm from './agent.wasm';

export default {
  async fetch(request, env, ctx) {
    // Initialize WASM instance
    const instance = await WebAssembly.instantiate(wasm, {
      env: {
        // Provide environment imports
        get_state: (cid) => env.KV.get(cid),
        put_state: (cid, data) => env.KV.put(cid, data),
        get_time: () => Date.now()
      }
    });

    // Parse request
    const url = new URL(request.url);
    const requestData = request.method === 'POST'
      ? await request.json()
      : Object.fromEntries(url.searchParams);

    // Generate deterministic seed
    const encoder = new TextEncoder();
    const seedData = encoder.encode(
      JSON.stringify(requestData) + request.headers.get('CF-Ray')
    );
    const hashBuffer = await crypto.subtle.digest('SHA-256', seedData);
    const seed = Array.from(new Uint8Array(hashBuffer));

    // Map to PL pulse
    const pulse = {
      tick: requestData.tick || Date.now(),
      view: {
        cid: requestData.state_cid || 'QmEmpty',
        height: parseInt(requestData.height) || 0,
        entropy: btoa(String.fromCharCode(...seed))
      },
      intent: null,
      gas_limit: 50000 // Cloudflare CPU limit approximation
    };

    // Add intent if present
    if (requestData.intent) {
      pulse.intent = {
        from: requestData.intent.from || 'did:pl:anonymous',
        constraints: requestData.intent.constraints || '()',
        utility: requestData.intent.utility || 'maximize satisfaction',
        deadline: requestData.intent.deadline || pulse.tick + 3600000
      };
    }

    // Call WASM tick function
    const pulseJson = JSON.stringify(pulse);
    const resultPtr = instance.exports.tick(
      encodeString(pulseJson, instance)
    );

    // Read result from WASM memory
    const result = readResult(instance, resultPtr);

    // Prepare response
    const response = {
      new_state_cid: result.new_state,
      proof: btoa(String.fromCharCode(...result.proof)),
      gas_used: result.gas_used,
      effects: result.effects,
      attestation: {
        runtime: 'cloudflare-workers',
        region: request.cf?.colo || 'unknown',
        deterministic: true,
        reproducible: true,
        measurement: await hashWasm(wasm)
      },
      metadata: {
        tick: pulse.tick,
        runtime: 'pl-faas-cloudflare',
        ray_id: request.headers.get('CF-Ray')
      }
    };

    // Store result in KV if new state
    if (result.new_state && result.new_state !== 'QmEmpty') {
      ctx.waitUntil(
        env.KV.put(result.new_state, JSON.stringify(result))
      );
    }

    // Return response
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-PL-Tick': pulse.tick.toString(),
        'X-PL-Gas-Used': result.gas_used.toString(),
        'X-PL-Runtime': 'pl-faas-cloudflare'
      }
    });
  },

  async scheduled(event, env, ctx) {
    // Cron trigger for periodic pulses
    const pulse = {
      tick: event.scheduledTime,
      view: {
        cid: await env.KV.get('latest_state') || 'QmEmpty',
        height: parseInt(await env.KV.get('height')) || 0,
        entropy: btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
      },
      intent: null,
      gas_limit: 50000
    };

    // Process pulse (similar to fetch)
    // ... implementation ...
  }
};

// Helper functions
function encodeString(str, instance) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const ptr = instance.exports.alloc(bytes.length);
  const memory = new Uint8Array(instance.exports.memory.buffer);
  memory.set(bytes, ptr);
  return ptr;
}

function readResult(instance, ptr) {
  // Read from WASM memory
  const memory = new Uint8Array(instance.exports.memory.buffer);
  // Simplified - real implementation would properly decode
  return {
    success: true,
    new_state: 'QmNewState',
    gas_used: 100,
    proof: new Uint8Array(64),
    effects: []
  };
}

async function hashWasm(wasmModule) {
  const buffer = await wasmModule.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}