// ============================================================
// Frantics — global runtime API declarations (Phase 27a).
// ------------------------------------------------------------
// All IIFE-global modules (window.Sound, window.Narrator, etc.)
// are declared here so tsc can type-check consumer sites
// without requiring every .js file to `import` them.
// ============================================================

// ---- Sound (client-shared/sound.js) ----

type FranticsSfxName =
  | 'countdownTick' | 'countdownGo' | 'correct' | 'wrong'
  | 'roundStart' | 'jump' | 'land' | 'foxClose' | 'slide'
  | 'jump2' | 'shieldPickup' | 'speedPickup' | 'coinPickup'
  | 'shieldBreak' | 'stumble' | 'nearMiss' | 'foxGrowl'
  | 'foxSprint' | 'foxLeap' | 'dash' | 'bump' | 'meteorWarn'
  | 'meteorImpact' | 'dodge' | 'slam' | 'eliminated' | 'winner'
  | 'champion' | 'shrink' | 'fanfare' | 'uiClick' | 'uiHover';

type FranticsMusicTheme =
  | 'escapeFox' | 'hill' | 'hillKing' | 'meteor' | 'race'
  | 'lobby' | 'tournament';

interface FranticsSound {
  play(name: FranticsSfxName): void;
  startMusic(theme: FranticsMusicTheme): void;
  stopMusic(): void;
  unlock(): void;
}

// ---- AmbientFx (client-shared/ambient-fx.js, Phase 21) ----

type AmbientFxPreset = 'sparkles' | 'embers' | 'dustmotes';

interface FranticsAmbientFx {
  attach(parentEl: HTMLElement, preset: AmbientFxPreset): unknown;
  detach(parentEl: HTMLElement): void;
  PRESETS: Record<AmbientFxPreset, unknown>;
}

// ---- Narrator (client-shared/narrator.js) ----

interface FranticsNarrator {
  gameIntro(gameId: string): void;
  elimination(playerName: string): void;
  winner(playerName: string): void;
  noWinner(): void;
  tournamentStart(): void;
  tournamentStandings(...args: any[]): void;
  champion(playerName: string): void;
  foxClose?(): void;
  shieldBlock?(): void;
  speedBurst?(): void;
  custom(text: string): void;
  tournamentRoundIntro(round: number, totalRounds: number, gameName: string): void;
  tournamentStandingsCommentary(leader: string, last: string, round: number, leaderScore: number): string;
  tournamentChampionQuip(name: string): string;
  narrateEvent(...args: any[]): void;
  getEventLog(): unknown[];
}

// ---- Tournament (client-shared/tournament.js) ----

interface FranticsTournament {
  handleMessage(msg: {
    type: 'tournamentStarted' | 'tournamentRound' | 'tournamentStandings'
        | 'tournamentEnd' | 'tournamentInfo';
    [key: string]: any;
  }): void;
  isActive(): boolean;
  show(): void;
  hide(): void;
}

// ---- PostGame (client-shared/postgame.js) ----

interface FranticsPostGameOpts {
  winnerId?: number | string | null;
  winnerName?: string | null;
  winnerColor?: string;
  winnerCharacter?: string | null;
  winLabel?: string;
  loseIcon?: string;
  loseText?: string;
  loseQuote?: string;
  stats?: Array<{ label: string; value: string | number }>;
  backdrop?: string;
  backdropMode?: 'podium' | 'hall';
  onPlayAgain?: () => void;
  onLobby?: () => void;
}

interface FranticsPostGame {
  show(opts: FranticsPostGameOpts): void;
  hide?(): void;
}

// ---- HostCommon (client-shared/host-common.js) ----

interface FranticsHostCommonPlayer {
  name?: string;
  color?: string;
  character?: string;
}

interface FranticsHostCommon {
  charIcons: Record<string, string>;
  charAvatars: Record<string, string>;
  renderCharGlyph(character: string, extraClass?: string): string;
  gameUrls: Record<string, string>;
  pname(id: string | number, players?: Record<string, FranticsHostCommonPlayer>): string;
  navigateToGame(gameId: string): void;
  redirectIfWrongGame(gameId: string): void;
  lobbyPlayersHTML(players: Record<string, FranticsHostCommonPlayer>): string;
  countPlayers(players: Record<string, FranticsHostCommonPlayer>): number;
  showMsg(text: string): void;
  runCountdown(onTick?: (n: number) => void, onDone?: () => void): void;
  addCornerOrnaments(overlayEl: HTMLElement): void;
}

// ---- PretextHooks (client-shared/pretext-hooks.js, Phase 17b) ----

