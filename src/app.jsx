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
  // right rank + coins + champion splash. Payload shapes live in
  // src/core/score.js.
  useEffect$(() => {
    if (state.screen !== window.BB.Screen.Scoreboard) return;
    mp.broadcastRoundEnd && mp.broadcastRoundEnd(window.BB.core.buildRoundEndPayload(state));
  }, [state.screen, state.lastMinigame]);

  useEffect$(() => {
    if (state.screen !== window.BB.Screen.Podium) return;
    mp.broadcastGameOver && mp.broadcastGameOver(window.BB.core.buildGameOverPayload(state));
  }, [state.screen]);

  // Handlers that compose multiple sources (remote roster, tweaks). The
  // reducer stays pure; these wrap the action with the derived payload.
  const handleStartGame = () => {
    dispatch({
      type: 'START_GAME',
      players: window.BB.core.buildLineup(mp.remotePlayers, tweaks),
      totalRounds: tweaks.totalRounds,
      modifier: tweaks.twists ? pick(TWISTS) : null,
      difficulty: tweaks.difficulty,
    });
  };
  const handleStartParty = () => {
    // Party Mode entry — no totalRounds cap; reducer flips mode flag and
    // the post-scoreboard loop goes straight to the next AI-picked game
    // instead of showing the Board.
    dispatch({
      type: 'START_PARTY',
      players: window.BB.core.buildLineup(mp.remotePlayers, tweaks),
      modifier: tweaks.twists ? pick(TWISTS) : null,
      difficulty: tweaks.difficulty,
    });
  };
  // Naive picker for Party Mode P1 — uniform random over the games
  // registry, filtered to avoid immediate repeats when possible. The
  // weighted version (recency / coverage / session length) lands in P4.
  const pickNextPartyGame = () => {
    const ids = window.BB.games.ids();
    if (!ids || ids.length === 0) return null;
    const last = state.currentGameId || (state.playedGameIds || []).slice(-1)[0];
    const pool = ids.length > 1 ? ids.filter(id => id !== last) : ids;
    return pick(pool);
  };
  const handleContinueRound = () => {
    if (state.mode === 'party') {
      dispatch({
        type: 'CONTINUE_ROUND',
        nextGameId: pickNextPartyGame(),
        nextModifier: tweaks.twists ? pick(TWISTS) : null,
      });
      return;
    }
    dispatch({ type: 'CONTINUE_ROUND', nextModifier: tweaks.twists ? pick(TWISTS) : null });
  };
  const handleEndParty = () => dispatch({ type: 'END_PARTY' });
  const handleConfirmCharacters = () => {
    if (state.mode === 'party') {
      dispatch({ type: 'CONFIRM_CHARACTERS', firstGameId: pickNextPartyGame() });
      return;
    }
    dispatch({ type: 'CONFIRM_CHARACTERS' });
  };

  // Esc anywhere on the host resets to Title. Useful when the host TV is
  // stuck mid-minigame or the Jackbox loop loses sync — no need to hunt
  // for the TWEAKS panel or reload the whole browser tab.
  useEffect$(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      // Don't hijack Esc while typing in an input (Tweaks fields etc.)
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (state.screen === window.BB.Screen.Title) return;
      dispatch({ type: 'GO_TITLE' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.screen]);

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
            handlers={{
              onStartGame: handleStartGame,
              onStartParty: handleStartParty,
              onContinueRound: handleContinueRound,
              onEndParty: handleEndParty,
              onConfirmCharacters: handleConfirmCharacters,
            }}
            onTweaks={setTweaksOpen}
          />
        </div>
      </div>
      <TweaksPanel
        tweaks={tweaks}
        setTweaks={updateTweaks}
        open={tweaksOpen}
        setOpen={setTweaksOpen}
        onReset={() => { dispatch({ type: 'GO_TITLE' }); setTweaksOpen(false); }}
      />
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
