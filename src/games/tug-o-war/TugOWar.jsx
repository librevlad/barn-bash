// src/games/tug-o-war/TugOWar.jsx
// Team mash-off: Red vs Blue, pull the ribbon across.

/* ==========  GAME 7: TUG-O-WAR  ==========
   Teams split evenly (red vs blue). You (index 0) join red team. Mash SPACE to pull.
   Rope has a center ribbon. First team to pull ribbon over their side wins.
*/
function TugOWar({ state, onFinish, onQuit, game }) {
  const players = state.players;
  const N = players.length;
  // Balanced team split — you are always on Red. Blue gets ceil(N/2), Red gets floor... wait, balance:
  // 2p: 1v1, 3p: 2v1 (you+1 vs 1), 4p: 2v2, 5p: 3v2, 6p: 3v3
  const redTeam = [];
  const blueTeam = [];
  for (let i = 0; i < N; i++) {
    if (i === 0) redTeam.push(i);
    else if (redTeam.length <= blueTeam.length) redTeam.push(i);
    else blueTeam.push(i);
  }
  // handicap for outnumbered team
  const teamOf = (i) => redTeam.includes(i) ? 'red' : 'blue';
  const handicap = (i) => {
    const mine = teamOf(i) === 'red' ? redTeam.length : blueTeam.length;
    const other = teamOf(i) === 'red' ? blueTeam.length : redTeam.length;
    return mine < other ? Math.sqrt(other / mine) * 1.1 : 1;
  };
  const MAX = 200; // pixels each side to win

  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [winner, setWinner] = useState(null);
  const [offset, setOffset] = useState(0); // negative = red winning, positive = blue
  const [power, setPower] = useState(()=> players.map(()=>0));
  const [tapCounts, setTapCounts] = useState(()=> players.map(()=>0));
  const [lastTap, setLastTap] = useState(()=> players.map(()=>0));
  // Surface team forces to render so the rope can sag/straighten under load.
  const [redForce, setRedForce] = useState(0);
  const [blueForce, setBlueForce] = useState(0);

  const difficulty = state.difficulty;
  const cpuRate = { easy: 4.0, medium: 6.0, hard: 8.0 }[difficulty] || 6.0;
  const powerRef = useRef(players.map(()=>0));

  useRaf((dt) => {
    if (!started || finished) return;
    // decay power and calculate net pull using refs (stable across RAF)
    let rf = 0, bf = 0;
    redTeam.forEach(i => rf += powerRef.current[i] * handicap(i));
    blueTeam.forEach(i => bf += powerRef.current[i] * handicap(i));
    setRedForce(rf); setBlueForce(bf);
    const net = (bf - rf) * dt * 60;
    setOffset(o => {
      const no = o + net;
      if (no <= -MAX) { setWinner('red'); setFinished(true); return -MAX; }
      if (no >= MAX)  { setWinner('blue'); setFinished(true); return MAX; }
      return no;
    });
    // decay
    powerRef.current = powerRef.current.map(p => Math.max(0, p - dt * 2.8));
    setPower([...powerRef.current]);
  }, started && !finished);

  // CPU tapping
  useEffect(() => {
    if (!started || finished) return;
    const t = setInterval(() => {
      players.forEach((p, i) => {
        if (i === 0) return;
        if (!p.isCPU) return;
        const rate = cpuRate * (0.85 + Math.random() * 0.3);
        powerRef.current[i] = Math.min(3, powerRef.current[i] + 0.35 * (rate / 6));
      });
      setTapCounts(prev => prev.map((c, i) => i === 0 || !players[i].isCPU ? c : c + 1));
    }, 110);
    return () => clearInterval(t);
  }, [started, finished]);

  const doTapFor = (pi) => {
    if (!started || finished) return;
    powerRef.current[pi] = Math.min(3, powerRef.current[pi] + 0.6);
    setTapCounts(c => { const n = c.slice(); n[pi]++; return n; });
    setLastTap(l => { const n = l.slice(); n[pi] = performance.now(); return n; });
  };
  const doTap = () => doTapFor(0);

  useEffect(() => {
    const d = (e) => {
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); doTap(); }
    };
    window.addEventListener('keydown', d);
    return () => window.removeEventListener('keydown', d);
  }, [started, finished]);

  // Phone tap mash — each phone player pulls their own team.
  useEffect(() => {
    const byId = {};
    let leader = 0;
    players.forEach((p, i) => {
      const s = tapCounts[i] || 0;
      if (p.remoteId) byId[p.remoteId] = s;
      if (s > leader) leader = s;
    });
    game.score.update(byId, { leader, label: 'taps' });
  }, [game, tapCounts, players]);
  useEffect(() => {
    const off = game.input.onTap((id) => {
      const pi = players.findIndex(pp => pp.remoteId === id);
      if (pi < 0) return;
      doTapFor(pi);
    });
    return () => { try { off && off(); } catch (_) {} };
  }, [game, started, finished]);

  useEffect(() => {
    if (!finished) return;
    const earned = Array(N).fill(0);
    const winTeam = winner === 'red' ? redTeam : blueTeam;
    const lossTeam = winner === 'red' ? blueTeam : redTeam;
    // sort within team by tapCounts
    const rankedW = [...winTeam].sort((a,b)=> tapCounts[b]-tapCounts[a]);
    rankedW.forEach((idx, rank) => earned[idx] = rank === 0 ? 5 : 3);
    const rankedL = [...lossTeam].sort((a,b)=> tapCounts[b]-tapCounts[a]);
    rankedL.forEach((idx, rank) => earned[idx] = rank === 0 ? 2 : 0);
    setTimeout(() => game.game.finish(earned), 1400);
  }, [finished]);

  // visual: rope offset
  const FIELD_W = 1400;
  const centerX = FIELD_W / 2;
  const ribbonX = centerX + offset;
  // Tension straightens the rope as both teams pull harder; idle rope sags.
  const tension = Math.min(1, (redForce + blueForce) / 6);
  // Struggle pct — close to 0 means the knot is near centre, i.e. the
  // teams are evenly matched. Drives the tension-spark effect.
  const strugglePct = Math.abs(offset) / MAX;

  return (
    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, #9acfe8 0%, #cce6b0 55%, #8fcc6a 100%)',overflow:'hidden'}}>
      <Clouds count={4}/>
      {/* sun */}
      <div style={{position:'absolute',top:60,right:140,width:120,height:120,borderRadius:'50%',background:'radial-gradient(circle,#fff5a8 30%,#ffc93c 70%,transparent 100%)',filter:'blur(1px)'}}/>
      {/* Distant barn (red team side) */}
      <svg style={{position:'absolute',bottom:180,left:60,width:220,height:180,zIndex:1}} viewBox="0 0 220 180">
        <rect x="20" y="60" width="180" height="110" fill="#c64033" stroke="#2a1a10" strokeWidth="3"/>
        <polygon points="10,60 110,0 210,60" fill="#8f2a22" stroke="#2a1a10" strokeWidth="3"/>
        <rect x="88" y="100" width="44" height="70" fill="#5a3a1c" stroke="#2a1a10" strokeWidth="3"/>
        <rect x="96" y="108" width="28" height="20" fill="#2a1a10"/>
        <path d="M 20 60 L 200 60 M 20 80 L 200 80" stroke="#8f2a22" strokeWidth="1.5"/>
      </svg>
      {/* Distant silo (blue team side) */}
      <svg style={{position:'absolute',bottom:180,right:80,width:160,height:220,zIndex:1}} viewBox="0 0 160 220">
        <rect x="40" y="40" width="80" height="180" fill="#d9d0c0" stroke="#2a1a10" strokeWidth="3"/>
        <ellipse cx="80" cy="40" rx="40" ry="14" fill="#4aa3e0" stroke="#2a1a10" strokeWidth="3"/>
        <path d="M 50 40 A 30 40 0 0 1 110 40" fill="#4aa3e0" stroke="#2a1a10" strokeWidth="3"/>
        {[70,110,150].map(y => <line key={y} x1="40" y1={y} x2="120" y2={y} stroke="#2a1a10" strokeWidth="1.5" opacity=".5"/>)}
      </svg>

      {/* HUD */}
      <div style={{position:'absolute',top:20,left:20,right:20,display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:20}}>
        <Btn variant="cream" size="sm" onClick={onQuit}>◀ ВЫХОД</Btn>
        <div className="plank" style={{padding:'8px 32px', whiteSpace:'nowrap'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:28,whiteSpace:'nowrap'}}>🪢 КАНАТНЫЙ БЕСПРЕДЕЛ</span>
        </div>
        <div className="plank" style={{padding:'8px 16px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:16}}>MASH SPACE!</span>
        </div>
      </div>

      {/* Team banners — leading team subtly scales up to 1.05 to show
          who's currently winning the pull. Pure CSS transition. */}
      <div style={{position:'absolute',top:100,left:0,right:0,display:'flex',justifyContent:'space-between',padding:'0 60px',zIndex:20}}>
        <div style={{
          background:'var(--red)',border:'4px solid var(--ink)',borderRadius:14,padding:'6px 22px',
          boxShadow:'0 6px 0 var(--ink)', whiteSpace:'nowrap',
          transform: redForce > blueForce ? 'scale(1.05)' : 'none', transition:'transform .2s'
        }}>
          <span style={{fontFamily:"'Luckiest Guy'",fontSize:22,color:'#fff',WebkitTextStroke:'1px var(--ink)'}}>🔴 RED · {redTeam.length}</span>
        </div>
        <div style={{
          background:'var(--blue)',border:'4px solid var(--ink)',borderRadius:14,padding:'6px 22px',
          boxShadow:'0 6px 0 var(--ink)', whiteSpace:'nowrap',
          transform: blueForce > redForce ? 'scale(1.05)' : 'none', transition:'transform .2s'
        }}>
          <span style={{fontFamily:"'Luckiest Guy'",fontSize:22,color:'#fff',WebkitTextStroke:'1px var(--ink)'}}>{blueTeam.length} · BLUE 🔵</span>
        </div>
      </div>

      {/* Progress bar showing rope ribbon position */}
      <div style={{position:'absolute',top:170,left:'50%',transform:'translateX(-50%)',width:900,height:20,background:'#fff',border:'3px solid var(--ink)',borderRadius:10,overflow:'hidden',boxShadow:'0 4px 0 var(--ink)'}}>
        <div style={{position:'absolute',left:0,top:0,bottom:0,width:'50%',background:'rgba(224,75,59,.3)'}}/>
        <div style={{position:'absolute',right:0,top:0,bottom:0,width:'50%',background:'rgba(74,163,224,.3)'}}/>
        <div style={{position:'absolute',left:`calc(50% + ${(offset/MAX)*50}% - 4px)`,top:-4,width:8,height:28,background:'var(--yellow)',border:'2px solid var(--ink)',borderRadius:4}}/>
      </div>

      {/* Ground */}
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:180,background:'linear-gradient(180deg,#8fcc6a,#6aac4a)',borderTop:'4px solid var(--ink)'}}/>
      {/* Mud pit at center (replaces white PIT label) */}
      <div style={{position:'absolute',bottom:180,left:'50%',transform:'translateX(-50%)',width:140,height:40,
        background:'radial-gradient(ellipse, #4a2e14 40%, #3a1e0a 100%)', border:'4px solid var(--ink)', borderRadius:'50%',
        boxShadow:'inset 0 6px 12px rgba(0,0,0,.5)'}}/>
      <div style={{position:'absolute',bottom:214,left:'50%',transform:'translateX(-50%)',fontFamily:"'Luckiest Guy'",fontSize:12,color:'#fff',textShadow:'0 2px 0 var(--ink)'}}>ГРЯЗЬ</div>
      {/* Center line flag pole */}
      <div style={{position:'absolute',bottom:215,left:'50%',transform:'translateX(-50%)',width:3,height:80,background:'var(--ink)'}}/>
      <svg style={{position:'absolute',bottom:285,left:'50%',transform:'translateX(-50%)',width:40,height:26}} viewBox="0 0 40 26">
        <polygon points="0,0 36,10 0,20 6,10" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="2"/>
      </svg>

      {/* Rope — bends under tension; tighter under simultaneous heavy pull */}
      <svg style={{position:'absolute',bottom:250,left:'50%',transform:'translateX(-50%)',width:FIELD_W,height:80,overflow:'visible',zIndex:5}} viewBox={`0 0 ${FIELD_W} 80`}>
        {(() => {
          const dip = 30 - tension * 20 + Math.sin(performance.now()/120) * 2;
          const rx = ribbonX;
          return (
            <>
              <path d={`M 60 40 Q ${rx*0.5 + 30} ${dip} ${rx} ${40 + (1-tension)*6}`} stroke="#c18040" strokeWidth="10" fill="none" strokeLinecap="round"/>
              <path d={`M ${rx} ${40 + (1-tension)*6} Q ${rx*0.5 + FIELD_W/2 + 30} ${dip} ${FIELD_W - 60} 40`} stroke="#c18040" strokeWidth="10" fill="none" strokeLinecap="round"/>
              {/* rope highlight strand */}
              <path d={`M 60 37 Q ${rx*0.5 + 30} ${dip-3} ${rx} ${37 + (1-tension)*6}`} stroke="#e0a860" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7"/>
              <path d={`M ${rx} ${37 + (1-tension)*6} Q ${rx*0.5 + FIELD_W/2 + 30} ${dip-3} ${FIELD_W - 60} 37`} stroke="#e0a860" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7"/>
              <g transform={`translate(${rx}, ${30 + (1-tension)*4})`}>
                <rect x="-16" y="-12" width="32" height="44" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" rx="3"/>
                <path d="M -16 -12 L -22 -22 L -12 -12 Z" fill="var(--red)" stroke="var(--ink)" strokeWidth="2"/>
                <path d="M 16 -12 L 22 -22 L 12 -12 Z" fill="var(--red)" stroke="var(--ink)" strokeWidth="2"/>
                <text y="14" textAnchor="middle" fontFamily="Luckiest Guy" fontSize="16" fill="var(--ink)">★</text>
              </g>
            </>
          );
        })()}
      </svg>

      {/* Players on rope. Red team on left, Blue on right */}
      {redTeam.map((idx, k) => {
        const p = players[idx];
        const x = 180 + k * 140 - offset * 0.6;
        const pulling = power[idx] > 0.4;
        const pullT = performance.now()/80 + k * 0.5;
        const losing = finished && winner === 'blue';
        return (
          <div key={'r'+idx} style={{position:'absolute', left:`calc(50% - ${FIELD_W/2}px + ${x}px)`, bottom: 220, transform:'translate(-50%, 0)'}}>
            <div style={{transform: pulling ? `translateX(${Math.sin(pullT)*6}px) rotate(${-8 - Math.sin(pullT)*4}deg)` : 'rotate(-6deg)', transition:'transform .05s', filter: losing ? 'saturate(.5) brightness(.85)' : 'none', position:'relative'}}>
              <Avatar char={p.char} size={110}/>
              {/* Red headband — colour-codes the team without a banner */}
              <div style={{position:'absolute', top:6, left:'50%', transform:'translateX(-50%) rotate(-4deg)', width:60, height:10, background:'var(--red)', border:'2px solid var(--ink)', borderRadius:3}}/>
              {/* Cream arm reaching toward the rope — angle bumps when pulling */}
              <div style={{position:'absolute', top: 32, right: -6, width: 24, height: 10,
                background:'#fff5e4', border:'2.5px solid var(--ink)', borderRadius: 6,
                transform:`rotate(${pulling ? -20 : -10}deg)`, transformOrigin:'left center'}}/>
            </div>
            {/* tap cue */}
            {idx === 0 && <div style={{position:'absolute',top:-30,left:'50%',transform:'translateX(-50%)',background:'var(--yellow)',border:'2px solid var(--ink)',borderRadius:6,padding:'1px 6px',fontFamily:"'Luckiest Guy'",fontSize:11}}>YOU</div>}
            <div style={{position:'absolute',left:'50%',bottom:-6,transform:'translateX(-50%)',width:90,height:12,background:'rgba(0,0,0,.3)',borderRadius:'50%',filter:'blur(3px)'}}/>
            {/* Dust kicks at the feet when this critter is actively pulling */}
            {pulling && (
              <div style={{position:'absolute', bottom:-12, left:'50%', transform:'translateX(-50%)', width:80, height:14, pointerEvents:'none'}}>
                {[...Array(4)].map((_,j)=>(
                  <div key={j} style={{position:'absolute',
                    left: 20 + j*12 + Math.sin(pullT + j)*6,
                    bottom: Math.abs(Math.sin(pullT*1.3 + j))*8,
                    width: 8, height: 8, borderRadius:'50%', background:'#b89340', opacity: 0.55}}/>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {blueTeam.map((idx, k) => {
        const p = players[idx];
        const x = FIELD_W - 180 - k * 140 - offset * 0.6;
        const pulling = power[idx] > 0.4;
        const pullT = performance.now()/80 + k * 0.5;
        const losing = finished && winner === 'red';
        return (
          <div key={'b'+idx} style={{position:'absolute', left:`calc(50% - ${FIELD_W/2}px + ${x}px)`, bottom: 220, transform:'translate(-50%, 0) scaleX(-1)'}}>
            <div style={{transform: pulling ? `translateX(${Math.sin(pullT)*6}px) rotate(${-8 - Math.sin(pullT)*4}deg)` : 'rotate(-6deg)', transition:'transform .05s', filter: losing ? 'saturate(.5) brightness(.85)' : 'none', position:'relative'}}>
              <Avatar char={p.char} size={110}/>
              {/* Blue headband */}
              <div style={{position:'absolute', top:6, left:'50%', transform:'translateX(-50%) rotate(-4deg)', width:60, height:10, background:'var(--blue)', border:'2px solid var(--ink)', borderRadius:3}}/>
              {/* Mirrored arm reaches toward the rope (parent has scaleX(-1)) */}
              <div style={{position:'absolute', top: 32, right: -6, width: 24, height: 10,
                background:'#fff5e4', border:'2.5px solid var(--ink)', borderRadius: 6,
                transform:`rotate(${pulling ? -20 : -10}deg)`, transformOrigin:'left center'}}/>
            </div>
            <div style={{position:'absolute',left:'50%',bottom:-6,transform:'translateX(-50%)',width:90,height:12,background:'rgba(0,0,0,.3)',borderRadius:'50%',filter:'blur(3px)'}}/>
            {pulling && (
              <div style={{position:'absolute', bottom:-12, left:'50%', transform:'translateX(-50%)', width:80, height:14, pointerEvents:'none'}}>
                {[...Array(4)].map((_,j)=>(
                  <div key={j} style={{position:'absolute',
                    left: 20 + j*12 + Math.sin(pullT + j)*6,
                    bottom: Math.abs(Math.sin(pullT*1.3 + j))*8,
                    width: 8, height: 8, borderRadius:'50%', background:'#b89340', opacity: 0.55}}/>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Tension sparks orbiting the knot when both teams pull hard AND
          the knot is near the centre. Reads as visible "stress" on the
          rope rather than a screen-wide effect. */}
      {started && !finished && tension > 0.5 && strugglePct < 0.3 && (
        <div style={{position:'absolute', bottom: 268, left:`calc(50% + ${offset}px - 10px)`, width:20, height:20, pointerEvents:'none', zIndex:6}}>
          {[...Array(6)].map((_,k)=>{
            const a = (k/6)*Math.PI*2 + performance.now()/200;
            return (
              <div key={k} style={{
                position:'absolute',
                left: 10 + Math.cos(a)*14, top: 10 + Math.sin(a)*14,
                width:5, height:5, background:'#ffec8a', borderRadius:'50%',
                boxShadow:'0 0 6px #ffc93c'
              }}/>
            );
          })}
        </div>
      )}

      {/* Big mash button */}
      {started && !finished && (
        <div style={{position:'absolute',bottom:28,left:0,right:0,display:'flex',justifyContent:'center',zIndex:30}}>
          <button onMouseDown={doTap} onTouchStart={doTap} className="pulse" style={{
            fontFamily:"'Luckiest Guy'", fontSize:40, padding:'18px 60px',
            background:'var(--red)', color:'#fff', WebkitTextStroke:'2px var(--ink)',
            border:'6px solid var(--ink)', borderRadius:22, boxShadow:'0 10px 0 var(--ink)', cursor:'pointer'
          }}>
            💪 PULL! (SPACE)
          </button>
        </div>
      )}

      {/* Tap counters */}
      <div style={{position:'absolute',top:210,left:0,right:0,display:'flex',justifyContent:'space-around',padding:'0 100px',zIndex:20}}>
        <div style={{display:'flex',gap:8}}>
          {redTeam.map(i=>(
            <div key={i} style={{background:'#fff',border:'2px solid var(--ink)',borderRadius:8,padding:'2px 8px',fontFamily:"'Luckiest Guy'",fontSize:14}}>
              {players[i].char.name}: {tapCounts[i]}
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:8}}>
          {blueTeam.map(i=>(
            <div key={i} style={{background:'#fff',border:'2px solid var(--ink)',borderRadius:8,padding:'2px 8px',fontFamily:"'Luckiest Guy'",fontSize:14}}>
              {players[i].char.name}: {tapCounts[i]}
            </div>
          ))}
        </div>
      </div>

      {!started && <Countdown onDone={()=>setStarted(true)}/>}
      {finished && (
        <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',zIndex:40,pointerEvents:'none'}}>
          <div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse at ${winner==='red'?'30%':'70%'} 60%, rgba(255,255,255,.18), rgba(0,0,0,.55))`}}/>
          <svg style={{position:'absolute',inset:0,width:'100%',height:'100%'}} preserveAspectRatio="none" viewBox="0 0 1600 900">
            {[...Array(14)].map((_,k)=>{
              const a = (k/14)*Math.PI*2 + performance.now()/800;
              const cx = winner==='red' ? 500 : 1100;
              return <line key={k} x1={cx} y1="450" x2={cx + Math.cos(a)*1200} y2={450 + Math.sin(a)*1200} stroke={winner==='red' ? 'rgba(224,75,59,.25)' : 'rgba(74,163,224,.25)'} strokeWidth="60"/>;
            })}
          </svg>
          <div className="pop-in" style={{fontFamily:"'Luckiest Guy'",fontSize:110,color: winner === 'red' ? '#e04b3b' : '#4aa3e0',WebkitTextStroke:'6px var(--ink)',textShadow:'0 10px 0 var(--ink)', zIndex:2}}>
            {winner === 'red' ? '🔴 КРАСНЫЕ ВЗЯЛИ!' : '🔵 СИНИЕ ВЗЯЛИ!'}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========  GAME 8: FISHING FRENZY  ==========
   A fishing rod dangles a hook that swings side-to-side. Press SPACE to drop.
   Fish swim at various depths. Hitting a fish scores; hitting a boot = -1.
   60 seconds, highest total wins.
*/

window.BB.games.register({
  id: 'tug',
  name: 'Канатный Беспредел',
  blurb: 'Команда на команду. Красные против Синих. Без правил.',
  icon: '🪢',
  tint: '#c18040',
  phoneContract: 'tap',
  phonePrompt: 'ДОЛБИ ТАП — ТЯНИ КАНАТ!',
  rules: {
    name: 'Канатный Беспредел',
    tagline: 'Красные vs Синие. Дипломатии не будет.',
    howTo: [
      'Вас поделили на две команды. Совпадений не бывает.',
      'ДОЛБИ кнопку. Чем быстрее вся команда — тем ближе лента к вам.',
      'Та команда что дотянула ленту до своего края — победила.',
    ],
    control: '📱 ТАП-ТАП-ТАП · ⌨ ПРОБЕЛ',
    win: 'Команда-победитель делит +5 монет',
  },
  component: TugOWar,
});
