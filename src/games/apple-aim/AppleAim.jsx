// src/games/apple-aim/AppleAim.jsx
// Turn-based archery: each shooter oscillates angle, locks, then power,
// locks, then the arrow flies with gravity. Ring hit = 1-5 points.

/* ==========  GAME 3: APPLE AIM (archery)  ========== */
function AppleAim({ state, onFinish, onQuit, game }) {
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
  const [trail, setTrail] = useState([]); // ghost samples of arrow flight, last 18
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
        setTrail(tr => [...tr, { x: next.x, y: next.y }].slice(-18));
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
      setTrail([]);
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

  // Refs mirror the fast-oscillating angle/power so fire() can read the
  // latest values even when called from an effect closure that predates the
  // most recent RAF tick (phone tap → stale `power` → arrow dribbles).
  const angleRef = useRef(angle);
  const powerRef = useRef(power);
  useEffect(() => { angleRef.current = angle; }, [angle]);
  useEffect(() => { powerRef.current = power; }, [power]);

  // Phase-transition cooldown. A double-fire at the transport layer (one
  // physical tap triggered both touchstart + pointerdown on mobile) used to
  // skip `angle → power → fire` in a single press. TapContract now dedupes
  // by itself, but we belt-and-braces here: ignore any advance-input that
  // lands within 250 ms of the previous phase change.
  const phaseChangedAtRef = useRef(0);
  useEffect(() => { phaseChangedAtRef.current = Date.now(); }, [phase]);
  const canAdvance = () => Date.now() - phaseChangedAtRef.current >= 250;

  const fire = (ang = angleRef.current, pow = powerRef.current) => {
    const rad = ang * Math.PI / 180;
    const speed = 300 + pow * 8;
    setArrow({ x: archerX + 30, y: archerY, vx: Math.cos(rad) * speed, vy: -Math.sin(rad) * speed, rot: -ang });
    setPhase('fly');
  };

  const onAction = () => {
    if (!started || finished || currentPlayer.isCPU) return;
    if (!canAdvance()) return;
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

  // Phone tap from the current shooter advances the phase. Guarded by the
  // same 250ms cooldown so a stray double-event can't walk through two
  // phases on one human tap.
  useEffect(() => {
    const off = game.input.onTap((id) => {
      if (!currentPlayer || currentPlayer.remoteId !== id) return;
      if (!canAdvance()) return;
      if (phase === 'angle') setPhase('power');
      else if (phase === 'power') fire();
    });
    return () => { try { off && off(); } catch (_) {} };
  }, [game, phase, currentPlayer, started, finished]);
  useEffect(() => {
    const byId = {};
    let leader = 0;
    players.forEach((p, i) => {
      const s = scores[i] || 0;
      if (p.remoteId) byId[p.remoteId] = s;
      if (s > leader) leader = s;
    });
    game.score.update(byId, { leader, label: 'rings' });
  }, [game, scores, players]);
  // Turn-based: tell phones whose turn it is so the non-active shooter
  // doesn't stare at a TAP pad wondering why nothing happens.
  useEffect(() => {
    if (!currentPlayer) return;
    game.turn.set(currentPlayer.remoteId || null, {
      activeName: playerLabel(currentPlayer),
      phase,
    });
  }, [game, turn, currentPlayer, phase]);

  // finish
  useEffect(() => {
    if (!finished) return;
    const earned = [...scores.map((s,i)=>({i,s}))].sort((a,b)=>b.s-a.s)
      .reduce((acc, r, rank) => { acc[r.i] = [5,3,1,0][rank] ?? 0; return acc; }, Array(players.length).fill(0));
    setTimeout(() => game.game.finish(earned), 1500);
  }, [finished]);

  return (
    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, #d9a36a 0%, #e8c08f 40%, #c49258 80%, #8f6a3b 100%)', overflow:'hidden'}}>
      {/* sun */}
      <div style={{position:'absolute', top:80, right:120, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle, #fff5a8 0%, #ffd26b 70%, transparent 100%)', filter:'blur(2px)'}}/>
      <Clouds count={3}/>
      {/* distant treeline */}
      <svg width="100%" height="140" viewBox="0 0 1600 140" preserveAspectRatio="none"
        style={{position:'absolute', top:90, left:0}}>
        <path d="M0 140 Q80 80 160 100 T320 95 T480 85 T640 100 T800 90 T960 95 T1120 80 T1280 100 T1440 85 T1600 95 L1600 140 Z"
          fill="#6b7a4a" opacity=".55"/>
      </svg>

      {/* HUD */}
      <div style={{position:'absolute',top:20,left:20,right:20,display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:20}}>
        <Btn variant="cream" size="sm" onClick={onQuit}>◀ ВЫХОД</Btn>
        <div className="plank" style={{padding:'8px 22px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:26}}>🎯 ЯБЛОЧКО В ГЛАЗ</span>
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
        {/* Orchard trees in mid-ground */}
        {[{x:360,y:80,s:.7},{x:640,y:60,s:.8},{x:920,y:100,s:.6},{x:1200,y:70,s:.75}].map((t,i)=>(
          <div key={'tr'+i} style={{position:'absolute', left:t.x, top:t.y, transform:`scale(${t.s})`, transformOrigin:'50% 100%'}}>
            <svg width="120" height="140" viewBox="0 0 120 140">
              <rect x="50" y="70" width="20" height="60" fill="#6b4a2e" stroke="#2a1a10" strokeWidth="3"/>
              <circle cx="60" cy="50" r="48" fill="#5a9a3a" stroke="#2a1a10" strokeWidth="3"/>
              <circle cx="40" cy="40" r="8" fill="#e04b3b" stroke="#2a1a10" strokeWidth="2"/>
              <circle cx="80" cy="48" r="8" fill="#e04b3b" stroke="#2a1a10" strokeWidth="2"/>
              <circle cx="62" cy="62" r="8" fill="#e04b3b" stroke="#2a1a10" strokeWidth="2"/>
              <circle cx="30" cy="60" r="6" fill="#e04b3b" stroke="#2a1a10" strokeWidth="2"/>
            </svg>
          </div>
        ))}

        {/* Ground */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:48,
          background:'linear-gradient(180deg, #7a5028 0%, #5a3018 100%)',borderTop:'3px solid var(--ink)'}}/>
        {/* grass tufts */}
        {Array.from({length:14}).map((_,i)=>(
          <div key={'gr'+i} style={{position:'absolute', bottom: 44, left: 80 + i*95, width:20, height:10,
            background:'radial-gradient(ellipse at center bottom, #4a8a35 0 60%, transparent 62%)', opacity:.8}}/>
        ))}
        {/* target — subtle idle bob via performance.now(); tick state in
            useRaf already drives re-renders so the animation feels alive */}
        <div style={{position:'absolute', left: targetX - 70, top: targetY - 70, width:140, height:140,
          transform: `translateY(${Math.sin(performance.now()/1200)*3}px)`,
          filter:'drop-shadow(0 6px 0 rgba(0,0,0,.2))'
        }}>
          {/* pole */}
          <div style={{position:'absolute', left:64, top:70, width:12, height:110, background:'#6b4a2e', border:'2px solid var(--ink)'}}/>
          {[[5,'#ffc93c'],[4,'#4aa3e0'],[3,'#e04b3b'],[2,'#fff'],[1,'#6cc24a']].map(([r,c],i)=>{
            // Glow the most recent hit's ring while we're still in 'result'
            // phase (~1.2s before the next shot resets). Keeps the player
            // visually anchored on where the arrow landed.
            const lastHit = hits[hits.length - 1];
            const glowing = phase === 'result' && lastHit && lastHit.ring === r;
            return (
              <div key={i} style={{
                position:'absolute', inset: 16 * i, borderRadius:'50%',
                background: c, border: '3px solid var(--ink)',
                display:'grid', placeItems:'center', fontFamily:"'Luckiest Guy'", color:'var(--ink)', fontSize: i === 4 ? 18 : 0,
                boxShadow: glowing ? '0 0 24px rgba(255,255,100,.95), 0 0 8px rgba(255,255,255,.7)' : 'none',
                transition: glowing ? 'none' : 'box-shadow .3s ease-out'
              }}>{i === 4 ? r : ''}</div>
            );
          })}
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
          {/* bow + aim line. Bow arc bends back as power builds in 'power'
              phase. Bowstring snaps into a V; a nocked arrow rides the
              draw position so the player can read the shot tension visually. */}
          <svg width="240" height="240" viewBox="-120 -120 240 240" style={{position:'absolute', left:-120 + 40, top:-120 - 20, overflow:'visible', pointerEvents:'none'}}>
            {(() => {
              const drawAmt = phase === 'power' ? power/100 : 0;
              return (
                <>
                  <path d={`M ${20 - drawAmt*4} -22 Q ${52 + drawAmt*6} 0 ${20 - drawAmt*4} 22`}
                    stroke="#6b4a2e" strokeWidth="5" fill="none" strokeLinecap="round"/>
                  <path d={`M ${20 - drawAmt*4} -22 L ${20 - drawAmt*22} 0 L ${20 - drawAmt*4} 22`}
                    stroke="#f4e0b0" strokeWidth="2" fill="none"/>
                  {phase === 'power' && (
                    <line x1={20 - drawAmt*22} y1={0} x2={20 - drawAmt*22 + 50} y2={0}
                      stroke="#8f6a3b" strokeWidth="3"/>
                  )}
                </>
              );
            })()}
            {(phase === 'angle' || phase === 'power') && (
              <line x1="0" y1="0"
                x2={Math.cos(-angle * Math.PI/180) * 180}
                y2={Math.sin(-angle * Math.PI/180) * 180}
                stroke="rgba(255,255,255,.8)" strokeWidth="3" strokeDasharray="6 4"/>
            )}
          </svg>
        </div>

        {/* Arrow flight trail — fading ghost samples (most recent brightest) */}
        {trail.map((t, i) => (
          <div key={'tr'+i} style={{
            position:'absolute', left:t.x, top:t.y, transform:'translate(-50%,-50%)',
            width: 6, height: 6, borderRadius:'50%',
            background:`rgba(255,255,255,${(i/trail.length)*0.55})`,
            pointerEvents:'none'
          }}/>
        ))}

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
      {finished && (() => {
        const topIdx = scores.map((s,i)=>({s,i})).sort((a,b)=>b.s-a.s)[0].i;
        const winner = players[topIdx];
        return (
          <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center, rgba(0,0,0,.1) 30%, rgba(0,0,0,.55) 80%)',display:'grid',placeItems:'center',zIndex:40}}>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:14}}>
              <div className="pop-in" style={{fontFamily:"'Luckiest Guy'",fontSize:120,color:'var(--yellow)',WebkitTextStroke:'6px var(--ink)',textShadow:'0 8px 0 var(--ink)'}}>КОНЕЦ МАТЧА!</div>
              <div className="pop-in" style={{display:'flex',alignItems:'center',gap:14,background:'#fff',border:'5px solid var(--ink)',borderRadius:20,padding:'14px 22px',boxShadow:'0 10px 0 var(--ink)'}}>
                <span style={{fontSize:44}}>🏆</span>
                <Avatar char={winner.char} size={70}/>
                <div>
                  <div style={{fontFamily:"'Luckiest Guy'",fontSize:16,color:'var(--wood-dk)'}}>СНАЙПЕР</div>
                  <div style={{fontFamily:"'Luckiest Guy'",fontSize:32,color:'var(--ink)'}}>{playerLabel(winner)}</div>
                </div>
                <div style={{fontFamily:"'Luckiest Guy'",fontSize:28,color:'var(--red)',WebkitTextStroke:'1.5px var(--ink)'}}>{scores[topIdx]} оч.</div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

window.BB.games.register({
  id: 'aim',
  name: 'Яблочко в Глаз',
  blurb: 'Стрельба из лука. Целься в яблоко, не в соседа.',
  icon: '🎯',
  tint: '#e04b3b',
  phoneContract: 'tap',
  phonePrompt: 'ТАП 1 — УГОЛ · ТАП 2 — ВЫСТРЕЛ',
  rules: {
    name: 'Яблочко в Глаз',
    tagline: 'Лук, яблоко, никакой дипломатии.',
    howTo: [
      'ПЕРВЫЙ тап фиксирует угол полёта стрелы.',
      'ВТОРОЙ тап фиксирует силу натяжения — и стрела летит.',
      'Центр мишени = 5 очков. Промах = 0. Дважды промахнулся — шанса уже нет.',
    ],
    control: '📱 ТАП · ТАП · ⌨ ПРОБЕЛ',
    win: 'Больше всего попаданий за 3 выстрела',
  },
  component: AppleAim,
});
