// client-controller/screens/MinigameInput.jsx
// Wraps the correct contract component for the active mini-game and
// stacks the score strip + turn pill above it when the host sends them.

function MinigameInput({ game, send, score, turn, myId }) {
  const contract = game.contract || 'tap';
  const yourTurn = !!(turn && turn.activeId != null && turn.activeId === myId);
  // If turn data exists but it isn't ours, lock regardless of whether the
  // active player is a CPU (activeId null) or another phone.
  const waiting = !!(turn && !yourTurn);
  const body = contract === 'tap'   ? <TapContract   prompt={game.prompt} send={send} locked={waiting}/>
            : contract === 'steer' ? <SteerContract prompt={game.prompt} send={send}/>
            : contract === 'holes' ? <HolesContract prompt={game.prompt} send={send}/>
            : <LobbyScreen hostScreen="playing" players={[]}/>;
  return (
    <>
      {score && <ScoreStrip score={score}/>}
      {turn && <TurnPill turn={turn} yourTurn={yourTurn}/>}
      {body}
    </>
  );
}

function TurnPill({ turn, yourTurn }) {
  const txt = yourTurn
    ? 'YOUR TURN!'
    : turn.activeName
      ? `${turn.activeName}'S TURN`
      : 'CPU TURN';
  return (
    <div style={{
      display:'flex', justifyContent:'center', marginTop:6, marginBottom:2
    }}>
      <div style={{
        background: yourTurn ? 'var(--green)' : 'var(--wood)',
        color:'#fff', border:'3px solid var(--ink)', borderRadius:999,
        padding:'5px 16px', fontFamily:"'Luckiest Guy',cursive", fontSize:16, letterSpacing:1,
        WebkitTextStroke:'1.5px var(--ink)', textShadow:'0 2px 0 rgba(0,0,0,.3)',
        boxShadow:'0 4px 0 var(--ink)',
        animation: yourTurn ? 'bounce 0.9s ease-in-out infinite' : 'none'
      }}>{txt}</div>
    </div>
  );
}

function ScoreStrip({ score }) {
  const leading = score.leader > 0 && score.mine >= score.leader;
  const unit = score.label ? ` ${score.label}` : '';
  return (
    <div style={{
      display:'flex', gap:8, justifyContent:'center', marginTop:4, marginBottom:2
    }}>
      <div style={{
        background: leading ? 'var(--yellow)' : '#fff',
        border:'3px solid var(--ink)', borderRadius:999, padding:'4px 12px',
        fontFamily:"'Luckiest Guy',cursive", fontSize:14, letterSpacing:.5,
        boxShadow:'0 3px 0 var(--ink)'
      }}>
        YOU: {score.mine}{unit}
      </div>
      <div style={{
        background:'#fff', border:'3px solid var(--ink)', borderRadius:999, padding:'4px 12px',
        fontFamily:"'Luckiest Guy',cursive", fontSize:14, letterSpacing:.5,
        boxShadow:'0 3px 0 var(--ink)', opacity:.75
      }}>
        LEAD: {score.leader}{unit}
      </div>
    </div>
  );
}

Object.assign(window, { MinigameInput });
