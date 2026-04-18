// ============================================================
// King of the Hill — Server Game Logic (Phase 38a — Cartesian)
// ============================================================
//
// Phase 38a rewrites KotH physics from polar (angle+radius+orbit)
// to cartesian (x+y+vx+vy). Key changes:
//   - No auto-orbit. Players stand still unless input says otherwise.
//   - No gravity-to-center. Arena is a circle but position is free.
//   - Movement is velocity-impulse: input sets vx/vy, friction damps.
//   - Dash applies a large impulse toward the nearest enemy or
//     toward the input direction (for dashDir).
//   - Collisions are cartesian circle-vs-circle; impulse travels
//     along the collision normal (dx/dy between centres).
//   - Fell off: sqrt(x²+y²) > platR + 0.5.
//   - King zone scoring: sqrt(x²+y²) < KING_ZONE_R.
//
// Hazards, powerups, scoring, teetering, anchor, shield, ground
// pound all preserved but expressed in cartesian. Server-emitted
// state switches from { angle, radius } to { x, y } for every player.

const { Physics2D } = require('../engine/Physics2D');

const TICK_MS = 50;
const MOVE_ACCEL = 0.045;    // input impulse per tick
const MOVE_MAX_SPEED = 0.35; // cap velocity magnitude when not dashing
const FRICTION = 0.87;
const HIT_DIST = 1.4;
const INIT_R = 4;            // starting arena radius (world units)
const MIN_R = 1.8;           // cannot shrink below
const SHRINK_INT = 80;       // shrink every 4s
const SUDDEN_DEATH_TICK = 700;
const SHRINK_AMT = 0.35;
const DASH_CD = 10;
const PUSH_FORCE = 1.0;      // knockback impulse magnitude

// King zone
const KING_ZONE_R = 1.5;
const KING_SCORE_PER_TICK = 1;

// Teetering
const TEETER_TICKS = 30;
const TEETER_THRESHOLD = 0.5;

// Near-miss
const NEAR_MISS_DIST = 0.3;

// Ground pound
const GPOUND_RADIUS = 2.0;
const GPOUND_FORCE = 0.45;

// Power-ups
const POWERUP_SPAWN_INT = 120;
const POWERUP_TYPES = ['anchor', 'superDash', 'gravityBomb'];
const ANCHOR_DURATION = 60;
const SUPER_DASH_MULT = 2.0;

// Environmental hazards
const CRACK_TICK = 300;
const BUMPER_TICK = 600;
const ICE_TICK = 900;
const BUMPER_FORCE = 0.5;
const ICE_FRICTION = 0.95;

// Dash physics
const DASH_IMPULSE = 0.55;
const DASH_TICKS = 12;

// Character traits — same meaning, no orbit term.
const TRAITS = {
  cat:     { moveBonus: 0.008,  pushBonus: 0,    gpoundBonus: 0 },
  frog:    { moveBonus: 0,      pushBonus: 0,    gpoundBonus: 0.5 },
  wolf:    { moveBonus: 0,      pushBonus: 0.13, gpoundBonus: 0 },
  bear:    { moveBonus: 0,      pushBonus: 0.2,  gpoundBonus: 0.3 },
  bunny:   { moveBonus: 0.012,  pushBonus: 0,    gpoundBonus: 0 },
  pig:     { moveBonus: 0,      pushBonus: 0.05, gpoundBonus: 0.2 },
  chicken: { moveBonus: 0.006,  pushBonus: 0,    gpoundBonus: 0.8 },
  raccoon: { moveBonus: 0.006,  pushBonus: 0.08, gpoundBonus: 0 },
};

function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

class HillGame {
  constructor(players, broadcast) {
    this.players = players;
    this.broadcast = broadcast;
    this.phase = 'lobby';
    this.tick = 0;
    this.platR = INIT_R;
    this.winner = null;
    this._iv = null;
    this.powerups = [];
    this.nextPowerup = 60;
    this.cracks = [];
    this.bumperAngle = 0;
    this.bumperActive = false;
    this.iceZone = null;
    this.dramaticSent = false;
  }

