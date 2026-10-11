// Library layout: which games show on My games, in what order, and the counts for tabs and filters.
// Pure functions (no app state), so they can be checked on their own.

export const SUBS = [['all', 'All games'], ['inst', 'Installed'], ['ni', 'Not installed'], ['never', 'Never played']];
export const SORTS = [['recent', 'Last played'], ['hours', 'Most played'], ['name', 'Name']];
export const SOURCES = [['all', 'All sources'], ['steam', 'Steam'], ['ns', 'Non-Steam']];

// Accounts that can play a game: the picked one, else every owner SwapDeck knows about.
export const accountsOf = g => (g.acct ? [g.acct] : (g.owners || []));

const inSub = (g, sub) => sub === 'all' || (sub === 'inst' && g.installed) || (sub === 'ni' && !g.installed) || (sub === 'never' && !g.lastPlayed && !g.hours);

// f = { sub, tag, acct, src }; `skip` leaves one filter out (dropdowns count what picking an option would give).
export function applyFilters(games, f, skip) {
  return games.filter(g => (skip === 'sub' || inSub(g, f.sub))
    && (skip === 'tag' || !f.tag || (g.tags || []).includes(f.tag))
    && (skip === 'acct' || !f.acct || accountsOf(g).includes(f.acct))
    && (skip === 'src' || f.src === 'all' || (f.src === 'steam') === !!g.steam));
}

const byName = (x, y) => x.name.localeCompare(y.name);
const SORTERS = {
  name: byName,
  hours: (x, y) => ((y.hours || 0) - (x.hours || 0)) || byName(x, y),
  recent: (x, y) => ((y.lastPlayed || 0) - (x.lastPlayed || 0)) || byName(x, y),
};

export function sortGames(games, sort, runningId) {
  const by = SORTERS[sort] || SORTERS.recent;
  return games.slice().sort((x, y) => (+(y.id === runningId) - +(x.id === runningId)) || by(x, y));
}

export function subCounts(games, f) {
  const base = applyFilters(games, f, 'sub');
  return Object.fromEntries(SUBS.map(([k]) => [k, base.filter(g => inSub(g, k)).length]));
}

export function tagCounts(games, f, tags) {
  const base = applyFilters(games, f, 'tag');
  return { all: base.length, ...Object.fromEntries(tags.map(t => [t, base.filter(g => (g.tags || []).includes(t)).length])) };
}

export function acctCounts(games, f, ids) {
  const base = applyFilters(games, f, 'acct');
  return { all: base.length, ...Object.fromEntries(ids.map(id => [id, base.filter(g => accountsOf(g).includes(id)).length])) };
}

export function srcCounts(games, f) {
  const base = applyFilters(games, f, 'src');
  return { all: base.length, steam: base.filter(g => g.steam).length, ns: base.filter(g => !g.steam).length };
}
