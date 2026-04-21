// src/core/gameReducer.js
// Central GameState shape + pure reducer. App dispatches actions via
// useReducer(gameReducer); side effects (broadcast to phones, write to
// localStorage) live in effect-layer code that watches the state.
//
// type GameState = {
//   screen: Screen
//   mode: 'classic' | 'party'       // Party Mode is the MVP pivot flow —
//                                   //   infinite minigame loop, AI picker,
//                                   //   "Хватит" exit instead of fixed N rounds
//   round: number
//   totalRounds: number | null      // null in party mode (uncapped session)
//   scores: number[]
//   players: Player[]
//   coins: number
//   modifier: Twist | null
//   difficulty: 'easy' | 'medium' | 'hard'
//   lastEarned: number[]
//   lastMinigame: string | null     // friendly name for the Scoreboard hero
//   currentGameId: string | null    // registry id while screen === Minigame
//   playedGameIds: string[]         // party-mode session history for picker
// }

(function(BB) {
  function initialGameState(tweaks) {
    return {
      screen: BB.Screen.Title,
      mode: 'classic',
      round: 1,
      totalRounds: tweaks.totalRounds,
      scores: [],
      players: [],
      coins: 1240,
      modifier: null,
      difficulty: tweaks.difficulty,
      lastEarned: [],
      lastMinigame: null,
      currentGameId: null,
      playedGameIds: [],
    };
  }

  function gameReducer(state, action) {
    const { Screen } = BB;
    switch (action.type) {
      case 'GO_TITLE':
        // Full reset: back to Title with a clean board. Keeps nothing but
        // coins (persistent meta-currency). Used by the MAIN MENU button on
        // Podium, the RESET TO TITLE button in TWEAKS, and the Esc key.
        return {
          ...state,
          screen: Screen.Title,
          mode: 'classic',
          round: 1,
          scores: [],
          players: [],
          lastEarned: [],
          lastMinigame: null,
          currentGameId: null,
          modifier: null,
          playedGameIds: [],
        };

      case 'START_GAME': {
        const { players, totalRounds, modifier, difficulty } = action;
        const n = players.length;
        return {
          ...state,
          screen: Screen.CharacterSelect,
          mode: 'classic',
          round: 1,
          totalRounds,
          scores: Array(n).fill(0),
          players,
          modifier,
          difficulty,
          lastEarned: Array(n).fill(0),
          lastMinigame: null,
          currentGameId: null,
          playedGameIds: [],
        };
      }

      case 'START_PARTY': {
        // Party Mode entry — mirrors START_GAME but with uncapped totalRounds
        // (null = no terminal round) and mode flag so the reducer knows to
        // loop minigame→scoreboard→next-minigame instead of funnelling
        // through Board selection.
        const { players, modifier, difficulty } = action;
        const n = players.length;
        return {
          ...state,
          screen: Screen.CharacterSelect,
          mode: 'party',
          round: 1,
          totalRounds: null,
          scores: Array(n).fill(0),
          players,
          modifier,
          difficulty,
          lastEarned: Array(n).fill(0),
          lastMinigame: null,
          currentGameId: null,
          playedGameIds: [],
        };
      }

      case 'CONFIRM_CHARACTERS':
        // Party mode skips the Board selection entirely — the AI picker
        // feeds the first gameId in with the action so the lobby hands off
        // straight to a minigame. Classic mode keeps the Board UI so the
        // host (or phone majority vote) still picks round 1.
        if (state.mode === 'party') {
          return { ...state, screen: Screen.Minigame, currentGameId: action.firstGameId || null };
        }
        return { ...state, screen: Screen.Board };

      case 'PICK_MINIGAME':
        return { ...state, screen: Screen.Minigame, currentGameId: action.gameId };

      case 'FINISH_MINIGAME': {
        // Guard: if the lineup is empty, the round has already been reset
        // (GO_TITLE). A late-fire setTimeout from an unmounting mini-game
        // shouldn't drag the host back into the Scoreboard.
        if (!state.players || state.players.length === 0) return state;
        // In party mode the just-finished game enters the session history so
        // the AI picker can avoid repeats / bias toward uncovered games.
        const played = state.mode === 'party' && state.currentGameId
          ? [...(state.playedGameIds || []), state.currentGameId]
          : (state.playedGameIds || []);
        return {
          ...state,
          screen: Screen.Scoreboard,
          lastEarned: action.earned,
          lastMinigame: action.name,
          currentGameId: null,
          playedGameIds: played,
        };
      }

      case 'QUIT_MINIGAME':
        return { ...state, screen: Screen.Board, currentGameId: null };

      case 'CONTINUE_ROUND': {
        const newScores = state.scores.map((v, i) => v + (state.lastEarned[i] || 0));
        const youEarned = state.lastEarned[0] || 0;
        const coins = state.coins + youEarned * 10;
        if (state.mode === 'party') {
          // Party mode: after Scoreboard go straight to the next minigame
          // chosen by the caller's picker. Defensive no-op if nextGameId is
          // missing — better to stay on Scoreboard than to flash a blank
          // Minigame screen because the host handler forgot to supply one.
          if (!action.nextGameId) {
            return { ...state, scores: newScores, coins };
          }
          return {
            ...state,
            screen: Screen.Minigame,
            currentGameId: action.nextGameId,
            round: state.round + 1,
            scores: newScores,
            coins,
            modifier: action.nextModifier || null,
            lastEarned: Array(state.players.length).fill(0),
          };
        }
        const isLastRound = state.round >= state.totalRounds;
        if (isLastRound) {
          return { ...state, screen: Screen.Podium, scores: newScores, coins };
        }
        return {
          ...state,
          screen: Screen.Board,
          round: state.round + 1,
          scores: newScores,
          coins,
          modifier: action.nextModifier || null,
        };
      }

      case 'END_PARTY': {
        // "Хватит" exit. Roll any pending lastEarned into scores so the
        // Podium reflects the final game too, then jump to Podium.
        const newScores = (state.scores || []).map((v, i) => v + ((state.lastEarned || [])[i] || 0));
        return {
          ...state,
          screen: Screen.Podium,
          scores: newScores,
          currentGameId: null,
        };
      }

      case 'PHONE_PRESENCE_SYNC': {
        // action.liveIds: Set<remoteId> of currently-connected phones.
        // Flip isCPU on players so AI covers dropped lanes and real phones
        // reclaim their slot on reconnect. Anything without a remoteId
        // (pure-CPU or local-human slots) stays untouched.
        if (!state.players || state.players.length === 0) return state;
        const { liveIds } = action;
        let dirty = false;
        const next = state.players.map(p => {
          if (!p.remoteId) return p;
          const here = liveIds.has(p.remoteId);
          if (here && p.isCPU)   { dirty = true; return { ...p, isCPU: false }; }
          if (!here && !p.isCPU) { dirty = true; return { ...p, isCPU: true };  }
          return p;
        });
        return dirty ? { ...state, players: next } : state;
      }

      default:
        return state;
    }
  }

  BB.core = Object.assign(BB.core || {}, { initialGameState, gameReducer });
})(window.BB = window.BB || {});
