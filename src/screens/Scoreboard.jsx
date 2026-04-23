// src/screens/Scoreboard.jsx - post-round recap with rank-up crown
// and the phone ready-for-next-round auto-advance ribbon.

function CrownSVG({ size = 64 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 100 72" aria-hidden="true">
      {/* Body: three peaks */}
      <path
        d="M 8 58 L 14 22 L 30 40 L 50 14 L 70 40 L 86 22 L 92 58 Z"
        fill="#ffc93c" stroke="#2a1a10" strokeWidth="5" strokeLinejoin="round"
      />
      {/* Base band */}
      <rect x="6" y="54" width="88" height="14" rx="3" fill="#e09010" stroke="#2a1a10" strokeWidth="5"/>
      {/* Highlights along body */}
      <path d="M 12 52 L 18 30" stroke="#fff7c0" strokeWidth="3" strokeLinecap="round" opacity=".7"/>
      <path d="M 48 22 L 50 42" stroke="#fff7c0" strokeWidth="3" strokeLinecap="round" opacity=".7"/>
      <path d="M 82 30 L 88 52" stroke="#fff7c0" strokeWidth="3" strokeLinecap="round" opacity=".7"/>
      {/* Gems on peaks */}
      <circle cx="14" cy="22" r="5" fill="#e04b3b" stroke="#2a1a10" strokeWidth="3"/>
      <circle cx="50" cy="14" r="6" fill="#4aa3e0" stroke="#2a1a10" strokeWidth="3"/>
      <circle cx="86" cy="22" r="5" fill="#6cc24a" stroke="#2a1a10" strokeWidth="3"/>
      {/* Gem on base band */}
      <circle cx="50" cy="61" r="4" fill="#fff" stroke="#2a1a10" strokeWidth="2.5"/>
    </svg>
  );
}

