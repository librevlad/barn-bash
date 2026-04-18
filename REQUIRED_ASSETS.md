# Required PNG assets — KotH Polish arc (Phases 38a-e)

Inventory of commissioned artwork needed to replace the procedural
placeholders shipped in Phases 38b + 38c. Every item listed here has
a working placeholder in the code today; real PNGs drop in with no
client code changes (all loaded via `SpriteLoader.loadPainterly`).

---

## Character sprite sets — 48 PNGs total

Each of the 8 playable characters needs 6 pose frames. Same painterly
style as the existing `/assets/animal-*.png` lobby avatars. 1024×1024
source, alpha-cropped. Naming: `/assets/char-{character}-{pose}.png`.

**Characters:** `cat`, `frog`, `wolf`, `bear`, `bunny`, `pig`, `chicken`, `raccoon`

**Poses:**

| pose    | purpose                       | reference                                                    |
|---------|-------------------------------|--------------------------------------------------------------|
| `idle`  | standing, slow breathing      | neutral pose, feet planted, slight forward tilt              |
| `move`  | walking / running in-world    | mid-stride, legs offset, arms swinging                       |
| `dash`  | dash charge — aggressive lean | strong forward lean, arms behind, mouth open (battle cry)    |
| `hit`   | knocked back, stunned         | arms splayed, eyes wide, body rotated ~15° from vertical     |
| `teeter`| clinging to arena edge        | arms windmilling, one foot slipping, panicked expression     |
| `cheer` | victory celebration           | arms raised, mouth smiling, mid-jump                         |

Placeholder path today: `SpriteLoader.get('charAvatar-{character}')` is
shown with procedural canvas transforms (squash/stretch/rotation).

Asset filenames to commission:

```
/assets/char-cat-idle.png       /assets/char-cat-move.png       /assets/char-cat-dash.png
/assets/char-cat-hit.png        /assets/char-cat-teeter.png     /assets/char-cat-cheer.png
/assets/char-frog-idle.png      /assets/char-frog-move.png      /assets/char-frog-dash.png
/assets/char-frog-hit.png       /assets/char-frog-teeter.png    /assets/char-frog-cheer.png
/assets/char-wolf-idle.png      /assets/char-wolf-move.png      /assets/char-wolf-dash.png
/assets/char-wolf-hit.png       /assets/char-wolf-teeter.png    /assets/char-wolf-cheer.png
/assets/char-bear-idle.png      /assets/char-bear-move.png      /assets/char-bear-dash.png
/assets/char-bear-hit.png       /assets/char-bear-teeter.png    /assets/char-bear-cheer.png
/assets/char-bunny-idle.png     /assets/char-bunny-move.png     /assets/char-bunny-dash.png
/assets/char-bunny-hit.png      /assets/char-bunny-teeter.png   /assets/char-bunny-cheer.png
/assets/char-pig-idle.png       /assets/char-pig-move.png       /assets/char-pig-dash.png
/assets/char-pig-hit.png        /assets/char-pig-teeter.png     /assets/char-pig-cheer.png
/assets/char-chicken-idle.png   /assets/char-chicken-move.png   /assets/char-chicken-dash.png
/assets/char-chicken-hit.png    /assets/char-chicken-teeter.png /assets/char-chicken-cheer.png
/assets/char-raccoon-idle.png   /assets/char-raccoon-move.png   /assets/char-raccoon-dash.png
/assets/char-raccoon-hit.png    /assets/char-raccoon-teeter.png /assets/char-raccoon-cheer.png
```

---

## Environmental assets — hill arena

| asset                     | purpose                                  | placeholder              |
|---------------------------|------------------------------------------|--------------------------|
| `/assets/hill-floor.png`  | painted wood-plank arena surface         | procedural radial gradient + rings |
| `/assets/hill-crack.png`  | jagged crack hazard                      | procedural splat + lines |
| `/assets/hill-ice.png`    | ice zone shimmer texture                 | procedural blue pie-slice |
| `/assets/hill-bumper.png` | rotating rubber-rim / gold-core bumper   | procedural red+gold disc |
| `/assets/hill-dust.png`   | impact dust cloud frame (single frame)   | ParticleSystem burst      |
| `/assets/hill-spark.png`  | collision spark, small alpha-bright      | ParticleSystem burst      |

All placeholders are drop-in: when any of these PNGs lands, add a
`SpriteLoader.loadPainterly()` call in `client-host-hill/render2d.js`
init and the renderer's fallback path will swap to the painted
version automatically.

---

## Future — other games

When Phases 39+ bring escape / meteor / race to the same polish bar,
each will accumulate its own section here. Character pose sets are
**shared across all 4 games** — committing the 48-sprite set once
benefits every game mode.
