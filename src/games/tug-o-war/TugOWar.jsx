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

  const difficulty = state.difficulty;
  const cpuRate = { easy: 4.0, medium: 6.0, hard: 8.0 }[difficulty] || 6.0;
  const powerRef = useRef(players.map(()=>0));

  useRaf((dt) => {
    if (!started || finished) return;
    // decay power and calculate net pull using refs (stable across RAF)
    let redForce = 0, blueForce = 0;
    redTeam.forEach(i => redForce += powerRef.current[i] * handicap(i));
    blueTeam.forEach(i => blueForce += powerRef.current[i] * handicap(i));
    const net = (blueForce - redForce) * dt * 60;
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

  return (
    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, #9acfe8 0%, #cce6b0 55%, #8fcc6a 100%)',overflow:'hidden'}}>
      <Clouds count={4}/>
      {/* sun */}
      <div style={{position:'absolute',top:60,right:140,width:120,height:120,borderRadius:'50%',background:'radial-gradient(circle,#fff5a8 30%,#ffc93c 70%,transparent 100%)',filter:'blur(1px)'}}/>

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

      {/* Team banners */}
      <div style={{position:'absolute',top:100,left:0,right:0,display:'flex',justifyContent:'space-between',padding:'0 60px',zIndex:20}}>
        <div style={{background:'var(--red)',border:'4px solid var(--ink)',borderRadius:14,padding:'6px 22px',boxShadow:'0 6px 0 var(--ink)',whiteSpace:'nowrap'}}>
          <span style={{fontFamily:"'Luckiest Guy'",fontSize:22,color:'#fff',WebkitTextStroke:'1px var(--ink)'}}>🔴 RED · {redTeam.length}</span>
        </div>
        <div style={{background:'var(--blue)',border:'4px solid var(--ink)',borderRadius:14,padding:'6px 22px',boxShadow:'0 6px 0 var(--ink)',whiteSpace:'nowrap'}}>
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
      <div style={{position:'absolute',bottom:180,left:'50%',transform:'translateX(-50%)',width:3,height:40,background:'var(--ink)'}}/>
      <div style={{position:'absolute',bottom:218,left:'50%',transform:'translateX(-50%)',width:60,height:20,background:'#fff5e4',border:'3px solid var(--ink)',borderRadius:4,display:'grid',placeItems:'center',fontFamily:"'Luckiest Guy'",fontSize:12}}>PIT</div>

      {/* Rope */}
      <svg style={{position:'absolute',bottom:250,left:'50%',transform:'translateX(-50%)',width:FIELD_W,height:60,overflow:'visible'}} viewBox={`0 0 ${FIELD_W} 60`}>
        <path d={`M 60 40 Q ${ribbonX} 20 ${FIELD_W - 60} 40`} stroke="#c18040" strokeWidth="10" fill="none" strokeLinecap="round"/>
        {/* ribbon knot */}
        <g transform={`translate(${ribbonX}, 26)`}>
          <rect x="-14" y="-10" width="28" height="40" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" rx="3"/>
          <path d="M -14 -10 L -20 -20 L -10 -10 Z" fill="var(--red)" stroke="var(--ink)" strokeWidth="2"/>
          <path d="M 14 -10 L 20 -20 L 10 -10 Z" fill="var(--red)" stroke="var(--ink)" strokeWidth="2"/>
        </g>
      </svg>

      {/* Players on rope. Red team on left, Blue on right */}
      {redTeam.map((idx, k) => {
        const p = players[idx];
        const x = 180 + k * 140 - offset * 0.6;
        const pulling = power[idx] > 0.4;
        return (
          <div key={'r'+idx} style={{position:'absolute', left:`calc(50% - ${FIELD_W/2}px + ${x}px)`, bottom: 220, transform:'translate(-50%, 0)'}}>
            <div style={{transform: pulling ? `translateX(${Math.sin(performance.now()/80)*6}px) rotate(${-8 - Math.sin(performance.now()/80)*4}deg)` : 'rotate(-6deg)', transition:'transform .05s'}}>
              <Avatar char={p.char} size={110}/>
            </div>
            {/* tap cue */}
            {idx === 0 && <div style={{position:'absolute',top:-30,left:'50%',transform:'translateX(-50%)',background:'var(--yellow)',border:'2px solid var(--ink)',borderRadius:6,padding:'1px 6px',fontFamily:"'Luckiest Guy'",fontSize:11}}>YOU</div>}
            <div style={{position:'absolute',left:'50%',bottom:-6,transform:'translateX(-50%)',width:90,height:12,background:'rgba(0,0,0,.3)',borderRadius:'50%',filter:'blur(3px)'}}/>
          </div>
        );
      })}
      {blueTeam.map((idx, k) => {
        const p = players[idx];
        const x = FIELD_W - 180 - k * 140 - offset * 0.6;
        const pulling = power[idx] > 0.4;
        return (
          <div key={'b'+idx} style={{position:'absolute', left:`calc(50% - ${FIELD_W/2}px + ${x}px)`, bottom: 220, transform:'translate(-50%, 0) scaleX(-1)'}}>
            <div style={{transform: pulling ? `translateX(${Math.sin(performance.now()/80)*6}px) rotate(${-8 - Math.sin(performance.now()/80)*4}deg)` : 'rotate(-6deg)', transition:'transform .05s'}}>
              <Avatar char={p.char} size={110}/>
            </div>
            <div style={{position:'absolute',left:'50%',bottom:-6,transform:'translateX(-50%)',width:90,height:12,background:'rgba(0,0,0,.3)',borderRadius:'50%',filter:'blur(3px)'}}/>
          </div>
        );
      })}

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
