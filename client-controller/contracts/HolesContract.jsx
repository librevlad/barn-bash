// client-controller/contracts/HolesContract.jsx
// 3×2 numbered-hole grid. Each press sends { kind:'holes', data:{ h } }.
// Used by Whack-a-Gopher.

function HolesContract({ prompt, send }) {
  const [hit, setHit] = useState(-1);
  const whack = (h) => {
    send({ type: 'input', kind: 'holes', data: { h } });
    vibrate(18);
    setHit(h);
    setTimeout(() => setHit(p => p === h ? -1 : p), 120);
  };
  return (
    <>
      <div className="screen-hint">{prompt || 'BOP THE GOPHER!'}</div>
      <div className="holes-pad">
        {[0,1,2,3,4,5].map(h => (
          <div key={h}
               className={`hole-btn ${hit === h ? 'hit' : ''}`}
               onPointerDown={(e)=>{e.preventDefault(); whack(h);}}>
            {h+1}
          </div>
        ))}
      </div>
    </>
  );
}

Object.assign(window, { HolesContract });
