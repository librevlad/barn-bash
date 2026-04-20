// src/games/registry.js
// Runtime registry of playable mini-games. Each mini-game file self-registers
// at load time; the Board screen + SceneManager read the registry.
//
// Add a mini-game by creating a new file (eventually a folder) that calls
// BB.games.register({...}) at module bottom — no switch statement anywhere
// needs to know about it.
//
// interface MiniGameDef {
//   id: string                    // stable kebab-case, e.g. 'pig-sprint'
//   name: string                  // friendly label for the Board tile and
//                                 //   round summary: 'Pig Sprint'
//   blurb: string                 // Board-tile description
//   icon: string                  // emoji glyph for the Board tile
//   tint: string                  // Board-tile background colour
//   phoneContract: 'tap'|'steer'|'holes'|null
//   phonePrompt?: string          // big-letter prompt shown on the phone
//   component: React.ComponentType<{ state, onFinish, onQuit }>
// }

(function(BB) {
  const _list = [];
  const _byId = {};
  BB.games = {
    register(def) {
      if (!def || typeof def.id !== 'string' || !def.component) {
        throw new Error('BB.games.register: def must have id + component');
      }
      if (_byId[def.id]) {
        const i = _list.findIndex(g => g.id === def.id);
        if (i >= 0) _list[i] = def;
      } else {
        _list.push(def);
      }
      _byId[def.id] = def;
    },
    get(id)  { return _byId[id] || null; },
    list()   { return _list.slice(); },
    ids()    { return _list.map(g => g.id); },
  };
})(window.BB = window.BB || {});
