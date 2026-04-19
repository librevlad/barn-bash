// New mini-games: Apple Aim (archery) and Whack-a-Gopher

/* ==========  GAME 3: APPLE AIM (archery)  ========== */
function AppleAim({ state, onFinish, onQuit }) {
  const players = state.players;
  const FIELD_W = 1400, FIELD_H = 520;
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [turn, setTurn] = useState(0); // whose turn
  const [round, setRound] = useState(0); // shot 0,1,2 per player
  const SHOTS = 3;
  const [scores, setScores] = useState(()=>players.map(()=>0));
  const [angle, setAngle] = useState(45);
  const [angleDir, setAngleDir] = useState(1);
  const [power, setPower] = useState(0);
  const [powerDir, setPowerDir] = useState(1);
  const [phase, setPhase] = useState('angle'); // 'angle' -> 'power' -> 'fly' -> 'result'
  const [arrow, setArrow] = useState(null); // {x,y,vx,vy}
  const [hits, setHits] = useState([]); // [{x,y,ring}]
  const [floatTexts, setFloatTexts] = useState([]);

  const difficulty = state.difficulty;
  const targetX = FIELD_W - 180;
  const targetY = FIELD_H / 2 + 20;
  const archerX = 150;
  const archerY = FIELD_H - 120;

  const currentPlayer = players[turn];

  // oscillate angle
  useRaf((dt) => {
    if (!started || finished) return;
    if (phase === 'angle') {
      setAngle(a => {
        let next = a + angleDir * 70 * dt;
        if (next >= 75) { setAngleDir(-1); next = 75; }
        if (next <= 20) { setAngleDir(1); next = 20; }
        return next;
      });
    } else if (phase === 'power') {
      setPower(p => {
        let next = p + powerDir * 140 * dt;
        if (next >= 100) { setPowerDir(-1); next = 100; }
        if (next <= 0) { setPowerDir(1); next = 0; }
        return next;
      });
    } else if (phase === 'fly' && arrow) {
      setArrow(a => {
        const next = { ...a, x: a.x + a.vx * dt, y: a.y + a.vy * dt, vy: a.vy + 900 * dt, rot: Math.atan2(a.vy + 900 * dt, a.vx) * 180 / Math.PI };
        // check hit target or ground
        const dx = next.x - targetX, dy = next.y - targetY;
        const dist = Math.hypot(dx, dy);
        if (dist < 100) {
          // hit!
          const ring = dist < 20 ? 5 : dist < 40 ? 4 : dist < 60 ? 3 : dist < 80 ? 2 : 1;
          registerHit(next.x, next.y, ring);
          return null;
        }
        if (next.y > FIELD_H - 40 || next.x > FIELD_W + 40) {
          registerHit(null, null, 0);
          return null;
        }
        return next;
      });
    }
  }, started && !finished);

  const registerHit = (x, y, ring) => {
    setScores(prev => {
      const next = prev.slice();
      next[turn] += ring;
      return next;
    });
    if (x != null) setHits(h => [...h, { x, y, ring, turn }]);
    setFloatTexts(f => [...f, { id: Date.now()+Math.random(), x: x||targetX, y: y||targetY, text: ring === 5 ? 'BULLSEYE!' : ring > 0 ? `+${ring}` : 'MISS', c: ring === 5 ? '#ffc93c' : ring > 0 ? '#6cc24a' : '#e04b3b' }]);
    setPhase('result');
    setTimeout(() => {
      const nextRound = turn === players.length - 1 ? round + 1 : round;
      const nextTurn = (turn + 1) % players.length;
      if (nextRound >= SHOTS) {
        setFinished(true);
        return;
      }
      setTurn(nextTurn);
      setRound(nextRound);
      setPower(0);
      setAngle(45);
      setPhase('angle');
    }, 1200);
  };

  // CPU auto-play
  useEffect(() => {
    if (!started || finished) return;
    if (!currentPlayer || !currentPlayer.isCPU) return;
    if (phase !== 'angle') return;
    const accuracy = { easy: .6, medium: .82, hard: .95 }[difficulty] || .8;
    const t = setTimeout(() => {
      setAngle(38 + Math.random() * 12 * (1 - accuracy) + (Math.random() > .5 ? 6 : 0));
      setPhase('power');
      setTimeout(() => {
        const basePower = 76 + (Math.random()*16 - 8) * (1 - accuracy);
        setPower(basePower);
        setTimeout(() => fire(38 + Math.random() * 12 * (1 - accuracy) + 4, basePower), 200);
      }, 350);
    }, 800);
    return () => clearTimeout(t);
  }, [turn, phase, started]);

  // float text cleanup
  useEffect(() => {
    if (!floatTexts.length) return;
    const t = setTimeout(() => setFloatTexts(f => f.slice(1)), 1100);
    return () => clearTimeout(t);
  }, [floatTexts]);

  const fire = (ang = angle, pow = power) => {
    const rad = ang * Math.PI / 180;
    const speed = 300 + pow * 8;
    setArrow({ x: archerX + 30, y: archerY, vx: Math.cos(rad) * speed, vy: -Math.sin(rad) * speed, rot: -ang });
    setPhase('fly');
  };

  const onAction = () => {
    if (!started || finished || currentPlayer.isCPU) return;
    if (phase === 'angle') setPhase('power');
    else if (phase === 'power') fire();
  };

  // keyboard space
  useEffect(() => {
    const d = (e) => {
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); onAction(); }
    };
    window.addEventListener('keydown', d);
    return () => window.removeEventListener('keydown', d);
  }, [phase, started, finished, currentPlayer]);

  // phone tap from the current shooter advances the phase
  const mp = (typeof window !== 'undefined') ? window.__BarnBashMPRT : null;
  useEffect(() => {
    if (!mp || !mp.onInput) return;
    mp.broadcastMinigameStart && mp.broadcastMinigameStart('appleaim', 'TAP TO LOCK ANGLE, POWER, FIRE', 'tap');
    const off = mp.onInput(({ id, kind }) => {
      if (kind !== 'tap') return;
      if (!currentPlayer || currentPlayer.remoteId !== id) return;
      if (phase === 'angle') setPhase('power');
      else if (phase === 'power') fire();
    });
    return () => { try { off && off(); } catch (_) {} mp.broadcastMinigameEnd && mp.broadcastMinigameEnd('appleaim'); };
  }, [mp, phase, currentPlayer, started, finished]);

  // finish
  useEffect(() => {
    if (!finished) return;
    const earned = [...scores.map((s,i)=>({i,s}))].sort((a,b)=>b.s-a.s)
      .reduce((acc, r, rank) => { acc[r.i] = [5,3,1,0][rank] ?? 0; return acc; }, Array(players.length).fill(0));
    setTimeout(() => onFinish(earned), 1500);
  }, [finished]);

  return (
    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, #d9a36a 0%, #e8c08f 40%, #c49258 80%, #8f6a3b 100%)', overflow:'hidden'}}>
      {/* sun */}
      <div style={{position:'absolute', top:80, right:120, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle, #fff5a8 0%, #ffd26b 70%, transparent 100%)', filter:'blur(2px)'}}/>
      <Clouds count={3}/>

      {/* HUD */}
      <div style={{position:'absolute',top:20,left:20,right:20,display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:20}}>
        <Btn variant="cream" size="sm" onClick={onQuit}>◀ QUIT</Btn>
        <div className="plank" style={{padding:'8px 22px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:26}}>🎯 APPLE AIM</span>
        </div>
        <div className="plank" style={{padding:'8px 16px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:20}}>SHOT {round+1}/{SHOTS}</span>
        </div>
      </div>

      {/* Score row */}
      <div style={{position:'absolute',top:80,left:0,right:0,display:'flex',justifyContent:'center',gap:10,zIndex:20}}>
        {players.map((p,i)=>(
          <div key={i} style={{
            background: turn === i && !finished ? 'var(--yellow)' : '#fff',
            border:'3px solid var(--ink)', borderRadius:12, padding:'4px 10px',
            display:'flex', alignItems:'center', gap:6,
            transform: turn === i ? 'translateY(-4px) scale(1.05)':'none',
            boxShadow: turn === i ? '0 6px 0 var(--ink)' : '0 3px 0 var(--ink)',
            transition:'all .2s ease'
          }}>
            <Avatar char={p.char} size={32}/>
            <span style={{fontFamily:"'Luckiest Guy'", fontSize:16, color:'var(--ink)'}}>
              {playerLabel(p)}: {scores[i]}
            </span>
          </div>
        ))}
      </div>

      {/* Field */}
      <div style={{
        position:'absolute', left:'50%', transform:'translateX(-50%)', top:140,
        width:FIELD_W, height:FIELD_H, background:'linear-gradient(180deg, #c8e2a8 0%, #8fcc6a 100%)',
        border:'5px solid var(--ink)', borderRadius:20, overflow:'hidden',
        boxShadow:'0 10px 0 var(--ink)'
      }}>
        {/* ground */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:40,background:'#7a4920',borderTop:'3px solid var(--ink)'}}/>
        {/* target */}
        <div style={{position:'absolute', left: targetX - 70, top: targetY - 70, width:140, height:140}}>
          {/* pole */}
          <div style={{position:'absolute', left:64, top:70, width:12, height:110, background:'#6b4a2e', border:'2px solid var(--ink)'}}/>
          {[[5,'#ffc93c'],[4,'#4aa3e0'],[3,'#e04b3b'],[2,'#fff'],[1,'#6cc24a']].map(([r,c],i)=>(
            <div key={i} style={{
              position:'absolute', inset: 16 * i, borderRadius:'50%',
              background: c, border: '3px solid var(--ink)',
              display:'grid', placeItems:'center', fontFamily:"'Luckiest Guy'", color:'var(--ink)', fontSize: i === 4 ? 18 : 0
            }}>{i === 4 ? r : ''}</div>
          ))}
          {/* apple on top */}
          <div style={{position:'absolute', top:-20, left:60, fontSize:36}}>🍎</div>
        </div>

        {/* hits */}
        {hits.map((h,i)=>(
          <div key={i} style={{position:'absolute', left:h.x, top:h.y, transform:'translate(-50%,-50%)'}}>
            <svg width="60" height="16" viewBox="0 0 60 16">
              <line x1="4" y1="8" x2="48" y2="8" stroke="#8f6a3b" strokeWidth="3"/>
              <polygon points="48,2 58,8 48,14" fill="#e04b3b" stroke="#2a1a10" strokeWidth="1.5"/>
              <polygon points="0,4 8,8 0,12" fill="#fff" stroke="#2a1a10" strokeWidth="1.5"/>
            </svg>
          </div>
        ))}

        {/* float texts */}
        {floatTexts.map(f=>(
          <div key={f.id} style={{
            position:'absolute', left:f.x, top:f.y, transform:'translate(-50%,-50%)',
            fontFamily:"'Luckiest Guy'", fontSize:36, color:f.c, WebkitTextStroke:'2px var(--ink)',
            animation:'floatUp 1s ease-out forwards', pointerEvents:'none', zIndex:10
          }}>{f.text}</div>
        ))}

        {/* archer + bow */}
        <div style={{position:'absolute', left: archerX, top: archerY, transform:'translate(-50%, -40%)'}}>
          <Avatar char={currentPlayer.char} size={96}/>
          {/* bow + aim line */}
          <svg width="240" height="240" viewBox="-120 -120 240 240" style={{position:'absolute', left:-120 + 40, top:-120 - 20, overflow:'visible', pointerEvents:'none'}}>
            <path d={`M 20 -20 Q 50 0 20 20`} stroke="#6b4a2e" strokeWidth="5" fill="none" strokeLinecap="round"/>
            {(phase === 'angle' || phase === 'power') && (
              <line x1="0" y1="0"
                x2={Math.cos(-angle * Math.PI/180) * 180}
                y2={Math.sin(-angle * Math.PI/180) * 180}
                stroke="rgba(255,255,255,.8)" strokeWidth="3" strokeDasharray="6 4"/>
            )}
          </svg>
        </div>

        {/* arrow in flight */}
        {arrow && (
          <div style={{position:'absolute', left:arrow.x, top:arrow.y, transform:`translate(-50%,-50%) rotate(${arrow.rot}deg)`}}>
            <svg width="60" height="16" viewBox="0 0 60 16">
              <line x1="4" y1="8" x2="48" y2="8" stroke="#8f6a3b" strokeWidth="3"/>
              <polygon points="48,2 58,8 48,14" fill="#e04b3b" stroke="#2a1a10" strokeWidth="1.5"/>
              <polygon points="0,4 8,8 0,12" fill="#fff" stroke="#2a1a10" strokeWidth="1.5"/>
            </svg>
          </div>
        )}

        {/* angle/power meter */}
        {(phase === 'angle' || phase === 'power') && !currentPlayer.isCPU && (
          <div style={{position:'absolute', left: 20, bottom: 60, width: 300}}>
            <div style={{background:'#fff',border:'3px solid var(--ink)',borderRadius:10,padding:'6px 10px',marginBottom:6,fontFamily:"'Luckiest Guy'",fontSize:18,color:'var(--ink)'}}>
              {phase === 'angle' ? 'TAP SPACE TO LOCK ANGLE' : 'TAP SPACE TO FIRE!'}
            </div>
            <div style={{background:'#fff',border:'3px solid var(--ink)',borderRadius:10,padding:6}}>
              <div style={{fontSize:11,fontFamily:"'Luckiest Guy'"}}>ANGLE: {angle.toFixed(0)}°</div>
              <div style={{height:10,background:'#eee',borderRadius:5,margin:'4px 0',overflow:'hidden'}}>
                <div style={{width:`${(angle-20)/55*100}%`,height:'100%',background:'var(--green)'}}/>
              </div>
              <div style={{fontSize:11,fontFamily:"'Luckiest Guy'"}}>POWER: {power.toFixed(0)}%</div>
              <div style={{height:12,background:'#eee',borderRadius:6,overflow:'hidden'}}>
                <div style={{width:`${power}%`,height:'100%',background:`linear-gradient(90deg, #6cc24a, #ffc93c, #e04b3b)`}}/>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action button */}
      {!currentPlayer.isCPU && (phase === 'angle' || phase === 'power') && (
        <div style={{position:'absolute',bottom:20,left:0,right:0,display:'flex',justifyContent:'center',zIndex:20}}>
          <button onClick={onAction} className="pulse" style={{
            fontFamily:"'Luckiest Guy'", fontSize:32, padding:'14px 40px',
            background: phase === 'power' ? 'var(--red)' : 'var(--yellow)', color:'#fff',
            WebkitTextStroke:'2px var(--ink)', border:'5px solid var(--ink)', borderRadius:18,
            boxShadow:'0 8px 0 var(--ink)', cursor:'pointer'
          }}>
            {phase === 'power' ? '🏹 FIRE!' : 'LOCK ANGLE'}
          </button>
        </div>
      )}

      {currentPlayer.isCPU && (phase === 'angle' || phase === 'power') && (
        <div style={{position:'absolute',bottom:30,left:0,right:0,textAlign:'center'}}>
          <div style={{display:'inline-block',background:'#fff',border:'3px solid var(--ink)',borderRadius:14,padding:'8px 16px',fontFamily:"'Luckiest Guy'",fontSize:18}}>
            🤖 {playerLabel(currentPlayer)} IS AIMING...
          </div>
        </div>
      )}

      <style>{`@keyframes floatUp{ 0%{transform:translate(-50%,-50%) scale(.5); opacity:0} 20%{transform:translate(-50%,-80%) scale(1.2); opacity:1} 100%{transform:translate(-50%,-200%) scale(1); opacity:0} }`}</style>

      {!started && <Countdown onDone={()=>setStarted(true)}/>}
      {finished && (
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.3)',display:'grid',placeItems:'center',zIndex:40}}>
          <div className="pop-in" style={{fontFamily:"'Luckiest Guy'",fontSize:120,color:'var(--yellow)',WebkitTextStroke:'6px var(--ink)',textShadow:'0 8px 0 var(--ink)'}}>MATCH END!</div>
        </div>
      )}
    </div>
  );
}

/* ==========  GAME 4: WHACK-A-GOPHER ==========
   5 holes; gophers pop up (+1) and bunnies sometimes (−1). You have limited time.
   You = whacker, controls by clicking a hole. CPUs auto-whack nearby pops.
*/
function WhackAGopher({ state, onFinish, onQuit }) {
  const players = state.players;
  const HOLES = 6;
  const GAME_SEC = 25;
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [time, setTime] = useState(0);
  const [scores, setScores] = useState(()=>players.map(()=>0));
  // pops[holeIdx] = { kind:'gopher'|'bunny'|'golden', ttl, whackedBy }
  const [pops, setPops] = useState(() => Array(HOLES).fill(null));
  const [hitFX, setHitFX] = useState([]);
  const difficulty = state.difficulty;
  const spawnRate = { easy: 1.1, medium: 0.75, hard: 0.5 }[difficulty] || 0.75;
  const spawnTimer = useRef(0);
  const cpuTimers = useRef(players.map(() => Math.random() * 2));
  const [hoverHole, setHoverHole] = useState(-1);

  useRaf((dt) => {
    if (!started || finished) return;
    setTime(t => {
      const nt = t + dt;
      if (nt >= GAME_SEC) setFinished(true);
      return nt;
    });
    // spawn
    spawnTimer.current -= dt;
    if (spawnTimer.current <= 0) {
      spawnTimer.current = spawnRate * (0.6 + Math.random());
      setPops(prev => {
        const next = prev.slice();
        const empty = next.map((p,i)=>p?null:i).filter(i=>i!==null);
        if (empty.length) {
          const h = empty[Math.floor(Math.random()*empty.length)];
          const r = Math.random();
          const kind = r < 0.1 ? 'golden' : r < 0.28 ? 'bunny' : 'gopher';
          next[h] = { kind, ttl: kind === 'golden' ? 0.8 : 1.4, whackedBy: null };
        }
        return next;
      });
    }
    // age pops
    setPops(prev => prev.map(p => p ? { ...p, ttl: p.ttl - dt } : null).map(p => p && p.ttl <= 0 ? null : p));

    // CPU actions
    cpuTimers.current = cpuTimers.current.map((t, pi) => {
      if (pi === 0) return t; // human
      if (!players[pi]) return t;
      const skill = { easy: 1.4, medium: 0.9, hard: 0.55 }[difficulty] || 0.9;
      const nt = t - dt;
      if (nt <= 0) {
        // whack a random visible gopher/golden
        setPops(prev => {
          const next = prev.slice();
          const candidates = next.map((p,i)=>(p && p.kind !== 'bunny' && !p.whackedBy) ? i : -1).filter(i=>i>=0);
          if (candidates.length) {
            const h = candidates[Math.floor(Math.random()*candidates.length)];
            const delta = next[h].kind === 'golden' ? 3 : 1;
            setScores(s => { const ns = s.slice(); ns[pi] += delta; return ns; });
            setHitFX(fx => [...fx, { id: Date.now()+Math.random(), h, text:`+${delta}`, c:players[pi].char.color, by:pi }]);
            next[h] = null;
          }
          return next;
        });
        return skill * (0.6 + Math.random());
      }
      return nt;
    });
  }, started && !finished);

  useEffect(() => {
    if (!hitFX.length) return;
    const t = setTimeout(() => setHitFX(f => f.slice(1)), 700);
    return () => clearTimeout(t);
  }, [hitFX]);

  const whackFor = (pi, h) => {
    if (!started || finished) return;
    setPops(prev => {
      const next = prev.slice();
      const p = next[h];
      if (!p) return next;
      let delta = 0;
      if (p.kind === 'gopher') delta = 1;
      else if (p.kind === 'golden') delta = 3;
      else if (p.kind === 'bunny') delta = -1;
      setScores(s => { const ns = s.slice(); ns[pi] += delta; return ns; });
      const c = delta > 0 ? '#6cc24a' : '#e04b3b';
      setHitFX(fx => [...fx, { id: Date.now()+Math.random(), h, text: delta > 0 ? `+${delta}` : `${delta}`, c, by: pi }]);
      next[h] = null;
      return next;
    });
  };
  const whack = (h) => whackFor(0, h);

  // phone holes contract — each remote player's hole tap maps to their index
  const mp = (typeof window !== 'undefined') ? window.__BarnBashMPRT : null;
  useEffect(() => {
    if (!mp || !mp.onInput) return;
    mp.broadcastMinigameStart && mp.broadcastMinigameStart('whack', 'BOP GOPHERS • SKIP BUNNIES', 'holes');
    const off = mp.onInput(({ id, kind, data }) => {
      if (kind !== 'holes' || !data) return;
      const h = data.h;
      if (typeof h !== 'number' || h < 0 || h >= HOLES) return;
      const pi = players.findIndex(pp => pp.remoteId === id);
      if (pi < 0) return;
      whackFor(pi, h);
    });
    return () => { try { off && off(); } catch (_) {} mp.broadcastMinigameEnd && mp.broadcastMinigameEnd('whack'); };
  }, [mp, started, finished]);

  useEffect(() => {
    if (!finished) return;
    const earned = [...scores.map((s,i)=>({i,s}))].sort((a,b)=>b.s-a.s)
      .reduce((acc, r, rank) => { acc[r.i] = [5,3,1,0][rank] ?? 0; return acc; }, Array(players.length).fill(0));
    setTimeout(() => onFinish(earned), 1200);
  }, [finished]);

  // key hotkeys 1-6
  useEffect(() => {
    const d = (e) => {
      const n = parseInt(e.key);
      if (n >= 1 && n <= HOLES) whack(n-1);
    };
    window.addEventListener('keydown', d);
    return () => window.removeEventListener('keydown', d);
  }, [started, finished]);

  const holePositions = useMemo(() => (
    Array.from({ length: HOLES }).map((_, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      return { x: 200 + col * 340, y: 200 + row * 200 };
    })
  ), []);

  return (
    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, #ffd97a 0%, #c88b3c 60%, #7a4920 100%)',overflow:'hidden'}}>
      <Clouds count={3}/>
      {/* HUD */}
      <div style={{position:'absolute',top:20,left:20,right:20,display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:20}}>
        <Btn variant="cream" size="sm" onClick={onQuit}>◀ QUIT</Btn>
        <div className="plank" style={{padding:'8px 22px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:26}}>🔨 WHACK-A-GOPHER</span>
        </div>
        <div className="plank" style={{padding:'8px 16px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:20}}>{Math.max(0,GAME_SEC - time).toFixed(1)}s</span>
        </div>
      </div>

      {/* Score row */}
      <div style={{position:'absolute',top:82,left:0,right:0,display:'flex',justifyContent:'center',gap:10,zIndex:20}}>
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

      {/* holes */}
      {holePositions.map((pos, i) => {
        const pop = pops[i];
        return (
          <div key={i}
            onMouseEnter={()=>setHoverHole(i)}
            onMouseLeave={()=>setHoverHole(-1)}
            onMouseDown={()=>whack(i)}
            style={{
              position:'absolute', left:`calc(50% + ${pos.x - 700}px)`, top:pos.y,
              width: 220, height: 150,
              cursor: 'pointer',
            }}>
            {/* hole mound */}
            <div style={{
              position:'absolute', left:0, right:0, bottom:0, height:90,
              background:'radial-gradient(ellipse at 50% 20%, #3a2510 0%, #6b4a2e 55%, #8f6a3b 100%)',
              borderRadius:'50% 50% 20% 20%/ 60% 60% 10% 10%',
              border:'4px solid var(--ink)',
              boxShadow:'0 8px 0 var(--ink), inset 0 8px 20px rgba(0,0,0,.6)'
            }}/>
            {/* inner hole dark */}
            <div style={{
              position:'absolute', left:40, right:40, bottom:40, height:40,
              background:'#1a0e08', borderRadius:'50%', border:'3px solid var(--ink)',
            }}/>
            {/* pop-up critter */}
            {pop && (
              <div className="pop-in" style={{
                position:'absolute', left:'50%', bottom: 30, transform:'translateX(-50%)',
              }}>
                {pop.kind === 'gopher' && <GopherFace/>}
                {pop.kind === 'bunny' && <BunnyFace/>}
                {pop.kind === 'golden' && <GopherFace gold/>}
              </div>
            )}
            {/* hover hammer */}
            {hoverHole === i && (
              <div style={{position:'absolute', left:'50%', top:-30, transform:'translateX(-50%) rotate(-20deg)', fontSize:48, pointerEvents:'none'}}>🔨</div>
            )}
            {/* hotkey */}
            <div style={{position:'absolute', left:10, top:10, background:'#fff', border:'2px solid var(--ink)', borderRadius:8, padding:'2px 8px', fontFamily:"'Luckiest Guy'", fontSize:14}}>{i+1}</div>
          </div>
        );
      })}

      {/* Hit FX */}
      {hitFX.map(fx => {
        const pos = holePositions[fx.h];
        return (
          <div key={fx.id} style={{
            position:'absolute', left:`calc(50% + ${pos.x - 700 + 110}px)`, top:pos.y + 30,
            fontFamily:"'Luckiest Guy'", fontSize:34, color:fx.c, WebkitTextStroke:'2px var(--ink)',
            animation:'floatUp 0.7s ease-out forwards', pointerEvents:'none', zIndex:30
          }}>{fx.text}</div>
        );
      })}

      {/* hints */}
      <div style={{position:'absolute',bottom:20,left:0,right:0,display:'flex',justifyContent:'center',gap:12}}>
        <div style={{background:'#fff',border:'3px solid var(--ink)',borderRadius:14,padding:'8px 16px',fontFamily:"'Luckiest Guy'",fontSize:16}}>
          CLICK holes or press 1–6 · 🐹 +1 · ✨🐹 +3 · 🐰 −1!
        </div>
      </div>

      <style>{`@keyframes floatUp{ 0%{opacity:0; transform:translateY(0)} 20%{opacity:1; transform:translateY(-10px)} 100%{opacity:0; transform:translateY(-60px)} }`}</style>

      {!started && <Countdown onDone={()=>setStarted(true)}/>}
      {finished && (
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.3)',display:'grid',placeItems:'center',zIndex:40}}>
          <div className="pop-in" style={{fontFamily:"'Luckiest Guy'",fontSize:120,color:'var(--yellow)',WebkitTextStroke:'6px var(--ink)',textShadow:'0 8px 0 var(--ink)'}}>TIME!</div>
        </div>
      )}
    </div>
  );
}

function GopherFace({ gold }) {
  const c = gold ? '#ffc93c' : '#8f6a3b';
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <ellipse cx="40" cy="48" rx="32" ry="28" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      <ellipse cx="40" cy="56" rx="18" ry="12" fill={gold ? '#fff5a8' : '#d9a36a'}/>
      <circle cx="22" cy="28" r="8" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      <circle cx="58" cy="28" r="8" fill={c} stroke="#2a1a10" strokeWidth="3"/>
      <circle cx="22" cy="28" r="3" fill={gold ? '#e09010' : '#5a3a1c'}/>
      <circle cx="58" cy="28" r="3" fill={gold ? '#e09010' : '#5a3a1c'}/>
      <circle cx="30" cy="42" r="3" fill="#2a1a10"/>
      <circle cx="50" cy="42" r="3" fill="#2a1a10"/>
      <circle cx="31" cy="41" r="1" fill="#fff"/>
      <circle cx="51" cy="41" r="1" fill="#fff"/>
      <ellipse cx="40" cy="52" rx="3" ry="2" fill="#2a1a10"/>
      <rect x="36" y="55" width="3" height="7" fill="#fff" stroke="#2a1a10" strokeWidth="1.5"/>
      <rect x="40" y="55" width="3" height="7" fill="#fff" stroke="#2a1a10" strokeWidth="1.5"/>
      {gold && (<>
        <polygon points="10,10 14,18 22,20 14,22 10,30 6,22 -2,20 6,18" fill="#fff" opacity=".8"/>
        <polygon points="66,12 70,18 76,20 70,22 66,28 62,22 56,20 62,18" fill="#fff" opacity=".8"/>
      </>)}
    </svg>
  );
}
function BunnyFace() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <ellipse cx="28" cy="18" rx="6" ry="14" fill="#fff" stroke="#2a1a10" strokeWidth="3"/>
      <ellipse cx="52" cy="18" rx="6" ry="14" fill="#fff" stroke="#2a1a10" strokeWidth="3"/>
      <ellipse cx="28" cy="20" rx="2" ry="8" fill="#f4b5c7"/>
      <ellipse cx="52" cy="20" rx="2" ry="8" fill="#f4b5c7"/>
      <circle cx="40" cy="50" r="28" fill="#fff" stroke="#2a1a10" strokeWidth="3"/>
      <circle cx="30" cy="44" r="4" fill="#2a1a10"/>
      <circle cx="50" cy="44" r="4" fill="#2a1a10"/>
      <circle cx="31" cy="43" r="1" fill="#fff"/>
      <circle cx="51" cy="43" r="1" fill="#fff"/>
      <path d="M 36 54 Q 40 58 44 54 Z" fill="#f28bbd" stroke="#2a1a10" strokeWidth="2"/>
      <ellipse cx="22" cy="56" rx="5" ry="3" fill="#fbe0e8" opacity=".8"/>
      <ellipse cx="58" cy="56" rx="5" ry="3" fill="#fbe0e8" opacity=".8"/>
    </svg>
  );
}

Object.assign(window, { AppleAim, WhackAGopher });
