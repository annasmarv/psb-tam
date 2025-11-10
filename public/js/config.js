(function () {
  "use strict";

  const DEV_CONFIG = {
    SUPABASE_URL: "https://nuuvatfivugzkfwuzlbn.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51dXZhdGZpdnVnemtmd3V6bGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzOTg3ODQsImV4cCI6MjA3Nzk3NDc4NH0.JuzKhrLzeH9ZVz1nW6bwj0Ob6uIPRHS941Txnn-MtvU"
  };

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
      if (window.__ENV__ && window.__ENV__[key]) {
        return window.__ENV__[key];
      }

      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed[key]) return parsed[key];
        } catch {
          return stored;
        }
      }

      return DEV_CONFIG[key] || "";
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
