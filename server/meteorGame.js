// ============================================================
// Meteor Shower — Server Game Logic (Full Overhaul)
// ============================================================

const { Physics2D } = require('../engine/Physics2D');

const TICK_MS = 50;
const ARENA_R = 4.5;
const MIN_ARENA_R = 2.5;
const SAFE_R = 1.6;
const WARN_TICKS = 50;
const PAUSE_TICKS = 20;
const MOVE_SPEED = 0.45;
const DODGE_CD = 2;

// Sprint
const SPRINT_SPEED = 0.9;
const SPRINT_TICKS = 10;
const SPRINT_CD = 20;

// Push
const PUSH_DIST = 0.8;
const PUSH_FORCE = 0.6;

// Singed (stumble equivalent)
const SINGED_THRESHOLD = 0.3; // safe zone radius + this = singed zone

// Near-miss
const NEAR_MISS_TICKS = 15; // last N ticks of warning = near-miss zone

// Decoy zones
const DECOY_START_WAVE = 4;
const MAX_DECOYS = 2;

// Environmental evolution
const FIRE_START_WAVE = 3;
const ICE_WAVE = 6;
const CLUSTER_WAVE = 9;
const FIRE_DURATION_WAVES = 2;

// Power-ups
const POWERUP_CHANCE = 0.2;
const POWERUP_TYPES = ['radar', 'shield', 'sprintBoost'];
const SHIELD_WAVES = 1;
const SPRINT_BOOST_DURATION = 100;
const RADAR_PREVIEW_TICKS = 20;

// Character traits
const TRAITS = {
  cat:  { speedBonus: 0.09, dodgeBonus: 0, pushBonus: 0 },
  frog: { speedBonus: 0,    dodgeBonus: 0.14, pushBonus: 0 },
  wolf: { speedBonus: 0,    dodgeBonus: 0, pushBonus: 0.2 },
};

class MeteorGame {
  constructor(players, broadcast) {
    this.players = players;
    this.broadcast = broadcast;
    this.phase = 'lobby';
    this.tick = 0;
    this.wave = 0;
    this.platR = ARENA_R;
    this.safeZone = { x: 0, z: 0, r: SAFE_R };
    this.decoyZones = [];
    this.fireZones = [];
    this.iceActive = false;
    this.clusterMode = false;
    this.clusterZones = [];
    this.subPhase = 'idle';
    this.subTick = 0;
    this.winner = null;
    this._iv = null;
    this.powerups = [];
    this.nextSafeZone = null; // for radar power-up
    this.dramaticSent = false;
  }

  getGameId() { return 'meteor'; }

  start() {
    if (this.phase !== 'lobby') return;
    if (this.players.connectedCount() < 2) return;

    this.phase = 'running';
    this.tick = 0;
    this.wave = 0;
    this.platR = ARENA_R;
    this.subPhase = 'pause';
    this.subTick = 80;
    this.winner = null;
    this.decoyZones = [];
    this.fireZones = [];
    this.iceActive = false;
    this.clusterMode = false;
    this.clusterZones = [];
    this.powerups = [];
    this.nextSafeZone = null;
    this.dramaticSent = false;

    const conn = this.players.connected();
    const step = (Math.PI * 2) / conn.length;
    conn.forEach((p, i) => {
      const char = p.character || 'cat';
      const trait = TRAITS[char] || TRAITS.cat;
      p.gameData = {
        alive: true,
        x: Math.cos(i * step) * this.platR * 0.5,
        z: Math.sin(i * step) * this.platR * 0.5,
        cd: 0, safe: false,
        // New mechanics
        sprinting: false, sprintTimer: 0, sprintCd: 0,
        singed: false, // survived one impact outside zone
        shield: 0,
        sprintBoost: 0,
        radar: false,
        score: 0, combo: 0, nearMissCombo: 0,
        character: char,
        moveSpeed: MOVE_SPEED + trait.speedBonus,
        dodgeBonus: trait.dodgeBonus,
        pushBonus: trait.pushBonus,
      };
    });

    this.broadcastState();
    this._iv = setInterval(() => this._tick(), TICK_MS);
  }

