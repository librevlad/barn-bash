// src/games/fishing-frenzy/FishingFrenzy.jsx
// Swing-and-drop timing: catch fish, avoid boots. FishSVG renders each
// tile of the reel.

function FishingFrenzy({ state, onFinish, onQuit, game }) {
  const players = state.players;
  const N = players.length;
  const GAME_SEC = 30;
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [time, setTime] = useState(0);
  const [scores, setScores] = useState(()=>players.map(()=>0));
  const hookX = useRef(700); // for human; others simulated
  const hookDir = useRef(1);
  const [dropping, setDropping] = useState(null); // { y, startT, player, x, returning }
  const [fish, setFish] = useState([]); // {id, lane, x, speed, kind:'small'|'big'|'gold'|'boot', dir, y}
  const [floats, setFloats] = useState([]);
  const nextId = useRef(1);
  const spawnT = useRef(0);
  const cpuCooldown = useRef(players.map(()=> 1 + Math.random()*2));

  const POND_W = 1200, POND_H = 440;
  const difficulty = state.difficulty;

  useRaf((dt) => {
    if (!started || finished) return;
    setTime(t => { const nt = t + dt; if (nt >= GAME_SEC) setFinished(true); return nt; });

    // spawn fish
    spawnT.current -= dt;
    if (spawnT.current <= 0) {
      spawnT.current = 0.5 + Math.random()*0.5;
      const r = Math.random();
      const kind = r < 0.05 ? 'gold' : r < 0.18 ? 'boot' : r < 0.45 ? 'big' : 'small';
      const dir = Math.random() < 0.5 ? 1 : -1;
      const lane = 1 + Math.floor(Math.random() * 4); // 1..4 (0 is water surface)
      setFish(prev => [...prev, {
        id: nextId.current++,
        kind, dir,
        x: dir > 0 ? -80 : POND_W + 80,
        y: 80 + lane * 70,
        speed: (60 + Math.random()*60) * (kind === 'gold' ? 1.4 : 1),
      }]);
    }

    // move fish
    setFish(prev => prev.map(f => ({ ...f, x: f.x + f.dir * f.speed * dt }))
      .filter(f => f.x > -120 && f.x < POND_W + 120));

    // animate hook swing (human)
    if (!dropping || dropping.player !== 0) {
      hookX.current += hookDir.current * 280 * dt;
      if (hookX.current > POND_W - 120) { hookX.current = POND_W - 120; hookDir.current = -1; }
      if (hookX.current < 120) { hookX.current = 120; hookDir.current = 1; }
    }

    // handle drop animation
    if (dropping) {
      const elapsed = (performance.now() - dropping.startT) / 1000;
      const depth = 50 + Math.min(1.2, elapsed) * 320;
      const returning = elapsed > 1.5;
      const y = returning ? (50 + Math.max(0, 320 - (elapsed - 1.5) * 400)) : depth;
      // collision check at tip
      if (!dropping.hit && !returning) {
        const hitFish = null;
        setFish(prev => {
          let hit = null;
          const next = prev.filter(f => {
            if (hit) return true;
            const dx = Math.abs(f.x - dropping.x);
            const dy = Math.abs(f.y - y);
            if (dx < 40 && dy < 28) { hit = f; return false; }
            return true;
          });
          if (hit) {
            const delta = hit.kind === 'gold' ? 5 : hit.kind === 'big' ? 3 : hit.kind === 'boot' ? -1 : 1;
            setScores(s => { const ns = s.slice(); ns[dropping.player] += delta; return ns; });
            setFloats(f => [...f, {id: Date.now()+Math.random(), x: dropping.x, y: y, text: delta>0?`+${delta}`:`${delta}`, c: delta>0 ? (hit.kind==='gold'?'#ffc93c':'#6cc24a') : '#e04b3b' }]);
            setDropping(d => d ? { ...d, hit: hit, hitAtY: y } : d);
          }
          return next;
        });
      }
      if (elapsed > 2.5) setDropping(null);
    }

    // CPU drop
    cpuCooldown.current = cpuCooldown.current.map((c, i) => {
      if (i === 0 || !players[i]) return c;
      if (dropping && dropping.player === i) return c;
      const nc = c - dt;
      if (nc <= 0) {
        // target nearest big fish at a random lane
        const candidates = [...fish].filter(f => f.kind !== 'boot');
        const accuracy = { easy:0.55, medium:0.78, hard:0.93 }[difficulty] || 0.78;
        if (candidates.length && Math.random() < accuracy) {
          const target = candidates[Math.floor(Math.random()*candidates.length)];
          setDropping({ player: i, x: target.x + target.dir * 20 + (Math.random()-0.5)*30, startT: performance.now() });
        } else {
          setDropping({ player: i, x: 120 + Math.random() * (POND_W - 240), startT: performance.now() });
        }
        return 1.8 + Math.random()*1.5;
      }
      return nc;
    });
  }, started && !finished);

  useEffect(() => {
    if (!floats.length) return;
    const t = setTimeout(() => setFloats(f => f.slice(1)), 900);
    return () => clearTimeout(t);
  }, [floats]);

  const humanDrop = () => {
    if (!started || finished || dropping) return;
    setDropping({ player: 0, x: hookX.current, startT: performance.now() });
  };
  useEffect(() => {
    const d = (e) => { if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); humanDrop(); } };
    window.addEventListener('keydown', d);
    return () => window.removeEventListener('keydown', d);
  }, [started, finished, dropping]);

  // Per-phone hook swinging. Each remote player has their own x / dir; tap = drop.
  const phoneHooks = useRef({}); // { [rid]: { x, dir } }
  useEffect(() => {
    const byId = {};
    let leader = 0;
    players.forEach((p, i) => {
      const s = scores[i] || 0;
      if (p.remoteId) byId[p.remoteId] = s;
      if (s > leader) leader = s;
    });
    game.score.update(byId, { leader, label: 'catch' });
  }, [game, scores, players]);
  useEffect(() => {
    players.forEach((p, i) => {
      if (p.remoteId && !phoneHooks.current[p.remoteId]) {
        phoneHooks.current[p.remoteId] = { x: 200 + i * 160, dir: 1 };
      }
    });
    const off = game.input.onTap((id) => {
      if (dropping) return;
      const pi = players.findIndex(pp => pp.remoteId === id);
      if (pi < 0) return;
      const ph = phoneHooks.current[id];
      const x = ph ? ph.x : POND_W/2;
      setDropping({ player: pi, x, startT: performance.now() });
    });
    return () => { try { off && off(); } catch (_) {} };
  }, [game, started, finished, dropping, players]);

  // Swing each phone hook independently
  useRaf((dt) => {
    if (!started || finished) return;
    Object.keys(phoneHooks.current).forEach(rid => {
      if (dropping && dropping.player != null) {
        const pi = players.findIndex(pp => pp.remoteId === rid);
        if (pi === dropping.player) return; // frozen while dropping
      }
      const h = phoneHooks.current[rid];
      h.x += h.dir * 260 * dt;
      if (h.x > POND_W - 120) { h.x = POND_W - 120; h.dir = -1; }
      if (h.x < 120)          { h.x = 120;           h.dir = 1;  }
    });
  }, started && !finished);

  useEffect(() => {
    if (!finished) return;
    const ranked = scores.map((s,i)=>({i,s})).sort((a,b)=>b.s-a.s);
    const earned = Array(N).fill(0);
    [5,3,1,0,0,0].forEach((v,rank)=>{ if (ranked[rank]) earned[ranked[rank].i] = v; });
    setTimeout(() => game.game.finish(earned), 1400);
  }, [finished]);

  const playerHookX = (pi) => {
    if (pi === 0) return hookX.current;
    // CPU hooks off-screen unless dropping
    return -200;
  };
  const dropY = dropping ? (() => {
    const el = (performance.now() - dropping.startT) / 1000;
    if (el > 1.5) return 50 + Math.max(0, 320 - (el - 1.5) * 400);
    return 50 + Math.min(1.2, el) * 320;
  })() : 50;

  return (
    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, #ffd97a 0%, #f0b060 30%, #d68740 45%, #4aa3e0 46%, #2d5a8e 100%)',overflow:'hidden'}}>
      <Clouds count={3}/>
      {/* Sun */}
      <div style={{position:'absolute',top:50,right:180,width:110,height:110,borderRadius:'50%',background:'radial-gradient(circle,#fff5a8 30%,#ffd26b 70%,transparent 100%)',filter:'blur(1px)'}}/>

      {/* HUD */}
      <div style={{position:'absolute',top:20,left:20,right:20,display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:30}}>
        <Btn variant="cream" size="sm" onClick={onQuit}>◀ QUIT</Btn>
        <div className="plank" style={{padding:'8px 36px', whiteSpace:'nowrap'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:28,whiteSpace:'nowrap'}}>🎣 FISHING FRENZY</span>
        </div>
        <div className="plank" style={{padding:'8px 16px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:22}}>{Math.max(0,GAME_SEC-time).toFixed(1)}s</span>
        </div>
      </div>

      {/* Score row */}
      <div style={{position:'absolute',top:100,left:0,right:0,display:'flex',justifyContent:'center',gap:10,zIndex:30}}>
        {players.map((p,i)=>(
          <div key={i} style={{
            background: i === 0 ? 'var(--yellow)' : '#fff',
            border:'3px solid var(--ink)', borderRadius:12, padding:'4px 10px',
            display:'flex', alignItems:'center', gap:6, boxShadow:'0 3px 0 var(--ink)'
          }}>
            <Avatar char={p.char} size={28}/>
            <span style={{fontFamily:"'Luckiest Guy'", fontSize:16, color:'var(--ink)'}}>
              {playerLabel(p)}: {scores[i]}
            </span>
          </div>
        ))}
      </div>

      {/* Pond */}
      <div style={{
        position:'absolute',left:'50%',transform:'translateX(-50%)',top:170,
        width:POND_W, height:POND_H,
        background:'linear-gradient(180deg,#6ab5d9 0%,#2d5a8e 100%)',
        border:'5px solid var(--ink)', borderRadius:20, overflow:'hidden',
        boxShadow:'0 10px 0 var(--ink)',
      }}>
        {/* water surface ripples */}
        <div style={{position:'absolute',top:0,left:0,right:0,height:40,background:'repeating-linear-gradient(90deg, transparent 0 12px, rgba(255,255,255,.3) 12px 14px)'}}/>

        {/* Boat (dock) on top-left */}
        <div style={{position:'absolute',top:-30,left:40,width:260,height:70,zIndex:5}}>
          <svg width="260" height="70" viewBox="0 0 260 70">
            <path d="M 10 30 L 50 62 L 210 62 L 250 30 Z" fill="#8f6a3b" stroke="#2a1a10" strokeWidth="3"/>
            <rect x="60" y="18" width="4" height="20" fill="#2a1a10"/>
          </svg>
          {/* Player sitting on dock */}
          <div style={{position:'absolute',top:-50,left:110}}>
            <Avatar char={players[0].char} size={80}/>
          </div>
          {/* Rod */}
          <svg style={{position:'absolute',top:-30,left:170,pointerEvents:'none'}} width="160" height="80" viewBox="0 0 160 80">
            <line x1="0" y1="60" x2="140" y2="10" stroke="#2a1a10" strokeWidth="4" strokeLinecap="round"/>
          </svg>
        </div>

        {/* fish — FishSVG draws head/mouth on the LEFT, tail on the RIGHT,
            so to render head-forward we flip opposite to the swim direction:
            dir=+1 (rightward) → scaleX(-1) flips so head points right. */}
        {fish.map(f => (
          <div key={f.id} style={{
            position:'absolute', left:f.x, top:f.y, transform:`translate(-50%,-50%) scaleX(${-f.dir})`,
            pointerEvents:'none'
          }}>
            <FishSVG kind={f.kind}/>
          </div>
        ))}

        {/* Human's hook swinging when not dropping */}
        {(!dropping || dropping.player !== 0) && started && !finished && (
          <svg style={{position:'absolute',top:0,left:hookX.current - 2,pointerEvents:'none'}} width="50" height="80" viewBox="0 0 50 80">
            <line x1="25" y1="0" x2="25" y2="50" stroke="#2a1a10" strokeWidth="2"/>
            <path d="M 25 50 Q 18 58 22 66 Q 30 66 28 58" fill="none" stroke="#888" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        )}

        {/* Phone players' swinging hooks (when not mid-drop) */}
        {started && !finished && players.map((p, pi) => {
          if (!p.remoteId) return null;
          if (dropping && dropping.player === pi) return null;
          const h = phoneHooks.current[p.remoteId];
          if (!h) return null;
          return (
            <svg key={pi} style={{position:'absolute',top:0,left:h.x - 2,pointerEvents:'none'}} width="50" height="80" viewBox="0 0 50 80">
              <line x1="25" y1="0" x2="25" y2="50" stroke={p.char.color} strokeWidth="3"/>
              <path d="M 25 50 Q 18 58 22 66 Q 30 66 28 58" fill="none" stroke="#888" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          );
        })}

        {/* Dropping line + hook */}
        {dropping && (
          <svg style={{position:'absolute',top:0,left:dropping.x - 4,pointerEvents:'none'}} width="50" height={dropY + 40} viewBox={`0 0 50 ${dropY + 40}`}>
            <line x1="25" y1="0" x2="25" y2={dropY} stroke={dropping.player === 0 ? '#2a1a10' : players[dropping.player].char.color} strokeWidth="2"/>
            <g transform={`translate(17, ${dropY})`}>
              <path d="M 8 0 Q 0 10 6 18 Q 16 18 12 8" fill="none" stroke="#888" strokeWidth="3" strokeLinecap="round"/>
              {dropping.hit && (
                <g transform="translate(-12, 10) scale(0.6)">
                  <FishSVG kind={dropping.hit.kind}/>
                </g>
              )}
            </g>
          </svg>
        )}

        {/* Floating scores */}
        {floats.map(f => (
          <div key={f.id} style={{
            position:'absolute', left:f.x, top:f.y,
            fontFamily:"'Luckiest Guy'", fontSize:36, color:f.c,
            WebkitTextStroke:'2px var(--ink)',
            animation:'floatUp 0.9s ease-out forwards', pointerEvents:'none', zIndex:20,
            transform:'translate(-50%,-50%)'
          }}>{f.text}</div>
        ))}

        {/* Bubbles */}
        {[...Array(10)].map((_,i)=>{
          const x = (i*127 + time * 30) % POND_W;
          const y = POND_H - 30 - ((time * 40 + i*80) % POND_H);
          return (
            <div key={i} style={{position:'absolute',left:x,top:y,width:6,height:6,borderRadius:'50%',background:'rgba(255,255,255,.35)',border:'1px solid rgba(255,255,255,.6)'}}/>
          );
        })}
      </div>

      {/* Drop button */}
      {started && !finished && !dropping && (
        <div style={{position:'absolute',bottom:26,left:0,right:0,display:'flex',justifyContent:'center',zIndex:30}}>
          <button onClick={humanDrop} className="pulse" style={{
            fontFamily:"'Luckiest Guy'", fontSize:30, padding:'14px 44px', whiteSpace:'nowrap',
            background:'var(--blue)', color:'#fff', WebkitTextStroke:'2px var(--ink)',
            border:'5px solid var(--ink)', borderRadius:20, boxShadow:'0 10px 0 var(--ink)', cursor:'pointer'
          }}>
            🎣 DROP! &nbsp;<span style={{fontSize:18,opacity:.8}}>(SPACE)</span>
          </button>
        </div>
      )}
      <div style={{position:'absolute',bottom:26,right:24,zIndex:30}}>
        <div style={{background:'#fff',border:'3px solid var(--ink)',borderRadius:10,padding:'6px 12px',fontFamily:"'Luckiest Guy'",fontSize:14,whiteSpace:'nowrap'}}>🐟+1 · 🐠+3 · ✨🐡+5 · 👢−1</div>
      </div>

      {!started && <Countdown onDone={()=>setStarted(true)}/>}
      {finished && (
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.3)',display:'grid',placeItems:'center',zIndex:40}}>
          <div className="pop-in" style={{fontFamily:"'Luckiest Guy'",fontSize:120,color:'var(--yellow)',WebkitTextStroke:'6px var(--ink)',textShadow:'0 8px 0 var(--ink)'}}>MATCH END!</div>
        </div>
      )}
    </div>
  );
}

