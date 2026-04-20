// client-controller/screens/FinaleScreen.jsx
// Full-bleed champion / silver / bronze splash shown after the host
// lands on the Podium, with the TAP FOR REMATCH button.

const FINALE_TAGS = {
  1: { title:'ЧЕМПИОН!',  color:'var(--yellow)', emoji:'👑', sub:'Весь сарай в аплодисментах.' },
  2: { title:'СЕРЕБРО',   color:'#d4d4d4',       emoji:'🥈', sub:'Ну почти. В следующий раз.' },
  3: { title:'БРОНЗА',    color:'#cd7f32',       emoji:'🥉', sub:'Подиум это всё-таки подиум.' },
};

function FinaleScreen({ finale, send }) {
  const tag = FINALE_TAGS[finale.rank] || {
    title:`#${finale.rank}`, color:'#888', emoji:'🎯',
    sub:'Реванш? Реванш всегда.'
  };
  const [ready, setReady] = useState(false);
  const onReady = () => {
    if (ready) return;
    setReady(true);
    vibrate(25);
    send({ type: 'input', kind: 'ready' });
  };
  return (
    <div className="card pulse" style={{
      flex:1, display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', gap:14, textAlign:'center',
      background:`radial-gradient(circle at 50% 30%, ${tag.color} 0%, #fff 70%)`
    }}>
      <div style={{fontSize:14, fontWeight:700, letterSpacing:2, color:'var(--wood-dk)'}}>ФИНАЛ</div>
      <div style={{fontSize:96, lineHeight:1}}>{tag.emoji}</div>
      <div style={{
        background:tag.color, color:'var(--ink)', border:'5px solid var(--ink)',
        borderRadius:18, padding:'10px 28px', boxShadow:'0 6px 0 var(--ink)',
        fontFamily:"'Luckiest Guy',cursive", fontSize:34, letterSpacing:2,
        WebkitTextStroke:'1px var(--ink)'
      }}>{tag.title}</div>
      <div style={{
        background:'var(--yellow)', border:'4px solid var(--ink)', borderRadius:14,
        padding:'8px 20px', boxShadow:'0 5px 0 var(--ink)',
        fontFamily:"'Luckiest Guy',cursive", fontSize:26
      }}>{finale.total} монет всего</div>
      <div style={{fontSize:13, fontWeight:600, color:'var(--wood-dk)', maxWidth:240, lineHeight:1.3}}>
        {tag.sub}
      </div>
      <button className={`btn ${ready ? 'green' : ''}`}
              disabled={ready}
              onClick={onReady}
              style={{marginTop:4, maxWidth:280}}>
        {ready ? '✓ ГОТОВ' : 'ТАП — РЕВАНШ'}
      </button>
    </div>
  );
}

Object.assign(window, { FinaleScreen });
