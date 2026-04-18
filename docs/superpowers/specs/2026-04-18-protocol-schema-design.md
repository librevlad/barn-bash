# Shared Protocol Schema — Design Spec (Phase 28)

**Date:** 2026-04-18
**Project:** Frantics — party game
**Phase:** 28 of ?, first of the Rune-grade foundation arc (Phases
28-34).
**Scope:** eliminate raw-JSON WebSocket fragility by extracting a
single-source-of-truth protocol schema shared between server and
client. Includes (a) `client-shared/protocol.js` UMD module with
message type enum, predicates, constructors, and generic validator;
(b) server boundary validation — reject malformed messages early;
(c) partial migration of client WS call sites from
`ws.send(JSON.stringify({type:'...'}))` to `Protocol.send(ws,
Protocol.makeX())`; (d) unit tests for the protocol module.
**NOT** a full migration of every message site — the pattern is
established; Phase 29 extends to server-broadcast sites + the
remaining ~30 client sites.

## Problem

Current state (26 content phases + E2E audit + DX Tier 1):

- 42 raw `ws.send(JSON.stringify({type:'...',...}))` call sites
  across 10 files. No schema. Every typo (`'tournamnet'`,
  `'gameselect'`) silently fails at runtime.
- 30+ `case '...':` dispatches in message handlers. No exhaustive
  coverage check.
- Server happily dispatches on unknown types — a bad client sends
  `{type:'steal_all_gold'}` and the switch silently falls through
  to `default`.
- No shared contract between server + client. When a new message
  is added, it must be implemented in 2-4 places independently.

Rune's signature foundation is a shared deterministic protocol
with types flowing between server + client. Phase 28 extracts our
equivalent.

## Success criteria

- `client-shared/protocol.js` exists, UMD-compatible (works as
  browser `<script>` AND Node `require()`):
  - `Protocol.CLIENT_TYPES` + `SERVER_TYPES` — enum arrays
  - `Protocol.isHost/isJoin/isStart/isRestart/isSelectGame/
    isInput/isPing/isLeave` — predicates (type guards)
  - `Protocol.validate(msg)` — generic gate returning `null` for
    valid or a string reason for rejection
  - `Protocol.makeHost/makeJoin/.../makePing/makeLeave/
    makeStartTournament/makeInput/makeSelectGame/makeRestart/
    makeStart` — constructors
  - `Protocol.send(ws, msg)` — serialize+send helper with
    readyState guard
- Server `wss.on('connection')` validates inbound messages BEFORE
  dispatch; malformed / unknown messages logged (when
  `DEBUG_PROTOCOL=1`) and dropped. Switch below never sees
  garbage.
- Client WebSocket send sites migrated from
  `ws.send(JSON.stringify(...))` to `Protocol.send(ws,
  Protocol.makeX(...))` — pilot on main host + 4 per-game hosts +
  controller join flow.
- `client-shared/protocol.test.js` — 17 unit tests covering
  validators, constructors, readyState guard, `CLIENT_TYPES` /
  `SERVER_TYPES` enum invariants. Runs via `npm test`.
- `npm run typecheck` passes clean (0 errors).

## Non-goals

- Full migration of every server-broadcast message site (Phase
  29+).
- Zod/Valibot runtime schema library. Our needs are simple type
  guards; adding a dep for marginal gain isn't worth it.
- ES modules migration. Protocol is UMD (classic-script friendly)
  on purpose — works in current script-tag runtime without
  changing HTML loading order.
- TypeScript `.ts` source for protocol. JSDoc + ambient
  `globals.d.ts` give us the same type-guard flavor in IDE.
- Binary protocol (MessagePack / CBOR). JSON stays — bandwidth
  is not a bottleneck on LAN.

## Architecture

### 28a — `client-shared/protocol.js` module

