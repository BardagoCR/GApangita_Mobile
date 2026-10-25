const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

class NativeFormData {
  parts = [];
  append(key, value) { this.parts.push([key, value]); }
}
function load(file, deps = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(require.resolve(file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (id) => deps[id], FormData: NativeFormData });
  return exports;
}
const input = {
  itemCode: 'ITEM_TEST', firstName: ' Test ', middleName: '', lastName: 'Visitor', contactNumber: '09123456789',
  email: 'visitor@example.com', affiliation: 'Student', lastSeenLocation: '', lastSeenDateTime: '',
  itemDescription: 'A lost bag', identifyingFeatures: 'Tear inside', contents: '', additionalEvidence: '', evidence: null,
};
const { validateClaim } = load('../src/features/claims/validation.ts');

test('evidence and optional answers can all be absent', () => {
  assert.equal(Object.keys(validateClaim(input)).length, 0);
});
test('required fields have individual messages', () => {
  const errors = validateClaim({ ...input, firstName: ' ', lastName: '', contactNumber: '', email: '', itemDescription: '', identifyingFeatures: '' });
  assert.equal(Object.keys(errors).length, 6);
  assert.match(errors.firstName, /required/);
  assert.match(errors.identifyingFeatures, /required/);
});
test('invalid dates, email and oversized answers are rejected', () => {
  const errors = validateClaim({ ...input, lastSeenDateTime: '2026-02-30T12:00', email: 'invalid', firstName: 'x'.repeat(51) });
  assert.ok(errors.lastSeenDateTime);
  assert.ok(errors.email);
  assert.ok(errors.firstName);
  assert.equal(Object.keys(validateClaim({ ...input, lastSeenDateTime: '2026-10-20T12:00' })).length, 0);
});
function api() {
  const calls = [];
  const { submitClaim } = load('../src/services/api/gapangita.ts', {
    'react-native': { Platform: { OS: 'android' } },
    './client': { ApiError: Error, request: async (...args) => { calls.push(args); return { message: 'saved' }; } },
  });
  return { calls, submitClaim };
}
test('claim without attachment uses JSON and no upload descriptor', async () => {
  const { calls, submitClaim } = api();
  await submitClaim(input);
  assert.equal(calls[0][0], '/claims');
  const body = JSON.parse(calls[0][1].body);
  assert.equal(body.claimer_first_name, 'Test');
  assert.equal(body.item_description, 'A lost bag');
  assert.equal('evidence' in body, false);
});
test('optional attachment uses multipart and preserves the native URI', async () => {
  const { calls, submitClaim } = api();
  await submitClaim({ ...input, evidence: { uri: 'file:///cache/proof.jpg', name: 'proof.jpg', mimeType: 'image/jpeg' } });
  const body = calls[0][1].body;
  assert.ok(body instanceof NativeFormData);
  const attachment = body.parts.find(([key]) => key === 'evidence')[1];
  assert.equal(attachment.uri, 'file:///cache/proof.jpg');
  assert.equal(attachment.type, 'image/jpeg');
});
test('oversized optional evidence is rejected before sending a request', async () => {
  const { calls, submitClaim } = api();
  await assert.rejects(submitClaim({ ...input, evidence: { uri: 'file:///cache/proof.jpg', name: 'proof.jpg', mimeType: 'image/jpeg', size: 6 * 1024 * 1024 } }), /5 MB/);
  assert.equal(calls.length, 0);
});
