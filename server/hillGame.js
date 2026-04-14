// ============================================================
// King of the Hill — Server Game Logic (Full Overhaul)
// ============================================================

const { Physics2D } = require('../engine/Physics2D');

const TICK_MS = 50;
const ORBIT_SPEED = 0.022;   // slower auto-orbit (player controls speed now)
const PUSH_FORCE = 1.0;      // one good hit = real threat (was 0.65)
const FRICTION = 0.87;
const HIT_DIST = 1.4;
const INIT_R = 4;            // smaller arena from start (was 5) — more action
const MIN_R = 1.8;           // can shrink smaller
const SHRINK_INT = 80;       // shrink every 4s (was 6.5s) — more pressure
const SUDDEN_DEATH_TICK = 700; // 35s (was 45s)
const SHRINK_AMT = 0.35;
const DASH_CD = 10;          // 0.5s cooldown (was 0.8s) — more active play
const GRAVITY_PULL = 0.004;  // slightly stronger pull to center

// King zone
const KING_ZONE_R = 1.5;
const KING_SCORE_PER_TICK = 1;

// Teetering
const TEETER_TICKS = 30; // 1.5s to recover from edge
const TEETER_THRESHOLD = 0.5; // platR - this = teeter zone

// Near-miss
const NEAR_MISS_DIST = 0.3;

// Charged dash

// Ground pound
const GPOUND_RADIUS = 2.0;
const GPOUND_FORCE = 0.45;

// Power-ups
const POWERUP_SPAWN_INT = 120; // every 6s (was 10s)
const POWERUP_TYPES = ['anchor', 'superDash', 'gravityBomb'];
const ANCHOR_DURATION = 60; // 3s
const SUPER_DASH_MULT = 2.0;

// Environmental hazards
const CRACK_TICK = 300;
const BUMPER_TICK = 600;
const ICE_TICK = 900;
const BUMPER_FORCE = 0.5;
const ICE_FRICTION = 0.95;

