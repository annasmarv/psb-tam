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
  
  // Debug logging (remove in production)
  console.log('[Middleware] Request:', url.pathname);

  // Get the response
  const response = await next();

  // Only inject into HTML pages
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  // Get environment variables
  const envVars = {
    SUPABASE_URL: env.SUPABASE_URL || 'https://nuuvatfivugzkfwuzlbn.supabase.co',
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51dXZhdGZpdnVnemtmd3V6bGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzOTg3ODQsImV4cCI6MjA3Nzk3NDc4NH0.JuzKhrLzeH9ZVz1nW6bwj0Ob6uIPRHS941Txnn-MtvU',
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

  // Get response text
  let html = await response.text();

  // Inject script before closing </head> tag or at start of <body>
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${envScript}\n</head>`);
  } else if (html.includes('<body')) {
    html = html.replace('<body', `${envScript}\n<body`);
  } else {
    // Fallback: prepend to HTML
    html = envScript + html;
  }

  // Return modified response
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}
