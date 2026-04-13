/**
 * Physics2D.js — Static utility class for 2D physics calculations.
 *
 * All methods are pure functions operating on plain objects with {x, y, vx, vy, radius}
 * properties. No allocations on the hot path — results are returned via reusable objects
 * where practical.
 */
(function (root) {
  'use strict';

  var TAU = Math.PI * 2;

  var Physics2D = {};

  /* ------------------------------------------------------------------
   *  Movement
   * ------------------------------------------------------------------ */

  /**
   * Move entity by its velocity scaled by delta time.
   * @param {{x:number, y:number, vx:number, vy:number}} entity
   * @param {number} dt Delta time in seconds.
   */
  Physics2D.move = function (entity, dt) {
    entity.x += entity.vx * dt;
    entity.y += entity.vy * dt;
  };

  /**
   * Apply friction multiplier to velocity.
   * @param {{vx:number, vy:number}} entity
   * @param {number} f Friction factor (0 = full stop, 1 = no friction).
   */
  Physics2D.applyFriction = function (entity, f) {
    entity.vx *= f;
    entity.vy *= f;
  };

  /**
   * Apply downward gravitational acceleration.
   * @param {{vy:number}} entity
   * @param {number} g Gravity in px/s^2.
   * @param {number} dt Delta time in seconds.
   */
  Physics2D.applyGravity = function (entity, g, dt) {
    entity.vy += g * dt;
  };

  /* ------------------------------------------------------------------
   *  Collision detection
   * ------------------------------------------------------------------ */

  /** @private Shared result object to reduce allocations. */
  var _ccResult = { hit: false, nx: 0, ny: 0, overlap: 0 };

  /**
   * Circle-vs-circle overlap test.
   * @param {{x:number, y:number, radius:number}} a
   * @param {{x:number, y:number, radius:number}} b
   * @returns {{hit:boolean, nx:number, ny:number, overlap:number}|null}
   *   Normal points from a toward b. Returns null on no collision.
   */
  Physics2D.circleVsCircle = function (a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var distSq = dx * dx + dy * dy;
    var minDist = a.radius + b.radius;

    if (distSq >= minDist * minDist) return null;

    var dist = Math.sqrt(distSq);
    if (dist === 0) {
      // Perfectly overlapping — pick an arbitrary normal.
      _ccResult.hit = true;
      _ccResult.nx = 1;
      _ccResult.ny = 0;
      _ccResult.overlap = minDist;
      return _ccResult;
    }

    _ccResult.hit = true;
    _ccResult.nx = dx / dist;
    _ccResult.ny = dy / dist;
    _ccResult.overlap = minDist - dist;
    return _ccResult;
  };

  /**
   * Test if a point is inside a circle.
   * @param {number} px Point x.
   * @param {number} py Point y.
   * @param {number} cx Circle centre x.
   * @param {number} cy Circle centre y.
   * @param {number} r  Circle radius.
   * @returns {boolean}
   */
  Physics2D.pointInCircle = function (px, py, cx, cy, r) {
    var dx = px - cx;
    var dy = py - cy;
    return dx * dx + dy * dy <= r * r;
  };

  /* ------------------------------------------------------------------
   *  Geometry helpers
   * ------------------------------------------------------------------ */

  /** @private Shared result for distToSegment. */
  var _dsResult = { dist: 0, t: 0, projX: 0, projY: 0 };

  /**
   * Shortest distance from a point to a line segment.
   * @param {number} px Point x.
   * @param {number} py Point y.
   * @param {number} ax Segment start x.
   * @param {number} ay Segment start y.
   * @param {number} bx Segment end x.
   * @param {number} by Segment end y.
   * @returns {{dist:number, t:number, projX:number, projY:number}}
   *   t is the parametric position [0,1] along the segment.
   */
  Physics2D.distToSegment = function (px, py, ax, ay, bx, by) {
    var abx = bx - ax;
    var aby = by - ay;
    var lenSq = abx * abx + aby * aby;
    var t;

    if (lenSq === 0) {
      // Degenerate segment (zero length).
      t = 0;
    } else {
      t = ((px - ax) * abx + (py - ay) * aby) / lenSq;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
    }

    var projX = ax + t * abx;
    var projY = ay + t * aby;
    var dx = px - projX;
    var dy = py - projY;

    _dsResult.dist = Math.sqrt(dx * dx + dy * dy);
    _dsResult.t = t;
    _dsResult.projX = projX;
    _dsResult.projY = projY;
    return _dsResult;
  };

  /**
   * Find the nearest point on a polyline path to a given point.
   * @param {number} px Point x.
   * @param {number} py Point y.
   * @param {{x:number, y:number}[]} path Array of path vertices.
   * @returns {{x:number, y:number, dist:number, segIndex:number}}
   */
  Physics2D.nearestPointOnPath = function (px, py, path) {
    var bestDist = Infinity;
    var bestX = 0;
    var bestY = 0;
    var bestSeg = 0;

    for (var i = 0; i < path.length - 1; i++) {
      var seg = Physics2D.distToSegment(
        px, py,
        path[i].x, path[i].y,
        path[i + 1].x, path[i + 1].y
      );
      if (seg.dist < bestDist) {
        bestDist = seg.dist;
        bestX = seg.projX;
        bestY = seg.projY;
        bestSeg = i;
      }
    }

    return { x: bestX, y: bestY, dist: bestDist, segIndex: bestSeg };
  };

  /* ------------------------------------------------------------------
   *  Collision response
   * ------------------------------------------------------------------ */

  /**
   * Reflect entity velocity off a surface normal with restitution.
   * @param {{vx:number, vy:number}} entity
   * @param {number} nx Surface normal x (unit).
   * @param {number} ny Surface normal y (unit).
   * @param {number} restitution Bounciness (0 = absorb, 1 = perfect bounce).
   */
  Physics2D.bounce = function (entity, nx, ny, restitution) {
    var dot = entity.vx * nx + entity.vy * ny;
    entity.vx -= (1 + restitution) * dot * nx;
    entity.vy -= (1 + restitution) * dot * ny;
  };

  /**
   * Clamp entity position to stay inside (or outside) a circle boundary.
   * @param {{x:number, y:number}} entity
   * @param {number} cx Circle centre x.
   * @param {number} cy Circle centre y.
   * @param {number} r  Boundary radius.
   * @param {boolean} inside If true keep entity inside; if false keep outside.
   */
  Physics2D.clampToCircle = function (entity, cx, cy, r, inside) {
    var dx = entity.x - cx;
    var dy = entity.y - cy;
    var distSq = dx * dx + dy * dy;

    if (inside) {
      if (distSq > r * r) {
        var dist = Math.sqrt(distSq);
        entity.x = cx + (dx / dist) * r;
        entity.y = cy + (dy / dist) * r;
      }
    } else {
      if (distSq < r * r) {
        var dist2 = Math.sqrt(distSq);
        if (dist2 === 0) {
          entity.x = cx + r;
        } else {
          entity.x = cx + (dx / dist2) * r;
          entity.y = cy + (dy / dist2) * r;
        }
      }
    }
  };

  /**
   * Push two overlapping entities apart along the collision normal.
   * Each entity is moved half the overlap distance.
   * @param {{x:number, y:number}} a
   * @param {{x:number, y:number}} b
   * @param {number} overlap Penetration depth.
   * @param {number} nx Collision normal x (a → b).
   * @param {number} ny Collision normal y (a → b).
   */
  Physics2D.separate = function (a, b, overlap, nx, ny) {
    var half = overlap * 0.5;
    a.x -= nx * half;
    a.y -= ny * half;
    b.x += nx * half;
    b.y += ny * half;
  };

  /* ------------------------------------------------------------------
   *  Angle utilities
   * ------------------------------------------------------------------ */

  /**
   * Shortest signed angle difference from a to b, in [-PI, PI].
   * @param {number} a Angle in radians.
   * @param {number} b Angle in radians.
   * @returns {number}
   */
  Physics2D.angleDiff = function (a, b) {
    var d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  };

  /**
   * Linearly interpolate between two angles, taking the shortest arc.
   * @param {number} a Start angle in radians.
   * @param {number} b End angle in radians.
   * @param {number} t Interpolation factor [0, 1].
   * @returns {number}
   */
  Physics2D.lerpAngle = function (a, b, t) {
    return a + Physics2D.angleDiff(a, b) * t;
  };

  /* ------------------------------------------------------------------
   *  Export
   * ------------------------------------------------------------------ */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Physics2D: Physics2D };
  }
  if (typeof window !== 'undefined') {
    root.Physics2D = Physics2D;
  }

})(typeof window !== 'undefined' ? window : this);
