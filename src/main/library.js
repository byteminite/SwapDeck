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

// Which saved accounts own each Steam app: an account connected for stats by its real game list, any other
// account by what it has played on this PC. Also the name and hours Steam reported, for games not installed here.
function ownership(dir) {
  const owners = {}, known = {}, local = steam.localApps(dir);
  const add = (appid, sid) => { appid = String(appid); (owners[appid] = owners[appid] || []).includes(sid) || owners[appid].push(sid); };
  for (const a of steam.listAccounts(dir)) {
    const st = store.cache(a.sid).stats;
    if (st && Array.isArray(st.games)) {
      for (const g of st.games) {
        add(g.appid, a.sid);
        const k = known[g.appid] || (known[g.appid] = { name: g.n, hours: 0 });
        k.hours = Math.max(k.hours, g.h || 0);
      }
    } else for (const appid of local[a.sid] || []) add(appid, a.sid);
  }
  return { owners, known };
}

function steamGame(dir, id, appid, name, installed, extra) {
  const cfg = store.gameCfg(id), owners = extra.owners;
  // Nobody picked an account for this game and only one account owns it: use that one.
  const acctAuto = !cfg.acct && !cfg.acctSet && owners.length === 1;
  return {
    id, steam: true, appid, name, installed, folder: extra.folder || null, owners,
    acct: acctAuto ? owners[0] : cfg.acct, acctAuto,
    opts: cfg.opts || '', display: cfg.display, audio: cfg.audio, apps: cfg.apps, launcher: cfg.launcher || null, tags: tagsOf(cfg), fav: !!cfg.fav, note: typeof cfg.note === 'string' ? cfg.note : '',
    cover: installed ? art(dir, appid, 'library_600x900.jpg') : CDN + appid + '/library_600x900.jpg',
    hero: installed ? art(dir, appid, 'library_hero.jpg') : CDN + appid + '/library_hero.jpg',
    logo: installed ? art(dir, appid, 'logo.png') : CDN + appid + '/logo.png',
    lastPlayed: Math.max(extra.play.last || 0, cfg.lastPlayed || 0), hours: Math.max(Math.round((extra.play.mins || 0) / 6) / 10, extra.hours || 0),
  };
}

function build(dir) {
  const play = steam.localPlaytime(dir);
  const { owners, known } = ownership(dir);
  const out = [];
  const seen = new Set();
  const ownersOf = appid => owners[String(appid)] || [];

  for (const g of steam.installedGames(dir)) {
    const id = steamId(g.appid);
    seen.add(id);
    out.push(steamGame(dir, id, g.appid, g.name, true, { folder: g.folder, owners: ownersOf(g.appid), play: play[g.appid] || {} }));
  }

  // Steam games that were set up in SwapDeck but are no longer installed stay visible as "Not installed".
  for (const [id, cfg] of Object.entries(store.allGameCfgs())) {
    if (!id.startsWith('steam:') || seen.has(id) || !cfg.name) continue;
    const appid = id.slice(6);
    seen.add(id);
    out.push(steamGame(dir, id, appid, cfg.name, false, { owners: ownersOf(appid), play: play[appid] || {}, hours: (known[appid] || {}).hours }));
  }

  // Every other game a saved account owns, as "Not installed" (named from a connected account's game list).
  for (const [appid, k] of Object.entries(known)) {
    const id = steamId(appid);
    if (seen.has(id) || !k.name) continue;
    seen.add(id);
    out.push(steamGame(dir, id, appid, k.name, false, { owners: ownersOf(appid), play: play[appid] || {}, hours: k.hours }));
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
