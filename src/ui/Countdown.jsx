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
  const isGo = n === 0;
  const label = isGo ? 'ПОШЁЛ!' : String(n);
  // Coloured concentric rings behind the digit — deeper red as the count
  // ticks down, then a green burst on ПОШЁЛ. Vignette darkens slightly
  // at "1" so the screen feels coiled before release.
  const ringColor = n === 3 ? 'rgba(108,194,74,.55)'
                   : n === 2 ? 'rgba(255,201,60,.55)'
                   : n === 1 ? 'rgba(224,75,59,.65)'
                   : 'rgba(108,194,74,.7)';
  const bgAlpha = n === 1 ? 0.4 : 0.25;
  return (
    <div style={{position:'absolute',inset:0,background:`rgba(0,0,0,${bgAlpha})`,display:'grid',placeItems:'center',zIndex:30,
      transition:'background .15s'}}>
      {/* concentric ring backdrop */}
      <div style={{position:'absolute', width:520, height:520, borderRadius:'50%',
        background:`radial-gradient(circle, ${ringColor} 0 18%, transparent 38%, ${ringColor} 42%, transparent 58%, ${ringColor} 62%, transparent 76%)`,
        opacity:.7, pointerEvents:'none'}}/>
      <div key={n} className="pop-in" style={{
        fontFamily:"'Luckiest Guy'", fontSize: isGo ? 200 : 280,
        color: isGo ? 'var(--green)' : 'var(--yellow)',
        WebkitTextStroke: '8px var(--ink)', textShadow:'0 12px 0 var(--ink)',
        whiteSpace:'nowrap', position:'relative'
      }}>{label}</div>
    </div>
  );
}

Object.assign(window, { Countdown });
