// client-controller/screens/RoundSummary.jsx
// Post-round celebration shown on the phone between rounds, with the
// 'TAP WHEN READY' ready-up button that auto-advances the host.

const RANK_TAGS = { 1: { label:'#1 · ПОБЕДА!', color:'var(--yellow)', emoji:'🏆' },
                    2: { label:'#2',           color:'#c0c0c0',       emoji:'🥈' },
                    3: { label:'#3',           color:'#cd7f32',       emoji:'🥉' } };

function RoundSummary({ summary, send }) {
  const tag = RANK_TAGS[summary.rank] || { label:`#${summary.rank}`, color:'#888', emoji:'🎯' };
  const gotCoins = summary.earned > 0;
  const [ready, setReady] = useState(false);
  const onReady = () => {
    if (ready) return;
    setReady(true);
    vibrate(25);
    send({ type: 'input', kind: 'ready' });
  };
  return (
    <div className="card" style={{
      flex:1, display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', gap:12, textAlign:'center'
    }}>
      <div style={{fontSize:12, fontWeight:700, letterSpacing:1, color:'var(--wood-dk)', textTransform:'uppercase'}}>
        {summary.minigame}
      </div>
      <div style={{fontSize:56, lineHeight:1}}>{tag.emoji}</div>
      <div style={{
        background:tag.color, color:'var(--ink)', border:'4px solid var(--ink)',
        borderRadius:14, padding:'8px 20px', boxShadow:'0 5px 0 var(--ink)',
        fontFamily:"'Luckiest Guy',cursive", fontSize:24, letterSpacing:1
      }}>{tag.label}</div>
      <div style={{
        background: gotCoins ? 'var(--yellow)' : '#eee',
        border:'3px solid var(--ink)', borderRadius:12, padding:'6px 16px',
        fontFamily:"'Luckiest Guy',cursive", fontSize:20,
        color: gotCoins ? 'var(--ink)' : '#888',
        boxShadow:'0 4px 0 var(--ink)'
      }}>+{summary.earned} монет</div>
      <div style={{fontSize:13, fontWeight:600, color:'var(--wood-dk)'}}>
        всего {summary.total}
      </div>
      <button className={`btn ${ready ? 'green' : ''} ${ready ? '' : 'pulse'}`}
              disabled={ready}
              onClick={onReady}
              style={{marginTop:4, maxWidth:280}}>
        {ready ? '✓ ГОТОВ' : 'ТАП КОГДА ГОТОВ'}
      </button>
    </div>
  );
}

Object.assign(window, { RoundSummary });
