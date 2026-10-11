// Props for the Library layout's My games page, built from the App component's state.
import { SUBS, SORTS, SOURCES, accountsOf, applyFilters, sortGames, subCounts, tagCounts, acctCounts, srcCounts } from './libgrid.js';
import { updateBadge } from './updatebadge.js';

const SUB_IC = { all: 'gamepad', inst: 'drive', ni: 'download', never: 'dashed' };
const SRC_IC = { all: 'layers', steam: 'gamepad', ns: 'app' };
const avBg = a => a.avatar ? 'url("' + a.avatar + '") center/cover no-repeat,#111' : a.grad;

function filtersOf(S) { return { sub: S.lsSub || 'all', tag: S.lsTag || null, acct: S.lsAcct || null, src: S.lsSrc || 'all' }; }

// Which account Play would use, and what the cover says about it.
function playInfo(app, g, me, run) {
  if (!g.installed) return ['Installs through Steam', false, null];
  if (run) return ['Running now', false, null];
  if (!g.steam) return ['No Steam account needed', false, null];
  const ids = accountsOf(g), id = g.acct || (ids.includes(me && me.id) ? me.id : ids[0]), a = id && app.find(id);
  if (!a) return ['Plays on whoever is signed in', false, null];
  return a.current ? ['Plays as ' + a.name, false, a] : ['Switches to ' + a.name, true, a];
}

function card(app, g, me, L) {
  const S = app.state, run = !!(L && L.gid === g.id && L.running), [hint, hintSw] = playInfo(app, g, me, run);
  const owners = accountsOf(g).map(id => app.find(id)).filter(Boolean), dotA = g.acct ? app.find(g.acct) : owners[0];
  const upd = g.steam && g.installed && !run ? updateBadge(S.libUpd[g.appid]) : null;
  const flag = run ? { label: 'Running', cls: 'run' } : upd ? { label: upd.label, cls: upd.busy ? 'upd' : 'warn' } : !g.installed ? { label: 'Not installed', cls: '' } : !g.steam ? { label: 'Non-Steam', cls: '' } : null;
  const stop = f => e => { e.stopPropagation(); f(); };
  return {
    id: g.id, name: g.name, bg: app.cardBg(g), ni: !g.installed, fallback: !app.coverOf(g), flag, fav: !!g.fav, hint, hintSw,
    dot: dotA ? avBg(dotA) : 'rgba(var(--fg-rgb),.14)',
    who: !g.steam ? 'No account needed' : g.acct && dotA ? dotA.name : owners.length ? owners.map(a => a.name).join(', ') : 'Any account',
    playLabel: g.installed ? 'Play' : 'Install', playIc: g.installed ? 'play' : 'download',
    onOpen: () => app.openGame(g.id), onInfo: stop(() => app.openGame(g.id)), onPlay: stop(() => app.play(g.id)), onFav: stop(() => app.toggleFav(g.id)),
    onKey: e => { if (e.key === 'Enter' && e.target === e.currentTarget) { e.preventDefault(); e.ctrlKey ? app.play(g.id) : app.openGame(g.id); } },
    onMenu: null,
  };
}

function dd(app, key, label, set, opts, clearPatch, extra) {
  const open = app.state.lsDd === key;
  return { label, set, open, opts, ...extra,
    toggle: () => app.setState(s => ({ lsDd: s.lsDd === key ? null : key })),
    clear: e => { e.stopPropagation(); app.setState({ ...clearPatch, lsDd: null }); } };
}

export function libGamesVals(app) {
  const S = app.state, f = filtersOf(S), me = app.accts.find(a => a.current), L = S.launch;
  const pick = patch => () => app.setState({ ...patch, lsDd: null });
  const games = app.showNotInst() ? S.lib : S.lib.filter(g => g.installed);
  const q = (S.lsQ || '').trim().toLowerCase();
  const searched = q ? games.filter(g => g.name.toLowerCase().includes(q)) : games;
  const shown = sortGames(applyFilters(searched, f), S.lsSort || 'recent', L && L.running ? L.gid : null);
  const subN = subCounts(searched, f), tags = app.tagOrder().filter(t => games.some(g => (g.tags || []).includes(t)));
  const tagN = tagCounts(searched, f, tags), ids = app.accts.map(a => a.id), accN = acctCounts(searched, f, ids), srcN = srcCounts(searched, f);
  const tagDd = dd(app, 'tag', f.tag || 'Tag', !!f.tag, [{ label: 'All tags', ic: 'tags', n: tagN.all, on: !f.tag, pick: pick({ lsTag: null }) }, { sep: true },
    ...tags.map(t => ({ label: t, dot: 'rgb(' + app.tagRgb(t) + ')', n: tagN[t], on: f.tag === t, pick: pick({ lsTag: t }) }))], { lsTag: null });
  const accA = f.acct && app.find(f.acct);
  const acctDd = dd(app, 'acct', accA ? accA.name : 'Account', !!accA, [{ label: 'Any account', ic: 'users', n: accN.all, on: !f.acct, pick: pick({ lsAcct: null }) }, { sep: true }, { head: 'PLAYS AS OR OWNED BY' },
    ...app.accts.map(a => ({ label: a.name, av: avBg(a), n: accN[a.id], on: f.acct === a.id, pick: pick({ lsAcct: a.id }) }))], { lsAcct: null });
  const srcDd = dd(app, 'src', f.src === 'all' ? 'Source' : SOURCES.find(s => s[0] === f.src)[1], f.src !== 'all',
    SOURCES.map(([k, l]) => ({ label: l, ic: SRC_IC[k], n: srcN[k], on: f.src === k, pick: pick({ lsSrc: k }) })), { lsSrc: 'all' });
  const sortK = S.lsSort || 'recent';
  const sortDd = dd(app, 'sort', SORTS.find(s => s[0] === sortK)[1], false, SORTS.map(([k, l]) => ({ label: l, on: sortK === k, pick: pick({ lsSort: k }) })), {}, { right: true });
  const anyFilter = !!(f.tag || f.acct || f.src !== 'all' || q);
  return {
    lsGames: {
      subs: SUBS.map(([k, label]) => ({ label, ic: SUB_IC[k], n: subN[k], on: f.sub === k, pick: () => app.setState({ lsSub: k }) })),
      tagDd, acctDd, srcDd, sortDd, ddOpen: !!S.lsDd, closeDd: () => app.setState({ lsDd: null }),
      q: S.lsQ || '', onQ: e => app.setState({ lsQ: e.target.value }), onAdd: () => app.openAddGame(),
      anyFilter, shown: shown.length, total: applyFilters(games, { ...f, tag: null, acct: null, src: 'all' }).length,
      clear: () => app.setState({ lsTag: null, lsAcct: null, lsSrc: 'all', lsQ: '', lsDd: null }),
      loading: S.libLoading && !S.lib.length, cards: shown.map(g => card(app, g, me, L)),
    },
  };
}
