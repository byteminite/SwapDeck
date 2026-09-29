// Public Steam Community profile, read from the ?xml=1 endpoint (no sign-in needed).

const https = require('https');

function get(url, { headers = {}, timeout = 12000, redirects = 3 } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'SwapDeck/1.1', ...headers }, timeout }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        resolve(get(new URL(res.headers.location, url).toString(), { headers, timeout, redirects: redirects - 1 }));
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
  });
}

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`));
  return m ? m[1].trim() : null;
}

async function fetchPublic(sid) {
  const { status, body } = await get(`https://steamcommunity.com/profiles/${sid}/?xml=1`);
  if (status === 429) throw new Error('Steam is rate-limiting profile requests. Try again in a minute.');
  if (status !== 200) throw new Error(`Steam Community returned HTTP ${status}`);
  const err = tag(body, 'error');
  if (err || !body.includes('<profile>')) throw new Error(err || 'Unexpected response from Steam Community');

  const online = (tag(body, 'onlineState') || 'offline').toLowerCase();
  const msg = (tag(body, 'stateMessage') || '').replace(/<br\s*\/?>/gi, '\n');
  const privacy = (tag(body, 'privacyState') || 'public').toLowerCase();
  let st = 'offline';
  if (online === 'in-game') st = 'ingame';
  else if (online === 'online') st = /away|snooze/i.test(msg) ? 'away' : 'online';
  const trade = (tag(body, 'tradeBanState') || 'None').toLowerCase();

  return {
    name: tag(body, 'steamID'),
    st,
    game: st === 'ingame' ? (tag(body, 'gameName') || msg.split('\n')[1] || 'a game') : null,
    priv: privacy !== 'public',
    vac: tag(body, 'vacBanned') === '1',
    trade: trade === 'none' ? 'none' : trade.includes('probation') ? 'probation' : 'banned',
    lim: tag(body, 'isLimitedAccount') === '1',
    since: tag(body, 'memberSince'),
    avatar: tag(body, 'avatarFull'),
  };
}

module.exports = { fetchPublic, get };
