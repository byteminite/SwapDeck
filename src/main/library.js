// The game library: installed Steam games plus non-Steam games the user added, merged with
// per-game settings (account, display profile, launch options) and playtime.

const fs = require('fs');
const path = require('path');
const steam = require('./steam');
const store = require('./store');

const CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps/';
const steamId = appid => 'steam:' + appid;
const tagsOf = cfg => Array.isArray(cfg.tags) ? cfg.tags.filter(t => typeof t === 'string') : [];

// Art: Steam's local library cache (served through the sdimg:// protocol), else the public CDN.
function art(dir, appid, file) {
  return steam.artFile(dir, appid, file) ? `sdimg://lc/${appid}/${file}` : CDN + appid + '/' + file;
}

function build(dir) {
  const play = steam.localPlaytime(dir);
  const out = [];
  const seen = new Set();

  for (const g of steam.installedGames(dir)) {
    const id = steamId(g.appid);
    seen.add(id);
    const cfg = store.gameCfg(id), p = play[g.appid] || {};
    out.push({
      id, steam: true, appid: g.appid, name: g.name, installed: true, folder: g.folder,
      acct: cfg.acct, opts: cfg.opts, display: cfg.display, audio: cfg.audio, apps: cfg.apps, launcher: cfg.launcher || null, tags: tagsOf(cfg), fav: !!cfg.fav, note: typeof cfg.note === 'string' ? cfg.note : '',
      cover: art(dir, g.appid, 'library_600x900.jpg'), hero: art(dir, g.appid, 'library_hero.jpg'), logo: art(dir, g.appid, 'logo.png'),
      lastPlayed: Math.max(p.last || 0, cfg.lastPlayed || 0), hours: Math.round((p.mins || 0) / 6) / 10,
    });
  }

  // Steam games that were set up in SwapDeck but are no longer installed stay visible as "Not installed".
  for (const [id, cfg] of Object.entries(store.allGameCfgs())) {
    if (!id.startsWith('steam:') || seen.has(id) || !cfg.name) continue;
    const appid = id.slice(6), p = play[appid] || {};
    out.push({
      id, steam: true, appid, name: cfg.name, installed: false, folder: null,
      acct: cfg.acct, opts: cfg.opts || '', display: store.gameCfg(id).display, audio: store.gameCfg(id).audio, apps: store.gameCfg(id).apps, tags: tagsOf(cfg), fav: !!cfg.fav, note: typeof cfg.note === 'string' ? cfg.note : '',
      cover: CDN + appid + '/library_600x900.jpg', hero: CDN + appid + '/library_hero.jpg', logo: CDN + appid + '/logo.png',
      lastPlayed: Math.max(p.last || 0, cfg.lastPlayed || 0), hours: Math.round((p.mins || 0) / 6) / 10,
    });
  }

  for (const c of store.customGames()) {
    const cfg = store.gameCfg(c.id);
    out.push({
      id: c.id, steam: false, name: c.name, exe: c.exe, installed: fs.existsSync(c.exe), folder: path.dirname(c.exe),
      acct: null, opts: cfg.opts, display: cfg.display, audio: cfg.audio, apps: cfg.apps, tags: tagsOf(cfg), fav: !!cfg.fav, note: typeof cfg.note === 'string' ? cfg.note : '',
      img: c.img ? `sdimg://cover/${encodeURIComponent(c.img)}` : null, iconMode: c.iconMode || 'gen',
      lastPlayed: cfg.lastPlayed || 0, hours: Math.round((cfg.playMs || 0) / 360000) / 10,
    });
  }
  return out;
}

// Remember the name of configured Steam games so they can still be listed after uninstalling.
function setCfg(game, patch) {
  const extra = game && game.steam ? { name: game.name } : {};
  return store.setGameCfg(game.id, { ...patch, ...extra });
}

module.exports = { build, setCfg, steamId };
