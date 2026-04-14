// ============================================================
// FRANTICS GRAND PRIX — Server Game Logic (Engine-powered)
// ============================================================

const { Physics2D } = require('../engine/Physics2D');
const TICK_MS = 50;
const TOTAL_LAPS = 3;
const TRACK_WIDTH = 2.5;
const FRICTION = 0.98;
const OFF_TRACK_FRICTION = 0.88; // much harsher off-track
const HIT_DIST = 0.6;
const STUN_TICKS = 15;
const BOOST_TICKS = 20;
const BOOST_SPEED = 0.06;
const MINI_BOOST_CD = 30;
const MINI_BOOST_SPEED = 0.03;
const MINI_BOOST_TICKS = 8;
const DRIFT_BOOST_TICKS = 15;
const DRIFT_BOOST_SPEED = 0.04;
const DRIFT_MIN_TICKS = 10;
const ITEM_RESPAWN_TICKS = 200;
const MISSILE_SPEED = 0.2;
const RACE_TIMEOUT = 1200; // 60s

// Track: waypoints forming a circuit (x, z)
// Oval with chicanes — coordinates in game units (-10 to 10 range)
const TRACK = [
  { x: 0, z: -4 },     // start/finish straight
  { x: 2, z: -4.2 },
  { x: 4, z: -3.8 },
  { x: 5.5, z: -3 },   // turn 1
  { x: 6.2, z: -1.5 },
  { x: 6, z: 0 },
  { x: 5.5, z: 1.5 },  // chicane entry
  { x: 4.5, z: 2.5 },
  { x: 5, z: 3.5 },    // chicane exit
  { x: 5.5, z: 4.5 },
  { x: 5, z: 5.5 },    // turn 2
  { x: 3.5, z: 6 },
  { x: 2, z: 5.8 },
  { x: 0, z: 5.5 },    // back straight
  { x: -2, z: 5.8 },
  { x: -3.5, z: 6 },
  { x: -5, z: 5.5 },   // turn 3 (hairpin)
  { x: -6, z: 4 },
  { x: -6.2, z: 2 },
  { x: -5.8, z: 0 },
  { x: -6, z: -1.5 },
  { x: -5.5, z: -3 },  // turn 4
  { x: -4, z: -3.8 },
  { x: -2, z: -4.2 },
];

// Item spawn positions (track segment index + offset)
const ITEM_SPAWNS = [
  { seg: 1, offset: 0 },   // near start straight
  { seg: 5, offset: 0 },   // right side
  { seg: 9, offset: 0 },   // upper right
  { seg: 13, offset: 0 },  // back straight
  { seg: 17, offset: 0 },  // upper left
  { seg: 21, offset: 0 },  // left side
];

const ITEM_TYPES = ['boost', 'oil', 'missile'];

const TRAITS = {
  cat:  { maxSpeed: 0.12, accel: 0.004, handling: 0.06 },
  frog: { maxSpeed: 0.11, accel: 0.005, handling: 0.05 },
  wolf: { maxSpeed: 0.13, accel: 0.003, handling: 0.045 },
};

class RaceGame {
  constructor(players, broadcast) {
    this.players = players;
    this.broadcast = broadcast;
    this.phase = 'lobby';
    this.tick = 0;
    this.winner = null;
    this._iv = null;
    this.items = [];       // items on track
    this.oilSlicks = [];   // dropped oil
    this.missiles = [];    // active missiles
    this.finishOrder = [];
  }

  getGameId() { return 'race'; }

