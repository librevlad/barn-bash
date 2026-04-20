// src/screens/CharacterSelect.jsx - per-slot critter picker with
// phone auto-lock + Jackbox-style auto-start after all are ready.

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
  const hasPhones = Array.isArray(remotePlayers) && remotePlayers.some(p => p.remoteId);

  // Auto-start when every phone-owned slot is in (phones auto-ready their
  // slot on entry, so in phone mode `allReady` is effectively "rooms full").
  // 1200ms settle gives the roster a beat to register visually before the
  // screen flips. Manual START click still works as a fallback.
  const pickedRef = useRef(false);
  useEffect(() => {
    if (pickedRef.current) return;
    if (hasPhones && allReady) {
      pickedRef.current = true;
      setTimeout(onStart, 1200);
    }
  }, [hasPhones, allReady, onStart]);

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
        <Btn variant="cream" size="sm" onClick={onBack}>◀ НАЗАД</Btn>
        <div className="plank" style={{padding:'12px 30px', borderRadius:22}}>
          <span style={{fontFamily:"'Luckiest Guy'", fontSize:32, color:'var(--cream)'}}>ВЫБИРАЙ ЗВЕРЮГУ</span>
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
          ВСЕ ПЕРСОНАЖИ · ТЫКАЙ ◀ ▶ ЧТОБ МЕНЯТЬ
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
      <div style={{position:'absolute', bottom:40, left:0, right:0, textAlign:'center'}}>
        {hasPhones && allReady && (
          <div style={{
            marginBottom:10, display:'inline-block', background:'rgba(0,0,0,.45)',
            border:'3px solid #fff', borderRadius:14, padding:'6px 18px',
            fontFamily:"'Luckiest Guy'", fontSize:18, color:'#fff', letterSpacing:1.5,
            boxShadow:'0 4px 0 rgba(0,0,0,.3)'
          }}>
            ВСЕ ГОТОВЫ — ПОЕХАЛИ...
          </div>
        )}
        <div style={{display:'flex', justifyContent:'center', gap:20}}>
          <Btn variant="red" size="xl" onClick={onStart} disabled={!allReady} className={allReady ? 'pulse':''}>
            {allReady ? 'ПОЕХАЛИ! ▶' : 'ЖДЁМ ИГРОКОВ...'}
          </Btn>
        </div>
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
        <span>P{idx+1}{isYou && !slot.displayName ? ' (ТЫ)' : ''}</span>
        {slot.displayName && !slot.isCPU ? (
          <span style={{
            background:'var(--green)', color:'#fff', border:'2px solid var(--ink)',
            borderRadius:8, padding:'2px 8px', fontFamily:"'Luckiest Guy'", fontSize:12,
            letterSpacing:1, boxShadow:'0 2px 0 var(--ink)', display:'inline-flex', gap:4, alignItems:'center'
          }}>📱 ТЕЛЕФОН</span>
        ) : (!isYou && (
          <button onClick={()=>toggleCPU(idx)} style={{
            background: slot.isCPU ? 'var(--blue)' : 'var(--grass)', color:'#fff', border:'2px solid var(--ink)',
            borderRadius:8, padding:'2px 8px', fontFamily:"'Luckiest Guy'", fontSize:12, cursor:'pointer'
          }}>{slot.isCPU ? 'БОТ' : 'ЖИВОЙ'}</button>
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
        {showAsCritter ? `В ОБРАЗЕ ${slot.char.name.toUpperCase()}` : `"${slot.char.tag}"`}
      </div>

      <button onClick={()=>!slot.isCPU && !slot.displayName && toggleReady(idx)} disabled={slot.isCPU || !!slot.displayName} style={{
        width:'100%', background: slot.ready ? 'var(--green)' : 'var(--cream-2)',
        border:'3px solid var(--ink)', borderRadius:12,
        fontFamily:"'Luckiest Guy'", fontSize:18, padding:'6px',
        cursor: (slot.isCPU || slot.displayName) ? 'default' : 'pointer',
        color: slot.ready ? '#fff' : 'var(--ink)',
        boxShadow:'0 4px 0 var(--ink)'
      }}>
        {slot.isCPU ? '✓ БОТ ГОТОВ' : slot.ready ? '✓ ГОТОВ!' : 'ГОТОВ?'}
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

Object.assign(window, { CharacterSelect });
