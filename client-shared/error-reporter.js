// Phase 35 — client-side error reporter. Hooks window.onerror and
// window.onunhandledrejection; forwards captured errors to the server
// as POST /api/log. Pairs with Phase 32 logger on the server side:
// client errors land in the same JSON-per-line stream as server-side
// lifecycle events, sliceable by `.event === 'client.error'`.
//
// Throttle: max 10 reports/minute per tab to avoid a feedback loop
// if the error fires inside a render tick.
(function(global) {
  'use strict';

  const MAX_PER_MINUTE = 10;
  const WINDOW_MS = 60_000;
  const _recent = [];

  function _shouldReport() {
    const now = Date.now();
    while (_recent.length && _recent[0] < now - WINDOW_MS) _recent.shift();
    if (_recent.length >= MAX_PER_MINUTE) return false;
    _recent.push(now);
    return true;
  }

  function _send(payload) {
    try {
      // sendBeacon is fire-and-forget; survives page unload, non-blocking.
      // Fall back to fetch(keepalive: true) if sendBeacon unavailable.
      const body = JSON.stringify(payload);
      if (navigator && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon('/api/log', blob);
        return;
      }
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
      }).catch(() => { /* swallow — can't report the reporter */ });
    } catch (_) { /* same */ }
  }

  function _build(source, raw) {
    return {
      source: source,                          // 'error' | 'unhandledrejection'
      message: String(raw.message || raw.reason || '').slice(0, 500),
      stack: String(raw.stack || (raw.error && raw.error.stack) || '').slice(0, 2000),
      filename: raw.filename || null,
      lineno: typeof raw.lineno === 'number' ? raw.lineno : null,
      colno: typeof raw.colno === 'number' ? raw.colno : null,
      url: (typeof location !== 'undefined' ? location.pathname : null),
      userAgent: (typeof navigator !== 'undefined' ? navigator.userAgent : '').slice(0, 200),
    };
  }

  function _onError(ev) {
    if (!_shouldReport()) return;
    _send(_build('error', {
      message: ev.message,
      stack: ev.error && ev.error.stack,
      filename: ev.filename,
      lineno: ev.lineno,
      colno: ev.colno,
    }));
  }

  function _onRejection(ev) {
    if (!_shouldReport()) return;
    const reason = ev.reason;
    _send(_build('unhandledrejection', {
      message: reason && reason.message ? reason.message : String(reason),
      stack: reason && reason.stack ? reason.stack : null,
    }));
  }

  function install() {
    if (typeof window === 'undefined') return;
    window.addEventListener('error', _onError);
    window.addEventListener('unhandledrejection', _onRejection);
  }

  const ErrorReporter = {
    install: install,
    // Exposed for tests — build + throttle check without side effects.
    _build: _build,
    _shouldReport: _shouldReport,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorReporter;
  }
  if (typeof global !== 'undefined') {
    global.ErrorReporter = ErrorReporter;
    // Auto-install when loaded in a browser. Tests import the module
    // via require() where `global !== window`, so the check below keeps
    // auto-install from firing under node:test.
    if (typeof window !== 'undefined' && global === window) {
      install();
    }
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
