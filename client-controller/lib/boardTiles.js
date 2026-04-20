// client-controller/lib/boardTiles.js
// Phone board-vote tiles. Must mirror the host-side games registry
// (src/games/**) so the id a phone sends as a vote resolves to the same
// mini-game the host routes to. Adding a game means appending one row
// here too.

const BOARD_TILES = [
  { id:'tap',    name:'Pig Sprint',      icon:'🏁', tint:'#ffc93c' },
  { id:'hay',    name:'Hay Panic',       icon:'🌾', tint:'#8acb4a' },
  { id:'egg',    name:'Egg Pass',        icon:'🥚', tint:'#fff5e4' },
  { id:'aim',    name:'Apple Aim',       icon:'🎯', tint:'#e04b3b' },
  { id:'mud',    name:'Mud Dash',        icon:'💧', tint:'#4aa3e0' },
  { id:'gopher', name:'Whack-a-Gopher',  icon:'🔨', tint:'#a36bd1' },
  { id:'tug',    name:'Tug-o-War',       icon:'🪢', tint:'#c18040' },
  { id:'fish',   name:'Fishing Frenzy',  icon:'🎣', tint:'#4aa3e0' },
  { id:'jump',   name:'Barn Jump',       icon:'🐑', tint:'#6cc24a' },
];

Object.assign(window, { BOARD_TILES });
