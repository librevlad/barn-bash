/* =========================================================================
   Frantics — Shared canvas palette (Phase 3a scaffold)
   -------------------------------------------------------------------------
   Reads :root CSS custom properties from /shared/theme.css once at boot
   and exposes them as a typed surface for canvas / WebGL renderers.
   Also mirrors motion tokens so canvas timing stays in sync with CSS.

   Renderers MUST read colors through Palette.* (e.g. Palette.accentGold)
   instead of hardcoding hex. Updating theme.css then updates the game
   world on the next reload without touching renderer source.

   Re-reads on window 'themechange' custom event (fired by future theme
   switchers). Safe to call Palette.refresh() manually.
   ========================================================================= */

(function (root) {
  'use strict';

  var FALLBACKS = {
    bgWoodDeep:        '#3d2817',
    bgWoodWarm:        '#5a3a20',
    bgWoodLite:        '#7a5030',
    bgWoodInk:         '#2f1c0c',
    accentGold:        '#f4c542',
    accentGoldHot:     '#ffdd6b',
    accentGoldDim:     '#b0851c',
    accentGoldEdge:    '#8a6718',
    accentGoldBulb:    '#fff8c8',
    accentRedCurtain:  '#a72d2a',
    accentRedDeep:     '#6b1818',
    accentRedLight:    '#c63a36',
    accentRedFold:     '#8a2a27',
    textCream:         '#f5ead4',
    textDim:           'rgba(245, 234, 212, 0.55)',
    textFaint:         'rgba(245, 234, 212, 0.30)',
    textOnGold:        '#3d2817',
    successGreen:      '#7bc950',
    dangerRed:         '#d9534f',
    warningAmber:      '#e8a33c',
    infoBlue:          '#5ba8d9',
  };

  var TOKEN_NAMES = {
    bgWoodDeep:        '--bg-wood-deep',
    bgWoodWarm:        '--bg-wood-warm',
    bgWoodLite:        '--bg-wood-lite',
    bgWoodInk:         '--bg-wood-ink',
    accentGold:        '--accent-gold',
    accentGoldHot:     '--accent-gold-hot',
    accentGoldDim:     '--accent-gold-dim',
    accentGoldEdge:    '--accent-gold-edge',
    accentGoldBulb:    '--accent-gold-bulb',
    accentRedCurtain:  '--accent-red-curtain',
    accentRedDeep:     '--accent-red-deep',
    accentRedLight:    '--accent-red-light',
    accentRedFold:     '--accent-red-fold',
    textCream:         '--text-cream',
    textDim:           '--text-dim',
    textFaint:         '--text-faint',
    textOnGold:        '--text-on-gold',
    successGreen:      '--success-green',
    dangerRed:         '--danger-red',
    warningAmber:      '--warning-amber',
    infoBlue:          '--info-blue',
  };

  function readTokens() {
    if (typeof document === 'undefined') return Object.assign({}, FALLBACKS);
    var style = getComputedStyle(document.documentElement);
    var out = {};
    Object.keys(TOKEN_NAMES).forEach(function (key) {
      var raw = style.getPropertyValue(TOKEN_NAMES[key]).trim();
      out[key] = raw || FALLBACKS[key];
    });
    return out;
  }

  var Palette = {
    /* Colors — populated by refresh() */
    bgWoodDeep:       FALLBACKS.bgWoodDeep,
    bgWoodWarm:       FALLBACKS.bgWoodWarm,
    bgWoodLite:       FALLBACKS.bgWoodLite,
    bgWoodInk:        FALLBACKS.bgWoodInk,
    accentGold:       FALLBACKS.accentGold,
    accentGoldHot:    FALLBACKS.accentGoldHot,
    accentGoldDim:    FALLBACKS.accentGoldDim,
    accentGoldEdge:   FALLBACKS.accentGoldEdge,
    accentGoldBulb:   FALLBACKS.accentGoldBulb,
    accentRedCurtain: FALLBACKS.accentRedCurtain,
    accentRedDeep:    FALLBACKS.accentRedDeep,
    accentRedLight:   FALLBACKS.accentRedLight,
    accentRedFold:    FALLBACKS.accentRedFold,
    textCream:        FALLBACKS.textCream,
    textDim:          FALLBACKS.textDim,
    textFaint:        FALLBACKS.textFaint,
    textOnGold:       FALLBACKS.textOnGold,
    successGreen:     FALLBACKS.successGreen,
    dangerRed:        FALLBACKS.dangerRed,
    warningAmber:     FALLBACKS.warningAmber,
    infoBlue:         FALLBACKS.infoBlue,

    /* Motion — mirrors --dur-* tokens (ms) */
    dur: {
      instant:  80,
      tap:      120,
      short:    200,
      pulse:    400,
      medium:   500,
      curtain:  700,
      long:     1200,
      breathe:  3000,
    },

    /* Easings — mirror --ease-* keywords */
    ease: {
      linear:   function (t) { return t; },
      out:      function (t) { return 1 - Math.pow(1 - t, 3); },
      in:       function (t) { return t * t * t; },
      inOut:    function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
      // Approximations of --ease-curtain cubic-bezier(0.5, 0, 0.3, 1)
      curtain:  function (t) {
        // Hand-tuned approximation: slow start, fast exit, overshoot-free
        return t * t * (2.7 - 1.7 * t);
      },
      // --ease-bounce cubic-bezier(0.34, 1.56, 0.64, 1)
      bounce:   function (t) {
        var c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      },
    },

    /* Gradient builders — renderers pass a 2D context and options */

    /**
     * Gold spotlight — radial gradient.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} cx - center x
     * @param {number} cy - center y
     * @param {number} radius
     * @returns {CanvasGradient}
     */
    spotlight: function (ctx, cx, cy, radius) {
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      g.addColorStop(0, this.accentGoldBulb);
      g.addColorStop(0.35, this.accentGoldHot);
      g.addColorStop(0.75, 'rgba(244, 197, 66, 0.4)');
      g.addColorStop(1, 'rgba(244, 197, 66, 0)');
      return g;
    },

    /**
     * Red velvet curtain face — vertical linear gradient mimicking the
     * DOM `--bg-curtain-fabric` recipe.
     */
    redCurtain: function (ctx, x, y, w, h) {
      var g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, this.accentRedLight);
      g.addColorStop(0.5, this.accentRedCurtain);
      g.addColorStop(1, '#7a1d1a');
      return g;
    },

    /**
     * Ticket-face gold gradient (top light, bottom dark), same stops
     * as --bg-ticket-face.
     */
    ticketFace: function (ctx, x, y, w, h) {
      var g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, this.accentGold);
      g.addColorStop(1, '#d9a82f');
      return g;
    },

    /**
     * Wood plank vertical gradient — a simplified 2D projection of the
     * DOM --bg-wood-plank recipe (the DOM version uses radial vignettes
     * that would cost too much at 60fps).
     */
    woodPlank: function (ctx, x, y, w, h) {
      var g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, '#4a2f1c');
      g.addColorStop(1, this.bgWoodInk);
      return g;
    },

    /* Text shadow recipe usable on canvas text */
    applyLetterpress: function (ctx) {
      ctx.shadowColor = this.accentRedDeep;
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 0;
    },
    clearShadow: function (ctx) {
      ctx.shadowColor = 'transparent';
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 0;
    },

    /* Refresh — re-read CSS tokens. Call after theme.css hot-swap. */
    refresh: function () {
      var t = readTokens();
      Object.keys(t).forEach(function (k) { Palette[k] = t[k]; });
    },
  };

  // Initial read
  Palette.refresh();

  // Allow future theme switchers to broadcast changes
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('themechange', function () { Palette.refresh(); });
  }

  root.Palette = Palette;
})(typeof window !== 'undefined' ? window : this);
