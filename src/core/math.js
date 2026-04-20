// src/core/math.js
// Pure number + sampling helpers used across the codebase. Small enough
// to live in one file; no React, no DOM.

function randBetween(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

Object.assign(window, { randBetween, clamp, pick });
