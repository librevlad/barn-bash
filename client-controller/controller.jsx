// Barn Bash phone controller — minimal React app.
// Flow: connect → join (name + critter) → wait in lobby → per-minigame
// input screen driven by host broadcasts.

const { useState, useEffect, useRef } = React;

// Must match src/characters.jsx CHARACTERS ids on the host. The phone
// controller has no access to the host's SVG art, so we carry an emoji
// per critter for the join-carousel and the mid-game swap sheet.
const CRITTERS = [
  { id: 'pig',     name: 'Pinky',     color: '#f4a8c0', emoji: '🐷' },
  { id: 'fox',     name: 'Ember',     color: '#f08a3a', emoji: '🦊' },
  { id: 'bear',    name: 'Biggs',     color: '#a0723f', emoji: '🐻' },
  { id: 'rabbit',  name: 'Hopper',    color: '#e8dcc0', emoji: '🐰' },
  { id: 'chicken', name: 'Clucks',    color: '#fff8ea', emoji: '🐔' },
  { id: 'badger',  name: 'Bramble',   color: '#c7c2b5', emoji: '🦡' },
  { id: 'cat',     name: 'Marmalade', color: '#e8b866', emoji: '🐱' },
  { id: 'owl',     name: 'Professor', color: '#9b7653', emoji: '🦉' },
  { id: 'sheep',   name: 'Woolly',    color: '#fff8ea', emoji: '🐑' },
  { id: 'frog',    name: 'Ribbit',    color: '#6cc24a', emoji: '🐸' },
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
  const [turn, setTurn] = useState(null);   // { activeId, activeName, phase }
  const [summary, setSummary] = useState(null); // { minigame, rank, earned, total }
  const [finale, setFinale] = useState(null);   // { rank, total }
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
        else if (msg.type === 'screen') {
          const s = msg.screen || 'title';
          setHostScreen(s);
          // A new game is starting — drop the finale splash so the player
          // sees the lobby / vote UI instead of yesterday's crown.
          if (s === 'title' || s === 'select') setFinale(null);
        }
        else if (msg.type === 'minigameStart') { setMinigame({ id: msg.id, prompt: msg.prompt, contract: msg.contract }); setScore(null); setTurn(null); setSummary(null); setFinale(null); prevMineRef.current = null; vibrate([60, 40, 60]); }
        else if (msg.type === 'minigameEnd') { setMinigame(null); setScore(null); setTurn(null); prevMineRef.current = null; vibrate(140); }
        else if (msg.type === 'roundEnd') {
          const me = msg.byId && playerIdRef.current != null ? msg.byId[playerIdRef.current] : null;
          if (me) {
            setSummary({ minigame: msg.minigame, rank: me.rank, earned: me.earned, total: me.total });
            // Buzz based on placing: winner double, podium single, also-ran tap.
            if (me.rank === 1) vibrate([80, 40, 80, 40, 120]);
            else if (me.rank <= 3) vibrate([60, 40, 60]);
            else vibrate(30);
          }
        }
        else if (msg.type === 'gameOver') {
          const me = msg.byId && playerIdRef.current != null ? msg.byId[playerIdRef.current] : null;
          if (me) {
            setFinale({ rank: me.rank, total: me.total });
            // Big celebration buzz scaled to placing
            if (me.rank === 1) vibrate([120, 60, 120, 60, 200]);
            else if (me.rank <= 3) vibrate([80, 40, 80]);
            else vibrate([40, 40, 40]);
          }
          setSummary(null);
        }
        else if (msg.type === 'turnUpdate') {
          setTurn({ activeId: msg.activeId ?? null, activeName: msg.activeName || null, phase: msg.phase || null });
          if (msg.activeId != null && msg.activeId === playerIdRef.current) vibrate([30, 30, 60]);
        }
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

  // Auto-pick the first free critter while the JOIN screen is up so the
  // carousel always shows a valid, unclaimed creature. If someone else
  // grabs our pick mid-decision, hop to the next free one.
  useEffect(() => {
    if (joined) return;
    if (critter && !takenCritterIds.has(critter)) return;
    const firstFree = CRITTERS.find(c => !takenCritterIds.has(c.id));
    if (firstFree) setCritter(firstFree.id);
  }, [joined, critter, players, playerId]);

  const cycleCritter = (dir) => {
    const cur = CRITTERS.findIndex(c => c.id === critter);
    const start = cur >= 0 ? cur : 0;
    for (let off = 1; off <= CRITTERS.length; off++) {
      const cand = CRITTERS[(start + off * dir + CRITTERS.length * 2) % CRITTERS.length];
      if (!takenCritterIds.has(cand.id) || cand.id === critter) {
        setCritter(cand.id);
        break;
      }
    }
  };

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
    const shown = CRITTERS.find(c => c.id === critter) || CRITTERS[0];
    return (
      <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
        <div className="title">BARN BASH</div>
        <div className="subtitle">join the party</div>
        <div className="card">
          <div className="field">
            <label htmlFor="name">your name</label>
            <input id="name" value={name} onChange={(e)=>setName(e.target.value.slice(0,20))} placeholder="e.g. Alex"/>
          </div>
          <div className="field">
            <label>pick a critter</label>
            <div className="critter-carousel">
              <button className="carousel-arrow"
                      onPointerDown={(e)=>{e.preventDefault(); cycleCritter(-1);}}
                      aria-label="previous critter">◀</button>
              <div className="carousel-card" style={{background: shown.color + '55'}}>
                <div className="carousel-emoji">{shown.emoji}</div>
                <div className="carousel-name">{shown.name.toUpperCase()}</div>
              </div>
              <button className="carousel-arrow"
                      onPointerDown={(e)=>{e.preventDefault(); cycleCritter(1);}}
                      aria-label="next critter">▶</button>
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
      {finale
        ? <FinaleScreen finale={finale} send={send}/>
        : minigame
          ? <MinigameInput game={minigame} send={send} score={score} turn={turn} myId={playerId}/>
          : summary
            ? <RoundSummary summary={summary} send={send}/>
            : hostScreen === 'board'
              ? <BoardVoteScreen send={send}/>
              : <LobbyScreen hostScreen={hostScreen} players={players} send={send}/>}
      <ReactionBar send={send}/>
    </div>
  );
}

