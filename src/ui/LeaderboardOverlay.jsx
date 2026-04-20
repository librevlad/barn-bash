// src/ui/LeaderboardOverlay.jsx
// Persistent top-right leaderboard tile. Subscribes to game.leaderboard
// and redraws on every score.update. Gold highlight on the leader, red
// on the last-place row. Styling follows the spec verbatim — no tweaks.

function LeaderboardOverlay({ game }) {
  const [state, setState] = useState(game.leaderboard.getState());
  const [chaos, setChaos] = useState(null);

  useEffect(() => {
    return game.leaderboard.subscribe(setState);
  }, [game]);

  useEffect(() => {
    if (!game.api || !game.api.onChaos) return;
    const off = game.api.onChaos((event) => {
      setChaos(event);
      setTimeout(() => setChaos(null), 2000);
    });
    return () => off && off();
  }, [game]);

  return (
    <div style={styles.container}>
      {chaos && (
        <div style={{
          background: 'orange',
          color: 'black',
          padding: 6,
          marginBottom: 6,
          fontWeight: 'bold',
        }}>
          CHAOS: {chaos.type}
        </div>
      )}
      {state.entries.map((e, i) => (
        <div key={e.playerId} style={{
          ...styles.row,
          background: i === 0 ? 'rgba(255,215,0,0.2)' :
                      i === state.entries.length - 1 ? 'rgba(255,0,0,0.2)' :
                      'transparent'
        }}>
          <span>{i + 1}.</span>
          <span style={styles.name}>{e.playerId}</span>
          <span style={styles.score}>{e.score}</span>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 10,
    right: 10,
    background: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 8,
    color: 'white',
    fontSize: 14,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    minWidth: 60,
  },
  score: {
    fontWeight: 'bold',
  },
};

Object.assign(window, { LeaderboardOverlay });
