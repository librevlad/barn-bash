// client-controller/screens/JoinScreen.jsx
// First-time join form: name input + critter carousel + JOIN button.
// Pure rendering — all state + cycle logic lives in App; this file only
// owns the layout.

function JoinScreen({ name, setName, critter, cycleCritter, doJoin }) {
  const shown = CRITTERS.find(c => c.id === critter) || CRITTERS[0];
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div className="title">BARN BASH</div>
      <div className="subtitle">залетай на вечеринку</div>
      <div className="card">
        <div className="field">
          <label htmlFor="name">как тебя звать</label>
          <input id="name" value={name} onChange={(e)=>setName(e.target.value.slice(0,20))} placeholder="напр. Миша"/>
        </div>
        <div className="field">
          <label>выбирай зверюгу</label>
          <div className="critter-carousel">
            <button className="carousel-arrow"
                    onPointerDown={(e)=>{e.preventDefault(); cycleCritter(-1);}}
                    aria-label="предыдущий персонаж">◀</button>
            <div className="carousel-card" style={{background: shown.color + '55'}}>
              <div className="carousel-emoji">{shown.emoji}</div>
              <div className="carousel-name">{shown.name.toUpperCase()}</div>
            </div>
            <button className="carousel-arrow"
                    onPointerDown={(e)=>{e.preventDefault(); cycleCritter(1);}}
                    aria-label="следующий персонаж">▶</button>
          </div>
        </div>
        <button className="btn green" disabled={!name.trim() || !critter} onClick={doJoin}>ЗАЙТИ</button>
      </div>
    </div>
  );
}

Object.assign(window, { JoinScreen });
