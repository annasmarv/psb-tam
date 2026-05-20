/**
 * PSB Authentication Module
 * Handles login, logout, and session management with Supabase Auth
 */

(function () {
  "use strict";

  // Redirect protection - prevent infinite loops
  let lastRedirectTime = 0;
  const REDIRECT_COOLDOWN = 2000;

  // Protected pages (tanpa ekstensi, karena Cloudflare Pages strip .html dari URL)
  const PROTECTED_PAGES = ['dashboard', 'settings'];
  const LOGIN_PAGES = ['login', 'index'];

  /**
   * Normalisasi nama halaman: strip ekstensi .html dan query string.
   * Cloudflare Pages serve dashboard.html di /dashboard (tanpa .html).
   */
  function getPageName() {
    var raw = window.location.pathname.split('/').pop() || 'index';
    raw = raw.split('?')[0].split('#')[0];
    return raw.replace(/\.html$/i, '') || 'index';
  }

  // ─── SYNCHRONOUS GUARD ───────────────────────────────────────────────────
  // Runs immediately when auth.js is parsed in <head>, BEFORE the browser
  // renders any body content.  Keeps the page invisible until the async
  // session check either confirms the user or redirects to login.
  (function immediateHide() {
    if (PROTECTED_PAGES.includes(getPageName())) {
      document.documentElement.style.visibility = 'hidden';
    }
  })();

  /**
   * Helper: Can we redirect right now?
   */
  function canRedirect() {
    const now = Date.now();
    if (now - lastRedirectTime < REDIRECT_COOLDOWN) {
      return false;
    }
    lastRedirectTime = now;
    return true;
  }

  /**
   * Helper: Redirect to base URL (login)
   */
  function redirectToLogin() {
    if (canRedirect()) {
      window.location.replace('/');
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
   * Reveal the protected page after auth is confirmed.
   * Dispatch 'psb:auth-ok' agar page logic (init, load data) baru berjalan
   * SETELAH sesi terverifikasi — mencegah data tampil sebelum auth selesai.
   */
  function revealPage() {
    document.documentElement.style.visibility = '';
    document.dispatchEvent(new CustomEvent('psb:auth-ok'));
  }

  /**
   * Check session and protect pages.
   * Uses getSession() which reads localStorage AND auto-refreshes expired tokens.
   */
  async function protectPage() {
    const currentPage = getPageName();
    const isProtected = PROTECTED_PAGES.includes(currentPage);
    const isLoginPage = LOGIN_PAGES.includes(currentPage);

    if (isProtected) {
      document.documentElement.style.visibility = 'hidden';
    }

    const supabase = await ensureSupabase();
    if (!supabase) {
      console.error('[Auth] Supabase unavailable');
      if (isProtected) redirectToLogin();
      return false;
    }

    try {
      // Failsafe: jika getSession() tidak selesai dalam 8 detik, reveal page
      // (token ada di localStorage tapi mungkin ada masalah refresh)
      const timeoutResult = { data: { session: '__timeout__' }, error: null };
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise(resolve => setTimeout(() => resolve(timeoutResult), 8000))
      ]);

      const isTimeout = sessionResult.data?.session === '__timeout__';
      const { data, error } = sessionResult;
      const session = isTimeout ? '__timeout__' : (data?.session ?? null);

      if (isProtected) {
        if (!isTimeout && (error || !session)) {
          redirectToLogin();
          return false;
        }
        revealPage();
        return true;
      }

      if (isLoginPage && !isTimeout && session && !error) {
        window.location.replace('dashboard.html');
        return false;
      }

      return true;
    } catch (err) {
      console.error('[Auth] protectPage error:', err);
      if (isProtected) redirectToLogin();
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
        window.location.replace('/');
        return;
      }

      try {
        await supabase.auth.signOut();
        localStorage.removeItem('psb_user');
        window.location.replace('/');
      } catch (error) {
        console.error('[Auth] Logout error:', error);
        window.location.replace('/');
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
