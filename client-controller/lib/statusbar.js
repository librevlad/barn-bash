// client-controller/lib/statusbar.js
// React hook destructure for the rest of the controller scripts to pick
// up at global scope, plus the small useStatusbar hook that syncs the
// bottom-left green/red connection dot to WebSocket state.

const { useState, useEffect, useRef } = React;

function useStatusbar(connected) {
  useEffect(() => {
    const bar = document.getElementById('statusbar');
    const txt = document.getElementById('status-text');
    if (bar) bar.classList.toggle('connected', !!connected);
    if (txt) txt.textContent = connected ? 'connected' : 'connecting…';
  }, [connected]);
}

Object.assign(window, { useStatusbar });
