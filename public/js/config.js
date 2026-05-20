(function () {
  "use strict";

  // DEV_CONFIG hanya digunakan saat localhost/development.
  // Produksi WAJIB menggunakan window.__ENV__ yang diinjeksi oleh _middleware.js
  // dari Cloudflare Pages environment variables.
  // JANGAN isi nilai ini untuk produksi — biarkan kosong.
  const DEV_CONFIG = {
    SUPABASE_URL: "",
    SUPABASE_ANON_KEY: ""
  };

  const IS_DEV = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname === '');

  function waitForSupabaseLib() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 100;
      
      function check() {
        // Supabase v2 CDN creates window.supabase with createClient method
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          // console.log('[Config] Supabase library loaded');
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(check, 50);
        } else {
          // console.error('[Config] Supabase library failed to load after 5 seconds');
          resolve();
        }
      }
      check();
    });
  }

  window.Config = {
    get(key) {
      // 1. Prioritas utama: window.__ENV__ dari Cloudflare Pages middleware
      if (window.__ENV__ && window.__ENV__[key]) {
        return window.__ENV__[key];
      }

      // 2. localStorage hanya boleh digunakan di localhost/development
      // (mencegah manipulasi credentials oleh pihak luar di produksi)
      if (IS_DEV) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed[key]) return parsed[key];
          } catch {
            return stored;
          }
        }

        // 3. DEV_CONFIG hanya di localhost (dan saat kosong pun tidak masalah)
        if (DEV_CONFIG[key]) return DEV_CONFIG[key];
      }

      return "";
    },

    getSupabaseConfig() {
      return {
        url: this.get("SUPABASE_URL"),
        key: this.get("SUPABASE_ANON_KEY")
      };
    },

    initSupabase() {
      // Check if already initialized correctly
      if (window.__supabaseClient && typeof window.__supabaseClient.from === 'function') {
        return window.__supabaseClient;
      }

      const config = this.getSupabaseConfig();
      
      if (!config.url || !config.key) {
        // console.error('[Config] Supabase configuration missing');
        return null;
      }

      // Check if Supabase library is available (has createClient method)
      if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
        // console.error('[Config] Supabase library not available');
        return null;
      }

      try {
        // Use createClient from the CDN library to create client
        const client = window.supabase.createClient(config.url, config.key);
        
        if (typeof client.from !== 'function') {
          // console.error('[Config] Invalid Supabase client - .from() method missing');
          return null;
        }
        
        // Store in separate variable to avoid confusion with library
        window.__supabaseClient = client;
        // console.log('[Config] Supabase initialized');
        return window.__supabaseClient;
      } catch (error) {
        // console.error('[Config] Initialization failed:', error);
        return null;
      }
    }
  };

  // Auto-initialize when library is ready
  waitForSupabaseLib().then(() => {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      // console.log('[Config] Library ready - auto-initializing client');
      window.Config.initSupabase();
    }
  });
})();
