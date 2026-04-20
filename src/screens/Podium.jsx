// src/screens/Podium.jsx - final podium with fireworks + phone
// rematch ready-up ribbon.

function Podium({ players, scores, onPlayAgain, onQuit }) {
  const ranked = players.map((p,i)=>({p,i,s:scores[i]})).sort((a,b)=>b.s-a.s);
  const champion = ranked[0];

  // Rematch ready-up: phones tap TAP FOR REMATCH on their finale splash.
  // When every phone-owned slot has confirmed, auto-invoke onPlayAgain so
  // no one has to reach for the host keyboard between games.
  const [readyIds, setReadyIds] = useState(() => new Set());
  const remoteCount = players.filter(p => p.remoteId).length;
  const readyCount = readyIds.size;
  const { onInput } = window.BB.mp.useMultiplayer();
  useEffect(() => {
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
      setTimeout(onPlayAgain, 450);
    }
  }, [readyCount, remoteCount, onPlayAgain]);

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
          <TitleWord text="ЧЕМПИОН!" color="var(--yellow)" size={72}/>
        </div>
        {champion && (
          <div className="pop-in" style={{marginTop:10,display:'inline-flex',alignItems:'center',gap:10,background:'rgba(0,0,0,.35)',border:'4px solid #fff',borderRadius:16,padding:'8px 22px',animationDelay:'.4s'}}>
            <Avatar char={champion.p.char} size={42}/>
            <span style={{fontFamily:"'Luckiest Guy'",color:'#fff',fontSize:28,letterSpacing:2}}>{playerLabel(champion.p)} ВЫИГРАЛ(А)!</span>
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

      <div style={{position:'absolute',bottom:14,left:0,right:0,textAlign:'center'}}>
        {remoteCount > 0 && (
          <div style={{
            marginBottom:10, display:'inline-block', background:'rgba(0,0,0,.45)',
            border:'3px solid #fff', borderRadius:14, padding:'6px 18px',
            fontFamily:"'Luckiest Guy'", fontSize:18, color:'#fff', letterSpacing:1.5,
            boxShadow:'0 4px 0 rgba(0,0,0,.3)'
          }}>
            {readyCount}/{remoteCount} ЖДУТ РЕВАНША
          </div>
        )}
        <div style={{display:'flex', justifyContent:'center', gap:16}}>
          <Btn variant="green" size="xl" onClick={onPlayAgain}>ЕЩЁ РАЗОК ↻</Btn>
          <Btn variant="red" size="xl" onClick={onQuit}>ГЛАВНОЕ МЕНЮ</Btn>
        </div>
      </div>
    </div>
  );
}


Object.assign(window, { Podium });
