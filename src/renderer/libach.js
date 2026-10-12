// Library layout: a game's Achievements tab. Progress per account (Steam's files on this PC), how rare each
// achievement is (Steam's public stats, no sign-in), which of your accounts have it, with filters and sorting.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';

const FILTERS = [['all', 'All'], ['got', 'Unlocked'], ['locked', 'Locked']];
const SORTS = [['rare', 'Rarest'], ['recent', 'Recent'], ['name', 'Name']];
const tier = p => p == null ? null : p < 5 ? ['ULTRA RARE', 'ultra'] : p < 15 ? ['RARE', 'rare'] : null;
const day = t => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// Loads every account's full list and the rarity once per game; kept in state.achX until another game opens.
function load(app, g, sids) {
  const X = app.state.achX;
  if (X && X.gid === g.id && sids.every(s => s in X.items)) return;
  const base = X && X.gid === g.id ? X : { gid: g.id, items: {}, rare: undefined };
  const todo = sids.filter(s => !(s in base.items));
  app.setState({ achX: { ...base, items: { ...base.items, ...Object.fromEntries(todo.map(s => [s, null])) } } });
  for (const sid of todo) window.api.gameAchievements(g.appid, sid).catch(() => null).then(r => app.setState(s => s.achX && s.achX.gid === g.id ? { achX: { ...s.achX, items: { ...s.achX.items, [sid]: r && r.items ? r.items : [] } } } : null));
  if (base.rare === undefined) { base.rare = null; window.api.achRarity(g.appid).catch(() => null).then(r => app.setState(s => s.achX && s.achX.gid === g.id ? { achX: { ...s.achX, rare: r || {} } } : null)); }
}

export function libAchVals(app, g) {
  const S = app.state, I = app.gInfoOf(g), list = I && I.local ? I.local.shots.filter(x => x.ach && x.ach.known) : [];
  if (!list.length) return { empty: true };
  load(app, g, list.map(x => x.sid));
  const X = S.achX && S.achX.gid === g.id ? S.achX : { items: {}, rare: null };
  const sel = list.find(x => x.sid === S.achSid) || app.cardAccount(g, list, x => x.ach.unlocked + 1);
  const mine = X.items[sel.sid], rare = X.rare || {}, F = S.achF || 'all', sort = S.achSort || 'rare';
  // Who else has each one, from the other accounts' lists (only those already loaded).
  const others = list.filter(x => x.sid !== sel.sid && Array.isArray(X.items[x.sid])).map(x => ({ look: app.accountLook(x.sid), got: new Set(X.items[x.sid].filter(a => a.got).map(a => a.id)) }));
  let rows = Array.isArray(mine) ? mine.filter(a => F === 'all' || (F === 'got' ? a.got : !a.got)) : [];
  const pct = a => rare[a.id];
  const by = { rare: (a, b) => (pct(a) ?? 101) - (pct(b) ?? 101), recent: (a, b) => (b.at || 0) - (a.at || 0) || (+b.got - +a.got), name: (a, b) => a.name.localeCompare(b.name) };
  rows = rows.slice().sort(by[sort]);
  const total = rows.length, cap = S.achAll ? total : 100;
  rows = rows.slice(0, cap);
  const A = sel.ach, done = A.total ? Math.round(A.unlocked / A.total * 100) : 0;
  return {
    empty: false, loading: !Array.isArray(mine), noList: Array.isArray(mine) && !mine.length, rareKnown: !!X.rare && Object.keys(rare).length > 0,
    accts: list.map(x => ({ ...app.accountLook(x.sid), on: x.sid === sel.sid, count: x.ach.unlocked + '/' + x.ach.total, pick: () => app.setState({ achSid: x.sid }) })),
    head: A.unlocked === A.total ? 'All ' + A.total + ' unlocked' : A.unlocked + ' of ' + A.total + ' unlocked', pct: done, name: app.accountLook(sel.sid).name,
    more: total > cap ? { label: 'Show all ' + total, pick: () => app.setState({ achAll: true }) } : null,
    filters: FILTERS.map(([k, label]) => ({ label, on: F === k, pick: () => app.setState({ achF: k }) })),
    sorts: SORTS.map(([k, label]) => ({ label, on: sort === k, pick: () => app.setState({ achSort: k }) })),
    rows: rows.map(a => ({ name: a.name, desc: a.desc, icon: a.icon, got: a.got, when: a.got ? (a.at ? day(a.at) : 'Unlocked') : 'Locked',
      pct: pct(a) != null ? (pct(a) < 1 ? pct(a).toFixed(1) : Math.round(pct(a))) + '%' : null, tier: tier(pct(a)), bar: pct(a) ?? 0,
      also: others.filter(o => o.got.has(a.id)).map(o => o.look) })),
  };
}

export function achPage(P) {
  if (P.empty) return html`<div class="ac-none">${icon('star', 22)}<span>No achievement progress on this PC yet. Steam keeps it here once an account has played the game.</span></div>`;
  const seg = list => html`<div class="st-seg">${list.map(o => html`<button class=${o.on ? 'on' : ''} aria-pressed=${o.on} onClick=${o.pick}>${o.label}</button>`)}</div>`;
  const head = html`<div class="ac-head"><div class="ac-accts" role="group" aria-label="Whose achievements">${P.accts.map(a => html`<button class=${'ac-acct' + (a.on ? ' on' : '')} aria-pressed=${a.on} onClick=${a.pick}><span class="ac-av" style=${'background:' + a.bg}>${a.img ? '' : a.ini}</span><span>${a.name}</span><em>${a.count}</em></button>`)}</div>
<div class="ac-prog"><b>${P.head}</b><span>${P.pct}%</span><div class="ac-bar"><i style=${'width:' + P.pct + '%'}></i></div></div>
<div class="ac-tools">${seg(P.filters)}<span class="ac-sp"></span><span class="ac-lbl">Sort</span>${seg(P.sorts)}</div></div>`;
  const row = r => html`<div class=${'ac-row' + (r.got ? '' : ' locked')}><span class="ac-ic" style=${r.icon ? 'background-image:url("' + r.icon + '")' : ''}>${r.icon ? null : icon('star', 18)}</span>
<div class="ac-m"><b>${r.name}${r.tier ? html`<em class=${r.tier[1]}>${r.tier[0]}</em>` : null}</b><span>${r.desc}</span>${r.also.length ? html`<span class="ac-also">Also unlocked by ${r.also.map(a => html`<i title=${a.name} style=${'background:' + a.bg}>${a.img ? '' : a.ini}</i>`)}</span>` : null}</div>
<div class="ac-r"><span class="ac-when">${r.when}</span>${r.pct ? html`<span class="ac-pct" title="Players who have it">${r.pct} of players</span><div class="ac-rb"><i style=${'width:' + Math.max(2, r.bar) + '%'}></i></div>` : null}</div></div>`;
  return html`<div class="ac">${head}${P.loading ? html`<div class="ac-none">Loading achievements...</div>` : P.rows.length ? html`<div class="ac-list">${P.rows.map(row)}</div>${P.more ? html`<button class="ac-more" onClick=${P.more.pick}>${P.more.label}</button>` : null}` : html`<div class="ac-none">${P.noList ? "Steam hasn't saved this game's achievement list on this PC." : 'Nothing here with this filter.'}</div>`}
${!P.loading && !P.rareKnown ? html`<div class="ac-fine">How rare each one is comes from Steam when you're online.</div>` : null}</div>`;
}
