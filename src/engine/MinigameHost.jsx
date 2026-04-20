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

    // Local host-side chaos event bus. Lives on a ref so publishChaos +
    // onChaos keep stable identity across renders — no WS traffic, pure
    // in-memory fan-out like the leaderboard listener set.
    const chaosListeners = useRef(null);
    if (chaosListeners.current === null) chaosListeners.current = new Set();

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
      publishChaos(data) {
        chaosListeners.current.forEach(cb => { try { cb(data); } catch (_) {} });
      },
      onChaos(cb) {
        chaosListeners.current.add(cb);
        return () => chaosListeners.current.delete(cb);
      },
    }), [mp.onInput, mp.broadcastScores, mp.broadcastTurn]);

    // Wrap the transport-level api in the semantic domain api. Games
    // receive only `game`; the raw api stays internal so mini-games can't
    // reach around the domain layer.
    const game = useMemo(
      () => BB.engine.createGameDomainAPI(api, { onFinish, onQuit }),
      [api, onFinish, onQuit]
    );

    // Lazily build one ChaosEngine instance per MinigameHost mount so the
    // 8-15s random-event scheduler starts fresh each round.
    const chaosRef = useRef(null);
    if (!chaosRef.current) {
      chaosRef.current = BB.engine.createChaosEngine({
        leaderboard: game.leaderboard,
        api: game,
      });
    }

    useEffect(() => {
      chaosRef.current.start();
      return () => chaosRef.current.stop();
    }, []);

    // Host-side chaos listener: log for now, richer handlers hook here
    // later (AI Host, visual overlays, sound fx).
    useEffect(() => {
      if (!game.api || !game.api.onChaos) return;
      const off = game.api.onChaos((event) => {
        console.log('CHAOS EVENT RECEIVED:', event);
      });
      return () => off && off();
    }, [game]);

    const G = def.component;
    return (
      <>
        <G state={state} onFinish={onFinish} onQuit={onQuit} game={game}/>
        <LeaderboardOverlay game={game} />
      </>
    );
  }

  BB.engine = Object.assign(BB.engine || {}, { MinigameHost });
})(window.BB = window.BB || {});
