// ============================================================
// Frantics — Procedural Sound System (Web Audio API)
// ============================================================
// No audio files needed — everything synthesized on the fly.
// Include via <script src="/shared/sound.js"></script>
// Requires user interaction to unlock AudioContext.

const Sound = (() => {
  let ctx = null;
  let musicGain = null;
  let musicOscs = [];
  let unlocked = false;

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      musicGain = ctx.createGain();
      musicGain.gain.value = 0;
      musicGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function unlock() {
    if (unlocked) return;
    ensure();
    unlocked = true;
  }

  // Auto-unlock on first interaction
  ['click', 'touchstart', 'pointerdown'].forEach(evt => {
    document.addEventListener(evt, unlock, { once: false, passive: true });
  });

  // --- Primitives ---

  function tone(freq, duration, type, vol, attack) {
    ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol || 0.25, t + (attack || 0.01));
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  function noise(duration, vol, filterFreq) {
    ensure();
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 2000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
  }

  // --- Sound Effects ---

  const effects = {
    // Countdown beeps: 3, 2, 1
    countdownTick() {
      tone(660, 0.12, 'sine', 0.2);
    },
    countdownGo() {
      tone(880, 0.08, 'sine', 0.3);
      setTimeout(() => tone(1320, 0.15, 'sine', 0.25), 80);
    },

    // Color Smash
    correct() {
      tone(880, 0.15, 'sine', 0.2);
      setTimeout(() => tone(1100, 0.2, 'sine', 0.15), 60);
    },
    wrong() {
      tone(180, 0.25, 'sawtooth', 0.15);
      tone(140, 0.25, 'square', 0.08);
    },
    roundStart() {
      tone(440, 0.08, 'sine', 0.15);
      setTimeout(() => tone(660, 0.12, 'sine', 0.2), 100);
    },

    // Escape the Fox
    jump() {
      ensure();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(250, t);
      osc.frequency.exponentialRampToValueAtTime(900, t + 0.1);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.15);
    },
    land() {
      noise(0.06, 0.1, 800);
      tone(120, 0.08, 'sine', 0.1);
    },
    foxClose() {
      tone(80, 0.5, 'sawtooth', 0.06);
      tone(85, 0.5, 'sawtooth', 0.04);
    },
    slide() {
      noise(0.1, 0.15, 1200);
      tone(200, 0.08, 'sine', 0.08);
    },
    jump2() {
      ensure();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.12);
    },
    shieldPickup() {
      tone(600, 0.12, 'sine', 0.15);
      setTimeout(() => tone(900, 0.15, 'sine', 0.12), 60);
    },
    speedPickup() {
      tone(500, 0.08, 'triangle', 0.18);
      setTimeout(() => tone(800, 0.08, 'triangle', 0.15), 50);
      setTimeout(() => tone(1200, 0.1, 'triangle', 0.12), 100);
    },
    coinPickup() {
      tone(1200, 0.06, 'sine', 0.12);
      setTimeout(() => tone(1600, 0.08, 'sine', 0.1), 40);
    },
    shieldBreak() {
      noise(0.15, 0.2, 1000);
      tone(400, 0.12, 'square', 0.08);
    },
    stumble() {
      noise(0.08, 0.15, 600);
      tone(150, 0.15, 'sawtooth', 0.1);
    },
    nearMiss() {
      tone(900, 0.06, 'sine', 0.12);
      setTimeout(() => tone(1100, 0.08, 'sine', 0.1), 30);
    },
    foxGrowl() {
      tone(60, 0.6, 'sawtooth', 0.1);
      tone(65, 0.5, 'square', 0.06);
      noise(0.4, 0.12, 300);
    },
    foxSprint() {
      tone(100, 0.3, 'sawtooth', 0.12);
      setTimeout(() => tone(130, 0.3, 'sawtooth', 0.1), 80);
    },
    foxLeap() {
      noise(0.2, 0.25, 500);
      tone(80, 0.15, 'sine', 0.15);
      setTimeout(() => tone(120, 0.2, 'sine', 0.12), 100);
    },

    // King of the Hill
    dash() {
      ensure();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.12);
    },
    bump() {
      noise(0.12, 0.25, 600);
      tone(100, 0.1, 'square', 0.15);
    },

    // Meteor Shower
    meteorWarn() {
      tone(200, 0.6, 'sine', 0.08);
      tone(210, 0.6, 'sine', 0.06);
    },
    meteorImpact() {
      noise(0.3, 0.35, 400);
      tone(60, 0.3, 'sine', 0.2);
      tone(55, 0.25, 'triangle', 0.1);
    },
    dodge() {
      ensure();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(700, t + 0.06);
      osc.frequency.exponentialRampToValueAtTime(350, t + 0.12);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.15);
    },

    // Shared
    eliminated() {
      noise(0.2, 0.3, 500);
      tone(300, 0.1, 'sawtooth', 0.15);
      setTimeout(() => tone(200, 0.2, 'sawtooth', 0.1), 100);
      setTimeout(() => tone(100, 0.3, 'sawtooth', 0.08), 200);
    },
    winner() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => {
        setTimeout(() => tone(f, 0.2, 'sine', 0.2), i * 120);
      });
    },
    champion() {
      const notes = [523, 659, 784, 1047, 1319, 1568];
      notes.forEach((f, i) => {
        setTimeout(() => {
          tone(f, 0.3, 'sine', 0.2);
          tone(f * 0.5, 0.3, 'triangle', 0.08);
        }, i * 150);
      });
    },
    shrink() {
      tone(300, 0.15, 'square', 0.08);
      setTimeout(() => tone(250, 0.15, 'square', 0.06), 100);
    },
  };

  // --- Background Music (melodic themes with arpeggio + rhythm) ---

  let musicInterval = null;

  // Note frequencies for melodies
  const N = {
    C3: 131, D3: 147, E3: 165, F3: 175, G3: 196, A3: 220, B3: 247,
    C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494,
    C5: 523, D5: 587, E5: 659, G5: 784,
  };

  const THEMES = {
    escapeFox: {
      bpm: 140, vol: 0.06,
      bass: [N.E3, N.E3, N.G3, N.A3, N.E3, N.E3, N.B3, N.A3],
      melody: [N.E4, N.G4, N.A4, N.G4, N.E4, N.D4, N.E4, 0],
      arp: [N.E4, N.G4, N.B4, N.E5],
      bassType: 'triangle', melType: 'square', arpType: 'sine',
      filterFreq: 800,
    },
    hillKing: {
      bpm: 120, vol: 0.05,
      bass: [N.A3, N.A3, N.C4, N.D4, N.F3, N.F3, N.A3, N.G3],
      melody: [N.A4, N.C5, N.D5, N.C5, N.A4, 0, N.G4, N.A4],
      arp: [N.A3, N.C4, N.E4, N.A4],
      bassType: 'sawtooth', melType: 'sine', arpType: 'triangle',
      filterFreq: 600,
    },
    meteor: {
      bpm: 100, vol: 0.045,
      bass: [N.D3, N.D3, N.F3, N.A3, N.D3, N.D3, N.C3, N.D3],
      melody: [N.D4, N.F4, N.A4, 0, N.D4, N.E4, N.F4, N.D4],
      arp: [N.D3, N.F3, N.A3, N.D4],
      bassType: 'sawtooth', melType: 'triangle', arpType: 'sine',
      filterFreq: 500,
    },
    race: {
      bpm: 160, vol: 0.06,
      bass: [N.C3, N.C3, N.E3, N.G3, N.A3, N.A3, N.G3, N.E3],
      melody: [N.C5, N.E5, N.G5, N.E5, N.C5, N.D5, N.E5, N.C5],
      arp: [N.C4, N.E4, N.G4, N.C5],
      bassType: 'square', melType: 'sine', arpType: 'triangle',
      filterFreq: 900,
    },
    lobby: {
      bpm: 80, vol: 0.03,
      bass: [N.C3, 0, N.G3, 0, N.A3, 0, N.F3, 0],
      melody: [N.E4, N.G4, N.C5, 0, N.A4, N.G4, N.E4, 0],
      arp: [N.C4, N.E4, N.G4, N.C5],
      bassType: 'triangle', melType: 'sine', arpType: 'sine',
      filterFreq: 400,
    },
  };

  function startMusic(theme) {
    stopMusic();
    ensure();
    const t = THEMES[theme] || THEMES.escapeFox;
    const beatMs = 60000 / t.bpm;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = t.filterFreq;
    filter.connect(musicGain);

    musicGain.gain.setValueAtTime(0, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(t.vol, ctx.currentTime + 2);

    let step = 0;
    let arpStep = 0;

    musicInterval = setInterval(() => {
      if (!ctx || ctx.state === 'suspended') return;
      const now = ctx.currentTime;
      const bassNote = t.bass[step % t.bass.length];
      const melNote = t.melody[step % t.melody.length];

      // Bass note
      if (bassNote) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = t.bassType;
        osc.frequency.value = bassNote;
        g.gain.setValueAtTime(0.12, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + beatMs / 1000 * 0.9);
        osc.connect(g).connect(filter);
        osc.start(now); osc.stop(now + beatMs / 1000);
      }

      // Melody note (every 2 beats)
      if (step % 2 === 0 && melNote) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = t.melType;
        osc.frequency.value = melNote;
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + beatMs / 500);
        osc.connect(g).connect(filter);
        osc.start(now); osc.stop(now + beatMs / 500);
      }

      // Arpeggio (every beat, cycling through 4 notes)
      const arpNote = t.arp[arpStep % t.arp.length];
      if (arpNote) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = t.arpType;
        osc.frequency.value = arpNote;
        g.gain.setValueAtTime(0.04, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + beatMs / 1500);
        osc.connect(g).connect(filter);
        osc.start(now); osc.stop(now + beatMs / 1500);
      }

      step++;
      arpStep++;
    }, beatMs);
  }

  function stopMusic() {
    if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
    if (!ctx) return;
    musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    setTimeout(() => {
      musicOscs.forEach(o => { try { o.stop(); } catch {} });
      musicOscs = [];
    }, 600);
  }

  // --- Public API ---

  function play(name) {
    if (effects[name]) effects[name]();
  }

  return { play, startMusic, stopMusic, unlock };
})();
