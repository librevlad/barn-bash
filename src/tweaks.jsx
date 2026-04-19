// Tweaks panel + edit mode messaging

function TweaksPanel({ tweaks, setTweaks, open, setOpen }) {
  const palettes = [
    { id:'barnyard', name:'Barnyard', colors:['#ffc93c','#e04b3b','#6cc24a','#4aa3e0'] },
    { id:'sunset',   name:'Sunset',   colors:['#f28b3a','#e04b7a','#a36bd1','#4a3a8e'] },
    { id:'candy',    name:'Candy',    colors:['#f28bbd','#7ad0e0','#b0e06c','#ffd26b'] },
    { id:'moody',    name:'Moody',    colors:['#4a6ea8','#2d4a7a','#8a5ca0','#c04a6a'] },
  ];

  return (
    <div className={'tweaks ' + (open ? 'open':'')}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h3>⚙ TWEAKS</h3>
        <button onClick={()=>setOpen(false)} style={{background:'var(--red)',color:'#fff',border:'3px solid var(--ink)',borderRadius:8,padding:'3px 8px',fontFamily:"'Luckiest Guy'",cursor:'pointer'}}>✕</button>
      </div>

      <label>Difficulty (CPU)</label>
      <div className="seg">
        {['easy','medium','hard'].map(d=>(
          <button key={d} className={tweaks.difficulty===d?'on':''} onClick={()=>setTweaks({...tweaks, difficulty:d})}>{d.toUpperCase()}</button>
        ))}
      </div>

      <label>Player count</label>
      <div className="seg">
        {[2,3,4,5,6].map(n=>(
          <button key={n} className={tweaks.playerCount===n?'on':''} onClick={()=>setTweaks({...tweaks, playerCount:n})}>{n}</button>
        ))}
      </div>

      <label>Total rounds</label>
      <div className="seg">
        {[3,5,8].map(n=>(
          <button key={n} className={tweaks.totalRounds===n?'on':''} onClick={()=>setTweaks({...tweaks, totalRounds:n})}>{n}</button>
        ))}
      </div>

      <label>Palette</label>
      <div className="row">
        {palettes.map(p=>(
          <div key={p.id} onClick={()=>setTweaks({...tweaks, palette:p.id})}
            className={'swatch ' + (tweaks.palette===p.id?'on':'')}
            style={{background:`linear-gradient(90deg, ${p.colors.join(',')})`, width:52}} title={p.name}/>
        ))}
      </div>

      <label>Round twists</label>
      <div className="seg">
        {['on','off'].map(v=>(
          <button key={v} className={tweaks.twists===(v==='on')?'on':''} onClick={()=>setTweaks({...tweaks, twists:v==='on'})}>{v.toUpperCase()}</button>
        ))}
      </div>

      <label>Your character</label>
      <div className="row" style={{maxHeight:70,overflow:'auto'}}>
        {CHARACTERS.map(c=>(
          <div key={c.id} onClick={()=>setTweaks({...tweaks, youChar:c.id})}
            className={'swatch ' + (tweaks.youChar===c.id?'on':'')}
            style={{background:c.color, width:34, height:34, display:'grid', placeItems:'center', fontSize:10}}
            title={c.name}>
            <span style={{fontFamily:"'Luckiest Guy'", color:'var(--ink)'}}>{c.name[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.TweaksPanel = TweaksPanel;
