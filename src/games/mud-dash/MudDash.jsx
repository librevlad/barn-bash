// src/games/mud-dash/MudDash.jsx
// Endless runner through a slippery mud obstacle course. Three lanes,
// left/right + jump phone contract.

function MudDash({ state, onFinish, onQuit, game }) {
  const players = state.players;
  const N = players.length;
  const LANES = 3;
  const GAME_SEC = 30;
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [time, setTime] = useState(0);
  // per-player state: lane, jumping (time), distance, hits
  const makeState = () => players.map((_,i) => ({ lane: 1, jumpT: 0, dist: 0, hits: 0, muddy: 0 }));
  const [pstate, setPstate] = useState(makeState);
  const [obstacles, setObstacles] = useState([]); // {id, lane, z, kind:'mud'|'rope'|'log'|'haybale'}
  // Splash bursts at the player's feet when they slam into an obstacle.
  // Each {id, lane, t, kind} is aged in the main RAF and removed past 0.6s.
  const [splashes, setSplashes] = useState([]);
  const spawnT = useRef(0);
  const nextId = useRef(1);
  const youLane = useRef(1);
  const youJump = useRef(0);

  const difficulty = state.difficulty;
  const speed = 250; // world units / sec

  useRaf((dt) => {
    if (!started || finished) return;
    setTime(t => { const nt = t + dt; if (nt >= GAME_SEC) setFinished(true); return nt; });
    // spawn obstacles
    spawnT.current -= dt;
    if (spawnT.current <= 0) {
      spawnT.current = 0.7 + Math.random()*0.5;
      const count = 1 + (Math.random() < 0.4 ? 1 : 0);
      const lanes = [0,1,2].sort(()=>Math.random()-.5).slice(0, count);
      const r = Math.random();
      const kind = r < 0.45 ? 'mud' : r < 0.75 ? 'rope' : r < 0.88 ? 'log' : 'haybale';
      setObstacles(o => [
        ...o,
        ...lanes.map(l => ({ id: nextId.current++, lane: l, z: 1000, kind }))
      ]);
    }
    // move obstacles
    setObstacles(o => o.map(x => ({ ...x, z: x.z - speed * dt })).filter(x => x.z > -100));
    // age splash bursts
    setSplashes(s => s.map(x => ({ ...x, t: x.t + dt })).filter(x => x.t < 0.6));

    // update players
    setPstate(prev => prev.map((p, idx) => {
      let lane = p.lane, jumpT = Math.max(0, p.jumpT - dt);
      const pl = players[idx] || {};
      const rid = pl.remoteId;
      const rc = rid && !pl.isCPU ? remoteControls.current[rid] : null;
      if (rc) {
        lane = rc.lane;
        if (rc.jumpPending && jumpT <= 0.05) { jumpT = 0.6; }
        rc.jumpPending = false;
      } else if (idx === 0 && !pl.isCPU) {
        lane = youLane.current;
        jumpT = Math.max(jumpT, youJump.current);
        youJump.current = Math.max(0, youJump.current - dt);
      } else {
        // CPU AI. Previously bots almost never jumped because they preferred
        // lane-switching — over the 3-4s an obstacle spends approaching,
        // random lane-change attempts drifted them out of the threat lane
        // 4+ times on average, so the jump branch (rope-only) rarely fired.
        // Max reported "боты не прыгали" after a live test. New logic:
        //   1. If a close hazard sits in the current lane and a jump would
        //      clear it, jump first (works for both rope AND mud).
        //   2. Only fall back to lane-switch when no jump can save us.
        // Jumps stay within difficulty reaction bands but bias much higher.
        const cpuSmart = { easy: 0.55, medium: 0.8, hard: 0.95 }[difficulty] || 0.8;
        let jumpedThisTick = false;
        obstacles.forEach(o => {
          if (jumpedThisTick || jumpT > 0) return;
          if (o.lane !== lane) return;
          if (o.z < 35 || o.z > 160) return;
          // Closer = more urgent, higher chance. 0.55..0.95 * urgency.
          const urgency = 1 - (o.z - 35) / 125;
          const p = cpuSmart * urgency * dt * 60;
          if (Math.random() < p) { jumpT = 0.6; jumpedThisTick = true; }
        });
        // Lane-change fallback: drift toward the emptiest lane only if we
        // couldn't jump a threat away. Cadence halved so we stay committed
        // to jumping-as-primary.
        if (!jumpedThisTick && Math.random() < dt * 0.7 && Math.random() < cpuSmart) {
          const threats = [0,0,0];
          obstacles.forEach(o => { if (o.z > 50 && o.z < 400) threats[o.lane] += 400 - o.z; });
          let best = lane; let bestS = threats[lane];
          [lane-1, lane+1].forEach(l => {
            if (l < 0 || l >= LANES) return;
            if (threats[l] < bestS) { best = l; bestS = threats[l]; }
          });
          lane = best;
        }
      }
      // collisions at z ~ 0
      let hits = p.hits, muddy = Math.max(0, p.muddy - dt);
      obstacles.forEach(o => {
        if (o.z > -20 && o.z < 40 && o.lane === lane && !o._hit) {
          const jumping = jumpT > 0.15;
          if (o.kind === 'mud' && !jumping) { hits++; muddy = 0.7; o._hit = true; }
          if (o.kind === 'rope' && !jumping) { hits++; muddy = 0.4; o._hit = true; }
          if (o.kind === 'log' && !jumping) { hits++; muddy = 0.5; o._hit = true; }
          if (o.kind === 'haybale' && !jumping) { hits++; muddy = 0.55; o._hit = true; }
          // Spawn a splash burst at player position so the impact reads
          // even on small avatars far down the track. Only for the human
          // (idx === 0) to keep particle count predictable.
          if (idx === 0 && o._hit) {
            setSplashes(s => [...s, { id: nextId.current++, lane, t: 0, kind: o.kind }].slice(-8));
          }
        }
      });
      const dist = p.dist + (speed * dt) * (muddy > 0 ? 0.5 : 1);
      return { ...p, lane, jumpT, dist, hits, muddy };
    }));
  }, started && !finished);

  // controls
  useEffect(() => {
    const d = (e) => {
      if (!started || finished) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { youLane.current = Math.max(0, youLane.current - 1); }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { youLane.current = Math.min(LANES-1, youLane.current + 1); }
      if (e.key === ' ' || e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        if (youJump.current <= 0.05) youJump.current = 0.6;
      }
    };
    window.addEventListener('keydown', d);
    return () => window.removeEventListener('keydown', d);
  }, [started, finished]);

  // phone steer contract: left/right = lane ±1, jump = trigger hop
  const remoteControls = useRef({}); // { [rid]: { lane, jumpPending } }
  useEffect(() => {
    const byId = {};
    let leader = 0;
    players.forEach((p, i) => {
      const s = Math.round(pstate[i] ? pstate[i].dist : 0);
      if (p.remoteId) byId[p.remoteId] = s;
      if (s > leader) leader = s;
    });
    game.score.update(byId, { leader, label: 'meters' });
  }, [game, pstate, players]);
  useEffect(() => {
    players.forEach((p) => {
      if (p.remoteId && !remoteControls.current[p.remoteId]) {
        remoteControls.current[p.remoteId] = { lane: 1, jumpPending: false };
      }
    });
    const off = game.input.onSteer((id, data) => {
      if (!data) return;
      const rc = remoteControls.current[id];
      if (!rc) return;
      if (data.dir === 'left'  && data.down) rc.lane = Math.max(0, rc.lane - 1);
      if (data.dir === 'right' && data.down) rc.lane = Math.min(LANES-1, rc.lane + 1);
      if (data.dir === 'jump'  && data.down) rc.jumpPending = true;
    });
    return () => { try { off && off(); } catch (_) {} };
  }, [game, players]);

  useEffect(() => {
    if (!finished) return;
    // winner = fewest hits, ties broken by distance
    const ranked = pstate.map((p,i)=>({i,h:p.hits,d:p.dist})).sort((a,b)=> a.h - b.h || b.d - a.d);
    const earned = Array(N).fill(0);
    [5,3,1,0,0,0].forEach((v,rank)=>{ if (ranked[rank]) earned[ranked[rank].i] = v; });
    setTimeout(() => game.game.finish(earned), 1200);
  }, [finished]);

  const laneX = (l) => 300 + l * 330; // within 1200-wide track
  const TRACK_W = 1200, TRACK_H = 680;
  // 3D-ish perspective: z 0 (near, bottom) to 1000 (far, top)
  const projectY = (z) => TRACK_H - 80 - (z / 1000) * 520;
  const projectScale = (z) => 1.4 - (z / 1000) * 1.1;
  const youPos = { lane: pstate[0].lane, jump: pstate[0].jumpT };

  return (
    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, #9acfe8 0%, #cce6b0 60%, #6a5030 100%)',overflow:'hidden'}}>
      <Clouds count={3}/>
      {/* HUD */}
      <div style={{position:'absolute',top:20,left:20,right:20,display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:30}}>
        <Btn variant="cream" size="sm" onClick={onQuit}>◀ ВЫХОД</Btn>
        <div className="plank" style={{padding:'8px 22px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:26}}>💧 ГРЯЗНЫЙ ЗАБЕГ</span>
        </div>
        <div className="plank" style={{padding:'8px 16px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:20}}>{Math.max(0, GAME_SEC - time).toFixed(1)}s</span>
        </div>
      </div>

      {/* Score row: hits */}
      <div style={{position:'absolute',top:80,left:0,right:0,display:'flex',justifyContent:'center',gap:10,zIndex:30}}>
        {players.map((p,i)=>(
          <div key={i} style={{
            background: i === 0 ? 'var(--yellow)' : '#fff',
            border:'3px solid var(--ink)', borderRadius:12, padding:'4px 10px',
            display:'flex', alignItems:'center', gap:6, boxShadow:'0 3px 0 var(--ink)'
          }}>
            <Avatar char={p.char} size={28}/>
            <span style={{fontFamily:"'Luckiest Guy'", fontSize:16, color:'var(--ink)'}}>
              {pstate[i].hits} hits · {(pstate[i].dist/10).toFixed(0)}m
            </span>
          </div>
        ))}
      </div>

      {/* Track */}
      <div style={{
        position:'absolute', left:'50%', transform:'translateX(-50%)', top:140,
        width:TRACK_W, height:TRACK_H,
        background:'linear-gradient(180deg, #8ac2e0 0%, #b4d9e8 25%, #cce6b0 40%, #a89060 65%, #8f6a3b 100%)',
        border:'5px solid var(--ink)', borderRadius:20, overflow:'hidden',
        boxShadow:'0 10px 0 var(--ink)',
      }}>
        {/* Sun */}
        <div style={{position:'absolute',left:'50%',top:30,transform:'translateX(-50%)',width:100,height:100,borderRadius:'50%',background:'radial-gradient(circle,#fff5a8 30%,#ffc93c 70%,transparent 100%)',filter:'blur(1px)'}}/>

        {/* Distant mountains */}
        <svg style={{position:'absolute',top:80,left:0,right:0,width:'100%'}} height="100" viewBox="0 0 1200 100" preserveAspectRatio="none">
          <path d="M 0 100 L 100 30 L 200 60 L 330 20 L 460 50 L 600 25 L 740 55 L 880 28 L 1000 50 L 1100 35 L 1200 60 L 1200 100 Z" fill="#6f9da6" stroke="#3d6770" strokeWidth="2"/>
          <path d="M 0 100 L 80 70 L 180 85 L 280 60 L 400 80 L 540 65 L 680 85 L 820 65 L 960 82 L 1080 70 L 1200 88 L 1200 100 Z" fill="#8ab0b6"/>
        </svg>

        {/* Distant trees — parallax (slow) */}
        {[...Array(8)].map((_,i)=>{
          const z = ((time*speed*0.3 + i*180) % 1200) + 100;
          const y = projectY(z) - 40;
          const s = projectScale(z) * 0.8;
          const side = i % 2 === 0 ? -1 : 1;
          const x = TRACK_W/2 + side * (220 + (i%3)*40) * s;
          return (
            <div key={'t'+i} style={{position:'absolute', left:x, top:y, transform:`translate(-50%,-50%) scale(${s})`, zIndex: Math.round(1000-z), pointerEvents:'none'}}>
              <svg width="80" height="120" viewBox="0 0 80 120">
                <rect x="34" y="70" width="12" height="50" fill="#5a3a1c" stroke="#2a1a10" strokeWidth="2"/>
                <circle cx="40" cy="60" r="32" fill="#5ba04a" stroke="#2a1a10" strokeWidth="3"/>
                <circle cx="22" cy="48" r="18" fill="#6cc24a" stroke="#2a1a10" strokeWidth="3"/>
                <circle cx="58" cy="48" r="18" fill="#6cc24a" stroke="#2a1a10" strokeWidth="3"/>
                <circle cx="40" cy="36" r="16" fill="#7dd05b" stroke="#2a1a10" strokeWidth="3"/>
              </svg>
            </div>
          );
        })}

        {/* Side fences */}
        {[...Array(10)].map((_,i)=>{
          const z = ((time*speed + i*130) % 1000);
          if (z > 1000) return null;
          const y = projectY(z);
          const s = projectScale(z);
          return (
            <React.Fragment key={'f'+i}>
              <div style={{
                position:'absolute', left: 10, top: y, transform:`translate(0, -50%) scale(${s})`, transformOrigin:'left center',
                zIndex: Math.round(1000-z), pointerEvents:'none'
              }}>
                <svg width="140" height="70" viewBox="0 0 140 70">
                  <rect x="0" y="20" width="140" height="8" fill="#b8925a" stroke="#2a1a10" strokeWidth="2"/>
                  <rect x="0" y="40" width="140" height="8" fill="#b8925a" stroke="#2a1a10" strokeWidth="2"/>
                  {[20,50,80,110].map(x=>(<rect key={x} x={x} y="10" width="10" height="50" fill="#a07840" stroke="#2a1a10" strokeWidth="2"/>))}
                </svg>
              </div>
              <div style={{
                position:'absolute', right: 10, top: y, transform:`translate(0, -50%) scale(${s}) scaleX(-1)`, transformOrigin:'right center',
                zIndex: Math.round(1000-z), pointerEvents:'none'
              }}>
                <svg width="140" height="70" viewBox="0 0 140 70">
                  <rect x="0" y="20" width="140" height="8" fill="#b8925a" stroke="#2a1a10" strokeWidth="2"/>
                  <rect x="0" y="40" width="140" height="8" fill="#b8925a" stroke="#2a1a10" strokeWidth="2"/>
                  {[20,50,80,110].map(x=>(<rect key={x} x={x} y="10" width="10" height="50" fill="#a07840" stroke="#2a1a10" strokeWidth="2"/>))}
                </svg>
              </div>
            </React.Fragment>
          );
        })}

        {/* lane stripes (painted on dirt) */}
        {[0,1,2,3].map(i=>{
          return (
            <svg key={'ls'+i} style={{position:'absolute',top:160,left:0,width:'100%',height: TRACK_H - 160,pointerEvents:'none'}} viewBox={`0 0 ${TRACK_W} ${TRACK_H - 160}`} preserveAspectRatio="none">
              <line x1={laneX(i) - 165 + 50} y1="0" x2={laneX(i) - 165 + 200} y2={TRACK_H - 160}
                stroke="#fff" strokeWidth="3" strokeDasharray="14 18" opacity="0.55"/>
            </svg>
          );
        })}
        {/* scrolling dashes (speed lines) */}
        {[...Array(8)].map((_,i)=>{
          const z = ((time*speed*1.4 + i*110) % 600);
          return (
            <div key={i} style={{
              position:'absolute', left: '50%', transform:'translateX(-50%)',
              top: projectY(z), width: 4 + (1-z/600)*20, height: 4 + (1-z/600)*4, background:'#fff', opacity:.3, borderRadius:2,
            }}/>
          );
        })}

        {/* obstacles */}
        {obstacles.map(o => {
          const y = projectY(o.z);
          const s = projectScale(o.z);
          return (
            <div key={o.id} style={{
              position:'absolute', left: laneX(o.lane), top: y,
              transform:`translate(-50%, -50%) scale(${Math.max(0.2, s)})`,
              zIndex: Math.round(1000 - o.z),
              pointerEvents:'none',
            }}>
              {o.kind === 'log' ? (
                <svg width="180" height="80" viewBox="0 0 180 80">
                  <ellipse cx="90" cy="70" rx="80" ry="6" fill="rgba(0,0,0,.35)"/>
                  <rect x="10" y="22" width="160" height="34" rx="17" fill="#8f6a3b" stroke="#2a1a10" strokeWidth="3"/>
                  <ellipse cx="20" cy="39" rx="10" ry="16" fill="#c89a5a" stroke="#2a1a10" strokeWidth="2.5"/>
                  <ellipse cx="20" cy="39" rx="5" ry="9" fill="#8f6a3b"/>
                  <ellipse cx="160" cy="39" rx="10" ry="16" fill="#c89a5a" stroke="#2a1a10" strokeWidth="2.5"/>
                  <ellipse cx="160" cy="39" rx="5" ry="9" fill="#8f6a3b"/>
                  <path d="M 40 30 Q 70 26 100 30 M 44 50 Q 80 54 110 50" stroke="#5a3a1c" strokeWidth="2" fill="none" opacity=".6"/>
                </svg>
              ) : o.kind === 'haybale' ? (
                <svg width="150" height="110" viewBox="0 0 150 110">
                  <ellipse cx="75" cy="102" rx="60" ry="6" fill="rgba(0,0,0,.35)"/>
                  <rect x="10" y="20" width="130" height="78" rx="10" fill="#e8c76c" stroke="#2a1a10" strokeWidth="3"/>
                  <line x1="22" y1="32" x2="34" y2="36" stroke="#b89340" strokeWidth="1.4"/>
                  <line x1="48" y1="40" x2="60" y2="44" stroke="#b89340" strokeWidth="1.4"/>
                  <line x1="80" y1="32" x2="92" y2="38" stroke="#b89340" strokeWidth="1.4"/>
                  <line x1="106" y1="46" x2="118" y2="50" stroke="#b89340" strokeWidth="1.4"/>
                  <line x1="30" y1="60" x2="42" y2="64" stroke="#b89340" strokeWidth="1.4"/>
                  <line x1="64" y1="68" x2="76" y2="72" stroke="#b89340" strokeWidth="1.4"/>
                  <line x1="94" y1="76" x2="106" y2="80" stroke="#b89340" strokeWidth="1.4"/>
                  <rect x="24" y="28" width="102" height="4" fill="#a87a20" opacity=".6"/>
                  <rect x="24" y="88" width="102" height="4" fill="#a87a20" opacity=".6"/>
                </svg>
              ) : o.kind === 'mud' ? (
                <svg width="160" height="90" viewBox="0 0 160 90">
                  <ellipse cx="80" cy="72" rx="12" ry="4" fill="rgba(0,0,0,.35)"/>
                  <ellipse cx="80" cy="56" rx="70" ry="28" fill="#4a2e14" stroke="#2a1a10" strokeWidth="3"/>
                  <ellipse cx="80" cy="52" rx="52" ry="18" fill="#6b4a2e"/>
                  <ellipse cx="60" cy="48" rx="16" ry="5" fill="#8f6a3b" opacity=".7"/>
                  <ellipse cx="100" cy="54" rx="10" ry="3" fill="#a07840" opacity=".5"/>
                  {/* bubbles */}
                  <circle cx="70" cy="46" r="3" fill="#1a0e08"/>
                  <circle cx="88" cy="50" r="2" fill="#1a0e08"/>
                  <circle cx="98" cy="44" r="2.5" fill="#1a0e08"/>
                </svg>
              ) : (
                <svg width="180" height="70" viewBox="0 0 180 70">
                  {/* posts */}
                  <rect x="6" y="0" width="10" height="60" fill="#6b4a2e" stroke="#2a1a10" strokeWidth="2"/>
                  <rect x="164" y="0" width="10" height="60" fill="#6b4a2e" stroke="#2a1a10" strokeWidth="2"/>
                  {/* rope with triangular flags */}
                  <path d="M 12 8 Q 90 22 168 8" stroke="#c18040" strokeWidth="5" fill="none"/>
                  {[20,50,80,110,140].map((x,i)=>(<polygon key={i} points={`${x},12 ${x+12},12 ${x+6},26`} fill={['#e04b3b','#ffc93c','#4aa3e0','#6cc24a','#f28bbd'][i%5]} stroke="#2a1a10" strokeWidth="1.5"/>))}
                  <ellipse cx="90" cy="62" rx="16" ry="3" fill="rgba(0,0,0,.3)"/>
                </svg>
              )}
            </div>
          );
        })}

        {/* Splash bursts at the impact lane — colour matches the obstacle
            kind (brown for mud/log/haybale, cream for rope). 8 particles
            radiate outward and fade. */}
        {splashes.map(s => {
          const colour = s.kind === 'mud' ? '#4a2e14'
                       : s.kind === 'haybale' ? '#c79a48'
                       : s.kind === 'log' ? '#8f6a3b'
                       : '#fff5e4';
          return (
            <div key={'sp'+s.id} style={{
              position:'absolute', left: laneX(s.lane), top: projectY(20) - 20,
              transform:'translate(-50%, -50%)', pointerEvents:'none',
              zIndex: 1200,
              opacity: Math.max(0, 1 - s.t/0.6)
            }}>
              {Array.from({length: 8}).map((_, k) => {
                const a = (k/8) * Math.PI * 2;
                const d = 6 + s.t * 80;
                return (
                  <div key={k} style={{
                    position:'absolute', left: Math.cos(a)*d, top: Math.sin(a)*d - s.t*60,
                    transform:'translate(-50%,-50%)',
                    width: 6, height: 6, borderRadius:'50%',
                    background: colour, boxShadow:'0 1px 0 rgba(0,0,0,.3)'
                  }}/>
                );
              })}
            </div>
          );
        })}

        {/* players */}
        {players.map((p, i) => {
          const ps = pstate[i];
          const z = i === 0 ? 20 : 60 + i * 30;
          const y = projectY(z);
          const s = projectScale(z);
          const jump = ps.jumpT > 0 ? Math.sin((1 - ps.jumpT/0.6) * Math.PI) * 80 : 0;
          const slipping = ps.muddy > 0.4;
          // running bob when moving
          const bob = jump > 0 ? 0 : Math.sin(time * 14 + i) * 4;
          const tilt = jump > 0 ? -6 : slipping ? Math.sin(time * 30 + i) * 18 : Math.sin(time * 14 + i) * 3;
          return (
            <div key={i} style={{
              position:'absolute', left: laneX(ps.lane), top: y - jump,
              transform:`translate(-50%, -100%) scale(${s})`,
              zIndex: Math.round(1000 - z),
              transition: i === 0 ? 'left .16s ease-out' : 'left .3s ease',
              pointerEvents:'none',
            }}>
              {/* shadow */}
              <div style={{position:'absolute',left:'50%',bottom: -10 - (jump?jump*0.3:0),transform:`translateX(-50%) scale(${jump?0.6:1})`,width:80,height:14,background:'rgba(0,0,0,.4)',borderRadius:'50%',filter:'blur(3px)'}}/>
              <div style={{transform:`translateY(${bob}px) rotate(${tilt}deg)`, filter: ps.muddy > 0 ? 'brightness(.7) saturate(.5)' : 'none'}}>
                <Avatar char={p.char} size={100}/>
              </div>
              {ps.muddy > 0 && (
                <>
                  <div style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',fontSize:24}}>💧</div>
                  {/* splash */}
                  {[...Array(5)].map((_,k)=>(
                    <div key={k} style={{position:'absolute', left:`calc(50% + ${(k-2)*12}px)`, bottom:-4, width:6, height:6, borderRadius:'50%', background:'#6b4a2e', opacity:ps.muddy, transform:`translateY(${-ps.muddy*30}px)`, transition:'all .2s'}}/>
                  ))}
                </>
              )}
              {i === 0 && (
                <div style={{position:'absolute',bottom:-12,left:'50%',transform:'translateX(-50%)',background:'var(--yellow)',border:'2px solid var(--ink)',borderRadius:6,padding:'1px 6px',fontFamily:"'Luckiest Guy'",fontSize:11}}>YOU</div>
              )}
              {jump > 0 && i === 0 && (
                <div style={{position:'absolute',top:-22,left:'50%',transform:'translateX(-50%)',fontFamily:"'Luckiest Guy'",color:'var(--yellow)',fontSize:18,WebkitTextStroke:'2px var(--ink)'}}>JUMP!</div>
              )}
            </div>
          );
        })}
      </div>

      {/* controls hint */}
      <div style={{position:'absolute',bottom:20,left:0,right:0,display:'flex',justifyContent:'center',gap:12,zIndex:30}}>
        <div style={{background:'#fff',border:'3px solid var(--ink)',borderRadius:14,padding:'8px 16px',fontFamily:"'Luckiest Guy'",fontSize:16}}>
          ←→ or A/D to switch lane · SPACE to JUMP · dodge 💧 MUD and 🪢 ROPES
        </div>
      </div>

      {!started && <Countdown onDone={()=>setStarted(true)}/>}
      {finished && (() => {
        const ranked = pstate.map((p,i)=>({i,h:p.hits,d:p.dist})).sort((a,b)=> a.h - b.h || b.d - a.d);
        const winner = players[ranked[0].i];
        return (
          <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center, rgba(0,0,0,.2) 30%, rgba(0,0,0,.6) 80%)',display:'grid',placeItems:'center',zIndex:40, overflow:'hidden'}}>
            {[...Array(12)].map((_,k) => {
              const colors = ['#ffc93c','#e04b3b','#4aa3e0','#6cc24a','#f28bbd','#ffec8a'];
              const col = colors[k%colors.length];
              const fx = 20 + (k*67)%60, fy = 10 + (k*41)%40;
              return (
                <div key={k} style={{position:'absolute', left:`${fx}%`, top:`${fy}%`, width:4, height:4, animation:`fw ${1.2 + (k%3)*0.3}s ease-out ${(k%5)*0.2}s infinite`}}>
                  {[...Array(10)].map((_,j) => {
                    const a = (j/10)*Math.PI*2;
                    return <div key={j} style={{position:'absolute', left:0, top:0, width:6, height:6, background:col, borderRadius:'50%',
                      transform:`translate(${Math.cos(a)*50}px, ${Math.sin(a)*50}px)`, boxShadow:`0 0 8px ${col}`}}/>;
                  })}
                </div>
              );
            })}
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14, zIndex:2}}>
              <div className="pop-in" style={{fontFamily:"'Luckiest Guy'",fontSize:120,color:'var(--yellow)',WebkitTextStroke:'6px var(--ink)',textShadow:'0 10px 0 var(--ink)'}}>ФИНИШ!</div>
              <div className="pop-in" style={{display:'flex',alignItems:'center',gap:14,background:'#fff',border:'5px solid var(--ink)',borderRadius:20,padding:'12px 22px',boxShadow:'0 10px 0 var(--ink)'}}>
                <span style={{fontSize:40}}>🏆</span>
                <Avatar char={winner.char} size={70}/>
                <div>
                  <div style={{fontFamily:"'Luckiest Guy'",fontSize:16,color:'var(--wood-dk)'}}>МЕНЬШЕ ВСЕГО ГРЯЗИ</div>
                  <div style={{fontFamily:"'Luckiest Guy'",fontSize:32,color:'var(--ink)'}}>{playerLabel(winner)}</div>
                </div>
              </div>
            </div>
            <style>{`@keyframes fw{0%{opacity:0;transform:scale(0)}20%{opacity:1}100%{opacity:0;transform:scale(2)}}`}</style>
          </div>
        );
      })()}
    </div>
  );
}

window.BB.games.register({
  id: 'mud',
  name: 'Грязный Забег',
  blurb: 'Беги через грязь, верёвки и похмелье. Финиш где-то там.',
  icon: '💧',
  tint: '#4aa3e0',
  phoneContract: 'steer',
  phonePrompt: '⬅ ➡ ПОЛОСА · ▲ ПРЫЖОК',
  rules: {
    name: 'Грязный Забег',
    tagline: 'Полоса препятствий. Как понедельник на работе.',
    howTo: [
      '3 полосы. Переключайся между ними, избегай грязи и верёвок.',
      '⬅ ➡ — сменить полосу. ▲ — прыжок через верёвку.',
      'Попал в грязь — тормозишь. Влетел в верёвку — считается удар.',
    ],
    control: '📱 ⬅ ➡ · ▲ ПРЫЖОК · ⌨ A/D · ПРОБЕЛ',
    win: 'Меньше всего огребаний — победа',
  },
  component: MudDash,
});
