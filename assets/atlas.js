// ============================================================
// Sprite Atlas — spritesheet1.png (1024x1536)
// Well-organized with labels, easier to map
// ============================================================

const SPRITE_ATLAS = {
  sheet: '/assets/spritesheet1.png',
  sprites: {
    // Row 1: Road tiles (y ~0-120, each ~200w x 120h)
    'road-straight':  { x: 0,   y: 0,   w: 130, h: 115 },
    'road-horiz':     { x: 135, y: 0,   w: 130, h: 115 },
    'road-vertical':  { x: 265, y: 0,   w: 130, h: 115 },
    'road-turn':      { x: 520, y: 0,   w: 200, h: 115 },
    'road-surface':   { x: 735, y: 0,   w: 270, h: 115 },

    // Row 2: Trees (y ~135-290)
    'track-tile':     { x: 0,   y: 130, w: 130, h: 155 },
    'tree-back':      { x: 135, y: 130, w: 145, h: 155 },
    'tree-park':      { x: 285, y: 130, w: 195, h: 155 },
    'tree-pine-1':    { x: 490, y: 130, w: 100, h: 155 },
    'tree-pine-2':    { x: 590, y: 130, w: 100, h: 155 },
    'tree-bush-1':    { x: 700, y: 130, w: 100, h: 135 },

    // Row 3: More trees + rocks (y ~295-430)
    'tree-green-1':   { x: 0,   y: 295, w: 130, h: 120 },
    'tree-green-2':   { x: 135, y: 295, w: 145, h: 120 },
    'tree-green-3':   { x: 290, y: 295, w: 135, h: 120 },
    'rock-1':         { x: 690, y: 295, w: 150, h: 100 },
    'rock-2':         { x: 845, y: 295, w: 170, h: 100 },

    // Row 3.5: Grass tuft + small items
    'grass-tuft':     { x: 0,   y: 420, w: 200, h: 60 },

    // Row 4: Player cars (y ~490-570)
    'car-red':        { x: 10,  y: 505, w: 65,  h: 55 },
    'car-blue':       { x: 80,  y: 505, w: 65,  h: 55 },
    'car-green':      { x: 150, y: 505, w: 65,  h: 55 },
    'car-yellow':     { x: 220, y: 505, w: 65,  h: 55 },
    'car-pink':       { x: 290, y: 505, w: 65,  h: 55 },
    'car-purple':     { x: 360, y: 505, w: 65,  h: 55 },

    // Items (right of cars, y ~490-560)
    'item-crystal':   { x: 450, y: 488, w: 75,  h: 80 },
    'item-rocket':    { x: 600, y: 495, w: 110, h: 55 },
    'item-coin':      { x: 720, y: 500, w: 50,  h: 50 },

    // Effects row (y ~570-620)
    'fire-trail':     { x: 455, y: 560, w: 200, h: 35 },
    'dust-trail':     { x: 455, y: 600, w: 200, h: 35 },

    // Track decorations (y ~640-700)
    'checkered':      { x: 0,   y: 660, w: 500, h: 40 },
    'yellow-line':    { x: 0,   y: 710, w: 500, h: 20 },

    // Effects row 2 (y ~735-785)
    'dirt-1':         { x: 510, y: 640, w: 500, h: 35 },
    'dirt-2':         { x: 510, y: 680, w: 500, h: 35 },

    // Red/white kerb
    'kerb':           { x: 0,   y: 750, w: 500, h: 40 },
    'gravel-strip':   { x: 510, y: 730, w: 500, h: 40 },

    // Bottom row: more cars + effects
    'car-red-side':   { x: 10,  y: 850, w: 65,  h: 55 },
    'car-blue-side':  { x: 80,  y: 850, w: 65,  h: 55 },
    'car-green-side': { x: 150, y: 850, w: 65,  h: 55 },
    'car-yellow-side':{ x: 220, y: 850, w: 65,  h: 55 },

    // Sparkle effects
    'spark-1':        { x: 380, y: 835, w: 55,  h: 55 },
    'spark-2':        { x: 440, y: 835, w: 55,  h: 55 },
    'spark-3':        { x: 500, y: 835, w: 55,  h: 55 },

    // Explosion/smoke
    'smoke-puff':     { x: 565, y: 840, w: 50,  h: 45 },
    'explosion':      { x: 625, y: 835, w: 60,  h: 55 },

    // Gravel texture tile
    'gravel-tile':    { x: 690, y: 880, w: 300, h: 240 },

    // Red start line (bottom)
    'start-line':     { x: 0,   y: 810, w: 500, h: 25 },
  }
};

const CAR_SPRITES = {
  '#e74c3c': 'car-red',
  '#3498db': 'car-blue',
  '#2ecc71': 'car-green',
  '#f1c40f': 'car-yellow',
  '#9b59b6': 'car-purple',
  '#e67e22': 'car-yellow',
  '#1abc9c': 'car-blue',
  '#e84393': 'car-pink',
};

// Trees/rocks: use procedural (sprite coords need manual pixel-picking)
// Cars: sprites work (clear row on sheet)
const TREE_SPRITES = []; // empty = all trees use procedural fallback
const ROCK_SPRITES = []; // empty = all rocks use procedural fallback