  start() {
    if (this.phase !== 'lobby') return;
    if (this.players.connectedCount() < 2) return;

    this.phase = 'running';
    this.tick = 0;
    this.winner = null;
    this.items = [];
    this.oilSlicks = [];
    this.missiles = [];
    this.finishOrder = [];

    // Place players on starting grid
    const conn = this.players.connected();
    const startWP = TRACK[0];
    const startAngle = Math.atan2(TRACK[1].z - TRACK[0].z, TRACK[1].x - TRACK[0].x);
    conn.forEach((p, i) => {
      const char = p.character || 'cat';
      const trait = TRAITS[char] || TRAITS.cat;
      const lateral = (i - (conn.length - 1) / 2) * 0.8;
      p.gameData = {
        x: startWP.x + Math.sin(startAngle) * lateral - Math.cos(startAngle) * i * 0.6,
        z: startWP.z - Math.cos(startAngle) * lateral - Math.sin(startAngle) * i * 0.6,
        angle: startAngle,
        speed: 0,
        lap: 1,
        waypoint: 1,
        finished: false,
        finishTime: 0,
        drifting: false,
        driftTicks: 0,
        boostTimer: 0,
        boostCooldown: 0,
        stunTimer: 0,
        item: null,
        itemTimer: 0,
        score: 0,
        character: char,
        maxSpeed: trait.maxSpeed,
        accel: trait.accel,
        handling: trait.handling,
        steerInput: 0, // -1 left, 0 straight, 1 right
      };
    });

    // Spawn initial items
    this._spawnItems();

    this.broadcastState();
    this._iv = setInterval(() => this._tick(), TICK_MS);
  }

  _tick() {
    this.tick++;

    this._updatePlayers();
    this._updateMissiles();
    this._checkItemPickups();
    this._checkOilCollisions();
    this._checkPlayerCollisions();
    this._checkWaypoints();
    this._respawnItems();

    // Timeout
    if (this.tick >= RACE_TIMEOUT) {
      this._forceEnd();
      return;
    }

    // Check if all finished
    const conn = this.players.connected();
    const allFinished = conn.every(p => p.gameData && p.gameData.finished);
    if (allFinished && this.finishOrder.length > 0) {
      this._endRace();
      return;
    }

    if (this.tick % 2 === 0) this.broadcastState();
  }

