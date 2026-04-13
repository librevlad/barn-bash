const WIN_SCORE = 10;
const ROUND_MS = 3000;
const PAUSE_MS = 1500;

class Game {
  constructor(players, broadcast) {
    this.players = players;
    this.broadcast = broadcast;
    this.phase = 'lobby';
    this.round = 0;
    this.targetId = null;
    this.winner = null;
    this._rt = null;
    this._pt = null;
  }

  start() {
    if (this.phase !== 'lobby') return;
    if (this.players.connectedCount() < 2) return;
    this.round = 0;
    this.winner = null;
    this.players.resetScores();
    this.nextRound();
  }

  nextRound() {
    if (this.players.connectedCount() < 1) { this.restart(); return; }

    this.round++;
    this.phase = 'round';
    this.targetId = this.pickTarget();
    this.players.resetReacted();

    const t = this.players.get(this.targetId);
    this.broadcast({
      type: 'round_start',
      targetPlayerId: this.targetId,
      targetColor: t.color,
      round: this.round,
      duration: ROUND_MS
    });
    this.broadcastState();

    this._rt = setTimeout(() => this.endRound(), ROUND_MS);
  }

  pickTarget() {
    const pool = this.players.connected();
    const filtered = pool.length > 1
      ? pool.filter(p => p.id !== this.targetId)
      : pool;
    return filtered[Math.floor(Math.random() * filtered.length)].id;
  }

  getGameId() { return 'colorSmash'; }

  handleInput(playerId, action) {
    if (action === 'tap') this.handleTap(playerId);
  }

  handleTap(playerId) {
    if (this.phase !== 'round') return;
    const p = this.players.get(playerId);
    if (!p || !p.connected || p.reacted) return;

    p.reacted = true;
    p.correct = (playerId === this.targetId);
    p.score += p.correct ? 1 : -1;

    this.broadcast({ type: 'tap_result', playerId, correct: p.correct, score: p.score });
    this.broadcastState();
  }

  endRound() {
    const w = this.players.connected().find(p => p.score >= WIN_SCORE);
    if (w) {
      this.phase = 'result';
      this.winner = w.id;
      this.broadcastState();
      this.broadcast({ type: 'game_over', winnerId: w.id });
      return;
    }

    this.phase = 'intermission';
    this.broadcast({ type: 'round_end', round: this.round });
    this.broadcastState();

    this._pt = setTimeout(() => this.nextRound(), PAUSE_MS);
  }

  restart() {
    clearTimeout(this._rt);
    clearTimeout(this._pt);
    this.phase = 'lobby';
    this.round = 0;
    this.targetId = null;
    this.winner = null;
    this.players.resetScores();
    this.broadcastState();
  }

  broadcastState() {
    this.broadcast({ type: 'state', gameId: 'colorSmash', gameState: this.getState() });
  }

  getState() {
    return {
      phase: this.phase,
      round: this.round,
      targetId: this.targetId,
      winner: this.winner,
      players: this.players.toJSON()
    };
  }
}

module.exports = Game;
