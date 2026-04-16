/* =========================================================================
   Frantics — Functional icon sprite (Phase 4b)
   -------------------------------------------------------------------------
   One <svg hidden> block injected into document.body at load time, holding
   every functional icon as a <symbol>. Consumers fetch icons via:
       container.innerHTML = Icons.use('phone');        // string (safe in templates)
       container.appendChild(Icons.el('arrow-right'));  // live DOM node

   Icons render at 24x24 by default and inherit stroke/fill from currentColor
   so color comes from the parent CSS. To resize, set CSS width/height on
   the .icon class surface.

   Animal identities stay emoji — they're part of player fantasy and belong
   in the cultural layer, not the functional-UI layer. This sprite is only
   for chrome (phone frames, checkmarks, close buttons, etc).
   ========================================================================= */

(function (root) {
  'use strict';

  /* Each entry: id → inner SVG markup (paths, no <svg> wrapper).
     Stroke colors all reference currentColor so icons tint with CSS.
     Viewbox is 24x24 for every icon. */
  var SPRITE = {
    phone:
      '<path d="M7 2.5a2.5 2.5 0 0 0-2.5 2.5v14a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5V5A2.5 2.5 0 0 0 17 2.5H7Zm0 1.5h10a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" fill="currentColor"/>' +
      '<path d="M10 18.25h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',

    wifi:
      '<path d="M12 17.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z" fill="currentColor"/>' +
      '<path d="M4 9.5a12 12 0 0 1 16 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
      '<path d="M7 12.5a8 8 0 0 1 10 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
      '<path d="M9.5 15.25a4 4 0 0 1 5 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>',

    'arrow-right':
      '<path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',

    check:
      '<path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',

    close:
      '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',

    gear:
      '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0 1.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" fill="currentColor"/>' +
      '<path d="M10.6 2.5h2.8l.45 2.1a7.4 7.4 0 0 1 1.9 1.1l2-.65 1.4 2.4-1.6 1.45c.1.6.15 1.2.15 1.6s-.05 1-.15 1.6l1.6 1.45-1.4 2.4-2-.65a7.4 7.4 0 0 1-1.9 1.1l-.45 2.1h-2.8l-.45-2.1a7.4 7.4 0 0 1-1.9-1.1l-2 .65-1.4-2.4 1.6-1.45c-.1-.6-.15-1.2-.15-1.6s.05-1 .15-1.6L3.45 7.45l1.4-2.4 2 .65a7.4 7.4 0 0 1 1.9-1.1l.45-2.1Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  };

  var SPRITE_ID = 'frantics-icon-sprite';

  function ensureSprite() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(SPRITE_ID)) return;

    var wrap = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.display = 'none';

    var parts = ['<svg xmlns="http://www.w3.org/2000/svg" id="' + SPRITE_ID + '">'];
    Object.keys(SPRITE).forEach(function (id) {
      parts.push('<symbol id="icon-' + id + '" viewBox="0 0 24 24">' + SPRITE[id] + '</symbol>');
    });
    parts.push('</svg>');
    wrap.innerHTML = parts.join('');

    if (document.body) document.body.insertBefore(wrap, document.body.firstChild);
    else document.addEventListener('DOMContentLoaded', function () {
      document.body.insertBefore(wrap, document.body.firstChild);
    });
  }

  function use(id) {
    if (!SPRITE[id]) return '';
    return '<svg class="icon" aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24">' +
      '<use href="#icon-' + id + '"></use></svg>';
  }

  function el(id) {
    if (!SPRITE[id]) return null;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('viewBox', '0 0 24 24');
    var useEl = document.createElementNS(ns, 'use');
    useEl.setAttribute('href', '#icon-' + id);
    svg.appendChild(useEl);
    return svg;
  }

  ensureSprite();

  root.Icons = {
    use: use,
    el: el,
    has: function (id) { return Object.prototype.hasOwnProperty.call(SPRITE, id); },
    refresh: ensureSprite,
  };
})(typeof window !== 'undefined' ? window : this);
