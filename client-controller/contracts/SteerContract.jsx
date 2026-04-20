// client-controller/contracts/SteerContract.jsx
// Three-button ◀ ▲ ▶ pad. Left/right are hold-to-steer (dir events on
// press/release); JUMP is a discrete tap. Used by Hay Panic + Mud Dash.

function SteerContract({ prompt, send }) {
  const [active, setActive] = useState({ left:false, right:false });
  const press = (dir) => {
    setActive(a => ({ ...a, [dir]: true }));
    send({ type: 'input', kind: 'steer', data: { dir, down: true } });
    vibrate(10);
  };
  const release = (dir) => {
    setActive(a => ({ ...a, [dir]: false }));
    send({ type: 'input', kind: 'steer', data: { dir, down: false } });
  };
  const jump = () => { send({ type: 'input', kind: 'steer', data: { dir: 'jump', down: true } }); vibrate(25); };
  const bindHold = (dir) => ({
    onPointerDown: (e) => { e.preventDefault(); press(dir); },
    onPointerUp:   (e) => { e.preventDefault(); release(dir); },
    onPointerCancel: () => release(dir),
    onPointerLeave:  () => release(dir),
  });
  return (
    <>
      <div className="screen-hint">{prompt || 'STEER!'}</div>
      <div className="steer-pad">
        <div className={`steer-btn ${active.left ? 'on' : ''}`} {...bindHold('left')}>◀</div>
        <div className="steer-btn jump" onPointerDown={(e)=>{e.preventDefault(); jump();}}>▲</div>
        <div className={`steer-btn ${active.right ? 'on' : ''}`} {...bindHold('right')}>▶</div>
      </div>
    </>
  );
}


Object.assign(window, { SteerContract });
