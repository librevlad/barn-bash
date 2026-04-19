// Barn Bash phone controller — minimal React app.
// Flow: connect → join (name + critter) → wait in lobby → per-minigame
// input screen driven by host broadcasts.

const { useState, useEffect, useRef } = React;

// Must match src/characters.jsx CHARACTERS ids on the host.
const CRITTERS = [
  { id: 'pig',     name: 'Pinky',     color: '#f4a8c0' },
  { id: 'fox',     name: 'Ember',     color: '#f08a3a' },
  { id: 'bear',    name: 'Biggs',     color: '#a0723f' },
  { id: 'rabbit',  name: 'Hopper',    color: '#e8dcc0' },
  { id: 'chicken', name: 'Clucks',    color: '#fff8ea' },
  { id: 'badger',  name: 'Bramble',   color: '#c7c2b5' },
  { id: 'cat',     name: 'Marmalade', color: '#e8b866' },
  { id: 'owl',     name: 'Professor', color: '#9b7653' },
  { id: 'sheep',   name: 'Woolly',    color: '#fff8ea' },
  { id: 'frog',    name: 'Ribbit',    color: '#6cc24a' },
];

// Must mirror MINIGAMES in src/screens.jsx so phone vote tiles line up.
const BOARD_TILES = [
  { id:'tap',    name:'Pig Sprint',      icon:'🏁', tint:'#ffc93c' },
  { id:'hay',    name:'Hay Panic',       icon:'🌾', tint:'#8acb4a' },
  { id:'egg',    name:'Egg Pass',        icon:'🥚', tint:'#fff5e4' },
  { id:'aim',    name:'Apple Aim',       icon:'🎯', tint:'#e04b3b' },
  { id:'mud',    name:'Mud Dash',        icon:'💧', tint:'#4aa3e0' },
  { id:'gopher', name:'Whack-a-Gopher',  icon:'🔨', tint:'#a36bd1' },
  { id:'tug',    name:'Tug-o-War',       icon:'🪢', tint:'#c18040' },
  { id:'fish',   name:'Fishing Frenzy',  icon:'🎣', tint:'#4aa3e0' },
];

const CLIENT_ID_KEY = 'barn-bash-controller-clientId';
function getOrMakeClientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch (_) { return null; }
}

function useStatusbar(connected) {
  useEffect(() => {
    const bar = document.getElementById('statusbar');
    const txt = document.getElementById('status-text');
    if (bar) bar.classList.toggle('connected', !!connected);
    if (txt) txt.textContent = connected ? 'connected' : 'connecting…';
  }, [connected]);
}

