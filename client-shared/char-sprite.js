// Phase 38c — per-game character sprite renderer with pose system.
//
// Draws a character animal at (x, y) with a pose-specific transform,
// color tint (keyed to player color), ground shadow, and optional
// hit flash / dash glow overlay. Uses the existing
// `/assets/animal-{id}.png` lobby avatar as the base placeholder for
// every pose; real commissioned poses documented in REQUIRED_ASSETS.md
// drop in via SpriteLoader when available.
//
// Until the 48-sprite set ships, the illusion of multiple poses is
// carried by canvas transforms (scale / rotate / translate) + per-pose
// color overlays applied to the single base sprite.
//
// Usage:
//   CharSprite.draw(ctx, x, y, size, {
//     character: 'cat',        // one of 8 ids
//     colorRgb: '255,82,82',   // player color as 'r,g,b' (no alpha)
//     pose: 'dash',            // idle | move | dash | hit | teeter | cheer
//     clock: 0,                // game clock in seconds (for pose animation)
//     hitFlash: 0,             // 0..1 — extra white flash (0 = none)
//   });
//
// Falls back to CharDraw.blob (procedural) if the sprite isn't loaded
// or if CharDraw is available and the caller explicitly wants it.
(function (global) {
  'use strict';

  const POSES = ['idle', 'move', 'dash', 'hit', 'teeter', 'cheer', 'windup'];

  function _poseTransform(pose, clock, opts) {
    // Returns { sx, sy, rot, dy } applied before drawing the sprite.
    // opts.facing ∈ radians drives mirror-flip for L/R symmetric
    // locomotion. opts.speed (world-units/frame) tunes step cadence.
    const facingX = (opts && typeof opts.facing === 'number') ? opts.facing : 0;
    const facingMirror = Math.cos(facingX) < 0 ? -1 : 1; // face points left → -1
    switch (pose) {
      case 'move': {
        // Phase 47a — 4-step walk cycle with directional lean +
        // facing-aware mirror. Step pattern uses both the primary
        // sine and a phase-doubled cosine for slightly offset legs,
        // so the bob looks more like walk than a single sine bounce.
        const cadence = clock * 7;
        const bob = Math.sin(cadence);
        const step = Math.cos(cadence * 2) * 0.5;
        // Lean 10° in direction of motion (mirror handles L/R).
        const lean = 0.17 * facingMirror * -1;
        return {
          sx: (0.95 + bob * 0.04) * facingMirror,
          sy: 1.05 - bob * 0.04,
          rot: lean + step * 0.02,
          dy: -Math.abs(bob) * 1.4,
        };
      }
      case 'dash': {
        // Forward stretch, faces direction of dash.
        return { sx: 1.22 * facingMirror, sy: 0.82, rot: 0, dy: 0 };
      }
      case 'hit': {
        const rot = 0.15 * (facingMirror || 1);
        return { sx: 1.18 * facingMirror, sy: 0.68, rot: rot, dy: 2 };
      }
      case 'teeter': {
        return {
          sx: 1 * facingMirror,
          sy: 1,
          rot: Math.sin(clock * 14) * 0.18,
          dy: Math.sin(clock * 20) * 1.6,
        };
      }
      case 'cheer': {
        // Phase 47a — victory dance: bigger bounce + subtle spin.
        const b = Math.abs(Math.sin(clock * 5));
        const spin = Math.sin(clock * 3) * 0.12;
        return { sx: 0.92 + b * 0.14, sy: 1.08 - b * 0.14, rot: spin, dy: -b * 14 };
      }
      case 'windup': {
        // Phase 47a — dash charge wind-up: brief anticipatory squat.
        // Caller passes an external `opts.charge` (0..1) that tightens
        // the crouch.
        const c = (opts && typeof opts.charge === 'number') ? opts.charge : 0.5;
        return {
          sx: (1 + c * 0.12) * facingMirror,
          sy: 1 - c * 0.15,
          rot: c * 0.05 * facingMirror,
          dy: c * 2,
        };
      }
      case 'idle':
      default: {
        const breath = Math.sin(clock * 1.8);
        return { sx: (1 + breath * 0.015) * facingMirror, sy: 1 - breath * 0.015, rot: 0, dy: -breath * 0.5 };
      }
    }
  }

  function draw(ctx, x, y, size, opts) {
    opts = opts || {};
    const pose = POSES.indexOf(opts.pose) >= 0 ? opts.pose : 'idle';
    const clock = opts.clock || 0;
    const colorRgb = opts.colorRgb || '255,255,255';
    const hitFlash = Math.max(0, Math.min(1, opts.hitFlash || 0));
    const character = opts.character || 'cat';

    // Ground shadow — ellipse under feet, tighter during dash, wider at rest.
    const shadowScale = pose === 'dash' ? 1.1 : pose === 'cheer' ? 0.6 : 1;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(
      x, y + size * 0.88,
      size * 0.72 * shadowScale,
      size * 0.24 * shadowScale,
      0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    const sprite = (typeof SpriteLoader !== 'undefined')
      ? SpriteLoader.get('charAvatar-' + character)
      : null;

    const xf = _poseTransform(pose, clock, {
      facing: (typeof opts.facing === 'number') ? opts.facing : 0,
      charge: opts.charge,
    });

    if (sprite) {
      const s = size * 2;
      ctx.save();
      ctx.translate(x, y + xf.dy);
      ctx.rotate(xf.rot);
      ctx.scale(xf.sx, xf.sy);

      // Phase 39b — rim-glow outline. Soft dark halo under the sprite
      // so painted characters pop off the wood floor. Keeps the silhouette
      // legible at small (22 px) sizes without a hard pixel stroke.
      ctx.save();
      ctx.shadowColor = 'rgba(10, 6, 3, 0.85)';
      ctx.shadowBlur = size * 0.34;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = size * 0.08;
      ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
      ctx.restore();

      // Sprite
      ctx.drawImage(sprite, -s / 2, -s / 2, s, s);

      // Color tint — multiply overlay keyed to player color.
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(${colorRgb}, 0.16)`;
      ctx.fillRect(-s / 2, -s / 2, s, s);

      // Pose-specific overlays
      if (pose === 'dash') {
        ctx.fillStyle = 'rgba(255, 190, 90, 0.28)';
        ctx.fillRect(-s / 2, -s / 2, s, s);
      }
      if (pose === 'teeter') {
        // Red danger wash pulsing
        const p = 0.25 + Math.sin(clock * 10) * 0.15;
        ctx.fillStyle = `rgba(220, 80, 60, ${p.toFixed(3)})`;
        ctx.fillRect(-s / 2, -s / 2, s, s);
      }
      if (hitFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${hitFlash.toFixed(3)})`;
        ctx.fillRect(-s / 2, -s / 2, s, s);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
      return;
    }

    // Fallback path — CharDraw blob with pose hints.
    if (typeof CharDraw !== 'undefined') {
      CharDraw.blob(ctx, x, y + xf.dy, size, opts.color || '#fff', {
        idx: opts.idx || 0,
        clock: clock,
        expression: pose === 'dash' ? 'determined'
                  : pose === 'hit' ? 'surprised'
                  : pose === 'cheer' ? 'happy'
                  : 'happy',
        dashing: pose === 'dash',
        running: pose === 'move',
        character: character,
      });
    }
  }

  const CharSprite = { draw: draw, POSES: POSES.slice() };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CharSprite;
  } else {
    global.CharSprite = CharSprite;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
