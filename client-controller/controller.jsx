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
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem('barn-bash-name') || '');
  const [critter, setCritter] = useState(() => localStorage.getItem('barn-bash-critter') || '');
  // Host drives which screen is active. Defaults so a fresh phone that
  // connects before the host broadcasts anything still sees a sane state.
  const [hostScreen, setHostScreen] = useState('title');
  const [minigame, setMinigame] = useState(null); // { id, prompt, contract }
  const wsRef = useRef(null);

  useStatusbar(connected);

  useEffect(() => {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const clientId = getOrMakeClientId();
    const ws = new WebSocket(`${proto}//${location.host}/?role=controller&clientId=${clientId || ''}`);
    wsRef.current = ws;
    ws.addEventListener('open', () => setConnected(true));
    ws.addEventListener('close', () => { setConnected(false); setPlayerId(null); });
    ws.addEventListener('message', (e) => {
      let msg; try { msg = JSON.parse(e.data); } catch (_) { return; }
      if (msg.type === 'hello' && msg.role === 'controller') setPlayerId(msg.playerId);
      else if (msg.type === 'playerList') setPlayers(msg.players || []);
      else if (msg.type === 'screen') setHostScreen(msg.screen || 'title');
      else if (msg.type === 'minigameStart') setMinigame({ id: msg.id, prompt: msg.prompt, contract: msg.contract });
      else if (msg.type === 'minigameEnd') setMinigame(null);
    });
    return () => { try { ws.close(); } catch (_) {} };
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
      {minigame ? <MinigameInput game={minigame} send={send}/> : <LobbyScreen hostScreen={hostScreen} players={players}/>}
    </div>
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
  // Contract-driven input screen. The host sends `contract` describing
  // what input it wants: 'tap' (mash a big button), 'hold' (press and
  // hold), 'swipe', 'aim' (touch-drag crosshair), etc. MVP: `tap`.
  const contract = game.contract || 'tap';
  if (contract === 'tap') return <TapContract prompt={game.prompt} send={send}/>;
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

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
