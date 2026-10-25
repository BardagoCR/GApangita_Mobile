const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

// Execute the real dialog hook with a small hook host; no native renderer needed.
function host() {
  const slots = [];
  let index = 0;
  let cleanup;
  const react = {
    useState(value) { const key = index++; if (!(key in slots)) slots[key] = value; return [slots[key], value => { slots[key] = value; }]; },
    useRef(value) { const key = index++; if (!(key in slots)) slots[key] = { current: value }; return slots[key]; },
    useCallback(fn) { return fn; },
    useEffect(fn) { if (!cleanup) cleanup = fn(); },
  };
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  const deps = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Keyboard: { dismiss() {} }, Modal: 'Modal', ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: x => x } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '@/src/components/ui': { ActionButton: 'ActionButton' },
    '@/src/theme/colors': { colors: {} },
  };
  const source = ts.transpileModule(fs.readFileSync(require.resolve('../src/components/AppDialog.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, require: id => deps[id] });
  return { render() { index = 0; return exports.useAppDialog(); }, unmount() { cleanup(); } };
}
function buttons(node) {
  if (!node || typeof node !== 'object') return [];
  if (node.type === 'ActionButton') return [node.props];
  return [node.props?.children].flat(Infinity).flatMap(buttons);
}
const options = { title: 'Submit claim?', message: 'Staff will review it.', confirmLabel: 'Submit claim' };

test('confirm stays pending until explicit approval', async () => {
  const h = host(); let settled = false;
  const result = h.render().confirm(options).then(value => { settled = true; return value; });
  await Promise.resolve(); assert.equal(settled, false);
  const dialog = h.render().dialog;
  assert.equal(dialog.props.visible, true);
  buttons(dialog).find(x => x.title === 'Submit claim').onPress();
  assert.equal(await result, true);
  assert.equal(h.render().dialog.props.visible, false);
});
test('cancel does not authorize submission', async () => {
  const h = host(); const result = h.render().confirm(options);
  buttons(h.render().dialog).find(x => x.title === 'Cancel').onPress();
  assert.equal(await result, false);
});
test('Android back does not authorize submission', async () => {
  const h = host(); const result = h.render().confirm(options);
  h.render().dialog.props.onRequestClose();
  assert.equal(await result, false);
});
test('unmount cancels a pending confirmation', async () => {
  const h = host(); const result = h.render().confirm(options);
  h.unmount(); assert.equal(await result, false);
});
test('overlapping prompts cannot replace a pending decision', async () => {
  const h = host(); const result = h.render().confirm(options);
  assert.equal(await h.render().confirm({ ...options, title: 'Other action' }), false);
  buttons(h.render().dialog).find(x => x.title === 'Cancel').onPress();
  assert.equal(await result, false);
});
test('success notice offers one acknowledgment button', async () => {
  const h = host(); const result = h.render().notify({ title: 'Saved', message: 'Complete', tone: 'success' });
  const actions = buttons(h.render().dialog);
  assert.equal(actions.length, 1); assert.equal(actions[0].title, 'Done');
  actions[0].onPress(); assert.equal(await result, true);
});
