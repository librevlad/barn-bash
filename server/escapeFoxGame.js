// ============================================================
// Escape the Fox — Server Game Logic (Full Overhaul)
// ============================================================

const { Physics2D } = require('../engine/Physics2D');

const TICK_MS = 50;
const RUN_SPEED = 0.28;
const GRAVITY = 0.028;
const HIT_HEIGHT = 0.22;
const SPAWN_AHEAD = 16;
const INITIAL_SPAWN_INT = 55;
const MIN_SPAWN_INT = 18;
const FOX_CATCH_DIST = 1.5;
const COLLISION_HALF = 0.35;
const NEAR_MISS_EXTRA = 0.15;

// Physics
const JUMP_VY_MIN = 0.10;
const JUMP_HOLD_BOOST = 0.008;
const JUMP_HOLD_TICKS = 8;
const MAX_JUMPS = 2;
const SLIDE_DURATION = 12;
const LANE_CD = 3;

// Stumble
const MAX_STUMBLES = 1;
const STUMBLE_TICKS = 30;
const STUMBLE_DIST_PENALTY = 0.5;

// Power-ups
const POWERUP_SPAWN_CHANCE = 0.15;
const POWERUP_TYPES = ['shield', 'speedBoost', 'coin'];
const SHIELD_DURATION = 100;
const SPEED_BOOST_DURATION = 60;
const SPEED_BOOST_OFFSET = 0.005;

// Fox AI milestones
const FOX_GROWL_TICK = 400;
const FOX_SPRINT_TICK = 800;
const FOX_LEAP_TICK = 1200;
const FOX_SPRINT_DURATION = 60;
const FOX_SPRINT_BONUS = 0.05;
const FOX_LEAP_DIST = 2.0;

// Obstacle patterns — easy to expert
const PATTERNS = [
  // Easy (0-1)
  [{ off: 0, type: 'rock' }],
  [{ off: 0, type: 'gap' }],
  // Medium (2-4)
  [{ off: 0, type: 'rock' }, { off: 2.5, type: 'rock' }],
  [{ off: 0, type: 'rock' }, { off: 4, type: 'gap' }],
  [{ off: 0, type: 'high' }],
  // Hard (5-7)
  [{ off: 0, type: 'gap' }, { off: 3, type: 'rock' }],
  [{ off: 0, type: 'rock' }, { off: 3, type: 'high' }],
  [{ off: 0, type: 'high' }, { off: 3, type: 'rock' }],
  // Expert (8-9)
  [{ off: 0, type: 'rock' }, { off: 2, type: 'rock' }, { off: 4, type: 'rock' }],
  [{ off: 0, type: 'high' }, { off: 2.5, type: 'rock' }, { off: 5, type: 'high' }],
];

// Character traits
const TRAITS = {
  cat:  { jumpBonus: 0.03, maxJumps: MAX_JUMPS, slideBonus: 0, label: 'High Jumper' },
  frog: { jumpBonus: 0,    maxJumps: 3,         slideBonus: 0, label: 'Triple Jump' },
  wolf: { jumpBonus: 0,    maxJumps: MAX_JUMPS, slideBonus: 4, label: 'Long Slide' },
};
const VALID_CHARS = Object.keys(TRAITS);

class EscapeFoxGame {
  constructor(players, broadcast) {
    this.players = players;
    this.broadcast = broadcast;
    this.phase = 'lobby';
    this.worldDist = 0;
    this.speed = RUN_SPEED;
    this.obstacles = [];
    this.powerups = [];
    this.tick = 0;
    this.nextSpawn = 80;
    this.foxDist = -8;
    this.foxSprintTimer = 0;
    this.foxMilestones = { growl: false, sprint: false, leap: false };
    this.winner = null;
    this._interval = null;
    this.patternIdx = 0;
    this.dramaticSent = false;
  }

  getGameId() { return 'escapeFox'; }

