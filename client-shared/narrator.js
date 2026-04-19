// ============================================================
// Frantics — Narrator System (Game Master character)
// ============================================================
// A mischievous narrator who comments on the action.
// Include via <script src="/shared/narrator.js"></script>

const Narrator = (() => {
  let overlay = null;
  let queue = [];
  let showing = false;
  const shown = new Set(); // dedup within session

  // ---- QUIP POOLS ----

  const INTROS = {
    escapeFox: [
      "Run, little ones. Something hungry is behind you...",
      "The fox doesn't get tired. You do.",
      "Pro tip: don't look back.",
      "Some of you won't make it. I'm excited to find out who.",
      "The path ahead is treacherous. The thing behind is worse.",
    ],
    race: [
      "Engines ready! ...wait, they don't have engines.",
      "Three laps. No brakes. Good luck.",
      "On your marks. Get set. Try not to crash immediately.",
      "The track is slippery, the items are unfair. Enjoy.",
      "May the least crashed contestant win.",
    ],
    hillKing: [
      "Last one standing wins. First one off... well, bye.",
      "There's only room for one on this hill. Get pushing.",
      "Remember: the edge is closer than you think.",
      "Friendship ends at the arena's edge.",
      "Gravity is undefeated. Just saying.",
    ],
    meteor: [
      "The sky is angry today. I wonder why.",
      "When the ground turns red, move. Or don't. I enjoy both.",
      "There's always a safe spot. Finding it is your problem.",
      "Meteors don't care about your feelings.",
      "Some call it dodging. I call it delayed inevitability.",
    ],
  };

  const ELIMINATIONS = [
    "And just like that, {player} is out. Tragic.",
    "{player} tried. That's... something.",
    "Goodbye, {player}. You won't be missed.",
    "{player} has left the competition. Not by choice.",
    "Rest in pieces, {player}.",
    "That's gotta hurt, {player}.",
    "{player} discovered that the floor is optional.",
    "A moment of silence for {player}. ...okay, moment over.",
    "{player}'s controller just became a paperweight.",
    "Plot twist: {player} was never going to win anyway.",
    "{player} has been... removed from the equation.",
    "One less contestant. The odds improve. For some.",
    "{player}, your journey ends here. It was brief.",
    "The show must go on. Without {player}, apparently.",
    "I'd say {player} put up a good fight, but I'd be lying.",
  ];

  const WINNER = [
    "{player} survives! Impressive. Or lucky. Hard to tell.",
    "Congratulations, {player}. Try not to gloat.",
    "{player} wins! The rest of you should practice.",
    "Against all odds, {player} prevails. Barely.",
    "{player} stands victorious. For now.",
    "Well played, {player}. Don't let it go to your head.",
    "The crown goes to {player}. Don't get used to it.",
    "{player} wins this round. Enjoy it while it lasts.",
    "I must admit, {player}, that was... adequate.",
    "And tonight's survivor is {player}. The audience goes mild.",
  ];

  const NO_WINNER = [
    "Nobody survived. I love it when that happens.",
    "Total annihilation. Beautiful.",
    "Zero survivors. A perfect round.",
    "Everyone lost. That's a kind of equality, I suppose.",
  ];

  const TOURNAMENT_STANDINGS = [
    "Let's see who's ahead. Some of you should be nervous.",
    "Standings update. Don't worry, it gets worse.",
    "The scoreboard never lies. Unlike your confidence.",
    "Some of you are doing well. Others are... here.",
  ];

  const TOURNAMENT_START = [
    "Welcome to the tournament. Not everyone will make it.",
    "Three rounds. One champion. No mercy.",
    "Let the games begin. May the least unlucky win.",
    "Buckle up. This is going to be messy.",
  ];

  const CHAMPION = [
    "All hail {player}, the champion! ...for now.",
    "{player} wins the tournament! The rest of you can stop crying.",
    "The crown goes to {player}. Try to hold onto it.",
    "Champion: {player}. The rest of you are footnotes.",
  ];

  const TOURNAMENT_ROUND_INTRO = [
    "Round {round}! {game} awaits...",
    "Next up: {game}. Prepare yourselves.",
    "Round {round} of {total}. The plot thickens.",
    "{game}. May the odds be ever in your favor.",
    "Time for {game}. Someone's about to regret their life choices.",
  ];

  const TOURNAMENT_STANDINGS_COMMENTARY = [
    "{leader} takes the lead! Can anyone stop them?",
    "The standings speak for themselves. {last} might want to try harder.",
    "{leader} is dominating. This is getting embarrassing for {last}.",
    "Tight race for the crown! Anyone's game.",
    "After {round} rounds, {leader} leads with {score} points.",
  ];

  const TOURNAMENT_CHAMPION_QUIPS = [
    "All hail {champion}, the undisputed champion!",
    "{champion} wins the tournament! The rest of you were merely entertainment.",
    "And the crown goes to... {champion}! What a show!",
    "{champion} is victorious! Someone get them a trophy.",
    "The winner of FRANTICS is... {champion}! Crowd goes mild.",
  ];

  const FOX_CLOSE = [
    "The fox is getting closer. Run faster.",
    "I can hear it breathing...",
    "It's right behind you. Just saying.",
  ];

  const SHIELD_BLOCK = [
    "{player} blocks! The dasher bounces like a rubber ball.",
    "Nice shield, {player}. That had to sting.",
    "BLOCKED! {player} saw that coming.",
  ];

  const SPEED_BURST = [
    "Speed boost! Try to keep up.",
    "Faster! FASTER!",
    "Hold on tight, it's about to get wild.",
  ];

  const POWERUP = [
    "{player} found a shield! How convenient.",
    "Speed boost for {player}! Try not to trip.",
    "{player} is collecting coins. Priorities.",
    "Ooh, shiny! {player} can't resist.",
  ];

  const STUMBLE = [
    "{player} stumbles! That's your one warning.",
    "Careful, {player}. Next time you're out.",
    "{player} trips but keeps going. Barely.",
  ];

  const FOX_ANGRY = [
    "The fox is angry! I wouldn't stick around.",
    "Did the fox just... growl? Run.",
    "That sound you hear? That's hunger.",
  ];

  const BIOME_CAVE = [
    "Into the cave! Watch your step.",
    "It's dark in here. The fox doesn't care.",
  ];

  const BIOME_SNOW = [
    "Snow territory! It's getting cold.",
    "Watch for ice. Or don't. I'm not your mother.",
  ];

  const BIOME_VOLCANO = [
    "Welcome to the volcano. The floor is... fine. Probably.",
    "Hot zone! Everything here wants to kill you.",
  ];

  // ---- ENGINE ----

  function pick(pool, subs) {
    const available = pool.filter(q => !shown.has(q));
    const choice = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : pool[Math.floor(Math.random() * pool.length)];
    shown.add(choice);
    if (shown.size > 50) shown.clear(); // reset after a while
    let text = choice;
    if (subs) {
      for (const [k, v] of Object.entries(subs)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
    }
    return text;
  }

  function createOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'narrator-overlay';
    // Phase 61a — painted carved parchment plaque. Replaces the
    // flat rgba-pill with a layered CSS composition that reads
    // as "hand-painted scroll pinned to a wooden backing":
    //   1) wooden plank base gradient with grain streaks
    //   2) aged cream parchment on top, slight rough edges
    //   3) gold brass rivets at 4 corners
    //   4) warm inner glow + drop shadow so it lifts off the
    //      painted hero behind it
    overlay.style.cssText = `
      position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
      max-width: 640px; width: 88%;
      padding: 14px 24px 14px 16px;
      font-family: var(--font-accent, 'Cutive'), Georgia, serif;
      color: var(--text-cream, #f5ead4);
      font-size: 17px; font-style: italic;
      text-align: left; line-height: 1.5;
      letter-spacing: 0.3px;
      pointer-events: none; opacity: 0;
      transition: opacity 0.4s, transform 0.4s;
      z-index: 35;
      display: flex; align-items: center; gap: 14px;
      border: none; border-radius: 18px;
      background:
        /* parchment top layer — warm cream with subtle grain */
        linear-gradient(180deg,
          rgba(245, 228, 190, 0.96) 0%,
          rgba(228, 205, 160, 0.94) 55%,
          rgba(205, 178, 130, 0.92) 100%),
        /* wood backing peek at edges */
        linear-gradient(180deg,
          rgba(70, 42, 20, 1) 0%,
          rgba(52, 30, 14, 1) 100%);
      background-clip: padding-box, border-box;
      box-shadow:
        /* thick dark inner stroke (carved edge) */
        inset 0 0 0 2px rgba(45, 25, 12, 0.9),
        /* warm gold rim just inside the dark stroke */
        inset 0 0 0 4px rgba(195, 145, 55, 0.7),
        /* parchment top highlight */
        inset 0 2px 0 rgba(255, 245, 210, 0.5),
        /* parchment bottom ink shadow */
        inset 0 -3px 6px rgba(100, 60, 20, 0.35),
        /* lifted drop shadow + warm halo */
        0 10px 24px rgba(0, 0, 0, 0.7),
        0 0 32px rgba(244, 197, 66, 0.2);
    `;
    // Phase 61a — four brass rivets pinned to the plaque corners
    // via ::before / ::after layered siblings. Injected on first
    // paint so the rounded-rectangle reads as "parchment pinned
    // to wood".
    ['tl', 'tr', 'bl', 'br'].forEach((pos) => {
      const rivet = document.createElement('div');
      rivet.className = 'narrator-rivet narrator-rivet-' + pos;
      overlay.appendChild(rivet);
    });
    document.body.appendChild(overlay);

    const style = document.createElement('style');
    style.textContent = `
      #narrator-overlay.show { opacity: 1 !important; }
      /* Phase 61a — portrait now sits in a carved brass medallion
         that matches the painted hero avatar discs (Phase 54/55). */
      #narrator-overlay .narrator-portrait {
        flex: 0 0 auto;
        width: 64px; height: 64px;
        border-radius: 50%;
        object-fit: cover;
        background: radial-gradient(circle at 35% 30%,
          rgba(255, 255, 255, 0.12),
          rgba(0, 0, 0, 0.35));
        box-shadow:
          inset 0 2px 0 rgba(255, 250, 220, 0.32),
          inset 0 -2px 4px rgba(0, 0, 0, 0.45),
          0 0 0 2px rgba(20, 10, 5, 0.9),
          0 0 0 4px rgba(216, 152, 45, 0.85),
          0 2px 8px rgba(0, 0, 0, 0.55);
      }
      #narrator-overlay .narrator-body {
        flex: 1 1 auto; min-width: 0;
        display: flex; flex-direction: column;
        position: relative; z-index: 1;
      }
      /* Phase 61a — "GAME MASTER" label reads as carved gold
         letterpress on the parchment, not a web UI caption. */
      #narrator-overlay .narrator-label {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 11px;
        letter-spacing: 4px;
        color: var(--accent-red-deep, #6b1818);
        opacity: 0.92;
        text-transform: uppercase;
        font-style: normal;
        margin-bottom: 3px;
        display: block;
        text-shadow: 0 1px 0 rgba(255, 240, 200, 0.45);
      }
      /* Phase 61a — quip text as warm dark-brown ink on cream
         parchment (was cream on dark). Reads as hand-written. */
      #narrator-overlay .narrator-text {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 17px;
        color: rgba(55, 28, 14, 0.92);
        text-shadow: 0 1px 0 rgba(255, 240, 200, 0.45);
      }
      /* Phase 61a — brass rivets at the 4 corners of the plaque. */
      #narrator-overlay .narrator-rivet {
        position: absolute;
        width: 10px; height: 10px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%,
          #ffe290 0%, #d5972b 55%, #7a4c12 100%);
        box-shadow:
          inset 0 1px 0 rgba(255, 250, 210, 0.55),
          inset 0 -1px 2px rgba(60, 30, 8, 0.7),
          0 1px 2px rgba(0, 0, 0, 0.55);
        pointer-events: none;
      }
      #narrator-overlay .narrator-rivet-tl { top: 8px;    left: 8px; }
      #narrator-overlay .narrator-rivet-tr { top: 8px;    right: 8px; }
      #narrator-overlay .narrator-rivet-bl { bottom: 8px; left: 8px; }
      #narrator-overlay .narrator-rivet-br { bottom: 8px; right: 8px; }
    `;
    document.head.appendChild(style);
  }

  // Audit / post-Phase 9: narrator.png carries a baked background that
  // peeks through the 64px circle-crop. Pipe through loadPainterly and
  // cache the processed data URL; showQuip consumes whichever is
  // currently available (raw PNG or processed).
  let narratorPortraitSrc = '/assets/narrator.png';
  // Defer so SpriteLoader script has time to execute in per-game hosts
  // where it may load AFTER narrator.js in index.html.
  setTimeout(() => {
    if (typeof SpriteLoader === 'undefined') return;
    SpriteLoader.loadPainterly('narrator', '/assets/narrator.png')
      .then((canvas) => {
        if (canvas) narratorPortraitSrc = canvas.toDataURL('image/png');
        document.querySelectorAll('#narrator-overlay .narrator-portrait').forEach((img) => {
          if (!img.src.startsWith('data:')) img.src = narratorPortraitSrc;
        });
      })
      .catch(() => {});
  }, 0);

  function showQuip(text, duration) {
    createOverlay();
    // onerror hides portrait if narrator.png is missing — overlay falls back
    // to the pre-Phase 5b text-only layout (flex shrinks when img is gone).
    overlay.innerHTML = `
      <img class="narrator-portrait" src="${narratorPortraitSrc}" alt="Game Master"
        onerror="this.remove()">
      <div class="narrator-body">
        <span class="narrator-label">Game Master</span>
        <span class="narrator-text">${text}</span>
      </div>
    `;
    overlay.classList.add('show');
    // Pretext-measure the quip so the overlay card height matches the
    // actual wrapped line count. Long zingers ("A moment of silence.
    // Moment over.") no longer over-reserve vertical space or clip.
    // rAF wait lets flex layout settle so clientWidth is non-zero.
    if (window.PretextHooks) {
      requestAnimationFrame(() => {
        const span = overlay.querySelector('.narrator-text');
        if (span) window.PretextHooks.measure(span);
      });
    }
    setTimeout(() => overlay.classList.remove('show'), duration || 3500);
  }

  function queueQuip(text, delay, duration) {
    queue.push({ text, delay: delay || 0, duration: duration || 3500 });
    processQueue();
  }

  function processQueue() {
    if (showing || queue.length === 0) return;
    showing = true;
    const item = queue.shift();
    setTimeout(() => {
      showQuip(item.text, item.duration);
      setTimeout(() => { showing = false; processQueue(); }, item.duration + 500);
    }, item.delay);
  }

  // ---- PUBLIC API ----

  function gameIntro(gameId) {
    const pool = INTROS[gameId];
    if (pool) queueQuip(pick(pool), 500, 3000);
  }

  function elimination(playerName) {
    queueQuip(pick(ELIMINATIONS, { player: playerName }), 200, 2500);
  }

  function winner(playerName) {
    queueQuip(pick(WINNER, { player: playerName }), 500, 3500);
  }

  function noWinner() {
    queueQuip(pick(NO_WINNER), 500, 3000);
  }

  function tournamentStart() {
    queueQuip(pick(TOURNAMENT_START), 300, 3500);
  }

  function tournamentStandings() {
    queueQuip(pick(TOURNAMENT_STANDINGS), 300, 3000);
  }

  function champion(playerName) {
    queueQuip(pick(CHAMPION, { player: playerName }), 500, 4000);
  }

  function foxClose() {
    queueQuip(pick(FOX_CLOSE), 0, 2000);
  }

  function shieldBlock(playerName) {
    queueQuip(pick(SHIELD_BLOCK, { player: playerName }), 0, 2500);
  }

  function speedBurst() {
    queueQuip(pick(SPEED_BURST), 0, 2000);
  }

  function custom(text, duration) {
    queueQuip(text, 200, duration || 3000);
  }

  function tournamentRoundIntro(round, total, gameName) {
    var text = pick(TOURNAMENT_ROUND_INTRO, { round: round, total: total, game: gameName });
    queueQuip(text, 800, 3000);
    return text;
  }

  function tournamentStandingsCommentary(leader, last, round, score) {
    var text = pick(TOURNAMENT_STANDINGS_COMMENTARY, { leader: leader, last: last, round: round, score: score });
    // Don't queue — return for inline display in the overlay
    return text;
  }

  function tournamentChampionQuip(champion) {
    var text = pick(TOURNAMENT_CHAMPION_QUIPS, { champion: champion });
    // Don't queue — return for inline display in the overlay
    return text;
  }

  // ---- EVENT-DRIVEN API (AI-ready) ----
  // Each game event generates a structured event object.
  // Currently: picks from quip pools. Future: AI generates on-the-fly.
  const eventLog = [];

  function narrateEvent(event) {
    eventLog.push({ ...event, ts: Date.now() });
    // Keep last 50 events
    if (eventLog.length > 50) eventLog.shift();

    // Route to appropriate handler
    switch (event.type) {
      case 'game_intro': gameIntro(event.gameId); break;
      case 'elimination': elimination(event.playerName); break;
      case 'winner': winner(event.playerName); break;
      case 'no_winner': noWinner(); break;
      case 'tournament_start': tournamentStart(); break;
      case 'tournament_standings': tournamentStandings(); break;
      case 'champion': champion(event.playerName); break;
      case 'tournament_round_intro':
        tournamentRoundIntro(event.round, event.total, event.gameName); break;
      case 'tournament_standings_commentary':
        tournamentStandingsCommentary(event.leader, event.last, event.round, event.score); break;
      case 'tournament_champion':
        tournamentChampionQuip(event.champion); break;
      case 'fox_close': foxClose(); break;
      case 'shield_block': shieldBlock(event.playerName); break;
      case 'speed_burst': speedBurst(); break;
      case 'custom': custom(event.text, event.duration); break;
      case 'momentum_shift':
        // Future: AI generates context-aware commentary
        // For now: generic quips
        custom(event.text || 'Things are getting interesting...', 2500);
        break;
      default:
        if (event.text) custom(event.text, event.duration);
    }
  }

  function getEventLog() { return eventLog; }

  return {
    gameIntro, elimination, winner, noWinner,
    tournamentStart, tournamentStandings, champion,
    foxClose, shieldBlock, speedBurst, custom,
    // Tournament dramatic quips
    tournamentRoundIntro, tournamentStandingsCommentary, tournamentChampionQuip,
    // Event-driven API (AI-ready)
    narrateEvent, getEventLog,
  };
})();
