// Stats for linked accounts: a short-lived steam-user session using the stored refresh token,
// plus the CS2 game coordinator for ranks, level, commendations and cooldowns.

const SteamUser = require('steam-user');
const GlobalOffensive = require('globaloffensive');
const Protos = require('globaloffensive/protobufs/generated/_load.js');
const Language = require('globaloffensive/language.js');
const { decodeProto } = require('globaloffensive/lib/proto-decode.js');
const { get } = require('./profile');

const CS2 = 730;
const XP_BASE = 327680000;
const RANK_TYPES = { comp: 6, wing: 7, premier: 11 };
const RANK_NAMES = ['Unranked', 'Silver I', 'Silver II', 'Silver III', 'Silver IV', 'Silver Elite', 'Silver Elite Master',
  'Gold Nova I', 'Gold Nova II', 'Gold Nova III', 'Gold Nova Master', 'Master Guardian I', 'Master Guardian II',
  'Master Guardian Elite', 'Distinguished Master Guardian', 'Legendary Eagle', 'Legendary Eagle Master',
  'Supreme Master First Class', 'The Global Elite'];
const PENALTY = {
  1: 'Kicked too many times', 2: 'Killed too many teammates', 3: 'Killed a teammate at round start',
  4: 'Disconnected for too long', 5: 'Abandoned a match', 6: 'Did too much team damage',
  7: 'Dealt team damage at round start', 8: 'Untrusted launch', 9: 'Kicked too many times',
  10: 'Convicted by Overwatch (major)', 11: 'Convicted by Overwatch (minor)', 14: 'Failed to connect to a match',
  15: 'Kicked out of a match', 16: 'Skill group calibration', 19: 'Reports from other players',
};

class LinkError extends Error {
  constructor(msg, code) { super(msg); this.code = code; }
}

function once(emitter, event, ms) {
  return new Promise(resolve => {
    const t = setTimeout(() => { emitter.removeListener(event, h); resolve(null); }, ms);
    const h = (...args) => { clearTimeout(t); resolve(args); };
    emitter.once(event, h);
  });
}

// steam-user throws asynchronously on a malformed token, so vet it up front.
function checkToken(sid, token) {
  let claims = null;
  try {
    const parts = String(token || '').split('.');
    if (parts.length === 3) claims = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch {}
  if (!claims || claims.iss !== 'steam' || String(claims.sub) !== sid) {
    throw new LinkError('The saved sign-in is invalid. Link the account again.', 'relink');
  }
  if (claims.exp && claims.exp * 1000 < Date.now()) {
    throw new LinkError('The saved sign-in expired. Link the account again.', 'relink');
  }
}

function logOn(client, refreshToken) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { cleanup(); reject(new LinkError("Couldn't reach Steam. Check your connection and try again.", 'network')); }, 30000);
    const ok = () => { cleanup(); resolve(); };
    const bad = err => {
      cleanup();
      // InvalidPassword, AccessDenied, Expired, Revoked etc. all mean the token is no good anymore.
      if ([5, 15, 27, 26, 84].includes(err.eresult) || /token/i.test(err.message)) {
        reject(new LinkError('The saved sign-in expired or was revoked. Link the account again.', 'relink'));
      } else reject(new LinkError(`Steam said: ${err.message}`, 'steam'));
    };
    const cleanup = () => { clearTimeout(t); client.removeListener('loggedOn', ok); client.removeListener('error', bad); };
    client.once('loggedOn', ok);
    client.once('error', bad);
    client.logOn({ refreshToken, logonID: 0x53574450 });
  });
}

async function fetchInventoryCollectibles(sid, cookies) {
  if (!cookies) return null;
  try {
    const { status, body } = await get(`https://steamcommunity.com/inventory/${sid}/730/2?l=english&count=2000`, {
      headers: { Cookie: cookies.join('; ') },
    });
    if (status !== 200) return null;
    const inv = JSON.parse(body);
    const seen = new Set();
    return (inv.descriptions || [])
      .filter(d => (d.tags || []).some(t => t.internal_name === 'CSGO_Type_Collectible'))
      .filter(d => !seen.has(d.market_hash_name || d.name) && seen.add(d.market_hash_name || d.name))
      .map(d => ({ name: d.market_name || d.name, icon: d.icon_url ? `https://community.fastly.steamstatic.com/economy/image/${d.icon_url}/96fx96f` : null }));
  } catch {
    return null;
  }
}

