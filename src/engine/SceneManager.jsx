// src/engine/SceneManager.jsx
// Renders the correct screen for the current state.screen. The Minigame
// screen looks the component up in the registry by state.currentGameId, so
// adding a mini-game doesn't touch this file.

(function(BB) {
  function SceneManager({ state, tweaks, dispatch, handlers, onTweaks }) {
    const { Screen } = BB;
    const mp = BB.mp.useMultiplayer();

    switch (state.screen) {
      case Screen.Title:
        return (
          <>
            <TitleScreen
              onPlay={handlers.onStartGame}
              onCustomize={handlers.onStartGame}
              onSettings={() => onTweaks(true)}
              remotePlayers={mp.remotePlayers}
            />
            <BB.mp.MultiplayerHUD corner="top-left"/>
          </>
        );

      case Screen.CharacterSelect:
        return (
          <CharacterSelect
            onBack={() => dispatch({ type: 'GO_TITLE' })}
            onStart={() => dispatch({ type: 'CONFIRM_CHARACTERS' })}
            playerCount={tweaks.playerCount}
            remotePlayers={state.players}
          />
        );

      case Screen.Board:
        return (
          <BoardScreen
            state={state}
            onPick={(gameId) => dispatch({ type: 'PICK_MINIGAME', gameId })}
            onTweaks={() => onTweaks(true)}
          />
        );

      case Screen.Minigame: {
        const def = state.currentGameId ? BB.games.get(state.currentGameId) : null;
        if (!def) return null;
        const G = def.component;
        return (
          <G
            state={state}
            onFinish={(earned) => dispatch({ type: 'FINISH_MINIGAME', earned, name: def.name })}
            onQuit={() => dispatch({ type: 'QUIT_MINIGAME' })}
          />
        );
      }

      case Screen.Scoreboard:
        return (
          <Scoreboard
            players={state.players}
            scores={state.scores}
            earned={state.lastEarned}
            minigameName={state.lastMinigame || 'Mini-game'}
            round={state.round}
            totalRounds={state.totalRounds}
            onContinue={handlers.onContinueRound}
          />
        );

      case Screen.Podium:
        return (
          <Podium
            players={state.players}
            scores={state.scores}
            onPlayAgain={handlers.onStartGame}
            onQuit={() => dispatch({ type: 'GO_TITLE' })}
          />
        );

      default:
        return null;
    }
  }

  BB.engine = Object.assign(BB.engine || {}, { SceneManager });
})(window.BB = window.BB || {});
