// Shared between client-controller and client-host* — color IDs map to hex
// and to the car sprite filename. When added/removed, also update the
// sprite assets folder and server/players.js COLORS array.
(function (global) {
  const COLOR_IDS = [
    'red', 'blue', 'yellow', 'green', 'pink',
    'lightblue', 'purple', 'magenta', 'orange', 'greenalt',
  ];
  const COLOR_HEX = {
    red:       '#e74c3c',
    blue:      '#3498db',
    yellow:    '#f1c40f',
    green:     '#2ecc71',
    pink:      '#e84393',
    lightblue: '#5dc2e8',
    purple:    '#9b59b6',
    magenta:   '#d044a5',
    orange:    '#e67e22',
    greenalt:  '#2a7c33',
  };
  const COLOR_SPRITE = Object.fromEntries(
    COLOR_IDS.map(id => [id, '/assets/sprite-car-' + id + '.png'])
  );
  const COLOR_LABEL = {
    red: 'Red', blue: 'Blue', yellow: 'Yellow', green: 'Green',
    pink: 'Pink', lightblue: 'Light Blue', purple: 'Purple',
    magenta: 'Magenta', orange: 'Orange', greenalt: 'Dark Green',
  };
  const api = { COLOR_IDS, COLOR_HEX, COLOR_SPRITE, COLOR_LABEL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.FranticsColors = api;
})(typeof window !== 'undefined' ? window : globalThis);