async function fetchCs2(client, csgo, sid, webP) {
  // Don't touch the GC if this account is in a game somewhere else: it would kick that session.
  if (client.playingState && client.playingState.blocked) {
    return { cs2: null, note: 'in-game' };
  }

  let prime = null;
  let rankings = [];
  let rankGot = () => {};
  const rankP = new Promise(r => { rankGot = r; setTimeout(r, 6000); });
  const onGC = (appid, msgType, payload) => {
    if (appid !== CS2) return;
    try {
      if (msgType === Language.ClientWelcome) {
        const w = decodeProto(Protos.CMsgClientWelcome, payload);
        for (const c of w.outofdate_subscribed_caches || []) {
          for (const o of c.objects || []) {
            if (o.type_id === 7 && o.object_data && o.object_data[0]) {
              const acc = decodeProto(Protos.CSOEconGameAccountClient, o.object_data[0]);
              prime = acc.elevated_state === 5;
            }
          }
        }
      } else if (msgType === Language.ClientGCRankUpdate) {
        rankings = rankings.concat(decodeProto(Protos.CMsgGCCStrike15_v2_ClientGCRankUpdate, payload).rankings || []);
        rankGot();
      }
    } catch {}
  };
  client.on('receivedFromGC', onGC);

  try {
    const helloP = once(csgo, 'accountData', 25000);
    client.gamesPlayed([CS2]);
    const conn = await once(csgo, 'connectedToGC', 25000);
    if (!conn) return { cs2: null, note: 'gc-timeout' };
    const hello = csgo.accountData || (await helloP || [])[0];
    if (!hello) return { cs2: null, note: 'gc-timeout' };

    csgo._send(Language.ClientGCRankUpdate, Protos.CMsgGCCStrike15_v2_ClientGCRankUpdate, {
      rankings: Object.values(RANK_TYPES).map(rank_type_id => ({ rank_type_id })),
    });
    await rankP;
    await new Promise(r => setTimeout(r, 600)); // replies can arrive as separate messages

    const all = [hello.ranking, ...(hello.rankings || []), ...rankings].filter(Boolean);
    const rank = type => {
      const rs = all.filter(r => r.rank_type_id === type);
      if (!rs.length) return null;
      // CS2 competitive is per map; show the best one.
      const best = rs.reduce((a, b) => {
        const bestMap = x => Math.max(x.rank_id || 0, ...(x.per_map_rank || []).map(p => p.rank_id || 0));
        return bestMap(b) > bestMap(a) ? b : a;
      });
      const perMap = best.per_map_rank || [];
      const top = perMap.reduce((a, p) => (p.rank_id || 0) > (a.rank_id || 0) ? p : a, { rank_id: best.rank_id || 0, wins: best.wins || 0 });
      const wins = perMap.length ? perMap.reduce((s, p) => s + (p.wins || 0), 0) : (best.wins || 0);
      return { id: top.rank_id || 0, wins };
    };

    const pr = rank(RANK_TYPES.premier);
    const comp = rank(RANK_TYPES.comp);
    const wing = rank(RANK_TYPES.wing);
    const com = hello.commendation || {};
    const pen = hello.penalty_seconds || 0;
    const web = await webP;
    const medals = await fetchInventoryCollectibles(sid, web && web[1]);

    return {
      cs2: {
        prime,
        premier: pr && pr.id ? pr.id : null,
        premierWins: pr ? pr.wins : 0,
        comp: comp ? { name: RANK_NAMES[comp.id] || `Rank ${comp.id}`, i: comp.id, wins: comp.wins } : null,
        wing: wing ? { name: RANK_NAMES[wing.id] || `Rank ${wing.id}`, i: wing.id, wins: wing.wins } : null,
        level: hello.player_level || 0,
        xp: Math.max(0, (hello.player_cur_xp || XP_BASE) - XP_BASE),
        xpMax: 5000,
        com: { f: com.cmd_friendly || 0, t: com.cmd_teaching || 0, l: com.cmd_leader || 0 },
        cd: pen > 0 ? {
          kind: hello.penalty_reason === 10 || hello.penalty_reason === 11 ? 'Overwatch penalty' : 'Competitive cooldown',
          reason: PENALTY[hello.penalty_reason] || `Penalty code ${hello.penalty_reason}`,
          until: Date.now() + pen * 1000,
        } : null,
        medals,
        vacBanned: !!hello.vac_banned,
      },
      note: null,
    };
  } finally {
    client.removeListener('receivedFromGC', onGC);
    try { client.gamesPlayed([]); } catch {}
  }
}

