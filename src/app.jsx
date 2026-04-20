// src/app.jsx
// Top-level app — owns the Tweaks state and the GameState reducer, bridges
// multiplayer broadcast side effects to state changes, and delegates render
// to the SceneManager. No switch-on-screen lives here, no mini-game logic,
// no global window pokes.

const { useState: useState$, useEffect: useEffect$, useRef: useRef$, useReducer: useReducer$ } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "difficulty": "medium",
  "playerCount": 4,
  "totalRounds": 5,
  "palette": "barnyard",
  "twists": true,
  "youChar": "pig"
}/*EDITMODE-END*/;

const TWISTS = [
  { id:'gravity', text:'Gravity is wild', emoji:'🌀' },
  { id:'flip', text:'Upside-down controls', emoji:'🔄' },
  { id:'double', text:'Double coins!', emoji:'💰' },
  { id:'mud', text:'Mud makes things slippery', emoji:'💧' },
  { id:'takeall', text:'Winner takes ALL', emoji:'👑' },
  { id:'huge', text:'Hay bales are HUGE', emoji:'🌾' },
  { id:'sudden', text:'Sudden death: one hit out', emoji:'💥' },
  { id:'fast', text:'Everything is 50% faster', emoji:'⚡' },
  { id:'fog', text:'Foggy fields · low vis', emoji:'🌫️' },
  { id:'wind', text:'Gusty wind · arrows curve', emoji:'💨' },
  { id:'night', text:'Midnight mode · barn owls watching', emoji:'🌙' },
  { id:'rain', text:'Rainy day · slippy slidey', emoji:'🌧️' },
  { id:'tiny', text:'Shrink ray · tiny critters', emoji:'🔍' },
];

// Build a new lineup from the live phone roster + tweaks.playerCount. All
// joined phones get slots; CPU critters fill the rest up to the target.
// If more phones are connected than the target, bump the total so nobody
// who joined gets trimmed. Zero-phone sessions fall back to the classic
// local-you + CPU solo flow.
function buildLineup(remotePlayers, tweaks) {
  const connected = (remotePlayers || []).filter(p => p.character);
  const phoneCount = Math.min(connected.length, 6);
  if (phoneCount > 0) {
    const target = Math.max(Math.min(tweaks.playerCount, 6), phoneCount);
    const used = new Set();
    const players = connected.slice(0, 6).map(p => {
      const char = CHARACTERS.find(c => c.id === p.character) || CHARACTERS[0];
      used.add(char.id);
      return { char, isCPU: false, remoteId: p.id, displayName: p.name || char.name };
    });
    const pool = CHARACTERS.filter(c => !used.has(c.id)).sort(() => Math.random() - .5);
    while (players.length < target && pool.length > 0) {
      players.push({ char: pool.shift(), isCPU: true });
    }
    return players;
  }
  const you = CHARACTERS.find(c => c.id === tweaks.youChar) || CHARACTERS[0];
  const pool = CHARACTERS.filter(c => c.id !== you.id).sort(() => Math.random() - .5);
  const players = [{ char: you, isCPU: false }];
  for (let i = 1; i < tweaks.playerCount; i++) players.push({ char: pool[i-1], isCPU: true });
  return players;
}

// Compute per-player ranks from a numeric signal (earned coins for a round
// or total score for the finale). Used to build the byId payloads the
// multiplayer layer broadcasts to phones.
function rankByValue(players, values) {
  const sorted = players.map((_, i) => ({ i, v: values[i] || 0 })).sort((a, b) => b.v - a.v);
  const rankOf = new Array(players.length);
  let lastV = null, lastRank = 0;
  sorted.forEach((row, idx) => {
    if (row.v !== lastV) { lastRank = idx + 1; lastV = row.v; }
    rankOf[row.i] = lastRank;
  });
  return rankOf;
}

