/**
 * PSB Authentication Module
 * Handles login, logout, and session management with Supabase Auth
 */

(function () {
  "use strict";

  // Redirect protection - prevent infinite loops
  let lastRedirectTime = 0;
  const REDIRECT_COOLDOWN = 2000;

  // Protected pages
  const PROTECTED_PAGES = ['dashboard.html', 'settings.html'];

  /**
   * Helper: Can we redirect right now?
   */
  function canRedirect() {
    const now = Date.now();
    if (now - lastRedirectTime < REDIRECT_COOLDOWN) {
      console.warn('[Auth] Redirect blocked - too soon');
      return false;
    }
    lastRedirectTime = now;
    return true;
  }

  /**
   * Helper: Redirect to login page
   */
  function redirectToLogin() {
    if (canRedirect()) {
      console.log('[Auth] Redirecting to login...');
      window.location.href = 'login.html';
    }
  }

  /**
   * Helper: Initialize Supabase from Config
   */
  async function ensureSupabase() {
    // Check for already initialized client
    if (window.__supabaseClient && typeof window.__supabaseClient.auth === 'object') {
      return window.__supabaseClient;
    }

    // Try to initialize via Config
    if (window.Config && typeof window.Config.initSupabase === 'function') {
      const client = window.Config.initSupabase();
      if (client && typeof client.auth === 'object') {
        return client;
      }
    }

    // Wait for auto-initialization with retry loop
    for (let i = 0; i < 100; i++) {
      if (window.__supabaseClient && typeof window.__supabaseClient.auth === 'object') {
        return window.__supabaseClient;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.error('[Auth] Cannot initialize Supabase');
    return null;
  }

  /**
   * Check session and protect pages
   */
  async function protectPage() {
    const supabase = await ensureSupabase();
    
    if (!supabase || typeof supabase.auth.getSession !== 'function') {
      console.error('[Auth] Supabase auth not available');
      return false;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[Auth] Session check failed:', error);
        return false;
      }

      const currentPage = window.location.pathname.split('/').pop() || 'index.html';

      // Check if this is a protected page
      if (PROTECTED_PAGES.includes(currentPage)) {
        if (!session) {
          console.log('[Auth] No session, redirecting to login...');
          redirectToLogin();
          return false;
        }
        console.log('[Auth] Session valid, page protected');
        return true;
      }

      // If on login page and already authenticated, go to dashboard
      if (currentPage === 'login.html' && session) {
        console.log('[Auth] Already authenticated, redirecting to dashboard...');
        window.location.href = 'dashboard.html';
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Auth] Error in protectPage:', error);
      return false;
    }
  }

  /**
   * Export Auth object
   */
  window.Auth = {
    /**
     * Login with email and password
     */
    async login(email, password) {
      const supabase = await ensureSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase tidak terkoneksi' };
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) {
          const msg = error.message.includes('Invalid') 
            ? 'Email atau password salah'
            : error.message;
          return { success: false, error: msg };
        }

        if (data.user) {
          localStorage.setItem('psb_user', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            role: data.user.user_metadata?.role || 'admin',
            loginAt: new Date().toISOString()
          }));
          return { success: true, user: data.user };
        }

        return { success: false, error: 'Login gagal' };
      } catch (error) {
        console.error('[Auth] Login error:', error);
        return { success: false, error: 'Terjadi kesalahan sistem' };
      }
    },

    /**
     * Logout
     */
    async logout() {
      const supabase = await ensureSupabase();
      if (!supabase) {
        window.location.href = 'login.html';
        return;
      }

      try {
        await supabase.auth.signOut();
        localStorage.removeItem('psb_user');
        window.location.href = 'login.html';
      } catch (error) {
        console.error('[Auth] Logout error:', error);
        window.location.href = 'login.html';
      }
    },

    /**
     * Get current session
     */
    async getSession() {
      const supabase = await ensureSupabase();
      if (!supabase) {
        return null;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
      } catch (error) {
        console.error('[Auth] Get session error:', error);
        return null;
      }
    },

    /**
     * Get current user
     */
    async getUser() {
      const supabase = await ensureSupabase();
      if (!supabase) {
        return null;
      }

      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
      } catch (error) {
        console.error('[Auth] Get user error:', error);
        return null;
      }
    },

    /**
     * Check if user is authenticated
     */
    async isAuthenticated() {
      const session = await this.getSession();
      return !!session;
    },

    /**
     * Protect current page from unauthorized access
     */
    async protectPage() {
      return protectPage();
    }
  };

  // Auto-protect pages on load
  document.addEventListener('DOMContentLoaded', async function() {
    await protectPage();
  }, { once: true });

})();
