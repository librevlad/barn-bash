// src/ui/RulesSplash.jsx
// Pre-game rules overlay. Shown by MinigameHost for a fixed window
// (default 5s) before the actual minigame mounts so new players aren't
// dropped into a scene they don't understand. Added after Max's test —
// "слишком быстро начинается и непонятно что делать".
//
// The host reads `def.rules` (Russian copy with a бытовой чёрно-юморный
// наклон) and composes a plank-card layout:
//   · giant icon + game name
//   · one-line tagline
//   · 2-4 short rule bullets
//   · control hint row
//   · big "ПОЕХАЛИ" button + auto-dismiss countdown
//
// onSkip is called when the timer runs out OR the button/keyboard (SPACE/
// ENTER) fires. The host can press "пропустить" if the group already
// knows the rules.

function RulesSplash({ def, onSkip, duration = 5 }) {
  const [remaining, setRemaining] = useState(duration);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onSkip && onSkip();
  }, [onSkip]);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const left = Math.max(0, duration - elapsed);
      setRemaining(left);
      if (left <= 0) { finish(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, finish]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  const rules = def.rules || {};
  const tagline = rules.tagline || def.blurb || '';
  const bullets = rules.howTo || [];
  const control = rules.control || (def.phoneContract === 'tap' ? '📱 ТАП · ⌨ ПРОБЕЛ'
                                  : def.phoneContract === 'steer' ? '📱 ⬅ ➡ · ▲ ПРЫЖОК'
                                  : def.phoneContract === 'holes' ? '📱 ТЫК в дыру'
                                                                  : '📱 ТАП');
  const win = rules.win || '';

  return (
    <div style={{
      position:'absolute', inset:0,
      background: `linear-gradient(180deg, ${def.tint || '#ffc93c'} 0%, #8f6a3b 100%)`,
      display:'grid', placeItems:'center', zIndex:60, overflow:'hidden'
    }}>
      {/* soft dimmer so the plank pops */}
      <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,.18)'}}/>

      <div style={{
        position:'relative', maxWidth:1000, width:'88%',
        background:'#fff', border:'6px solid var(--ink)', borderRadius:32,
        boxShadow:'0 16px 0 var(--ink)', padding:'32px 48px 24px',
        transform:'rotate(-0.8deg)'
      }}>
        {/* header */}
        <div style={{display:'flex', alignItems:'center', gap:24, marginBottom:18}}>
          <div style={{fontSize:120, lineHeight:1}}>{def.icon}</div>
          <div>
            <div style={{fontFamily:"'Luckiest Guy'", fontSize:56, color:'var(--ink)', letterSpacing:1, lineHeight:1.05}}>
              {(rules.name || def.name || '').toUpperCase()}
            </div>
            {tagline && (
              <div style={{fontFamily:"'Fredoka', sans-serif", fontWeight:600, fontSize:22, color:'var(--wood-dk)', marginTop:6}}>
                {tagline}
              </div>
            )}
          </div>
        </div>

        {/* bullets */}
        {bullets.length > 0 && (
          <div style={{background:'#fff7e3', border:'4px solid var(--ink)', borderRadius:18, padding:'16px 22px', marginBottom:14}}>
            {bullets.map((b, i) => (
              <div key={i} style={{display:'flex', gap:12, alignItems:'flex-start', marginBottom: i === bullets.length - 1 ? 0 : 10}}>
                <div style={{fontFamily:"'Luckiest Guy'", fontSize:24, color:'var(--red)', minWidth:28}}>{i + 1}.</div>
                <div style={{fontFamily:"'Fredoka', sans-serif", fontWeight:600, fontSize:22, color:'var(--ink)', lineHeight:1.25}}>{b}</div>
              </div>
            ))}
          </div>
        )}

        {/* footer: controls + win */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:14, flexWrap:'wrap'}}>
          <div style={{background:'var(--ink)', color:'#fff', padding:'10px 18px', borderRadius:14, fontFamily:"'Luckiest Guy'", fontSize:22, letterSpacing:1}}>
            {control}
          </div>
          {win && (
            <div style={{fontFamily:"'Fredoka', sans-serif", fontWeight:700, fontSize:20, color:'var(--wood-dk)'}}>
              🏆 {win}
            </div>
          )}
        </div>
      </div>

      {/* skip button + countdown */}
      <div style={{position:'absolute', bottom:36, left:0, right:0, display:'flex', justifyContent:'center', alignItems:'center', gap:22}}>
        <button
          onClick={finish}
          onTouchStart={(e) => { e.preventDefault(); finish(); }}
          style={{
            fontFamily:"'Luckiest Guy'", fontSize:36, padding:'16px 56px', letterSpacing:2,
            background:'var(--green)', color:'#fff', WebkitTextStroke:'2px var(--ink)',
            border:'6px solid var(--ink)', borderRadius:22,
            boxShadow:'0 10px 0 var(--ink)', cursor:'pointer'
          }}
        >
          ПОЕХАЛИ · {Math.ceil(remaining)}
        </button>
        <div style={{fontFamily:"'Fredoka', sans-serif", fontWeight:600, fontSize:14, color:'var(--cream)', opacity:.85}}>
          ПРОБЕЛ / ENTER / ТАП пропустить
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RulesSplash });
