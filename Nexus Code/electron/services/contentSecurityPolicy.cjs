"use strict";

// These destinations mirror accountSession.normalizeNexusApiEndpoint: one hosted
// API domain and loopback APIs, including user-selected local ports. GitHub calls
// use the native service and require no renderer network exception.
const API_SOURCES = ["https://nexus-api.cloud:*", "http://localhost:*", "https://localhost:*", "http://127.0.0.1:*", "https://127.0.0.1:*"];

function buildContentSecurityPolicy({ isDev = false, devUrl = "http://127.0.0.1:5175", meta = false } = {}) {
  const connect = ["'self'", ...API_SOURCES];
  if (isDev) {
    const url = new URL(devUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid development origin');
    connect.push(url.origin, `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`);
    if (['localhost','127.0.0.1'].includes(url.hostname)) {
      const socketScheme = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const port = url.port ? `:${url.port}` : '';
      // Vite and Electron can use different loopback names for the same server.
      connect.push(`${socketScheme}//localhost${port}`, `${socketScheme}//127.0.0.1${port}`);
    }
  }
  return [
    "default-src 'self'",
    `script-src 'self'${isDev ? " 'unsafe-inline'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    ...(!meta ? ["frame-ancestors 'none'"] : []),
    `connect-src ${[...new Set(connect)].join(' ')}`,
  ].join('; ');
}

function applySecurityHeaders({ targetSession, isDev, devUrl }) {
  const policy = buildContentSecurityPolicy({ isDev, devUrl });
  const secured = {
    'Content-Security-Policy': policy,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  const names = new Set(Object.keys(secured).map(name => name.toLowerCase()));
  targetSession.webRequest.onHeadersReceived((details, callback) => {
    if (!['mainFrame', 'subFrame'].includes(details.resourceType)) return callback({});
    const headers = Object.fromEntries(Object.entries(details.responseHeaders || {}).filter(([name]) => !names.has(name.toLowerCase())));
    for (const [name, value] of Object.entries(secured)) headers[name] = [value];
    callback({ responseHeaders: headers });
  });
}

module.exports = { buildContentSecurityPolicy, applySecurityHeaders };
