// src/games/pig-sprint/PigSprint.jsx
// Tap-race mini-game: mash the button (or phone tap) to run your critter
// down a lane. First past the finish wins +5 coins; podium gets +3, +1, 0.

/* ==========  GAME 1: PIG SPRINT (tap race)  ========== */
function PigSprint({ state, onFinish, onQuit, game }) {
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

  // Broadcast live progress (0..FINISH) so phones can see their own lane.
  useEffect(() => {
    const byId = {};
    let leader = 0;
    players.forEach((p, i) => {
      const s = Math.round(positions[i] || 0);
      if (p.remoteId) byId[p.remoteId] = s;
      if (s > leader) leader = s;
    });
    game.score.update(byId, { leader, label: 'yards' });
  }, [game, positions, players]);
  useEffect(() => {
    const off = game.input.onTap((id) => {
      if (!started || finished) return;
      const idx = players.findIndex(p => p.remoteId === id);
      if (idx < 0) return;
      setPositions(prev => {
        const next = prev.slice();
        next[idx] = Math.min(FINISH, next[idx] + 22);
        return next;
      });
    });
    return () => { try { off && off(); } catch (_) {} };
  }, [game, started, finished, players]);

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
      setTimeout(() => game.game.finish(earned), 900);
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
            {/* name tag — sits left of the finish stripe so multi-char names
                (VLAD, HOPPER, MARMALADE) don't get clipped by the bar */}
            <div style={{position:'absolute', right:44, top:10, fontFamily:"'Luckiest Guy'", fontSize:16, color:'var(--ink)', background:i===0?'#ffc93c':'#fff', padding:'2px 8px', borderRadius:8, border:'2px solid var(--ink)', whiteSpace:'nowrap'}}>
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

window.BB.games.register({
  id: 'tap',
  name: 'Pig Sprint',
  blurb: 'Smash to run! First to the finish line wins.',
  icon: '🏁',
  tint: '#ffc93c',
  phoneContract: 'tap',
  phonePrompt: 'TAP AS FAST AS YOU CAN!',
  component: PigSprint,
});
