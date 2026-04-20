// src/engine/MinigameHost.jsx
// Thin adapter between the multiplayer provider and a pluggable mini-game
// component. Owns the lifecycle (broadcastMinigameStart on mount +
// broadcastMinigameEnd on unmount, driven by the registry def) and feeds
// the mini-game a narrow api prop — no React Context reach-ins, no
// window globals, no broadcast id juggling.
//
// A mini-game component receives:
//   state       GameState snapshot (unchanged from before)
//   onFinish    (earned: number[]) => void — already standard
//   onQuit      () => void                 — already standard
//   api         {
//     inputs: {
//       on(kind: string, cb: (playerId, data?) => void) → unsubscribe
//     },
//     publishScores({ byId, leader, label? })
//     publishTurn  ({ activeId, activeName, phase? })
//   }
//
// Lifecycle, score throttling, and all WebSocket access are handled here
// so a mini-game can be unit-tested by feeding it a stub `api` — no
// multiplayer needed.

(function(BB) {
  function MinigameHost({ def, state, onFinish, onQuit }) {
    const mp = BB.mp.useMultiplayer();

    // Broadcast the start/end of this mini-game exactly once per mount,
    // with the id + prompt + contract straight from the registry def.
    // Games no longer duplicate this three-line effect themselves.
    useEffect(() => {
      mp.broadcastMinigameStart(def.id, def.phonePrompt || null, def.phoneContract || null);
      return () => { mp.broadcastMinigameEnd && mp.broadcastMinigameEnd(def.id); };
    }, [def.id, mp.broadcastMinigameStart, mp.broadcastMinigameEnd]);

    // Narrow api surface — stable across renders so useEffect deps on
    // [api] don't churn. Every mp field on here is already a useCallback
    // inside the provider.
    const api = useMemo(() => ({
      inputs: {
        on(kind, cb) {
          return mp.onInput(({ id, kind: k, data }) => {
            if (k === kind) cb(id, data);
          });
        },
      },
      publishScores: mp.broadcastScores,
      publishTurn:   mp.broadcastTurn,
    }), [mp.onInput, mp.broadcastScores, mp.broadcastTurn]);

    const G = def.component;
    return <G state={state} onFinish={onFinish} onQuit={onQuit} api={api}/>;
  }

  BB.engine = Object.assign(BB.engine || {}, { MinigameHost });
})(window.BB = window.BB || {});
