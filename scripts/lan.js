// scripts/lan.js
// LAN-only launcher. Party Mode design doc calls out LAN (not tunnel) as
// the mode for real playtests because tunnel latency and idle-drop behaviour
// bit us during Max's test. This shim sets NO_TUNNEL=1 and spawns server.js,
// avoiding a shell-specific env syntax that would break on Windows cmd vs
// bash. Use `npm run lan` instead of `npm run dev` when a group is in the
// room with phones on the same Wi-Fi.
const { spawn } = require('child_process');
const path = require('path');

const env = { ...process.env, NO_TUNNEL: '1' };
const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
  env,
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 0));
['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => { try { child.kill(sig); } catch (_) {} });
});
