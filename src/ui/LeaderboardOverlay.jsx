// src/ui/LeaderboardOverlay.jsx
// Persistent top-right leaderboard tile. Subscribes to game.leaderboard
// and redraws on every score.update. Gold band on the leader, red on
// the last-place row. Chaos + vote events surface as cartoon banners
// matching the barn theme — no more debug-grade orange/purple panels.
//
// players prop is an optional lineup snapshot used to resolve
// leaderboard entries' playerId (a remoteId string from the phones) to
// a friendly display name. Falls back to the raw id when no match so
// classic mode without phones still renders.

function LeaderboardOverlay({ game, players = [] }) {
  const [state, setState] = useState(game.leaderboard.getState());
  const [chaos, setChaos] = useState(null);
  const [vote, setVote] = useState(null);

  useEffect(() => {
    return game.leaderboard.subscribe(setState);
  }, [game]);

  // Listen to chaos + vote events on the same channel. Vote start opens
  // a banner; any non-vote chaos event opens a separate transient flash
  // so the two can overlap (e.g., voteResult + antiLeader in the same
  // beat of the session).
  useEffect(() => {
    if (!game.api || !game.api.onChaos) return;
    const off = game.api.onChaos((event) => {
      if (event.type === 'voteStart') {
        setVote(event);
        setTimeout(() => setVote(null), 3000);
        return;
      }
      setChaos(event);
      setTimeout(() => setChaos(null), 2200);
    });
    return () => off && off();
  }, [game]);

  const labelFor = (playerId) => {
    const p = (players || []).find(
      pp => pp.remoteId != null && String(pp.remoteId) === String(playerId)
    );
    if (p && p.displayName) return String(p.displayName).toUpperCase();
    if (p && p.char && p.char.name) return String(p.char.name).toUpperCase();
    return String(playerId);
  };

  const chaosCopy = (ev) => {
    if (!ev) return null;
    switch (ev.type) {
      case 'antiLeader':    return { title: 'АНТИ-ЛИДЕР',      tint: 'var(--red)'    };
      case 'underdogBoost': return { title: 'ТЁМНАЯ ЛОШАДКА',  tint: 'var(--green)'  };
      case 'swap':          return { title: 'СМЕНА МЕСТ!',     tint: 'var(--purple)' };
      case 'voteResult':    return { title: 'ИТОГ ГОЛОСА',     tint: 'var(--yellow)' };
      default:              return { title: String(ev.type).toUpperCase(), tint: 'var(--orange)' };
    }
  };
  const chaosBadge = chaosCopy(chaos);

  return (
    <div style={styles.container}>
      {vote && (
        <div className="pop-in" style={{
          background: 'var(--purple)', border:'3px solid var(--ink)',
          borderRadius: 14, padding:'8px 12px', marginBottom: 8,
          boxShadow:'0 5px 0 var(--ink)',
          fontFamily:"'Luckiest Guy'", color:'#fff', letterSpacing: 1,
          textAlign:'center'
        }}>
          <div style={{fontSize: 18}}>ГОЛОСОВАНИЕ!</div>
          <div style={{fontSize: 12, opacity: .85, marginTop: 2, fontFamily:'Fredoka', fontWeight:600, letterSpacing: .3}}>
            КОГО НАКАЗАТЬ?
          </div>
        </div>
      )}
      {chaosBadge && (
        <div className="pop-in" style={{
          background: chaosBadge.tint, border:'3px solid var(--ink)',
          borderRadius: 14, padding:'6px 12px', marginBottom: 8,
          boxShadow:'0 5px 0 var(--ink)',
          fontFamily:"'Luckiest Guy'", color:'#fff', letterSpacing: 1.2,
          fontSize: 16, textAlign:'center',
          textShadow:'0 2px 0 rgba(0,0,0,.25)'
        }}>
          ХАОС ▸ {chaosBadge.title}
        </div>
      )}

      <div className="plank" style={{
        padding:'6px 10px 8px', borderRadius: 14, minWidth: 180,
      }}>
        <div style={{
          fontFamily:"'Luckiest Guy'", color:'var(--cream)',
          fontSize: 14, letterSpacing: 1.5, textAlign:'center', marginBottom: 4
        }}>
          ЛИДЕРБОРД
        </div>
        {state.entries.length === 0 && (
          <div style={{
            fontFamily:'Fredoka', fontSize: 12, color:'var(--cream-2)',
            textAlign:'center', padding:'4px 0'
          }}>
            ждём счёт…
          </div>
        )}
        {state.entries.map((e, i) => {
          const isLeader = i === 0;
          const isLast = i === state.entries.length - 1 && state.entries.length > 1;
          return (
            <div key={e.playerId} style={{
              display:'flex', justifyContent:'space-between', gap: 10,
              alignItems:'center', padding: '3px 8px', borderRadius: 8,
              background: isLeader ? 'rgba(255,201,60,.35)'
                          : isLast  ? 'rgba(224,75,59,.30)'
                          : 'transparent',
              marginTop: 2,
            }}>
              <span style={{fontFamily:"'Luckiest Guy'", color:'var(--cream)', fontSize: 14, minWidth: 22}}>
                {i + 1}.
              </span>
              <span style={{
                fontFamily:"'Luckiest Guy'",
                color: isLeader ? 'var(--yellow)' : isLast ? '#f4a897' : 'var(--cream-2)',
                fontSize: 14, flex: 1, letterSpacing: .5,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
              }}>
                {labelFor(e.playerId)}
              </span>
              <span style={{
                fontFamily:"'Luckiest Guy'", color:'#fff',
                fontSize: 16, fontWeight: 700
              }}>
                {e.score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 12, right: 12, zIndex: 10,
    pointerEvents: 'none',
  },
};

Object.assign(window, { LeaderboardOverlay });
