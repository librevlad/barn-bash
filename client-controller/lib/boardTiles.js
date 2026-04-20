// client-controller/lib/boardTiles.js
// Phone board-vote tiles. Must mirror the host-side games registry
// (src/games/**) so the id a phone sends as a vote resolves to the same
// mini-game the host routes to. Adding a game means appending one row
// here too.

const BOARD_TILES = [
  { id:'tap',    name:'Поросячий Забег',     icon:'🏁', tint:'#ffc93c' },
  { id:'hay',    name:'Сенная Паника',       icon:'🌾', tint:'#8acb4a' },
  { id:'egg',    name:'Горячее Яйцо',        icon:'🥚', tint:'#fff5e4' },
  { id:'aim',    name:'Яблочко в Глаз',      icon:'🎯', tint:'#e04b3b' },
  { id:'mud',    name:'Грязный Забег',       icon:'💧', tint:'#4aa3e0' },
  { id:'gopher', name:'Суслик, Пошёл Вон',   icon:'🔨', tint:'#a36bd1' },
  { id:'tug',    name:'Канатный Беспредел',  icon:'🪢', tint:'#c18040' },
  { id:'fish',   name:'Бешеная Рыбалка',     icon:'🎣', tint:'#4aa3e0' },
  { id:'jump',   name:'Сарайный Прыжок',     icon:'🐑', tint:'#6cc24a' },
];

Object.assign(window, { BOARD_TILES });
