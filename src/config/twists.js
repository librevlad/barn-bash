// src/config/twists.js
// Round twist modifiers — the "earthquake" cards a round can get hit
// with when TWEAKS → Round twists is ON. Pure data; effects are handled
// inside each mini-game where relevant. Copy is Russian by default —
// Party Mode is for новые 2026-friends, not distributed old-friends.

const TWISTS = [
  { id:'gravity', text:'Гравитация сошла с ума',          emoji:'🌀' },
  { id:'flip',    text:'Управление наоборот',             emoji:'🔄' },
  { id:'double',  text:'Двойная оплата!',                 emoji:'💰' },
  { id:'mud',     text:'Грязь — всё скользит',            emoji:'💧' },
  { id:'takeall', text:'Победитель забирает всё',         emoji:'👑' },
  { id:'huge',    text:'Тюки сена ОГРОМНЫЕ',              emoji:'🌾' },
  { id:'sudden',  text:'Внезапная смерть: один удар',     emoji:'💥' },
  { id:'fast',    text:'Всё на 50% быстрее',              emoji:'⚡' },
  { id:'fog',     text:'Туманное поле · еле видно',       emoji:'🌫️' },
  { id:'wind',    text:'Порывы ветра · стрелы кривятся',  emoji:'💨' },
  { id:'night',   text:'Полночь · совы следят',           emoji:'🌙' },
  { id:'rain',    text:'Дождь · скользко',                emoji:'🌧️' },
  { id:'tiny',    text:'Ужимка · крошечные зверьки',      emoji:'🔍' },
];

Object.assign(window, { TWISTS });
