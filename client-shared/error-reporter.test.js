// Phase 35 — error-reporter unit tests. Exercises the pure helpers
// (_build shape truncation + _shouldReport throttle) without an
// actual browser. The DOM / fetch side-effects run only under a real
// window.
const test = require('node:test');
const assert = require('node:assert');

// Fresh module instance per test via require cache bust.
function loadFresh() {
  delete require.cache[require.resolve('./error-reporter')];
  return require('./error-reporter');
}

test('_build truncates long message and stack', () => {
  const ER = loadFresh();
  const longMsg = 'x'.repeat(1000);
  const longStack = 'y'.repeat(5000);
  const built = ER._build('error', { message: longMsg, stack: longStack });
  assert.strictEqual(built.source, 'error');
  assert.ok(built.message.length <= 500, 'message capped at 500');
  assert.ok(built.stack.length <= 2000, 'stack capped at 2000');
});

test('_build tolerates missing fields', () => {
  const ER = loadFresh();
  const built = ER._build('unhandledrejection', {});
  assert.strictEqual(built.source, 'unhandledrejection');
  assert.strictEqual(built.message, '');
  assert.strictEqual(built.stack, '');
  assert.strictEqual(built.filename, null);
  assert.strictEqual(built.lineno, null);
  assert.strictEqual(built.colno, null);
});

test('_build extracts fields from unhandledrejection reason', () => {
  const ER = loadFresh();
  const built = ER._build('unhandledrejection', {
    message: 'promise blew up',
    stack: 'Error: promise blew up\n  at foo',
    filename: 'foo.js',
    lineno: 42,
    colno: 7,
  });
  assert.strictEqual(built.message, 'promise blew up');
  assert.match(built.stack, /promise blew up/);
  assert.strictEqual(built.lineno, 42);
  assert.strictEqual(built.colno, 7);
});

test('_shouldReport allows 10 then throttles', () => {
  const ER = loadFresh();
  for (let i = 0; i < 10; i++) {
    assert.strictEqual(ER._shouldReport(), true, 'first 10 pass');
  }
  assert.strictEqual(ER._shouldReport(), false, '11th throttled');
  assert.strictEqual(ER._shouldReport(), false, '12th throttled');
});
