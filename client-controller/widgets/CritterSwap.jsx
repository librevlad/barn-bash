// client-controller/widgets/CritterSwap.jsx
// Mid-game sheet for swapping critter without leaving the session.

function CritterSwap({ current, takenBy, onPick, onClose }) {
  return (
    <div onPointerDown={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div onPointerDown={(e)=>e.stopPropagation()} style={{
        background:'#fff', border:'4px solid var(--ink)', borderRadius:20,
        boxShadow:'0 8px 0 var(--ink)', padding:16, width:'85%', maxWidth:340
      }}>
        <div style={{fontFamily:"'Luckiest Guy'", fontSize:20, textAlign:'center', marginBottom:10}}>swap critter</div>
        <div className="critter-grid">
          {CRITTERS.map(c => {
            const taken = c.id !== current && takenBy.has(c.id);
            return (
              <div key={c.id}
                   className={`critter ${c.id === current ? 'on' : ''} ${taken ? 'taken' : ''}`}
                   style={{background: c.id === current ? 'var(--yellow)' : (c.color + '55')}}
                   onPointerDown={(e)=>{e.preventDefault(); !taken && onPick(c);}}>
                {c.name}
              </div>
            );
          })}
        </div>
        <button className="btn" style={{marginTop:12}} onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}

Object.assign(window, { CritterSwap });