function App() {
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [joined, setJoined] = useState(() => localStorage.getItem('barn-bash-joined') === '1');
  const [name, setName] = useState(() => localStorage.getItem('barn-bash-name') || '');
  const [critter, setCritter] = useState(() => localStorage.getItem('barn-bash-critter') || '');
  const [hostScreen, setHostScreen] = useState('title');
  const [minigame, setMinigame] = useState(null);
  const wsRef = useRef(null);
  // Latest join payload so we can re-send on reconnect without stale closures.
  const joinedRef = useRef(null);

  useStatusbar(connected);

  useEffect(() => {
    let ws;
    let closed = false;
    let backoff = 500;
    const connect = () => {
      if (closed) return;
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const clientId = getOrMakeClientId();
      ws = new WebSocket(`${proto}//${location.host}/?role=controller&clientId=${clientId || ''}`);
      wsRef.current = ws;
      ws.addEventListener('open', () => {
        setConnected(true);
        backoff = 500;
        // auto-rejoin if we previously joined — survives host reload too
        const j = joinedRef.current;
        if (j && j.name && j.character) {
          try { ws.send(JSON.stringify({ type: 'join', ...j })); } catch (_) {}
        }
      });
      ws.addEventListener('close', () => {
        setConnected(false); setPlayerId(null);
        if (!closed) {
          const d = Math.min(5000, backoff);
          backoff = Math.min(5000, backoff * 1.7);
          setTimeout(connect, d);
        }
      });
      ws.addEventListener('message', (e) => {
        let msg; try { msg = JSON.parse(e.data); } catch (_) { return; }
        if (msg.type === 'hello' && msg.role === 'controller') setPlayerId(msg.playerId);
        else if (msg.type === 'playerList') setPlayers(msg.players || []);
        else if (msg.type === 'screen') setHostScreen(msg.screen || 'title');
        else if (msg.type === 'minigameStart') setMinigame({ id: msg.id, prompt: msg.prompt, contract: msg.contract });
        else if (msg.type === 'minigameEnd') setMinigame(null);
      });
    };
    // seed join payload from localStorage so the first `open` can re-join
    const lsName = localStorage.getItem('barn-bash-name');
    const lsCritter = localStorage.getItem('barn-bash-critter');
    if (localStorage.getItem('barn-bash-joined') === '1' && lsName && lsCritter) {
      const pick = CRITTERS.find(c => c.id === lsCritter) || CRITTERS[0];
      joinedRef.current = { name: lsName, character: pick.id, color: pick.color };
    }
    connect();
    return () => { closed = true; try { ws && ws.close(); } catch (_) {} };
  }, []);

  const send = (obj) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1) return;
    try { ws.send(JSON.stringify(obj)); } catch (_) {}
  };

  const takenCritterIds = new Set(
    players.filter(p => p.id !== playerId && p.character).map(p => p.character)
  );

  const doJoin = () => {
    const n = (name || '').trim();
    if (!n || !critter) return;
    const pick = CRITTERS.find(c => c.id === critter) || CRITTERS[0];
    localStorage.setItem('barn-bash-name', n);
    localStorage.setItem('barn-bash-critter', pick.id);
    localStorage.setItem('barn-bash-joined', '1');
    joinedRef.current = { name: n, character: pick.id, color: pick.color };
    send({ type: 'join', name: n, character: pick.id, color: pick.color });
    setJoined(true);
  };

  if (!joined) {
    return (
      <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
        <div className="title">BARN BASH</div>
        <div className="subtitle">join the party</div>
        <div className="card">
          <div className="field">
            <label htmlFor="name">your name</label>
            <input id="name" value={name} onChange={(e)=>setName(e.target.value.slice(0,20))} placeholder="hopper"/>
          </div>
          <div className="field">
            <label>pick a critter</label>
            <div className="critter-grid">
              {CRITTERS.map(c => (
                <div key={c.id}
                     className={`critter ${critter === c.id ? 'on' : ''} ${takenCritterIds.has(c.id) ? 'taken' : ''}`}
                     style={{background: critter === c.id ? 'var(--yellow)' : (c.color + '55')}}
                     onClick={() => !takenCritterIds.has(c.id) && setCritter(c.id)}>
                  {c.name}
                </div>
              ))}
            </div>
          </div>
          <button className="btn green" disabled={!name.trim() || !critter} onClick={doJoin}>JOIN</button>
        </div>
      </div>
    );
  }

  // Joined: show a per-screen view. Minigame broadcasts override the
  // screen hint with a specific input contract.
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div className="player-strip">
        <div className="pill">P{players.findIndex(p => p.id === playerId) + 1 || '?'}</div>
        <div className="pill">{name}</div>
        <div className="pill">{CRITTERS.find(c=>c.id===critter)?.name || '—'}</div>
      </div>
      {minigame
        ? <MinigameInput game={minigame} send={send}/>
        : hostScreen === 'board'
          ? <BoardVoteScreen send={send}/>
          : <LobbyScreen hostScreen={hostScreen} players={players}/>}
    </div>
  );
}

