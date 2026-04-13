const COLORS = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#e67e22','#1abc9c','#e84393'];
const VALID_CHARACTERS = ['cat', 'frog', 'wolf'];

class Players {
  constructor() {
    this.map = {};
    this.nextId = 1;
  }

  add(ws, name, character) {
    const id = this.nextId++;
    const safeName = (name || '').slice(0, 16).replace(/[<>&"]/g, '') || ('Player ' + id);
    const safeChar = VALID_CHARACTERS.includes(character) ? character : null;
    this.map[id] = {
      id, ws, connected: true,
      name: safeName,
      color: COLORS[(id - 1) % COLORS.length],
      character: safeChar,
      score: 0, reacted: false, correct: null,
      gameData: {}
    };
    return id;
  }

  setName(id, name) {
    if (this.map[id]) {
      this.map[id].name = (name || '').slice(0, 16).replace(/[<>&"]/g, '') || this.map[id].name;
    }
  }

  selectCharacter(id, char) {
    if (this.map[id] && VALID_CHARACTERS.includes(char)) {
      this.map[id].character = char;
      return true;
    }
    return false;
  }

  remove(id) {
    if (this.map[id]) {
      this.map[id].connected = false;
      this.map[id].ws = null;
    }
  }

  get(id) { return this.map[id]; }
  all() { return Object.values(this.map); }
  connected() { return this.all().filter(p => p.connected); }
  connectedCount() { return this.connected().length; }

  resetScores() {
    for (const p of this.all()) {
      p.score = 0;
      p.reacted = false;
      p.correct = null;
    }
  }

  resetReacted() {
    for (const p of this.all()) {
      p.reacted = false;
      p.correct = null;
    }
  }

  resetGameData() {
    for (const p of this.all()) p.gameData = {};
  }

  toJSON() {
    const out = {};
    for (const p of this.all()) {
      out[p.id] = {
        connected: p.connected,
        color: p.color,
        score: p.score,
        reacted: p.reacted,
        correct: p.correct
      };
    }
    return out;
  }
}

module.exports = Players;
