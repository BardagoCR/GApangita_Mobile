// Exercise the real TypeScript client with mocked transport; no server is needed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function client(fetch, fastTimeout = false) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(require.resolve('../src/services/api/client.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, process: { env: { EXPO_PUBLIC_API_URL: 'http://test/api' } },
    require: (id) => id === 'react-native' ? { Platform: { OS: 'android' } } : {
      getItemAsync: async () => 'test-csrf', setItemAsync: async () => {}, deleteItemAsync: async () => {},
    },
    Headers, FormData, AbortController, fetch,
    setTimeout: (fn, delay) => setTimeout(fn, fastTimeout || delay < 2000 ? 0 : delay),
    clearTimeout,
  });
  return exports;
}

test('read retries a temporary outage and keeps credentials', async () => {
  let calls = 0;
  const api = client(async (url, init) => {
    assert.equal(url, 'http://test/api/search');
    assert.equal(init.credentials, 'include');
    return ++calls < 3 ? new Response('{}', { status: 503 }) : new Response('{"items":[]}');
  });
  assert.equal((await api.request('/search')).items.length, 0);
  assert.equal(calls, 3);
});

test('write sends CSRF and is never replayed on transport failure', async () => {
  let calls = 0;
  const api = client(async (_url, init) => {
    calls++;
    assert.equal(init.headers.get('X-CSRF-Token'), 'test-csrf');
    throw new TypeError('offline');
  });
  await assert.rejects(api.request('/claims', { method: 'POST', body: new FormData() }), /Check its status/);
  assert.equal(calls, 1);
});

test('deadline covers a stalled response body', async () => {
  let calls = 0;
  const api = client(async (_url, init) => {
    calls++;
    return { ok: true, status: 200, json: () => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }) };
  }, true);
  await assert.rejects(api.request('/auth-status'), /too long/);
  assert.equal(calls, 3);
});

test('authorization errors are not retried', async () => {
  let calls = 0;
  const api = client(async () => { calls++; return new Response('{"error":"Sign out first"}', { status: 403 }); });
  await assert.rejects(api.request('/claims', { method: 'POST' }), /Sign out first/);
  assert.equal(calls, 1);
});

test('malformed success payload is an error', async () => {
  const api = client(async () => new Response('<html>not JSON</html>'));
  await assert.rejects(api.request('/search'), /invalid response/);
});

test('obsolete search cancellation stops retries', async () => {
  let calls = 0;
  const api = client(async (_url, init) => {
    calls++;
    return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  });
  const controller = new AbortController();
  const pending = api.request('/search', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, /cancelled/);
  assert.equal(calls, 1);
});
