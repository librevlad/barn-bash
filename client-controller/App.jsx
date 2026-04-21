// client-controller/App.jsx
// Phone controller — state, WebSocket lifecycle, and per-screen routing.
// Renders JoinScreen first (until the phone commits name + critter), then
// a pill strip + the screen matching the host's current view.
//
// All screens / contracts / widgets self-register on window at load time;
// this file just routes them.

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
  const [summary, setSummary] = useState(null); // { minigame, rank, earned, total, mode }
  const [finale, setFinale] = useState(null);   // { rank, total }
  const [swapOpen, setSwapOpen] = useState(false);
  const wsRef = useRef(null);
  // Latest join payload so we can re-send on reconnect without stale closures.
  const joinedRef = useRef(null);
  // playerId mirrored into a ref so WS listeners can read it without
  // re-subscribing on every state change.
  const playerIdRef = useRef(null);
  // Last score sent to the phone so we can trigger a short vibration the
  // instant the player's own score advances.
  const prevMineRef = useRef(null);

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
            setSummary({
              minigame: msg.minigame, rank: me.rank, earned: me.earned, total: me.total,
              mode: msg.mode || 'classic',
            });
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
    return <JoinScreen name={name} setName={setName} critter={critter} cycleCritter={cycleCritter} doJoin={doJoin}/>;
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

Object.assign(window, { App });