function FishSVG({ kind }) {
  if (kind === 'boot') {
    return (
      <svg width="60" height="50" viewBox="0 0 60 50">
        <path d="M 6 10 L 30 10 L 34 30 L 54 30 L 54 42 L 6 42 Z" fill="#3a352e" stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round"/>
        <rect x="14" y="14" width="12" height="6" fill="#5a564e"/>
      </svg>
    );
  }
  const colors = kind === 'gold' ? { body:'#ffc93c', fin:'#e09010' } : kind === 'big' ? { body:'#e04b3b', fin:'#a8342a' } : { body:'#4aa3e0', fin:'#2d5a8e' };
  const size = kind === 'small' ? 0.8 : kind === 'big' ? 1.15 : 1.0;
  return (
    <svg width={70*size} height={40*size} viewBox="0 0 70 40">
      <ellipse cx="30" cy="20" rx="26" ry="14" fill={colors.body} stroke="#2a1a10" strokeWidth="2.5"/>
      <polygon points="56,20 68,8 68,32" fill={colors.fin} stroke="#2a1a10" strokeWidth="2.5" strokeLinejoin="round"/>
      <polygon points="28,6 20,16 36,16" fill={colors.fin} stroke="#2a1a10" strokeWidth="2"/>
      <circle cx="18" cy="18" r="3" fill="#fff"/>
      <circle cx="17" cy="19" r="1.5" fill="#2a1a10"/>
      <path d="M 10 20 Q 18 24 10 28" stroke="#2a1a10" strokeWidth="1.5" fill="none"/>
      {kind === 'gold' && <circle cx="48" cy="14" r="2" fill="#fff" opacity=".8"/>}
    </svg>
  );
}


window.BB.games.register({
  id: 'fish',
  name: 'Fishing Frenzy',
  blurb: 'Swing and drop. Catch fish, avoid boots.',
  icon: '🎣',
  tint: '#4aa3e0',
  phoneContract: 'tap',
  phonePrompt: 'TAP TO DROP YOUR HOOK!',
  component: FishingFrenzy,
});
