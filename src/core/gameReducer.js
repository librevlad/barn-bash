// src/core/gameReducer.js
// Central GameState shape + pure reducer. App dispatches actions via
// useReducer(gameReducer); side effects (broadcast to phones, write to
// localStorage) live in effect-layer code that watches the state.
//
// type GameState = {
//   screen: Screen
//   round: number
//   totalRounds: number
//   scores: number[]
//   players: Player[]
//   coins: number
//   modifier: Twist | null
//   difficulty: 'easy' | 'medium' | 'hard'
//   lastEarned: number[]
//   lastMinigame: string | null     // friendly name for the Scoreboard hero
//   currentGameId: string | null    // registry id while screen === Minigame
// }

(function(BB) {
  function initialGameState(tweaks) {
    return {
      screen: BB.Screen.Title,
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
    };
  }

  function gameReducer(state, action) {
    const { Screen } = BB;
    switch (action.type) {
      case 'GO_TITLE':
        return { ...state, screen: Screen.Title };

      case 'START_GAME': {
        const { players, totalRounds, modifier, difficulty } = action;
        const n = players.length;
        return {
          ...state,
          screen: Screen.CharacterSelect,
          round: 1,
          totalRounds,
          scores: Array(n).fill(0),
          players,
          modifier,
          difficulty,
          lastEarned: Array(n).fill(0),
          lastMinigame: null,
          currentGameId: null,
        };
      }

      case 'CONFIRM_CHARACTERS':
        return { ...state, screen: Screen.Board };

      case 'PICK_MINIGAME':
        return { ...state, screen: Screen.Minigame, currentGameId: action.gameId };

      case 'FINISH_MINIGAME':
        return {
          ...state,
          screen: Screen.Scoreboard,
          lastEarned: action.earned,
          lastMinigame: action.name,
          currentGameId: null,
        };

      case 'QUIT_MINIGAME':
        return { ...state, screen: Screen.Board, currentGameId: null };

      case 'CONTINUE_ROUND': {
        const newScores = state.scores.map((v, i) => v + (state.lastEarned[i] || 0));
        const youEarned = state.lastEarned[0] || 0;
        const coins = state.coins + youEarned * 10;
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
