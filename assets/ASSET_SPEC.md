# Frantics — Asset Specification

## Visual Style Reference
See `bg.png` — Barnyard Bedlam style:
- Bright, saturated cartoon colors
- Round, chunky, expressive characters
- Hand-drawn feel with clean outlines
- Fairground / game show theme

## Characters (8 animals)

All characters are used as player avatars in a party game shown on TV (1280x720+).
They appear as ~40-60px blobs on screen. Each needs to be recognizable at small sizes.

### Sprites Needed Per Character

**1. Game blob (top-down / isometric view)**
- Size: 128x128px with transparency
- Character as a round blob/ball shape (think Fall Guys beans)
- Facing forward, idle pose
- Bright colored body matching character personality
- Clear silhouette — recognizable at 30px render size
- Expression: happy/neutral

**2. Character portrait (for lobby/UI)**
- Size: 256x256px with transparency
- Bust/head shot, facing camera
- Expressive face, friendly look
- Used in lobby cards, winner screen, HUD

**3. Emoji/icon (for HUD overlay)**
- Size: 64x64px with transparency
- Simplified icon version
- Must read clearly at 18-24px render size

### The 8 Characters

#### 1. Cat (🐱)
- **Color**: Warm gray with lighter belly
- **Features**: Triangle ears, whiskers, pink nose, green eyes
- **Personality**: Agile, clever, slightly smug
- **Trait**: Best handling/agility across games

#### 2. Frog (🐸)
- **Color**: Bright green with yellow belly
- **Features**: Large bulging eyes, wide mouth, spots on back
- **Personality**: Cheerful, bouncy, carefree
- **Trait**: Best jump/dodge/recovery

#### 3. Wolf (🐺)
- **Color**: Dark gray with lighter muzzle
- **Features**: Angular pointed ears, fangs, amber eyes, fur tufts
- **Personality**: Fierce, competitive, intense
- **Trait**: Raw power/speed, worst handling

#### 4. Bear (🐻)
- **Color**: Rich brown with tan muzzle
- **Features**: Round ears, broad face, small eyes, big body
- **Personality**: Slow but unstoppable, grumpy-friendly
- **Trait**: Tank — high push resistance, heavy knockback

#### 5. Bunny (🐰)
- **Color**: White with pink inner ears
- **Features**: Long upright ears, cotton tail, big round eyes
- **Personality**: Nervous energy, fast, twitchy
- **Trait**: Fastest movement, fragile

#### 6. Pig (🐷)
- **Color**: Pink with darker pink nose
- **Features**: Round snout, curly tail, small ears, rosy cheeks
- **Personality**: Tough, stubborn, doesn't give up
- **Trait**: Endurance — longer shields, longer slide, more HP

#### 7. Chicken (🐔)
- **Color**: White body, red comb/wattle, yellow beak
- **Features**: Small wings, red comb on top, round body
- **Personality**: Panicky, chaotic, unpredictable
- **Trait**: Chaos — random bonuses, bigger AoE, wild card

#### 8. Raccoon (🦝)
- **Color**: Gray with dark eye mask, striped tail
- **Features**: Bandit mask around eyes, bushy striped tail, small hands
- **Personality**: Sneaky, clever, mischievous
- **Trait**: Trickster — better items, longer powerups, stealth

## Backgrounds (4 games)

Each game needs a tileable or static background. Current games:

### 1. Escape the Fox — Side-scroll runner
- Forest path with depth layers (parallax)
- Biomes: forest (green), cave (dark), snow (white/blue), volcano (red/orange)
- Size: 1920x720px per biome, horizontally tileable

### 2. King of the Hill — Circular arena
- Space/cosmic theme (current: dark purple nebula)
- Floating platform in void
- Size: 1920x1080px static background

### 3. Meteor Shower — Circular arena
- Volcanic/fire theme
- Cracked ground, lava glow at edges
- Size: 1920x1080px static background

### 4. Grand Prix — Top-down racing
- Countryside track from above
- Green grass, dirt/asphalt road, trees, rocks
- Size: 2048x2048px (camera follows players)

## UI Elements

### Lobby Screen
- Game show stage/curtain theme (like bg.png's fairground)
- "FRANTICS!" title card (current: gradient text)
- Game selection cards (4 games)
- Tournament trophy card

### PostGame Overlay
- Winner podium / spotlight
- Stats display area
- "PLAY AGAIN" / "LOBBY" buttons

## Technical Requirements
- Format: PNG with transparency (no JPEG)
- All sprites must have clean alpha edges (no white fringing)
- Color space: sRGB
- Naming: `{character}-{type}.png` (e.g. `cat-blob.png`, `bear-portrait.png`)
- Deliver at specified sizes (will be downscaled in-game)

## Spritesheet Alternative
If delivering as spritesheet:
- 2048x2048px atlas
- Include JSON coordinate map
- Pack characters in rows: row 1 = blobs, row 2 = portraits, row 3 = icons