  getGameId() { return 'hillKing'; }

  start() {
    if (this.phase !== 'lobby') return;
    if (this.players.connectedCount() < 2) return;

    this.phase = 'running';
    this.tick = 0;
    this.platR = INIT_R;
    this.winner = null;
    this.powerups = [];
    this.nextPowerup = 60;
    this.cracks = [];
    this.bumperAngle = 0;
    this.bumperActive = false;
    this.iceZone = null;
    this.dramaticSent = false;

    const conn = this.players.connected();
    const step = (Math.PI * 2) / conn.length;
    const spawnR = this.platR * 0.6;
    conn.forEach((p, i) => {
      const char = p.character || 'cat';
      const trait = TRAITS[char] || TRAITS.cat;
      const a = i * step;
      p.gameData = {
        alive: true,
        x: Math.cos(a) * spawnR,
        y: Math.sin(a) * spawnR,
        vx: 0, vy: 0,
        facing: a + Math.PI, // face inward
        dashing: false, dashT: 0, cd: 0,
        shielding: false,
        teetering: false, teeterTimer: 0,
        anchor: 0, superDash: false,
        score: 0, combo: 0,
        character: char,
        moveAccel: MOVE_ACCEL + trait.moveBonus,
        pushBonus: trait.pushBonus,
        gpoundBonus: trait.gpoundBonus,
      };
    });

    this.broadcastState();
    this._iv = setInterval(() => this._tick(), TICK_MS);
  }

  _tick() {
    this.tick++;
    const suddenDeath = this.tick >= SUDDEN_DEATH_TICK;
    this._updateHazards();
    this._spawnPowerups();

    const alive = [];
    for (const p of this.players.connected()) {
      const g = p.gameData;
      if (!g || !g.alive) continue;
      alive.push(p);

      // Timers
      if (g.anchor > 0) g.anchor--;
      if (g.cd > 0) g.cd--;
      if (g.dashing) { g.dashT--; if (g.dashT <= 0) g.dashing = false; }

      // Teetering recovery — pull back toward centre
      if (g.teetering) {
        g.teeterTimer--;
        if (g.teeterTimer <= 0) { g.teetering = false; }
        const r = dist(g.x, g.y, 0, 0);
        if (r > 0.01) {
          g.vx -= (g.x / r) * 0.015;
          g.vy -= (g.y / r) * 0.015;
        }
      }

      // Cap non-dash velocity magnitude so players don't reach dash-like speeds
      // just by spamming move. Dashing players are exempt (their impulse is
      // larger). Friction still applies after the cap.
      if (!g.dashing) {
        const sp = Math.sqrt(g.vx * g.vx + g.vy * g.vy);
        if (sp > MOVE_MAX_SPEED) {
          g.vx = (g.vx / sp) * MOVE_MAX_SPEED;
          g.vy = (g.vy / sp) * MOVE_MAX_SPEED;
        }
      }

      // Integrate position
      g.x += g.vx;
      g.y += g.vy;

      // Friction (ice zone reduces friction)
      const friction = this.iceZone && this._inIceZone(g) ? ICE_FRICTION : FRICTION;
      g.vx *= friction;
      g.vy *= friction;
      if (Math.abs(g.vx) < 0.003) g.vx = 0;
      if (Math.abs(g.vy) < 0.003) g.vy = 0;

      // Facing direction follows velocity when moving fast enough
      const spMag = Math.sqrt(g.vx * g.vx + g.vy * g.vy);
      if (spMag > 0.04) g.facing = Math.atan2(g.vy, g.vx);

      // Bumper — rotating obstacle at 80% radius, knocks outward
      if (this.bumperActive) {
        const bx = Math.cos(this.bumperAngle) * 0.8;
        const by = Math.sin(this.bumperAngle) * 0.8;
        const d = dist(g.x, g.y, bx, by);
        if (d < 0.8) {
          const nx = (g.x - bx) / (d || 1);
          const ny = (g.y - by) / (d || 1);
          g.vx += nx * BUMPER_FORCE;
          g.vy += ny * BUMPER_FORCE;
          this.broadcast({ type: 'bump', from: 0, to: p.id, gameId: 'hillKing' });
        }
      }

      // Cracks — push outward from crack centre
      for (const crack of this.cracks) {
        const cx = Math.cos(crack.angle) * crack.radius;
        const cy = Math.sin(crack.angle) * crack.radius;
        const d = dist(g.x, g.y, cx, cy);
        if (d < 0.8) {
          const nx = (g.x - cx) / (d || 1);
          const ny = (g.y - cy) / (d || 1);
          g.vx += nx * 0.015;
          g.vy += ny * 0.015;
        }
      }

      // King zone scoring — distance from origin
      const rFromCenter = dist(g.x, g.y, 0, 0);
      if (rFromCenter < KING_ZONE_R && !g.teetering) {
        g.score += KING_SCORE_PER_TICK;
      }

      // Power-up collection
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const pu = this.powerups[i];
        const pux = Math.cos(pu.angle) * pu.radius;
        const puy = Math.sin(pu.angle) * pu.radius;
        if (dist(g.x, g.y, pux, puy) < 1.2) {
          this._collectPowerup(p, pu, i);
        }
      }

      // Fell off edge
      if (rFromCenter > this.platR + 0.5) {
        if (g.teetering || suddenDeath) {
          g.alive = false;
          g.teetering = false;
          this.broadcast({ type: 'eliminated', playerId: p.id, gameId: 'hillKing' });
        } else {
          g.teetering = true;
          g.teeterTimer = TEETER_TICKS;
          // Clamp to edge
          const r = rFromCenter;
          g.x = (g.x / r) * (this.platR + 0.3);
          g.y = (g.y / r) * (this.platR + 0.3);
          g.vx = 0; g.vy = 0;
          this.broadcast({ type: 'teetering', playerId: p.id, gameId: 'hillKing' });
        }
      }
    }

