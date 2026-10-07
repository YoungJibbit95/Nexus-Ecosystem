const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildContentSecurityPolicy, applySecurityHeaders } = require('./contentSecurityPolicy.cjs');

test('production CSP restricts executable content and network while preserving documented API origins', () => {
  const directives = Object.fromEntries(buildContentSecurityPolicy().split('; ').map(entry => { const [key,...values]=entry.split(' '); return [key,values]; }));
  assert.deepEqual(directives['script-src'],["'self'"]);
  for(const key of ['object-src','frame-src','frame-ancestors','base-uri','form-action']) assert.deepEqual(directives[key],["'none'"]);
  assert.deepEqual(directives['connect-src'],["'self'",'https://nexus-api.cloud:*','http://localhost:*','https://localhost:*','http://127.0.0.1:*','https://127.0.0.1:*']);
  assert.doesNotMatch(buildContentSecurityPolicy(),/unsafe-eval|script-src[^;]*unsafe-inline|https:;|base44/);
  assert.doesNotMatch(buildContentSecurityPolicy({meta:true}),/frame-ancestors/);
});

test('development CSP permits React refresh and exact HMR socket without changing production', () => {
  const dev = buildContentSecurityPolicy({isDev:true,devUrl:'http://localhost:5176/'});
  assert.match(dev,/script-src 'self' 'unsafe-inline'/);
  assert.match(dev,/ws:\/\/localhost:5176/);
  assert.doesNotMatch(dev,/unsafe-eval|ws:\/\/\*/);
  assert.throws(()=>buildContentSecurityPolicy({isDev:true,devUrl:'javascript:evil()'}),/Invalid/);
  assert.throws(()=>buildContentSecurityPolicy({isDev:true,devUrl:'http://user:pass@localhost'}),/Invalid/);
  assert.doesNotMatch(buildContentSecurityPolicy({devUrl:'https://evil.invalid'}),/evil.invalid|unsafe-inline.*script/);
});

test('native document headers replace case aliases and preserve unrelated responses', () => {
  let listener;
  applySecurityHeaders({targetSession:{webRequest:{onHeadersReceived:cb=>{listener=cb;}}},isDev:false});
  let response;
  listener({resourceType:'mainFrame',responseHeaders:{'content-security-policy':["script-src * 'unsafe-eval'"],'x-frame-options':['ALLOWALL'],'Content-Type':['text/html']}},value=>{response=value;});
  assert.equal(response.responseHeaders['content-security-policy'],undefined);
  assert.equal(response.responseHeaders['Content-Security-Policy'][0],buildContentSecurityPolicy());
  assert.deepEqual(response.responseHeaders['X-Frame-Options'],['DENY']);
  assert.deepEqual(response.responseHeaders['Content-Type'],['text/html']);
  listener({resourceType:'xhr',responseHeaders:{a:['b']}},value=>{response=value;});
  assert.deepEqual(response,{});
});
