// src/games/hay-panic/HayPanic.jsx
// Dodge falling bales. Last critter standing wins. Includes the small
// HayBale SVG helper that renders each falling tile.

/* ==========  GAME 2: HAY PANIC (dodge falling bales)  ========== */
function HayPanic({ state, onFinish, onQuit, game }) {
  const players = state.players;
  const FIELD_W = 1400, FIELD_H = 540;
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [time, setTime] = useState(0);
  const survivalTime = useRef(players.map(() => 0));
  const [alive, setAlive] = useState(() => players.map(() => true));
  // Spread P0 and the CPU lane(s) across the field so 2-player games
  // don't spawn both critters on the exact same pixel (P0 at W/2 clashed
  // with cpu[0] = 1 * W/2 in the old formula).
  const [you, setYou] = useState({ x: FIELD_W / (players.length + 1), vx: 0 });
  const [cpus, setCpus] = useState(() => players.slice(1).map((_,i)=>({
    x: (i + 2) * FIELD_W / (players.length + 1),
    vx: 0, dir: Math.random() > .5 ? 1 : -1, nextTurn: 0.5
  })));
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
  useEffect(() => {
    const off = game.input.onSteer((id, data) => {
      if (!data) return;
      const s = remoteSteer.current[id] || { left:false, right:false };
      if (data.dir === 'left')  s.left  = !!data.down;
      if (data.dir === 'right') s.right = !!data.down;
      remoteSteer.current[id] = s;
    });
    return () => { try { off && off(); } catch (_) {} };
  }, [game]);

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

    // move you (P0): CPU-fallback if the slot is flagged isCPU (dropped
    // phone), otherwise keyboard OR phone steer if the slot has a remoteId.
    setYou(prev => {
      const p0 = players[0] || {};
      if (p0.isCPU) {
        // wander + bale-avoidance AI takes over stranded lane
        const dir = (prev._dir || 1);
        const avoid = bales.find(b => Math.abs(b.x - prev.x) < 100 && b.y > FIELD_H * 0.3 && b.y < FIELD_H - 60);
        const useDir = avoid ? (avoid.x < prev.x ? 1 : -1) : dir;
        const speed = (difficulty === 'hard' ? 360 : difficulty === 'easy' ? 240 : 300);
        const nx = clamp(prev.x + useDir * speed * dt, 30, FIELD_W - 30);
        return { x: nx, vx: useDir * speed, _dir: useDir };
      }
      let vx = 0;
      const p0rid = p0.remoteId;
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
      setTimeout(() => game.game.finish(earned), 1000);
    }
  }, [alive, time]);

  return (
    <div style={{position:'absolute',inset:0,overflow:'hidden',
      background:'linear-gradient(180deg, #ffe4a8 0%, #f3b566 38%, #cf8a3a 100%)'}}>
      {/* Sun */}
      <div style={{position:'absolute', top:30, right:80, width:100, height:100, borderRadius:'50%',
        background:'radial-gradient(circle, #fff59a 0 40%, #ffcd3a 60%, transparent 75%)',
        boxShadow:'0 0 60px rgba(255,200,90,.5)'}}/>
      {/* distant hills */}
      <svg width="100%" height="160" viewBox="0 0 1600 160" preserveAspectRatio="none"
        style={{position:'absolute', top:80, left:0}}>
        <path d="M0 160 L240 70 L420 110 L600 60 L820 120 L1000 70 L1200 110 L1400 60 L1600 110 L1600 160 Z" fill="#caa55a" opacity=".6"/>
      </svg>
      {/* big red barn */}
      <div style={{position:'absolute', top:100, left:140, width:220, height:140, filter:'drop-shadow(0 8px 0 rgba(0,0,0,.2))'}}>
        <svg viewBox="0 0 220 140" width="100%" height="100%">
          <polygon points="10,60 110,8 210,60 210,140 10,140" fill="#b44532" stroke="#2a1a10" strokeWidth="4"/>
          <polygon points="0,68 110,6 220,68 210,60 110,18 10,60" fill="#6e2818" stroke="#2a1a10" strokeWidth="4"/>
          <rect x="88" y="78" width="44" height="62" fill="#3a1f12" stroke="#2a1a10" strokeWidth="3"/>
          <path d="M88 96 H132 M110 78 V140" stroke="#7a5030" strokeWidth="3"/>
          <rect x="26" y="76" width="32" height="28" fill="#f4ddaa" stroke="#2a1a10" strokeWidth="3"/>
          <rect x="162" y="76" width="32" height="28" fill="#f4ddaa" stroke="#2a1a10" strokeWidth="3"/>
        </svg>
      </div>
      {/* silo */}
      <div style={{position:'absolute', top:90, right:180, width:60, height:150, filter:'drop-shadow(0 8px 0 rgba(0,0,0,.2))'}}>
        <svg viewBox="0 0 60 150" width="100%" height="100%">
          <ellipse cx="30" cy="20" rx="28" ry="14" fill="#9aa6b0" stroke="#2a1a10" strokeWidth="3"/>
          <path d="M2 20 V130 Q30 144 58 130 V20" fill="#c5cfd8" stroke="#2a1a10" strokeWidth="3"/>
          <line x1="16" y1="30" x2="16" y2="132" stroke="#8090a0" strokeWidth="1.5"/>
          <line x1="44" y1="30" x2="44" y2="132" stroke="#8090a0" strokeWidth="1.5"/>
          <ellipse cx="30" cy="8" rx="26" ry="8" fill="#b8c0c8" stroke="#2a1a10" strokeWidth="3"/>
        </svg>
      </div>
      <Clouds count={3}/>

      {/* HUD */}
      <div style={{position:'absolute',top:20,left:20,right:20,display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:20}}>
        <Btn variant="cream" size="sm" onClick={onQuit}>◀ ВЫХОД</Btn>
        <div className="plank" style={{padding:'8px 22px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:26}}>🌾 СЕННАЯ ПАНИКА</span>
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

        {/* Survivor spotlight — radial glow on the last critter standing */}
        {started && !finished && alive.filter(Boolean).length === 1 && (() => {
          const survivorIdx = alive.findIndex(Boolean);
          const sx = survivorIdx === 0 ? you.x : cpus[survivorIdx-1].x;
          return (
            <div style={{position:'absolute', left: sx, top: FIELD_H - 90, transform:'translate(-50%, -50%)', pointerEvents:'none',
              width: 180, height: 180,
              background:'radial-gradient(circle, rgba(255,255,200,.55) 0 35%, rgba(255,255,200,0) 70%)',
              animation:'survivorPulse 0.8s ease-in-out infinite'
            }}/>
          );
        })()}

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

      <style>{`@keyframes survivorPulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.55}50%{transform:translate(-50%,-50%) scale(1.08);opacity:.85}}`}</style>

      {/* Controls hint */}
      <div style={{position:'absolute',bottom:18,left:0,right:0,display:'flex',justifyContent:'center'}}>
        <div style={{background:'#fff',border:'3px solid var(--ink)',borderRadius:14,padding:'8px 16px',fontFamily:"'Luckiest Guy'",fontSize:18}}>
          ← → or A/D to dodge · Last critter standing wins!
        </div>
      </div>

      {!started && <Countdown onDone={()=>setStarted(true)}/>}
      {finished && (() => {
        const survivorIdx = alive.findIndex(a => a);
        const allDead = alive.every(a => !a);
        const winner = survivorIdx >= 0 ? players[survivorIdx] : null;
        return (
          <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center, rgba(0,0,0,.1) 30%, rgba(0,0,0,.55) 80%)',display:'grid',placeItems:'center',zIndex:40}}>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:14}}>
              <div className="pop-in" style={{fontFamily:"'Luckiest Guy'",fontSize:120,color:'var(--yellow)',WebkitTextStroke:'6px var(--ink)',textShadow:'0 8px 0 var(--ink)'}}>
                {allDead ? 'РАЗГРОМ!' : winner ? 'ВЫЖИЛ!' : 'ВРЕМЯ!'}
              </div>
              {winner && (
                <div className="pop-in" style={{display:'flex',alignItems:'center',gap:14,background:'#fff',border:'5px solid var(--ink)',borderRadius:20,padding:'14px 22px',boxShadow:'0 10px 0 var(--ink)'}}>
                  <span style={{fontSize:44}}>🏆</span>
                  <Avatar char={winner.char} size={70}/>
                  <div>
                    <div style={{fontFamily:"'Luckiest Guy'",fontSize:16,color:'var(--wood-dk)'}}>ПОСЛЕДНИЙ ВЫЖИЛ</div>
                    <div style={{fontFamily:"'Luckiest Guy'",fontSize:32,color:'var(--ink)'}}>{playerLabel(winner)}</div>
                  </div>
                  <div style={{fontFamily:"'Luckiest Guy'",fontSize:28,color:'var(--red)',WebkitTextStroke:'1.5px var(--ink)'}}>+5🪙</div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
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

window.BB.games.register({
  id: 'hay',
  name: 'Сенная Паника',
  blurb: 'С неба сыпятся тюки. Не стой там где они падают.',
  icon: '🌾',
  tint: '#8acb4a',
  phoneContract: 'steer',
  phonePrompt: '⬅ ➡ ЧТОБ НЕ СТАТЬ ТЮКОМ',
  rules: {
    name: 'Сенная Паника',
    tagline: 'С неба летят тюки. Не зевай.',
    howTo: [
      'Двигайся влево-вправо, уворачивайся.',
      'Попал под тюк — тюк, оказывается, тяжёлый. Минус жизнь.',
      'Последний кто не стал блином — победил.',
    ],
    control: '📱 ⬅ ➡ · ⌨ A / D',
    win: 'Последний выживший забирает всё',
  },
  component: HayPanic,
});
