// High-level screens: Title, CharacterSelect, Board, Scoreboard, Podium

/* ==========  TITLE  ========== */
function TitleScreen({ onPlay, onCustomize, onSettings }) {
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <SceneBG opacity={1} />
      {/* soft vignette so title pops */}
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center top, rgba(0,0,0,.25) 0%, transparent 35%), radial-gradient(ellipse at center bottom, rgba(0,0,0,.35) 0%, transparent 50%)'}}/>

      {/* floating particles */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}}>
        {Array.from({length:18}).map((_,i)=>(
          <div key={i} style={{
            position:'absolute',
            left:`${(i*53)%100}%`, bottom:'-20px',
            width:i%3===0?14:8, height:i%3===0?14:8,
            borderRadius:'50%',
            background:['#ffc93c','#fff','#a6d8ee','#f4a8c0'][i%4],
            boxShadow:'0 0 8px rgba(255,255,255,.6)',
            animation:`particle-rise ${6+(i%5)}s linear ${i*0.4}s infinite`,
          }}/>
        ))}
      </div>

      {/* Big title sign - wrapper handles centering, inner handles float animation */}
      <div style={{position:'absolute', top: 90, left:'50%', transform:'translateX(-50%)'}}>
        <div className="title-float" style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
        <div className="plank logo-glow" style={{
          padding:'18px 50px', borderRadius:28, borderWidth:8,
          boxShadow:'0 14px 0 rgba(0,0,0,.3), inset 0 6px 0 rgba(255,255,255,.2)',
          position:'relative',
        }}>
          {/* chain */}
          <div style={{position:'absolute',left:30,top:-40,width:6,height:40,background:'#555',borderRadius:3}}/>
          <div style={{position:'absolute',right:30,top:-40,width:6,height:40,background:'#555',borderRadius:3}}/>
          {/* star row */}
          <div style={{position:'absolute',top:-26,left:'50%',transform:'translateX(-50%)',display:'flex',gap:10}}>
            {['#ffc93c','#e04b3b','#4aa3e0','#6cc24a','#a36bd1'].map((c,i)=>(
              <svg key={i} width="28" height="28" viewBox="0 0 40 40">
                <polygon points="20,2 25,14 38,16 28,26 31,38 20,32 9,38 12,26 2,16 15,14" fill={c} stroke="#2a1a10" strokeWidth="2.5" strokeLinejoin="round"/>
              </svg>
            ))}
          </div>
          <div style={{display:'flex',gap:10, paddingTop:4}}>
            <TitleWord text="BARN" color="var(--yellow)" size={120}/>
            <TitleWord text="BASH" color="var(--red)" size={120}/>
          </div>
        </div>
        <div style={{marginTop:10,background:'#fff',border:'4px solid var(--ink)',padding:'6px 20px',borderRadius:30,fontFamily:'Luckiest Guy',letterSpacing:2,fontSize:22,color:'var(--ink-soft)',boxShadow:'0 6px 0 var(--ink)'}}>
          A FARMYARD PARTY BRAWL &nbsp;•&nbsp; 2–6 PLAYERS &nbsp;•&nbsp; 8 MINI&#8209;GAMES
        </div>
        </div>
      </div>

      {/* Sparkles */}
      <Sparkle x={180} y={120} size={30}/>
      <Sparkle x={1400} y={90} size={28} c="#e04b3b"/>
      <Sparkle x={1300} y={260} size={20} c="#4aa3e0"/>
      <Sparkle x={220} y={260} size={22} c="#6cc24a"/>

      {/* Button row on the pedestal */}
      <div style={{position:'absolute', left:0, right:0, bottom:70, display:'flex', justifyContent:'center', gap:28}}>
        <Btn variant="yellow" size="xl" onClick={onPlay} icon={
          <svg width="36" height="36" viewBox="0 0 40 40" style={{marginRight:8}}>
            <polygon points="10,6 34,20 10,34" fill="#fff" stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round"/>
          </svg>
        }>PLAY</Btn>
        <Btn variant="green" size="xl" onClick={onCustomize} icon={
          <svg width="32" height="32" viewBox="0 0 40 40" style={{marginRight:8}}>
            <circle cx="20" cy="20" r="14" fill="#fff" stroke="#2a1a10" strokeWidth="3"/>
            <circle cx="14" cy="16" r="2.5" fill="#e04b3b"/>
            <circle cx="20" cy="12" r="2.5" fill="#4aa3e0"/>
            <circle cx="26" cy="16" r="2.5" fill="#6cc24a"/>
            <circle cx="26" cy="22" r="2.5" fill="#a36bd1"/>
          </svg>
        }>CUSTOMIZE</Btn>
        <Btn variant="orange" size="xl" onClick={onSettings} icon={
          <svg width="30" height="30" viewBox="0 0 40 40" style={{marginRight:8}}>
            <path d="M20 4 L24 10 L30 8 L30 16 L36 20 L30 24 L30 32 L24 30 L20 36 L16 30 L10 32 L10 24 L4 20 L10 16 L10 8 L16 10 Z" fill="#fff" stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round"/>
            <circle cx="20" cy="20" r="5" fill="#2a1a10"/>
          </svg>
        }>SETTINGS</Btn>
      </div>

      {/* corner credits */}
      <div style={{position:'absolute', right:16, top:16, display:'flex', gap:8}}>
        <div className="plank" style={{padding:'6px 12px', fontSize:14}}>
          <Coin size={20}/> &nbsp;<span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)'}}>1,240</span>
        </div>
        <div className="plank" style={{padding:'6px 12px', fontSize:14}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)'}}>LVL 7</span>
        </div>
      </div>

      {/* PRESS START blinker */}
      <div style={{position:'absolute',bottom:18,left:'50%',transform:'translateX(-50%)',fontFamily:'Luckiest Guy',color:'#fff',fontSize:16,textShadow:'0 2px 0 #000',opacity:.85}}>
        v1.0 • couch + phones • 2–6 players
      </div>
    </div>
  );
}

