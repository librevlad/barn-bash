// client-controller/screens/BoardVoteScreen.jsx
// 2-column mini-game tile grid shown while the host is on Board.
// One tap sends a boardVote; host auto-picks when every phone has voted.

function BoardVoteScreen({ send }) {
  const [voted, setVoted] = useState(null);
  const vote = (id) => {
    setVoted(id);
    send({ type: 'input', kind: 'boardVote', data: { id } });
  };
  return (
    <>
      <div className="screen-hint">
        {voted ? `голос за ${BOARD_TILES.find(t=>t.id===voted)?.name}` : 'тапай мини-игру!'}
      </div>
      <div style={{flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10, overflowY:'auto', paddingRight:4}}>
        {BOARD_TILES.map(t => (
          <div key={t.id}
               onPointerDown={(e)=>{e.preventDefault(); vote(t.id);}}
               style={{
                 background: voted === t.id ? 'var(--yellow)' : t.tint,
                 border:'4px solid var(--ink)', borderRadius:16,
                 boxShadow: voted === t.id ? '0 3px 0 var(--ink)' : '0 6px 0 var(--ink)',
                 transform: voted === t.id ? 'translateY(3px)' : 'none',
                 padding:10, display:'flex', flexDirection:'column', alignItems:'center',
                 justifyContent:'center', cursor:'pointer', minHeight:80,
               }}>
            <div style={{fontSize:32}}>{t.icon}</div>
            <div style={{fontFamily:"'Luckiest Guy'",fontSize:14,color:'var(--ink)',textAlign:'center',marginTop:4,lineHeight:1.1}}>
              {t.name.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

Object.assign(window, { BoardVoteScreen });
