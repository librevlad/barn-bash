// client-controller/screens/LobbyScreen.jsx
// Per-screen filler for title / select / scoreboard / podium — shows
// who's in the room and the LET'S GO ready button on title.

function LobbyScreen({ hostScreen, players, send }) {
  // Phone sees these screens solo, so the copy talks to the single player
  // holding this device, not the whole room.
  const showReady = hostScreen === 'title';
  const [ready, setReady] = useState(false);
  // Reset the local ready flag whenever the phone drops back to title
  // (e.g. host clicked MAIN MENU on the podium) so a rematch session can
  // ready-up from scratch instead of inheriting a stale tap.
  useEffect(() => { if (hostScreen === 'title') setReady(false); }, [hostScreen]);
  const onReady = () => {
    if (ready) return;
    setReady(true);
    vibrate(25);
    if (send) send({ type: 'input', kind: 'ready' });
  };
  const label = ({
    title:      ready
      ? "ready! waiting for the others…"
      : "you're in! tap LET'S GO when everyone's here",
    select:     "you're locked in — waiting for the others",
    scoreboard: 'round over — check the big screen',
    podium:     'champion crowned!',
  })[hostScreen] || 'get ready…';
  return (
    <div className="card pulse" style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}>
      <div style={{fontFamily:"'Luckiest Guy'",fontSize:26,color:'var(--ink)',textAlign:'center',lineHeight:1.15,maxWidth:300}}>{label}</div>
      <div style={{fontSize:14,fontWeight:600,color:'var(--wood-dk)',textAlign:'center'}}>
        {players.length} player{players.length === 1 ? '' : 's'} in the room
      </div>
      {showReady && (
        <button className={`btn ${ready ? 'green' : ''}`}
                disabled={ready}
                onClick={onReady}
                style={{marginTop:4, maxWidth:280}}>
          {ready ? '✓ READY' : "LET'S GO!"}
        </button>
      )}
    </div>
  );
}

Object.assign(window, { LobbyScreen });
