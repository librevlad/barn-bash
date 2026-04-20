// client-controller/contracts/TapContract.jsx
// Big red pad the player mashes — used by Pig Sprint, Egg Pass,
// Tug-o-War, Apple Aim angle/power, Fishing Frenzy, Barn Jump.

function TapContract({ prompt, send, locked }) {
  const [hit, setHit] = useState(false);
  // Dedup guard: a single physical tap on mobile fires BOTH touchstart AND
  // the synthesised pointerdown. preventDefault on touchstart doesn't stop
  // the pointer event on all browsers. We only bind onPointerDown (it covers
  // mouse, touch, pen uniformly since iOS 13 / Android Chrome 55) and drop
  // touch-start — otherwise a tap in Apple Aim skips from 'angle' to 'fire'
  // in one press, which is the bug that made live-test faces go red.
  const lastTapRef = useRef(0);
  const tap = () => {
    if (locked) return;
    const now = Date.now();
    if (now - lastTapRef.current < 80) return; // hard debounce regardless
    lastTapRef.current = now;
    send({ type: 'input', kind: 'tap', data: { t: now } });
    vibrate(15);
    setHit(true);
    setTimeout(() => setHit(false), 60);
  };
  return (
    <>
      <div className="screen-hint">{prompt || 'TAP AS FAST AS YOU CAN!'}</div>
      <div className={`tap-pad ${hit ? 'hit' : ''} ${locked ? 'locked' : ''}`} onPointerDown={tap}>
        {locked ? 'WAIT' : 'TAP'}
      </div>
    </>
  );
}

// Three-button ◀ JUMP ▶ pad. Left/right are hold-to-steer (dir events on

Object.assign(window, { TapContract });