const RANK_TAGS = { 1: { label:'#1 · WINNER!', color:'var(--yellow)', emoji:'🏆' },
                    2: { label:'#2',           color:'#c0c0c0',       emoji:'🥈' },
                    3: { label:'#3',           color:'#cd7f32',       emoji:'🥉' } };
const FINALE_TAGS = {
  1: { title:'CHAMPION!',  color:'var(--yellow)', emoji:'👑', sub:'The whole barn is cheering.' },
  2: { title:'SILVER',     color:'#d4d4d4',       emoji:'🥈', sub:'So close. One more round next time.' },
  3: { title:'BRONZE',     color:'#cd7f32',       emoji:'🥉', sub:'Podium finish. Not bad.' },
};
function FinaleScreen({ finale, send }) {
  const tag = FINALE_TAGS[finale.rank] || {
    title:`#${finale.rank}`, color:'#888', emoji:'🎯',
    sub:'Rematch? There\'s always a rematch.'
  };
  const [ready, setReady] = useState(false);
  const onReady = () => {
    if (ready) return;
    setReady(true);
    vibrate(25);
    send({ type: 'input', kind: 'ready' });
  };
  return (
    <div className="card pulse" style={{
      flex:1, display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', gap:14, textAlign:'center',
      background:`radial-gradient(circle at 50% 30%, ${tag.color} 0%, #fff 70%)`
    }}>
      <div style={{fontSize:14, fontWeight:700, letterSpacing:2, color:'var(--wood-dk)'}}>GAME OVER</div>
      <div style={{fontSize:96, lineHeight:1}}>{tag.emoji}</div>
      <div style={{
        background:tag.color, color:'var(--ink)', border:'5px solid var(--ink)',
        borderRadius:18, padding:'10px 28px', boxShadow:'0 6px 0 var(--ink)',
        fontFamily:"'Luckiest Guy',cursive", fontSize:34, letterSpacing:2,
        WebkitTextStroke:'1px var(--ink)'
      }}>{tag.title}</div>
      <div style={{
        background:'var(--yellow)', border:'4px solid var(--ink)', borderRadius:14,
        padding:'8px 20px', boxShadow:'0 5px 0 var(--ink)',
        fontFamily:"'Luckiest Guy',cursive", fontSize:26
      }}>{finale.total} coins total</div>
      <div style={{fontSize:13, fontWeight:600, color:'var(--wood-dk)', maxWidth:240, lineHeight:1.3}}>
        {tag.sub}
      </div>
      <button className={`btn ${ready ? 'green' : ''}`}
              disabled={ready}
              onClick={onReady}
              style={{marginTop:4, maxWidth:280}}>
        {ready ? '✓ READY' : 'TAP FOR REMATCH'}
      </button>
    </div>
  );
}

