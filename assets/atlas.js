// ============================================================
// Sprite Atlas — corrected coordinates for spritesheet2.png (~800x800)
// ============================================================

const SPRITE_ATLAS = {
  sheet: '/assets/spritesheet2.png',
  sprites: {
    // Oak/bush trees — top right area
    'tree-oak-1':     { x: 610, y: 8,   w: 58, h: 58 },
    'tree-oak-2':     { x: 672, y: 8,   w: 58, h: 58 },
    'tree-oak-3':     { x: 734, y: 8,   w: 58, h: 58 },
    'tree-bush-1':    { x: 610, y: 72,  w: 52, h: 48 },
    'tree-bush-2':    { x: 668, y: 72,  w: 52, h: 48 },

    // Pine trees — left side, row 2
    'tree-pine-1':    { x: 8,   y: 105, w: 65, h: 105 },
    'tree-pine-2':    { x: 78,  y: 120, w: 55, h: 90 },

    // Round bushes/trees — row 3 left
    'tree-round-1':   { x: 8,   y: 235, w: 55, h: 50 },
    'tree-round-2':   { x: 68,  y: 235, w: 55, h: 50 },
    'tree-round-3':   { x: 128, y: 235, w: 55, h: 50 },
    'tree-small-1':   { x: 148, y: 215, w: 45, h: 40 },
    'tree-small-2':   { x: 100, y: 218, w: 42, h: 38 },

    // Rocks — row 3 center
    'rock-1':         { x: 195, y: 245, w: 50, h: 40 },
    'rock-2':         { x: 250, y: 240, w: 55, h: 45 },
    'rock-3':         { x: 310, y: 248, w: 45, h: 38 },
    'rock-large':     { x: 500, y: 145, w: 72, h: 62 },

    // Items
    'item-crystal':   { x: 340, y: 135, w: 42, h: 52 },
    'item-crystal-2': { x: 340, y: 200, w: 42, h: 52 },
    'item-fire':      { x: 395, y: 148, w: 32, h: 38 },

    // Rocket
    'item-rocket':    { x: 610, y: 145, w: 48, h: 110 },

    // Tire stacks
    'tires-1':        { x: 695, y: 145, w: 55, h: 50 },
    'tires-2':        { x: 695, y: 250, w: 55, h: 50 },

    // Cars — row 4
    'car-red-1':      { x: 5,   y: 340, w: 62, h: 48 },
    'car-red-2':      { x: 72,  y: 340, w: 62, h: 48 },
    'car-blue-1':     { x: 145, y: 340, w: 62, h: 48 },
    'car-blue-2':     { x: 215, y: 340, w: 62, h: 48 },

    // Cars — row 5
    'car-green-1':    { x: 5,   y: 405, w: 62, h: 48 },
    'car-green-2':    { x: 72,  y: 405, w: 62, h: 48 },

    // Purple car — bottom left
    'car-purple':     { x: 5,   y: 595, w: 68, h: 52 },

    // Fire/boost trails
    'fire-trail-1':   { x: 300, y: 340, w: 105, h: 45 },
    'fire-trail-2':   { x: 300, y: 400, w: 120, h: 48 },
    'missile-flying': { x: 410, y: 405, w: 95, h: 38 },

    // Smoke puffs — row 6
    'smoke-1':        { x: 5,   y: 485, w: 48, h: 42 },
    'smoke-2':        { x: 58,  y: 485, w: 52, h: 45 },
    'smoke-3':        { x: 115, y: 488, w: 48, h: 40 },
    'smoke-4':        { x: 168, y: 488, w: 45, h: 38 },

    // Explosions
    'explosion-1':    { x: 555, y: 355, w: 48, h: 48 },
    'explosion-2':    { x: 615, y: 600, w: 48, h: 48 },
    'spark-1':        { x: 670, y: 600, w: 42, h: 42 },

    // Shield
    'shield':         { x: 715, y: 340, w: 42, h: 48 },
    'shield-2':       { x: 715, y: 590, w: 42, h: 48 },

    // Gravel texture
    'gravel':         { x: 650, y: 640, w: 130, h: 120 },
  }
};

const CAR_SPRITES = {
  '#e74c3c': 'car-red-1',
  '#3498db': 'car-blue-1',
  '#2ecc71': 'car-green-1',
  '#f1c40f': 'car-red-2',
  '#9b59b6': 'car-purple',
  '#e67e22': 'car-red-2',
  '#1abc9c': 'car-blue-2',
  '#e84393': 'car-red-1',
};

const TREE_SPRITES = ['tree-oak-1', 'tree-oak-2', 'tree-oak-3', 'tree-bush-1', 'tree-bush-2', 'tree-pine-1', 'tree-round-1', 'tree-round-2', 'tree-round-3'];
const ROCK_SPRITES = ['rock-1', 'rock-2', 'rock-3', 'rock-large'];
