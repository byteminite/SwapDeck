// Builds the browser demo into _site/ for GitHub Pages: the real renderer (src/renderer) plus the
// demo backend from web/. Run: node web/build.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, '_site'), APP = path.join(OUT, 'app');

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'src', 'renderer'), APP, { recursive: true });
for (const f of ['index.html', 'demo-backend.js']) fs.copyFileSync(path.join(__dirname, f), path.join(OUT, f));
fs.copyFileSync(path.join(__dirname, 'demo-api.js'), path.join(APP, 'demo-api.js'));
fs.copyFileSync(path.join(ROOT, 'build', 'icon.png'), path.join(OUT, 'icon.png'));

// Fail loudly if the renderer changed in a way the demo patches no longer match.
const patch = (file, from, to) => {
  const p = path.join(APP, file), s = fs.readFileSync(p, 'utf8');
  if (!s.includes(from)) throw new Error(`web/build.js: "${from.slice(0, 60)}" not found in ${file}. Update the demo patch.`);
  fs.writeFileSync(p, s.replace(from, to));
};
// window.api comes from the demo page, loaded before the app's own scripts.
patch('index.html', '<link rel="stylesheet" href="styles.css">', '<script src="demo-api.js"></script>\n  <link rel="stylesheet" href="styles.css">');
patch('tray.html', '<link rel="stylesheet" href="styles.css">', '<script src="demo-api.js"></script>\n  <link rel="stylesheet" href="styles.css">');
// A public page must never ask for a Steam password or token: those sign-in options go straight to "not in the demo".
const NOPE = "this.setLink({ step: 'fail', err: 'Connecting accounts is turned off in the browser demo. Download SwapDeck to connect yours.' })";
patch('ui.js', "onLkPWStart: () => this.setLink({ step: 'pw' })", 'onLkPWStart: () => ' + NOPE);
patch('ui.js', "onLkTokenStart: () => this.setLink({ step: 'token', tok: '' })", 'onLkTokenStart: () => ' + NOPE);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log('Demo built in', path.relative(ROOT, OUT));