function App() {
  const [tweaks, setTweaks] = useState$(() => {
    try {
      const saved = localStorage.getItem('barnyard-tweaks');
      if (saved) return { ...TWEAK_DEFAULTS, ...JSON.parse(saved) };
    } catch (_) {}
    return TWEAK_DEFAULTS;
  });
  const [tweaksOpen, setTweaksOpen] = useState$(false);
  const [state, dispatch] = useReducer$(
    window.BB.core.gameReducer, tweaks, window.BB.core.initialGameState
  );
  const mp = window.BB.mp.useMultiplayer();

  useEffect$(() => { localStorage.setItem('barnyard-tweaks', JSON.stringify(tweaks)); }, [tweaks]);
  useEffect$(() => { localStorage.setItem('barnyard-screen', state.screen); }, [state.screen]);

  // Broadcast screen transitions to every connected phone so controllers
  // can pick the right lobby / vote / summary / finale view.
  useEffect$(() => { mp.broadcastScreen(state.screen); }, [state.screen, mp.broadcastScreen]);

  // Phone-drop resilience: when the live mp.remotePlayers set changes, flip
  // isCPU on matching slots so AI covers dropped lanes and phones reclaim
  // on reconnect.
  useEffect$(() => {
    const liveIds = new Set((mp.remotePlayers || []).map(p => p.id));
    dispatch({ type: 'PHONE_PRESENCE_SYNC', liveIds });
  }, [mp.remotePlayers]);

  // Scoreboard / Podium side-effect: once the reducer lands us on one of
  // these screens, push the personalised byId payload so phones show the
  // right rank + coins + champion splash.
  useEffect$(() => {
    if (state.screen !== window.BB.Screen.Scoreboard) return;
    const rankOf = rankByValue(state.players, state.lastEarned);
    const byId = {};
    state.players.forEach((p, i) => {
      if (!p.remoteId) return;
      byId[p.remoteId] = {
        rank: rankOf[i],
        earned: state.lastEarned[i] || 0,
        total: (state.scores[i] || 0) + (state.lastEarned[i] || 0),
      };
    });
    mp.broadcastRoundEnd && mp.broadcastRoundEnd({ minigame: state.lastMinigame || 'Mini-game', byId });
  }, [state.screen, state.lastMinigame]);

  useEffect$(() => {
    if (state.screen !== window.BB.Screen.Podium) return;
    const rankOf = rankByValue(state.players, state.scores);
    const byId = {};
    state.players.forEach((p, i) => {
      if (!p.remoteId) return;
      byId[p.remoteId] = { rank: rankOf[i], total: state.scores[i] || 0 };
    });
    mp.broadcastGameOver && mp.broadcastGameOver({ byId });
  }, [state.screen]);

  // Handlers that compose multiple sources (remote roster, tweaks). The
  // reducer stays pure; these wrap the action with the derived payload.
  const handleStartGame = () => {
    dispatch({
      type: 'START_GAME',
      players: buildLineup(mp.remotePlayers, tweaks),
      totalRounds: tweaks.totalRounds,
      modifier: tweaks.twists ? pick(TWISTS) : null,
      difficulty: tweaks.difficulty,
    });
  };
  const handleContinueRound = () => {
    dispatch({ type: 'CONTINUE_ROUND', nextModifier: tweaks.twists ? pick(TWISTS) : null });
  };

  // Edit-mode iframe handshake (unchanged behaviour).
  useEffect$(() => {
    const onMsg = (e) => {
      const t = e.data && e.data.type;
      if (t === '__activate_edit_mode') setTweaksOpen(true);
      else if (t === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (_) {}
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const updateTweaks = (next) => {
    setTweaks(next);
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: next }, '*'); } catch (_) {}
  };

  // Stage scaling — shrink the 1600×900 stage to fit the browser window.
  const stageRef = useRef$(null);
  useEffect$(() => {
    const resize = () => {
      if (!stageRef.current) return;
      const s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
      stageRef.current.style.transform = `scale(${s})`;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Palette tint — applies the TWEAKS palette to the CSS colour tokens.
  useEffect$(() => {
    const root = document.documentElement;
    const maps = {
      barnyard: { '--yellow':'#ffc93c', '--red':'#e04b3b', '--green':'#6cc24a', '--blue':'#4aa3e0' },
      sunset:   { '--yellow':'#f28b3a', '--red':'#e04b7a', '--green':'#a36bd1', '--blue':'#4a3a8e' },
      candy:    { '--yellow':'#ffd26b', '--red':'#f28bbd', '--green':'#b0e06c', '--blue':'#7ad0e0' },
      moody:    { '--yellow':'#c4a44a', '--red':'#c04a6a', '--green':'#4a6ea8', '--blue':'#2d4a7a' },
    };
    const p = maps[tweaks.palette] || maps.barnyard;
    Object.entries(p).forEach(([k,v]) => root.style.setProperty(k, v));
  }, [tweaks.palette]);

  return (
    <>
      <div className="stage-wrap">
        <div className="stage" ref={stageRef} data-screen-label={labelFor(state)}>
          <window.BB.engine.SceneManager
            state={state}
            tweaks={tweaks}
            dispatch={dispatch}
            handlers={{ onStartGame: handleStartGame, onContinueRound: handleContinueRound }}
            onTweaks={setTweaksOpen}
          />
        </div>
      </div>
      <TweaksPanel tweaks={tweaks} setTweaks={updateTweaks} open={tweaksOpen} setOpen={setTweaksOpen}/>
      <window.BB.mp.ReactionOverlay/>
    </>
  );
}

// Debug label shown on the stage (data-screen-label). Falls back to the raw
// screen name for anything outside the mapped set.
function labelFor(state) {
  const S = window.BB.Screen;
  if (state.screen === S.Minigame && state.currentGameId) {
    const def = window.BB.games.get(state.currentGameId);
    return def ? `04 ${def.name}` : '04 Mini-game';
  }
  return ({
    [S.Title]:           '01 Title',
    [S.CharacterSelect]: '02 Character Select',
    [S.Board]:           '03 Minigame Board',
    [S.Scoreboard]:      '08 Scoreboard',
    [S.Podium]:          '09 Podium',
  })[state.screen] || state.screen;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <window.BB.mp.MultiplayerProvider>
    <App/>
  </window.BB.mp.MultiplayerProvider>
);
