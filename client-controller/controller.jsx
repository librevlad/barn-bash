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

function vibrate(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {}
}

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
  const [score, setScore] = useState(null); // { mine, leader, label }
  const wsRef = useRef(null);
  // Latest join payload so we can re-send on reconnect without stale closures.
  const joinedRef = useRef(null);
  // playerId mirrored into a ref so WS listeners can read it without
  // re-subscribing on every state change.
  const playerIdRef = useRef(null);
  // Last score sent to the phone so we can trigger a short vibration the
  // instant the player's own score advances.
  const prevMineRef = useRef(null);
  const [swapOpen, setSwapOpen] = useState(false);

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
        if (msg.type === 'hello' && msg.role === 'controller') { setPlayerId(msg.playerId); playerIdRef.current = msg.playerId; }
        else if (msg.type === 'playerList') setPlayers(msg.players || []);
        else if (msg.type === 'screen') setHostScreen(msg.screen || 'title');
        else if (msg.type === 'minigameStart') { setMinigame({ id: msg.id, prompt: msg.prompt, contract: msg.contract }); setScore(null); prevMineRef.current = null; vibrate([60, 40, 60]); }
        else if (msg.type === 'minigameEnd') { setMinigame(null); setScore(null); prevMineRef.current = null; vibrate(140); }
        else if (msg.type === 'scoreUpdate') {
          const myId = playerIdRef.current;
          const byId = msg.byId || {};
          const mine = myId != null ? (byId[myId] ?? 0) : 0;
          const prev = prevMineRef.current;
          if (prev != null && mine > prev) vibrate(40);
          prevMineRef.current = mine;
          setScore({ mine, leader: msg.leader ?? 0, label: msg.label || null });
        }
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
        <div className="pill pill-id">P{players.findIndex(p => p.id === playerId) + 1 || '?'}</div>
        <div className="pill pill-name">{name} <span className="pill-sub">· {CRITTERS.find(c=>c.id===critter)?.name || '—'}</span></div>
        <div className="pill pill-swap" onPointerDown={(e)=>{e.preventDefault(); setSwapOpen(true);}}>↻</div>
      </div>
      {swapOpen && (
        <CritterSwap
          current={critter}
          takenBy={new Set(players.filter(p => p.id !== playerId && p.character).map(p => p.character))}
          onPick={(c) => {
            setCritter(c.id);
            localStorage.setItem('barn-bash-critter', c.id);
            const n = (name || '').trim() || 'Player';
            joinedRef.current = { name: n, character: c.id, color: c.color };
            send({ type: 'join', name: n, character: c.id, color: c.color });
            setSwapOpen(false);
          }}
          onClose={() => setSwapOpen(false)}
        />
      )}
      {minigame
        ? <MinigameInput game={minigame} send={send} score={score}/>
        : hostScreen === 'board'
          ? <BoardVoteScreen send={send}/>
          : <LobbyScreen hostScreen={hostScreen} players={players}/>}
      <ReactionBar send={send}/>
    </div>
  );
}

function CritterSwap({ current, takenBy, onPick, onClose }) {
  return (
    <div onPointerDown={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div onPointerDown={(e)=>e.stopPropagation()} style={{
        background:'#fff', border:'4px solid var(--ink)', borderRadius:20,
        boxShadow:'0 8px 0 var(--ink)', padding:16, width:'85%', maxWidth:340
      }}>
        <div style={{fontFamily:"'Luckiest Guy'", fontSize:20, textAlign:'center', marginBottom:10}}>swap critter</div>
        <div className="critter-grid">
          {CRITTERS.map(c => {
            const taken = c.id !== current && takenBy.has(c.id);
            return (
              <div key={c.id}
                   className={`critter ${c.id === current ? 'on' : ''} ${taken ? 'taken' : ''}`}
                   style={{background: c.id === current ? 'var(--yellow)' : (c.color + '55')}}
                   onPointerDown={(e)=>{e.preventDefault(); !taken && onPick(c);}}>
                {c.name}
              </div>
            );
          })}
        </div>
        <button className="btn" style={{marginTop:12}} onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}

const REACTIONS = ['🎉', '😂', '😤', '👏'];
function ReactionBar({ send }) {
  const [hit, setHit] = useState(null);
  const fire = (e) => {
    send({ type: 'input', kind: 'reaction', data: { emoji: e } });
    vibrate(20);
    setHit(e);
    setTimeout(() => setHit(h => h === e ? null : h), 180);
  };
  return (
    <div className="react-bar">
      {REACTIONS.map(e => (
        <div key={e}
             className={`react-btn ${hit === e ? 'hit' : ''}`}
             onPointerDown={(ev)=>{ev.preventDefault(); fire(e);}}>
          {e}
        </div>
      ))}
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
  // Phone sees these screens solo, so the copy talks to the single player
  // holding this device, not the whole room.
  const label = ({
    title:      "you're in! waiting for host to press play",
    select:     "you're locked in — waiting for the others",
    scoreboard: 'round over — check the big screen',
    podium:     'champion crowned!',
  })[hostScreen] || 'get ready…';
  return (
    <div className="card pulse" style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}>
      <div style={{fontFamily:"'Luckiest Guy'",fontSize:28,color:'var(--ink)',textAlign:'center',lineHeight:1.15}}>{label}</div>
      <div style={{fontSize:14,fontWeight:600,color:'var(--wood-dk)',textAlign:'center'}}>
        {players.length} player{players.length === 1 ? '' : 's'} in the room
      </div>
    </div>
  );
}

function MinigameInput({ game, send, score }) {
  const contract = game.contract || 'tap';
  const body = contract === 'tap'   ? <TapContract   prompt={game.prompt} send={send}/>
            : contract === 'steer' ? <SteerContract prompt={game.prompt} send={send}/>
            : contract === 'holes' ? <HolesContract prompt={game.prompt} send={send}/>
            : <LobbyScreen hostScreen="playing" players={[]}/>;
  return (
    <>
      {score && <ScoreStrip score={score}/>}
      {body}
    </>
  );
}

function ScoreStrip({ score }) {
  const leading = score.leader > 0 && score.mine >= score.leader;
  const unit = score.label ? ` ${score.label}` : '';
  return (
    <div style={{
      display:'flex', gap:8, justifyContent:'center', marginTop:4, marginBottom:2
    }}>
      <div style={{
        background: leading ? 'var(--yellow)' : '#fff',
        border:'3px solid var(--ink)', borderRadius:999, padding:'4px 12px',
        fontFamily:"'Luckiest Guy',cursive", fontSize:14, letterSpacing:.5,
        boxShadow:'0 3px 0 var(--ink)'
      }}>
        YOU: {score.mine}{unit}
      </div>
      <div style={{
        background:'#fff', border:'3px solid var(--ink)', borderRadius:999, padding:'4px 12px',
        fontFamily:"'Luckiest Guy',cursive", fontSize:14, letterSpacing:.5,
        boxShadow:'0 3px 0 var(--ink)', opacity:.75
      }}>
        LEAD: {score.leader}{unit}
      </div>
    </div>
  );
}

function TapContract({ prompt, send }) {
  const [hit, setHit] = useState(false);
  const tap = () => {
    send({ type: 'input', kind: 'tap', data: { t: Date.now() } });
    vibrate(15);
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
    vibrate(10);
  };
  const release = (dir) => {
    setActive(a => ({ ...a, [dir]: false }));
    send({ type: 'input', kind: 'steer', data: { dir, down: false } });
  };
  const jump = () => { send({ type: 'input', kind: 'steer', data: { dir: 'jump', down: true } }); vibrate(25); };
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
    vibrate(18);
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
