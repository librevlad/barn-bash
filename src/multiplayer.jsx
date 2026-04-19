// Host-side multiplayer glue. Exposes a useMultiplayer hook + a QR
// overlay component. The hook connects to the server as role=host,
// tracks remote phone-players, and lets the host broadcast screen /
// minigame state and consume controller input events.
//
// Barn Bash internals stay largely single-player in shape; this layer
// sits alongside and:
//   - surfaces remote players so the CharacterSelect / lobby can
//     show real phones instead of CPU slots;
//   - broadcasts screen transitions so phones show the right
//     contract;
//   - buffers controller input events that minigames can consume
//     via a subscribe() API.

const { useState: useMPState, useEffect: useMPEffect, useRef: useMPRef, useCallback: useMPCallback, useMemo: useMPMemo } = React;

// Hash of playerId → queued input events. Minigames drain via subscribe.
const __inputListeners = new Set();
function __fanoutInput(evt) {
  for (const fn of __inputListeners) { try { fn(evt); } catch (_) {} }
}

function useMultiplayer() {
  const [connected, setConnected] = useMPState(false);
  const [remotePlayers, setRemotePlayers] = useMPState([]); // [{id, name, character, color}]
  const wsRef = useMPRef(null);
  const reconnectRef = useMPRef(null);

  useMPEffect(() => {
    let alive = true;
    function connect() {
      if (!alive) return;
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${location.host}/?role=host`);
      wsRef.current = ws;
      ws.addEventListener('open', () => setConnected(true));
      ws.addEventListener('close', () => {
        setConnected(false);
        if (alive) reconnectRef.current = setTimeout(connect, 1200);
      });
      ws.addEventListener('error', () => { try { ws.close(); } catch (_) {} });
      ws.addEventListener('message', (e) => {
        let msg; try { msg = JSON.parse(e.data); } catch (_) { return; }
        if (msg.type === 'hello' && msg.role === 'host') {
          setRemotePlayers(msg.players || []);
        } else if (msg.type === 'playerJoin') {
          setRemotePlayers(prev => prev.some(p => p.id === msg.id) ? prev : [...prev, { id: msg.id, name: null, character: null, color: null }]);
        } else if (msg.type === 'playerUpdate') {
          setRemotePlayers(prev => prev.map(p => p.id === msg.id ? { id: msg.id, name: msg.name, character: msg.character, color: msg.color } : p));
        } else if (msg.type === 'playerLeave') {
          setRemotePlayers(prev => prev.filter(p => p.id !== msg.id));
        } else if (msg.type === 'input') {
          __fanoutInput({ id: msg.id, kind: msg.kind, data: msg.data });
        }
      });
    }
    connect();
    return () => {
      alive = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      try { wsRef.current && wsRef.current.close(); } catch (_) {}
    };
  }, []);

  const send = useMPCallback((obj) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1) return;
    try { ws.send(JSON.stringify(obj)); } catch (_) {}
  }, []);

  const broadcastScreen = useMPCallback((screen) => send({ type: 'screen', screen }), [send]);
  const broadcastMinigameStart = useMPCallback((id, prompt, contract) => send({ type: 'minigameStart', id, prompt, contract }), [send]);
  const broadcastMinigameEnd = useMPCallback((id) => send({ type: 'minigameEnd', id }), [send]);
  // Mid-game scoreboard: { byId: {playerId: score}, leader: maxScore, label? }.
  // Mini-games can call this on every RAF tick — we throttle to ~6Hz so phones
  // aren't flooded with 60 messages/sec.
  const lastScoreSentRef = useMPRef(0);
  const broadcastScores = useMPCallback((payload) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastScoreSentRef.current < 150) return;
    lastScoreSentRef.current = now;
    send({ type: 'scoreUpdate', ...payload });
  }, [send]);

  // Subscribe to controller input events. Returns unsubscribe fn.
  const onInput = useMPCallback((fn) => {
    __inputListeners.add(fn);
    return () => __inputListeners.delete(fn);
  }, []);

  const api = useMPMemo(() => ({
    connected, remotePlayers,
    broadcastScreen, broadcastMinigameStart, broadcastMinigameEnd, broadcastScores,
    onInput, send,
  }), [connected, remotePlayers, broadcastScreen, broadcastMinigameStart, broadcastMinigameEnd, broadcastScores, onInput, send]);

  // Pin the API onto the window so minigame components (deep in the
  // tree) can grab it without prop drilling through App → Minigame.
  useMPEffect(() => { window.__BarnBashMPRT = api; }, [api]);

  return api;
}

// QR overlay for the title screen. Renders the phone-join URL using a
// pure-SVG QR code (no external dep). Uses a tiny-qr encoder included
// below.
function MultiplayerHUD({ mp, corner = 'top-right' }) {
  const url = `${location.origin}/controller/`;
  const ipUrl = useMPMemo(() => {
    // Prefer LAN IP hint if location.host is localhost — phones can't
    // reach localhost. Try to surface a readable host string.
    return url;
  }, [url]);
  const qr = useMPMemo(() => makeQR(ipUrl, 33), [ipUrl]);
  const connectedCount = (mp.remotePlayers || []).filter(p => p.name).length;
  const cornerStyle = {
    'top-right':    { position:'absolute', top:20, right:20 },
    'top-left':     { position:'absolute', top:20, left:20 },
    'bottom-right': { position:'absolute', bottom:20, right:20 },
    'bottom-left':  { position:'absolute', bottom:20, left:20 },
  }[corner] || { position:'absolute', top:20, right:20 };

  return (
    <div style={{ ...cornerStyle, zIndex:40, background:'#fff', border:'4px solid #2a1a10', borderRadius:18, boxShadow:'0 8px 0 #2a1a10', padding:12, display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ width:132, height:132, display:'grid', gridTemplateColumns:`repeat(${qr.size}, 1fr)`, gap:0, background:'#fff', padding:4, boxSizing:'border-box' }}>
        {qr.matrix.map((row, y) => row.map((on, x) => (
          <div key={`${x}-${y}`} style={{ background: on ? '#2a1a10' : '#fff' }}/>
        )))}
      </div>
      <div style={{ fontFamily:"'Fredoka',sans-serif", color:'#2a1a10', lineHeight:1.2 }}>
        <div style={{ fontFamily:"'Luckiest Guy',cursive", fontSize:22, letterSpacing:1 }}>JOIN!</div>
        <div style={{ fontSize:13, fontWeight:600, marginTop:2, wordBreak:'break-all', maxWidth:180 }}>{ipUrl}</div>
        <div style={{ fontSize:12, fontWeight:700, marginTop:6, color: mp.connected ? '#3e8a29' : '#a8291a' }}>
          {mp.connected ? `🟢 ${connectedCount} player${connectedCount === 1 ? '' : 's'}` : '🔴 offline'}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Tiny QR generator — just enough for an ASCII URL string at low EC.
// Adapted from public-domain micro-qr encoders. Produces a matrix of
// booleans. Used only for the join QR on the host title screen.
// =====================================================================

// This is a minimal QR code encoder (version 1-10, L error correction,
// byte mode). Compact implementation — not production hardened.
function makeQR(text, sizeHint) {
  // Fallback to a simple hash-pattern if the string is too exotic.
  try {
    return qrEncode(text, 'L');
  } catch (_) {
    // 21×21 pattern that reads "QR" but isn't scannable; pure
    // placeholder so the UI doesn't crash.
    const m = [];
    for (let y = 0; y < 21; y++) { m.push([]); for (let x = 0; x < 21; x++) m[y].push(((x+y) & 1) === 0); }
    return { size: 21, matrix: m };
  }
}

// --- QR encoder (short, sufficient for URLs up to ~50 chars at L EC) ---
// Based on the QR spec. Cleaned for clarity.
function qrEncode(text, ecLevel) {
  const data = [];
  for (let i = 0; i < text.length; i++) data.push(text.charCodeAt(i) & 0xff);
  const ec = ecLevel || 'L';
  // Pick smallest version that fits.
  const caps = { L:[17,32,53,78,106,134,154,192,230,271,321,367,425,458,520,586,644,718,792,858,929,1003,1091,1171,1273,1367,1465,1528,1628,1732,1840,1952,2068,2188,2303,2431,2563,2699,2809,2953] };
  let version = 1;
  while (version <= 40 && caps[ec][version - 1] < data.length) version++;
  if (version > 10) throw new Error('too long'); // keep it small for Barn Bash URL
  const size = version * 4 + 17;

  // Bit writer
  const bits = [];
  function pushBits(v, len) { for (let i = len - 1; i >= 0; i--) bits.push((v >> i) & 1); }

  // Mode indicator (byte mode = 0100), character count indicator (8 bits for v1-9, 16 for v10-40)
  pushBits(0b0100, 4);
  pushBits(data.length, version < 10 ? 8 : 16);
  for (const b of data) pushBits(b, 8);
  // Terminator + pad to byte
  const totalDataCodewords = getDataCapacityBytes(version, ec);
  const totalBits = totalDataCodewords * 8;
  while (bits.length < totalBits && bits.length < totalBits - 4 + 4) pushBits(0, 1);
  while (bits.length % 8 !== 0) pushBits(0, 1);
  // Pad bytes 0xEC, 0x11 alternating
  const padBytes = [0xEC, 0x11];
  let padIdx = 0;
  while (bits.length / 8 < totalDataCodewords) pushBits(padBytes[padIdx++ & 1], 8);

  // Convert to codewords
  const dataCodewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    dataCodewords.push(b);
  }

  // Compute EC codewords using Reed-Solomon
  const ecCount = getECCountPerBlock(version, ec);
  const blocks = getECBlocks(version, ec);
  const allDataBlocks = [], allEcBlocks = [];
  let dataIdx = 0;
  for (const blk of blocks) {
    for (let i = 0; i < blk.count; i++) {
      const dataBlock = dataCodewords.slice(dataIdx, dataIdx + blk.dataPer);
      dataIdx += blk.dataPer;
      allDataBlocks.push(dataBlock);
      allEcBlocks.push(rsEncode(dataBlock, ecCount));
    }
  }
  // Interleave
  const interleaved = [];
  const maxData = Math.max(...allDataBlocks.map(b => b.length));
  for (let i = 0; i < maxData; i++) for (const blk of allDataBlocks) if (i < blk.length) interleaved.push(blk[i]);
  for (let i = 0; i < ecCount; i++) for (const blk of allEcBlocks) interleaved.push(blk[i]);
  // Remainder bits are zero for version ≤ 6 (v7+ have remainder, ignored here since we cap at 10).

  // Build matrix
  const m = new Array(size); for (let y = 0; y < size; y++) { m[y] = new Array(size).fill(null); }

  function setFinder(x, y) {
    for (let dy = -1; dy <= 7; dy++) for (let dx = -1; dx <= 7; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      if (dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6) {
        const on = dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
        m[ny][nx] = on ? 1 : 0;
      } else m[ny][nx] = 0;
    }
  }
  setFinder(0, 0); setFinder(size - 7, 0); setFinder(0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (m[6][i] == null) m[6][i] = (i % 2 === 0) ? 1 : 0;
    if (m[i][6] == null) m[i][6] = (i % 2 === 0) ? 1 : 0;
  }
  // Dark module
  m[size - 8][8] = 1;

  // Reserve format bits (positions around finders). Set to 0 temporarily.
  function reserveFormat() {
    for (let i = 0; i < 9; i++) { if (m[8][i] == null) m[8][i] = 0; if (m[i][8] == null) m[i][8] = 0; }
    for (let i = 0; i < 8; i++) { if (m[8][size - 1 - i] == null) m[8][size - 1 - i] = 0; if (m[size - 1 - i][8] == null) m[size - 1 - i][8] = 0; }
  }
  reserveFormat();

  // Alignment patterns (version >= 2, we use at most one center one for v2-6, two for v7+)
  if (version >= 2) {
    const positions = alignmentPositions(version);
    for (const px of positions) for (const py of positions) {
      if ((px === 6 && py === 6) || (px === 6 && py === size - 7) || (px === size - 7 && py === 6)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const onRing = Math.abs(dx) === 2 || Math.abs(dy) === 2;
        const center = dx === 0 && dy === 0;
        m[ny][nx] = onRing || center ? 1 : 0;
      }
    }
  }

  // Place data bits zig-zag upward
  let bitIdx = 0;
  const allBits = [];
  for (const cw of interleaved) for (let i = 7; i >= 0; i--) allBits.push((cw >> i) & 1);
  let up = true;
  for (let colRight = size - 1; colRight > 0; colRight -= 2) {
    if (colRight === 6) colRight = 5; // skip timing column
    for (let i = 0; i < size; i++) {
      const y = up ? size - 1 - i : i;
      for (let dx = 0; dx < 2; dx++) {
        const x = colRight - dx;
        if (m[y][x] == null) {
          m[y][x] = allBits[bitIdx++] || 0;
        }
      }
    }
    up = !up;
  }

  // Try masks; pick lowest penalty
  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const mm = applyMask(m, mask, size);
    writeFormat(mm, ec, mask, size);
    const pen = penalty(mm, size);
    if (!best || pen < best.pen) best = { pen, mm };
  }

  return { size, matrix: best.mm.map(row => row.map(v => !!v)) };
}

function alignmentPositions(v) {
  const table = [
    [], [6,18], [6,22], [6,26], [6,30], [6,34], [6,22,38], [6,24,42], [6,26,46], [6,28,50]
  ];
  return table[v - 1] || [];
}
function getDataCapacityBytes(version, ec) {
  // Table of data capacity (bytes) per (version, EC level). Cap at v10.
  const table = {
    L:[19,34,55,80,108,136,156,194,232,274]
  };
  return table[ec][version - 1];
}
function getECCountPerBlock(version, ec) {
  const table = { L:[7,10,15,20,26,18,20,24,30,18] };
  return table[ec][version - 1];
}
function getECBlocks(version, ec) {
  // Very small version blocks table (v1-v10, L).
  const blocks = {
    L: [
      [{count:1,dataPer:19}],
      [{count:1,dataPer:34}],
      [{count:1,dataPer:55}],
      [{count:1,dataPer:80}],
      [{count:1,dataPer:108}],
      [{count:2,dataPer:68}],
      [{count:2,dataPer:78}],
      [{count:2,dataPer:97}],
      [{count:2,dataPer:116}],
      [{count:2,dataPer:68},{count:2,dataPer:69}]
    ]
  };
  return blocks[ec][version - 1];
}

// Reed-Solomon GF(256)
const GF_EXP = new Array(512), GF_LOG = new Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x; GF_LOG[x] = i;
    x <<= 1; if (x & 0x100) x ^= 0x11D;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();
function gfMul(a, b) { return (a === 0 || b === 0) ? 0 : GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255]; }
function rsGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}
function rsEncode(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Array(data.length + ecCount).fill(0);
  for (let i = 0; i < data.length; i++) res[i] = data[i];
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef !== 0) for (let j = 0; j < gen.length; j++) res[i + j] ^= gfMul(gen[j], coef);
  }
  return res.slice(data.length);
}

function applyMask(matrix, mask, size) {
  const out = matrix.map(row => row.slice());
  const maskFn = [
    (r,c) => (r + c) % 2 === 0,
    (r,c) => r % 2 === 0,
    (r,c) => c % 3 === 0,
    (r,c) => (r + c) % 3 === 0,
    (r,c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r,c) => ((r * c) % 2 + (r * c) % 3) === 0,
    (r,c) => (((r * c) % 2 + (r * c) % 3) % 2) === 0,
    (r,c) => (((r + c) % 2 + (r * c) % 3) % 2) === 0,
  ][mask];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (isReserved(x, y, size)) continue;
    if (maskFn(y, x)) out[y][x] = out[y][x] ^ 1;
  }
  return out;
}
function isReserved(x, y, size) {
  if (x < 9 && y < 9) return true;
  if (x >= size - 8 && y < 9) return true;
  if (x < 9 && y >= size - 8) return true;
  if (x === 6 || y === 6) return true;
  return false;
}
function writeFormat(matrix, ec, mask, size) {
  const ecBits = { L: 0b01 }[ec];
  const format = (ecBits << 3) | mask;
  const bch = bchFormat(format);
  const bits = bch ^ 0b101010000010010;
  const put = (b, x, y) => { matrix[y][x] = (b >> 14) & 1; };
  // Around top-left finder
  const positions1 = [
    [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[7,8],[8,8],
    [8,7],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0]
  ];
  for (let i = 0; i < 15; i++) {
    const [x, y] = positions1[i];
    matrix[y][x] = (bits >> (14 - i)) & 1;
  }
  const positions2 = [
    [8, size-1], [8, size-2], [8, size-3], [8, size-4], [8, size-5], [8, size-6], [8, size-7],
    [size-8, 8], [size-7, 8], [size-6, 8], [size-5, 8], [size-4, 8], [size-3, 8], [size-2, 8], [size-1, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [x, y] = positions2[i];
    matrix[y][x] = (bits >> (14 - i)) & 1;
  }
}
function bchFormat(data) {
  let d = data << 10;
  for (let i = 4; i >= 0; i--) if ((d >> (i + 10)) & 1) d ^= 0b10100110111 << i;
  return (data << 10) | (d & 0x3FF);
}
function penalty(matrix, size) {
  // Simple run-length penalty — good enough for stable mask selection.
  let p = 0;
  for (let y = 0; y < size; y++) {
    let run = 1;
    for (let x = 1; x < size; x++) {
      if (matrix[y][x] === matrix[y][x - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p += 1; }
      else run = 1;
    }
  }
  for (let x = 0; x < size; x++) {
    let run = 1;
    for (let y = 1; y < size; y++) {
      if (matrix[y][x] === matrix[y - 1][x]) { run++; if (run === 5) p += 3; else if (run > 5) p += 1; }
      else run = 1;
    }
  }
  return p;
}

// Global overlay that floats up phone-sent emoji reactions near the top
// of the host screen. Subscribes via __inputListeners directly so it
// survives any screen transition without re-mounting.
function ReactionOverlay() {
  const [pops, setPops] = useMPState([]);
  useMPEffect(() => {
    const fn = ({ kind, data }) => {
      if (kind !== 'reaction' || !data || !data.emoji) return;
      const id = Date.now() + Math.random();
      setPops(prev => [...prev, { id, emoji: data.emoji, x: 20 + Math.random() * 80 }]);
      setTimeout(() => setPops(prev => prev.filter(p => p.id !== id)), 1800);
    };
    __inputListeners.add(fn);
    return () => __inputListeners.delete(fn);
  }, []);
  return (
    <div style={{position:'fixed', inset:0, pointerEvents:'none', zIndex:9000, overflow:'hidden'}}>
      {pops.map(p => (
        <div key={p.id} style={{
          position:'absolute', left:`${p.x}%`, bottom:'8%',
          fontSize:72, filter:'drop-shadow(0 6px 0 rgba(0,0,0,.4))',
          animation:'reactionFloat 1.8s ease-out forwards'
        }}>{p.emoji}</div>
      ))}
      <style>{`@keyframes reactionFloat { 0%{ transform:translateY(0) scale(.4); opacity:0 } 15%{ transform:translateY(-40px) scale(1.1); opacity:1 } 100%{ transform:translateY(-480px) scale(.9); opacity:0 } }`}</style>
    </div>
  );
}

// Expose onto window so app.jsx (loaded later) can pull them.
window.__BarnBashMP = { useMultiplayer, MultiplayerHUD, ReactionOverlay };
