/**
 * Cloudflare Pages Function Middleware
 * Injects environment variables into HTML pages
 *
 * This function runs on Cloudflare edge before serving HTML pages
 * It injects environment variables as inline script
 */

export async function onRequest(context) {
  const { request, env, next } = context;
  
  const url = new URL(request.url);
  try {
    // Get the response
    const response = await next();

    // Only inject into HTML pages
    const contentType = (response.headers && response.headers.get ? response.headers.get('content-type') : '') || '';
    if (!contentType.includes('text/html')) {
      return response;
    }

    // Get environment variables
    const envVars = {
    SUPABASE_URL: env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || '',
    APP_NAME: env.APP_NAME || 'PSB SMK Tahasus Plus Al Mardliyah',
    APP_ENV: env.APP_ENV || 'production'
  };

  // Create inline script to inject
  const envScript = `
    <script>
      // Environment variables injected by Cloudflare Pages
      window.__ENV__ = ${JSON.stringify(envVars)};

      // Also set to window.ENV for backward compatibility
      window.ENV = window.__ENV__;

      // Log for debugging
      if (window.location.hostname.includes('pages.dev') || window.location.hostname === 'localhost') {
        console.log('[Middleware] Environment variables loaded');
        console.log('[Middleware] Current path:', window.location.pathname);
      }
    </script>
  `;

    // Get response text (use clone to avoid consuming original stream)
    let html = '';
    try {
      const cloned = response.clone();
      html = await cloned.text();
    } catch (e) {
      // If body can't be read as text, return original response
      return response;
    }

    // Inject script before closing </head> tag or at start of <body>
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${envScript}\n</head>`);
    } else if (html.includes('<body')) {
      html = html.replace('<body', `${envScript}\n<body`);
    } else {
      // Fallback: prepend to HTML
      html = envScript + html;
    }

    // Copy headers to new Headers instance to avoid locked headers issues
    const newHeaders = new Headers(response.headers || {});
    // Ensure content-type remains text/html
    if (!newHeaders.get('content-type')) {
      newHeaders.set('content-type', 'text/html; charset=utf-8');
    }

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  } catch (err) {
    // On any unexpected error, return a safe 500 response or delegate to next
    try {
      const fallback = await next();
      return fallback;
    } catch (_) {
      return new Response('Internal Server Error', { status: 500 });
    }
  }
}