  start() {
    if (this.phase !== 'lobby') return;
    if (this.players.connectedCount() < 2) return;

    this.phase = 'running';
    this.worldDist = 0;
    this.speed = RUN_SPEED;
    this.obstacles = [];
    this.powerups = [];
    this.tick = 0;
    this.nextSpawn = 80;
    // Fox starts further back with fewer players for longer games
    const pc = this.players.connectedCount();
    this.foxDist = pc <= 2 ? -15 : pc <= 4 ? -12 : -8;
    this.foxSprintTimer = 0;
    this.foxMilestones = { growl: false, sprint: false, leap: false };
    this.winner = null;
    this.patternIdx = 0;
    this.dramaticSent = false;

    for (const p of this.players.connected()) {
      const char = p.character || VALID_CHARS[Math.floor(Math.random() * VALID_CHARS.length)];
      const trait = TRAITS[char] || TRAITS.cat;
      p.gameData = {
        alive: true, y: 0, vy: 0, lane: 0,
        // Jump
        jumpHeld: false, jumpHoldTicks: 0, jumpsUsed: 0,
        maxJumps: trait.maxJumps, jumpBonus: trait.jumpBonus,
        // Slide
        sliding: false, slideTimer: 0,
        slideDuration: SLIDE_DURATION + trait.slideBonus,
        // Lane
        laneCooldown: 0,
        // Survival
        distOffset: 0, stumbles: 0, stumbleTimer: 0,
        shield: 0, speedBoost: 0,
        // Scoring
        coins: 0, score: 0, combo: 0, nearMissCombo: 0,
        // Character
        character: char,
      };
    }

    this.broadcastState();
    this._interval = setInterval(() => this._tick(), TICK_MS);
  }

  // ---- MAIN TICK ----
  _tick() {
    this.tick++;
    this._updateSpeed();
    this._updateFox();
    this._spawnObstacles();
    this._updatePhysics();
    this._collectPowerups();
    this._checkCollisions();
    this._checkNearMiss();
    this._checkWin();
    // Remove passed obstacles and powerups
    this.obstacles = this.obstacles.filter(o => o.z > this.worldDist - 3);
    this.powerups = this.powerups.filter(p => p.z > this.worldDist - 3);
    if (this.tick % 2 === 0) this.broadcastState();
  }

  // ---- SUBSYSTEM: Speed ----
  _updateSpeed() {
    this.worldDist += this.speed;
    if (this.tick % 150 === 0) this.speed += 0.014;
    if (this.tick % 300 === 0 && this.tick > 200) {
      this.speed += 0.025;
      this.broadcast({ type: 'speed_burst', gameId: 'escapeFox' });
    }
  }

  // ---- SUBSYSTEM: Fox AI ----
  _updateFox() {
    let foxMult = Math.min(0.99, 0.92 + this.tick * 0.000018);

    // Fox sprint bonus
    if (this.foxSprintTimer > 0) {
      foxMult = Math.min(1.02, foxMult + FOX_SPRINT_BONUS);
      this.foxSprintTimer--;
    }

    this.foxDist += this.speed * foxMult;

    // Milestones
    if (this.tick === FOX_GROWL_TICK && !this.foxMilestones.growl) {
      this.foxMilestones.growl = true;
      this.broadcast({ type: 'fox_growl', gameId: 'escapeFox' });
    }
    if (this.tick === FOX_SPRINT_TICK && !this.foxMilestones.sprint) {
      this.foxMilestones.sprint = true;
      this.foxSprintTimer = FOX_SPRINT_DURATION;
      this.broadcast({ type: 'fox_sprint', gameId: 'escapeFox' });
    }
    if (this.tick === FOX_LEAP_TICK && !this.foxMilestones.leap) {
      this.foxMilestones.leap = true;
      const alivePlayers = this.players.connected().filter(p => p.gameData && p.gameData.alive);
      if (alivePlayers.length > 0) {
        const maxPlayerDist = Math.max(...alivePlayers.map(p => this.worldDist + p.gameData.distOffset));
        const leapTarget = this.foxDist + FOX_LEAP_DIST;
        this.foxDist = Math.min(leapTarget, maxPlayerDist - FOX_CATCH_DIST - 0.5);
      }
      this.broadcast({ type: 'fox_leap', gameId: 'escapeFox' });
    }

    // Per-player fox catching
    for (const p of this.players.connected()) {
      const gd = p.gameData;
      if (!gd || !gd.alive) continue;
      const playerPos = this.worldDist + gd.distOffset;
      if (this.foxDist > playerPos - FOX_CATCH_DIST) {
        gd.alive = false;
        this.broadcast({ type: 'eliminated', playerId: p.id, gameId: 'escapeFox' });
      }
    }
  }