function BoardVoteScreen({ send }) {
  const [voted, setVoted] = useState(null);
  const vote = (id) => {
    setVoted(id);
    send({ type: 'input', kind: 'boardVote', data: { id } });
  };
  return (
    <>
      <div className="screen-hint">
        {voted ? `voted for ${BOARD_TILES.find(t=>t.id===voted)?.name}` : 'tap a mini-game!'}
      </div>
      <div style={{flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10, overflowY:'auto', paddingRight:4}}>
        {BOARD_TILES.map(t => (
          <div key={t.id}
               onPointerDown={(e)=>{e.preventDefault(); vote(t.id);}}
               style={{
                 background: voted === t.id ? 'var(--yellow)' : t.tint,
                 border:'4px solid var(--ink)', borderRadius:16,
                 boxShadow: voted === t.id ? '0 3px 0 var(--ink)' : '0 6px 0 var(--ink)',
                 transform: voted === t.id ? 'translateY(3px)' : 'none',
                 padding:10, display:'flex', flexDirection:'column', alignItems:'center',
                 justifyContent:'center', cursor:'pointer', minHeight:80,
               }}>
            <div style={{fontSize:32}}>{t.icon}</div>
            <div style={{fontFamily:"'Luckiest Guy'",fontSize:14,color:'var(--ink)',textAlign:'center',marginTop:4,lineHeight:1.1}}>
              {t.name.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function LobbyScreen({ hostScreen, players }) {
  const label = ({
    title: 'waiting for host to press PLAY',
    select: 'everyone join the roster',
    board: 'pick a minigame!',
    scoreboard: 'round over — see the board',
    podium: 'champion crowned 👑',
  })[hostScreen] || 'get ready…';
  return (
    <div className="card pulse" style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}>
      <div style={{fontFamily:"'Luckiest Guy'",fontSize:32,color:'var(--ink)',textAlign:'center',lineHeight:1.1}}>{label}</div>
      <div style={{fontSize:14,fontWeight:600,color:'var(--wood-dk)',textAlign:'center'}}>
        {players.length} player{players.length === 1 ? '' : 's'} connected
      </div>
    </div>
  );
}

function MinigameInput({ game, send }) {
  // Contract-driven input screen. Host broadcasts `contract`:
  //   'tap'   — mash a big button (Sprint, Tug, Egg, Apple, Fishing)
  //   'steer' — left/jump/right 3-button pad (Hay Panic, Mud Dash)
  //   'holes' — 6-hole grid (Whack-a-Gopher)
  const contract = game.contract || 'tap';
  if (contract === 'tap')   return <TapContract   prompt={game.prompt} send={send}/>;
  if (contract === 'steer') return <SteerContract prompt={game.prompt} send={send}/>;
  if (contract === 'holes') return <HolesContract prompt={game.prompt} send={send}/>;
  return <LobbyScreen hostScreen="playing" players={[]}/>;
}

function TapContract({ prompt, send }) {
  const [hit, setHit] = useState(false);
  const tap = () => {
    send({ type: 'input', kind: 'tap', data: { t: Date.now() } });
    setHit(true);
    setTimeout(() => setHit(false), 60);
  };
  return (
    <>
      <div className="screen-hint">{prompt || 'TAP AS FAST AS YOU CAN!'}</div>
      <div className={`tap-pad ${hit ? 'hit' : ''}`} onPointerDown={tap} onTouchStart={(e)=>{e.preventDefault(); tap();}}>
        TAP
      </div>
    </>
  );
}

// Three-button ◀ JUMP ▶ pad. Left/right are hold-to-steer (dir events on
// press/release). JUMP is a discrete tap.
function SteerContract({ prompt, send }) {
  const [active, setActive] = useState({ left:false, right:false });
  const press = (dir) => {
    setActive(a => ({ ...a, [dir]: true }));
    send({ type: 'input', kind: 'steer', data: { dir, down: true } });
  };
  const release = (dir) => {
    setActive(a => ({ ...a, [dir]: false }));
    send({ type: 'input', kind: 'steer', data: { dir, down: false } });
  };
  const jump = () => { send({ type: 'input', kind: 'steer', data: { dir: 'jump', down: true } }); };
  const bindHold = (dir) => ({
    onPointerDown: (e) => { e.preventDefault(); press(dir); },
    onPointerUp:   (e) => { e.preventDefault(); release(dir); },
    onPointerCancel: () => release(dir),
    onPointerLeave:  () => release(dir),
  });
  return (
    <>
      <div className="screen-hint">{prompt || 'STEER!'}</div>
      <div className="steer-pad">
        <div className={`steer-btn ${active.left ? 'on' : ''}`} {...bindHold('left')}>◀</div>
        <div className="steer-btn jump" onPointerDown={(e)=>{e.preventDefault(); jump();}}>▲</div>
        <div className={`steer-btn ${active.right ? 'on' : ''}`} {...bindHold('right')}>▶</div>
      </div>
    </>
  );
}

// 3×2 grid of numbered holes. Each press sends { kind:'holes', data:{ h:0..5 } }.
function HolesContract({ prompt, send }) {
  const [hit, setHit] = useState(-1);
  const whack = (h) => {
    send({ type: 'input', kind: 'holes', data: { h } });
    setHit(h);
    setTimeout(() => setHit(p => p === h ? -1 : p), 120);
  };
  return (
    <>
      <div className="screen-hint">{prompt || 'BOP THE GOPHER!'}</div>
      <div className="holes-pad">
        {[0,1,2,3,4,5].map(h => (
          <div key={h}
               className={`hole-btn ${hit === h ? 'hit' : ''}`}
               onPointerDown={(e)=>{e.preventDefault(); whack(h);}}>
            {h+1}
          </div>
        ))}
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
