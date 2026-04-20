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
        <div className="plank" style={{padding:'10px 20px'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:22}}>ROUND {round} / {totalRounds}</span>
        </div>
        <div className="plank" style={{padding:'10px 24px', transform:'rotate(1.5deg)'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:24}}>PICK A MINI-GAME</span>
        </div>
        <div style={{display:'flex',gap:10}}>
          <div className="plank" style={{padding:'10px 14px'}}>
            <Coin size={22}/> <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:20,marginLeft:6}}>{coins}</span>
          </div>
          <Btn variant="cream" size="sm" onClick={onTweaks}>⚙ TWEAKS</Btn>
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
              <div style={{fontFamily:"'Luckiest Guy'",fontSize:14, color:'var(--ink)'}}>{playerLabel(p)} {i===0 && !p.displayName && <span style={{color:'var(--red)'}}>(YOU)</span>}</div>
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
          <Card style={{background:'#ffd8a0', borderColor:'var(--ink)', padding:'12px 24px'}}>
            <div style={{fontFamily:"'Luckiest Guy'",fontSize:14,color:'#a8291a'}}>⚡ ROUND TWIST</div>
            <div style={{fontFamily:"'Luckiest Guy'",fontSize:22,color:'var(--ink)'}}>{modifier.emoji || '⚡'} {(modifier.text || modifier).toUpperCase()}</div>
          </Card>
        </div>
      )}

      {/* Minigame cards grid — 5 columns keeps 9-10 tiles (3 rows max) on a
          1600×900 viewport without letting the last row overflow the stage.
          Was 4×2 fixed; breaking the 4-col assumption was cheaper than
          rewriting every tile's minHeight. */}
      <div style={{position:'absolute', top: 320, left:0, right:0, display:'grid',
        gridTemplateColumns:'repeat(5, 280px)', gap:22, justifyContent:'center'}}>
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
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontFamily:"'Luckiest Guy'", fontSize:26, color:'var(--ink)'}}>{mg.name.toUpperCase()}</div>
        <div style={{fontSize:40}}>{mg.icon}</div>
      </div>
      <div style={{background:'#fff', border:'3px solid var(--ink)', borderRadius:12, padding:'8px 12px', marginTop:10, fontWeight:600, minHeight:56}}>
        {mg.blurb}
      </div>
      <div style={{display:'flex', justifyContent:'space-between', marginTop:12, alignItems:'center'}}>
        <div style={{display:'flex', alignItems:'center', gap:4, fontFamily:"'Luckiest Guy'", color:'var(--wood-dk)'}}>
          <Coin size={18}/> +5 / WIN
        </div>
        <div style={{
          background: 'var(--ink)', color:'#fff',
          borderRadius:10, padding:'4px 10px', fontFamily:"'Luckiest Guy'", fontSize:14, letterSpacing:1
        }}>
          READY
        </div>
      </div>
    </div>
  );
}

// Winner crown — hand-drawn SVG so it stays flat, scales crisply, and
// matches the Barn Bash yellow+ink+gems palette instead of relying on the

Object.assign(window, { BoardScreen });
