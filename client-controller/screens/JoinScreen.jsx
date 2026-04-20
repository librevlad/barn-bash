// client-controller/screens/JoinScreen.jsx
// First-time join form: name input + critter carousel + JOIN button.
// Pure rendering — all state + cycle logic lives in App; this file only
// owns the layout.

function JoinScreen({ name, setName, critter, cycleCritter, doJoin }) {
  const shown = CRITTERS.find(c => c.id === critter) || CRITTERS[0];
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div className="title">BARN BASH</div>
      <div className="subtitle">join the party</div>
      <div className="card">
        <div className="field">
          <label htmlFor="name">your name</label>
          <input id="name" value={name} onChange={(e)=>setName(e.target.value.slice(0,20))} placeholder="e.g. Alex"/>
        </div>
        <div className="field">
          <label>pick a critter</label>
          <div className="critter-carousel">
            <button className="carousel-arrow"
                    onPointerDown={(e)=>{e.preventDefault(); cycleCritter(-1);}}
                    aria-label="previous critter">◀</button>
            <div className="carousel-card" style={{background: shown.color + '55'}}>
              <div className="carousel-emoji">{shown.emoji}</div>
              <div className="carousel-name">{shown.name.toUpperCase()}</div>
            </div>
            <button className="carousel-arrow"
                    onPointerDown={(e)=>{e.preventDefault(); cycleCritter(1);}}
                    aria-label="next critter">▶</button>
          </div>
        </div>
        <button className="btn green" disabled={!name.trim() || !critter} onClick={doJoin}>JOIN</button>
      </div>
    </div>
  );
}

Object.assign(window, { JoinScreen });
