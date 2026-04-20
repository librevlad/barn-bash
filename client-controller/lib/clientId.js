// client-controller/lib/clientId.js
// Stable clientId saved in localStorage so the server can re-use the same
// playerId when a phone reloads or reconnects. Without this, every reload
// lands on a new id and the host's gameState.remoteId mapping goes stale.

const CLIENT_ID_KEY = 'barn-bash-controller-clientId';

function getOrMakeClientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch (_) { return null; }
}

Object.assign(window, { CLIENT_ID_KEY, getOrMakeClientId });
