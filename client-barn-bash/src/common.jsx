// Shared UI widgets + helpers

const { useState, useEffect, useRef, useMemo, useCallback } = React;

function randBetween(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Cloud decorations drifting in the sky
function Clouds({ count = 4 }) {
  const clouds = useMemo(() => (
    Array.from({ length: count }).map((_, i) => ({
      top: randBetween(20, 160),
      left: randBetween(-40, 1500),
      scale: randBetween(0.7, 1.4),
      dur: randBetween(30, 80),
      delay: -randBetween(0, 40),
    }))
  ), [count]);
  return (
    <>
      {clouds.map((c, i) => (
        <div key={i} className="cloud" style={{
          top: c.top, left: c.left,
          width: 60, height: 28,
          transform: `scale(${c.scale})`,
          animation: `drift ${c.dur}s linear ${c.delay}s infinite alternate`
        }} />
      ))}
    </>
  );
}

// Simple wooden sign/plaque with text
function WoodSign({ children, w = 'auto', tilt = -2, style = {} }) {
  return (
    <div className="plank" style={{
      padding: '10px 22px',
      display:'inline-block',
      transform:`rotate(${tilt}deg)`,
      fontFamily:"'Luckiest Guy',cursive",
      letterSpacing:1,
      fontSize: 22,
      width: w,
      ...style
    }}>{children}</div>
  );
}

// Star sparkle
function Sparkle({ x, y, size = 20, c = '#ffc93c' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{position:'absolute',left:x,top:y,animation:'sparkle-spin 4s linear infinite'}}>
      <polygon points="20,2 24,16 38,20 24,24 20,38 16,24 2,20 16,16" fill={c} stroke="#2a1a10" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}

// Coin
function Coin({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{display:'inline-block',verticalAlign:'middle'}}>
      <circle cx="20" cy="20" r="17" fill="#ffc93c" stroke="#2a1a10" strokeWidth="3" />
      <circle cx="20" cy="20" r="12" fill="none" stroke="#d99312" strokeWidth="2" />
      <text x="20" y="26" textAnchor="middle" fontFamily="Luckiest Guy" fontSize="18" fill="#7a4920">$</text>
    </svg>
  );
}

// Big confetti burst layer
function Confetti({ count = 40, colors = ['#ffc93c','#e04b3b','#4aa3e0','#6cc24a','#a36bd1'] }) {
  const pieces = useMemo(() => Array.from({ length: count }).map(() => ({
    x: randBetween(0, 100),
    d: randBetween(0, 1.5),
    dur: randBetween(1.8, 3.6),
    rot: randBetween(-40, 40),
    c: pick(colors),
  })), [count]);
  return (
    <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none'}}>
      {pieces.map((p, i) => (
        <div key={i} className="confetti" style={{
          left: `${p.x}%`, top: '-5%',
          background: p.c, transform: `rotate(${p.rot}deg)`,
          animation: `confetti-fall ${p.dur}s ${p.d}s linear infinite`
        }} />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0%{transform:translateY(-30px) rotate(0deg);opacity:1}
          100%{transform:translateY(1000px) rotate(720deg);opacity:.8}
        }
      `}</style>
    </div>
  );
}

// Card with chunky outline + shadow
function Card({ children, style = {}, c = '#fff' }) {
  return (
    <div style={{
      background:c, border:'4px solid var(--ink)',
      borderRadius:18, boxShadow:'0 8px 0 var(--ink)',
      padding: 16, ...style
    }}>{children}</div>
  );
}

// Reusable title word styled like logo
function TitleWord({ text, color = 'var(--yellow)', size = 90 }) {
  return (
    <span className="word" style={{ color, fontSize: size }}>{text}</span>
  );
}

// Button used throughout
function Btn({ children, onClick, variant='yellow', size='md', disabled=false, style={}, icon=null, className='' }) {
  const cls = ['btn', variant, size === 'sm' ? 'sm' : size === 'xl' ? 'xl' : '', className].join(' ');
  return (
    <button className={cls} onClick={onClick} disabled={disabled} style={style}>
      {icon}{children}
    </button>
  );
}

// Useful for timers
function useInterval(fn, ms, active = true) {
  useEffect(() => {
    if (!active) return;
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
  }, [fn, ms, active]);
}

// Animation frame loop
function useRaf(fn, active = true) {
  const savedFn = useRef(fn);
  useEffect(() => { savedFn.current = fn; }, [fn]);
  useEffect(() => {
    if (!active) return;
    let raf, last = performance.now();
    const tick = (t) => {
      const dt = Math.min(.06, (t - last) / 1000);
      last = t;
      savedFn.current(dt, t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

// The background painting (bg.png) as a subtle scene. Pass opacity.
function SceneBG({ opacity = 1, blur = 0, scale = 1 }) {
  return (
    <div style={{
      position:'absolute',inset:0,
      backgroundImage:'url(assets/bg.png)',
      backgroundSize:'cover',
      backgroundPosition:'center',
      opacity, filter: blur ? `blur(${blur}px)` : 'none',
      transform:`scale(${scale})`,
    }}/>
  );
}

// Grass footer
function Grass({ h = 120 }) {
  return (
    <div style={{position:'absolute',left:0,right:0,bottom:0,height:h,pointerEvents:'none'}}>
      <svg viewBox="0 0 1600 120" preserveAspectRatio="none" width="100%" height="100%">
        <path d="M0 60 Q 200 20 400 40 T 800 50 T 1200 35 T 1600 55 L 1600 120 L 0 120 Z" fill="#6cbf55" stroke="#3e8a29" strokeWidth="3"/>
        <path d="M0 100 Q 300 70 600 90 T 1200 85 T 1600 100 L 1600 120 L 0 120 Z" fill="#4a9a34" />
      </svg>
    </div>
  );
}

Object.assign(window, {
  randBetween, clamp, pick, useInterval, useRaf,
  Clouds, WoodSign, Sparkle, Coin, Confetti, Card, TitleWord, Btn, SceneBG, Grass
});
