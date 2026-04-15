// ============================================================
// FRANTICS — Screen Transitions (shared)
// ============================================================
// Smooth fade/wipe between screens.
// Include via <script src="/shared/transitions.js"></script>

const Transitions = (() => {
  let overlay = null;

  function ensure() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'transition-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: var(--bg-wood-deep, #3d2817);
      pointer-events: none;
      opacity: 0; transition: opacity 0.4s ease-in-out;
    `;
    document.body.appendChild(overlay);
  }

  // Fade out → callback → fade in
  function fadeOut(callback, duration) {
    ensure();
    const ms = duration || 400;
    overlay.style.transition = `opacity ${ms}ms ease-in`;
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'all';
    setTimeout(() => {
      if (callback) callback();
      setTimeout(() => {
        overlay.style.transition = `opacity ${ms}ms ease-out`;
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
      }, 100);
    }, ms);
  }

  // Navigate with fade
  function navigateTo(url, duration) {
    ensure();
    const ms = duration || 400;
    overlay.style.transition = `opacity ${ms}ms ease-in`;
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'all';
    setTimeout(() => { window.location.href = url; }, ms);
  }

  // Fade in from black (call on page load)
  function fadeIn(duration) {
    ensure();
    overlay.style.transition = 'none';
    overlay.style.opacity = '1';
    // Force reflow
    void overlay.offsetWidth;
    const ms = duration || 600;
    overlay.style.transition = `opacity ${ms}ms ease-out`;
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
  }

  return { fadeOut, navigateTo, fadeIn };
})();