// onStep(i): 1 = account data ready, 2 = games ready, 3 = CS2 ready (matches the design's 4-step progress).
async function fetchLinked(sid, refreshToken, onStep, onNewToken) {
  checkToken(sid, refreshToken);
  const client = new SteamUser({ dataDirectory: null, autoRelogin: false, renewRefreshTokens: true, enablePicsCache: false });
  const csgo = new GlobalOffensive(client);
  const got = { wallet: null, vac: null, lim: null };
  client.on('error', () => {});
  csgo.on('error', () => {});
  client.on('refreshToken', t => onNewToken && onNewToken(t));
  client.on('wallet', (has, currency, balance) => { got.wallet = has ? SteamUser.formatCurrency(balance, currency) : 'No wallet'; });
  client.on('vacBans', (numBans, appids) => { got.vac = { numBans, appids }; });
  client.on('accountLimitations', (limited, communityBanned, locked) => { got.lim = { limited, communityBanned, locked }; });
  const friendsP = once(client, 'friendsList', 8000);
  const playingP = once(client, 'playingState', 4000);
  const webP = once(client, 'webSession', 12000);

  try {
    await logOn(client, refreshToken);
    if (client.steamID.getSteamID64() !== sid) throw new LinkError('The saved sign-in belongs to a different account. Link again.', 'relink');

    const levels = await client.getSteamLevels([sid]).catch(() => null);
    await friendsP;
    const friends = Object.values(client.myFriends || {}).filter(v => v === SteamUser.EFriendRelationship.Friend).length;
    onStep(1);

    const owned = await client.getUserOwnedApps(sid, { includePlayedFreeGames: true }).catch(() => ({ apps: [] }));
    const games = (owned.apps || []).map(a => ({
      appid: String(a.appid),
      n: a.name || `App ${a.appid}`,
      h: Math.round((a.playtime_forever || 0) / 6) / 10,
      w: Math.round((a.playtime_2weeks || 0) / 6) / 10,
      icon: a.img_icon_url ? `https://media.steampowered.com/steamcommunity/public/images/apps/${a.appid}/${a.img_icon_url}.jpg` : null,
    }));
    onStep(2);

    const vacIds = new Set(((got.vac && got.vac.appids) || []).map(String));
    const vacGames = games.filter(g => vacIds.has(g.appid)).map(g => g.n);
    const acct = {
      level: levels ? levels.users[sid] ?? null : null,
      wallet: got.wallet,
      friends,
      vacCount: got.vac ? got.vac.numBans : 0,
      vacGames,
      limited: got.lim ? !!got.lim.limited : null,
      communityBanned: got.lim ? !!got.lim.communityBanned : null,
      locked: got.lim ? !!got.lim.locked : null,
    };

    await playingP;
    let cs = { cs2: null, note: 'not-played' };
    if (games.some(g => g.appid === String(CS2))) cs = await fetchCs2(client, csgo, sid, webP);
    if (cs.cs2 && cs.cs2.prime != null) acct.prime = cs.cs2.prime;
    onStep(3);

    return { acct, games, cs2: cs.cs2, cs2Note: cs.note };
  } finally {
    try { client.logOff(); } catch {}
  }
}

module.exports = { fetchLinked, LinkError };
