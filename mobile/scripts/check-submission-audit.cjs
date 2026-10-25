// Failure-reproduction checks. This audit is red until the identified defects are fixed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');
function load(file, environment) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(require.resolve(file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, ...environment });
  return exports;
}

test('HTTP 413 with an HTML body must explain the upload-size failure', async () => {
  const { request } = load('../src/services/api/client.ts', {
    process: { env: { EXPO_PUBLIC_API_URL: 'http://audit/api' } },
    require: (id) => id === 'react-native' ? { Platform: { OS: 'android' } } : { getItemAsync: async () => null },
    Headers, FormData, AbortController, setTimeout, clearTimeout,
    fetch: async () => new Response('<html>Request Entity Too Large</html>', { status: 413 }),
  });
  await assert.rejects(request('/items', { method: 'POST', body: new FormData() }),
    (error) => error.status === 413 && /large|size|limit|MB/i.test(error.message),
    'The app hides the real size limit behind an invalid-response error');
});

class NativeFormData { append() {} }
const report = {
  name: 'Audit item', description: 'Private identifying description', itemType: 'found',
  categoryCode: 'CAT0001', branchCode: 'BRH0001', locationCode: 'LOC0001',
  dateFound: '2026-10-25T12:00', publicColor: 'Blue',
};
function service() {
  const calls = [];
  const { submitReport } = load('../src/services/api/gapangita.ts', {
    require: (id) => id === 'react-native' ? { Platform: { OS: 'android' } } : {
      ApiError: Error, request: async (...args) => { calls.push(args); return { id: 1 }; },
    },
    FormData: NativeFormData,
  });
  return { submitReport, calls };
}
test('report rejects an oversized photo before starting a guaranteed oversized request', async () => {
  const { submitReport, calls } = service();
  await assert.rejects(submitReport({ ...report, image: {
    uri: 'file:///cache/item.jpg', name: 'item.jpg', mimeType: 'image/jpeg', size: 11 * 1024 * 1024,
  } }), /large|size|limit|MB/i);
  assert.equal(calls.length, 0);
});
test('report attachment feedback rejects unsupported HEIC instead of silently dropping the photo', async () => {
  const { submitReport, calls } = service();
  await assert.rejects(submitReport({ ...report, image: {
    uri: 'file:///cache/item.heic', name: 'item.heic', mimeType: 'image/heic', size: 1024,
  } }), /format|type|HEIC|JPEG|PNG|support/i);
  assert.equal(calls.length, 0);
});