  _updatePlayers() {
    for (const p of this.players.connected()) {
      const g = p.gameData;
      if (!g || g.finished) continue;

      // Stun
      if (g.stunTimer > 0) { g.stunTimer--; g.speed *= 0.9; continue; }

      // Auto-use held item after 5 seconds
      if (g.item) {
        g.itemTimer++;
        if (g.itemTimer > 100) { this._useItem(p); }
      }

      // Boost timer
      if (g.boostTimer > 0) g.boostTimer--;
      if (g.boostCooldown > 0) g.boostCooldown--;

      // Auto-steer ONLY when off-track (recovery assist, not autopilot)
      const onTrackNow = this._isOnTrack(g.x, g.z);
      if (!onTrackNow) {
        const nextWP = TRACK[g.waypoint % TRACK.length];
        const toWPx = nextWP.x - g.x, toWPz = nextWP.z - g.z;
        const toWPdist = Math.sqrt(toWPx * toWPx + toWPz * toWPz);
        if (toWPdist > 0.5) {
          const targetAngle = Math.atan2(toWPz, toWPx);
          let angleDiff = targetAngle - g.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          g.angle += angleDiff * 0.05; // strong correction only when lost
        }
      }

      // Player steering — decay toward 0 (one swipe = one turn, not infinite)
      const driftMult = g.drifting ? 1.4 : 1.0;
      g.angle += g.steerInput * g.handling * driftMult;
      g.steerInput *= 0.85;
      if (Math.abs(g.steerInput) < 0.05) g.steerInput = 0;

      // Drift tracking
      if (g.drifting) g.driftTicks++;

      // Auto-accelerate
      const maxSpd = g.maxSpeed + (g.boostTimer > 0 ? BOOST_SPEED : 0);
      if (g.speed < maxSpd) g.speed = Math.min(maxSpd, g.speed + g.accel);

      // Friction (much harsher off-track)
      const onTrack = this._isOnTrack(g.x, g.z);
      g.speed *= onTrack ? FRICTION : OFF_TRACK_FRICTION;

      // Move
      g.x += Math.cos(g.angle) * g.speed;
      g.z += Math.sin(g.angle) * g.speed;

      // Off-track hard correction — strong pull back toward track
      if (!onTrack) {
        const nearest = this._nearestTrackPoint(g.x, g.z);
        const dx = nearest.x - g.x, dz = nearest.z - g.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > 0) {
          // Strong pull — 15% of distance per tick (was 0.02 fixed)
          const pullForce = Math.min(0.15, d * 0.15);
          g.x += (dx / d) * pullForce;
          g.z += (dz / d) * pullForce;
        }
        // Hard clamp — never more than 1.5 units past track edge
        if (d > TRACK_WIDTH + 1.5) {
          g.x = nearest.x + (g.x - nearest.x) / d * (TRACK_WIDTH + 1.0);
          g.z = nearest.z + (g.z - nearest.z) / d * (TRACK_WIDTH + 1.0);
          g.speed *= 0.7;
        }
      }

      // Reset steer input each tick (must be re-sent)
      // Actually keep it continuous until player sends neutral
    }
  }

  _updateMissiles() {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life--;
      if (m.life <= 0) { this.missiles.splice(i, 1); continue; }

      // Home toward target
      const target = this.players.get(m.targetId);
      if (target && target.gameData && !target.gameData.finished) {
        const dx = target.gameData.x - m.x;
        const dz = target.gameData.z - m.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < 0.5) {
          // Hit!
          target.gameData.stunTimer = STUN_TICKS;
          target.gameData.speed *= 0.3;
          this.broadcast({ type: 'player_stunned', playerId: m.targetId, reason: 'missile', gameId: 'race' });
          this.missiles.splice(i, 1);
          continue;
        }
        m.x += (dx / d) * MISSILE_SPEED;
        m.z += (dz / d) * MISSILE_SPEED;
      } else {
        this.missiles.splice(i, 1);
      }
    }
  }

  _checkItemPickups() {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (!item.active) continue;
      for (const p of this.players.connected()) {
        const g = p.gameData;
        if (!g || g.finished || g.item || g.stunTimer > 0) continue;
        const dx = g.x - item.x, dz = g.z - item.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        // Fixed radius pickup — generous radius so edge-of-track players can grab
        if (dist < 3.0) {
          g.item = item.type;
          g.itemTimer = 0;
          item.active = false;
          item.respawnAt = this.tick + ITEM_RESPAWN_TICKS;
          this.broadcast({ type: 'item_pickup', playerId: p.id, item: item.type, gameId: 'race' });
          break;
        }
      }
    }
  }

  _checkOilCollisions() {
    for (let i = this.oilSlicks.length - 1; i >= 0; i--) {
      const oil = this.oilSlicks[i];
      oil.life--;
      if (oil.life <= 0) { this.oilSlicks.splice(i, 1); continue; }
      for (const p of this.players.connected()) {
        if (p.id === oil.ownerId) continue;
        const g = p.gameData;
        if (!g || g.finished || g.stunTimer > 0) continue;
        const dx = g.x - oil.x, dz = g.z - oil.z;
        if (Math.sqrt(dx * dx + dz * dz) < 0.5) {
          g.stunTimer = STUN_TICKS;
          g.speed *= 0.2;
          g.angle += (Math.random() - 0.5) * 1.0; // spin out
          this.broadcast({ type: 'player_stunned', playerId: p.id, reason: 'oil', gameId: 'race' });
          this.oilSlicks.splice(i, 1);
          break;
        }
      }
    }
  }

  _checkPlayerCollisions() {
    const conn = this.players.connected().filter(p => p.gameData && !p.gameData.finished);
    for (let i = 0; i < conn.length; i++) {
      for (let j = i + 1; j < conn.length; j++) {
        const a = conn[i].gameData, b = conn[j].gameData;
        if (a.stunTimer > 0 || b.stunTimer > 0) continue;
        const dx = a.x - b.x, dz = a.z - b.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < HIT_DIST && d > 0) {
          // Push apart
          const nx = dx / d, nz = dz / d;
          a.x += nx * 0.1; a.z += nz * 0.1;
          b.x -= nx * 0.1; b.z -= nz * 0.1;
          // Slower player gets stunned briefly
          if (a.speed < b.speed) { a.stunTimer = 5; a.speed *= 0.5; }
          else if (b.speed < a.speed) { b.stunTimer = 5; b.speed *= 0.5; }
          this.broadcast({ type: 'bump', from: conn[i].id, to: conn[j].id, gameId: 'race' });
        }
      }
    }
  }

  _checkWaypoints() {
    for (const p of this.players.connected()) {
      const g = p.gameData;
      if (!g || g.finished) continue;

      // Target waypoint index on the track (wraps around)
      const wpIdx = g.waypoint % TRACK.length;
      const wp = TRACK[wpIdx];
      const dx = g.x - wp.x, dz = g.z - wp.z;
      const wpDist = Math.sqrt(dx * dx + dz * dz);

      // Finish line (waypoint 0) uses tighter radius so lap triggers
      // right at the checkered line, not 3 units before it
      const isFinishWP = (wpIdx === 0 && g.waypoint > 0);
      const checkRadius = isFinishWP ? 2.0 : 3.0;

      if (wpDist < checkRadius) {
        g.waypoint++;

        // Lap complete when we've passed ALL waypoints and crossed finish (wp 0)
        if (isFinishWP) {
          g.lap++;
          if (g.lap > TOTAL_LAPS) {
            g.finished = true;
            g.finishTime = this.tick;
            this.finishOrder.push(p.id);
            const pos = this.finishOrder.length;
            g.score = Math.max(0, this.players.connectedCount() - pos);
            this.broadcast({ type: 'race_finish', playerId: p.id, position: pos, gameId: 'race' });
          } else {
            this.broadcast({ type: 'lap_complete', playerId: p.id, lap: g.lap, gameId: 'race' });
          }
        }
      }
    }
  }

  _respawnItems() {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (!item.active && this.tick >= item.respawnAt) {
        // Reset position to original spawn point (magnetism may have moved it)
        const spawn = ITEM_SPAWNS[i % ITEM_SPAWNS.length];
        const wp = TRACK[spawn.seg];
        item.x = wp.x;
        item.z = wp.z;
        item.active = true;
        item.type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
      }
    }
  }

  _spawnItems() {
    this.items = ITEM_SPAWNS.map(spawn => {
      const wp = TRACK[spawn.seg];
      return {
        x: wp.x, z: wp.z,
        type: ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)],
        active: true,
        respawnAt: 0,
      };
    });
  }

  _isOnTrack(x, z) {
    // Use Physics2D.nearestPointOnPath for accurate track distance
    const trackPath = TRACK.map(wp => ({ x: wp.x, y: wp.z }));
    const nearest = Physics2D.nearestPointOnPath(x, z, trackPath);
    return nearest.dist < TRACK_WIDTH;
  }

  _nearestTrackPoint(x, z) {
    const trackPath = TRACK.map(wp => ({ x: wp.x, y: wp.z }));
    const nearest = Physics2D.nearestPointOnPath(x, z, trackPath);
    return { x: nearest.x, z: nearest.y };
  }

  _forceEnd() {
    // Rank by laps + waypoint progress
    const conn = this.players.connected().filter(p => p.gameData);
    conn.sort((a, b) => {
      const ga = a.gameData, gb = b.gameData;
      if (ga.finished && !gb.finished) return -1;
      if (!ga.finished && gb.finished) return 1;
      if (ga.lap !== gb.lap) return gb.lap - ga.lap;
      return gb.waypoint - ga.waypoint;
    });
    conn.forEach((p, i) => {
      if (!p.gameData.finished) {
        this.finishOrder.push(p.id);
        p.gameData.score = Math.max(0, this.players.connectedCount() - this.finishOrder.length);
      }
    });
    this._endRace();
  }

  _endRace() {
    this.phase = 'result';
    this.winner = this.finishOrder.length > 0 ? this.finishOrder[0] : null;
    clearInterval(this._iv);
    this.broadcastState();
    this.broadcast({ type: 'game_over', winnerId: this.winner, gameId: 'race' });
  }

  handleInput(playerId, action, msg) {
    if (this.phase !== 'running') return;
    const p = this.players.get(playerId);
    if (!p || !p.gameData || p.gameData.finished) return;
    const g = p.gameData;

    if (g.stunTimer > 0) return;

    switch (action) {
      case 'steer':
        if (msg && msg.direction === 'left') g.steerInput = -1;
        else if (msg && msg.direction === 'right') g.steerInput = 1;
        else g.steerInput = 0;
        break;

      case 'steerNeutral':
        g.steerInput = 0;
        break;

      case 'useItem':
        if (g.item) {
          this._useItem(p);
        } else if (g.boostCooldown <= 0) {
          // Mini boost
          g.boostTimer = MINI_BOOST_TICKS;
          g.speed += MINI_BOOST_SPEED;
          g.boostCooldown = MINI_BOOST_CD;
        }
        break;

      case 'dropItem':
        if (g.item === 'oil') {
          this.oilSlicks.push({
            x: g.x - Math.cos(g.angle) * 0.8,
            z: g.z - Math.sin(g.angle) * 0.8,
            ownerId: p.id, life: 400,
          });
          this.broadcast({ type: 'item_used', playerId: p.id, item: 'oil', gameId: 'race' });
          g.item = null;
        } else if (g.item) {
          this._useItem(p);
        }
        break;

      case 'driftStart':
        g.drifting = true;
        g.driftTicks = 0;
        break;

      case 'driftEnd':
        if (g.drifting && g.driftTicks >= DRIFT_MIN_TICKS) {
          g.boostTimer = DRIFT_BOOST_TICKS;
          g.speed += DRIFT_BOOST_SPEED;
          this.broadcast({ type: 'drift_boost', playerId: p.id, gameId: 'race' });
        }
        g.drifting = false;
        g.driftTicks = 0;
        break;
    }
  }

  _useItem(player) {
    const g = player.gameData;
    const item = g.item;
    g.item = null;

    switch (item) {
      case 'boost':
        g.boostTimer = BOOST_TICKS;
        g.speed += BOOST_SPEED;
        this.broadcast({ type: 'item_used', playerId: player.id, item: 'boost', gameId: 'race' });
        break;

      case 'oil':
        this.oilSlicks.push({
          x: g.x - Math.cos(g.angle) * 0.8,
          z: g.z - Math.sin(g.angle) * 0.8,
          ownerId: player.id, life: 400,
        });
        this.broadcast({ type: 'item_used', playerId: player.id, item: 'oil', gameId: 'race' });
        break;

      case 'missile': {
        // Find player ahead
        let targetId = null, bestProgress = -1;
        for (const other of this.players.connected()) {
          if (other.id === player.id || !other.gameData || other.gameData.finished) continue;
          const og = other.gameData;
          const progress = og.waypoint;
          const myProgress = g.waypoint;
          if (progress > myProgress && progress > bestProgress) {
            bestProgress = progress;
            targetId = other.id;
          }
        }
        // If no one ahead, target nearest
        if (!targetId) {
          let minDist = Infinity;
          for (const other of this.players.connected()) {
            if (other.id === player.id || !other.gameData || other.gameData.finished) continue;
            const dx = other.gameData.x - g.x, dz = other.gameData.z - g.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d < minDist) { minDist = d; targetId = other.id; }
          }
        }
        if (targetId) {
          this.missiles.push({ x: g.x, z: g.z, targetId, life: 100 });
          this.broadcast({ type: 'item_used', playerId: player.id, item: 'missile', target: targetId, gameId: 'race' });
        }
        break;
      }
    }
  }

  restart() {
    clearInterval(this._iv);
    this.phase = 'lobby';
    this.winner = null;
    this.items = [];
    this.oilSlicks = [];
    this.missiles = [];
    this.finishOrder = [];
    this.players.resetGameData();
    this.broadcastState();
  }

  broadcastState() {
    this.broadcast({ type: 'state', gameId: 'race', gameState: this.getState() });
  }

  getState() {
    const players = {};
    for (const p of this.players.all()) {
      const g = p.gameData;
      players[p.id] = {
        connected: p.connected, color: p.color, name: p.name || ('Player ' + p.id),
        character: p.character || (g ? g.character : null) || null,
        x: g ? g.x || 0 : 0,
        z: g ? g.z || 0 : 0,
        angle: g ? g.angle || 0 : 0,
        speed: g ? g.speed || 0 : 0,
        lap: g ? g.lap || 1 : 1,
        waypoint: g ? g.waypoint || 0 : 0,
        finished: g ? !!g.finished : false,
        drifting: g ? !!g.drifting : false,
        boosting: g ? (g.boostTimer > 0) : false,
        stunned: g ? (g.stunTimer > 0) : false,
        item: g ? g.item : null,
        score: g ? g.score || 0 : 0,
      };
    }
    return {
      phase: this.phase,
      track: TRACK,
      trackWidth: TRACK_WIDTH,
      totalLaps: TOTAL_LAPS,
      items: this.items.filter(i => i.active),
      oilSlicks: this.oilSlicks.map(o => ({ x: o.x, z: o.z })),
      missiles: this.missiles.map(m => ({ x: m.x, z: m.z, targetId: m.targetId })),
      finishOrder: this.finishOrder,
      winner: this.winner,
      players,
    };
  }
}

module.exports = RaceGame;
