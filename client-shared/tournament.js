// ============================================================
// Tournament Overlay — shared across all host pages
// ============================================================
// Include via <script src="/shared/tournament.js"></script>
// Injects its own DOM elements and handles tournament messages.

const Tournament = (() => {
  let overlay = null;
  let active = false;
  let previousPositions = {}; // track position changes between standings

  const GAME_NAMES = {
    escapeFox: 'ESCAPE THE FOX',
    hillKing: 'KING OF THE HILL',
    meteor: 'METEOR SHOWER',
    race: 'GRAND PRIX'
  };
  const GAME_URLS = {
    escapeFox: '/host-escape/',
    hillKing: '/host-hill/',
    meteor: '/host-meteor/',
    race: '/host-race/'
  };

  function createOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'tournament-overlay';
    // Phase 20+E2E — full-cover painted hall backdrop reuses Phase 18
    // gameover-hall.png. Behind it sits a dark scrim (dropped from 0.94
    // to 0.62 so the painted hall reads through while keeping live
    // gameplay separated). Mode-specific backdrops (standings-scroll,
    // round-intro poster, champion throne) sit on top of the hall.
    overlay.innerHTML =
      '<img id="t-hall-backdrop" src="/assets/gameover-hall.png" alt="" onerror="this.remove()">' +
      '<div id="t-content"></div>';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:100;
      background: rgba(47, 28, 12, 0.62);
      backdrop-filter: blur(8px);
      display:flex; align-items:center; justify-content:center;
      opacity:0; pointer-events:none;
      /* Phase 21c — spring overshoot on overlay entry (var(--ease-bounce)). */
      transition: opacity 0.7s var(--ease-bounce, cubic-bezier(0.34, 1.56, 0.64, 1));
      font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
      color: var(--text-cream, #f5ead4);
    `;
    document.body.appendChild(overlay);

    // Phase 15b — gold filigree corner flourishes. 4 <div>s injected
    // once per overlay lifetime; CSS handles positioning + mirroring.
    if (typeof HostCommon !== 'undefined' && HostCommon.addCornerOrnaments) {
      HostCommon.addCornerOrnaments(overlay);
    }

    // Phase 21a — ambient sparkles layer behind tournament modes.
    // Small gold/white specks drift upward across the painted hall,
    // pushing the static scroll/poster/throne toward Hearthstone-level
    // ambient depth.
    if (typeof AmbientFx !== 'undefined') {
      AmbientFx.attach(overlay, 'sparkles');
    }

    // Phase 20+E2E — async-swap the hall backdrop to the loadPainterly-
    // processed data URL. Reuses the Phase 18 gameover-hall asset so
    // host + controller + tournament all share one painted atmosphere.
    if (typeof SpriteLoader !== 'undefined') {
      var applyHall = function () {
        var sprite = SpriteLoader.get('gameover-hall');
        var img = overlay.querySelector('#t-hall-backdrop');
        if (sprite && img) img.src = sprite.toDataURL('image/png');
      };
      var cached = SpriteLoader.get('gameover-hall');
      if (cached) applyHall();
      else SpriteLoader.loadPainterly('gameover-hall',
        '/assets/gameover-hall.png').then(applyHall).catch(function () {});
    }

    const style = document.createElement('style');
    style.textContent = `
      #tournament-overlay.show { opacity:1 !important; pointer-events:auto !important; }
      /* Phase 20+E2E — full-cover hall backdrop sits behind everything
         (scroll + poster + throne + content). Async-swapped to the
         loadPainterly-processed data URL on resolve. */
      #tournament-overlay #t-hall-backdrop {
        position: absolute;
        inset: 0;
        width: 100%; height: 100%;
        object-fit: cover; object-position: center;
        opacity: 0.85;
        z-index: 0;
        pointer-events: none;
      }
      #tournament-overlay > :not(#t-hall-backdrop) {
        position: relative;
        z-index: 1;
      }
      #t-content { text-align:center; max-width:600px; width:90%; position:relative; }
      #t-content .t-backdrop {
        position:absolute;
        bottom:-40px; left:50%;
        transform: translate(-50%, 0);
        max-height: 440px; max-width: 480px;
        width:auto; height:auto;
        opacity: 0.85;
        z-index: 0;
        pointer-events: none;
      }
      #t-content > *:not(.t-backdrop) {
        position: relative;
        z-index: 1;
      }

      /* Animations */
      @keyframes tSlideInLeft {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes tScaleIn {
        from { transform: scale(0); }
        50% { transform: scale(1.2); }
        to { transform: scale(1); }
      }
      @keyframes tCountUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes tPulse {
        0%, 100% { opacity: 0.55; }
        50% { opacity: 1; }
      }
      @keyframes tGoldGlow {
        0%, 100% { text-shadow: 0 2px 0 var(--accent-red-deep, #6b1818), 0 0 10px rgba(244,197,66,0.3); }
        50%      { text-shadow: 0 2px 0 var(--accent-red-deep, #6b1818), 0 0 26px rgba(255,221,107,0.7); }
      }
      @keyframes tRoundScaleSettle {
        0% { transform: scale(2); opacity: 0; }
        60% { transform: scale(0.95); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes tFadeSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes tTrophyBounce {
        0% { transform: scale(0); }
        50% { transform: scale(1.3); }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); }
      }

      #t-content .t-round {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size:12px; letter-spacing:4px;
        color: var(--accent-gold, #f4c542);
        text-transform:uppercase;
        margin-bottom:8px;
      }
      #t-content .t-title {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size:32px; font-weight:400;
        letter-spacing:1px;
        color: var(--accent-gold, #f4c542);
        text-shadow: 0 2px 0 var(--accent-red-deep, #6b1818),
                     0 4px 12px rgba(0,0,0,0.6);
        margin-bottom:24px;
      }
      #t-content .t-title.champion {
        font-size:42px;
        color: var(--accent-gold-hot, #ffdd6b);
        animation: tGoldGlow 2s ease-in-out infinite;
      }
      /* Phase 12a — scoreboard scroll backdrop behind .t-scores stack */
      #t-content .t-scroll-backdrop {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        max-height: 560px; max-width: 460px;
        width: auto; height: auto;
        opacity: 0.95;
        z-index: 0;
        pointer-events: none;
      }
      /* Phase 59b — hero variant stretches the painted standings
         scene edge-to-edge instead of the legacy 460×560 scroll.
         The painted scoreboard frame already has the blank
         parchment interior; HTML player rows position inside. */
      #t-content .t-scroll-backdrop.hero {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        transform: none;
        width: 100%; height: 100%;
        max-width: none; max-height: none;
        object-fit: cover;
        opacity: 1;
        z-index: 1;
      }
      /* Phase 59b — hero mode hides chrome that the painted scene
         already carries: TOURNAMENT bar (arch sign reads it),
         STANDINGS title (painted gold-leafed header at top of
         scoreboard), ROUND count (optional text, hidden; painted
         marquee doesn't carry it but the preceding round-intro
         does). .t-scores list + narrator commentary stay. */
      #t-content.mode-standings:has(.t-scroll-backdrop.hero) .t-bar,
      #t-content.mode-standings:has(.t-scroll-backdrop.hero) .t-round,
      #t-content.mode-standings:has(.t-scroll-backdrop.hero) .t-title {
        display: none;
      }
      #t-content.mode-standings:has(.t-scroll-backdrop.hero) .t-scores {
        position: fixed;
        top: 35%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(340px, 30%);
        z-index: 2;
        margin: 0;
        gap: 0;
      }
      #t-content.mode-standings:has(.t-scroll-backdrop.hero) .t-player {
        padding: 1px 10px;
      }
      #t-content.mode-standings:has(.t-scroll-backdrop.hero) .t-player-dot {
        width: 14px; height: 14px;
      }
      #t-content.mode-standings:has(.t-scroll-backdrop.hero) .t-player-name {
        font-size: 12px;
      }
      #t-content.mode-standings:has(.t-scroll-backdrop.hero) .t-player-pts {
        font-size: 16px;
      }
      #t-content.mode-standings:has(.t-scroll-backdrop.hero) .t-standings-commentary {
        position: fixed;
        top: 82%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(700px, 72%);
        text-align: center;
        z-index: 2;
        color: rgba(255, 230, 180, 0.9);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.95), 0 0 10px rgba(0, 0, 0, 0.7);
        margin: 0;
        font-size: 14px;
      }
      /* Phase 12a — scoreboard-scroll-aware layout scoped to standings
         mode. Champion view keeps the earlier horizontal card layout
         unchanged so the Phase 9a throne backdrop frames horizontal
         cards (not column-stacked transparent rows). */
      #t-content.mode-standings .t-scores {
        display:flex; flex-direction:column; align-items:center;
        gap: 6px; margin: 6px auto 14px;
        width: min(340px, 80%);
      }
      #t-content.mode-standings .t-player {
        display: flex; align-items: center; gap: 12px;
        padding: 6px 14px;
        border-radius: 6px;
        background: transparent;
        border: none;
        min-width: 100%;
        transition: transform 0.3s;
        opacity: 0;
        box-shadow: none;
      }
      /* Non-standings (champion) retains the original horizontal card */
      #t-content:not(.mode-standings) .t-scores {
        display:flex; justify-content:center; gap:18px; flex-wrap:wrap;
        margin-bottom:20px;
      }
      #t-content:not(.mode-standings) .t-player {
        text-align:center; padding:14px 18px;
        border-radius: 12px;
        background: rgba(90, 58, 32, 0.72);
        border: 1.5px solid rgba(244, 197, 66, 0.35);
        min-width: 100px;
        transition: transform 0.3s;
        opacity: 0;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.3),
                    0 3px 8px rgba(0,0,0,0.4);
      }
      #t-content .t-player.slide-in { animation: tSlideInLeft 0.5s ease-out forwards; }
      #t-content .t-player.leader {
        border-color: var(--accent-gold, #f4c542);
        transform: scale(1.08);
        box-shadow: 0 0 24px rgba(255, 221, 107, 0.25),
                    inset 0 0 18px rgba(244, 197, 66, 0.08),
                    0 4px 10px rgba(0, 0, 0, 0.5);
      }
      /* Standings mode: dark text on cream slot (Phase 12a) */
      #t-content.mode-standings .t-player-dot {
        width: 22px; height: 22px; border-radius: 50%;
        margin: 0; flex: 0 0 auto;
        box-shadow: 0 0 6px currentColor;
      }
      #t-content.mode-standings .t-player-name {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 14px;
        color: var(--text-on-gold, #3d2817);
        letter-spacing: 0.5px;
        flex: 1 1 auto;
        text-align: left;
      }
      #t-content.mode-standings .t-player-pts {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 22px; font-weight: 400;
        color: var(--accent-red-deep, #6b1818);
        text-shadow: 0 1px 0 rgba(244, 197, 66, 0.3);
        margin: 0; flex: 0 0 auto;
      }
      /* Champion mode: restore original cream-on-dark scheme */
      #t-content:not(.mode-standings) .t-player-dot {
        width: 28px; height: 28px; border-radius: 50%;
        margin: 0 auto 8px;
        box-shadow: 0 0 8px currentColor;
      }
      #t-content:not(.mode-standings) .t-player-name {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 12px;
        color: var(--text-cream, #f5ead4);
        opacity: 0.82;
        letter-spacing: 0.5px;
      }
      #t-content:not(.mode-standings) .t-player-pts {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 26px; font-weight: 400;
        color: var(--accent-gold, #f4c542);
        text-shadow: 0 1px 0 var(--accent-red-deep, #6b1818);
        margin-top: 6px;
      }
      #t-content .t-player-pos-change {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 12px; margin-top: 2px; height: 16px;
        letter-spacing: 0.5px;
      }
      #t-content .t-player-pos-change.up   { color: var(--success-green, #7bc950); }
      #t-content .t-player-pos-change.down { color: var(--danger-red, #d9534f); }
      /* Phase 53 — per-round pts-delta chip. Small rounded pill.
         Winner of the round gets the gold fill; survivors get a
         neutral brass outline; eliminated gets a dim dash. */
      #t-content .t-player-delta {
        display: inline-block;
        margin-top: 4px;
        padding: 2px 8px;
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(216, 152, 45, 0.5);
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 12px;
        color: var(--accent-gold, #f4c542);
        letter-spacing: 0.6px;
        text-shadow: 0 1px 0 rgba(0, 0, 0, 0.6);
        animation: tDeltaPop 0.45s ease-out 0.6s both;
      }
      #t-content .t-player-delta.win {
        background: linear-gradient(180deg, #ffe290 0%, #d5972b 100%);
        color: #2a160a;
        border-color: #5a3512;
        text-shadow: 0 1px 0 rgba(255, 246, 200, 0.5);
        box-shadow: 0 0 12px rgba(255, 210, 120, 0.55);
      }
      #t-content .t-player-delta.zero {
        opacity: 0.4;
        border-color: rgba(120, 90, 50, 0.45);
      }
      @keyframes tDeltaPop {
        0%   { transform: scale(0.5); opacity: 0; }
        60%  { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      #t-content .t-next {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 15px; font-style: italic;
        color: var(--text-cream, #f5ead4);
        text-shadow: 0 1px 0 rgba(0, 0, 0, 0.7),
                     0 0 10px rgba(0, 0, 0, 0.6);
        margin-top: 18px;
      }
      #t-content .t-next-game {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-style: normal;
        color: var(--accent-gold, #f4c542);
        letter-spacing: 1px;
      }
      #t-content .t-next.pulse-text { animation: tPulse 1.5s ease-in-out infinite; }
      #t-content .t-crown { font-size: 56px; margin-bottom: 12px; }
      #t-content .t-bar {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 11px; letter-spacing: 4px;
        color: var(--accent-gold, #f4c542);
        text-transform: uppercase;
        text-shadow: 0 1px 0 var(--accent-red-deep, #6b1818),
                     0 0 14px rgba(0, 0, 0, 0.7);
        margin-bottom: 16px;
      }
      /* Phase E2E fix — standings TOURNAMENT + ROUND anchored ABOVE
         the painted scroll so the scroll's painted top-medallion
         ornament doesn't fight the header text. Mirrors the Phase 20b
         round-intro anchoring pattern. */
      #t-content.mode-standings .t-bar {
        position: absolute;
        top: -54px; left: 50%;
        transform: translateX(-50%);
        margin: 0;
        white-space: nowrap;
      }
      #t-content.mode-standings .t-round {
        position: absolute;
        top: -34px; left: 50%;
        transform: translateX(-50%);
        margin: 0;
        white-space: nowrap;
        text-shadow: 0 1px 0 var(--accent-red-deep, #6b1818),
                     0 0 14px rgba(0, 0, 0, 0.7);
      }

      /* Phase 20b — painted attraction-announce poster behind the
         round-intro text stack. Size tuned so the central cream panel
         aligns with ROUND X + game-name; TOURNAMENT and GET READY sit
         ABOVE and BELOW the painted bounds via absolute positioning
         (scoped to mode-round-intro so standings + champion keep the
         flex-flow layout). */
      #t-content .t-round-intro-backdrop {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        max-height: 380px; max-width: 420px;
        width: auto; height: auto;
        opacity: 0.95;
        z-index: 0;
        pointer-events: none;
      }
      /* Phase 59a — per-game hero variant. When the backdrop carries
         .hero, it's a full-viewport painted illustration (1376×768)
         so we stretch it edge-to-edge instead of the legacy 380×420
         centered poster. Painted content already includes the arch,
         game title sign, blank parchment scroll, and "UP NEXT"
         marquee; HTML overlay only writes the ROUND N number. */
      #t-content .t-round-intro-backdrop.hero {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        transform: none;
        width: 100%; height: 100%;
        max-width: none; max-height: none;
        object-fit: cover;
        opacity: 1;
        z-index: 1;
      }
      /* Phase 59a — hero mode hides HTML chrome that the painted
         scene already carries: TOURNAMENT bar (the painted arch
         sign says "FRANTICS / <GAME>" prominently), game-name
         line (painted "UP NEXT: <GAME TITLE>" marquee), and
         GET READY (the whole beat is a 3s countdown — the
         painted stage itself communicates it). Only ROUND N
         stays, pinned to the painted parchment scroll at
         y≈50%. Flex flow replaced with absolute positioning
         and the baseline scale-settle animation is disabled
         (its transform was clobbering the centering translate). */
      #t-content.mode-round-intro:has(.t-round-intro-backdrop.hero) .t-bar,
      #t-content.mode-round-intro:has(.t-round-intro-backdrop.hero) .t-round-intro-game,
      #t-content.mode-round-intro:has(.t-round-intro-backdrop.hero) .t-round-intro-ready {
        display: none;
      }
      #t-content.mode-round-intro:has(.t-round-intro-backdrop.hero) .t-round-intro-number {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        margin: 0;
        font-size: 80px;
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        letter-spacing: 4px;
        color: #4a2612;
        text-shadow:
          0 2px 0 rgba(255, 220, 140, 0.35),
          0 0 14px rgba(90, 40, 18, 0.4);
        white-space: nowrap;
        /* Custom hero fade-in that preserves the -50%/-50% centering
           transform. Baseline tFadeSlideUp / tRoundScaleSettle both
           overwrite the transform property and would wipe the
           centering. */
        animation: tHeroRoundFade 0.5s ease-out 0.1s both;
        z-index: 2;
      }
      @keyframes tHeroRoundFade {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      /* hero-flourish ::before/::after (gold diamond flankers) paint
         over the painted parchment. Hide them in hero mode — the
         scroll itself frames the ROUND text. */
      #t-content.mode-round-intro:has(.t-round-intro-backdrop.hero) .t-round-intro-number.hero-flourish::before,
      #t-content.mode-round-intro:has(.t-round-intro-backdrop.hero) .t-round-intro-number.hero-flourish::after {
        display: none;
      }
      #t-content.mode-round-intro .t-bar,
      #t-content.mode-round-intro .t-round-intro-number,
      #t-content.mode-round-intro .t-round-intro-game,
      #t-content.mode-round-intro .t-round-intro-ready {
        position: relative;
        z-index: 1;
      }
      /* Phase 20b — move TOURNAMENT above the poster and GET READY
         below via absolute anchors. Values tuned to sit just outside
         the 380px poster extent so they land on the painted hall
         (proscenium sky above, wooden floor below), not on the
         painted top/bottom ribbons of the poster. */
      #t-content.mode-round-intro .t-bar {
        position: absolute;
        top: calc(50% - 220px);
        left: 50%;
        transform: translateX(-50%);
        margin: 0;
        font-size: 14px;
        letter-spacing: 6px;
        padding: 6px 18px;
        background: rgba(47, 28, 12, 0.55);
        border-radius: 4px;
        text-shadow: 0 1px 0 var(--accent-red-deep, #6b1818),
                     0 0 14px rgba(0, 0, 0, 0.8);
      }
      #t-content.mode-round-intro .t-round-intro-ready {
        position: absolute;
        top: calc(50% + 210px);
        left: 50%;
        transform: translateX(-50%);
        margin: 0;
        font-size: 20px;
        padding: 8px 22px;
        background: rgba(47, 28, 12, 0.55);
        border-radius: 6px;
      }
      /* Phase 20b — game name flips to dark-on-cream per Phase 12a
         precedent (painted cream panel demands dark text). ROUND X
         keeps its gold-on-red letterpress (legible on cream via the
         existing shadow). */
      #t-content.mode-round-intro .t-round-intro-game {
        color: var(--text-on-gold, #3d2817);
        text-shadow: 0 1px 0 rgba(255, 221, 107, 0.35);
      }
      /* GET READY stays gold but on the dark overlay scrim now, with
         slight boost to letterspacing + shadow for the dramatic beat. */
      #t-content.mode-round-intro .t-round-intro-ready {
        color: var(--accent-gold-hot, #ffdd6b);
        text-shadow: 0 2px 0 var(--accent-red-deep, #6b1818),
                     0 0 18px rgba(244, 197, 66, 0.35);
      }

      /* Round intro dramatic */
      #t-content .t-round-intro-number {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 84px; font-weight: 400; letter-spacing: 6px;
        color: var(--accent-gold, #f4c542);
        text-shadow: 0 4px 0 var(--accent-red-deep, #6b1818),
                     0 8px 20px rgba(0, 0, 0, 0.7);
        animation: tRoundScaleSettle 0.8s ease-out forwards;
        margin-bottom: 14px;
      }
      #t-content .t-round-intro-game {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 28px; font-weight: 400;
        color: var(--text-cream, #f5ead4);
        letter-spacing: 2px;
        text-shadow: 0 2px 0 var(--accent-red-deep, #6b1818);
        opacity: 0; animation: tFadeSlideUp 0.6s ease-out 0.6s forwards;
        margin-bottom: 20px;
      }
      #t-content .t-round-intro-ready {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 16px; letter-spacing: 6px; font-style: italic;
        color: var(--accent-gold-hot, #ffdd6b);
        opacity: 0; animation: tPulse 1s ease-in-out 1.2s infinite;
        animation-fill-mode: forwards;
      }

      /* Champion dramatic */
      #t-content .t-trophy-anim {
        font-size: 84px; display: inline-block;
        animation: tTrophyBounce 0.8s ease-out forwards;
        filter: drop-shadow(0 0 24px rgba(255, 221, 107, 0.6));
      }
      /* Phase 55 — painted champion portrait replaces the trophy
         emoji when we know the champion's character. 160 px disc
         with double gold rim (thick outer + dark inset + thin
         outer) so it reads as a framed trophy portrait enthroned
         above the backdrop. font-size keeps the text-node emoji
         fallback big enough when the <img> errors post-pipeline. */
      #t-content .t-champion-portrait {
        width: 160px; height: 160px;
        border-radius: 50%;
        margin: 0 auto 6px;
        background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.14), rgba(0,0,0,0.35));
        box-shadow:
          inset 0 4px 0 rgba(255, 250, 220, 0.32),
          inset 0 -4px 8px rgba(0, 0, 0, 0.5),
          0 0 0 4px rgba(20, 10, 5, 0.9),
          0 0 0 10px var(--accent-gold, #f4c542),
          0 0 0 13px rgba(20, 10, 5, 0.7),
          0 16px 44px rgba(0, 0, 0, 0.6),
          0 0 80px rgba(255, 221, 107, 0.6);
        overflow: hidden;
        display: flex; align-items: center; justify-content: center;
        font-size: 96px; line-height: 1;
        animation: tTrophyBounce 0.8s ease-out forwards;
      }
      #t-content .t-champion-portrait img {
        width: 100%; height: 100%; object-fit: cover;
        border-radius: 0;
      }
      #t-content .t-champion-label {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 48px; font-weight: 400; letter-spacing: 4px;
        color: var(--accent-gold-hot, #ffdd6b);
        animation: tGoldGlow 2s ease-in-out infinite;
        margin-bottom: 10px;
      }
      #t-content .t-champion-name {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 38px; font-weight: 400;
        color: var(--text-cream, #f5ead4);
        text-shadow: 0 3px 0 var(--accent-red-deep, #6b1818),
                     0 0 30px rgba(255, 221, 107, 0.4);
        animation: tFadeSlideUp 0.6s ease-out 0.5s forwards;
        opacity: 0; margin-bottom: 26px;
        letter-spacing: 1px;
      }
      #t-content .t-final-scores-label {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 12px; letter-spacing: 4px;
        color: var(--accent-gold, #f4c542);
        text-transform: uppercase;
        text-shadow: 0 1px 0 var(--accent-red-deep, #6b1818),
                     0 0 12px rgba(0, 0, 0, 0.8);
        margin-bottom: 12px;
        opacity: 0; animation: tFadeSlideUp 0.4s ease-out 1s forwards;
      }
      #t-content .t-standings-commentary {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 15px; font-style: italic;
        color: var(--text-cream, #f5ead4);
        text-shadow: 0 1px 0 rgba(0, 0, 0, 0.75),
                     0 0 10px rgba(0, 0, 0, 0.6);
        opacity: 0; margin-top: 16px; line-height: 1.5;
        animation: tFadeSlideUp 0.5s ease-out 1.5s forwards;
      }
    `;
    document.head.appendChild(style);
  }

  function show() {
    createOverlay();
    overlay.classList.add('show');
    // Phase 25a — tournament theme music on overlay activation.
    if (typeof Sound !== 'undefined' && Sound.startMusic) {
      try { Sound.startMusic('tournament'); } catch (e) {}
    }
  }
  function hide() {
    if (overlay) overlay.classList.remove('show');
    // Phase 25a — stop tournament theme; per-game music (if still
    // playing) was already stopped when the round ended.
    if (typeof Sound !== 'undefined' && Sound.stopMusic) {
      try { Sound.stopMusic(); } catch (e) {}
    }
  }

  // Animate score counting from 0 to target
  function animateScores() {
    const els = document.querySelectorAll('.t-player-pts[data-target]');
    els.forEach(function(el) {
      const target = parseInt(el.getAttribute('data-target'), 10) || 0;
      if (target === 0) { el.textContent = '0'; return; }
      const duration = 1000;
      const startTime = performance.now();
      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  function getPlayerDisplayName(id, data) {
    // Try server-provided names first, then _lastPlayers, then fallback
    if (data && data.playerNames && data.playerNames[id]) return data.playerNames[id];
    const players = window._lastPlayers || {};
    const p = players[id] || {};
    return p.name || ('P' + id);
  }

  function renderStandings(data) {
    createOverlay();
    const content = document.getElementById('t-content');
    // Phase 12a CSS (column-stack slot-strip layout) scopes to
    // .mode-standings; champion view keeps its horizontal card layout.
    content.classList.add('mode-standings');
    content.classList.remove('mode-champion', 'mode-round-intro');
    const maxPts = Math.max(...Object.values(data.scores), 0);
    const players = window._lastPlayers || {};
    const sorted = Object.entries(data.scores).sort(function(a, b) { return b[1] - a[1]; });

    // Compute current positions (1-indexed)
    const currentPositions = {};
    sorted.forEach(function(entry, idx) { currentPositions[entry[0]] = idx + 1; });

    // Narrator commentary
    var leaderName = sorted.length > 0 ? getPlayerDisplayName(sorted[0][0], data) : '';
    var lastName = sorted.length > 1 ? getPlayerDisplayName(sorted[sorted.length - 1][0], data) : '';
    var leaderScore = sorted.length > 0 ? sorted[0][1] : 0;
    var commentary = '';
    if (typeof Narrator !== 'undefined' && Narrator.tournamentStandingsCommentary) {
      commentary = Narrator.tournamentStandingsCommentary(leaderName, lastName, data.round || 0, leaderScore);
    }

    // Phase 59b — painted standings hero (full-viewport
    // theatrical stage with painted scoreboard frame and
    // blank parchment interior ready for HTML player rows).
    // Legacy standings-scroll.png stays as fallback for older
    // cached builds / dev mode without the new asset.
    let html = '<img class="t-scroll-backdrop hero" src="/assets/tournament-standings-hero.png" onerror="this.src=\'/assets/standings-scroll.png\'">';
    html += '<div class="t-bar">TOURNAMENT</div>';
    html += '<div class="t-round">ROUND ' + (data.round || '?') + ' OF ' + (data.totalRounds || 3) + '</div>';
    html += '<div class="t-title">STANDINGS</div>';
    html += '<div class="t-scores">';

    for (var i = 0; i < sorted.length; i++) {
      var id = sorted[i][0];
      var pts = sorted[i][1];
      var p = players[id] || {};
      var isLeader = pts === maxPts && pts > 0;
      var delay = i * 300;

      // Position change arrow
      var posChange = '';
      if (previousPositions[id] !== undefined) {
        var diff = previousPositions[id] - currentPositions[id];
        if (diff > 0) posChange = '<div class="t-player-pos-change up">\u2191' + diff + '</div>';
        else if (diff < 0) posChange = '<div class="t-player-pos-change down">\u2193' + Math.abs(diff) + '</div>';
        else posChange = '<div class="t-player-pos-change">&mdash;</div>';
      } else {
        posChange = '<div class="t-player-pos-change"></div>';
      }

      var crown = isLeader ? '<div style="font-size:18px;margin-bottom:2px;">\uD83D\uDC51</div>' : '';
      var displayName = getPlayerDisplayName(id, data);

      // Phase 53 — per-round pts-delta chip (+3 win / +1 survive /
      // 0 eliminated). Highlights round winner with a gold tint.
      var delta = (data.roundDelta && data.roundDelta[id]) || 0;
      var isRoundWinner = data.winnerId && String(data.winnerId) === String(id);
      var deltaChip = '';
      if (delta > 0) {
        deltaChip = '<div class="t-player-delta' + (isRoundWinner ? ' win' : '') + '">+' + delta + '</div>';
      } else {
        deltaChip = '<div class="t-player-delta zero">&mdash;</div>';
      }

      html += '<div class="t-player slide-in ' + (isLeader ? 'leader' : '') + '" style="animation-delay:' + delay + 'ms;">';
      html += crown;
      html += '<div class="t-player-dot" style="background:' + (p.color || '#666') + '"></div>';
      html += '<div class="t-player-name">' + displayName + '</div>';
      html += '<div class="t-player-pts" data-target="' + pts + '">0</div>';
      html += deltaChip;
      html += posChange;
      html += '</div>';
    }
    html += '</div>';

    if (data.nextGameId) {
      var nextName = GAME_NAMES[data.nextGameId] || data.nextGameId;
      html += '<div class="t-next pulse-text">NEXT: <span class="t-next-game">' + nextName + '</span></div>';
    }

    if (commentary) {
      html += '<div class="t-standings-commentary">' + commentary + '</div>';
    }

    content.innerHTML = html;

    // Pretext-measure the standings commentary so the scroll row that
    // holds "Fox is dominating. This is getting embarrassing for Bear."
    // has a height matching the real wrapped line count. Short zingers
    // don't over-reserve space; long ones don't collide with the
    // "NEXT: GRAND PRIX" pulse text below.
    if (window.PretextHooks) {
      requestAnimationFrame(function () {
        var quipEl = content.querySelector('.t-standings-commentary');
        if (quipEl) window.PretextHooks.measure(quipEl);
      });
    }

    // Phase 59b — hero variant skips the loadPainterly checker
    // strip (new asset is clean full-viewport). Legacy fallback
    // path (if hero 404s and onerror swaps to standings-scroll)
    // still benefits from the processing pipeline.

    show();

    // Start score count-up after cards slide in
    var totalSlideTime = sorted.length * 300 + 500;
    setTimeout(animateScores, totalSlideTime);

    // Save positions for next comparison
    previousPositions = currentPositions;
  }

  function renderChampion(data) {
    createOverlay();
    var content = document.getElementById('t-content');
    // Phase 12a CSS (standings column layout) is scoped to
    // .mode-standings; switch modes so champion keeps its horizontal
    // card layout + the Phase 9a throne backdrop integration.
    content.classList.add('mode-champion');
    content.classList.remove('mode-standings', 'mode-round-intro');
    var players = window._lastPlayers || {};
    var sorted = Object.entries(data.scores).sort(function(a, b) { return b[1] - a[1]; });

    // Champion display name
    var champDisplayName = data.champName || (data.champId ? getPlayerDisplayName(data.champId, data) : null);

    // Narrator quip
    var quip = '';
    if (typeof Narrator !== 'undefined' && Narrator.tournamentChampionQuip && champDisplayName) {
      quip = Narrator.tournamentChampionQuip(champDisplayName);
    }

    // Phase 55 — when we know the champion's character, render the
    // painted animal portrait inside a gold-rimmed 160 px disc.
    // renderCharGlyph picks the processed (checker-stripped) data
    // URL from HostCommon's painterly pipeline when it's ready and
    // carries a text-node emoji fallback through onerror. Trophy
    // emoji stays as the fallback when no character info is
    // available (controller lost / lobby-less champion edge case).
    var champPlayer = data.champId ? (players[data.champId] || {}) : {};
    var champCharacter = champPlayer.character || null;
    var champAvatarHTML = (champCharacter
      && typeof HostCommon !== 'undefined'
      && typeof HostCommon.renderCharGlyph === 'function')
      ? HostCommon.renderCharGlyph(champCharacter, 't-champion-char')
      : null;

    var html = '<div class="t-bar" style="opacity:0;animation:tFadeSlideUp 0.4s ease-out 0.2s forwards;">TOURNAMENT COMPLETE</div>';
    if (champAvatarHTML) {
      html += '<div class="t-champion-portrait">' + champAvatarHTML + '</div>';
    } else {
      html += '<div class="t-trophy-anim">\uD83C\uDFC6</div>';
    }

    if (champDisplayName) {
      html += '<div class="t-champion-label hero-flourish">CHAMPION!</div>';
      html += '<div class="t-champion-name">' + champDisplayName + '</div>';
    } else {
      html += '<div class="t-champion-label hero-flourish">NO CHAMPION!</div>';
    }

    html += '<div class="t-final-scores-label">FINAL SCORES</div>';
    html += '<div class="t-scores">';
    for (var i = 0; i < sorted.length; i++) {
      var id = sorted[i][0];
      var pts = sorted[i][1];
      var p = players[id] || {};
      var isChamp = Number(id) === data.champId;
      var delay = 1200 + i * 200;
      var displayName = getPlayerDisplayName(id, data);

      html += '<div class="t-player slide-in ' + (isChamp ? 'leader' : '') + '" style="animation-delay:' + delay + 'ms;">';
      html += '<div class="t-player-dot" style="background:' + (p.color || '#666') + '"></div>';
      html += '<div class="t-player-name">' + displayName + '</div>';
      html += '<div class="t-player-pts">' + pts + '</div>';
      html += '</div>';
    }
    html += '</div>';

    if (quip) {
      html += '<div class="t-standings-commentary" style="animation-delay:2s;">' + quip + '</div>';
    }

    html += '<div class="t-next" style="opacity:0;animation:tFadeSlideUp 0.4s ease-out 2.5s forwards;">Returning to lobby...</div>';

    // Phase 9a — painterly throne backdrop behind the champion stack.
    // Prepended so it sits first in DOM flow; absolute-positioned under
    // the z-index:1 siblings via the .t-backdrop rule above. onerror
    // removes the img so missing asset falls back to the prior text-
    // only layout. Raw img src is the on-disk PNG (may have a baked
    // solid-black background); SpriteLoader.loadPainterly async-strips
    // it and swaps src to the processed data URL once ready.
    const backdropHTML = '<img class="t-backdrop" src="/assets/tournament-champion.png" onerror="this.remove()">';
    content.innerHTML = backdropHTML + html;
    if (typeof SpriteLoader !== 'undefined') {
      const applyProcessed = () => {
        const sprite = SpriteLoader.get('tournament-champion');
        const img = content.querySelector('.t-backdrop');
        if (sprite && img) img.src = sprite.toDataURL('image/png');
      };
      const cached = SpriteLoader.get('tournament-champion');
      if (cached) applyProcessed();
      else SpriteLoader.loadPainterly('tournament-champion',
        '/assets/tournament-champion.png').then(applyProcessed).catch(() => {});
    }
    show();

    // Confetti burst if Visual is available
    if (typeof Visual !== 'undefined' && Visual.burstConfetti) {
      setTimeout(function() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        Visual.burstConfetti(w / 2, h / 3, 50);
        setTimeout(function() {
          Visual.burstConfetti(w * 0.3, h / 2, 30);
          Visual.burstConfetti(w * 0.7, h / 2, 30);
        }, 400);
      }, 800);
    }
  }

  function renderRoundIntro(data) {
    createOverlay();
    var content = document.getElementById('t-content');
    var gameName = GAME_NAMES[data.gameId] || data.gameId;

    // Phase 20b — scope painted attraction-poster CSS via mode class.
    // Mirrors the Phase 12a mode-standings / mode-champion pattern so
    // each tournament mode's backdrop CSS is self-contained.
    content.classList.add('mode-round-intro');
    content.classList.remove('mode-standings', 'mode-champion');

    // Narrator commentary
    if (typeof Narrator !== 'undefined' && Narrator.tournamentRoundIntro) {
      Narrator.tournamentRoundIntro(data.round || 1, data.totalRounds || 3, gameName);
    }

    // Phase 59a — per-game painted round-intro hero. The hero
    // carries the "FRANTICS / <GAME>" carved sign, the "UP
    // NEXT / <GAME TITLE>" marquee below, a blank painted
    // parchment scroll (HTML writes the ROUND number overlay),
    // and the Phase 58 frame + bunting + curtains + stage.
    // Falls back to the generic tournament-round-intro.png if
    // gameId doesn't match one of the 4 known games.
    var heroMap = {
      escapeFox: '/assets/tournament-round-intro-escape-hero.png',
      race:      '/assets/tournament-round-intro-race-hero.png',
      hillKing:  '/assets/tournament-round-intro-hill-hero.png',
      meteor:    '/assets/tournament-round-intro-meteor-hero.png',
    };
    var heroSrc = heroMap[data.gameId] || '/assets/tournament-round-intro.png';
    var heroCls = 't-round-intro-backdrop' + (heroMap[data.gameId] ? ' hero' : '');
    var html = '<img class="' + heroCls + '" src="' + heroSrc + '" onerror="this.remove()">';
    html += '<div class="t-bar" style="opacity:0;animation:tFadeSlideUp 0.4s ease-out forwards;">TOURNAMENT</div>';
    html += '<div class="t-round-intro-number hero-flourish">ROUND ' + (data.round || '?') + '</div>';
    html += '<div class="t-round-intro-game">' + gameName + '</div>';
    html += '<div class="t-round-intro-ready">GET READY</div>';

    content.innerHTML = html;
    if (typeof SpriteLoader !== 'undefined' && !heroMap[data.gameId]) {
      // Only run painterly checker-strip on the legacy generic
      // asset. The per-game hero PNGs are already clean.
      var applyProcessedIntro = function () {
        var sprite = SpriteLoader.get('tournament-round-intro');
        var img = content.querySelector('.t-round-intro-backdrop');
        if (sprite && img) img.src = sprite.toDataURL('image/png');
      };
      var cached = SpriteLoader.get('tournament-round-intro');
      if (cached) applyProcessedIntro();
      else SpriteLoader.loadPainterly('tournament-round-intro',
        '/assets/tournament-round-intro.png').then(applyProcessedIntro).catch(function () {});
    }
    show();

    // Play sound
    if (typeof Sound !== 'undefined' && Sound.play) {
      Sound.play('countdownGo');
    }
  }

  // Handle tournament messages — call from each host page's ws.onmessage
  function handleMessage(msg) {
    switch (msg.type) {
      case 'tournamentRound':
        active = true;
        renderRoundIntro(msg);
        // Navigate to correct page after showing intro (4s hold)
        var targetUrl = GAME_URLS[msg.gameId];
        if (targetUrl && !window.location.pathname.startsWith(targetUrl.replace(/\/$/, ''))) {
          setTimeout(function() { window.location.href = targetUrl; }, 3000);
        } else {
          // Already on correct page — hide overlay after dramatic hold
          setTimeout(function() { hide(); }, 4000);
        }
        return true;

      case 'tournamentStandings':
        renderStandings(msg);
        return true;

      case 'tournamentEnd':
        renderChampion(msg);
        active = false; // reset so PostGame works for subsequent non-tournament games
        // Navigate to lobby after champion display (8s dramatic hold)
        setTimeout(function() { window.location.href = '/host/'; }, 8000);
        return true;

      case 'tournamentStarted':
        active = true;
        previousPositions = {};
        return true;

      case 'tournamentInfo':
        active = true;
        if (msg.phase === 'standings') {
          renderStandings(msg);
        }
        return true;
    }
    return false;
  }

  function isActive() { return active; }

  return { handleMessage, isActive, hide, show };
})();