function RoundSummary({ summary, send }) {
  const tag = RANK_TAGS[summary.rank] || { label:`#${summary.rank}`, color:'#888', emoji:'🎯' };
  const gotCoins = summary.earned > 0;
  const [ready, setReady] = useState(false);
  const onReady = () => {
    if (ready) return;
    setReady(true);
    vibrate(25);
    send({ type: 'input', kind: 'ready' });
  };
  return (
    <div className="card" style={{
      flex:1, display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', gap:12, textAlign:'center'
    }}>
      <div style={{fontSize:12, fontWeight:700, letterSpacing:1, color:'var(--wood-dk)', textTransform:'uppercase'}}>
        {summary.minigame}
      </div>
      <div style={{fontSize:56, lineHeight:1}}>{tag.emoji}</div>
      <div style={{
        background:tag.color, color:'var(--ink)', border:'4px solid var(--ink)',
        borderRadius:14, padding:'8px 20px', boxShadow:'0 5px 0 var(--ink)',
        fontFamily:"'Luckiest Guy',cursive", fontSize:24, letterSpacing:1
      }}>{tag.label}</div>
      <div style={{
        background: gotCoins ? 'var(--yellow)' : '#eee',
        border:'3px solid var(--ink)', borderRadius:12, padding:'6px 16px',
        fontFamily:"'Luckiest Guy',cursive", fontSize:20,
        color: gotCoins ? 'var(--ink)' : '#888',
        boxShadow:'0 4px 0 var(--ink)'
      }}>+{summary.earned} coins</div>
      <div style={{fontSize:13, fontWeight:600, color:'var(--wood-dk)'}}>
        total {summary.total}
      </div>
      <button className={`btn ${ready ? 'green' : ''} ${ready ? '' : 'pulse'}`}
              disabled={ready}
              onClick={onReady}
              style={{marginTop:4, maxWidth:280}}>
        {ready ? '✓ READY' : 'TAP WHEN READY'}
      </button>
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

function LobbyScreen({ hostScreen, players, send }) {
  // Phone sees these screens solo, so the copy talks to the single player
  // holding this device, not the whole room.
  const showReady = hostScreen === 'title';
  const [ready, setReady] = useState(false);
  // Reset the local ready flag whenever the phone drops back to title
  // (e.g. host clicked MAIN MENU on the podium) so a rematch session can
  // ready-up from scratch instead of inheriting a stale tap.
  useEffect(() => { if (hostScreen === 'title') setReady(false); }, [hostScreen]);
  const onReady = () => {
    if (ready) return;
    setReady(true);
    vibrate(25);
    if (send) send({ type: 'input', kind: 'ready' });
  };
  const label = ({
    title:      ready
      ? "ready! waiting for the others…"
      : "you're in! tap LET'S GO when everyone's here",
    select:     "you're locked in — waiting for the others",
    scoreboard: 'round over — check the big screen',
    podium:     'champion crowned!',
  })[hostScreen] || 'get ready…';
  return (
    <div className="card pulse" style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}>
      <div style={{fontFamily:"'Luckiest Guy'",fontSize:26,color:'var(--ink)',textAlign:'center',lineHeight:1.15,maxWidth:300}}>{label}</div>
      <div style={{fontSize:14,fontWeight:600,color:'var(--wood-dk)',textAlign:'center'}}>
        {players.length} player{players.length === 1 ? '' : 's'} in the room
      </div>
      {showReady && (
        <button className={`btn ${ready ? 'green' : ''}`}
                disabled={ready}
                onClick={onReady}
                style={{marginTop:4, maxWidth:280}}>
          {ready ? '✓ READY' : "LET'S GO!"}
        </button>
      )}
    </div>
  );
}

function MinigameInput({ game, send, score, turn, myId }) {
  const contract = game.contract || 'tap';
  const yourTurn = !!(turn && turn.activeId != null && turn.activeId === myId);
  // If turn data exists but it isn't ours, lock regardless of whether the
  // active player is a CPU (activeId null) or another phone.
  const waiting = !!(turn && !yourTurn);
  const body = contract === 'tap'   ? <TapContract   prompt={game.prompt} send={send} locked={waiting}/>
            : contract === 'steer' ? <SteerContract prompt={game.prompt} send={send}/>
            : contract === 'holes' ? <HolesContract prompt={game.prompt} send={send}/>
            : <LobbyScreen hostScreen="playing" players={[]}/>;
  return (
    <>
      {score && <ScoreStrip score={score}/>}
      {turn && <TurnPill turn={turn} yourTurn={yourTurn}/>}
      {body}
    </>
  );
}

function TurnPill({ turn, yourTurn }) {
  const txt = yourTurn
    ? 'YOUR TURN!'
    : turn.activeName
      ? `${turn.activeName}'S TURN`
      : 'CPU TURN';
  return (
    <div style={{
      display:'flex', justifyContent:'center', marginTop:6, marginBottom:2
    }}>
      <div style={{
        background: yourTurn ? 'var(--green)' : 'var(--wood)',
        color:'#fff', border:'3px solid var(--ink)', borderRadius:999,
        padding:'5px 16px', fontFamily:"'Luckiest Guy',cursive", fontSize:16, letterSpacing:1,
        WebkitTextStroke:'1.5px var(--ink)', textShadow:'0 2px 0 rgba(0,0,0,.3)',
        boxShadow:'0 4px 0 var(--ink)',
        animation: yourTurn ? 'bounce 0.9s ease-in-out infinite' : 'none'
      }}>{txt}</div>
    </div>
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

function TapContract({ prompt, send, locked }) {
  const [hit, setHit] = useState(false);
  const tap = () => {
    if (locked) return;
    send({ type: 'input', kind: 'tap', data: { t: Date.now() } });
    vibrate(15);
    setHit(true);
    setTimeout(() => setHit(false), 60);
  };
  return (
    <>
      <div className="screen-hint">{prompt || 'TAP AS FAST AS YOU CAN!'}</div>
      <div className={`tap-pad ${hit ? 'hit' : ''} ${locked ? 'locked' : ''}`} onPointerDown={tap} onTouchStart={(e)=>{e.preventDefault(); tap();}}>
        {locked ? 'WAIT' : 'TAP'}
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