    // Collisions
    this._checkCollisions(alive);

    // Sudden death announcement
    if (suddenDeath && this.tick === SUDDEN_DEATH_TICK) {
      this.broadcast({ type: 'sudden_death', gameId: 'hillKing' });
    }

    // Arena shrink (faster during sudden death)
    const shrinkInt = suddenDeath ? 40 : SHRINK_INT;
    const shrinkAmt = suddenDeath ? 0.6 : SHRINK_AMT;
    const minR = suddenDeath ? 1.2 : MIN_R;
    if (this.tick % shrinkInt === 0 && this.platR > minR) {
      this.platR = Math.max(minR, this.platR - shrinkAmt);
      this.broadcast({ type: 'platform_shrink', radius: this.platR, gameId: 'hillKing' });
    }
    if ((this.tick + 40) % shrinkInt === 0 && this.platR > minR) {
      this.broadcast({ type: 'shrink_warning', gameId: 'hillKing' });
    }

    // Win conditions
    const still = alive.filter(p => p.gameData.alive);

    if (still.length === 2 && !this.dramaticSent && this.players.connectedCount() > 2) {
      this.dramaticSent = true;
      this.broadcast({ type: 'dramatic_finish', gameId: 'hillKing' });
    }

    if (still.length <= 1 && this.players.connectedCount() >= 2) {
      this.phase = 'result';
      this.winner = still.length === 1 ? still[0].id : null;
      clearInterval(this._iv);
      this.broadcastState();
      this.broadcast({ type: 'game_over', winnerId: this.winner, gameId: 'hillKing' });
      return;
    }

