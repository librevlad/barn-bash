// src/screens/BoardScreen.jsx - 8-tile mini-game chooser populated
// from the games registry, with phone vote tallying.

/* ==========  GAME BOARD (mini-game select)  ========== */

function BoardScreen({ state, onPick, onTweaks }) {
  const { round, totalRounds, scores, players, coins, modifier } = state;
  const [votes, setVotes] = useState({}); // { [id]: [pi, pi, ...] }
  const pickedRef = useRef(false);
  const { onInput } = window.BB.mp.useMultiplayer();
  const games = window.BB.games.list();

  // Phone voting — first mini-game to receive a vote (or majority when all
  // connected phones vote) gets auto-picked. Host tile clicks still work too.
  useEffect(() => {
    const remoteCount = players.filter(p => p.remoteId).length;
    const off = onInput(({ id, kind, data }) => {
      if (kind !== 'boardVote' || !data) return;
      const pi = players.findIndex(p => p.remoteId === id);
      if (pi < 0) return;
      const choice = data.id;
      if (!window.BB.games.get(choice)) return;
      setVotes(prev => {
        const next = {};
        // player votes only once — remove any prior slot
        Object.keys(prev).forEach(k => { next[k] = (prev[k] || []).filter(x => x !== pi); });
        next[choice] = [...(next[choice] || []), pi];
        // pick when every connected phone has cast a vote
        const totalVoters = Object.values(next).reduce((a, xs) => a + xs.length, 0);
        if (!pickedRef.current && remoteCount > 0 && totalVoters >= remoteCount) {
          // majority wins; tie broken by first reached
          let bestId = null, bestN = 0;
          Object.entries(next).forEach(([k, xs]) => { if (xs.length > bestN) { bestId = k; bestN = xs.length; } });
          if (bestId) { pickedRef.current = true; setTimeout(() => onPick(bestId), 450); }
        }
        return next;
      });
    });
    return () => { try { off && off(); } catch (_) {} };
  }, [players, onPick, onInput]);

  return (
    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,#bfe3a6 0%, #8fcf72 60%, #5aac45 100%)'}}>
      {/* pastoral pattern */}
      <svg viewBox="0 0 1600 900" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.25}}>
        {Array.from({length:40}).map((_,i)=>(
          <circle key={i} cx={randBetween(0,1600)} cy={randBetween(80,820)} r={randBetween(3,8)} fill="#fff"/>
        ))}
      </svg>
      <Clouds count={3}/>

      {/* Top bar */}
      <div style={{position:'absolute',top:20,left:24,right:24,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div className="plank" style={{padding:'10px 20px', whiteSpace:'nowrap'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:22}}>РАУНД {round} / {totalRounds}</span>
        </div>
        <div className="plank" style={{padding:'10px 24px', transform:'rotate(1.5deg)', whiteSpace:'nowrap'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:24}}>ВЫБИРАЙ МИНИ-ИГРУ</span>
        </div>
        <div style={{display:'flex',gap:10}}>
          <div className="plank" style={{padding:'10px 14px', whiteSpace:'nowrap'}}>
            <Coin size={22}/> <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:20,marginLeft:6}}>{coins}</span>
          </div>
          <Btn variant="cream" size="sm" onClick={onTweaks}>⚙ НАСТРОЙКИ</Btn>
        </div>
      </div>

      {/* Scoreboard strip */}
      <div style={{position:'absolute', top: 100, left:24, right:24, display:'flex', justifyContent:'center', gap:14}}>
        {players.map((p,i)=>(
          <div key={i} style={{
            background:'#fff', border:'4px solid var(--ink)', borderRadius:16, padding:'8px 14px',
            display:'flex', alignItems:'center', gap:10, boxShadow:'0 5px 0 var(--ink)',
            transform: i === 0 ? 'translateY(-4px)' : 'none'
          }}>
            <Avatar char={p.char} size={44}/>
            <div>
              <div style={{fontFamily:"'Luckiest Guy'",fontSize:14, color:'var(--ink)'}}>{playerLabel(p)} {i===0 && !p.displayName && <span style={{color:'var(--red)'}}>(ТЫ)</span>}</div>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <Coin size={16}/><span style={{fontFamily:"'Luckiest Guy'",fontSize:18,color:'var(--wood-dk)'}}>{scores[i]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modifier card */}
      {modifier && (
        <div style={{position:'absolute', top:220, left:'50%', transform:'translateX(-50%) rotate(-2deg)'}}>
          <Card style={{background:'#ffd8a0', borderColor:'var(--ink)', padding:'10px 26px', whiteSpace:'nowrap', textAlign:'center'}}>
            <div style={{fontFamily:"'Luckiest Guy'",fontSize:13,color:'#a8291a',letterSpacing:1.5}}>⚡ ТВИСТ РАУНДА</div>
            <div style={{fontFamily:"'Luckiest Guy'",fontSize:22,color:'var(--ink)',marginTop:2}}>{modifier.emoji || '⚡'} {(modifier.text || modifier).toUpperCase()}</div>
          </Card>
        </div>
      )}

      {/* Minigame cards grid — auto-fit so any registered count (8, 9, 10+)
          flows cleanly without a hand-tuned column count. minmax floor of
          240 keeps cards readable on a 1600-wide stage. */}
      <div style={{position:'absolute', top: 320, left:40, right:40, display:'grid',
        gridTemplateColumns:'repeat(auto-fit, minmax(240px, 280px))', gap:22, justifyContent:'center'}}>
        {games.map(mg => (
          <MiniCard key={mg.id} mg={mg} onPick={() => onPick(mg.id)}
                    voters={(votes[mg.id] || []).map(pi => players[pi]).filter(Boolean)}/>
        ))}
      </div>
    </div>
  );
}

function MiniCard({ mg, onPick, voters = [] }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      onClick={onPick}
      style={{
        background: mg.tint, border:'5px solid var(--ink)', borderRadius:20,
        boxShadow: hover ? '0 14px 0 var(--ink)' : voters.length ? '0 10px 0 var(--ink)' : '0 8px 0 var(--ink)',
        transform: hover ? 'translateY(-6px) rotate(-1deg)' : voters.length ? 'translateY(-3px)' : 'none',
        transition: 'all .15s ease',
        cursor: 'pointer',
        padding:18, position:'relative',
      }}>
      {voters.length > 0 && (
        <div style={{
          position:'absolute', top:-16, right:-10, display:'flex', gap:-4, zIndex:5
        }}>
          {voters.map((v, i) => (
            <div key={i} style={{
              background:'#fff', border:'3px solid var(--ink)', borderRadius:'50%',
              padding:2, boxShadow:'0 3px 0 var(--ink)', marginLeft: i ? -8 : 0, zIndex: 10-i
            }}>
              <Avatar char={v.char} size={28}/>
            </div>
          ))}
        </div>
      )}
      {/* Title row: gap + min-height + flex-start icon align so 1- and 2-line
          names land cleanly. Russian names are mostly 12-18 chars and wrap to
          2 lines at the smaller font tier — that's intentional, ellipsis was
          worse than wrap for game names that should be fully readable. */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,minHeight:54}}>
        <div style={{fontFamily:"'Luckiest Guy'", color:'var(--ink)', lineHeight:1.05, flex:1,
          fontSize: mg.name.length > 14 ? 20 : mg.name.length > 10 ? 22 : 26,
          letterSpacing: mg.name.length > 14 ? 0 : .5
        }}>{mg.name.toUpperCase()}</div>
        <div style={{fontSize:36, flex:'0 0 auto', lineHeight:1}}>{mg.icon}</div>
      </div>
      <div style={{background:'#fff', border:'3px solid var(--ink)', borderRadius:12, padding:'8px 12px', marginTop:10, fontWeight:600, minHeight:56, fontSize:14, lineHeight:1.3}}>
        {mg.blurb}
      </div>
      <div style={{display:'flex', justifyContent:'space-between', marginTop:12, alignItems:'center'}}>
        <div style={{display:'flex', alignItems:'center', gap:6, fontFamily:"'Luckiest Guy'", color:'var(--wood-dk)', fontSize:15, whiteSpace:'nowrap'}}>
          <Coin size={18}/> +5 ЗА ПОБЕДУ
        </div>
        <div style={{
          background: 'var(--ink)', color:'#fff',
          borderRadius:10, padding:'4px 10px', fontFamily:"'Luckiest Guy'", fontSize:14, letterSpacing:1
        }}>
          ПОЕХАЛИ
        </div>
      </div>
    </div>
  );
}

// Winner crown — hand-drawn SVG so it stays flat, scales crisply, and
// matches the Barn Bash yellow+ink+gems palette instead of relying on the

Object.assign(window, { BoardScreen });
