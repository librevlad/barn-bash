// scripts/typecheck.js
// Lightweight syntax check for every *.js we ship. JSX stays
// runtime-validated by Babel-standalone in the browser (no build step)
// so we don't try to parse .jsx here — `node --check` rejects JSX.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const files = [
  'server.js',
  ...walk('src'),
  ...walk('client-controller'),
  ...walk('scripts'),
].filter(f => fs.existsSync(f));

let fail = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    fail++;
    process.stderr.write(`\u2717 ${f}\n`);
    if (e.stderr) process.stderr.write(e.stderr.toString() + '\n');
  }
}

if (fail > 0) {
  console.error(`\n${fail} file(s) failed syntax check`);
  process.exit(1);
}
console.log(`\u2713 ${files.length} .js files pass syntax check`);
