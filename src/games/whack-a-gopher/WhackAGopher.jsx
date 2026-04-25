// src/games/whack-a-gopher/WhackAGopher.jsx
// Bop gophers (+1) and golden gophers (+3); skip bunnies (-1). 25-second
// round. GopherFace + BunnyFace SVG helpers ride along.

/* ==========  GAME 4: WHACK-A-GOPHER ==========
   5 holes; gophers pop up (+1) and bunnies sometimes (−1). You have limited time.
   You = whacker, controls by clicking a hole. CPUs auto-whack nearby pops.
*/
function WhackAGopher({ state, onFinish, onQuit, game }) {
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
  // Hammer animation: each entry tracks a recent whack at hole `h` with elapsed
  // time `t`; aged in the main RAF and removed past 0.35s.
  const [hammers, setHammers] = useState([]);
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
    // age hammer animations
    setHammers(hs => hs.map(h => ({ ...h, t: h.t + dt })).filter(h => h.t < 0.35));

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
    // Always trigger hammer swing — even on a missed (empty) hole, so the
    // player gets feedback from their click/tap.
    setHammers(hs => [...hs, { id: Date.now()+Math.random(), h, t: 0, by: pi }]);
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

  // Phone holes contract — each remote player's hole tap maps to their slot.
  useEffect(() => {
    const byId = {};
    let leader = 0;
    players.forEach((p, i) => {
      const s = scores[i] || 0;
      if (p.remoteId) byId[p.remoteId] = s;
      if (s > leader) leader = s;
    });
    game.score.update(byId, { leader, label: 'bops' });
  }, [game, scores, players]);
  useEffect(() => {
    const off = game.input.onHoles((id, data) => {
      if (!data) return;
      const h = data.h;
      if (typeof h !== 'number' || h < 0 || h >= HOLES) return;
      const pi = players.findIndex(pp => pp.remoteId === id);
      if (pi < 0) return;
      whackFor(pi, h);
    });
    return () => { try { off && off(); } catch (_) {} };
  }, [game, started, finished]);

  useEffect(() => {
    if (!finished) return;
    const earned = [...scores.map((s,i)=>({i,s}))].sort((a,b)=>b.s-a.s)
      .reduce((acc, r, rank) => { acc[r.i] = [5,3,1,0][rank] ?? 0; return acc; }, Array(players.length).fill(0));
    setTimeout(() => game.game.finish(earned), 1200);
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
    <div style={{position:'absolute',inset:0,overflow:'hidden',
      background:'linear-gradient(180deg, #ffe4a8 0%, #e2b66a 40%, #a87c42 80%, #6a4020 100%)'}}>
      {/* Sun */}
      <div style={{position:'absolute', top:40, right:120, width:120, height:120, borderRadius:'50%',
        background:'radial-gradient(circle, #fff59a 0%, #ffd26b 55%, transparent 80%)', filter:'blur(1px)'}}/>
      {/* Picket fence */}
      <svg width="100%" height="70" viewBox="0 0 1600 70" preserveAspectRatio="none"
        style={{position:'absolute', top:130, left:0}}>
        {Array.from({length:40}).map((_,i)=>(
          <polygon key={i} points={`${i*40},20 ${i*40+30},20 ${i*40+30},70 ${i*40},70`} fill="#f6e7c3" stroke="#2a1a10" strokeWidth="2"/>
        ))}
        <line x1="0" y1="30" x2="1600" y2="30" stroke="#2a1a10" strokeWidth="2"/>
        <line x1="0" y1="55" x2="1600" y2="55" stroke="#2a1a10" strokeWidth="2"/>
      </svg>
      <Clouds count={3}/>
      {/* HUD */}
      <div style={{position:'absolute',top:20,left:20,right:20,display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:20}}>
        <Btn variant="cream" size="sm" onClick={onQuit}>◀ ВЫХОД</Btn>
        <div className="plank" style={{padding:'8px 22px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:26}}>🔨 СУСЛИК, ПОШЁЛ ВОН</span>
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
            {/* pop-up critter — gold gophers get a pulsing aura halo so the
                player can spot them out of the corner of an eye. */}
            {pop && (
              <div className="pop-in" style={{
                position:'absolute', left:'50%', bottom: 30, transform:'translateX(-50%)',
              }}>
                {pop.kind === 'gopher' && <GopherFace/>}
                {pop.kind === 'bunny' && <BunnyFace/>}
                {pop.kind === 'golden' && (
                  <div style={{position:'relative'}}>
                    <div style={{position:'absolute', left:'50%', top:'50%',
                      transform:'translate(-50%,-50%)', width:120, height:120, borderRadius:'50%',
                      background:'radial-gradient(circle, rgba(255,220,90,.7) 0 35%, transparent 70%)',
                      animation:'goldAura 0.7s ease-in-out infinite', pointerEvents:'none'}}/>
                    <GopherFace gold/>
                  </div>
                )}
              </div>
            )}
            {/* swinging hammer animation on a recent whack at this hole.
                Uses an IIFE so we can pull the latest matching hammer entry
                from the hammers array and rotate from -60° → +10° over .35s,
                with a subtle scale bump for impact. */}
            {(() => {
              const hit = hammers.find(h => h.h === i);
              if (!hit) return null;
              const t = hit.t;
              const rot = t < 0.15 ? -60 + (t/0.15)*70 : 10 - ((t-0.15)/0.2)*50;
              const scale = t < 0.18 ? 1 : 1.2;
              return (
                <>
                  <div style={{
                    position:'absolute', left:'50%', top:-12, transform:`translateX(-50%) rotate(${rot}deg) scale(${scale})`,
                    pointerEvents:'none', transformOrigin:'50% 80%', fontSize:60,
                    filter:'drop-shadow(0 4px 0 rgba(0,0,0,.4))', zIndex:5
                  }}>🔨</div>
                  {t < 0.2 && pop !== null && (
                    <div style={{position:'absolute', left:'50%', bottom:36, transform:`translateX(-50%) scale(${1 + t*3})`, opacity: 1 - t*5, pointerEvents:'none'}}>
                      <div style={{width:110, height:110, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,240,200,.9) 0 30%, rgba(255,200,100,.3) 50%, transparent 70%)'}}/>
                    </div>
                  )}
                </>
              );
            })()}
            {/* hover hammer preview — only when no swing is currently animating */}
            {hoverHole === i && !hammers.some(h => h.h === i) && (
              <div style={{position:'absolute', left:'50%', top:-20, transform:'translateX(-50%) rotate(-30deg)', fontSize:44, pointerEvents:'none', opacity:.75}}>🔨</div>
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

      <style>{`@keyframes floatUp{ 0%{opacity:0; transform:translateY(0)} 20%{opacity:1; transform:translateY(-10px)} 100%{opacity:0; transform:translateY(-60px)} }
        @keyframes goldAura{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.6}50%{transform:translate(-50%,-50%) scale(1.15);opacity:1}}`}</style>

      {!started && <Countdown onDone={()=>setStarted(true)}/>}
      {finished && (() => {
        const topIdx = scores.map((s,i)=>({s,i})).sort((a,b)=>b.s-a.s)[0].i;
        const winner = players[topIdx];
        return (
          <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center, rgba(0,0,0,.1) 30%, rgba(0,0,0,.55) 80%)',display:'grid',placeItems:'center',zIndex:40}}>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:14}}>
              <div className="pop-in" style={{fontFamily:"'Luckiest Guy'",fontSize:120,color:'var(--yellow)',WebkitTextStroke:'6px var(--ink)',textShadow:'0 8px 0 var(--ink)'}}>ВРЕМЯ!</div>
              <div className="pop-in" style={{display:'flex',alignItems:'center',gap:14,background:'#fff',border:'5px solid var(--ink)',borderRadius:20,padding:'14px 22px',boxShadow:'0 10px 0 var(--ink)'}}>
                <span style={{fontSize:44}}>🏆</span>
                <Avatar char={winner.char} size={70}/>
                <div>
                  <div style={{fontFamily:"'Luckiest Guy'",fontSize:16,color:'var(--wood-dk)'}}>ТОП МОЛОТОБОЕЦ</div>
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

window.BB.games.register({
  id: 'gopher',
  name: 'Суслик, Пошёл Вон',
  blurb: 'Бей сусликов. Не бей зайчиков. Они не виноваты.',
  icon: '🔨',
  tint: '#a36bd1',
  phoneContract: 'holes',
  phonePrompt: 'ТЫК по 🐹 · НЕ ТЫК по 🐰',
  rules: {
    name: 'Суслик, Пошёл Вон',
    tagline: 'Из нор лезут суслики. И зайчики. Не перепутай.',
    howTo: [
      'На телефоне 4 норы. Тыкай в ту, откуда кто-то вылез.',
      '🐹 суслик — бей! +2 очка',
      '✨🐹 золотой — +5 очков',
      '🐰 зайчик — НЕ БЕЙ. Зайчик хороший, минус 3 за каждого.',
    ],
    control: '📱 ТЫК в нужную дыру',
    win: 'Больше всего очков за 30 секунд',
  },
  component: WhackAGopher,
});
