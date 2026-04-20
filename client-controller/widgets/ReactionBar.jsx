// client-controller/widgets/ReactionBar.jsx
// Floating emoji bar at the bottom of every joined view; each tap
// sends a reaction event the host ReactionOverlay floats up the TV.

const REACTIONS = ['🎉', '😂', '😤', '👏'];
function ReactionBar({ send }) {
  const [hit, setHit] = useState(null);
  const fire = (e) => {
    send({ type: 'input', kind: 'reaction', data: { emoji: e } });
    vibrate(20);
    setHit(e);
    setTimeout(() => setHit(h => h === e ? null : h), 180);
  };
  return (
    <div className="react-bar">
      {REACTIONS.map(e => (
        <div key={e}
             className={`react-btn ${hit === e ? 'hit' : ''}`}
             onPointerDown={(ev)=>{ev.preventDefault(); fire(e);}}>
          {e}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { ReactionBar });