/* ==========  SCOREBOARD  ========== */
// mode = 'classic' | 'party'. In party mode the scoreboard is transient
// (no final-round finale label, no fixed "РАУНД N / N"); a dedicated
// "Хватит" control exits the session to Podium — wired in P3.
function Scoreboard({ players, scores, earned, onContinue, onEndParty, minigameName, round, totalRounds, mode='classic', lastModeratorKey=null, onModeratorPicked, modifier=null }) {
  const ranked = [...players].map((p,i)=>({p,i,s:scores[i],e:earned[i]})).sort((a,b)=>b.e - a.e);
  const leaderboard = [...players].map((p,i)=>({p,i,total: scores[i] + earned[i]})).sort((a,b)=>b.total - a.total);

  // Party-mode AI-moderator one-liner. Pure rule-based template pick — no
  // LLM, no network. Memoised on mount so re-renders from the ready-up
  // counter don't reshuffle the line mid-read. Classic mode stays silent;
  // the moderator is specifically the Party Mode flavour.
  //
  // Dedup: lastModeratorKey lives in reducer state so the next
  // Scoreboard's picker can skip the template we just showed. The
  // effect below tells the parent which key was picked once the line is
  // rendered. The pick itself stays pure — the callback is the only
  // side effect and it runs once per Scoreboard mount.
  const moderatorLine = useMemo(() => {
    if (mode !== 'party') return null;
    if (!window.BB.core || !window.BB.core.pickModeratorLine) return null;
    return window.BB.core.pickModeratorLine({
      players, scores, earned, lastMinigame: minigameName,
      lastLineKey: lastModeratorKey,
    });
  }, [mode]);
  useEffect(() => {
    if (moderatorLine && moderatorLine.key && typeof onModeratorPicked === 'function') {
      onModeratorPicked(moderatorLine.key);
    }
  }, [moderatorLine]);

  // Ready-up tracking: phones tap READY on their summary overlay. When every
  // phone-owned slot has confirmed, auto-continue so the host doesn't need
  // to reach for the keyboard.
  const [readyIds, setReadyIds] = useState(() => new Set());
  const remoteCount = players.filter(p => p.remoteId).length;
  const readyCount = readyIds.size;
  const { onInput } = window.BB.mp.useMultiplayer();
  useEffect(() => {
    const off = onInput(({ id, kind }) => {
      if (kind !== 'ready') return;
      setReadyIds(prev => prev.has(id) ? prev : new Set([...prev, id]));
    });
    return () => { try { off && off(); } catch (_) {} };
  }, [onInput]);
  const pickedRef = useRef(false);
  useEffect(() => {
    if (pickedRef.current) return;
    if (remoteCount > 0 && readyCount >= remoteCount) {
      pickedRef.current = true;
      setTimeout(onContinue, 450);
    }
  }, [readyCount, remoteCount, onContinue]);
  // Party-mode transient overlay: the AI moderator keeps the session
  // flowing on its own. If nobody taps a phone or the host button within
  // ~5s, auto-advance to the next pick so the Scoreboard doesn't feel
  // terminal like the classic flow. Phone ready-up still short-circuits.
  // 7s (not 5s) gives the host-side "ХВАТИТ" exit button a reasonable
  // read-decide-tap window. Jackbox-like pace without cutting the decision
  // moment too tight.
  const PARTY_AUTO_MS = 7000;
  const [partyRemaining, setPartyRemaining] = useState(PARTY_AUTO_MS);
  useEffect(() => {
    if (mode !== 'party') return;
    let remaining = PARTY_AUTO_MS;
    setPartyRemaining(remaining);
    const iv = setInterval(() => {
      remaining -= 100;
      if (remaining <= 0) {
        clearInterval(iv);
        setPartyRemaining(0);
        if (!pickedRef.current) {
          pickedRef.current = true;
          onContinue();
        }
      } else {
        setPartyRemaining(remaining);
      }
    }, 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  return (
    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, #1a4b7a 0%, #2d6fa0 50%, #4aa3e0 100%)'}}>
      {/* scanlines */}
      <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg, rgba(255,255,255,.04) 0 2px, transparent 2px 6px)'}}/>
      {/* sparkle stars */}
      {[...Array(30)].map((_,i)=>{
        const x = (i*137)%1600, y = (i*83)%360;
        return <div key={i} className="pop-in" style={{position:'absolute',left:x,top:y,width:4,height:4,background:'#fff',borderRadius:'50%',boxShadow:'0 0 8px #fff', animationDelay:(i*0.02)+'s', opacity:.7}}/>;
      })}

      <div style={{position:'absolute',top:40,left:0,right:0,textAlign:'center'}}>
        <div className="plank" style={{display:'inline-block', padding:'14px 40px', borderRadius:24, whiteSpace:'nowrap'}}>
          <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream)',fontSize:32}}>
            {mode === 'party' ? `ИГРА ${round} · ${minigameName.toUpperCase()}` : `РАУНД ${round} · ${minigameName.toUpperCase()}`}
          </span>
        </div>
        {mode === 'party' && modifier && modifier.text && (
          // Twist pill under the round plank — keeps the reader's beat
          // "what game was it? with what weird rule?". Hidden when the
          // session has no modifier (TWEAKS → Round twists OFF).
          <div style={{
            marginTop: 10, display:'flex', justifyContent:'center'
          }}>
            <div className="pop-in" style={{
              display:'inline-flex', alignItems:'center', gap: 8,
              background:'var(--yellow)', border:'3px solid var(--ink)',
              borderRadius: 14, padding:'4px 14px',
              boxShadow:'0 4px 0 var(--ink)',
              fontFamily:"'Luckiest Guy'", color:'var(--ink)',
              fontSize: 18, letterSpacing: 1
            }}>
              <span style={{fontSize: 22}}>{modifier.emoji || '⚡'}</span>
              <span>С ПОВОРОТОМ: {String(modifier.text).toUpperCase()}</span>
            </div>
          </div>
        )}
        {mode === 'party' && moderatorLine && moderatorLine.text ? (
          // Party-mode AI-moderator quip replaces the static "РЕЗУЛЬТАТЫ"
          // label — the host is already announcing the beat, no need to
          // double up. Wrapped in its own block so the plank above stays
          // centered even when the quip is long.
          <div style={{marginTop: 14, display: 'flex', justifyContent:'center'}}>
            <div className="pop-in" style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              background:'rgba(0,0,0,.38)', border:'3px solid var(--cream)',
              borderRadius:18, padding:'8px 22px', maxWidth: 1200,
              fontFamily:"'Fredoka', sans-serif", fontSize: 22, fontWeight: 600,
              color:'#fff', letterSpacing:.3, lineHeight: 1.25,
              animationDelay: '0.25s'
            }}>
              <span style={{
                fontFamily:"'Luckiest Guy'", fontSize: 16, color:'var(--yellow)',
                letterSpacing: 1.5, whiteSpace:'nowrap'
              }}>МОДЕРАТОР ▸</span>
              <span>{moderatorLine.text}</span>
            </div>
          </div>
        ) : (
          <div style={{marginTop:10,fontFamily:"'Luckiest Guy'",fontSize:18,color:'var(--cream-2)',letterSpacing:2}}>РЕЗУЛЬТАТЫ</div>
        )}
      </div>

      {/* Round card reveal — shift down in party mode so the host-quip
          ribbon above has breathing room and doesn't collide with the
          #1 crown on the winner card. */}
      <div style={{position:'absolute',top: mode === 'party' ? 230 : 180,left:0,right:0,display:'flex',justifyContent:'center',gap:30,flexWrap:'wrap',padding:'0 40px'}}>
        {ranked.map((r, rank) => (
          <div key={r.i} className="pop-in" style={{
            background:'#fff', border:'5px solid var(--ink)', borderRadius:20,
            boxShadow:'0 10px 0 var(--ink)', padding:18, width:200, textAlign:'center',
            transform: rank === 0 ? 'translateY(-10px) rotate(-1deg)' : (rank === ranked.length-1 ? 'rotate(1deg)' : 'none'),
            position:'relative', animationDelay: (rank*0.2)+'s'
          }}>
            {rank === 0 && (
              <div style={{position:'absolute', top:-38, left:'50%', transform:'translateX(-50%)', animation:'bob 1.5s ease-in-out infinite', filter:'drop-shadow(0 4px 0 rgba(0,0,0,.25))'}}>
                <CrownSVG/>
              </div>
            )}
            {rank === 0 && (
              <div style={{position:'absolute',top:-12,left:-12,background:'var(--yellow)',border:'3px solid var(--ink)',borderRadius:10,padding:'2px 8px',fontFamily:"'Luckiest Guy'",fontSize:14,transform:'rotate(-8deg)'}}>ПОБЕДИТЕЛЬ!</div>
            )}
            <div style={{fontFamily:"'Luckiest Guy'", fontSize:36, color:rank===0?'#d99312':'var(--ink)'}}>#{rank+1}</div>
            <Avatar char={r.p.char} size={100} bob={rank===0}/>
            <div style={{fontFamily:"'Luckiest Guy'", fontSize:18, color:'var(--ink)'}}>{playerLabel(r.p)}</div>
            <div style={{display:'flex', justifyContent:'center', gap:6, alignItems:'center', marginTop:6,
              background: r.e > 0 ? 'var(--yellow)' : '#eee', border:'3px solid var(--ink)', borderRadius:10, padding:'4px 10px'
            }}>
              <Coin size={20}/>
              <span style={{fontFamily:"'Luckiest Guy'", fontSize:24, color:r.e>0?'var(--ink)':'#888'}}>+{r.e}</span>
            </div>
            <div style={{marginTop:8, fontFamily:"'Luckiest Guy'", fontSize:13, color:'var(--ink-soft)', opacity:.7}}>
              ВСЕГО
            </div>
            <div style={{fontFamily:"'Luckiest Guy'", fontSize:20, color:'var(--ink)'}}>{r.s + r.e}</div>
          </div>
        ))}
      </div>

      {/* Running standings ribbon */}
      <div style={{position:'absolute',bottom:170,left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,.3)',border:'3px solid var(--cream)',borderRadius:16,padding:'10px 20px',display:'flex',gap:20,alignItems:'center',backdropFilter:'blur(4px)'}}>
        <span style={{fontFamily:"'Luckiest Guy'",color:'var(--cream-2)',fontSize:16,letterSpacing:1}}>ОБЩИЙ ЗАЧЁТ ▸</span>
        {leaderboard.map((L, i) => (
          <div key={L.i} style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontFamily:"'Luckiest Guy'",color:i===0?'var(--yellow)':'var(--cream)',fontSize:18}}>{i+1}.</span>
            <Avatar char={L.p.char} size={28}/>
            <span style={{fontFamily:"'Luckiest Guy'",color:'#fff',fontSize:18}}>{L.total}</span>
          </div>
        ))}
      </div>

      <div style={{position:'absolute',bottom:50,left:0,right:0,textAlign:'center'}}>
        {remoteCount > 0 && (
          <div style={{marginBottom:10, display:'inline-block', background:'rgba(0,0,0,.35)',
            border:'3px solid var(--cream)', borderRadius:14, padding:'6px 16px',
            fontFamily:"'Luckiest Guy'", fontSize:16, color:'var(--cream)', letterSpacing:1}}>
            {readyCount}/{remoteCount} ГОТОВЫ
          </div>
        )}
        {mode === 'party' && (
          <div style={{
            marginBottom:10, display:'inline-block', background:'rgba(0,0,0,.35)',
            border:'3px solid var(--cream-2)', borderRadius:14, padding:'6px 16px',
            fontFamily:"'Luckiest Guy'", fontSize:16, color:'var(--cream-2)', letterSpacing:1
          }}>
            {partyRemaining > 0
              ? `СЛЕДУЮЩАЯ ИГРА ЧЕРЕЗ ${Math.ceil(partyRemaining/1000)}...`
              : 'ПОЕХАЛИ...'}
          </div>
        )}
        <div style={{display:'flex', gap:16, justifyContent:'center', alignItems:'center', flexWrap:'wrap'}}>
          <Btn variant="green" size="xl" onClick={() => { pickedRef.current = true; onContinue(); }} className="pulse">
            {mode === 'party'
              ? 'ДАЛЬШЕ ▶'
              : (round >= totalRounds ? 'ФИНАЛЬНЫЙ ПОДИУМ! 🏆' : `РАУНД ${round+1} ▶`)}
          </Btn>
          {mode === 'party' && onEndParty && (
            <Btn variant="red" size="sm" onClick={() => { pickedRef.current = true; onEndParty(); }}>
              ХВАТИТ — ВСЕ УЖЕ ЛОПНУЛИ
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}


Object.assign(window, { Scoreboard });
