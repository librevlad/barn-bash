// client-controller/lib/vibrate.js
// Safe haptic wrapper — no-ops on devices without the vibration API, and
// swallows any SecurityError from locked tabs.

function vibrate(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {}
}

Object.assign(window, { vibrate });
