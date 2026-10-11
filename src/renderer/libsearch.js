// Pure search for the Ctrl K overlay: games (by name, tag or account), accounts, actions and tags.
// No DOM and no app state, so it can be checked with plain node (.pandaos/scratch/tests/libsearch.test.mjs).

const has = (s, q) => String(s).toLowerCase().includes(q);
const LIMITS = { all: { games: 5, accounts: 3, actions: 3, actionsQ: 10 }, games: { games: 30 }, accts: { accounts: 20 }, acts: { actions: 10, actionsQ: 10 } };

// games: [{ id, name, tags, owners, acct, installed, lastPlayed }]; accounts: [{ id, name }]; actions: [{ id, label, keywords }]
export function searchAll({ q = '', cat = 'all', games = [], accounts = [], actions = [], tags = [] }) {
  const query = q.trim().toLowerCase(), lim = LIMITS[cat] || LIMITS.all;
  const want = k => cat === 'all' || cat === k;
  const out = { query, top: null, covers: [], games: [], gamesHead: 'Games', accounts: [], actions: [], tags: [], why: {} };
  if (want('games')) {
    if (!query) {
      if (cat === 'all') out.covers = games.filter(g => g.installed && g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 6).map(g => g.id);
      else out.games = games.slice().sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0)).slice(0, lim.games).map(g => g.id);
    } else {
      const tagHit = tags.filter(t => has(t, query)), acctHit = accounts.filter(a => has(a.name, query)).map(a => a.id);
      const byName = g => has(g.name, query), starts = g => g.name.toLowerCase().startsWith(query);
      const hits = games.filter(g => byName(g) || (g.tags || []).some(t => tagHit.includes(t)) || acctHit.includes(g.acct) || (g.owners || []).some(o => acctHit.includes(o)));
      hits.sort((a, b) => (starts(b) - starts(a)) || (byName(b) - byName(a)) || ((b.lastPlayed || 0) - (a.lastPlayed || 0)));
      let list = hits;
      if (cat === 'all' && hits.length && byName(hits[0])) { out.top = hits[0].id; list = hits.slice(1); }
      out.games = list.slice(0, lim.games).map(g => g.id);
      if (hits.length && !hits.some(byName)) out.gamesHead = tagHit.length ? 'Tagged ' + tagHit[0] : acctHit.length ? 'Played on ' + accounts.find(a => a.id === acctHit[0]).name : 'Games';
      hits.filter(g => !byName(g)).forEach(g => { const t = (g.tags || []).find(x => tagHit.includes(x)); if (t) out.why[g.id] = t; });
    }
  }
  if (want('accts')) out.accounts = accounts.filter(a => !query || has(a.name, query)).slice(0, lim.accounts).map(a => a.id);
  if (want('acts')) out.actions = actions.filter(a => !query || has(a.label + ' ' + (a.keywords || ''), query)).slice(0, query ? lim.actionsQ : lim.actions).map(a => a.id);
  if (cat === 'all' && !query) out.tags = tags.slice();
  return out;
}

// Order in which arrow keys walk the results (matches the render order).
export function resultOrder(r) {
  return [...(r.top ? [['game', r.top]] : []), ...r.covers.map(id => ['game', id]), ...r.games.map(id => ['game', id]), ...r.accounts.map(id => ['acct', id]), ...r.actions.map(id => ['act', id])];
}
