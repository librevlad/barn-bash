// client-controller/contracts/TapContract.jsx
// Big red pad the player mashes — used by Pig Sprint, Egg Pass,
// Tug-o-War, Apple Aim angle/power, Fishing Frenzy, Barn Jump.

function TapContract({ prompt, send, locked }) {
  const [hit, setHit] = useState(false);
  const tap = () => {
    if (locked) return;
    send({ type: 'input', kind: 'tap', data: { t: Date.now() } });
    vibrate(15);
    setHit(true);
    setTimeout(() => setHit(false), 60);
  };
  return (
    <>
      <div className="screen-hint">{prompt || 'TAP AS FAST AS YOU CAN!'}</div>
      <div className={`tap-pad ${hit ? 'hit' : ''} ${locked ? 'locked' : ''}`} onPointerDown={tap} onTouchStart={(e)=>{e.preventDefault(); tap();}}>
        {locked ? 'WAIT' : 'TAP'}
      </div>
    </>
  );
}

// Three-button ◀ JUMP ▶ pad. Left/right are hold-to-steer (dir events on

Object.assign(window, { TapContract });