// Character traits
const TRAITS = {
  cat:     { orbitBonus: 0.004, pushBonus: 0,    gpoundBonus: 0 },
  frog:    { orbitBonus: 0,     pushBonus: 0,    gpoundBonus: 0.5 },
  wolf:    { orbitBonus: 0,     pushBonus: 0.13, gpoundBonus: 0 },
  bear:    { orbitBonus: 0,     pushBonus: 0.2,  gpoundBonus: 0.3 },
  bunny:   { orbitBonus: 0.006, pushBonus: 0,    gpoundBonus: 0 },
  pig:     { orbitBonus: 0,     pushBonus: 0.05, gpoundBonus: 0.2 },
  chicken: { orbitBonus: 0.003, pushBonus: 0,    gpoundBonus: 0.8 },
  raccoon: { orbitBonus: 0.003, pushBonus: 0.08, gpoundBonus: 0 },
};

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
    this.nextPowerup = 60; // first powerup at 3s (was 10s)
    // Hazards
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
    this.nextPowerup = 60; // first powerup at 3s (was 10s)
    this.cracks = [];
    this.bumperAngle = 0;
    this.bumperActive = false;
    this.iceZone = null;
    this.dramaticSent = false;

    const conn = this.players.connected();
    const step = (Math.PI * 2) / conn.length;
    conn.forEach((p, i) => {
      const char = p.character || 'cat';
      const trait = TRAITS[char] || TRAITS.cat;
      p.gameData = {
        alive: true, angle: i * step,
        radius: this.platR * 0.6, vr: 0,
        dashing: false, dashT: 0, cd: 0,
        shielding: false,
        // New mechanics
        teetering: false, teeterTimer: 0,
        anchor: 0, superDash: false,
        score: 0, combo: 0,
        character: char,
        orbitSpeed: ORBIT_SPEED + trait.orbitBonus,
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


      // Teetering recovery
      if (g.teetering) {
        g.teeterTimer--;
        if (g.teeterTimer <= 0) { g.teetering = false; }
        // Gentle pull back during teeter
        g.vr -= 0.01;
      }

      // Orbit
      g.angle = (g.angle + g.orbitSpeed) % (Math.PI * 2);

      // Gravity pull
      if (g.radius > 1) g.vr -= GRAVITY_PULL;

      // Dash animation
      if (g.dashing) { g.dashT--; if (g.dashT <= 0) g.dashing = false; }

      // Physics
      const friction = this.iceZone && this._inIceZone(g) ? ICE_FRICTION : FRICTION;
      g.radius += g.vr;
      g.vr *= friction;
      if (Math.abs(g.vr) < 0.003) g.vr = 0;
      if (g.radius < 0.4) { g.radius = 0.4; g.vr = Math.abs(g.vr) * 0.2; }

      // Bumper collision
      if (this.bumperActive) {
        const bx = Math.cos(this.bumperAngle) * 0.8;
        const bz = Math.sin(this.bumperAngle) * 0.8;
        const px = Math.cos(g.angle) * g.radius;
        const pz = Math.sin(g.angle) * g.radius;
        if (Physics2D.pointInCircle(px, pz, bx, bz, 0.8)) {
          g.vr += BUMPER_FORCE;
          this.broadcast({ type: 'bump', from: 0, to: p.id, gameId: 'hillKing' });
        }
      }

      // Crack zones — push outward
      for (const crack of this.cracks) {
        const cx = Math.cos(crack.angle) * crack.radius;
        const cz = Math.sin(crack.angle) * crack.radius;
        const px = Math.cos(g.angle) * g.radius;
        const pz = Math.sin(g.angle) * g.radius;
        if (Physics2D.pointInCircle(px, pz, cx, cz, 0.8)) {
          g.vr += 0.015;
        }
      }

      // King zone scoring
      if (g.radius < KING_ZONE_R && !g.teetering) {
        g.score += KING_SCORE_PER_TICK;
      }

      // Power-up collection
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const pu = this.powerups[i];
        const px = Math.cos(g.angle) * g.radius;
        const pz = Math.sin(g.angle) * g.radius;
        const pux = Math.cos(pu.angle) * pu.radius;
        const puz = Math.sin(pu.angle) * pu.radius;
        if (Physics2D.pointInCircle(px, pz, pux, puz, 1.2)) { // bigger pickup radius
          this._collectPowerup(p, pu, i);
        }
      }

      // Fell off
      if (g.radius > this.platR + 0.5) {
        if (g.teetering || suddenDeath) {
          // Already teetering OR sudden death — instant elimination
          g.alive = false;
          g.teetering = false;
          this.broadcast({ type: 'eliminated', playerId: p.id, gameId: 'hillKing' });
        } else {
          // First time at edge — start teetering
          g.teetering = true;
          g.teeterTimer = TEETER_TICKS;
          g.radius = this.platR + 0.3;
          g.vr = 0;
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

    // Shrink (faster during sudden death)
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

    // Win
    const still = alive.filter(p => p.gameData.alive);

    // Dramatic finish
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

    // Time limit: if sudden death has run 500+ ticks (25s), highest score wins
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
        // Skip collisions involving teetering players (give them a chance to recover)
        if (a.teetering || b.teetering) continue;
        const ax = Math.cos(a.angle) * a.radius;
        const az = Math.sin(a.angle) * a.radius;
        const bx = Math.cos(b.angle) * b.radius;
        const bz = Math.sin(b.angle) * b.radius;

        // Circle-vs-circle collision using Physics2D
        const hitResult = Physics2D.circleVsCircle(
          { x: ax, y: az, radius: halfHit },
          { x: bx, y: bz, radius: halfHit }
        );

        if (!hitResult) {
          // No collision — check near-miss
          const dx = ax - bx, dz = az - bz;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < HIT_DIST + NEAR_MISS_DIST && (a.dashing || b.dashing)) {
            const dodger = a.dashing ? alive[j] : alive[i];
            dodger.gameData.combo++;
            dodger.gameData.score += 5 * dodger.gameData.combo;
            this.broadcast({ type: 'near_miss', playerId: dodger.id, combo: dodger.gameData.combo, gameId: 'hillKing' });
          }
          continue;
        }

        const pushForceA = PUSH_FORCE + a.pushBonus;
        const pushForceB = PUSH_FORCE + b.pushBonus;

        if (a.dashing && !b.dashing) {
          const force = a.superDash ? pushForceA * SUPER_DASH_MULT : pushForceA;
          a.superDash = false;
          if (b.shielding) {
            a.vr += force * 0.8;
            a.dashing = false;
            this.broadcast({ type: 'shieldBlock', playerId: alive[j].id, gameId: 'hillKing' });
          } else if (b.anchor > 0) {
            a.vr += force * 0.3;
            a.dashing = false;
            this.broadcast({ type: 'anchor_block', playerId: alive[j].id, gameId: 'hillKing' });
          } else {
            b.vr += force;
            b.combo = 0;
            a.dashing = false;
            this.broadcast({ type: 'bump', from: alive[i].id, to: alive[j].id, gameId: 'hillKing' });
          }
        } else if (b.dashing && !a.dashing) {
          const force = b.superDash ? pushForceB * SUPER_DASH_MULT : pushForceB;
          b.superDash = false;
          if (a.shielding) {
            b.vr += force * 0.8;
            b.dashing = false;
            this.broadcast({ type: 'shieldBlock', playerId: alive[i].id, gameId: 'hillKing' });
          } else if (a.anchor > 0) {
            b.vr += force * 0.3;
            b.dashing = false;
            this.broadcast({ type: 'anchor_block', playerId: alive[i].id, gameId: 'hillKing' });
          } else {
            a.vr += force;
            a.combo = 0;
            b.dashing = false;
            this.broadcast({ type: 'bump', from: alive[j].id, to: alive[i].id, gameId: 'hillKing' });
          }
        } else if (a.dashing && b.dashing) {
          a.vr += PUSH_FORCE * 0.5;
          b.vr += PUSH_FORCE * 0.5;
          a.dashing = false; b.dashing = false;
          this.broadcast({ type: 'bump', from: alive[i].id, to: alive[j].id, gameId: 'hillKing' });
        } else {
          a.vr += 0.08; b.vr += 0.08;
        }
      }
    }
  }

  _updateHazards() {
    // Cracks
    if (this.tick === CRACK_TICK) {
      for (let i = 0; i < 2; i++) {
        this.cracks.push({
          angle: Math.random() * Math.PI * 2,
          radius: 1.5 + Math.random() * (this.platR - 2),
        });
      }
      this.broadcast({ type: 'hazard_cracks', cracks: this.cracks, gameId: 'hillKing' });
    }

    // Bumper
    if (this.tick === BUMPER_TICK) {
      this.bumperActive = true;
      this.broadcast({ type: 'hazard_bumper', gameId: 'hillKing' });
    }
    if (this.bumperActive) {
      this.bumperAngle = (this.bumperAngle + 0.02) % (Math.PI * 2);
    }

    // Ice zone
    if (this.tick === ICE_TICK) {
      this.iceZone = {
        angle: Math.random() * Math.PI * 2,
        spread: Math.PI * 0.4, // ~72 degree sector
      };
      this.broadcast({ type: 'hazard_ice', iceZone: this.iceZone, gameId: 'hillKing' });
    }
  }

  _inIceZone(g) {
    if (!this.iceZone) return false;
    let diff = g.angle - this.iceZone.angle;
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
      // Push all others outward
      for (const other of this.players.connected()) {
        if (other.id === player.id || !other.gameData || !other.gameData.alive) continue;
        if (other.gameData.anchor > 0) continue;
        other.gameData.vr += 0.4;
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

    // DIRECT MOVEMENT — swipe controls orbit and radius
    if (action === 'move' && msg && msg.direction) {
      if (msg.direction === 'left') g.angle -= 0.15;       // orbit left
      else if (msg.direction === 'right') g.angle += 0.15;  // orbit right
      else if (msg.direction === 'up') g.radius = Math.max(0.5, g.radius - 0.3); // toward center
      else if (msg.direction === 'down') g.radius = Math.min(this.platR, g.radius + 0.3); // away from center
      return;
    }

    if (action === 'shield') {
      g.shielding = true;
      return;
    }
    if (action === 'shieldEnd') {
      g.shielding = false;
      return;
    }

    // Ground pound — swipe down OR tap during dash
    if (action === 'groundPound' || (action === 'dash' && g.dashing)) {
      // Slam — push all nearby players outward
      const px = Math.cos(g.angle) * g.radius;
      const pz = Math.sin(g.angle) * g.radius;
      const gpoundR = GPOUND_RADIUS + g.gpoundBonus;
      for (const other of this.players.connected()) {
        if (other.id === p.id || !other.gameData || !other.gameData.alive) continue;
        const og = other.gameData;
        const ox = Math.cos(og.angle) * og.radius;
        const oz = Math.sin(og.angle) * og.radius;
        if (Physics2D.pointInCircle(ox, oz, px, pz, gpoundR) && og.anchor <= 0) {
          og.vr += GPOUND_FORCE;
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

      if (action === 'dashDir' && msg && msg.direction) {
        const dirMap = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 };
        const dashAngle = dirMap[msg.direction] || 0;
        g.radius += Math.cos(dashAngle - g.angle) * 1.0;
        g.angle += Math.sin(dashAngle - g.angle) * 0.2;
      } else {
        // Auto-target nearest
        let nearestDist = Infinity, nearestAngle = 0;
        const px = Math.cos(g.angle) * g.radius;
        const pz = Math.sin(g.angle) * g.radius;
        for (const other of this.players.connected()) {
          if (other.id === p.id || !other.gameData || !other.gameData.alive) continue;
          const og = other.gameData;
          const ox = Math.cos(og.angle) * og.radius;
          const oz = Math.sin(og.angle) * og.radius;
          const dx = ox - px, dz = oz - pz;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < nearestDist) { nearestDist = d; nearestAngle = Math.atan2(dz, dx); }
        }
        if (nearestDist < Infinity) {
          g.radius += Math.cos(nearestAngle - g.angle) * 0.8;
          g.angle += Math.sin(nearestAngle - g.angle) * 0.15;
        }
      }

      g.dashing = true;
      g.dashT = 12; // 0.6s dash duration (was 0.3s) — more reliable hits
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
        angle: g ? g.angle || 0 : 0,
        radius: g ? g.radius || 0 : 0,
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
      powerups: this.powerups,
      cracks: this.cracks,
      bumperActive: this.bumperActive, bumperAngle: this.bumperAngle,
      iceZone: this.iceZone,
      players,
    };
  }
}

module.exports = HillGame;
