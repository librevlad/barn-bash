// Phase 34 — shared per-game host harness. Consolidates the WS-boot,
// state-phase, countdown, lobby, game-over, and button-wiring ceremony
// that was previously copy-pasted across the 4 per-game main.js files
// (escape / hill / meteor / race).
//
// Per-game main.js is now a thin configurator:
//   HostHarness.boot({
//     gameId, lobbyAsset, musicKey, introKey,
//     countdownFinal, lobbyReadyMsg,
//     onStateRunning(state),      // per-game HUD / render update
//     buildPostGameOpts(state, msg) -> opts,
//   });
//   HostHarness.on({ speed_burst: (msg) => {...}, ... });
//
// Harness runs: WebSocket connect → makeHost → state dispatcher →
// per-game user handlers → game_over PostGame → gameSelected redirect.
(function(global) {
  'use strict';

  const HostHarness = {};

  let _state = { players: {}, phase: 'lobby' };
  let _config = null;
  let _ws = null;
  let _gameStarted = false;
  const _userHandlers = {};

  function $(id) { return document.getElementById(id); }

  /**
   * Boot the per-game host.
   * @param {{
   *   gameId: string,
   *   lobbyAsset: string,
   *   musicKey: string,
   *   introKey: string,
   *   countdownFinal: string,
   *   lobbyReadyMsg: string,
   *   onStateRunning?: (state: object) => void,
   *   buildPostGameOpts?: (state: object, msg: object) => object,
   * }} cfg
   */
  HostHarness.boot = function(cfg) {
    _config = cfg;

    _ws = new WebSocket('ws://' + location.host);
    _ws.onopen = () => Protocol.send(_ws, Protocol.makeHost());
    _ws.onmessage = _dispatchMessage;

    // Async-strip lobby backdrop white surround; swap img src to
    // processed data URL once loadPainterly resolves.
    setTimeout(() => {
      if (typeof SpriteLoader === 'undefined') return;
      SpriteLoader.loadPainterly(cfg.lobbyAsset, '/assets/' + cfg.lobbyAsset + '.png')
        .then((canvas) => {
          const img = document.querySelector('#lobby .lobby-backdrop');
          if (img && canvas) img.src = canvas.toDataURL('image/png');
        })
        .catch(() => {});
    }, 0);

    // Button wiring — identical across all 4 per-game hosts.
    const btnStart = $('btn-start');
    const btnAgain = $('btn-again');
    const btnLobby = $('btn-lobby');
    if (btnStart) btnStart.onclick = () => Protocol.send(_ws, Protocol.makeStart());
    if (btnAgain) btnAgain.onclick = () => Protocol.send(_ws, Protocol.makeRestart());
    if (btnLobby) btnLobby.onclick = () => {
      Protocol.send(_ws, Protocol.makeRestart());
      setTimeout(() => {
        if (typeof Transitions !== 'undefined') Transitions.navigateTo('/host/');
        else window.location.href = '/host/';
      }, 200);
    };
  };

  /**
   * Register per-game message-type handlers. Keys are message types
   * that fall through the harness's built-in cases (state /
   * game_over / gameSelected).
   * @param {Object<string, (msg: object) => void>} handlers
   */
  HostHarness.on = function(handlers) {
    for (const k in handlers) {
      if (Object.prototype.hasOwnProperty.call(handlers, k)) {
        _userHandlers[k] = handlers[k];
      }
    }
  };

  HostHarness.getState = function() { return _state; };
  HostHarness.getWs = function() { return _ws; };
  HostHarness.send = function(msg) { Protocol.send(_ws, msg); };
  HostHarness.showMsg = function(text, ms) {
    const $message = $('message');
    if ($message) HostCommon.showMsg($message, text, ms);
  };

  function _dispatchMessage(e) {
    const msg = JSON.parse(e.data);
    if (typeof Tournament !== 'undefined' && Tournament.handleMessage(msg)) return;

    if (msg.type === 'state') {
      window._lastPlayers = msg.gameState ? msg.gameState.players : {};
      if (HostCommon.redirectIfWrongGame(_config.gameId, msg.gameId)) return;
      _state = msg.gameState;

      if (_state.phase === 'lobby') {
        _gameStarted = false;
        _showLobby(_state);
      } else if (_state.phase === 'running') {
        if (!_gameStarted) {
          _gameStarted = true;
          const $lobby = $('lobby');
          const $hud = $('hud');
          const $controls = $('controls');
          const $winOverlay = $('winner-overlay');
          if ($lobby) $lobby.classList.add('hidden');
          if (typeof HUD !== 'undefined') HUD.init();
          if ($hud) $hud.style.display = 'none';
          if ($controls) $controls.style.display = 'none';
          if ($winOverlay) $winOverlay.classList.remove('show');
          if (_config.musicKey) Sound.startMusic(_config.musicKey);
          if (_config.introKey) Narrator.gameIntro(_config.introKey);
          _runCountdown();
        }
        if (typeof Render2D !== 'undefined') Render2D.updateState(_state);
        if (_config.onStateRunning) _config.onStateRunning(_state);
      } else if (_state.phase === 'result') {
        if (typeof Render2D !== 'undefined') Render2D.updateState(_state);
      }
      return;
    }

    if (msg.type === 'game_over') {
      Sound.stopMusic();
      Sound.play(msg.winnerId ? 'winner' : 'eliminated');
      if (typeof FX !== 'undefined') { FX.screenFlash('#fff', 0.4); FX.triggerSlowMo(0.3, 1.5); }
      if (typeof Visual !== 'undefined') Visual.triggerWinner();
      if (msg.winnerId) Narrator.winner(HostCommon.pname(msg.winnerId));
      else Narrator.noWinner();
      if (typeof Tournament !== 'undefined' && Tournament.isActive()) return;
      if (typeof PostGame !== 'undefined' && _config.buildPostGameOpts) {
        PostGame.show(_config.buildPostGameOpts(_state, msg));
      }
      return;
    }

    if (msg.type === 'gameSelected') {
      if (msg.gameId !== _config.gameId) {
        const url = HostCommon.gameUrls[msg.gameId] || '/host/';
        if (typeof Transitions !== 'undefined') Transitions.navigateTo(url);
        else window.location.href = url;
      }
      return;
    }

    // Fall through to per-game registered handlers.
    const handler = _userHandlers[msg.type];
    if (handler) handler(msg);
  }

  function _runCountdown() {
    const $countdown = $('countdown');
    const $hud = $('hud');
    if ($hud) $hud.style.display = 'none';
    if (!$countdown) return;
    const steps = ['3', '2', '1', _config.countdownFinal || 'GO!'];
    let i = 0;
    $countdown.style.display = 'block';
    function next() {
      if (i >= steps.length) { $countdown.style.display = 'none'; return; }
      $countdown.textContent = steps[i];
      $countdown.style.transform = 'translate(-50%, -50%) scale(1.6)';
      $countdown.style.opacity = '1';
      Sound.play(i < 3 ? 'countdownTick' : 'countdownGo');
      setTimeout(() => {
        $countdown.style.transform = 'translate(-50%, -50%) scale(0.7)';
        $countdown.style.opacity = '0';
      }, 500);
      i++;
      setTimeout(next, 750);
    }
    next();
  }

  function _showLobby(s) {
    const $lobby = $('lobby');
    const $hud = $('hud');
    const $controls = $('controls');
    const $winOverlay = $('winner-overlay');
    const $countdown = $('countdown');
    const $lobbyInfo = $('lobby-info');
    const $lobbyPlayers = $('lobby-players');
    const $btnStart = $('btn-start');

    if ($lobby) $lobby.classList.remove('hidden');
    if ($hud) $hud.style.display = 'none';
    if ($controls) $controls.style.display = 'none';
    if ($winOverlay) $winOverlay.classList.remove('show');
    if ($countdown) $countdown.style.display = 'none';

    const { connected } = HostCommon.countPlayers(s.players);
    if ($lobbyInfo) {
      $lobbyInfo.textContent = connected >= 2
        ? (_config.lobbyReadyMsg || 'Ready to play!')
        : 'Waiting for players...';
    }
    if ($btnStart) $btnStart.style.display = connected >= 2 ? '' : 'none';
    if ($lobbyPlayers) {
      $lobbyPlayers.innerHTML = HostCommon.lobbyPlayersHTML(s.players);
    }
  }

  global.HostHarness = HostHarness;
})(typeof window !== 'undefined' ? window : this);