  _tick() {
    this.tick++;
    this.subTick--;

    // Update player timers
    for (const p of this.players.connected()) {
      const g = p.gameData;
      if (!g || !g.alive) continue;
      if (g.cd > 0) g.cd--;
      if (g.sprintCd > 0) g.sprintCd--;
      if (g.sprintTimer > 0) { g.sprintTimer--; if (g.sprintTimer <= 0) g.sprinting = false; }
      if (g.sprintBoost > 0) g.sprintBoost--;
      // Check fire zones
      for (const fz of this.fireZones) {
        const dx = g.x - fz.x, dz = g.z - fz.z;
        if (Math.sqrt(dx * dx + dz * dz) < fz.r) {
          // Push player away from fire
          const dist = Math.sqrt(dx * dx + dz * dz) || 0.1;
          g.x += (dx / dist) * 0.05;
          g.z += (dz / dist) * 0.05;
        }
      }
      // Ice drift
      if (this.iceActive && g._lastDx) {
        g.x += g._lastDx * 0.3;
        g.z += g._lastDz * 0.3;
        g._lastDx *= 0.9;
        g._lastDz *= 0.9;
      }
    }

    if (this.subTick <= 0) {
      if (this.subPhase === 'pause') {
        this._startWarning();
      } else if (this.subPhase === 'warning') {
        this._doImpact();
      } else if (this.subPhase === 'impact') {
        this._postImpact();
      }
    }

    if (this.tick % 2 === 0) this.broadcastState();
  }

  _startWarning() {
    this.wave++;
    this.subPhase = 'warning';
    this.subTick = Math.max(30, WARN_TICKS - this.wave * 2);

    // Pre-generate next safe zone for radar
    this.nextSafeZone = this._generateSafeZone();

    // Current safe zone
    const sz = this._generateSafeZone();

    // Cluster mode: 3 small zones instead of 1
    this.clusterMode = this.wave >= CLUSTER_WAVE && this.wave % 3 === 0;
    if (this.clusterMode) {
      this.clusterZones = [];
      for (let i = 0; i < 3; i++) {
        this.clusterZones.push(this._generateSafeZone(0.5));
      }
      this.safeZone = this.clusterZones[0]; // primary for auto-dodge
    } else {
      this.safeZone = sz;
      this.clusterZones = [];
    }

    // Decoy zones
    this.decoyZones = [];
    if (this.wave >= DECOY_START_WAVE) {
      const numDecoys = Math.min(MAX_DECOYS, Math.floor((this.wave - DECOY_START_WAVE) / 2) + 1);
      for (let i = 0; i < numDecoys; i++) {
        this.decoyZones.push(this._generateSafeZone(this.safeZone.r * 0.8));
      }
    }

    // Ice wave
    this.iceActive = this.wave === ICE_WAVE || (this.wave > ICE_WAVE && (this.wave - ICE_WAVE) % 5 === 0);

    // Spawn power-ups
    if (Math.random() < POWERUP_CHANCE) {
      const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * this.platR * 0.7;
      this.powerups.push({ x: Math.cos(angle) * dist, z: Math.sin(angle) * dist, type });
    }

    // Reset safe flags + gentle scatter
    for (const p of this.players.connected()) {
      if (p.gameData) {
        p.gameData.safe = false;
        p.gameData.x += (Math.random() - 0.5) * 0.4;
        p.gameData.z += (Math.random() - 0.5) * 0.4;
        // Grace period: reset singed for waves 1-2 (everyone gets a free pass early)
        if (this.wave <= 2) p.gameData.singed = false;
        if (p.gameData.radar) {
          p.gameData.radar = false;
        }
      }
    }

    this.broadcast({
      type: 'meteor_warning', wave: this.wave,
      safeZone: this.safeZone,
      clusterZones: this.clusterMode ? this.clusterZones : null,
      decoyZones: this.decoyZones,
      iceActive: this.iceActive,
      warnTicks: this.subTick,
      gameId: 'meteor',
    });
  }

  _generateSafeZone(overrideR) {
    const safeR = overrideR || Math.max(0.7, SAFE_R - this.wave * 0.06);
    const angle = Math.random() * Math.PI * 2;
    const maxDist = Math.min(this.platR * 0.65, this.platR * 0.3 + this.wave * 0.15);
    const dist = 0.5 + Math.random() * maxDist;
    return { x: Math.cos(angle) * dist, z: Math.sin(angle) * dist, r: safeR };
  }