/* ==========  CHARACTER SELECT  ========== */
function CharacterSelect({ onBack, onStart, playerCount=4, remotePlayers=null }) {
  // Phase mp/Stage 2 — when `remotePlayers` is a non-empty array (set by
  // App.startGame once phones joined), mirror it into `slots` so real
  // phones drive the display. Phones auto-ready since their critter is
  // already baked into gameState.players.
  const initialSlots = () => {
    if (Array.isArray(remotePlayers) && remotePlayers.length > 0) {
      return remotePlayers.map(p => ({
        isCPU: !!p.isCPU,
        char: p.char,
        ready: true,
        displayName: p.displayName,
      }));
    }
    const shuffled = [...CHARACTERS].sort(()=>Math.random()-.5);
    return Array.from({ length: playerCount }, (_, i) => ({
      isCPU: i !== 0,
      char: shuffled[i],
      ready: i !== 0,
    }));
  };
  const [slots, setSlots] = useState(initialSlots);

  // If remotePlayers changes mid-screen (new phone joined after entering
  // select), re-sync. Only when we're in remote mode.
  useEffect(() => {
    if (Array.isArray(remotePlayers) && remotePlayers.length > 0) {
      setSlots(remotePlayers.map(p => ({
        isCPU: !!p.isCPU, char: p.char, ready: true, displayName: p.displayName,
      })));
    }
  }, [remotePlayers]);

  const allReady = slots.every(s => s.ready);
  const usedIds = slots.map(s => s.char.id);

  const cycle = (idx, dir) => {
    setSlots(prev => {
      const next = [...prev];
      const cur = next[idx].char;
      const curI = CHARACTERS.findIndex(c => c.id === cur.id);
      for (let off = 1; off <= CHARACTERS.length; off++) {
        const cand = CHARACTERS[(curI + off*dir + CHARACTERS.length*2) % CHARACTERS.length];
        if (!usedIds.includes(cand.id) || cand.id === cur.id) {
          next[idx] = { ...next[idx], char: cand, ready: idx === 0 ? false : next[idx].ready };
          break;
        }
      }
      return next;
    });
  };

  const toggleReady = (idx) => {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, ready: !s.ready } : s));
  };

  const toggleCPU = (idx) => {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, isCPU: !s.isCPU, ready: !s.isCPU } : s));
  };

  return (
    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, #a6d8ee 0%, #c0e4f3 60%, #d9f0d0 100%)'}}>
      <Clouds count={5}/>
      <Grass/>

      {/* Header */}
      <div style={{position:'absolute', top: 24, left: 24, right:24, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <Btn variant="cream" size="sm" onClick={onBack}>◀ BACK</Btn>
        <div className="plank" style={{padding:'12px 30px', borderRadius:22}}>
          <span style={{fontFamily:"'Luckiest Guy'", fontSize:32, color:'var(--cream)'}}>PICK YOUR CRITTER</span>
        </div>
        <div style={{width:110}}/>
      </div>

      {/* Slot row */}
      <div style={{position:'absolute', top:140, left:0, right:0, display:'flex', justifyContent:'center', gap:24, flexWrap:'wrap', padding:'0 40px'}}>
        {slots.map((s, i) => (
          <CharSlot key={i} slot={s} idx={i} cycle={cycle} toggleReady={toggleReady} toggleCPU={toggleCPU} />
        ))}
      </div>

      {/* Character roster showcase */}
      <div style={{position:'absolute', bottom:220, left:40, right:40}}>
        <div style={{textAlign:'center', fontFamily:"'Luckiest Guy'", fontSize:22, color:'var(--ink)', marginBottom:10}}>
          ROSTER · TAP ARROWS TO SWAP
        </div>
        <div style={{display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap'}}>
          {CHARACTERS.map(c => {
            const taken = usedIds.includes(c.id);
            return (
              <div key={c.id} style={{
                background: taken ? '#d6c9a8' : '#fff',
                border:'3px solid var(--ink)', borderRadius:14,
                padding:8, width:110, textAlign:'center',
                opacity: taken ? .55 : 1,
                boxShadow:'0 4px 0 var(--ink)'
              }}>
                <Avatar char={c} size={64}/>
                <div style={{fontFamily:"'Luckiest Guy'", fontSize:14, color:'var(--ink)'}}>{c.name.toUpperCase()}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Start button */}
      <div style={{position:'absolute', bottom:40, left:0, right:0, display:'flex', justifyContent:'center', gap:20}}>
        <Btn variant="red" size="xl" onClick={onStart} disabled={!allReady} className={allReady ? 'pulse':''}>
          {allReady ? 'START THE BEDLAM! ▶' : 'WAITING FOR PLAYERS...'}
        </Btn>
      </div>
    </div>
  );
}

function CharSlot({ slot, idx, cycle, toggleReady, toggleCPU }) {
  const isYou = idx === 0;
  const bgs = ['#ffd7a8','#d8e8ff','#ffd8d8','#ddf5d0','#f5e0ff','#fff3c0','#d0f0f0','#f5dcc0'];
  const nameLabel = slot.displayName ? slot.displayName.toUpperCase() : slot.char.name.toUpperCase();
  const showAsCritter = slot.displayName && slot.displayName.toUpperCase() !== slot.char.name.toUpperCase();
  return (
    <div className="pop-in" style={{
      background: slot.ready ? bgs[idx % bgs.length] : '#eadec0',
      border:'5px solid var(--ink)', borderRadius:20, padding:'14px 16px',
      width:230, position:'relative',
      boxShadow: slot.ready ? '0 10px 0 var(--ink)' : '0 6px 0 var(--ink)',
      transform: slot.ready ? 'translateY(-4px) rotate(-1deg)':'none',
      transition:'transform .2s ease, box-shadow .2s ease'
    }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:"'Luckiest Guy'", fontSize:16, color:'var(--ink)'}}>
        <span>P{idx+1}{isYou && !slot.displayName ? ' (YOU)' : ''}</span>
        {slot.displayName && !slot.isCPU ? (
          <span style={{
            background:'var(--green)', color:'#fff', border:'2px solid var(--ink)',
            borderRadius:8, padding:'2px 8px', fontFamily:"'Luckiest Guy'", fontSize:12,
            letterSpacing:1, boxShadow:'0 2px 0 var(--ink)', display:'inline-flex', gap:4, alignItems:'center'
          }}>📱 PHONE</span>
        ) : (!isYou && (
          <button onClick={()=>toggleCPU(idx)} style={{
            background: slot.isCPU ? 'var(--blue)' : 'var(--grass)', color:'#fff', border:'2px solid var(--ink)',
            borderRadius:8, padding:'2px 8px', fontFamily:"'Luckiest Guy'", fontSize:12, cursor:'pointer'
          }}>{slot.isCPU ? 'CPU' : 'HUMAN'}</button>
        ))}
      </div>

      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8}}>
        <button onClick={()=>!slot.isCPU && !slot.displayName && cycle(idx, -1)} disabled={slot.isCPU || !!slot.displayName} style={arrowBtn}>◀</button>
        <Avatar char={slot.char} size={110} bob/>
        <button onClick={()=>!slot.isCPU && !slot.displayName && cycle(idx, 1)} disabled={slot.isCPU || !!slot.displayName} style={arrowBtn}>▶</button>
      </div>

      <div style={{textAlign:'center', fontFamily:"'Luckiest Guy'", fontSize:22, color:'var(--ink)', marginTop:4, lineHeight:1.1}}>
        {nameLabel}
      </div>
      <div style={{textAlign:'center', fontFamily:"'Luckiest Guy'", fontSize:13, color:'var(--wood-dk)', letterSpacing:.5, marginTop:2, marginBottom:8}}>
        {showAsCritter ? `AS ${slot.char.name.toUpperCase()}` : `"${slot.char.tag}"`}
      </div>

      <button onClick={()=>!slot.isCPU && toggleReady(idx)} disabled={slot.isCPU} style={{
        width:'100%', background: slot.ready ? 'var(--green)' : 'var(--cream-2)',
        border:'3px solid var(--ink)', borderRadius:12,
        fontFamily:"'Luckiest Guy'", fontSize:18, padding:'6px', cursor: slot.isCPU ? 'default':'pointer',
        color: slot.ready ? '#fff' : 'var(--ink)',
        boxShadow:'0 4px 0 var(--ink)'
      }}>
        {slot.isCPU ? '✓ BOT READY' : slot.ready ? '✓ READY!' : 'READY?'}
      </button>

      {slot.ready && <Sparkle x={-10} y={-10} size={24} c="#ffc93c"/>}
    </div>
  );
}

const arrowBtn = {
  background:'var(--yellow)', border:'3px solid var(--ink)', borderRadius:10,
  fontFamily:"'Luckiest Guy'", fontSize:22, padding:'6px 10px', cursor:'pointer',
  boxShadow:'0 4px 0 var(--ink)', color:'var(--ink)'
};

/* ==========  GAME BOARD (mini-game select)  ========== */
const MINIGAMES = [
  { id:'tap', name:'Pig Sprint', blurb:'Smash to run! First to the finish line wins.', icon:'🏁', ready:true, tint:'#ffc93c' },
  { id:'hay', name:'Hay Panic', blurb:'Dodge falling bales. Last animal standing.', icon:'🌾', ready:true, tint:'#8acb4a' },
  { id:'egg', name:'Egg Pass', blurb:'Hot-potato egg. Don\'t let it pop in your hand.', icon:'🥚', ready:true, tint:'#fff5e4' },
  { id:'aim', name:'Apple Aim', blurb:'Archery with apples. Most bullseyes wins.', icon:'🎯', ready:true, tint:'#e04b3b' },
  { id:'mud', name:'Mud Dash', blurb:'Sloshy slippery obstacle race.', icon:'💧', ready:true, tint:'#4aa3e0' },
  { id:'gopher', name:'Whack-a-Gopher', blurb:'Bop the gopher. Don\'t bop the bunny.', icon:'🔨', ready:true, tint:'#a36bd1' },
  { id:'tug', name:'Tug-o-War', blurb:'Team mash-off. Red vs Blue, pull the ribbon across.', icon:'🪢', ready:true, tint:'#c18040' },
  { id:'fish', name:'Fishing Frenzy', blurb:'Swing and drop. Catch fish, avoid boots.', icon:'🎣', ready:true, tint:'#4aa3e0' },
];

function BoardScreen({ state, onPick, onTweaks }) {
  const { round, totalRounds, scores, players, coins, modifier } = state;
  const [votes, setVotes] = useState({}); // { [id]: [pi, pi, ...] }
  const pickedRef = useRef(false);

  // Phone voting — first mini-game to receive a vote (or majority when all
  // connected phones vote) gets auto-picked. Host tile clicks still work too.
  useEffect(() => {
    const mp = (typeof window !== 'undefined') ? window.__BarnBashMPRT : null;
    if (!mp || !mp.onInput) return;
    const remoteCount = players.filter(p => p.remoteId).length;
    const off = mp.onInput(({ id, kind, data }) => {
      if (kind !== 'boardVote' || !data) return;
      const pi = players.findIndex(p => p.remoteId === id);
      if (pi < 0) return;
      const choice = data.id;
      if (!MINIGAMES.find(m => m.id === choice && m.ready)) return;
      setVotes(prev => {
        const next = {};
        // player votes only once — remove any prior slot
        Object.keys(prev).forEach(k => { next[k] = (prev[k] || []).filter(x => x !== pi); });
        next[choice] = [...(next[choice] || []), pi];
        // pick when every connected phone has cast a vote
        const totalVoters = Object.values(next).reduce((a, xs) => a + xs.length, 0);
        if (!pickedRef.current && remoteCount > 0 && totalVoters >= remoteCount) {
          // majority wins; tie broken by first reached
          let bestId = null, bestN = 0;
          Object.entries(next).forEach(([k, xs]) => { if (xs.length > bestN) { bestId = k; bestN = xs.length; } });
          if (bestId) { pickedRef.current = true; setTimeout(() => onPick(bestId), 450); }
        }
        return next;
      });
    });
    return () => { try { off && off(); } catch (_) {} };
  }, [players, onPick]);

  return (
    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,#bfe3a6 0%, #8fcf72 60%, #5aac45 100%)'}}>
      {/* pastoral pattern */}
      <svg viewBox="0 0 1600 900" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.25}}>
        {Array.from({length:40}).map((_,i)=>(
          <circle key={i} cx={randBetween(0,1600)} cy={randBetween(80,820)} r={randBetween(3,8)} fill="#fff"/>
        ))}
      </svg>
      <Clouds count={3}/>

      {/* Top bar */}
      <div style={{position:'absolute',top:20,left:24,right:24,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div className="plank" style={{padding:'10px 20px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:22}}>ROUND {round} / {totalRounds}</span>
        </div>
        <div className="plank" style={{padding:'10px 24px', transform:'rotate(1.5deg)'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:24}}>PICK A MINI-GAME</span>
        </div>
        <div style={{display:'flex',gap:10}}>
          <div className="plank" style={{padding:'10px 14px'}}>
            <Coin size={22}/> <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:20,marginLeft:6}}>{coins}</span>
          </div>
          <Btn variant="cream" size="sm" onClick={onTweaks}>⚙ TWEAKS</Btn>
        </div>
      </div>

      {/* Scoreboard strip */}
      <div style={{position:'absolute', top: 100, left:24, right:24, display:'flex', justifyContent:'center', gap:14}}>
        {players.map((p,i)=>(
          <div key={i} style={{
            background:'#fff', border:'4px solid var(--ink)', borderRadius:16, padding:'8px 14px',
            display:'flex', alignItems:'center', gap:10, boxShadow:'0 5px 0 var(--ink)',
            transform: i === 0 ? 'translateY(-4px)' : 'none'
          }}>
            <Avatar char={p.char} size={44}/>
            <div>
              <div style={{fontFamily:"'Luckiest Guy'",fontSize:14, color:'var(--ink)'}}>{playerLabel(p)} {i===0 && !p.displayName && <span style={{color:'var(--red)'}}>(YOU)</span>}</div>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <Coin size={16}/><span style={{fontFamily:"'Luckiest Guy'",fontSize:18,color:'var(--wood-dk)'}}>{scores[i]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modifier card */}
      {modifier && (
        <div style={{position:'absolute', top:220, left:'50%', transform:'translateX(-50%) rotate(-2deg)'}}>
          <Card style={{background:'#ffd8a0', borderColor:'var(--ink)', padding:'12px 24px'}}>
            <div style={{fontFamily:"'Luckiest Guy'",fontSize:14,color:'#a8291a'}}>⚡ ROUND TWIST</div>
            <div style={{fontFamily:"'Luckiest Guy'",fontSize:22,color:'var(--ink)'}}>{modifier.emoji || '⚡'} {(modifier.text || modifier).toUpperCase()}</div>
          </Card>
        </div>
      )}

      {/* Minigame cards grid — 4×2 keeps all eight tiles visible on a
          1600×900 viewport without forcing a scroll. */}
      <div style={{position:'absolute', top: 320, left:0, right:0, display:'grid',
        gridTemplateColumns:'repeat(4, 300px)', gap:22, justifyContent:'center'}}>
        {MINIGAMES.map(mg => (
          <MiniCard key={mg.id} mg={mg} onPick={() => mg.ready && onPick(mg.id)}
                    voters={(votes[mg.id] || []).map(pi => players[pi]).filter(Boolean)}/>
        ))}
      </div>
    </div>
  );
}

function MiniCard({ mg, onPick, voters = [] }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      onClick={onPick}
      style={{
        background: mg.tint, border:'5px solid var(--ink)', borderRadius:20,
        boxShadow: hover && mg.ready ? '0 14px 0 var(--ink)' : voters.length ? '0 10px 0 var(--ink)' : '0 8px 0 var(--ink)',
        transform: hover && mg.ready ? 'translateY(-6px) rotate(-1deg)' : voters.length ? 'translateY(-3px)' : 'none',
        transition: 'all .15s ease',
        cursor: mg.ready ? 'pointer' : 'not-allowed',
        padding:18, position:'relative',
        filter: mg.ready ? 'none' : 'grayscale(.5) brightness(.85)'
      }}>
      {voters.length > 0 && (
        <div style={{
          position:'absolute', top:-16, right:-10, display:'flex', gap:-4, zIndex:5
        }}>
          {voters.map((v, i) => (
            <div key={i} style={{
              background:'#fff', border:'3px solid var(--ink)', borderRadius:'50%',
              padding:2, boxShadow:'0 3px 0 var(--ink)', marginLeft: i ? -8 : 0, zIndex: 10-i
            }}>
              <Avatar char={v.char} size={28}/>
            </div>
          ))}
        </div>
      )}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontFamily:"'Luckiest Guy'", fontSize:26, color:'var(--ink)'}}>{mg.name.toUpperCase()}</div>
        <div style={{fontSize:40}}>{mg.icon}</div>
      </div>
      <div style={{background:'#fff', border:'3px solid var(--ink)', borderRadius:12, padding:'8px 12px', marginTop:10, fontWeight:600, minHeight:56}}>
        {mg.blurb}
      </div>
      <div style={{display:'flex', justifyContent:'space-between', marginTop:12, alignItems:'center'}}>
        <div style={{display:'flex', alignItems:'center', gap:4, fontFamily:"'Luckiest Guy'", color:'var(--wood-dk)'}}>
          <Coin size={18}/> +5 / WIN
        </div>
        <div style={{
          background: mg.ready ? 'var(--ink)' : '#7a6a55', color:'#fff',
          borderRadius:10, padding:'4px 10px', fontFamily:"'Luckiest Guy'", fontSize:14, letterSpacing:1
        }}>
          {mg.ready ? 'READY' : 'SOON'}
        </div>
      </div>
    </div>
  );
}

// Winner crown — hand-drawn SVG so it stays flat, scales crisply, and
// matches the Barn Bash yellow+ink+gems palette instead of relying on the
// OS emoji glyph (which renders tilted and off-style on different systems).
function CrownSVG({ size = 64 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 100 72" aria-hidden="true">
      {/* Body: three peaks */}
      <path
        d="M 8 58 L 14 22 L 30 40 L 50 14 L 70 40 L 86 22 L 92 58 Z"
        fill="#ffc93c" stroke="#2a1a10" strokeWidth="5" strokeLinejoin="round"
      />
      {/* Base band */}
      <rect x="6" y="54" width="88" height="14" rx="3" fill="#e09010" stroke="#2a1a10" strokeWidth="5"/>
      {/* Highlights along body */}
      <path d="M 12 52 L 18 30" stroke="#fff7c0" strokeWidth="3" strokeLinecap="round" opacity=".7"/>
      <path d="M 48 22 L 50 42" stroke="#fff7c0" strokeWidth="3" strokeLinecap="round" opacity=".7"/>
      <path d="M 82 30 L 88 52" stroke="#fff7c0" strokeWidth="3" strokeLinecap="round" opacity=".7"/>
      {/* Gems on peaks */}
      <circle cx="14" cy="22" r="5" fill="#e04b3b" stroke="#2a1a10" strokeWidth="3"/>
      <circle cx="50" cy="14" r="6" fill="#4aa3e0" stroke="#2a1a10" strokeWidth="3"/>
      <circle cx="86" cy="22" r="5" fill="#6cc24a" stroke="#2a1a10" strokeWidth="3"/>
      {/* Gem on base band */}
      <circle cx="50" cy="61" r="4" fill="#fff" stroke="#2a1a10" strokeWidth="2.5"/>
    </svg>
  );
}

/* ==========  SCOREBOARD  ========== */
function Scoreboard({ players, scores, earned, onContinue, minigameName, round, totalRounds }) {
  const ranked = [...players].map((p,i)=>({p,i,s:scores[i],e:earned[i]})).sort((a,b)=>b.e - a.e);
  const leaderboard = [...players].map((p,i)=>({p,i,total: scores[i] + earned[i]})).sort((a,b)=>b.total - a.total);

  // Ready-up tracking: phones tap READY on their summary overlay. When every
  // phone-owned slot has confirmed, auto-continue so the host doesn't need
  // to reach for the keyboard.
  const [readyIds, setReadyIds] = useState(() => new Set());
  const remoteCount = players.filter(p => p.remoteId).length;
  const readyCount = readyIds.size;
  useEffect(() => {
    const mp = (typeof window !== 'undefined') ? window.__BarnBashMPRT : null;
    if (!mp || !mp.onInput) return;
    const off = mp.onInput(({ id, kind }) => {
      if (kind !== 'ready') return;
      setReadyIds(prev => prev.has(id) ? prev : new Set([...prev, id]));
    });
    return () => { try { off && off(); } catch (_) {} };
  }, []);
  const pickedRef = useRef(false);
  useEffect(() => {
    if (pickedRef.current) return;
    if (remoteCount > 0 && readyCount >= remoteCount) {
      pickedRef.current = true;
      setTimeout(onContinue, 450);
    }
  }, [readyCount, remoteCount, onContinue]);
  return (
    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, #1a4b7a 0%, #2d6fa0 50%, #4aa3e0 100%)'}}>
      {/* scanlines */}
      <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg, rgba(255,255,255,.04) 0 2px, transparent 2px 6px)'}}/>
      {/* sparkle stars */}
      {[...Array(30)].map((_,i)=>{
        const x = (i*137)%1600, y = (i*83)%360;
        return <div key={i} className="pop-in" style={{position:'absolute',left:x,top:y,width:4,height:4,background:'#fff',borderRadius:'50%',boxShadow:'0 0 8px #fff', animationDelay:(i*0.02)+'s', opacity:.7}}/>;
      })}

      <div style={{position:'absolute',top:40,left:0,right:0,textAlign:'center'}}>
        <div className="plank" style={{display:'inline-block', padding:'14px 40px', borderRadius:24, whiteSpace:'nowrap'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:32}}>ROUND {round} · {minigameName.toUpperCase()}</span>
        </div>
        <div style={{marginTop:10,fontFamily:"'Luckiest Guy'",fontSize:18,color:'var(--cream-2)',letterSpacing:2}}>RESULTS</div>
      </div>

      {/* Round card reveal */}
      <div style={{position:'absolute',top:180,left:0,right:0,display:'flex',justifyContent:'center',gap:30,flexWrap:'wrap',padding:'0 40px'}}>
        {ranked.map((r, rank) => (
          <div key={r.i} className="pop-in" style={{
            background:'#fff', border:'5px solid var(--ink)', borderRadius:20,
            boxShadow:'0 10px 0 var(--ink)', padding:18, width:200, textAlign:'center',
            transform: rank === 0 ? 'translateY(-10px) rotate(-1deg)' : (rank === ranked.length-1 ? 'rotate(1deg)' : 'none'),
            position:'relative', animationDelay: (rank*0.2)+'s'
          }}>
            {rank === 0 && (
              <div style={{position:'absolute', top:-38, left:'50%', transform:'translateX(-50%)', animation:'bob 1.5s ease-in-out infinite', filter:'drop-shadow(0 4px 0 rgba(0,0,0,.25))'}}>
                <CrownSVG/>
              </div>
            )}
            {rank === 0 && (
              <div style={{position:'absolute',top:-12,left:-12,background:'var(--yellow)',border:'3px solid var(--ink)',borderRadius:10,padding:'2px 8px',fontFamily:"'Luckiest Guy'",fontSize:14,transform:'rotate(-8deg)'}}>WINNER!</div>
            )}
            <div style={{fontFamily:"'Luckiest Guy'", fontSize:36, color:rank===0?'#d99312':'var(--ink)'}}>#{rank+1}</div>
            <Avatar char={r.p.char} size={100} bob={rank===0}/>
            <div style={{fontFamily:"'Luckiest Guy'", fontSize:18, color:'var(--ink)'}}>{playerLabel(r.p)}</div>
            <div style={{display:'flex', justifyContent:'center', gap:6, alignItems:'center', marginTop:6,
              background: r.e > 0 ? 'var(--yellow)' : '#eee', border:'3px solid var(--ink)', borderRadius:10, padding:'4px 10px'
            }}>
              <Coin size={20}/>
              <span style={{fontFamily:"'Luckiest Guy'", fontSize:24, color:r.e>0?'var(--ink)':'#888'}}>+{r.e}</span>
            </div>
            <div style={{marginTop:8, fontFamily:"'Luckiest Guy'", fontSize:13, color:'var(--ink-soft)', opacity:.7}}>
              TOTAL
            </div>
            <div style={{fontFamily:"'Luckiest Guy'", fontSize:20, color:'var(--ink)'}}>{r.s + r.e}</div>
          </div>
        ))}
      </div>

      {/* Running standings ribbon */}
      <div style={{position:'absolute',bottom:170,left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,.3)',border:'3px solid var(--cream)',borderRadius:16,padding:'10px 20px',display:'flex',gap:20,alignItems:'center',backdropFilter:'blur(4px)'}}>
        <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream-2)',fontSize:16,letterSpacing:1}}>OVERALL ▸</span>
        {leaderboard.map((L, i) => (
          <div key={L.i} style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontFamily:"'Luckiest Guy'",color:i===0?'var(--yellow)':'var(--cream)',fontSize:18}}>{i+1}.</span>
            <Avatar char={L.p.char} size={28}/>
            <span style={{fontFamily:"'Luckiest Guy'",color:'#fff',fontSize:18}}>{L.total}</span>
          </div>
        ))}
      </div>

      <div style={{position:'absolute',bottom:50,left:0,right:0,textAlign:'center'}}>
        {remoteCount > 0 && (
          <div style={{marginBottom:10, display:'inline-block', background:'rgba(0,0,0,.35)',
            border:'3px solid var(--cream)', borderRadius:14, padding:'6px 16px',
            fontFamily:"'Luckiest Guy'", fontSize:16, color:'var(--cream)', letterSpacing:1}}>
            {readyCount}/{remoteCount} READY
          </div>
        )}
        <div>
          <Btn variant="green" size="xl" onClick={onContinue} className="pulse">
            {round >= totalRounds ? 'FINAL PODIUM! 🏆' : `ROUND ${round+1} ▶`}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ==========  PODIUM  ========== */
function Podium({ players, scores, onPlayAgain, onQuit }) {
  const ranked = players.map((p,i)=>({p,i,s:scores[i]})).sort((a,b)=>b.s-a.s);
  const champion = ranked[0];
  return (
    <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at top, #ffe49a 0%, #f2b04a 60%, #a86d1e 100%)', overflow:'hidden'}}>
      {/* radial rays */}
      <div style={{position:'absolute',inset:0,backgroundImage:'conic-gradient(from 0deg, transparent 0deg 8deg, rgba(255,255,255,.08) 8deg 16deg, transparent 16deg 24deg)',mixBlendMode:'overlay',animation:'sparkle-spin 40s linear infinite',transformOrigin:'center'}}/>
      {/* fireworks */}
      {[...Array(8)].map((_,i)=>{
        const x = 100 + (i*180)%1500;
        const y = 100 + (i*63)%260;
        const colors = ['#e04b3b','#4aa3e0','#6cc24a','#ffc93c','#a36bd1','#f28bbd'];
        const c = colors[i % colors.length];
        return (
          <div key={i} style={{position:'absolute',left:x,top:y,pointerEvents:'none', animation:`pop-in .7s ease ${i*0.3}s both`}}>
            {[...Array(10)].map((_,j)=>{
              const angle = (j/10)*Math.PI*2;
              const r = 40;
              return <div key={j} style={{position:'absolute',width:8,height:8,borderRadius:'50%',background:c,border:'2px solid #2a1a10',transform:`translate(${Math.cos(angle)*r}px,${Math.sin(angle)*r}px)`,boxShadow:`0 0 12px ${c}`}}/>;
            })}
            <div style={{position:'absolute',width:16,height:16,borderRadius:'50%',background:'#fff',transform:'translate(-8px,-8px)',boxShadow:`0 0 20px #fff`}}/>
          </div>
        );
      })}
      <Confetti count={120}/>

      <div style={{position:'absolute',top:30,left:0,right:0,textAlign:'center'}}>
        <div style={{display:'flex', gap:14, justifyContent:'center'}}>
          <TitleWord text="CHAMPION!" color="var(--yellow)" size={72}/>
        </div>
        {champion && (
          <div className="pop-in" style={{marginTop:10,display:'inline-flex',alignItems:'center',gap:10,background:'rgba(0,0,0,.35)',border:'4px solid #fff',borderRadius:16,padding:'8px 22px',animationDelay:'.4s'}}>
            <Avatar char={champion.p.char} size={42}/>
            <span style={{fontFamily:"'Luckiest Guy'",color:'#fff',fontSize:28,letterSpacing:2}}>{playerLabel(champion.p)} WINS!</span>
          </div>
        )}
      </div>

      {/* Podium bars */}
      <div style={{position:'absolute', bottom:100, left:0, right:0, display:'flex', justifyContent:'center', alignItems:'flex-end', gap:12}}>
        {[1,0,2,3].map((rankIdx, i) => {
          const r = ranked[rankIdx]; if (!r) return null;
          const heights = {0:340, 1:230, 2:170, 3:130};
          const colors = {0:'var(--yellow)', 1:'#c9c9c9', 2:'#cd7f32', 3:'#8a8680'};
          const medals = {0:'🥇',1:'🥈',2:'🥉',3:'4️⃣'};
          return (
            <div key={r.i} style={{display:'flex', flexDirection:'column', alignItems:'center', width:200}}>
              <div className="pop-in" style={{animationDelay:(i*0.3 + 0.6)+'s'}}>
                <div style={{fontSize:52, textAlign:'center', filter:rankIdx===0?'drop-shadow(0 0 12px #fff8c0)':''}}>{medals[rankIdx]}</div>
                <Avatar char={r.p.char} size={rankIdx === 0 ? 170 : 120} bob={rankIdx===0}/>
                <div style={{textAlign:'center',fontFamily:"'Luckiest Guy'",fontSize:22, color:'var(--ink)',marginTop:4}}>{playerLabel(r.p)}</div>
                <div style={{textAlign:'center',display:'flex',justifyContent:'center',gap:4,alignItems:'center'}}>
                  <Coin size={22}/>
                  <span style={{fontFamily:"'Luckiest Guy'",fontSize:26, color:'var(--wood-dk)'}}>{r.s}</span>
                </div>
              </div>
              <div style={{
                width:180, height:heights[rankIdx],
                background:colors[rankIdx], border:'5px solid var(--ink)',
                borderRadius:'12px 12px 0 0', marginTop:10,
                boxShadow:'inset 0 6px 0 rgba(255,255,255,.3), inset 0 -6px 0 rgba(0,0,0,.15), 0 8px 0 var(--ink)',
                display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:16,
                position:'relative', overflow:'hidden'
              }}>
                <div style={{fontFamily:"'Luckiest Guy'",fontSize:72, color:'var(--ink)', lineHeight:1}}>{rankIdx+1}</div>
                {/* shine sweep */}
                <div style={{position:'absolute',top:0,bottom:0,width:40,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent)',animation:`shine-sweep 3s ease-in-out ${i*0.5}s infinite`}}/>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{position:'absolute',bottom:14,left:0,right:0,display:'flex',justifyContent:'center',gap:16}}>
        <Btn variant="green" size="xl" onClick={onPlayAgain}>PLAY AGAIN ↻</Btn>
        <Btn variant="red" size="xl" onClick={onQuit}>MAIN MENU</Btn>
      </div>
    </div>
  );
}

Object.assign(window, { TitleScreen, CharacterSelect, BoardScreen, Scoreboard, Podium, MINIGAMES });
