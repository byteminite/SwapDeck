// Renders the SwapDeck logo mark to build/icon.png (256x256). Run with: npx electron build/make-icon.js
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow } = require('electron');

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 22 22">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs>
  <rect width="22" height="22" rx="6" fill="url(#g)"/>
  <rect x="5" y="5" width="8" height="8" rx="2.6" fill="rgba(255,255,255,.95)"/>
  <rect x="9.75" y="9.75" width="7.25" height="7.25" rx="2.3" fill="rgba(10,10,14,.55)" stroke="rgba(255,255,255,.95)" stroke-width="1.5"/>
</svg>`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 256, height: 256, show: false, frame: false, transparent: true, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,' + encodeURIComponent(`<html><body style="margin:0;background:transparent">${SVG}</body></html>`));
  await new Promise(r => setTimeout(r, 300));
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 256, height: 256 });
  fs.writeFileSync(path.join(__dirname, 'icon.png'), img.resize({ width: 256, height: 256 }).toPNG());
  app.quit();
});