  _doImpact() {
    this.subPhase = 'impact';
    this.subTick = 10;

    const allSafeZones = this.clusterMode ? this.clusterZones : [this.safeZone];

    for (const p of this.players.connected()) {
      const g = p.gameData;
      if (!g || !g.alive) continue;

      // Check if in ANY real safe zone
      let inSafe = false;
      for (const sz of allSafeZones) {
        const dx = g.x - sz.x, dz = g.z - sz.z;
        if (Math.sqrt(dx * dx + dz * dz) <= sz.r) { inSafe = true; break; }
      }

      if (inSafe) {
        // Near-miss: entered safe zone in last NEAR_MISS_TICKS
        // (we track this by checking how recently they became safe)
        g.combo++;
        g.score += 10 * g.combo;
        continue;
      }

      // Outside safe zone
      if (g.shield > 0) {
        g.shield--;
        this.broadcast({ type: 'shield_break', playerId: p.id, gameId: 'meteor' });
        continue;
      }

      // Singed check — close to safe zone edge
      const closestDist = Math.min(...allSafeZones.map(sz => {
        const dx = g.x - sz.x, dz = g.z - sz.z;
        return Math.sqrt(dx * dx + dz * dz);
      }));

      // Use closest zone's radius, not first zone's
      const closestZoneR = allSafeZones.reduce((best, sz) => {
        const d = Math.sqrt((g.x - sz.x) ** 2 + (g.z - sz.z) ** 2);
        return d < best.d ? { d, r: sz.r } : best;
      }, { d: Infinity, r: allSafeZones[0].r }).r;
      if (!g.singed && closestDist < (closestZoneR + SINGED_THRESHOLD)) {
        g.singed = true;
        g.combo = 0;
        this.broadcast({ type: 'singed', playerId: p.id, gameId: 'meteor' });
      } else {
        g.alive = false;
        this.broadcast({ type: 'eliminated', playerId: p.id, gameId: 'meteor' });
      }
    }

    // Fire zones from impact
    if (this.wave >= FIRE_START_WAVE && Math.random() < 0.4) {
      const fz = {
        x: this.safeZone.x + (Math.random() - 0.5) * 2,
        z: this.safeZone.z + (Math.random() - 0.5) * 2,
        r: 0.6 + Math.random() * 0.4,
        wavesLeft: FIRE_DURATION_WAVES,
      };
      this.fireZones.push(fz);
      this.broadcast({ type: 'fire_zone', fireZone: fz, gameId: 'meteor' });
    }

    // Decay fire zones
    this.fireZones = this.fireZones.filter(fz => {
      fz.wavesLeft--;
      return fz.wavesLeft > 0;
    });

    this.broadcast({ type: 'meteor_impact', wave: this.wave, gameId: 'meteor' });
    this.broadcastState();

    // Immediate end if all eliminated during impact
    const aliveNow = this.players.connected().filter(p => p.gameData && p.gameData.alive);
    if (aliveNow.length <= 1 && this.players.connectedCount() >= 2) {
      this.phase = 'result';
      this.winner = aliveNow.length === 1 ? aliveNow[0].id : null;
      clearInterval(this._iv);
      this.broadcastState();
      this.broadcast({ type: 'game_over', winnerId: this.winner, gameId: 'meteor' });
      return;
    }
  }

  _postImpact() {
    const alive = this.players.connected().filter(p => p.gameData && p.gameData.alive);

    // Dramatic finish
    if (alive.length === 2 && !this.dramaticSent && this.players.connectedCount() > 2) {
      this.dramaticSent = true;
      this.broadcast({ type: 'dramatic_finish', gameId: 'meteor' });
    }

    if (alive.length <= 1 && this.players.connectedCount() >= 2) {
      this.phase = 'result';
      this.winner = alive.length === 1 ? alive[0].id : null;
      clearInterval(this._iv);
      this.broadcastState();
      this.broadcast({ type: 'game_over', winnerId: this.winner, gameId: 'meteor' });
      return;
    }

    // Shrink arena
    if (this.wave % 3 === 0 && this.platR > MIN_ARENA_R) {
      this.platR = Math.max(MIN_ARENA_R, this.platR - 0.3);
      this.broadcast({ type: 'platform_shrink', radius: this.platR, gameId: 'meteor' });
    }

    this.subPhase = 'pause';
    this.subTick = PAUSE_TICKS;
  }

