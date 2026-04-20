// src/screens/TitleScreen.jsx - hero screen with QR, joined-phone
// gallery, ready-up ribbon, and PLAY / CUSTOMIZE / SETTINGS row.

/* ==========  TITLE  ========== */
function TitleScreen({ onPlay, onCustomize, onSettings, remotePlayers=[] }) {
  const { onInput } = window.BB.mp.useMultiplayer();
  // Ready-up: phones tap LET'S GO on their lobby once they're in. When every
  // named, critter-picked phone has confirmed, auto-invoke onPlay so the
  // game starts without the host ever reaching for the keyboard. Manual
  // PLAY click still works as a fallback.
  const joined = (remotePlayers || []).filter(p => p.name && p.character);
  const remoteCount = joined.length;
  const [readyIds, setReadyIds] = useState(() => new Set());
  // Drop ready signals from phones that have left so a stale tap from an
  // earlier joiner can't pre-pass the gate once a new phone takes its place.
  const liveRemoteIds = joined.map(p => p.id).join(',');
  useEffect(() => {
    const live = new Set(liveRemoteIds.split(',').filter(Boolean).map(Number));
    setReadyIds(prev => {
      let dirty = false;
      const next = new Set();
      for (const id of prev) { if (live.has(id)) next.add(id); else dirty = true; }
      return dirty ? next : prev;
    });
  }, [liveRemoteIds]);
  const readyCount = readyIds.size;
  useEffect(() => {
    if (!onInput) return;
    const off = onInput(({ id, kind }) => {
      if (kind !== 'ready') return;
      setReadyIds(prev => prev.has(id) ? prev : new Set([...prev, id]));
    });
    return () => { try { off && off(); } catch (_) {} };
  }, [onInput]);
  const pickedRef = useRef(false);
  useEffect(() => {
    if (pickedRef.current) return;
    if (remoteCount > 0 && readyCount >= remoteCount) {
      pickedRef.current = true;
      setTimeout(onPlay, 800);
    }
  }, [readyCount, remoteCount, onPlay]);

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
          ВЕЧЕРИНКА ДЛЯ СВОИХ &nbsp;•&nbsp; 2–6 ИГРОКОВ &nbsp;•&nbsp; 9 МИНИ&#8209;ИГР
        </div>
        </div>
      </div>

      {/* Sparkles */}
      <Sparkle x={180} y={120} size={30}/>
      <Sparkle x={1400} y={90} size={28} c="#e04b3b"/>
      <Sparkle x={1300} y={260} size={20} c="#4aa3e0"/>
      <Sparkle x={220} y={260} size={22} c="#6cc24a"/>

      {/* Joined phones gallery — pops in as critters arrive, flips green
          with a corner checkmark once the player taps LET'S GO. */}
      {remoteCount > 0 && (
        <div style={{
          position:'absolute', left:0, right:0, bottom:220,
          display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap', padding:'0 60px'
        }}>
          {joined.map(p => {
            const char = CHARACTERS.find(c => c.id === p.character) || CHARACTERS[0];
            const isReady = readyIds.has(p.id);
            return (
              <div key={p.id} className="pop-in" style={{
                background: isReady ? 'var(--green)' : '#fff',
                border:'4px solid var(--ink)', borderRadius:16,
                boxShadow:'0 6px 0 var(--ink)',
                padding:'10px 14px', display:'flex', flexDirection:'column',
                alignItems:'center', gap:4, minWidth:110, position:'relative'
              }}>
                <Avatar char={char} size={64} bob={!isReady}/>
                <div style={{
                  fontFamily:"'Luckiest Guy'", fontSize:16,
                  color: isReady ? '#fff' : 'var(--ink)', letterSpacing:.5
                }}>
                  {(p.name || char.name).toUpperCase()}
                </div>
                {isReady && (
                  <div style={{
                    position:'absolute', top:-10, right:-10,
                    background:'var(--yellow)', border:'3px solid var(--ink)',
                    borderRadius:'50%', width:30, height:30,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:"'Luckiest Guy'", fontSize:16, color:'var(--ink)',
                    boxShadow:'0 3px 0 var(--ink)'
                  }}>✓</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Button row on the pedestal */}
      <div style={{position:'absolute', left:0, right:0, bottom:70, textAlign:'center'}}>
        {remoteCount > 0 && (
          <div style={{
            marginBottom:14, display:'inline-block', background:'rgba(0,0,0,.45)',
            border:'3px solid #fff', borderRadius:14, padding:'6px 18px',
            fontFamily:"'Luckiest Guy'", fontSize:18, color:'#fff', letterSpacing:1.5,
            boxShadow:'0 4px 0 rgba(0,0,0,.3)'
          }}>
            {readyCount}/{remoteCount} ГОТОВЫ{readyCount >= remoteCount ? ' — ПОЕХАЛИ...' : ''}
          </div>
        )}
        <div style={{display:'flex', justifyContent:'center', gap:28}}>
          <Btn variant="yellow" size="xl" onClick={onPlay} icon={
            <svg width="36" height="36" viewBox="0 0 40 40" style={{marginRight:8}}>
              <polygon points="10,6 34,20 10,34" fill="#fff" stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round"/>
            </svg>
          }>ИГРАТЬ</Btn>
          <Btn variant="green" size="xl" onClick={onCustomize} icon={
            <svg width="32" height="32" viewBox="0 0 40 40" style={{marginRight:8}}>
              <circle cx="20" cy="20" r="14" fill="#fff" stroke="#2a1a10" strokeWidth="3"/>
              <circle cx="14" cy="16" r="2.5" fill="#e04b3b"/>
              <circle cx="20" cy="12" r="2.5" fill="#4aa3e0"/>
              <circle cx="26" cy="16" r="2.5" fill="#6cc24a"/>
              <circle cx="26" cy="22" r="2.5" fill="#a36bd1"/>
            </svg>
          }>ПЕРСОНАЖ</Btn>
          <Btn variant="orange" size="xl" onClick={onSettings} icon={
            <svg width="30" height="30" viewBox="0 0 40 40" style={{marginRight:8}}>
              <path d="M20 4 L24 10 L30 8 L30 16 L36 20 L30 24 L30 32 L24 30 L20 36 L16 30 L10 32 L10 24 L4 20 L10 16 L10 8 L16 10 Z" fill="#fff" stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round"/>
              <circle cx="20" cy="20" r="5" fill="#2a1a10"/>
            </svg>
          }>НАСТРОЙКИ</Btn>
        </div>
      </div>

      {/* PRESS START blinker. Previously the top-right corner showed fake
          "1,240 coins · LVL 7" counters that had no game meaning — kill-on-
          sight item from the first live test (Max saw them and asked what
          they meant). Removed until we have real progression wiring. */}
      <div style={{position:'absolute',bottom:18,left:'50%',transform:'translateX(-50%)',fontFamily:'Luckiest Guy',color:'#fff',fontSize:16,textShadow:'0 2px 0 #000',opacity:.85}}>
        v0.1 · телек + телефоны · 2–6 игроков
      </div>
    </div>
  );
}


Object.assign(window, { TitleScreen });