interface FranticsPretextHooks {
  isReady: boolean;
  measure(el: HTMLElement): void;
  release(el: HTMLElement): void;
  relayoutAll(): void;
  whenReady(fn: () => void): void;
}

// ---- Gameplay (client-controller/gameplay.js) ----

interface FranticsGameplayOpts {
  gameId: string;
  playerId?: number | string;
  character?: string;
  name?: string;
  round?: number;
  onLobby?: () => void;
  [key: string]: any;
}

type FranticsGameplayPhase =
  | 'idle' | 'countdown' | 'running' | 'eliminated'
  | 'spectating' | 'gameover' | 'lost';

interface FranticsGameplayScoreExtras {
  delta?: number;
  context?: string;
  [key: string]: any;
}

interface FranticsGameplay {
  start(opts: FranticsGameplayOpts): FranticsGameplay;
  setPhase(phase: FranticsGameplayPhase): FranticsGameplay;
  setCountdown(digit: string | number, caption?: string): FranticsGameplay;
  setScore(value: number | string, extras?: FranticsGameplayScoreExtras): FranticsGameplay;
  setSpectators(list: Array<{
    id: number | string; name?: string; character?: string;
    color?: string; score?: number; leader?: boolean;
  }>): FranticsGameplay;
  onGameOver(opts: {
    winnerName?: string; winnerCharacter?: string;
    hero?: string; subline?: string; quip?: string;
    [key: string]: any;
  }): FranticsGameplay;
  stop?(): void;
  phase?(name: FranticsGameplayPhase): FranticsGameplay;
  [key: string]: any;
}

// ---- Onboarding (client-controller/onboarding.js) ----

interface FranticsOnboardingOpts {
  onComplete?: (state: unknown) => void;
  onDone?: (state: unknown) => void;
  [key: string]: any;
}

interface FranticsOnboarding {
  start(opts: FranticsOnboardingOpts): void;
  [key: string]: any;
}

// ---- Icons (client-shared/icons.js) ----

interface FranticsIcons {
  use(name: string): string;
  [key: string]: any;
}

// ---- SpriteLoader (engine/SpriteLoader.js) ----

interface FranticsSpriteLoader {
  load(name: string, url: string): Promise<HTMLImageElement>;
  get(name: string): HTMLCanvasElement | null;
  loadPainterly(
    name: string,
    url: string,
    opts?: {
      seedChroma?: number; seedBright?: number; seedDark?: number;
      expandChroma?: number; expandBright?: number; expandDark?: number;
    },
  ): Promise<HTMLCanvasElement | null>;
  getProgress(): { loaded: number; sheets: number };
  [key: string]: any;
}

// ---- InputManager (engine/Input.js) ----

interface FranticsInputManager {
  new (canvas: HTMLElement, opts?: Record<string, any>): {
    on(event: string, cb: (payload: any) => void): void;
    destroy?(): void;
    [key: string]: any;
  };
}

// ---- Visual (client-shared/visual.js) ----

interface FranticsVisual {
  burstConfetti(x: number, y: number, count: number): void;
  showCountdown?(n: number): void;
  triggerWinner?(): void;
  [key: string]: any;
}

// ---- ErrorReporter (client-shared/error-reporter.js, Phase 35) ----

interface FranticsErrorReporter {
  install(): void;
}

// ---- CharSprite (client-shared/char-sprite.js, Phase 38c) ----

type FranticsCharPose = 'idle' | 'move' | 'dash' | 'hit' | 'teeter' | 'cheer' | 'windup';

interface FranticsCharSpriteOpts {
  character?: string;
  colorRgb?: string;
  color?: string;
  pose?: FranticsCharPose;
  clock?: number;
  hitFlash?: number;
  idx?: number;
  facing?: number;
  charge?: number;
}

interface FranticsCharSprite {
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opts: FranticsCharSpriteOpts): void;
  POSES: FranticsCharPose[];
}

// ---- HostHarness (client-shared/host-harness.js, Phase 34) ----

interface FranticsHostHarnessConfig {
  gameId: string;
  lobbyAsset: string;
  musicKey: string;
  introKey: string;
  countdownFinal: string;
  lobbyReadyMsg: string;
  onLobby?: (state: any) => void;
  onStateRunning?: (state: any) => void;
  buildPostGameOpts?: (state: any, msg: any) => FranticsPostGameOpts;
}

