// Achievements from Steam's own cache on this PC (appcache/stats), per account, with no sign-in.
// UserGameStatsSchema_<appid>.bin lists a game's achievements; UserGameStats_<accountid>_<appid>.bin holds,
// per stat block, a bitmask of what that account unlocked and the unlock times. Read only.

const fs = require('fs');
const path = require('path');
const bin = require('./binvdf');

const ICONS = 'https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/';
const statsDir = dir => path.join(dir, 'appcache', 'stats');
const readBin = file => { try { return bin.parse(fs.readFileSync(file)); } catch { return null; } };
// Text in the schema is either a plain string or one entry per language.
const text = v => typeof v === 'string' ? v : v && typeof v === 'object' ? (v.english || Object.values(v).find(x => typeof x === 'string') || '') : '';
const iconUrl = (appid, f) => typeof f === 'string' && /^[0-9a-f]{40}\.(jpg|png)$/i.test(f) ? ICONS + appid + '/' + f : null;

// The game's achievements in schema order, or null when Steam has no schema for it (no achievements).
function schemaOf(dir, appid) {
  const root = readBin(path.join(statsDir(dir), `UserGameStatsSchema_${appid}.bin`));
  const stats = root && root[String(appid)] && root[String(appid)].stats;
  if (!stats) return null;
  const list = [];
  for (const [block, s] of Object.entries(stats)) {
    if (!s || typeof s.bits !== 'object') continue;
    for (const [bit, b] of Object.entries(s.bits)) {
      const d = (b && b.display) || {};
      list.push({ id: String(b.name || block + '_' + bit), block, bit: Number(bit), name: text(d.name) || String(b.name || ''), desc: text(d.desc), hidden: String(d.hidden) === '1',
        icon: iconUrl(appid, d.icon), iconGray: iconUrl(appid, d.icon_gray) });
    }
  }
  return list.length ? list : null;
}

// One account's progress: null if the game has no achievements; known=false if this account has no stats here.
function achievements(dir, accountId, appid) {
  if (!dir || !/^\d{1,10}$/.test(String(appid)) || !/^\d{1,12}$/.test(String(accountId))) return null;
  const list = schemaOf(dir, appid);
  if (!list) return null;
  const user = readBin(path.join(statsDir(dir), `UserGameStats_${accountId}_${appid}.bin`));
  const cache = (user && user.cache) || null;
  const items = list.map(a => {
    const entry = cache && cache[a.block];
    const got = !!entry && ((Number(entry.data) >>> a.bit) & 1) === 1;
    const t = got && entry.AchievementTimes ? Number(entry.AchievementTimes[String(a.bit)]) || 0 : 0;
    // Like Steam, a hidden achievement keeps its name secret until it is unlocked.
    const secret = a.hidden && !got;
    return { id: a.id, name: secret ? 'Hidden achievement' : a.name, desc: secret ? 'Keep playing to find out.' : a.desc, hidden: secret, icon: secret ? null : got ? a.icon : (a.iconGray || a.icon), got, at: t * 1000 };
  });
  const unlocked = items.filter(a => a.got).sort((a, b) => b.at - a.at);
  return { known: !!cache, total: items.length, unlocked: unlocked.length, latest: unlocked.slice(0, 3), items: [...unlocked, ...items.filter(a => !a.got)] };
}

// Small enough to send for every account when a game's details open; the full list is fetched on "Show all".
const summary = a => a && { known: a.known, total: a.total, unlocked: a.unlocked, latest: a.latest };

module.exports = { achievements, summary };