  handleInput(playerId, action, msg) {
    if (this.phase !== 'running') return;
    const p = this.players.get(playerId);
    if (!p || !p.gameData || !p.gameData.alive) return;
    const g = p.gameData;

    // Sprint — rapid tap
    if (action === 'sprint') {
      if (g.sprintCd > 0) return;
      g.sprinting = true;
      g.sprintTimer = SPRINT_TICKS;
      g.sprintCd = SPRINT_CD;
      return;
    }

    if (g.cd > 0) return;

    const speed = g.sprinting
      ? SPRINT_SPEED + (g.moveSpeed - MOVE_SPEED)
      : (g.sprintBoost > 0 ? g.moveSpeed * 1.5 : g.moveSpeed);

    if (action === 'move' && msg && msg.direction) {
      const dirMap = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      const dir = dirMap[msg.direction];
      if (dir) {
        const dx = dir[0] * speed * 1.2;
        const dz = dir[1] * speed * 1.2;
        g.x += dx;
        g.z += dz;
        if (this.iceActive) { g._lastDx = dx; g._lastDz = dz; }
      }
    } else if (action === 'dodge') {
      const dodgeSpeed = speed + g.dodgeBonus;
      const allZones = this.clusterMode ? this.clusterZones : [this.safeZone];
      // Find closest safe zone
      let closest = allZones[0];
      let closestDist = Infinity;
      for (const sz of allZones) {
        const d = Math.sqrt((sz.x - g.x) ** 2 + (sz.z - g.z) ** 2);
        if (d < closestDist) { closestDist = d; closest = sz; }
      }
      const dx = closest.x - g.x;
      const dz = closest.z - g.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.1) {
        g.x += (dx / dist) * dodgeSpeed;
        g.z += (dz / dist) * dodgeSpeed;
      }
    } else if (action === 'push') {
      // Push nearby player
      const pushForce = PUSH_FORCE + g.pushBonus;
      for (const other of this.players.connected()) {
        if (other.id === p.id || !other.gameData || !other.gameData.alive) continue;
        const og = other.gameData;
        const dx = og.x - g.x, dz = og.z - g.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < PUSH_DIST) {
          og.x += (dx / d) * pushForce;
          og.z += (dz / d) * pushForce;
          this.broadcast({ type: 'push', from: p.id, to: other.id, gameId: 'meteor' });
        }
      }
    }

    // Power-up collection
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      const dx = g.x - pu.x, dz = g.z - pu.z;
      if (Math.sqrt(dx * dx + dz * dz) < 0.5) {
        if (pu.type === 'shield') g.shield = SHIELD_WAVES;
        else if (pu.type === 'sprintBoost') g.sprintBoost = SPRINT_BOOST_DURATION;
        else if (pu.type === 'radar') g.radar = true;
        this.broadcast({ type: 'powerup_collected', playerId: p.id, powerup: pu.type, gameId: 'meteor' });
        this.powerups.splice(i, 1);
      }
    }

    // Update safe status
    const allSafeZones = this.clusterMode ? this.clusterZones : [this.safeZone];
    g.safe = allSafeZones.some(sz => {
      const dx = g.x - sz.x, dz = g.z - sz.z;
      return Math.sqrt(dx * dx + dz * dz) <= sz.r;
    });

    // Clamp to arena
    const d = Math.sqrt(g.x * g.x + g.z * g.z);
    if (d > this.platR * 0.9) {
      g.x *= (this.platR * 0.9) / d;
      g.z *= (this.platR * 0.9) / d;
    }

    g.cd = DODGE_CD;
  }

  restart() {
    clearInterval(this._iv);
    this.phase = 'lobby';
    this.platR = ARENA_R;
    this.winner = null;
    this.decoyZones = [];
    this.fireZones = [];
    this.iceActive = false;
    this.clusterMode = false;
    this.powerups = [];
    this.dramaticSent = false;
    this.players.resetGameData();
    this.broadcastState();
  }

  broadcastState() {
    this.broadcast({ type: 'state', gameId: 'meteor', gameState: this.getState() });
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
        z: g ? g.z || 0 : 0,
        safe: g ? !!g.safe : false,
        cd: g ? g.cd || 0 : 0,
        sprinting: g ? !!g.sprinting : false,
        singed: g ? !!g.singed : false,
        shield: g ? (g.shield > 0) : false,
        sprintBoost: g ? (g.sprintBoost > 0) : false,
        score: g ? g.score || 0 : 0,
        combo: g ? g.combo || 0 : 0,
      };
    }
    return {
      phase: this.phase, wave: this.wave, platR: this.platR,
      subPhase: this.subPhase, subTick: this.subTick,
      safeZone: this.safeZone,
      clusterZones: this.clusterMode ? this.clusterZones : null,
      decoyZones: this.decoyZones,
      fireZones: this.fireZones,
      iceActive: this.iceActive,
      powerups: this.powerups,
      winner: this.winner, players,
    };
  }
}

module.exports = MeteorGame;
