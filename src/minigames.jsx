// Two playable mini-games: Pig Sprint (tap race) and Hay Panic (dodge bales)

/* ==========  COUNTDOWN overlay ==========*/
function Countdown({ onDone }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n <= 0) { onDone(); return; }
    const t = setTimeout(() => setN(n - 1), 800);
    return () => clearTimeout(t);
  }, [n]);
  if (n <= 0) return null;
  const label = n === 0 ? 'GO!' : String(n);
  return (
    <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.25)',display:'grid',placeItems:'center',zIndex:30}}>
      <div key={n} className="pop-in" style={{
        fontFamily:"'Luckiest Guy'", fontSize: n === 0 ? 220 : 280, color: n === 0 ? 'var(--green)' : 'var(--yellow)',
        WebkitTextStroke: '8px var(--ink)', textShadow:'0 12px 0 var(--ink)'
      }}>{label}</div>
    </div>
  );
}

/* ==========  GAME 1: PIG SPRINT (tap race)  ========== */
function PigSprint({ state, onFinish, onQuit }) {
  const players = state.players;
  const FINISH = 1300;
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [positions, setPositions] = useState(() => players.map(()=>0));
  const [finishOrder, setFinishOrder] = useState([]);
  const tapCooldown = useRef(0);
  const difficulty = state.difficulty; // easy, medium, hard
  const cpuRateByDiff = { easy: 4.2, medium: 5.6, hard: 7.2 };
  const cpuRate = cpuRateByDiff[difficulty] || 5.6;

  // Phase mp/Stage 3 — subscribe phone-driven players to their own tap
  // events. Players with `remoteId` advance when that phone emits a
  // `tap` input. Purely additive — keyboard slot-0 tap path below still
  // works, and CPUs still auto-tick in the RAF loop below.
  const mp = (typeof window !== 'undefined') ? window.__BarnBashMPRT : null;
  useEffect(() => {
    if (!mp || !mp.broadcastMinigameStart) return;
    mp.broadcastMinigameStart('sprint', 'TAP AS FAST AS YOU CAN!', 'tap');
    return () => { mp.broadcastMinigameEnd && mp.broadcastMinigameEnd('sprint'); };
  }, [mp]);
  // broadcast live progress (0..FINISH) so phones can see their own lane
  useEffect(() => {
    if (!mp || !mp.broadcastScores) return;
    const byId = {};
    let leader = 0;
    players.forEach((p, i) => {
      const s = Math.round(positions[i] || 0);
      if (p.remoteId) byId[p.remoteId] = s;
      if (s > leader) leader = s;
    });
    mp.broadcastScores({ byId, leader, label: 'yards' });
  }, [mp, positions, players]);
  useEffect(() => {
    if (!mp || !mp.onInput) return;
    const off = mp.onInput(({ id, kind }) => {
      if (kind !== 'tap' || !started || finished) return;
      const idx = players.findIndex(p => p.remoteId === id);
      if (idx < 0) return;
      setPositions(prev => {
        const next = prev.slice();
        next[idx] = Math.min(FINISH, next[idx] + 22);
        return next;
      });
    });
    return () => { try { off && off(); } catch (_) {} };
  }, [mp, started, finished, players]);

  // clock
  const [time, setTime] = useState(0);

  // Drive CPU + check finish on RAF
  useRaf((dt) => {
    if (!started || finished) return;
    setTime(t => t + dt);
    setPositions(prev => {
      const next = prev.slice();
      for (let i = 0; i < next.length; i++) {
        if (players[i].isCPU) {
          const wobble = 1 + Math.sin((performance.now()/500) + i * 1.3) * 0.35;
          next[i] = Math.min(FINISH, next[i] + dt * (cpuRate * 12) * wobble * (0.9 + (i%2)*0.15));
        }
      }
      return next;
    });
  }, started && !finished);

  // Detect finishers
  useEffect(() => {
    const finishedNow = positions.map((p, i) => p >= FINISH ? i : -1).filter(i => i >= 0);
    setFinishOrder(prev => {
      const out = [...prev];
      for (const i of finishedNow) if (!out.includes(i)) out.push(i);
      return out;
    });
  }, [positions]);

  useEffect(() => {
    if (finishOrder.length >= players.length) {
      setFinished(true);
      const earned = Array(players.length).fill(0);
      finishOrder.forEach((pi, rank) => {
        earned[pi] = [5,3,1,0][rank] ?? 0;
      });
      setTimeout(() => onFinish(earned), 900);
    }
  }, [finishOrder]);

  // Human tap
  const tap = useCallback(() => {
    if (!started || finished) return;
    const now = performance.now();
    if (now - tapCooldown.current < 40) return; // cap
    tapCooldown.current = now;
    setPositions(prev => {
      const next = prev.slice();
      next[0] = Math.min(FINISH, next[0] + 22);
      return next;
    });
  }, [started, finished]);

  // Keyboard
  useEffect(() => {
    const down = (e) => {
      if (e.key === ' ' || e.code === 'Space' || e.key === 'ArrowRight') { e.preventDefault(); tap(); }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [tap]);

  // background clouds
  return (
    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, #b9e6f7 0%, #d5efcf 70%, #8fcf72 100%)', overflow:'hidden'}}>
      <Clouds count={5}/>

      {/* HUD */}
      <div style={{position:'absolute',top:20,left:20,right:20,display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:20}}>
        <Btn variant="cream" size="sm" onClick={onQuit}>◀ QUIT</Btn>
        <div className="plank" style={{padding:'8px 22px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:26}}>🏁 PIG SPRINT</span>
        </div>
        <div className="plank" style={{padding:'8px 16px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:20}}>{time.toFixed(1)}s</span>
        </div>
      </div>

      {/* Track */}
      <div style={{position:'absolute', left:80, right:80, top:120, bottom:200}}>
        {players.map((p, i) => (
          <div key={i} style={{
            position:'absolute', left:0, right:0,
            top: `${i * 140 + 20}px`,
            height:110,
            background: i % 2 === 0 ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.25)',
            border:'3px dashed rgba(255,255,255,.7)',
            borderRadius:24,
            overflow:'hidden'
          }}>
            {/* lane number */}
            <div style={{position:'absolute', left:10, top:10, fontFamily:"'Luckiest Guy'", fontSize:18, color:'var(--ink)', background:'#fff', padding:'2px 8px', borderRadius:8, border:'2px solid var(--ink)'}}>
              LANE {i+1}
            </div>
            {/* name tag */}
            <div style={{position:'absolute', right:10, top:10, fontFamily:"'Luckiest Guy'", fontSize:16, color:'var(--ink)', background:i===0?'#ffc93c':'#fff', padding:'2px 8px', borderRadius:8, border:'2px solid var(--ink)'}}>
              {playerLabel(p)} {finishOrder.indexOf(i) >= 0 && ['🥇','🥈','🥉','4️⃣'][finishOrder.indexOf(i)]}
            </div>
            {/* finish line */}
            <div style={{position:'absolute', right: 20, top: 10, bottom:10, width:8,
              backgroundImage:'repeating-linear-gradient(0deg, #000 0 10px, #fff 10px 20px)', border:'2px solid var(--ink)'}}/>

            {/* runner */}
            <div style={{
              position:'absolute', top: 18, left: `${8 + (positions[i] / FINISH) * (100 - 12)}%`,
              transform: 'translateX(-50%)',
              transition: 'left .08s linear'
            }}>
              <div style={{
                transform: `translateY(${Math.sin(performance.now()/120 + i) * (started && !finished ? 6 : 0)}px) rotate(${Math.sin(performance.now()/100 + i) * 8}deg)`
              }}>
                <Avatar char={p.char} size={72}/>
              </div>
              {/* dust */}
              {started && !finished && positions[i] < FINISH && (
                <div style={{position:'absolute', left:-30, top:55, width:30, height:10, background:'rgba(200,180,140,.6)', borderRadius:10, filter:'blur(2px)'}}/>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Player tap button */}
      <div style={{position:'absolute',bottom:30,left:0,right:0,display:'flex',justifyContent:'center',gap:20,zIndex:20}}>
        <button
          onMouseDown={tap}
          onTouchStart={(e)=>{e.preventDefault();tap();}}
          disabled={!started || finished || positions[0] >= FINISH}
          className={started && !finished ? 'pulse' : ''}
          style={{
            width: 280, height: 110,
            fontFamily:"'Luckiest Guy'", fontSize: 36, letterSpacing:2,
            background: 'var(--red)', color:'#fff',
            WebkitTextStroke:'2px var(--ink)',
            border:'5px solid var(--ink)', borderRadius:22,
            boxShadow:'0 10px 0 var(--ink)', cursor:'pointer',
          }}
        >
          TAP! TAP! TAP!
        </button>
        <div style={{fontFamily:"'Luckiest Guy'",color:'var(--ink)',fontSize:18,alignSelf:'center',maxWidth:300, background:'#fff', padding:'8px 12px', border:'3px solid var(--ink)', borderRadius:14}}>
          Mash <b>SPACE</b> or <b>TAP</b> to run.<br/>
          First across wins +5 coins.
        </div>
      </div>

      {!started && <Countdown onDone={()=>setStarted(true)}/>}
      {finished && (
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.3)',display:'grid',placeItems:'center',zIndex:40}}>
          <div className="pop-in" style={{fontFamily:"'Luckiest Guy'",fontSize:140,color:'var(--yellow)',WebkitTextStroke:'6px var(--ink)',textShadow:'0 8px 0 var(--ink)'}}>FINISH!</div>
        </div>
      )}
    </div>
  );
}

/* ==========  GAME 2: HAY PANIC (dodge falling bales)  ========== */
function HayPanic({ state, onFinish, onQuit }) {
  const players = state.players;
  const FIELD_W = 1400, FIELD_H = 540;
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [time, setTime] = useState(0);
  const survivalTime = useRef(players.map(() => 0));
  const [alive, setAlive] = useState(() => players.map(() => true));
  const [you, setYou] = useState({ x: FIELD_W/2, vx: 0 });
  const [cpus, setCpus] = useState(() => players.slice(1).map((_,i)=>({ x: (i+1) * FIELD_W / players.length, vx: 0, dir: Math.random() > .5 ? 1 : -1, nextTurn: 0.5 })));
  const [bales, setBales] = useState([]);
  const keys = useRef({ left:false, right:false });
  const difficulty = state.difficulty;
  const spawnByDiff = { easy: 0.45, medium: 0.28, hard: 0.18 };
  const spawnRate = spawnByDiff[difficulty] || 0.28;
  const baleSpeed = { easy: 280, medium: 340, hard: 420 }[difficulty] || 340;
  const spawnTimer = useRef(0);
  const baleId = useRef(0);

  useEffect(() => {
    const dn = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.current.right = true;
    };
    const up = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.current.right = false;
    };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);

  // Remote phone steering: per-remoteId { left, right } hold state. Used for
  // both P0 (if phone-assigned) and CPUs (if remoteId present overrides wander).
  const remoteSteer = useRef({});
  const mp = (typeof window !== 'undefined') ? window.__BarnBashMPRT : null;
  useEffect(() => {
    if (!mp || !mp.broadcastMinigameStart) return;
    mp.broadcastMinigameStart('haypanic', '◀ ▶ TO DODGE BALES!', 'steer');
    return () => { mp.broadcastMinigameEnd && mp.broadcastMinigameEnd('haypanic'); };
  }, [mp]);
  useEffect(() => {
    if (!mp || !mp.onInput) return;
    const off = mp.onInput(({ id, kind, data }) => {
      if (kind !== 'steer' || !data) return;
      const s = remoteSteer.current[id] || { left:false, right:false };
      if (data.dir === 'left')  s.left  = !!data.down;
      if (data.dir === 'right') s.right = !!data.down;
      remoteSteer.current[id] = s;
    });
    return () => { try { off && off(); } catch (_) {} };
  }, [mp]);

  useRaf((dt) => {
    if (!started || finished) return;
    setTime(t => t + dt);
    // spawn bales
    spawnTimer.current -= dt;
    if (spawnTimer.current <= 0) {
      spawnTimer.current = spawnRate * (0.7 + Math.random() * 0.6);
      setBales(prev => [...prev, {
        id: baleId.current++, x: Math.random() * FIELD_W, y: -60,
        vy: baleSpeed * (0.85 + Math.random()*0.3),
        rot: 0, vr: randBetween(-120, 120)
      }]);
    }
    // move bales
    setBales(prev => prev.map(b => ({
      ...b, y: b.y + b.vy * dt, rot: b.rot + b.vr * dt
    })).filter(b => b.y < FIELD_H + 80));

    // move you (P0): keyboard OR phone steer if player 0 has a remoteId
    setYou(prev => {
      let vx = 0;
      const p0rid = players[0] && players[0].remoteId;
      const rs = p0rid ? remoteSteer.current[p0rid] : null;
      const left  = keys.current.left  || (rs && rs.left);
      const right = keys.current.right || (rs && rs.right);
      if (left)  vx -= 460;
      if (right) vx += 460;
      const x = clamp(prev.x + vx * dt, 30, FIELD_W - 30);
      return { x, vx };
    });

    // move CPUs (or remote phones in cpu slots): phone steer overrides AI wander
    setCpus(prev => prev.map((c, idx) => {
      const pi = idx + 1;
      if (!alive[pi]) return c;
      let { x, dir, nextTurn } = c;
      const rid = players[pi] && players[pi].remoteId;
      const rs = rid ? remoteSteer.current[rid] : null;
      if (rs) {
        // phone-controlled: steer by held buttons, ignore wander/avoidance
        let vx = 0;
        if (rs.left)  vx -= 360;
        if (rs.right) vx += 360;
        x = clamp(x + vx * dt, 30, FIELD_W - 30);
        return { ...c, x, dir: rs.left ? -1 : rs.right ? 1 : dir };
      }
      nextTurn -= dt;
      if (nextTurn <= 0) { dir = Math.random() > .5 ? 1 : -1; nextTurn = 0.4 + Math.random()*0.9; }
      const avoid = bales.find(b => Math.abs(b.x - x) < 100 && b.y > FIELD_H * 0.3 && b.y < FIELD_H - 60);
      if (avoid) dir = avoid.x < x ? 1 : -1;
      const speed = (difficulty === 'hard' ? 360 : difficulty === 'easy' ? 240 : 300);
      x = clamp(x + dir * speed * dt, 30, FIELD_W - 30);
      return { ...c, x, dir, nextTurn };
    }));
  }, started && !finished);

  // collision + survival
  useEffect(() => {
    if (!started || finished) return;
    setAlive(prev => {
      let next = prev.slice();
      const check = (px, py) => bales.some(b => Math.hypot(b.x - px, b.y - py) < 46);
      // you
      if (next[0] && check(you.x, FIELD_H - 60)) next[0] = false;
      cpus.forEach((c, idx) => {
        const pi = idx + 1;
        if (next[pi] && check(c.x, FIELD_H - 60)) next[pi] = false;
      });
      return next;
    });
  }, [bales, you.x, cpus]);

  // survival clock per player
  useRaf((dt) => {
    if (!started || finished) return;
    alive.forEach((a, i) => { if (a) survivalTime.current[i] += dt; });
  }, started && !finished);

  // end when 1 left or time >= 30s
  useEffect(() => {
    const aliveCount = alive.filter(Boolean).length;
    if (!started || finished) return;
    if (aliveCount <= 1 || time >= 30) {
      setFinished(true);
      const ranking = survivalTime.current
        .map((t, i) => ({ i, t, aliveNow: alive[i] }))
        .sort((a,b)=>{
          if (a.aliveNow !== b.aliveNow) return a.aliveNow ? -1 : 1;
          return b.t - a.t;
        });
      const earned = Array(players.length).fill(0);
      ranking.forEach((r, rank) => earned[r.i] = [5,3,1,0][rank] ?? 0);
      setTimeout(() => onFinish(earned), 1000);
    }
  }, [alive, time]);

  return (
    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, #ffd9a0 0%, #f7b366 40%, #cf8a3a 100%)', overflow:'hidden'}}>
      {/* sky */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:120, background:'#ffe9b3'}}/>
      <Clouds count={3}/>

      {/* HUD */}
      <div style={{position:'absolute',top:20,left:20,right:20,display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:20}}>
        <Btn variant="cream" size="sm" onClick={onQuit}>◀ QUIT</Btn>
        <div className="plank" style={{padding:'8px 22px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:26}}>🌾 HAY PANIC</span>
        </div>
        <div className="plank" style={{padding:'8px 16px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:20}}>{Math.max(0,30 - time).toFixed(1)}s</span>
        </div>
      </div>

      {/* status row */}
      <div style={{position:'absolute',top:80,left:0,right:0,display:'flex',justifyContent:'center',gap:12,zIndex:20}}>
        {players.map((p, i) => (
          <div key={i} style={{
            background:'#fff', border:'3px solid var(--ink)', borderRadius:12,
            padding:'4px 10px', display:'flex', alignItems:'center', gap:6,
            opacity: alive[i] ? 1 : .5, textDecoration: alive[i] ? 'none':'line-through',
            transform: i===0 ? 'scale(1.05)' : 'none'
          }}>
            <Avatar char={p.char} size={32}/>
            <span style={{fontFamily:"'Luckiest Guy'", fontSize:14, color:'var(--ink)'}}>
              {playerLabel(p)} {i===0 && !p.displayName && '(YOU)'}
            </span>
            {alive[i] ? <span style={{color:'var(--green-dk)'}}>●</span> : <span>💥</span>}
          </div>
        ))}
      </div>

      {/* Field */}
      <div style={{
        position:'absolute', left:'50%', transform:'translateX(-50%)', top:140,
        width:FIELD_W, height:FIELD_H, background:'#6cc24a',
        border:'5px solid var(--ink)', borderRadius:20, overflow:'hidden',
        boxShadow:'inset 0 8px 0 rgba(0,0,0,.1), 0 10px 0 var(--ink)'
      }}>
        {/* grass stripes */}
        {Array.from({length:7}).map((_,i)=>(
          <div key={i} style={{
            position:'absolute',top:0,bottom:0,left:`${(i+1)*FIELD_W/8}px`,
            width:2, background:'rgba(0,0,0,.08)'
          }}/>
        ))}

        {/* falling bales */}
        {bales.map(b => <HayBale key={b.id} x={b.x} y={b.y} rot={b.rot}/>)}

        {/* you */}
        {alive[0] && (
          <div style={{ position:'absolute', left: you.x, top: FIELD_H - 100, transform:'translate(-50%, 0)'}}>
            <div style={{transform: `translateY(${Math.sin(time*8)*3}px) scaleX(${keys.current.left ? -1 : 1})`}}>
              <Avatar char={players[0].char} size={80}/>
            </div>
            <div style={{position:'absolute',top:-30,left:'50%',transform:'translateX(-50%)',background:'var(--red)',color:'#fff',border:'2px solid var(--ink)',borderRadius:8,padding:'1px 6px',fontFamily:"'Luckiest Guy'",fontSize:12}}>YOU</div>
            {/* shadow */}
            <div style={{position:'absolute',bottom:-6,left:'50%',transform:'translateX(-50%)',width:60,height:10,background:'rgba(0,0,0,.3)',borderRadius:'50%',filter:'blur(2px)'}}/>
          </div>
        )}

        {/* CPUs */}
        {cpus.map((c, idx) => {
          const pi = idx + 1;
          if (!alive[pi]) return null;
          return (
            <div key={idx} style={{ position:'absolute', left: c.x, top: FIELD_H - 100, transform:'translate(-50%, 0)'}}>
              <div style={{transform: `scaleX(${c.dir})`}}>
                <Avatar char={players[pi].char} size={72}/>
              </div>
              <div style={{position:'absolute',bottom:-6,left:'50%',transform:'translateX(-50%)',width:54,height:8,background:'rgba(0,0,0,.3)',borderRadius:'50%',filter:'blur(2px)'}}/>
            </div>
          );
        })}

        {/* splats for dead */}
        {players.map((p,i)=>{
          if (alive[i]) return null;
          const x = i === 0 ? you.x : cpus[i-1].x;
          return (
            <div key={i} style={{position:'absolute', left:x, top:FIELD_H - 60, transform:'translate(-50%,-50%)'}}>
              <div style={{fontSize:46}}>💫</div>
            </div>
          );
        })}
      </div>

      {/* Controls hint */}
      <div style={{position:'absolute',bottom:18,left:0,right:0,display:'flex',justifyContent:'center'}}>
        <div style={{background:'#fff',border:'3px solid var(--ink)',borderRadius:14,padding:'8px 16px',fontFamily:"'Luckiest Guy'",fontSize:18}}>
          ← → or A/D to dodge · Last critter standing wins!
        </div>
      </div>

      {!started && <Countdown onDone={()=>setStarted(true)}/>}
      {finished && (
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.3)',display:'grid',placeItems:'center',zIndex:40}}>
          <div className="pop-in" style={{fontFamily:"'Luckiest Guy'",fontSize:120,color:'var(--yellow)',WebkitTextStroke:'6px var(--ink)',textShadow:'0 8px 0 var(--ink)'}}>TIME!</div>
        </div>
      )}
    </div>
  );
}

function HayBale({ x, y, rot }) {
  return (
    <div style={{position:'absolute',left:x,top:y,transform:`translate(-50%,-50%) rotate(${rot}deg)`}}>
      <svg width="70" height="56" viewBox="0 0 70 56">
        <ellipse cx="35" cy="28" rx="32" ry="24" fill="#e8c064" stroke="#2a1a10" strokeWidth="3"/>
        {Array.from({length:6}).map((_,i)=>(
          <line key={i} x1="8" y1={12+i*7} x2="62" y2={10+i*7} stroke="#b8873a" strokeWidth="2"/>
        ))}
        <ellipse cx="35" cy="16" rx="28" ry="4" fill="rgba(255,255,255,.3)"/>
      </svg>
    </div>
  );
}

Object.assign(window, { PigSprint, HayPanic, Countdown });