  // ---- SUBSYSTEM: Obstacle Spawning ----
  _spawnObstacles() {
    if (this.tick < this.nextSpawn) return;

    const maxPattern = Math.min(PATTERNS.length, 2 + Math.floor(this.tick / 250));
    const pattern = PATTERNS[this.patternIdx % maxPattern];
    this.patternIdx++;

    const baseZ = this.worldDist + SPAWN_AHEAD + Math.random() * 3;
    for (const obs of pattern) {
      const blockedLanes = [];
      const numBlocked = Math.random() < 0.4 ? 2 : 1;
      const lanes = [-1, 0, 1];
      for (let b = 0; b < numBlocked; b++) {
        const pick = lanes.splice(Math.floor(Math.random() * lanes.length), 1)[0];
        blockedLanes.push(pick);
      }
      // Moving obstacles in late game
      const moving = this.tick > 1500 && Math.random() < 0.2;
      this.obstacles.push({
        z: baseZ + obs.off, type: obs.type, lanes: blockedLanes,
        moveLane: moving ? { dir: 1, timer: 0 } : null,
      });
    }

    // Power-up spawn
    if (Math.random() < POWERUP_SPAWN_CHANCE) {
      const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
      const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
      this.powerups.push({ z: this.worldDist + SPAWN_AHEAD + 2, lane, type });
    }

    const interval = Math.max(MIN_SPAWN_INT,
      INITIAL_SPAWN_INT - Math.floor(this.tick / 50));
    this.nextSpawn = this.tick + interval + Math.floor(Math.random() * 8);
  }

  // ---- SUBSYSTEM: Physics ----
  _updatePhysics() {
    // Update moving obstacles
    for (const obs of this.obstacles) {
      if (!obs.moveLane) continue;
      obs.moveLane.timer++;
      if (obs.moveLane.timer >= 20) {
        obs.moveLane.timer = 0;
        obs.lanes = obs.lanes.map(l => {
          let newL = l + obs.moveLane.dir;
          if (newL > 1 || newL < -1) { obs.moveLane.dir *= -1; newL = l; }
          return newL;
        });
      }
    }

    for (const p of this.players.connected()) {
      const gd = p.gameData;
      if (!gd || !gd.alive) continue;

      // Timers
      if (gd.laneCooldown > 0) gd.laneCooldown--;
      if (gd.stumbleTimer > 0) gd.stumbleTimer--;
      if (gd.shield > 0) gd.shield--;
      if (gd.speedBoost > 0) {
        gd.speedBoost--;
        gd.distOffset += SPEED_BOOST_OFFSET;
      }

      // Slide timer
      if (gd.sliding) {
        gd.slideTimer--;
        if (gd.slideTimer <= 0) gd.sliding = false;
      }

      // Variable jump: hold boost
      if (gd.jumpHeld && gd.jumpHoldTicks < JUMP_HOLD_TICKS && gd.vy > 0) {
        gd.vy += JUMP_HOLD_BOOST;
        gd.jumpHoldTicks++;
      }

      // Gravity
      if (gd.vy !== 0 || gd.y > 0) {
        gd.vy -= GRAVITY;
        gd.y = Math.max(0, gd.y + gd.vy);
        if (gd.y === 0) {
          gd.vy = 0;
          gd.jumpsUsed = 0;
        }
      }
    }
  }