    if (this.tick >= SUDDEN_DEATH_TICK + 500 && still.length >= 2) {
      this.phase = 'result';
      still.sort((a, b) => (b.gameData.score || 0) - (a.gameData.score || 0));
      this.winner = still[0].id;
      clearInterval(this._iv);
      this.broadcastState();
      this.broadcast({ type: 'game_over', winnerId: this.winner, gameId: 'hillKing', byScore: true });
      return;
    }

    if (this.tick % 2 === 0) this.broadcastState();
  }

  _checkCollisions(alive) {
    const halfHit = HIT_DIST / 2;
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        if (!alive[i].gameData.alive || !alive[j].gameData.alive) continue;
        const a = alive[i].gameData, b = alive[j].gameData;
        if (a.teetering || b.teetering) continue;

        const hit = Physics2D.circleVsCircle(
          { x: a.x, y: a.y, radius: halfHit },
          { x: b.x, y: b.y, radius: halfHit }
        );

        if (!hit) {
          const d = dist(a.x, a.y, b.x, b.y);
          if (d < HIT_DIST + NEAR_MISS_DIST && (a.dashing || b.dashing)) {
            const dodger = a.dashing ? alive[j] : alive[i];
            dodger.gameData.combo++;
            dodger.gameData.score += 5 * dodger.gameData.combo;
            this.broadcast({ type: 'near_miss', playerId: dodger.id, combo: dodger.gameData.combo, gameId: 'hillKing' });
          }
          continue;
        }

        // Separate along collision normal so overlapping pairs don't
        // stay stuck frame after frame.
        const d = dist(a.x, a.y, b.x, b.y) || 0.001;
        const nx = (b.x - a.x) / d;
        const ny = (b.y - a.y) / d;
        const overlap = (halfHit * 2) - d;
        if (overlap > 0) {
          const push = overlap * 0.5;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
        }

        const pushForceA = PUSH_FORCE + a.pushBonus;
        const pushForceB = PUSH_FORCE + b.pushBonus;

        // Dash-vs-not: impulse along collision normal away from attacker.
        if (a.dashing && !b.dashing) {
          const force = a.superDash ? pushForceA * SUPER_DASH_MULT : pushForceA;
          a.superDash = false;
          if (b.shielding) {
            a.vx -= nx * force * 0.8; a.vy -= ny * force * 0.8;
            a.dashing = false;
            this.broadcast({ type: 'shieldBlock', playerId: alive[j].id, gameId: 'hillKing' });
          } else if (b.anchor > 0) {
            a.vx -= nx * force * 0.3; a.vy -= ny * force * 0.3;
            a.dashing = false;
            this.broadcast({ type: 'anchor_block', playerId: alive[j].id, gameId: 'hillKing' });
          } else {
            b.vx += nx * force; b.vy += ny * force;
            b.combo = 0;
            a.dashing = false;
            this.broadcast({ type: 'bump', from: alive[i].id, to: alive[j].id, gameId: 'hillKing' });
          }
        } else if (b.dashing && !a.dashing) {
          const force = b.superDash ? pushForceB * SUPER_DASH_MULT : pushForceB;
          b.superDash = false;
          if (a.shielding) {
            b.vx += nx * force * 0.8; b.vy += ny * force * 0.8;
            b.dashing = false;
            this.broadcast({ type: 'shieldBlock', playerId: alive[i].id, gameId: 'hillKing' });
          } else if (a.anchor > 0) {
            b.vx += nx * force * 0.3; b.vy += ny * force * 0.3;
            b.dashing = false;
            this.broadcast({ type: 'anchor_block', playerId: alive[i].id, gameId: 'hillKing' });
          } else {
            a.vx -= nx * force; a.vy -= ny * force;
            a.combo = 0;
            b.dashing = false;
            this.broadcast({ type: 'bump', from: alive[j].id, to: alive[i].id, gameId: 'hillKing' });
          }
        } else if (a.dashing && b.dashing) {
          a.vx -= nx * PUSH_FORCE * 0.5; a.vy -= ny * PUSH_FORCE * 0.5;
          b.vx += nx * PUSH_FORCE * 0.5; b.vy += ny * PUSH_FORCE * 0.5;
          a.dashing = false; b.dashing = false;
          this.broadcast({ type: 'bump', from: alive[i].id, to: alive[j].id, gameId: 'hillKing' });
        } else {
          // Ambient bump — light push apart so pairs don't hug.
          a.vx -= nx * 0.08; a.vy -= ny * 0.08;
          b.vx += nx * 0.08; b.vy += ny * 0.08;
        }
      }
    }
  }

  _updateHazards() {
    if (this.tick === CRACK_TICK) {
      for (let i = 0; i < 2; i++) {
        this.cracks.push({
          angle: Math.random() * Math.PI * 2,
          radius: 1.5 + Math.random() * (this.platR - 2),
        });
      }
      this.broadcast({ type: 'hazard_cracks', cracks: this.cracks, gameId: 'hillKing' });
    }
    if (this.tick === BUMPER_TICK) {
      this.bumperActive = true;
      this.broadcast({ type: 'hazard_bumper', gameId: 'hillKing' });
    }
    if (this.bumperActive) {
      this.bumperAngle = (this.bumperAngle + 0.02) % (Math.PI * 2);
    }
    if (this.tick === ICE_TICK) {
      this.iceZone = {
        angle: Math.random() * Math.PI * 2,
        spread: Math.PI * 0.4,
      };
      this.broadcast({ type: 'hazard_ice', iceZone: this.iceZone, gameId: 'hillKing' });
    }
  }

  _inIceZone(g) {
    if (!this.iceZone) return false;
    const a = Math.atan2(g.y, g.x);
    let diff = a - this.iceZone.angle;
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) < this.iceZone.spread;
  }

  _spawnPowerups() {
    if (this.tick < this.nextPowerup) return;
    const angle = Math.random() * Math.PI * 2;
    const radius = 1 + Math.random() * (this.platR - 2);
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    this.powerups.push({ angle, radius, type });
    this.nextPowerup = this.tick + POWERUP_SPAWN_INT + Math.floor(Math.random() * 60);
    this.broadcast({ type: 'powerup_spawned', powerup: { angle, radius, type }, gameId: 'hillKing' });
  }

  _collectPowerup(player, pu, idx) {
    const g = player.gameData;
    if (pu.type === 'anchor') g.anchor = ANCHOR_DURATION;
    else if (pu.type === 'superDash') g.superDash = true;
    else if (pu.type === 'gravityBomb') {
      for (const other of this.players.connected()) {
        if (other.id === player.id || !other.gameData || !other.gameData.alive) continue;
        if (other.gameData.anchor > 0) continue;
        const og = other.gameData;
        const d = dist(og.x, og.y, g.x, g.y) || 0.001;
        const nx = (og.x - g.x) / d;
        const ny = (og.y - g.y) / d;
        og.vx += nx * 0.4;
        og.vy += ny * 0.4;
      }
      this.broadcast({ type: 'gravity_bomb', playerId: player.id, gameId: 'hillKing' });
    }
    this.broadcast({ type: 'powerup_collected', playerId: player.id, powerup: pu.type, gameId: 'hillKing' });
    this.powerups.splice(idx, 1);
  }

  handleInput(playerId, action, msg) {
    if (this.phase !== 'running') return;
    const p = this.players.get(playerId);
    if (!p || !p.gameData || !p.gameData.alive) return;
    const g = p.gameData;

    if (g.teetering) return;

    if (action === 'move' && msg && msg.direction) {
      const accel = g.moveAccel;
      if (msg.direction === 'left')  g.vx -= accel;
      else if (msg.direction === 'right') g.vx += accel;
      else if (msg.direction === 'up')    g.vy -= accel;
      else if (msg.direction === 'down')  g.vy += accel;
      return;
    }

    if (action === 'shield') { g.shielding = true; return; }
    if (action === 'shieldEnd') { g.shielding = false; return; }

    if (action === 'groundPound' || (action === 'dash' && g.dashing)) {
      const gpoundR = GPOUND_RADIUS + g.gpoundBonus;
      for (const other of this.players.connected()) {
        if (other.id === p.id || !other.gameData || !other.gameData.alive) continue;
        const og = other.gameData;
        const d = dist(og.x, og.y, g.x, g.y);
        if (d < gpoundR && og.anchor <= 0) {
          const dd = d || 0.001;
          const nx = (og.x - g.x) / dd;
          const ny = (og.y - g.y) / dd;
          og.vx += nx * GPOUND_FORCE;
          og.vy += ny * GPOUND_FORCE;
          og.combo = 0;
        }
      }
      g.dashing = false;
      g.cd = DASH_CD;
      this.broadcast({ type: 'ground_pound', playerId: p.id, gameId: 'hillKing' });
      return;
    }

    if (action === 'dash' || action === 'dashDir') {
      if (g.dashing || g.cd > 0 || g.shielding) return;

      let dashAngle;
      if (action === 'dashDir' && msg && msg.direction) {
        const dirMap = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 };
        dashAngle = dirMap[msg.direction] !== undefined ? dirMap[msg.direction] : g.facing;
      } else {
        // Auto-target nearest enemy
        let nearestDist = Infinity, nearestAngle = g.facing;
        for (const other of this.players.connected()) {
          if (other.id === p.id || !other.gameData || !other.gameData.alive) continue;
          const og = other.gameData;
          const dx = og.x - g.x, dy = og.y - g.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < nearestDist) { nearestDist = d; nearestAngle = Math.atan2(dy, dx); }
        }
        dashAngle = nearestAngle;
      }

      g.vx += Math.cos(dashAngle) * DASH_IMPULSE;
      g.vy += Math.sin(dashAngle) * DASH_IMPULSE;
      g.facing = dashAngle;
      g.dashing = true;
      g.dashT = DASH_TICKS;
      g.cd = DASH_CD;
      g.shielding = false;
    }
  }

  restart() {
    clearInterval(this._iv);
    this.phase = 'lobby';
    this.platR = INIT_R;
    this.winner = null;
    this.powerups = [];
    this.cracks = [];
    this.bumperActive = false;
    this.iceZone = null;
    this.dramaticSent = false;
    this.players.resetGameData();
    this.broadcastState();
  }

  broadcastState() {
    this.broadcast({ type: 'state', gameId: 'hillKing', gameState: this.getState() });
  }

  getState() {
    const players = {};
    for (const p of this.players.all()) {
      const g = p.gameData;
      players[p.id] = {
        connected: p.connected, color: p.color, name: p.name || ('Player ' + p.id),
        character: p.character || (g ? g.character : null) || null,
        alive: g ? !!g.alive : false,
        x: g ? g.x || 0 : 0,
        y: g ? g.y || 0 : 0,
        vx: g ? g.vx || 0 : 0,
        vy: g ? g.vy || 0 : 0,
        facing: g ? g.facing || 0 : 0,
        dashing: g ? !!g.dashing : false,
        shielding: g ? !!g.shielding : false,
        teetering: g ? !!g.teetering : false,
        anchor: g ? (g.anchor > 0) : false,
        superDash: g ? !!g.superDash : false,
        cd: g ? g.cd || 0 : 0,
        score: g ? g.score || 0 : 0,
        combo: g ? g.combo || 0 : 0,
      };
    }
    return {
      phase: this.phase, platR: this.platR, winner: this.winner,
      kingZoneR: KING_ZONE_R,
      players: players,
      powerups: this.powerups,
      cracks: this.cracks,
      bumperActive: this.bumperActive, bumperAngle: this.bumperAngle,
      iceZone: this.iceZone,
      suddenDeath: this.tick >= SUDDEN_DEATH_TICK,
    };
  }
}

module.exports = HillGame;
