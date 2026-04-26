// src/games/egg-pass/EggPass.jsx
// Hot-potato egg: tap to pass before it pops in your hand.

/* ==========  GAME 5: EGG PASS  ==========
   A "hot potato" — a ticking egg moves around the ring. Each player has a window to tap
   SPACE to shove it to the next player. If time runs out in your hand — egg breaks, you're out.
*/
function EggPass({ state, onFinish, onQuit, game }) {
  const players = state.players;
  const N = players.length;
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [alive, setAlive] = useState(()=>players.map(()=>true));
  const [holder, setHolder] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3);
  const [baseTime, setBaseTime] = useState(3);
  const [shake, setShake] = useState(false);
  const [round, setRound] = useState(1);
  const [eliminated, setEliminated] = useState([]); // order eliminated
  const [eggPos, setEggPos] = useState({ x: 0, y: 0 });
  const [passing, setPassing] = useState(false);
  // Explosion state — fireball + eggshell debris radiating outward when
  // the egg blows. Pushed inside explode(); aged each frame; cleared
  // past 1.6s.
  const [explosions, setExplosions] = useState([]);
  // Fuse sparks — small particles trailing the egg's lit fuse. Spawned
  // probabilistically while the timer ticks down (denser as panic grows).
  const [sparks, setSparks] = useState([]);

  const difficulty = state.difficulty;
  const cpuReflex = { easy: [0.6, 1.2], medium: [0.3, 0.8], hard: [0.15, 0.4] }[difficulty] || [0.3, 0.8];

  // positions around a ring
  const CX = 800, CY = 470, R = 260;
  const slotPos = (i) => ({
    x: CX + Math.cos((i / N) * Math.PI * 2 - Math.PI/2) * R,
    y: CY + Math.sin((i / N) * Math.PI * 2 - Math.PI/2) * R,
  });

  useEffect(() => { setEggPos(slotPos(holder)); }, [holder, N]);

  useRaf((dt) => {
    if (!started || finished || passing) return;
    setTimeLeft(t => {
      const nt = t - dt;
      if (nt <= 0) {
        // Egg breaks on current holder
        explode();
        return 0;
      }
      if (nt < 1) setShake(true);
      return nt;
    });
    // age explosion particles
    setExplosions(ex => ex.map(e => ({ ...e, t: e.t + dt })).filter(e => e.t < 1.6));
    // spawn fuse sparks more often as the timer drops, then age them
    if (Math.random() < (1 - timeLeft/baseTime) * 0.5 + 0.1) {
      setSparks(s => [...s, {
        id: Math.random(), x: eggPos.x + (Math.random()-0.5)*8, y: eggPos.y - 34,
        vx: (Math.random()-0.5)*40, vy: -40 - Math.random()*50, t: 0
      }].slice(-40));
    }
    setSparks(s => s.map(sp => ({
      ...sp, x: sp.x + sp.vx*dt, y: sp.y + sp.vy*dt, t: sp.t + dt
    })).filter(sp => sp.t < 0.7));
  }, started && !finished);

  const aliveCount = alive.filter(Boolean).length;

  const passEgg = () => {
    if (!started || finished || passing) return;
    // find next alive player
    let next = holder;
    for (let k = 1; k <= N; k++) {
      const cand = (holder + k) % N;
      if (alive[cand]) { next = cand; break; }
    }
    setPassing(true);
    setShake(false);
    const from = slotPos(holder);
    const to = slotPos(next);
    // animate via state over 240ms
    const startT = performance.now();
    const dur = 240;
    const step = () => {
      const e = Math.min(1, (performance.now() - startT) / dur);
      const ease = 1 - Math.pow(1-e, 3);
      setEggPos({ x: from.x + (to.x - from.x) * ease, y: from.y + (to.y - from.y) * ease - Math.sin(ease * Math.PI) * 60 });
      if (e < 1) requestAnimationFrame(step);
      else {
        setHolder(next);
        setPassing(false);
        setTimeLeft(baseTime * 0.92);
        setBaseTime(b => Math.max(0.6, b * 0.96));
      }
    };
    requestAnimationFrame(step);
  };

  const explode = () => {
    const p = slotPos(holder);
    setExplosions(ex => [...ex, { id: Math.random(), x: p.x, y: p.y, t: 0 }]);
    setAlive(prev => { const next = prev.slice(); next[holder] = false; return next; });
    setEliminated(prev => [...prev, holder]);
    // pick next alive holder
    setTimeout(() => {
      let next = holder;
      for (let k = 1; k <= N; k++) {
        const cand = (holder + k) % N;
        if (alive[cand] && cand !== holder) { next = cand; break; }
      }
      setHolder(next);
      setBaseTime(3);
      setTimeLeft(3);
      setRound(r => r + 1);
      setShake(false);
    }, 900);
  };

  // CPU handler
  useEffect(() => {
    if (!started || finished || passing) return;
    const cur = players[holder];
    if (!cur || !cur.isCPU) return;
    const [lo, hi] = cpuReflex;
    const reactIn = lo + Math.random() * (hi - lo);
    const panicked = Math.random() < (difficulty === 'hard' ? 0.05 : difficulty === 'medium' ? 0.15 : 0.3);
    const react = panicked ? baseTime + 0.5 : Math.min(reactIn, Math.max(0.15, timeLeft - 0.2));
    const t = setTimeout(() => { if (!finished) passEgg(); }, react * 1000);
    return () => clearTimeout(t);
  }, [holder, passing, started]);

  // Win check
  useEffect(() => {
    if (aliveCount === 1 && !finished && started) {
      setTimeout(() => setFinished(true), 600);
    }
  }, [aliveCount, started, finished]);

  useEffect(() => {
    if (!finished) return;
    // earned: last alive = 5, then reverse order of elimination
    const order = [];
    const lastAliveIdx = alive.findIndex(Boolean);
    order.push(lastAliveIdx);
    for (let i = eliminated.length - 1; i >= 0; i--) order.push(eliminated[i]);
    const earned = Array(N).fill(0);
    const payouts = [5, 3, 2, 1, 0, 0];
    order.forEach((idx, rank) => { if (idx >= 0) earned[idx] = payouts[rank] ?? 0; });
    setTimeout(() => game.game.finish(earned), 1400);
  }, [finished]);

  // space = pass (human only)
  useEffect(() => {
    const d = (e) => {
      if ((e.key === ' ' || e.code === 'Space') && holder === 0 && alive[0] && !passing) {
        e.preventDefault(); passEgg();
      }
    };
    window.addEventListener('keydown', d);
    return () => window.removeEventListener('keydown', d);
  }, [holder, passing, alive, started]);

  // Phone tap from the current holder passes the egg. Broadcast whose
  // hands the egg is in so only the holder's phone lights up.
  useEffect(() => {
    const cur = players[holder];
    if (!cur) return;
    game.turn.set(cur.remoteId || null, {
      activeName: playerLabel(cur),
    });
  }, [game, holder, players]);
  useEffect(() => {
    const off = game.input.onTap((id) => {
      if (passing || finished || !started) return;
      const cur = players[holder];
      if (!cur || cur.remoteId !== id) return;
      if (!alive[holder]) return;
      passEgg();
    });
    return () => { try { off && off(); } catch (_) {} };
  }, [game, holder, passing, started, finished, alive]);

  const pct = Math.max(0, timeLeft / baseTime);

  const panic = pct < 0.3;

  return (
    <div style={{position:'absolute',inset:0,overflow:'hidden',
      background:'radial-gradient(ellipse at 50% 30%, #5a3a1c 0%, #3a2410 70%, #1a0e08 100%)'}}>
      {/* floorboards */}
      <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(90deg, #5a3a1c 0 120px, #4a3018 120px 124px)', opacity:.4}}/>
      {/* danger vignette intensifies as time runs out; tints red on panic */}
      <div style={{position:'absolute',inset:0,
        background:`radial-gradient(ellipse at center, transparent 30%, rgba(${panic?'180,30,30':'0,0,0'},${0.35 + (1-pct)*0.3}) 100%)`,
        transition:'background .2s'}}/>
      {/* lantern glow top */}
      <div style={{position:'absolute', top: -40, left:'50%', transform:'translateX(-50%)', width: 400, height: 240,
        background:'radial-gradient(ellipse, rgba(255,200,100,.35) 0%, transparent 60%)'}}/>

      {/* HUD */}
      <div style={{position:'absolute',top:20,left:20,right:20,display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:20}}>
        <Btn variant="cream" size="sm" onClick={onQuit}>◀ ВЫХОД</Btn>
        <div className="plank" style={{padding:'8px 22px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:26}}>🥚 ГОРЯЧЕЕ ЯЙЦО</span>
        </div>
        <div className="plank" style={{padding:'8px 16px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:20}}>R{round}</span>
        </div>
      </div>

      {/* Timer ring (center) — slightly larger with СЕК unit label and a
          translucent black puck behind the digits for readability over the
          floorboard pattern. */}
      <svg style={{position:'absolute', left: CX-100, top: CY-100, pointerEvents:'none'}} width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="88" fill="rgba(0,0,0,.3)" stroke="rgba(255,255,255,.15)" strokeWidth="10"/>
        <circle cx="100" cy="100" r="88" fill="none"
          stroke={pct < 0.33 ? '#e04b3b' : pct < 0.6 ? '#ffc93c' : '#6cc24a'}
          strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${pct * 553} 553`}
          transform="rotate(-90 100 100)"/>
        <text x="100" y="108" textAnchor="middle" fontFamily="Luckiest Guy" fontSize="52" fill="#fff" stroke="#2a1a10" strokeWidth="2">
          {timeLeft.toFixed(1)}
        </text>
        <text x="100" y="138" textAnchor="middle" fontFamily="Luckiest Guy" fontSize="14" fill="rgba(255,255,255,.7)">СЕК</text>
      </svg>

      {/* players around ring */}
      {players.map((p, i) => {
        const pos = slotPos(i);
        const isDead = !alive[i];
        const isHolder = i === holder && alive[i];
        return (
          <div key={i} style={{
            position:'absolute', left:`calc(50% - 800px + ${pos.x}px)`, top:pos.y,
            transform:'translate(-50%,-50%)',
            opacity: isDead ? 0.25 : 1,
            filter: isDead ? 'grayscale(1)' : 'none',
            transition:'all .4s ease',
          }}>
            <div style={{
              background: isHolder ? 'var(--yellow)' : '#fff',
              border:'4px solid var(--ink)', borderRadius:14, padding:10,
              boxShadow: isHolder ? '0 8px 0 var(--ink), 0 0 30px rgba(255,201,60,.8)' : '0 4px 0 var(--ink)',
              display:'flex', flexDirection:'column', alignItems:'center',
              transform: isHolder ? 'scale(1.15)' : 'scale(1)',
              transition:'all .3s ease',
            }}>
              <Avatar char={p.char} size={80} bob={isHolder}/>
              <div style={{fontFamily:"'Luckiest Guy'", fontSize:16, color:'var(--ink)', marginTop:4}}>
                {playerLabel(p)}
              </div>
              {i === 0 && !p.isCPU && <div style={{fontSize:10,fontFamily:"'Luckiest Guy'",color: isHolder && panic ? '#ffe96c' : 'var(--red)'}}>YOU</div>}
              {/* Panic sweat drops on the holder when time is running out */}
              {isHolder && panic && (
                <>
                  <div style={{position:'absolute', top:24, right:-6, fontSize:18, animation:'eggSweat .55s ease-in infinite'}}>💦</div>
                  <div style={{position:'absolute', top:32, left:-6, fontSize:14, animation:'eggSweat .65s ease-in infinite .1s'}}>💦</div>
                </>
              )}
              {isDead && <div style={{position:'absolute',top:-18,left:'50%',transform:'translateX(-50%) rotate(-8deg)',background:'var(--red)',color:'#fff',padding:'2px 10px',border:'3px solid var(--ink)',borderRadius:8,fontFamily:"'Luckiest Guy'"}}>OUT</div>}
            </div>
          </div>
        );
      })}
      <style>{`@keyframes eggSweat{0%{opacity:0;transform:translateY(-4px)}40%{opacity:1}100%{opacity:0;transform:translateY(20px)}}`}</style>

      {/* Fuse sparks — small glowing dots trailing the lit fuse. Density
          ramps up as panic grows so the egg feels like it's about to go. */}
      {sparks.map(sp => (
        <div key={'sp'+sp.id} style={{
          position:'absolute', left:`calc(50% - 800px + ${sp.x}px)`, top: sp.y,
          width: 4, height: 4, borderRadius:'50%',
          background: sp.t < 0.2 ? '#ffec8a' : '#ff6b3a',
          opacity: 1 - sp.t/0.7,
          boxShadow:'0 0 6px #ffb33a',
          pointerEvents:'none', zIndex: 14
        }}/>
      ))}

      {/* Explosion bursts — fireball + eggshell debris + POP! text. Each
          entry pops in, then scales outward and fades over 1.6s. */}
      {explosions.map(ex => {
        const scale = 1 + ex.t * 3;
        const opacity = Math.max(0, 1 - ex.t/1.6);
        return (
          <div key={ex.id} style={{
            position:'absolute', left:`calc(50% - 800px + ${ex.x}px)`, top: ex.y,
            transform:`translate(-50%,-50%) scale(${scale})`,
            opacity, pointerEvents:'none', zIndex: 20,
          }}>
            <div style={{width:180, height:180, borderRadius:'50%',
              background:'radial-gradient(circle, #fff59a 0 15%, #ffa03a 35%, #ff4a2a 55%, rgba(100,30,10,0) 75%)',
              filter: ex.t < 0.3 ? 'blur(0px)' : 'blur(2px)'
            }}/>
            {Array.from({length: 12}).map((_, k) => {
              const a = (k/12) * Math.PI * 2;
              const d = 30 + ex.t*140;
              return (
                <div key={k} style={{
                  position:'absolute', left: '50%', top:'50%',
                  transform:`translate(-50%,-50%) translate(${Math.cos(a)*d}px, ${Math.sin(a)*d + ex.t*80}px) rotate(${a*180/Math.PI + ex.t*360}deg)`,
                }}>
                  <svg width="16" height="12" viewBox="0 0 16 12">
                    <path d="M 1 6 Q 4 1 8 2 Q 13 3 15 7 Q 10 11 6 10 Q 2 9 1 6 Z" fill="#fff5e4" stroke="#2a1a10" strokeWidth="1.5"/>
                  </svg>
                </div>
              );
            })}
            {ex.t < 0.5 && (
              <div style={{position:'absolute', left:'50%', top:'50%',
                transform:`translate(-50%,-50%) scale(${1/scale})`,
                fontFamily:"'Luckiest Guy'", fontSize:56, color:'#ffe96c',
                WebkitTextStroke:'4px var(--ink)', textShadow:'0 4px 0 var(--ink)'
              }}>БУМ!</div>
            )}
          </div>
        );
      })}

      {/* Egg — scales 1.3x while passing through the air (sells the throw),
          and bloats slightly (1 + 8% of remaining tension) as the timer
          drops, so the egg visibly "swells with pressure" before exploding. */}
      <div style={{
        position:'absolute', left: `calc(50% - 800px + ${eggPos.x}px)`, top: eggPos.y,
        transform:`translate(-50%,-50%) ${shake?'rotate('+((Math.sin(performance.now()/30))*10)+'deg)':''} scale(${passing ? 1.3 : 1 + (1-pct)*0.08})`,
        transition: passing ? 'none' : 'transform .08s',
        zIndex: 15,
        pointerEvents:'none',
      }}>
        <svg width="90" height="110" viewBox="0 0 90 110" style={{filter:'drop-shadow(0 6px 0 rgba(0,0,0,.4))'}}>
          <ellipse cx="45" cy="58" rx="38" ry="48" fill="#fff5e4" stroke="#2a1a10" strokeWidth="4"/>
          <ellipse cx="32" cy="38" rx="12" ry="16" fill="#fff" opacity=".6"/>
          {/* Danger cracks — three stages: hairline shows up around half-time,
              a left branch in the second half, then a right branch in the
              final third. Visual countdown of how cooked the egg is. */}
          {pct < 0.6 && <path d="M 45 20 L 48 36 L 40 42 L 50 52" stroke="#2a1a10" strokeWidth="2" fill="none"/>}
          {pct < 0.4 && <path d="M 30 50 L 38 60 L 32 68 L 42 78" stroke="#2a1a10" strokeWidth="2" fill="none"/>}
          {pct < 0.25 && <path d="M 60 50 L 56 60 L 64 68 L 56 78" stroke="#2a1a10" strokeWidth="2" fill="none"/>}
          {/* fuse */}
          <path d="M 45 12 Q 55 4 62 8" stroke="#2a1a10" strokeWidth="3" fill="none"/>
          <circle cx="63" cy="8" r={pct < 0.5 ? 7 : 5} fill={pct < 0.3 ? '#e04b3b' : '#ffc93c'}/>
          <circle cx="63" cy="8" r={pct < 0.5 ? 4 : 3} fill="#fff" opacity=".8"/>
        </svg>
      </div>

      {/* Action button (human holder only). Yellow→red tint on panic; pressed
          shadow + warm glow when time runs out so the player feels urgency. */}
      {holder === 0 && alive[0] && !passing && !finished && (
        <div style={{position:'absolute',bottom:20,left:0,right:0,display:'flex',justifyContent:'center',zIndex:20}}>
          <button onClick={passEgg} className={panic ? 'pulse' : ''} style={{
            fontFamily:"'Luckiest Guy'", fontSize:36, padding:'16px 48px',
            background: panic ? 'var(--red)' : 'var(--yellow)', color:'#fff',
            WebkitTextStroke:'2px var(--ink)', border:'5px solid var(--ink)', borderRadius:20,
            boxShadow: `0 ${10 - (panic?4:0)}px 0 var(--ink), 0 0 ${panic?30:0}px rgba(255,100,60,.7)`,
            transform: panic ? 'translateY(4px)' : 'none',
            cursor:'pointer', transition:'background .2s, box-shadow .2s, transform .15s'
          }}>
            🥚 ПАСУЙ! (ПРОБЕЛ)
          </button>
        </div>
      )}
      {holder !== 0 && !finished && (
        <div style={{position:'absolute',bottom:30,left:0,right:0,textAlign:'center'}}>
          <div style={{display:'inline-block',background:'#fff',border:'3px solid var(--ink)',borderRadius:14,padding:'8px 16px',fontFamily:"'Luckiest Guy'",fontSize:18}}>
            {playerLabel(players[holder])} HAS THE EGG!
          </div>
        </div>
      )}

      {!started && <Countdown onDone={()=>setStarted(true)}/>}
      {finished && (() => {
        const winnerIdx = alive.findIndex(Boolean);
        const winner = winnerIdx >= 0 ? players[winnerIdx] : null;
        return (
          <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center, rgba(0,0,0,.1) 30%, rgba(0,0,0,.6) 80%)',display:'grid',placeItems:'center',zIndex:40}}>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:14}}>
              <div className="pop-in" style={{fontFamily:"'Luckiest Guy'",fontSize:110,color:'var(--yellow)',WebkitTextStroke:'5px var(--ink)',textShadow:'0 10px 0 var(--ink)'}}>ВЫЖИЛ!</div>
              {winner && (
                <div className="pop-in" style={{display:'flex',alignItems:'center',gap:14,background:'#fff',border:'5px solid var(--ink)',borderRadius:20,padding:'14px 22px',boxShadow:'0 10px 0 var(--ink)'}}>
                  <span style={{fontSize:44}}>🥚</span>
                  <Avatar char={winner.char} size={70}/>
                  <div>
                    <div style={{fontFamily:"'Luckiest Guy'",fontSize:16,color:'var(--wood-dk)'}}>ЦЕЛЫЙ И НЕВРЕДИМЫЙ</div>
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

/* ==========  GAME 6: MUD DASH  ==========
   Endless-runner style. Lanes of slippery mud. Jump over puddles, slide under ropes.
   Left/Right to switch lanes, SPACE to jump. Last 30s. Fewest hits wins.
*/

window.BB.games.register({
  id: 'egg',
  name: 'Горячее Яйцо',
  blurb: 'Яйцо-бомба. Поймал — пасуй дальше. Не сиди как идиот.',
  icon: '🥚',
  tint: '#fff5e4',
  phoneContract: 'tap',
  phonePrompt: 'ЯЙЦО У ТЕБЯ? ТАПАЙ ПОКА НЕ ВЗОРВАЛОСЬ!',
  rules: {
    name: 'Горячее Яйцо',
    tagline: 'Яйцо горячее. Как политические новости.',
    howTo: [
      'У кого-то в руках яйцо. Видно по жёлтой рамке.',
      'Поймал — ТАПАЙ быстро, яйцо улетит к другому.',
      'Задержался — яйцо взорвалось у тебя в руках. Минус очки, плюс позор.',
    ],
    control: '📱 ТАП когда яйцо у тебя',
    win: 'Последний не-взорвавшийся — победил',
  },
  component: EggPass,
});
