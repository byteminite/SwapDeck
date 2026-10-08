// Public Steam data for a game's details (no sign-in): the developer's announcements and patch notes, and
// the game's DLC with names and art. Fetched only when a game's details open, and cached for a while.

const fs = require('fs');
const path = require('path');
const steam = require('./steam');
const vdf = require('./vdf');
const { get } = require('./profile');

const HOUR = 3600e3, TTL = { news: HOUR, posts: HOUR, dlc: 24 * HOUR };
const MAX_POST = 200000;
const cache = new Map(); // `${kind}:${appid}` -> { at, value }
const isAppid = v => /^\d{1,10}$/.test(String(v));

async function cached(kind, appid, load) {
  const key = kind + ':' + appid, hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL[kind]) return hit.value;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function json(url) {
  const { status, body } = await get(url, { timeout: 8000 });
  if (status !== 200) throw new Error('Steam returned HTTP ' + status);
  return JSON.parse(body);
}

// Official announcements only (the community feed), newest first.
function news(appid) {
  if (!isAppid(appid)) return Promise.resolve([]);
  return cached('news', appid, async () => {
    const j = await json(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appid}&count=12&maxlength=1&feeds=steam_community_announcements&format=json`);
    const items = (j.appnews && Array.isArray(j.appnews.newsitems)) ? j.appnews.newsitems : [];
    return items
      .filter(n => n && /^\d{1,20}$/.test(String(n.gid)) && typeof n.title === 'string')
      .map(n => ({ gid: String(n.gid), title: n.title.slice(0, 200), at: (Number(n.date) || 0) * 1000, patch: Array.isArray(n.tags) && n.tags.includes('patchnotes') }))
      .sort((a, b) => b.at - a.at);
  });
}

// One announcement's full text (Steam's BBCode) for the in-app reader. Same feed as news(), fetched in full.
async function newsPost(appid, gid) {
  if (!isAppid(appid) || !/^\d{1,20}$/.test(String(gid))) return null;
  const posts = await cached('posts', appid, async () => {
    const j = await json(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appid}&count=12&maxlength=0&feeds=steam_community_announcements&format=json`);
    const items = (j.appnews && Array.isArray(j.appnews.newsitems)) ? j.appnews.newsitems : [];
    return items.filter(n => n && /^\d{1,20}$/.test(String(n.gid)) && typeof n.contents === 'string').map(n => ({
      gid: String(n.gid), title: String(n.title || '').slice(0, 200), at: (Number(n.date) || 0) * 1000,
      author: typeof n.author === 'string' ? n.author.slice(0, 80) : '', patch: Array.isArray(n.tags) && n.tags.includes('patchnotes'),
      body: n.contents.slice(0, MAX_POST),
    }));
  });
  return posts.find(p => p.gid === String(gid)) || null;
}

// DLC appids installed with the game, from its app manifest (InstalledDepots … dlcappid).
function installedDlc(dir, appid) {
  for (const lib of steam.libraryDirs(dir || '')) {
    let text;
    try { text = fs.readFileSync(path.join(lib, `appmanifest_${appid}.acf`), 'utf8'); } catch { continue; }
    const depots = vdf.get(vdf.get(vdf.parse(text), 'AppState') || {}, 'InstalledDepots') || {};
    return new Set(Object.values(depots).map(d => String(vdf.get(d, 'dlcappid') || '')).filter(Boolean));
  }
  return new Set();
}

const MAX_DLC = 12;
async function dlc(dir, appid) {
  if (!isAppid(appid)) return { total: 0, items: [] };
  const list = await cached('dlc', appid, async () => {
    const d = await json(`https://store.steampowered.com/api/appdetails?appids=${appid}&filters=basic`);
    const ids = ((d[appid] && d[appid].data && d[appid].data.dlc) || []).filter(isAppid).map(String);
    if (!ids.length) return { total: 0, items: [] };
    const input = { ids: ids.slice(0, MAX_DLC).map(id => ({ appid: Number(id) })), context: { language: 'english', country_code: 'US' }, data_request: { include_assets: true } };
    const r = await json('https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=' + encodeURIComponent(JSON.stringify(input)));
    const items = ((r.response && r.response.store_items) || [])
      .filter(it => it && it.success === 1 && isAppid(it.appid) && typeof it.name === 'string')
      .map(it => ({ appid: String(it.appid), name: it.name.slice(0, 120), art: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${it.appid}/header.jpg` }));
    return { total: ids.length, items };
  });
  const installed = installedDlc(dir, appid);
  return { total: list.total, items: list.items.map(it => ({ ...it, installed: installed.has(it.appid) })) };
}

module.exports = { news, newsPost, dlc };
