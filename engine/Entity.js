/**
 * Entity.js — Lightweight entity system for game objects.
 *
 * Entity holds transform, velocity, visual properties, and interpolation state.
 * EntityManager is a flat registry with type-based lookups and server-state syncing.
 */
(function (root) {
  'use strict';

  /* ======================================================================
   *  Entity
   * ====================================================================== */

  /**
   * A single game entity with transform, velocity, visuals, and interpolation.
   * @param {string} id   Unique identifier (typically the player/object id).
   * @param {string} type Entity type for filtering (e.g. 'player', 'ball', 'obstacle').
   */
  function Entity(id, type) {
    /** @type {string} */
    this.id = id;
    /** @type {string} */
    this.type = type || 'default';

    // Transform
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.scaleX = 1;
    this.scaleY = 1;

    // Velocity (client prediction)
    this.vx = 0;
    this.vy = 0;

    // Visual properties
    this.color = '#ffffff';
    this.character = '';
    this.name = '';
    this.visible = true;
    this.alpha = 1;

    // State
    this.alive = true;
    /** @type {Object} Game-specific state bag. */
    this.data = {};

    // Interpolation targets (private)
    this._target = null;
    this._prev = null;
  }

  /** @private List of properties that participate in numeric interpolation. */
  var LERP_FIELDS = ['x', 'y', 'angle', 'alpha', 'scaleX', 'scaleY'];

  /**
   * Store a target state snapshot received from the server.
   * The current values are saved as the previous frame for interpolation.
   * @param {Object} props Key/value pairs to lerp toward.
   */
  Entity.prototype.setTarget = function (props) {
    // Save current state as interpolation start.
    this._prev = {};
    for (var i = 0; i < LERP_FIELDS.length; i++) {
      this._prev[LERP_FIELDS[i]] = this[LERP_FIELDS[i]];
    }

    this._target = {};
    for (var key in props) {
      if (!props.hasOwnProperty(key)) continue;
      this._target[key] = props[key];
    }
  };

  /**
   * Interpolate from previous state toward target by alpha.
   * Non-numeric target properties are applied immediately at alpha >= 0.5.
   * Angle interpolation takes the shortest arc.
   * @param {number} alpha Interpolation factor in [0, 1].
   */
  Entity.prototype.lerp = function (alpha) {
    if (!this._target || !this._prev) return;

    for (var key in this._target) {
      if (!this._target.hasOwnProperty(key)) continue;
      var targetVal = this._target[key];

      if (typeof targetVal === 'number' && typeof this._prev[key] === 'number') {
        if (key === 'angle') {
          // Shortest-arc angle interpolation
          var diff = (targetVal - this._prev[key]) % (Math.PI * 2);
          if (diff > Math.PI) diff -= Math.PI * 2;
          if (diff < -Math.PI) diff += Math.PI * 2;
          this[key] = this._prev[key] + diff * alpha;
        } else {
          this[key] = this._prev[key] + (targetVal - this._prev[key]) * alpha;
        }
      } else if (alpha >= 0.5) {
        // Snap non-numeric properties halfway through
        this[key] = targetVal;
      }
    }
  };

  /**
   * Euclidean distance to another entity.
   * @param {{x:number, y:number}} other
   * @returns {number}
   */
  Entity.prototype.distTo = function (other) {
    var dx = other.x - this.x;
    var dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  /**
   * Angle from this entity toward another (radians, 0 = right, PI/2 = down).
   * @param {{x:number, y:number}} other
   * @returns {number}
   */
  Entity.prototype.angleTo = function (other) {
    return Math.atan2(other.y - this.y, other.x - this.x);
  };

  /* ======================================================================
   *  EntityManager
   * ====================================================================== */

  /** Registry that owns and indexes Entity instances. */
  function EntityManager() {
    /** @private @type {Object<string, Entity>} */
    this._entities = {};
  }

  /**
   * Create and register a new entity.
   * @param {string} id   Unique identifier.
   * @param {string} type Entity type.
   * @returns {Entity}
   */
  EntityManager.prototype.create = function (id, type) {
    var entity = new Entity(id, type);
    this._entities[id] = entity;
    return entity;
  };

  /**
   * Look up an entity by id.
   * @param {string} id
   * @returns {Entity|null}
   */
  EntityManager.prototype.get = function (id) {
    return this._entities[id] || null;
  };

  /**
   * Remove an entity by id.
   * @param {string} id
   */
  EntityManager.prototype.remove = function (id) {
    delete this._entities[id];
  };

  /**
   * Return all entities as an array.
   * @returns {Entity[]}
   */
  EntityManager.prototype.all = function () {
    var result = [];
    for (var id in this._entities) {
      if (this._entities.hasOwnProperty(id)) result.push(this._entities[id]);
    }
    return result;
  };

  /**
   * Return all entities of a given type.
   * @param {string} type
   * @returns {Entity[]}
   */
  EntityManager.prototype.byType = function (type) {
    var result = [];
    for (var id in this._entities) {
      if (this._entities.hasOwnProperty(id) && this._entities[id].type === type) {
        result.push(this._entities[id]);
      }
    }
    return result;
  };

  /** Remove all entities. */
  EntityManager.prototype.clear = function () {
    this._entities = {};
  };

  /**
   * Synchronise entities from a server state broadcast.
   *
   * The state object is keyed by id, e.g.:
   *   { "p1": { x: 10, y: 20, color: "#f00", ... }, "p2": { ... } }
   *
   * - New ids get an Entity created (type defaults to 'player').
   * - Existing entities receive setTarget() for interpolation.
   * - Ids of the same type present locally but absent from state are removed.
   *   Entities of other types are left untouched.
   *
   * @param {Object<string, Object>} state Server state keyed by entity id.
   * @param {string} [defaultType='player'] Type assigned to newly created entities.
   */
  EntityManager.prototype.updateFromState = function (state, defaultType) {
    var type = defaultType || 'player';
    var seen = {};

    for (var id in state) {
      if (!state.hasOwnProperty(id)) continue;
      seen[id] = true;

      var entity = this._entities[id];
      if (!entity) {
        entity = this.create(id, type);
        // Apply initial values directly so first frame is correct.
        var props = state[id];
        for (var key in props) {
          if (props.hasOwnProperty(key)) entity[key] = props[key];
        }
      } else {
        entity.setTarget(state[id]);
      }
    }

    // Remove stale entities of the same type only.
    for (var existingId in this._entities) {
      if (this._entities.hasOwnProperty(existingId) &&
          this._entities[existingId].type === type &&
          !seen[existingId]) {
        delete this._entities[existingId];
      }
    }
  };

  /* ======================================================================
   *  Export
   * ====================================================================== */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Entity: Entity, EntityManager: EntityManager };
  }
  if (typeof window !== 'undefined') {
    root.Entity = Entity;
    root.EntityManager = EntityManager;
  }

})(typeof window !== 'undefined' ? window : this);
