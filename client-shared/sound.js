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
    document.addEventListener(evt, unlock, { once: true, passive: true });
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

    // King of the Hill — Phase 45: richer dash whoosh. opts.power
    // ∈ [0, 1] raises peak frequency + gain so charged dashes sound
    // heftier than quick flicks. Undefined opts → mid-strength feel.
    dash(opts) {
      ensure();
      const t = ctx.currentTime;
      const p = (opts && typeof opts.power === 'number') ? Math.max(0, Math.min(1, opts.power)) : 0.6;
      const peak = 480 + p * 380;     // 480..860 Hz
      const gainPk = 0.18 + p * 0.14; // 0.18..0.32

      // Whoosh sweep (triangle rising then falling).
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(peak, t + 0.05);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.18);
      gain.gain.setValueAtTime(gainPk, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.22);

      // Noise tail — sell the "air rush".
      noise(0.14, 0.1 + p * 0.08, 1800);
    },

    // Phase 45 — dedicated ground-pound slam separate from meteor
    // impact. Deep thud + debris rattle + bright spark flash so it
    // lands as the beefiest in-game event.
    groundPoundSlam() {
      ensure();
      const t = ctx.currentTime;
      // Bass thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.22);
      gain.gain.setValueAtTime(0.38, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.35);
      // Debris rattle
      noise(0.22, 0.2, 900);
      // Spark ting
      tone(1600, 0.08, 'square', 0.08);
    },

    // Phase 45 — short cheering bell when the crown shifts to a new
    // leader. Rising perfect-5th chime with a soft tail.
    crownShift() {
      ensure();
      const t = ctx.currentTime;
      tone(660, 0.14, 'sine', 0.12);
      setTimeout(() => tone(990, 0.18, 'sine', 0.14), 80);
    },

    // Phase 45 — relieved breath on teeter recovery. Soft downward
    // triangle swell, very quiet.
    teeterSave() {
      ensure();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(720, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.25);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.28);
    },

    // Phase 47c — big brass match bell. Three overlapping partials
    // (root + 2.1× + 3.2×) with long exponential decay — classic
    // inharmonic bell spectrum. Used on round start + sudden death.
    matchBell(opts) {
      ensure();
      const t = ctx.currentTime;
      const base = (opts && opts.pitch) ? opts.pitch : 440;
      const partials = [
        { freq: base,          gain: 0.22, tail: 2.8 },
        { freq: base * 2.1,    gain: 0.12, tail: 2.3 },
        { freq: base * 3.2,    gain: 0.08, tail: 1.9 },
      ];
      partials.forEach(p => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = p.freq;
        g.gain.setValueAtTime(p.gain, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + p.tail);
        osc.connect(g).connect(ctx.destination);
        osc.start(t); osc.stop(t + p.tail);
      });
      // Strike transient — short noise click so the attack reads.
      noise(0.04, 0.18, 3600);
    },

    bump(opts) {
      // Phase 43 — pitch scales with combo streak. opts.pitch ∈ [1, 2]
      // shifts both the noise midband and the square thud upward so
      // subsequent hits in the same combo sound hotter. Undefined
      // opts falls back to the legacy single-tone bump.
      const p = (opts && typeof opts.pitch === 'number') ? Math.max(0.7, Math.min(2.2, opts.pitch)) : 1;
      const vol = (opts && typeof opts.volume === 'number') ? Math.max(0.3, Math.min(1.4, opts.volume)) : 1;
      noise(0.12, 0.25 * vol, 600 * p);
      tone(100 * p, 0.1, 'square', 0.15 * vol);
    },
    // Phase 43 — combo cheer for big streaks. Short horn pair with
    // rising interval; opts.level ∈ 1..4 picks the pitch pair.
    comboCheer(opts) {
      ensure();
      const lvl = Math.max(1, Math.min(4, (opts && opts.level) || 1));
      const base = 330 + lvl * 60;
      tone(base,       0.22, 'triangle', 0.12);
      tone(base * 1.33, 0.22, 'triangle', 0.10);
      setTimeout(() => tone(base * 1.5, 0.18, 'triangle', 0.08), 90);
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
  };

  // Phase 47c — ambient crowd layer. Low-passed noise loop with
  // slow-modulated filter cutoff produces a "distant stadium murmur"
  // feel. Call Sound.startCrowd() on match start, Sound.stopCrowd()
  // on end. Uses its own gain node + buffer, independent of music.
  let crowdGain = null, crowdSource = null, crowdFilter = null, crowdLFO = null;
  function startCrowd() {
    ensure();
    if (crowdSource) return;
    // 2-second looping pink-ish noise buffer.
    const len = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Pink noise via summed decay stages.
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029591;
      b1 = 0.963 * b1 + white * 0.0322;
      b2 = 0.57 * b2 + white * 0.1848;
      data[i] = (b0 + b1 + b2) * 0.3;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.85;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 1.8);

    // Slow LFO on filter cutoff for living-room shimmer.
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.3;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain).connect(filter.frequency);

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(0);
    lfo.start(0);

    crowdSource = src; crowdFilter = filter; crowdGain = gain; crowdLFO = lfo;
  }
  function stopCrowd() {
    if (!crowdSource) return;
    if (crowdGain) crowdGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    const src = crowdSource, lfo = crowdLFO;
    setTimeout(() => {
      try { src.stop(); } catch {}
      try { lfo && lfo.stop(); } catch {}
    }, 900);
    crowdSource = null; crowdLFO = null;
  }

  // Remaining shared effects continue on the original `effects`
  // object definition — see definitions above. This closing block
  // patches the Phase 47c-edit that accidentally split the literal.
  Object.assign(effects, {
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
    // Phase 25b — victory fanfare sting. 5-note ascending sawtooth
    // "trumpet" swell for PostGame winner reveal. Layered on top of
    // existing narrator quip + particles for the celebration peak.
    fanfare() {
      tone(523, 0.15, 'sawtooth', 0.15);  // C5
      setTimeout(() => tone(659, 0.15, 'sawtooth', 0.15), 120);   // E5
      setTimeout(() => tone(784, 0.15, 'sawtooth', 0.15), 240);   // G5
      setTimeout(() => tone(1047, 0.25, 'sawtooth', 0.18), 360);  // C6
      setTimeout(() => tone(1319, 0.45, 'sawtooth', 0.22, 0.02), 540); // E6 sustain
    },
    // Phase 25c — UI click + hover ticks. Short double-tick on click,
    // single short tick on hover. Low volume so the button feedback
    // stays subtle even if the user spams clicks.
    uiClick() {
      tone(1200, 0.06, 'sine', 0.12, 0.005);
      setTimeout(() => tone(1800, 0.04, 'sine', 0.08, 0.005), 20);
    },
    uiHover() {
      tone(880, 0.03, 'sine', 0.06, 0.005);
    },
  });

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
    // Phase 25a — tournament theme. Slow bass-heavy progression with
    // an ascending gilded arpeggio for the between-round / champion
    // overlay moments. Volume kept low (0.045) so narrator quips read.
    tournament: {
      bpm: 90, vol: 0.045,
      bass: [N.C3, N.C3, N.G2, N.C3, N.F3, N.F3, N.C3, N.G2],
      melody: [N.E5, N.G5, N.C6, N.G5, N.E5, N.F5, N.E5, N.C5],
      arp: [N.C4, N.E4, N.G4, N.C5, N.E5, N.C5, N.G4, N.E4],
      bassType: 'sawtooth', melType: 'triangle', arpType: 'sine',
      filterFreq: 700,
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

      // Phase 47b — kick drum on beats 1 and 3 (odd indices at the
      // 2-beat grid). Low sine thump + noise snap.
      if (step % 2 === 0) {
        const kick = ctx.createOscillator();
        const kg = ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(96, now);
        kick.frequency.exponentialRampToValueAtTime(42, now + 0.12);
        kg.gain.setValueAtTime(0.15, now);
        kg.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        kick.connect(kg).connect(musicGain);
        kick.start(now); kick.stop(now + 0.16);
      }

      // Phase 47b — hi-hat click on the off-beat (beat 2 & 4) so the
      // rhythm grid reads clearly; noise burst through a highpass-ish
      // feel via short envelope.
      if (step % 2 === 1) {
        const bufLen = Math.floor(ctx.sampleRate * 0.05);
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.55;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const hg = ctx.createGain();
        hg.gain.setValueAtTime(0.04, now);
        hg.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        src.connect(hg).connect(musicGain);
        src.start(now); src.stop(now + 0.05);
      }

      // Phase 47b — sustained chord pad on beat 1 of every 4-beat bar.
      // Holds a triad (root, third, fifth relative to current bass)
      // through the bar for body and warmth.
      if (step % 4 === 0 && bassNote) {
        const root = bassNote;
        const third = root * 1.189; // minor third ≈ 2^(3/12)
        const fifth = root * 1.498; // perfect fifth ≈ 2^(7/12)
        [root, third, fifth].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = f;
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.025, now + 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, now + beatMs / 1000 * 3.5);
          osc.connect(g).connect(filter);
          osc.start(now); osc.stop(now + beatMs / 1000 * 3.6);
        });
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

  // Phase 43 — optional opts argument forwarded to the effect so
  // callers can modulate pitch / volume / level. Effects that don't
  // use opts are unaffected.
  function play(name, opts) {
    if (effects[name]) effects[name](opts);
  }

  // Phase 25c — global UI click tick via event delegation. Fires on
  // pointerdown for recognized button classes, skips disabled. Works
  // across host + controller surfaces without wiring per-button.
  const UI_CLICK_SELECTOR =
    '.ticket-btn, .modal-btn, .sprite-btn, .gp-go-btn, .pg-btn, ' +
    '#btn-start, .back-link, .waiting-settings, #btn-play, ' +
    '#btn-customize, #btn-settings';
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest && e.target.closest(UI_CLICK_SELECTOR);
    if (!t) return;
    if (t.disabled || t.getAttribute('aria-disabled') === 'true') return;
    try { effects.uiClick(); } catch (_) { /* no-op */ }
  }, { passive: true });

  return { play, startMusic, stopMusic, unlock, startCrowd, stopCrowd };
})();