  // ---- SUBSYSTEM: Power-up Collection ----
  _collectPowerups() {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      const diff = this.worldDist - pu.z;
      if (diff < -0.3 || diff > 0.3) continue;
      for (const p of this.players.connected()) {
        const gd = p.gameData;
        if (!gd || !gd.alive) continue;
        if (gd.lane === pu.lane) {
          if (pu.type === 'shield') gd.shield = SHIELD_DURATION;
          else if (pu.type === 'speedBoost') gd.speedBoost = SPEED_BOOST_DURATION;
          else if (pu.type === 'coin') { gd.coins++; gd.score += 10 * Math.max(1, gd.combo); }
          this.broadcast({ type: 'powerup_collected', playerId: p.id, powerup: pu.type, gameId: 'escapeFox' });
          this.powerups.splice(i, 1);
          break;
        }
      }
    }
  }

  // ---- SUBSYSTEM: Collision (shield > stumble > death) ----
  _checkCollisions() {
    for (const obs of this.obstacles) {
      const diff = this.worldDist - obs.z;
      if (diff < -COLLISION_HALF || diff > COLLISION_HALF) continue;

      for (const p of this.players.connected()) {
        const gd = p.gameData;
        if (!gd || !gd.alive || gd.stumbleTimer > 0) continue;

        const inBlockedLane = !obs.lanes || obs.lanes.includes(gd.lane);
        if (!inBlockedLane) continue;

        let hit = false;
        if (obs.type === 'high') {
          // High obstacles: must slide to pass
          hit = !gd.sliding;
        } else {
          // Rock/gap: must jump to pass
          hit = gd.y < HIT_HEIGHT;
        }

        if (!hit) continue;

        // Priority: shield > stumble > death
        if (gd.shield > 0) {
          gd.shield = 0;
          gd.combo = 0;
          this.broadcast({ type: 'shield_break', playerId: p.id, gameId: 'escapeFox' });
        } else if (gd.stumbles < MAX_STUMBLES) {
          gd.stumbles++;
          gd.stumbleTimer = STUMBLE_TICKS;
          gd.distOffset -= STUMBLE_DIST_PENALTY;
          gd.combo = 0;
          this.broadcast({ type: 'stumble', playerId: p.id, gameId: 'escapeFox' });
        } else {
          gd.alive = false;
          this.broadcast({ type: 'eliminated', playerId: p.id, gameId: 'escapeFox' });
        }
      }
    }
  }

  // ---- SUBSYSTEM: Near-miss Detection ----
  _checkNearMiss() {
    for (const obs of this.obstacles) {
      const diff = this.worldDist - obs.z;
      // Near-miss zone: just outside collision window
      if (diff < COLLISION_HALF || diff > COLLISION_HALF + NEAR_MISS_EXTRA) continue;

      for (const p of this.players.connected()) {
        const gd = p.gameData;
        if (!gd || !gd.alive) continue;
        const inBlockedLane = !obs.lanes || obs.lanes.includes(gd.lane);
        if (!inBlockedLane) continue;

        // Player just passed through the near-miss zone of a dangerous obstacle
        let wasDangerous = false;
        if (obs.type === 'high') wasDangerous = !gd.sliding;
        else wasDangerous = gd.y < HIT_HEIGHT + 0.05;

        if (wasDangerous) {
          gd.nearMissCombo++;
          gd.combo++;
          gd.score += 5 * gd.combo;
          this.broadcast({ type: 'near_miss', playerId: p.id, combo: gd.combo, gameId: 'escapeFox' });
        }
      }
    }
  }

  // ---- SUBSYSTEM: Win Check ----
  _checkWin() {
    const alive = this.players.connected().filter(p => p.gameData && p.gameData.alive);

    // Dramatic finish
    if (alive.length === 2 && !this.dramaticSent && this.players.connectedCount() > 2) {
      this.dramaticSent = true;
      this.broadcast({ type: 'dramatic_finish', gameId: 'escapeFox' });
    }

    if (alive.length <= 1 && this.players.connectedCount() >= 2) {
      this.phase = 'result';
      this.winner = alive.length === 1 ? alive[0].id : null;
      clearInterval(this._interval);
      this.broadcastState();
      this.broadcast({ type: 'game_over', winnerId: this.winner, gameId: 'escapeFox' });
    }
  }

  // ---- INPUT HANDLING ----
  handleInput(playerId, action, msg) {
    if (this.phase !== 'running') return;
    const p = this.players.get(playerId);
    if (!p || !p.gameData || !p.gameData.alive) return;
    const gd = p.gameData;

    // Block input during stumble
    if (gd.stumbleTimer > 0) return;

    switch (action) {
      case 'jump': // legacy single jump
        if (gd.jumpsUsed >= gd.maxJumps) return;
        if (gd.sliding) { gd.sliding = false; gd.slideTimer = 0; }
        gd.jumpsUsed++;
        gd.vy = JUMP_VY_MIN + gd.jumpBonus;
        break;

      case 'jumpStart':
        if (gd.jumpsUsed >= gd.maxJumps) return;
        if (gd.sliding) { gd.sliding = false; gd.slideTimer = 0; }
        gd.jumpsUsed++;
        gd.vy = JUMP_VY_MIN + gd.jumpBonus;
        gd.jumpHeld = true;
        gd.jumpHoldTicks = 0;
        break;

      case 'jumpEnd':
        gd.jumpHeld = false;
        break;

      case 'slide':
        if (gd.y > 0 || gd.sliding) return; // only on ground, not already sliding
        gd.sliding = true;
        gd.slideTimer = gd.slideDuration;
        break;

      case 'lane': {
        if (gd.laneCooldown > 0) return;
        const dir = msg && msg.direction;
        if (dir === 'left' && gd.lane > -1) { gd.lane--; gd.laneCooldown = LANE_CD; }
        if (dir === 'right' && gd.lane < 1) { gd.lane++; gd.laneCooldown = LANE_CD; }
        break;
      }
    }
  }

  restart() {
    clearInterval(this._interval);
    this.phase = 'lobby';
    this.worldDist = 0;
    this.obstacles = [];
    this.powerups = [];
    this.winner = null;
    this.foxMilestones = { growl: false, sprint: false, leap: false };
    this.dramaticSent = false;
    this.players.resetGameData();
    this.broadcastState();
  }

  broadcastState() {
    this.broadcast({ type: 'state', gameId: 'escapeFox', gameState: this.getState() });
  }

  getState() {
    const players = {};
    for (const p of this.players.all()) {
      const gd = p.gameData;
      players[p.id] = {
        connected: p.connected, color: p.color, name: p.name || ('Player ' + p.id),
        character: p.character || (gd ? gd.character : null) || null,
        alive: gd ? !!gd.alive : false,
        y: gd ? (gd.y || 0) : 0,
        lane: gd ? (gd.lane || 0) : 0,
        sliding: gd ? !!gd.sliding : false,
        shield: gd ? (gd.shield > 0) : false,
        speedBoost: gd ? (gd.speedBoost > 0) : false,
        coins: gd ? (gd.coins || 0) : 0,
        score: gd ? (gd.score || 0) : 0,
        combo: gd ? (gd.combo || 0) : 0,
        distOffset: gd ? (gd.distOffset || 0) : 0,
        stumbling: gd ? (gd.stumbleTimer > 0) : false,
      };
    }
    const foxProximity = Math.max(0, Math.min(1,
      1 - (this.worldDist - this.foxDist - FOX_CATCH_DIST) / 15));

    const visibleObs = this.obstacles.filter(o =>
      o.z > this.worldDist - 2 && o.z < this.worldDist + SPAWN_AHEAD + 5
    ).slice(0, 20);

    return {
      phase: this.phase, worldDist: this.worldDist, speed: this.speed,
      foxDist: this.foxDist, foxProximity,
      foxSprinting: this.foxSprintTimer > 0,
      obstacles: visibleObs, powerups: this.powerups, winner: this.winner, players,
    };
  }
}

module.exports = EscapeFoxGame;
