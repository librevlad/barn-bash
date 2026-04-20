// src/core/screens.js
// Screen enum for the host TV — the top-level view the SceneManager routes
// to. When state.screen === Screen.Minigame, the specific mini-game lives
// on state.currentGameId and is looked up in the games registry, so a
// new mini-game doesn't need a new screen.

(function(BB) {
  BB.Screen = Object.freeze({
    Title:           'title',
    CharacterSelect: 'select',
    Board:           'board',
    Minigame:        'minigame',
    Scoreboard:      'scoreboard',
    Podium:          'podium',
  });
})(window.BB = window.BB || {});
