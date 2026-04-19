// Top-level app + stage scaling + edit mode integration
const { useState: useState$, useEffect: useEffect$, useMemo: useMemo$, useRef: useRef$ } = React;

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

function App() {
  const [tweaks, setTweaks] = useState$(() => {
    try {
      const saved = localStorage.getItem('barnyard-tweaks');
      if (saved) return { ...TWEAK_DEFAULTS, ...JSON.parse(saved) };
    } catch(e){}
    return TWEAK_DEFAULTS;
  });
  const [tweaksOpen, setTweaksOpen] = useState$(false);
  const [editAvailable, setEditAvailable] = useState$(false);

  // --- Multiplayer sidecar: connects as host, surfaces phone players,
  //     broadcasts screen transitions so the controller UI knows what
  //     contract to render. Input fan-out lives on mp.onInput(cb).
  const mp = (window.__BarnBashMP && window.__BarnBashMP.useMultiplayer)
    ? window.__BarnBashMP.useMultiplayer()
    : { connected: false, remotePlayers: [], broadcastScreen: ()=>{}, broadcastMinigameStart: ()=>{}, broadcastMinigameEnd: ()=>{}, onInput: ()=>()=>{}, send: ()=>{} };

  useEffect$(() => {
    localStorage.setItem('barnyard-tweaks', JSON.stringify(tweaks));
  }, [tweaks]);

  // screen = title | select | board | sprint | panic | aim | gopher | scoreboard | podium
  const [screen, setScreen] = useState$(() => {
    const s = localStorage.getItem('barnyard-screen') || 'title';
    // if restoring into an in-game screen but players haven't been built yet, reset
    const inGame = ['select','board','sprint','panic','aim','gopher','egg','mud','tug','fish','scoreboard','podium'].includes(s);
    return inGame ? 'title' : s;
  });
  useEffect$(() => { localStorage.setItem('barnyard-screen', screen); }, [screen]);

  // Broadcast screen transitions to connected phone controllers so
  // they can switch between lobby view and per-minigame input view.
  useEffect$(() => { mp.broadcastScreen(screen); }, [screen, mp.broadcastScreen]);

  const [gameState, setGameState] = useState$(() => ({
    round: 1,
    totalRounds: tweaks.totalRounds,
    scores: Array(tweaks.playerCount).fill(0),
    players: [],
    coins: 1240,
    modifier: null,
    difficulty: tweaks.difficulty,
    lastEarned: Array(tweaks.playerCount).fill(0),
    lastMinigame: null,
  }));

  const startGame = () => {
    // Phase mp/Stage 2 — build players from phone controllers when
    // any are connected; fall back to the single-player-vs-CPU flow
    // so dev on the desktop still works even when no phone joined.
    const connected = (mp.remotePlayers || []).filter(p => p.character);
    let players;
    if (connected.length > 0) {
      const used = new Set();
      players = connected.map(p => {
        const char = CHARACTERS.find(c => c.id === p.character) || CHARACTERS[0];
        used.add(char.id);
        return { char, isCPU: false, remoteId: p.id, displayName: p.name || char.name };
      });
      // Optionally pad to minimum 2 players with CPUs for solo testing.
      const pool = CHARACTERS.filter(c => !used.has(c.id)).sort(() => Math.random() - .5);
      while (players.length < 2 && pool.length > 0) {
        players.push({ char: pool.shift(), isCPU: true });
      }
    } else {
      const you = CHARACTERS.find(c => c.id === tweaks.youChar) || CHARACTERS[0];
      const pool = CHARACTERS.filter(c => c.id !== you.id).sort(()=>Math.random()-.5);
      players = [{ char: you, isCPU: false }];
      for (let i = 1; i < tweaks.playerCount; i++) players.push({ char: pool[i-1], isCPU: true });
    }
    const playerCount = players.length;
    setGameState(s => ({
      ...s,
      round: 1,
      totalRounds: tweaks.totalRounds,
      scores: Array(playerCount).fill(0),
      players,
      modifier: tweaks.twists ? pick(TWISTS) : null,
      difficulty: tweaks.difficulty,
      lastEarned: Array(playerCount).fill(0),
    }));
    setScreen('select');
  };

  const confirmCharacters = () => setScreen('board');

  const startMinigame = (id) => {
    if (id === 'tap') setScreen('sprint');
    else if (id === 'hay') setScreen('panic');
    else if (id === 'aim') setScreen('aim');
    else if (id === 'gopher') setScreen('gopher');
    else if (id === 'egg') setScreen('egg');
    else if (id === 'mud') setScreen('mud');
    else if (id === 'tug') setScreen('tug');
    else if (id === 'fish') setScreen('fish');
  };

  const finishMinigame = (earned, name) => {
    setGameState(s => ({ ...s, lastEarned: earned, lastMinigame: name }));
    setScreen('scoreboard');
  };

  const continueFromScoreboard = () => {
    setGameState(s => {
      const newScores = s.scores.map((v, i) => v + (s.lastEarned[i] || 0));
      const topEarn = Math.max(...(s.lastEarned||[0]));
      const youEarned = s.lastEarned[0] || 0;
      const coins = s.coins + youEarned * 10;
      if (s.round >= s.totalRounds) {
        return { ...s, scores: newScores, coins };
      }
      return {
        ...s,
        round: s.round + 1,
        scores: newScores,
        coins,
        modifier: tweaks.twists ? pick(TWISTS) : null
      };
    });
    setTimeout(() => {
      setGameState(curr => {
        if (curr.round > curr.totalRounds || (curr.round === curr.totalRounds && curr.lastEarned.some(v=>v>0) === false)) return curr;
        return curr;
      });
      setScreen(gameState.round >= gameState.totalRounds ? 'podium' : 'board');
    }, 0);
  };

  // --- EDIT MODE (Tweaks host toggle) ---
  useEffect$(() => {
    const onMsg = (e) => {
      const t = e.data && e.data.type;
      if (t === '__activate_edit_mode') setTweaksOpen(true);
      else if (t === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch(e){}
    setEditAvailable(true);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const updateTweaks = (next) => {
    setTweaks(next);
    try {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: next }, '*');
    } catch(e){}
  };

  // --- Stage scaling ---
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

  // Palette tinting
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

  const goTitle = () => setScreen('title');

  return (
    <>
      <div className="stage-wrap">
        <div className="stage" ref={stageRef} data-screen-label={labelFor(screen)}>
          {screen === 'title' && (
            <>
              <TitleScreen
                onPlay={startGame}
                onCustomize={()=>{ startGame(); }}
                onSettings={()=>setTweaksOpen(true)}
              />
              {window.__BarnBashMP && window.__BarnBashMP.MultiplayerHUD && (
                <window.__BarnBashMP.MultiplayerHUD mp={mp} corner="top-left" />
              )}
            </>
          )}
          {screen === 'select' && (
            <CharacterSelect
              onBack={goTitle}
              onStart={confirmCharacters}
              playerCount={tweaks.playerCount}
              remotePlayers={gameState.players}
            />
          )}
          {screen === 'board' && (
            <BoardScreen
              state={gameState}
              onPick={startMinigame}
              onTweaks={()=>setTweaksOpen(true)}
            />
          )}
          {screen === 'sprint' && (
            <PigSprint
              state={gameState}
              onFinish={(earned)=>finishMinigame(earned, 'Pig Sprint')}
              onQuit={()=>setScreen('board')}
            />
          )}
          {screen === 'panic' && (
            <HayPanic
              state={gameState}
              onFinish={(earned)=>finishMinigame(earned, 'Hay Panic')}
              onQuit={()=>setScreen('board')}
            />
          )}
          {screen === 'aim' && gameState.players.length > 0 && (
            <AppleAim
              state={gameState}
              onFinish={(earned)=>finishMinigame(earned, 'Apple Aim')}
              onQuit={()=>setScreen('board')}
            />
          )}
          {screen === 'gopher' && gameState.players.length > 0 && (
            <WhackAGopher
              state={gameState}
              onFinish={(earned)=>finishMinigame(earned, 'Whack-a-Gopher')}
              onQuit={()=>setScreen('board')}
            />
          )}
          {screen === 'egg' && gameState.players.length > 0 && (
            <EggPass
              state={gameState}
              onFinish={(earned)=>finishMinigame(earned, 'Egg Pass')}
              onQuit={()=>setScreen('board')}
            />
          )}
          {screen === 'mud' && gameState.players.length > 0 && (
            <MudDash
              state={gameState}
              onFinish={(earned)=>finishMinigame(earned, 'Mud Dash')}
              onQuit={()=>setScreen('board')}
            />
          )}
          {screen === 'tug' && gameState.players.length > 0 && (
            <TugOWar
              state={gameState}
              onFinish={(earned)=>finishMinigame(earned, 'Tug-o-War')}
              onQuit={()=>setScreen('board')}
            />
          )}
          {screen === 'fish' && gameState.players.length > 0 && (
            <FishingFrenzy
              state={gameState}
              onFinish={(earned)=>finishMinigame(earned, 'Fishing Frenzy')}
              onQuit={()=>setScreen('board')}
            />
          )}
          {screen === 'scoreboard' && (
            <Scoreboard
              players={gameState.players}
              scores={gameState.scores}
              earned={gameState.lastEarned}
              minigameName={gameState.lastMinigame || 'Mini-game'}
              round={gameState.round}
              totalRounds={gameState.totalRounds}
              onContinue={continueFromScoreboard}
            />
          )}
          {screen === 'podium' && (
            <Podium
              players={gameState.players}
              scores={gameState.scores}
              onPlayAgain={startGame}
              onQuit={goTitle}
            />
          )}
        </div>
      </div>

      <TweaksPanel tweaks={tweaks} setTweaks={updateTweaks} open={tweaksOpen} setOpen={setTweaksOpen}/>
    </>
  );
}

function labelFor(screen){
  return ({
    title:'01 Title', select:'02 Character Select', board:'03 Minigame Board',
    sprint:'04 Pig Sprint', panic:'05 Hay Panic', aim:'06 Apple Aim', gopher:'07 Whack-a-Gopher', scoreboard:'08 Scoreboard', podium:'09 Podium'
  })[screen] || screen;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