interface FranticsHostHarness {
  boot(cfg: FranticsHostHarnessConfig): void;
  on(handlers: Record<string, (msg: any) => void>): void;
  getState(): any;
  getWs(): WebSocket;
  send(msg: FranticsProtocolMessage): void;
  showMsg(text: string, ms?: number): void;
}

// ---- Protocol (client-shared/protocol.js, Phase 28) ----

interface FranticsProtocolMessage { type: string; [key: string]: unknown }

interface FranticsProtocol {
  CLIENT_TYPES: string[];
  SERVER_TYPES: string[];
  // predicates
  isHost(msg: unknown): boolean;
  isJoin(msg: unknown): boolean;
  isStart(msg: unknown): boolean;
  isRestart(msg: unknown): boolean;
  isSelectGame(msg: unknown): boolean;
  isInput(msg: unknown): boolean;
  isPing(msg: unknown): boolean;
  isLeave(msg: unknown): boolean;
  validate(msg: unknown): string | null;
  // constructors
  makeHost(): FranticsProtocolMessage;
  makeJoin(opts?: { name?: string; character?: string; color?: string }): FranticsProtocolMessage;
  makeStart(): FranticsProtocolMessage;
  makeRestart(): FranticsProtocolMessage;
  makeSelectGame(gameId: string): FranticsProtocolMessage;
  makeStartTournament(): FranticsProtocolMessage;
  makeInput(action: string, extras?: Record<string, unknown>): FranticsProtocolMessage;
  makePing(t?: number): FranticsProtocolMessage;
  makeLeave(): FranticsProtocolMessage;
  // Server → client constructors (Phase 29)
  makeInit(playerId: number | string, p: { color?: string; colorId?: number | string; name?: string; character?: string }): FranticsProtocolMessage;
  makePlayerJoined(playerId: number | string, p: { name?: string; character?: string; color?: string; colorId?: number | string }): FranticsProtocolMessage;
  makePlayerLeft(playerId: number | string): FranticsProtocolMessage;
  makeGameOver(winnerId: number | string | null, gameId: string): FranticsProtocolMessage;
  makeGameSelected(gameId: string): FranticsProtocolMessage;
  makeTournamentStarted(totalRounds: number, sequence: string[]): FranticsProtocolMessage;
  makeEliminated(playerId: number | string): FranticsProtocolMessage;
  send(ws: { send(data: string): void; readyState?: number }, msg: FranticsProtocolMessage): void;
}

// ---- Globals on window ----

declare global {
  // `declare var` (not `const`) so the ambient declaration doesn't
  // collide with the IIFE `const Sound = (() => {...})()` source
  // definition when tsc scans both globals.d.ts and sound.js.
  var Sound: FranticsSound;
  var AmbientFx: FranticsAmbientFx;
  var Narrator: FranticsNarrator;
  var Tournament: FranticsTournament;
  var PostGame: FranticsPostGame;
  var HostCommon: FranticsHostCommon;
  var PretextHooks: FranticsPretextHooks;
  var Gameplay: FranticsGameplay;
  var Onboarding: FranticsOnboarding;
  var Icons: FranticsIcons;
  var SpriteLoader: FranticsSpriteLoader;
  var InputManager: FranticsInputManager;
  var Visual: FranticsVisual;
  var Protocol: FranticsProtocol;
  var HostHarness: FranticsHostHarness;
  var ErrorReporter: FranticsErrorReporter;
  var CharSprite: FranticsCharSprite;
  var CharDraw: any;
  var HillJoystick: any;
  var HillDashButton: any;
  var Physics2D: any;
  var Camera2D: any;
  var Scene: any;
  var ParticleSystem: any;
  var EntityManager: any;
  var RenderLoop: any;
  var Tween: any;
  var Palette: any;
  var GameLoop: any;
  var Effects: any;
  var HUD: any;
  var Transitions: any;
  var Colors: any;
  var THREE: any;

  interface Window {
    Sound?: FranticsSound;
    AmbientFx?: FranticsAmbientFx;
    Narrator?: FranticsNarrator;
    Tournament?: FranticsTournament;
    PostGame?: FranticsPostGame;
    HostCommon?: FranticsHostCommon;
    PretextHooks?: FranticsPretextHooks;
    Gameplay?: FranticsGameplay;
    Onboarding?: FranticsOnboarding;
    Icons?: FranticsIcons;
    SpriteLoader?: FranticsSpriteLoader;
    InputManager?: FranticsInputManager;
    Visual?: FranticsVisual;
    Protocol?: FranticsProtocol;
    HostHarness?: FranticsHostHarness;
    _lastPlayers?: Record<string, { name?: string; color?: string; character?: string }>;
  }
}

export {};
