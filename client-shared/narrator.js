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
    overlay.style.cssText = `
      position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
      max-width: 500px; width: 85%; padding: 14px 22px;
      background: rgba(0,0,0,0.75); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px; backdrop-filter: blur(8px);
      font-family: -apple-system, 'Segoe UI', sans-serif;
      color: #eee; font-size: 15px; font-style: italic;
      text-align: center; line-height: 1.5;
      pointer-events: none; opacity: 0;
      transition: opacity 0.4s, transform 0.4s;
      z-index: 35;
    `;
    document.body.appendChild(overlay);

    const style = document.createElement('style');
    style.textContent = `
      #narrator-overlay.show { opacity: 1; }
      #narrator-overlay .narrator-label {
        font-size: 9px; letter-spacing: 3px; opacity: 0.4;
        text-transform: uppercase; font-style: normal;
        margin-bottom: 6px; display: block;
      }
      #narrator-overlay .narrator-text {
        font-size: 15px; color: #ddd;
      }
    `;
    document.head.appendChild(style);
  }

  function showQuip(text, duration) {
    createOverlay();
    overlay.innerHTML = `
      <span class="narrator-label">Game Master</span>
      <span class="narrator-text">${text}</span>
    `;
    overlay.classList.add('show');
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
