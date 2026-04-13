// ============================================================
// Sprite Atlas Definitions — coordinates for spritesheet2.png
// ============================================================
// These are approximate pixel coordinates from the Gemini-generated sheet.
// Adjust if sprites don't align perfectly.

const SPRITE_ATLAS = {
  sheet: '/assets/spritesheet2.png',
  sprites: {
    // Road tiles (top section)
    'road-straight':     { x: 0,   y: 0,   w: 100, h: 60 },
    'road-curve-1':      { x: 100, y: 0,   w: 100, h: 80 },
    'road-curve-2':      { x: 200, y: 0,   w: 120, h: 80 },
    'road-s-curve':      { x: 330, y: 0,   w: 160, h: 120 },
    'road-checkered':    { x: 200, y: 85,  w: 80,  h: 50 },

    // Trees (right side, top rows)
    'tree-oak-1':        { x: 540, y: 0,   w: 70,  h: 70 },
    'tree-oak-2':        { x: 610, y: 0,   w: 70,  h: 70 },
    'tree-oak-3':        { x: 680, y: 0,   w: 70,  h: 70 },
    'tree-bush-1':       { x: 540, y: 75,  w: 55,  h: 50 },
    'tree-bush-2':       { x: 600, y: 75,  w: 55,  h: 50 },
    'tree-pine-1':       { x: 0,   y: 120, w: 70,  h: 100 },
    'tree-pine-2':       { x: 75,  y: 120, w: 70,  h: 100 },

    // Trees (mid-left area)
    'tree-round-1':      { x: 0,   y: 230, w: 60,  h: 55 },
    'tree-round-2':      { x: 65,  y: 230, w: 60,  h: 55 },
    'tree-round-3':      { x: 130, y: 230, w: 60,  h: 55 },

    // Rocks
    'rock-1':            { x: 180, y: 230, w: 50,  h: 40 },
    'rock-2':            { x: 240, y: 230, w: 55,  h: 45 },
    'rock-3':            { x: 490, y: 150, w: 70,  h: 60 },
    'rock-large':        { x: 560, y: 130, w: 80,  h: 70 },

    // Items
    'item-crystal':      { x: 310, y: 130, w: 45,  h: 55 },
    'item-crystal-glow': { x: 310, y: 200, w: 45,  h: 55 },
    'item-fire':         { x: 370, y: 140, w: 35,  h: 40 },
    'item-debris':       { x: 410, y: 150, w: 40,  h: 25 },
    'item-rocket':       { x: 580, y: 200, w: 50,  h: 100 },

    // Tire stacks
    'tires-1':           { x: 640, y: 130, w: 55,  h: 50 },
    'tires-2':           { x: 700, y: 200, w: 55,  h: 50 },

    // Cars (row ~350-420y)
    'car-red-1':         { x: 0,   y: 330, w: 65,  h: 50 },
    'car-red-2':         { x: 70,  y: 330, w: 65,  h: 50 },
    'car-blue-1':        { x: 140, y: 330, w: 65,  h: 50 },
    'car-blue-2':        { x: 210, y: 330, w: 65,  h: 50 },
    'car-green-1':       { x: 0,   y: 395, w: 65,  h: 50 },
    'car-green-2':       { x: 70,  y: 395, w: 65,  h: 50 },
    'car-purple':        { x: 330, y: 570, w: 70,  h: 55 },

    // Fire/boost effects
    'fire-trail-1':      { x: 290, y: 340, w: 100, h: 45 },
    'fire-trail-2':      { x: 290, y: 390, w: 120, h: 50 },
    'missile-flying':    { x: 400, y: 335, w: 100, h: 35 },

    // Smoke puffs
    'smoke-1':           { x: 0,   y: 470, w: 50,  h: 45 },
    'smoke-2':           { x: 55,  y: 470, w: 55,  h: 50 },
    'smoke-3':           { x: 115, y: 470, w: 50,  h: 45 },
    'smoke-4':           { x: 170, y: 470, w: 45,  h: 40 },

    // Explosions/sparks (bottom right)
    'explosion-1':       { x: 550, y: 350, w: 50,  h: 50 },
    'explosion-2':       { x: 610, y: 340, w: 45,  h: 45 },
    'spark-1':           { x: 680, y: 340, w: 40,  h: 40 },
    'shield':            { x: 700, y: 300, w: 45,  h: 50 },

    // Gravel texture
    'gravel':            { x: 660, y: 570, w: 120, h: 120 },
  }
};

// Color-to-car mapping for players
const CAR_SPRITES = {
  '#e74c3c': 'car-red-1',    // red player
  '#3498db': 'car-blue-1',   // blue player
  '#2ecc71': 'car-green-1',  // green player
  '#f1c40f': 'car-red-2',    // yellow → use red variant
  '#9b59b6': 'car-purple',   // purple player
  '#e67e22': 'car-red-2',    // orange → red variant
  '#1abc9c': 'car-blue-2',   // teal → blue variant
  '#e84393': 'car-red-1',    // pink → red
};

// Tree sprite pool for random placement
const TREE_SPRITES = ['tree-oak-1', 'tree-oak-2', 'tree-oak-3', 'tree-bush-1', 'tree-bush-2', 'tree-pine-1', 'tree-round-1', 'tree-round-2'];
const ROCK_SPRITES = ['rock-1', 'rock-2', 'rock-3', 'rock-large'];
