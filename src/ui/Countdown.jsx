// src/ui/Countdown.jsx
// Shared 3-2-1 GO overlay. Every mini-game mounts one before gameplay
// starts so the host and phones can brace.

function Countdown({ onDone }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n <= 0) { onDone(); return; }
    const t = setTimeout(() => setN(n - 1), 800);
    return () => clearTimeout(t);
  }, [n]);
  if (n <= 0) return null;
  const label = n === 0 ? 'GO!' : String(n);
  return (
    <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.25)',display:'grid',placeItems:'center',zIndex:30}}>
      <div key={n} className="pop-in" style={{
        fontFamily:"'Luckiest Guy'", fontSize: n === 0 ? 220 : 280, color: n === 0 ? 'var(--green)' : 'var(--yellow)',
        WebkitTextStroke: '8px var(--ink)', textShadow:'0 12px 0 var(--ink)'
      }}>{label}</div>
    </div>
  );
}

Object.assign(window, { Countdown });
