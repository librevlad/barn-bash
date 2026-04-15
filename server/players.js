const COLOR_IDS = [
  'red', 'blue', 'yellow', 'green', 'pink',
  'lightblue', 'purple', 'magenta', 'orange', 'greenalt',
];
const COLOR_HEX = {
  red:       '#e74c3c',
  blue:      '#3498db',
  yellow:    '#f1c40f',
  green:     '#2ecc71',
  pink:      '#e84393',
  lightblue: '#5dc2e8',
  purple:    '#9b59b6',
  magenta:   '#d044a5',
  orange:    '#e67e22',
  greenalt:  '#2a7c33',
};
const VALID_CHARACTERS = ['cat', 'frog', 'wolf', 'bear', 'bunny', 'pig', 'chicken', 'raccoon'];

class Players {
  constructor() {
    this.map = {};
    this.nextId = 1;
  }

  add(ws, name, character, preferredColor) {
    const id = this.nextId++;
    const safeName = (name || '').slice(0, 16).replace(/[<>&"]/g, '') || ('Player ' + id);
    const safeChar = VALID_CHARACTERS.includes(character) ? character : null;
    const taken = new Set(this.all().filter(p => p.connected).map(p => p.colorId));
    let colorId;
    if (preferredColor && COLOR_IDS.includes(preferredColor) && !taken.has(preferredColor)) {
      colorId = preferredColor;
    } else {
      colorId = COLOR_IDS.find(c => !taken.has(c)) || COLOR_IDS[(id - 1) % COLOR_IDS.length];
    }
    this.map[id] = {
      id, ws, connected: true,
      name: safeName,
      colorId,
      color: COLOR_HEX[colorId],
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
        colorId: p.colorId,
        score: p.score,
        reacted: p.reacted,
        correct: p.correct
      };
    }
    return out;
  }
}

module.exports = Players;
module.exports.COLOR_IDS = COLOR_IDS;
module.exports.COLOR_HEX = COLOR_HEX;
