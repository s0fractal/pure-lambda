// packages/pcta-vitest/index.js - Minimal Vitest Plugin

export default function pctaVitestPlugin() {
  return {
    name: 'pcta-vitest',

    config() {
      return {
        test: {
          setupFiles: [new URL('./setup.js', import.meta.url).pathname]
        }
      };
    },

    configureServer(server) {
      // Hook into test execution
      server.on('test:before', ({ test }) => {
        if (globalThis.__pl) {
          // Wrap test functions with memoization
          const original = test.fn;
          if (original && typeof original === 'function') {
            test.fn = globalThis.__pl.wrap(original, { name: test.name });
          }
        }
      });

      server.on('test:after', ({ test }) => {
        // Log stats after each test
        if (globalThis.__pl && process.env.PL_DEBUG) {
          const stats = globalThis.__pl.getStats();
          console.log(`[PCTA] ${test.name}: ${stats.cache_rate.toFixed(1)}% cache rate`);
        }
      });
    }
  };
}