UMD wrapper: detects CommonJS (`module.exports`) and assigns
`module.exports = factory()`; otherwise browser → `root.Protocol
= factory()`. One source, two runtimes.

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Protocol = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // ... enums, predicates, constructors, validate, send
  return { /* public API */ };
});
```

Each message type:
- Enum entry in `CLIENT_TYPES` / `SERVER_TYPES`
- JSDoc `@typedef` documenting shape
- `isX(msg)` predicate (used both in `validate()` dispatch AND
  exported for custom use)
- `makeX(...)` constructor returning a well-typed object

`validate(msg)`:
- Fast-paths: not-object → reject, missing type → reject, unknown
  type → reject
- Per-type payload check for CLIENT-sourced messages (join,
  selectGame, input) — server-broadcast types (state, init, etc.)
  trust the sender and skip validation
- Returns `null` for valid, string for reason

### 28b — Server boundary validation

`server/index.js` `wss.on('connection').ws.on('message')`:

```js
ws.on('message', (raw) => {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }

  // Phase 28 — validate at protocol boundary. Drops malformed /
  // unknown messages early so the switch below never sees garbage.
  const reason = Protocol.validate(msg);
  if (reason) {
    if (process.env.DEBUG_PROTOCOL) {
      console.warn('[protocol] dropped:', reason, JSON.stringify(msg).slice(0, 120));
    }
    return;
  }

  switch (msg.type) { /* existing dispatch */ }
});
```

### 28c — Client site migration (pilot)

Migrated in this phase:
- `client-controller/main.js` — join flow uses
  `Protocol.makeJoin({name, character})` + extra carColor field
- `client-host/main.js` — host, selectGame, startTournament
- `client-host-escape/main.js` — host, start, restart
- `client-host-hill/main.js` — same
- `client-host-meteor/main.js` — same
- `client-host-race/main.js` — same

Pattern:
```js
// BEFORE:
ws.send(JSON.stringify({ type: 'selectGame', gameId: 'escape' }));

// AFTER:
Protocol.send(ws, Protocol.makeSelectGame('escape'));
```

Inline `onclick="ws.send(JSON.stringify({type:'restart'}))"` sites
in per-game HTML left as-is for now (rare, static, low-risk).

### 28d — Unit tests

`client-shared/protocol.test.js` — node:test suite. Covers:
- Validator happy + sad paths
- Constructor shapes
- readyState guard on `Protocol.send`
- Enum array invariants

Integrated into `npm test`:
```json
"test": "node --test server/players.test.js client-shared/protocol.test.js"
```

Total: 23 tests passing (6 players + 17 protocol).

### 28e — tsc + HTML integration

Each HTML adds `<script src="/shared/protocol.js">` BEFORE any
consumer script. Loaded once, exposes `window.Protocol`.
`types/globals.d.ts` declares `FranticsProtocol` interface.
Consumer code gets IDE type hints on `Protocol.makeJoin(...)`.

`tsconfig.json` excludes `protocol.js` itself from include (UMD
wrapper pattern conflicts with typed `Protocol` global). File
header `// @ts-nocheck` silences the single line tsc couldn't
resolve.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Server validator rejects legitimate messages due to over-strict predicates | Validator is conservative: unknown types dropped, but known types with extra fields pass. `input` accepts any `action: string` + arbitrary extras. `join` allows optional fields. Tests cover edge cases |
| Existing `onclick="ws.send(...)"` inline handlers in HTML bypass Protocol | Left untouched in this phase. Phase 29 migrates those by replacing with onclick handlers that call Protocol from JS scope |
| Race condition on readyState check | `readyState !== 1` check inside `Protocol.send` is a best-effort guard; if caller sends before open, the message is silently dropped. Documented behavior. Same as existing ws.send would silently fail |
| Server broadcasting messages with typos still slip through | `validate()` only enforces client → server shapes. Server broadcasts are trusted. Future phase (Rune-grade state authority) could extract server messages too |
| `@ts-nocheck` on protocol.js loses type coverage inside it | Protocol.js is tiny (~200 lines), stable contract. Its tests cover behavior. The TYPE USE is at consumer sites where tsc checks against the `FranticsProtocol` interface in globals.d.ts |

## Phase handoff

After Phase 28 the client↔server boundary has a single source of
truth. Consumer code reads `Protocol.makeJoin(...)` instead of
opaque object literals. The server drops garbage before dispatch.

Remaining Rune-grade arc (Phases 29-34):

- **Phase 29** — Pure reducer game logic. Move server game
  classes from imperative `setInterval` + mutable state to pure
  `reducer(state, action)` functions. Makes game logic unit
  testable.
- **Phase 30** — Test suite expansion. Unit tests for each
  reducer. Playwright E2E smoke tests. CI gate.
- **Phase 31** — Production build pipeline. Vite prod build with
  code-splitting per entrypoint, hashed assets, minification,
  source maps. Node server serves dist/ in prod, source in dev.
- **Phase 32** — ES modules migration. Convert
  `client-shared/*.js` IIFE → named exports. HTML entrypoints
  load single `<script type="module">`. Eliminates script-tag
  ordering fragility.
- **Phase 33** — Telemetry + error tracking. Client error
  reporter, structured logs, env-aware config, debug flags.
- **Phase 34** — Shared per-game host harness. Consolidate
  duplicate boilerplate between 4 per-game hosts into one
  parameterized host.

Audit grade stays at A+ (3.84) — tooling doesn't affect
user-facing dimensions.
