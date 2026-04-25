// src/games/barn-jump/BarnJump.jsx
// Reaction-time mini-game. Shows "WAIT FOR IT…" on a dark stage for a
// random 2-5s, flashes "JUMP! 🐑" in giant green, and each player's first
// tap after the signal records a reaction time. Tap before the signal =
// 'too early' penalty, 0 coins this round.
//
// Scoring: valid reactions sorted fastest-first → [5, 3, 1, 0]. Round
// ends when every player has reacted OR 3 seconds after the signal
// (whichever comes first). Demonstrates that a new mini-game is just
// a folder + a registry call — no switch statement anywhere.

function BarnJump({ state, onFinish, onQuit, game }) {
  const players = state.players;
  const [phase, setPhase] = useState('wait'); // wait | go | done
  const [signalAt, setSignalAt] = useState(null);
  const [reactions, setReactions] = useState(() => players.map(() => null)); // ms | 'early' | null

  const cpuWindow = { easy: [700, 1400], medium: [400, 900], hard: [250, 550] }[state.difficulty] || [400, 900];

  // Random 2-5s wait before the JUMP signal. Once it fires, record the
  // exact performance.now() so reaction times measure from signal, not mount.
  useEffect(() => {
    const delay = 2000 + Math.random() * 3000;
    const t = setTimeout(() => { setSignalAt(performance.now()); setPhase('go'); }, delay);
    return () => clearTimeout(t);
  }, []);

  const record = (idx) => {
    setReactions(prev => {
      if (prev[idx] != null) return prev;
      const next = prev.slice();
      if (phase === 'wait') next[idx] = 'early';
      else if (phase === 'go' && signalAt) next[idx] = performance.now() - signalAt;
      return next;
    });
  };

  // CPU reactions — each CPU draws a random time within its difficulty band
  // once the signal flashes. Earliest among them can still beat a human.
  useEffect(() => {
    if (phase !== 'go' || signalAt == null) return;
    const timers = players.map((p, i) => {
      if (!p.isCPU) return null;
      const delay = cpuWindow[0] + Math.random() * (cpuWindow[1] - cpuWindow[0]);
      return setTimeout(() => record(i), delay);
    });
    return () => timers.forEach(t => t && clearTimeout(t));
  }, [phase, signalAt, players]);

  // Phone tap input (any remoteId) — maps to that player's slot.
  useEffect(() => {
    const off = game.input.onTap((id) => {
      const idx = players.findIndex(p => p.remoteId === id);
      if (idx < 0) return;
      record(idx);
    });
    return () => { try { off && off(); } catch (_) {} };
  }, [game, phase, signalAt, players]);

  // Keyboard space = local-you (slot 0 only when it's a non-CPU non-phone).
  useEffect(() => {
    const d = (e) => {
      if (e.key !== ' ' && e.code !== 'Space') return;
      e.preventDefault();
      const p0 = players[0];
      if (p0 && !p0.isCPU && !p0.remoteId) record(0);
    };
    window.addEventListener('keydown', d);
    return () => window.removeEventListener('keydown', d);
  }, [phase, signalAt, players]);

  // Finish as soon as everyone's in OR 3s after the signal.
  useEffect(() => {
    if (phase !== 'go' || signalAt == null) return;
    if (reactions.every(r => r != null)) { setPhase('done'); return; }
    const t = setTimeout(() => setPhase('done'), 3000);
    return () => clearTimeout(t);
  }, [phase, signalAt, reactions]);

  // Score + report up.
  useEffect(() => {
    if (phase !== 'done') return;
    const valid = reactions.map((r, i) => ({ i, r }))
      .filter(x => x.r != null && x.r !== 'early')
      .sort((a, b) => a.r - b.r);
    const earned = Array(players.length).fill(0);
    valid.forEach((row, rank) => { earned[row.i] = [5, 3, 1, 0][rank] ?? 0; });
    const t = setTimeout(() => game.game.finish(earned), 1400);
    return () => clearTimeout(t);
  }, [phase]);

  const bg = phase === 'wait' ? 'radial-gradient(circle at 50% 40%, #3a2510 0%, #1a0e08 70%)'
           : phase === 'go'   ? 'radial-gradient(circle at 50% 40%, #a8e084 0%, #3e8a29 70%)'
                              : 'radial-gradient(circle at 50% 40%, #5a3a1c 0%, #2a1a10 70%)';
  const bigLabel = phase === 'wait' ? 'ЖДЁМ…' : phase === 'go' ? 'ПРЫГАЙ! 🐑' : 'ГОТОВО!';
  const labelSize = phase === 'go' ? 220 : 96;

  return (
    <div style={{position:'absolute', inset:0, background:bg, overflow:'hidden', transition:'background .08s ease-in'}}>
      <div style={{position:'absolute', top:20, left:20, right:20, display:'flex', justifyContent:'space-between', alignItems:'center', zIndex:20}}>
        <Btn variant="cream" size="sm" onClick={onQuit}>◀ ВЫХОД</Btn>
        <div className="plank" style={{padding:'8px 22px'}}>
          <span style={{fontFamily:"'Luckiest Guy'", color:'var(--cream)', fontSize:26}}>🐑 САРАЙНЫЙ ПРЫЖОК</span>
        </div>
        <div style={{width:110}}/>
      </div>

      <div style={{position:'absolute', inset:0, display:'grid', placeItems:'center', pointerEvents:'none'}}>
        <div className={phase === 'go' ? 'pop-in' : ''} style={{
          fontFamily:"'Luckiest Guy'", fontSize:labelSize, color:'#fff',
          WebkitTextStroke:'6px var(--ink)', textShadow:'0 12px 0 var(--ink)',
          textAlign:'center', letterSpacing:2
        }}>
          {bigLabel}
        </div>
      </div>

      <div style={{position:'absolute', bottom:30, left:0, right:0, display:'flex', justifyContent:'center', gap:14, zIndex:20, flexWrap:'wrap', padding:'0 40px'}}>
        {players.map((p, i) => {
          const r = reactions[i];
          const label = r == null      ? '…'
                      : r === 'early'  ? '💥 TOO EARLY'
                                       : `${Math.round(r)} ms`;
          const bg = r === 'early' ? 'var(--red)'
                   : r != null     ? 'var(--green)'
                                   : '#fff';
          const fg = r == null ? 'var(--ink)' : '#fff';
          // When a bot's reaction fires there was previously NO visible motion —
          // only the tiny reaction-time label flipped. Max reported "боты не
          // прыгали" from a live test. We now bounce the whole avatar the moment
          // a reaction lands so every jump (bot or human) is legible.
          const reacted = r != null && r !== 'early';
          return (
            <div key={i} style={{
              background:bg, color:fg, border:'3px solid var(--ink)',
              borderRadius:14, padding:'8px 12px',
              display:'flex', alignItems:'center', gap:10, minWidth:140,
              boxShadow:'0 4px 0 var(--ink)',
              transform: reacted ? 'translateY(-6px) scale(1.04)' : 'none',
              transition: 'transform .18s ease'
            }}>
              <div style={{animation: reacted ? 'barnJumpHop .5s ease-out' : 'none'}}>
                <Avatar char={p.char} size={40}/>
              </div>
              <div>
                <div style={{fontFamily:"'Luckiest Guy'", fontSize:14, lineHeight:1}}>{playerLabel(p)}</div>
                <div style={{fontFamily:"'Luckiest Guy'", fontSize:18, lineHeight:1.2, marginTop:4}}>
                  {reacted && <span style={{marginRight:6}}>🦘</span>}{label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes barnJumpHop {
        0%   { transform: translateY(0)    scale(1); }
        40%  { transform: translateY(-24px) scale(1.15); }
        70%  { transform: translateY(-8px)  scale(1.05); }
        100% { transform: translateY(0)    scale(1); }
      }`}</style>
    </div>
  );
}

Object.assign(window, { BarnJump });

window.BB.games.register({
  id: 'jump',
  name: 'Сарайный Прыжок',
  blurb: 'Жди сигнала. Тапай первым. Раньше — вылетел.',
  icon: '🐑',
  tint: '#6cc24a',
  phoneContract: 'tap',
  phonePrompt: 'ЭКРАН ЗЕЛЁНЫЙ — ТАПАЙ КАК НА ВЫБОРАХ',
  rules: {
    name: 'Сарайный Прыжок',
    tagline: 'Жди сигнала. Дёрнулся раньше — всё, тебя нет.',
    howTo: [
      'Экран тёмный и надпись "ЖДЁМ" — НЕ ТАПАЙ.',
      'Экран зелёный и "ПРЫГАЙ!" — ТАП со всей дури.',
      'Тапнул раньше сигнала — 💥 TOO EARLY, нулевой результат.',
    ],
    control: '📱 ТАП · ⌨ ПРОБЕЛ',
    win: 'Быстрейшая реакция забирает +5 монет',
  },
  component: BarnJump,
});
