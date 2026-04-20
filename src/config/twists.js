// src/config/twists.js
// Round twist modifiers — the "earthquake" cards a round can get hit with
// when TWEAKS → Round twists is ON. Pure data; effects are handled inside
// each mini-game where relevant.

const TWISTS = [
  { id:'gravity', text:'Gravity is wild', emoji:'🌀' },
  { id:'flip', text:'Upside-down controls', emoji:'🔄' },
  { id:'double', text:'Double coins!', emoji:'💰' },
  { id:'mud', text:'Mud makes things slippery', emoji:'💧' },
  { id:'takeall', text:'Winner takes ALL', emoji:'👑' },
  { id:'huge', text:'Hay bales are HUGE', emoji:'🌾' },
  { id:'sudden', text:'Sudden death: one hit out', emoji:'💥' },
  { id:'fast', text:'Everything is 50% faster', emoji:'⚡' },
  { id:'fog', text:'Foggy fields · low vis', emoji:'🌫️' },
  { id:'wind', text:'Gusty wind · arrows curve', emoji:'💨' },
  { id:'night', text:'Midnight mode · barn owls watching', emoji:'🌙' },
  { id:'rain', text:'Rainy day · slippy slidey', emoji:'🌧️' },
  { id:'tiny', text:'Shrink ray · tiny critters', emoji:'🔍' },
];

Object.assign(window, { TWISTS });
