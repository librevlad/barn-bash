/* =========================================================================
   Frantics — Pretext hooks
   -------------------------------------------------------------------------
   Thin wrapper around client-shared/pretext.js that exposes a tiny imperative
   API to non-module scripts (gameplay.js, main.js, host/index.html):

     PretextHooks.measure(el)         — prepare + layout one element,
                                         applies minHeight to match content.
     PretextHooks.release(el)         — stop tracking an element.
     PretextHooks.relayoutAll()       — re-run layout() on everything.
     PretextHooks.ready(fn)           — run fn once Pretext + fonts are loaded.

   Gameplay and host code should call measure() whenever they SET the
   textContent of a text block that should size to its content (narrator
   quips, winner hero, game-master zingers, rules tooltips). The hook stays
   a no-op until Pretext + fonts resolve, so early calls are safe.
   ========================================================================= */
(function () {
  var api = {
    isReady: false,
    _Pretext: null,
    _waiters: [],
    _tracked: new Map(), // el -> { handle, font, text }
    _ro: null,
  };

  // Dynamic ES-module import works from a classic script. Returns a
  // promise; we pair it with document.fonts.ready so we never prepare
  // with fallback metrics.
  var fontsReady = (document.fonts && document.fonts.ready)
    ? document.fonts.ready
    : new Promise(function (r) {
        if (document.readyState === 'complete') r();
        else window.addEventListener('load', r);
      });

  Promise.all([
    import('/shared/pretext.js').catch(function (e) {
      console.warn('[pretext-hooks] import failed', e);
      return null;
    }),
    fontsReady,
  ]).then(function (results) {
    var mod = results[0];
    if (!mod) return;
    api._Pretext = mod;
    api.isReady = true;
    // Re-measure anything that was queued before load
    var waiters = api._waiters.splice(0);
    waiters.forEach(function (fn) { try { fn(); } catch (e) {} });
    // Connect global ResizeObserver for all tracked elements
    api._ro = new ResizeObserver(function () { api.relayoutAll(); });
    api._ro.observe(document.body);
    // Re-layout on window resize (catches the initial sizing)
    api.relayoutAll();
  });

  function fontOf(el) {
    var cs = getComputedStyle(el);
    if (cs.font && cs.font.trim()) return cs.font;
    return (cs.fontStyle || 'normal') + ' ' +
           (cs.fontWeight || '400') + ' ' +
           cs.fontSize + '/' + cs.lineHeight + ' ' + cs.fontFamily;
  }
  function lineHeightOf(el) {
    var lh = getComputedStyle(el).lineHeight;
    if (lh === 'normal') return parseFloat(getComputedStyle(el).fontSize) * 1.2;
    var n = parseFloat(lh);
    return isNaN(n) ? parseFloat(getComputedStyle(el).fontSize) * 1.4 : n;
  }

  api.whenReady = function (fn) {
    if (api._Pretext) fn();
    else api._waiters.push(fn);
  };

  api.measure = function (el) {
    if (!el) return;
    if (!api._Pretext) {
      // Queue so it runs once Pretext loads. Dedup on the element.
      if (!api._tracked.has(el)) {
        api._tracked.set(el, null);
        api._waiters.push(function () { api.measure(el); });
      }
      return;
    }
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text) { api.release(el); return; }
    var font = fontOf(el);
    var existing = api._tracked.get(el);
    if (existing && existing.text === text && existing.font === font) {
      // Still re-run layout in case width changed
      layoutFor(el, existing);
      return;
    }
    var handle = api._Pretext.prepare(text, font);
    var rec = { handle: handle, font: font, text: text };
    api._tracked.set(el, rec);
    layoutFor(el, rec);
  };

  function layoutFor(el, rec) {
    var width = el.clientWidth;
    if (width <= 0) return;
    var lh = lineHeightOf(el);
    var r = api._Pretext.layout(rec.handle, width, lh);
    el.style.minHeight = r.height + 'px';
  }

  api.release = function (el) {
    api._tracked.delete(el);
  };

  api.relayoutAll = function () {
    if (!api._Pretext) return;
    api._tracked.forEach(function (rec, el) {
      if (rec) layoutFor(el, rec);
    });
  };

  window.PretextHooks = api;
})();
