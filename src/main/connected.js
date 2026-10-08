// Game details for accounts connected for stats: friends who play a game, and which of its DLC the account owns.
// Uses the account's stored refresh token (never sent anywhere but Steam) to get a short-lived access token and
// store cookies, the same way the Steam client does. Results are cached briefly; any failure is reported, not thrown.

const { LoginSession, EAuthTokenPlatformType } = require('steam-session');
const { get, fetchPublic } = require('./profile');

const ACCESS_TTL = 15 * 60e3, FRIENDS_TTL = 10 * 60e3, OWNED_TTL = 10 * 60e3;
const sessions = new Map(); // sid -> { at, access, cookies }
const friendsCache = new Map(), ownedCache = new Map();

async function signIn(sid, refreshToken, needCookies) {
  const hit = sessions.get(sid);
  if (hit && Date.now() - hit.at < ACCESS_TTL && (!needCookies || hit.cookies)) return hit;
  const session = new LoginSession(EAuthTokenPlatformType.SteamClient);
  session.refreshToken = refreshToken;
  if (session.steamID.getSteamID64() !== sid) throw new Error('The saved sign-in belongs to a different account.');
  const cookies = needCookies ? await session.getWebCookies() : null; // also refreshes the access token
  if (!needCookies) await session.refreshAccessToken();
  const entry = { at: Date.now(), access: session.accessToken, cookies: cookies || (hit && hit.cookies) || null };
  sessions.set(sid, entry);
  return entry;
}

async function api(path, params) {
  const q = new URLSearchParams(params).toString();
  const { status, body } = await get(`https://api.steampowered.com/${path}?${q}`, { timeout: 8000 });
  if (status === 401 || status === 403) throw new Error('Steam refused the saved sign-in. Connect the account again.');
  if (status !== 200) throw new Error('Steam returned HTTP ' + status);
  return JSON.parse(body);
}

// Names and avatars: the Web API in one call, falling back to public profiles for a few friends.
async function profiles(access, ids) {
  if (!ids.length) return {};
  try {
    const j = await api('ISteamUser/GetPlayerSummaries/v2/', { access_token: access, steamids: ids.join(',') });
    const out = {};
    for (const p of (j.response && j.response.players) || []) out[p.steamid] = { name: String(p.personaname || '').slice(0, 64), avatar: p.avatarmedium || p.avatar || null };
    if (Object.keys(out).length) return out;
  } catch {}
  const out = {};
  for (const id of ids.slice(0, 8)) { try { const p = await fetchPublic(id); out[id] = { name: p.name, avatar: p.avatar }; } catch {} }
  return out;
}

const isSid = v => /^\d{17}$/.test(String(v));

async function friendsWhoPlay(sid, refreshToken, appid) {
  const key = sid + ':' + appid, hit = friendsCache.get(key);
  if (hit && Date.now() - hit.at < FRIENDS_TTL) return hit.value;
  const { access } = await signIn(sid, refreshToken, false);
  const j = await api('IPlayerService/GetFriendsGameplayInfo/v1/', { access_token: access, appid });
  const r = j.response || {};
  const recent = (r.played_recently || []).filter(f => isSid(f.steamid)).sort((a, b) => (b.minutes_played || 0) - (a.minutes_played || 0));
  const recentIds = new Set(recent.map(f => String(f.steamid)));
  const ever = (r.played_ever || []).filter(f => isSid(f.steamid) && !recentIds.has(String(f.steamid)));
  const shownRecent = recent.slice(0, 10), shownEver = ever.slice(0, 24);
  const who = await profiles(access, [...shownRecent, ...shownEver].map(f => String(f.steamid)));
  const person = f => ({ sid: String(f.steamid), name: (who[f.steamid] && who[f.steamid].name) || 'Steam friend', avatar: (who[f.steamid] && who[f.steamid].avatar) || null, minutes: Number(f.minutes_played) || 0 });
  const value = { recent: shownRecent.map(person), recentTotal: recent.length, ever: shownEver.map(person), everTotal: ever.length };
  friendsCache.set(key, { at: Date.now(), value });
  return value;
}

// Everything the account owns, games and DLC, as the Steam store sees it.
async function ownedApps(sid, refreshToken) {
  const hit = ownedCache.get(sid);
  if (hit && Date.now() - hit.at < OWNED_TTL) return hit.value;
  const { cookies } = await signIn(sid, refreshToken, true);
  const cookie = (cookies || []).map(c => String(c).split(';')[0]).join('; ');
  const { status, body } = await get('https://store.steampowered.com/dynamicstore/userdata/', { timeout: 8000, headers: { Cookie: cookie } });
  if (status !== 200) throw new Error('Steam store returned HTTP ' + status);
  const owned = new Set(((JSON.parse(body).rgOwnedApps) || []).map(String));
  if (!owned.size) throw new Error('Steam store did not recognise the sign-in.');
  ownedCache.set(sid, { at: Date.now(), value: owned });
  return owned;
}

const fail = e => ({ ok: false, error: String((e && e.message) || e).slice(0, 160) });
async function forGame(sid, refreshToken, appid, dlcIds) {
  const [friends, owned] = await Promise.allSettled([friendsWhoPlay(sid, refreshToken, appid), dlcIds.length ? ownedApps(sid, refreshToken) : Promise.resolve(null)]);
  return {
    friends: friends.status === 'fulfilled' ? { ok: true, ...friends.value } : fail(friends.reason),
    owned: owned.status === 'fulfilled' ? (owned.value ? { ok: true, ids: dlcIds.filter(id => owned.value.has(id)) } : null) : fail(owned.reason),
  };
}

module.exports = { forGame };
