// src/ui/timing.jsx
// React hook destructure + timing primitives every mini-game needs: a
// plain setInterval wrapper and a requestAnimationFrame loop that feeds dt
// in seconds. Kept separate from widgets.jsx so a non-drawing consumer
// can grab just the hooks.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

function useInterval(fn, ms, active = true) {
  useEffect(() => {
    if (!active) return;
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
  }, [fn, ms, active]);
}

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

Object.assign(window, { useInterval, useRaf });
