// client-controller/lib/critters.js
// Must match src/characters.jsx CHARACTERS ids on the host. The phone
// controller has no access to the host's SVG art, so we carry an emoji
// per critter for the join-carousel and the mid-game swap sheet.

const CRITTERS = [
  { id: 'pig',     name: 'Pinky',     color: '#f4a8c0', emoji: '🐷' },
  { id: 'fox',     name: 'Ember',     color: '#f08a3a', emoji: '🦊' },
  { id: 'bear',    name: 'Biggs',     color: '#a0723f', emoji: '🐻' },
  { id: 'rabbit',  name: 'Hopper',    color: '#e8dcc0', emoji: '🐰' },
  { id: 'chicken', name: 'Clucks',    color: '#fff8ea', emoji: '🐔' },
  { id: 'badger',  name: 'Bramble',   color: '#c7c2b5', emoji: '🦡' },
  { id: 'cat',     name: 'Marmalade', color: '#e8b866', emoji: '🐱' },
  { id: 'owl',     name: 'Professor', color: '#9b7653', emoji: '🦉' },
  { id: 'sheep',   name: 'Woolly',    color: '#fff8ea', emoji: '🐑' },
  { id: 'frog',    name: 'Ribbit',    color: '#6cc24a', emoji: '🐸' },
];

Object.assign(window, { CRITTERS });
