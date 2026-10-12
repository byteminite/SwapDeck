// Library layout: the Ctrl K search overlay (games, accounts, actions, tags) with keyboard control.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { searchAll, resultOrder } from './libsearch.js';
import { card, libList } from './libgamesvals.js';
import { openGameMenu } from './libmenu.js';
import { libSwitch } from './libacctvals.js';
import { updatingGames } from './libupd.js';
import { accountsOf } from './libgrid.js';

const CATS = [['all', 'Everything', 'layers'], ['games', 'Games', 'gamepad'], ['accts', 'Accounts', 'users'], ['acts', 'Actions', 'rocket']];
const avBg = a => a.avatar ? 'url("' + a.avatar + '") center/cover no-repeat,#111' : a.grad;
const DAY = 86400000, midnight = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
function played(ms) {
  if (!ms) return 'Not played yet';
  const d = Math.round((midnight(Date.now()) - midnight(ms)) / DAY);
  return d < 1 ? 'Played today' : d === 1 ? 'Played yesterday' : d < 30 ? 'Played ' + d + ' days ago' : d < 365 ? 'Played ' + Math.floor(d / 30) + ' months ago' : 'Played over a year ago';
}

export function openSpot(app) { app.setState({ lsSpot: true, spQ: '', spCat: 'all', spSel: 0, lsMenu: false, lsDd: null }); }

function actionList(app) {
  const close = f => () => { app.setState({ lsSpot: false }); f(); };
  const page = (k, extra) => close(() => app.setState({ libPage: k, gd: null, drawerId: null, ...extra }));
  const unlinked = app.accts.filter(a => !a.linked).length, upd = updatingGames(app).length;
  return [
    { id: 'settings', label: 'Open settings', ic: 'settings', keywords: 'settings appearance layout theme', run: close(() => app.openSettings()) },
    { id: 'add', label: 'Add an account', ic: 'userplus', keywords: 'add account new login sign in', run: close(() => app.addAcc()) },
    unlinked ? { id: 'connect', label: 'Connect all accounts', ic: 'link', keywords: 'connect stats link all', run: close(() => app.connectAll()) } : null,
    { id: 'upd', label: upd ? 'Show updates (' + upd + ')' : 'Show updates', ic: 'refresh', keywords: 'updates downloads', run: page('upd') },
    { id: 'ni', label: 'Show not installed games', ic: 'download', keywords: 'not installed uninstalled', run: page('games', { lsSub: 'ni' }) },
    { id: 'ns', label: 'Add a non-Steam game', ic: 'plus', keywords: 'add non-steam program exe game', run: close(() => app.openAddGame()) },
    { id: 'dl', label: 'Open Steam downloads', ic: 'external', keywords: 'steam downloads', run: close(() => window.api.openSteamPage('downloads', 0)) },
    { id: 'classic', label: 'Switch to the Classic layout', ic: 'grid', keywords: 'classic layout old view', run: close(() => app.setCfg({ layout: 'classic' })) },
  ].filter(Boolean);
}

export function libSpotVals(app) {
  const S = app.state; if (!S.lsSpot) return null;
  const me = app.accts.find(a => a.current), L = S.launch, q = S.spQ || '', cat = S.spCat || 'all';
  const all = libList(app), games = app.showNotInst() ? all : all.filter(g => g.installed);
  const acts = actionList(app), tags = app.tagOrder().filter(t => games.some(g => (g.tags || []).includes(t)));
  const r = searchAll({ q, cat, tags, actions: acts, accounts: app.accts.map(a => ({ id: a.id, name: a.name })),
    games: games.map(g => ({ id: g.id, name: g.name, tags: g.tags, owners: accountsOf(g), acct: g.acct, installed: g.installed, lastPlayed: g.lastPlayed })) });
  const remember = t => app.setCfg({ spRecent: [t, ...(S.settings.spRecent || []).filter(x => x.toLowerCase() !== t.toLowerCase())].slice(0, 4) });
  const close = () => app.setState({ lsSpot: false });
  const game = id => { const g = app.gfind(id), c = card(app, g, me, L);
    const st = c.flag && c.flag.label !== 'Non-Steam' ? c.flag.label : played(g.lastPlayed);
    return { name: g.name, cap: app.cardBg(g), hero: g.steam && g.hero ? 'url("' + g.hero + '") center 30%/cover no-repeat,' + app.gradOf(g) : app.cardBg(g), line: c.hint + ' · ' + st, why: r.why[id],
      playLabel: c.flag && c.flag.cls === 'run' ? 'Running' : c.playLabel, playIc: c.playIc,
      menu: e => { close(); openGameMenu(app, g.id, e); },
      run: () => { remember(g.name); close(); app.openGame(g.id); }, play: () => { remember(g.name); close(); app.play(g.id); } }; };
  const acct = id => { const a = app.find(id);
    return { name: a.name, ini: a.avatar ? '' : a.ini, bg: avBg(a), cur: a.current, line: a.current ? 'Signed in now' : (a.linked ? 'Saved account' : 'Not connected for stats'),
      run: () => { remember(a.name); close(); a.current ? app.openDetails(a.id) : libSwitch(app, a.id); } }; };
  const act = id => { const x = acts.find(a => a.id === id); return { ...x, play: x.run }; };
  const order = resultOrder(r), items = order.map(([k, id]) => k === 'game' ? game(id) : k === 'acct' ? acct(id) : act(id));
  const sel = Math.min(S.spSel || 0, Math.max(0, items.length - 1));
  const at = i => ({ ...items[i], i, sel: i === sel, pick: items[i].run });
  let i = 0; const take = list => list.map(() => at(i++));
  const top = r.top ? at(i++) : null, covers = take(r.covers), gameRows = take(r.games), acctRows = take(r.accounts), actRows = take(r.actions);
  const move = d => { if (!items.length) return; app.setState({ spSel: (sel + d + items.length) % items.length }); requestAnimationFrame(() => { const el = document.querySelector('.sp-body .sel'); if (el) el.scrollIntoView({ block: 'nearest' }); }); };
  return {
    q, close, cats: CATS.map(([k, label, ic]) => ({ label, ic, on: cat === k, pick: () => app.setState({ spCat: k, spSel: 0 }) })),
    recent: q ? [] : (S.settings.spRecent || []).map(t => ({ label: t, pick: () => app.setState({ spQ: t, spSel: 0 }) })),
    onQ: e => app.setState({ spQ: e.target.value, spSel: 0 }),
    onKey: e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); move(e.key === 'ArrowDown' ? 1 : -1); }
      else if (e.key === 'Enter' && items[sel]) { e.preventDefault(); (e.ctrlKey ? items[sel].play || items[sel].run : items[sel].run)(); }
    },
    top, covers, gameRows, gamesHead: r.gamesHead, acctRows, actRows, any: items.length > 0,
    tags: r.tags.map(t => ({ label: t, dot: 'rgb(' + app.tagRgb(t) + ')', pick: () => { close(); app.setState({ libPage: 'games', gd: null, drawerId: null, lsSub: 'all', lsTag: t }); } })),
    noGames: !S.lib.length && !q && cat !== 'accts' && cat !== 'acts', noAccts: !app.accts.length && !q && (cat === 'all' || cat === 'accts'),
    onAddGame: () => { close(); app.openAddGame(); }, onAddAcct: () => { close(); app.addAcc(); },
  };
}

const hl = (t, q) => { const i = q ? t.toLowerCase().indexOf(q.trim().toLowerCase()) : -1, n = q.trim().length;
  return i < 0 || !n ? t : html`${t.slice(0, i)}<mark>${t.slice(i, i + n)}</mark>${t.slice(i + n)}`; };
const hint = label => html`<span class="sp-hint">${label} ${icon('enter', 13)}</span>`;

export function spotOverlay(P) {
  const q = P.q;
  const top = P.top ? html`<div class="sp-sec">Top result</div><div role="button" tabindex="-1" class=${'sp-top' + (P.top.sel ? ' sel' : '')} style=${'background:' + P.top.hero} onClick=${P.top.pick}><div class="sp-tm"><div class="sp-k">GAME</div><b>${hl(P.top.name, q)}</b><span>${P.top.line}</span></div>
<button class="sp-pl" disabled=${P.top.playLabel === 'Running'} onClick=${e => { e.stopPropagation(); P.top.play(); }}>${icon(P.top.playIc, 14)}${P.top.playLabel}</button></div>` : null;
  const covers = P.covers.length ? html`<div class="sp-sec">Recently played</div><div class="sp-covers">${P.covers.map(c => html`<button class=${'sp-cv' + (c.sel ? ' sel' : '')} tabindex="-1" onClick=${c.pick}><i style=${'background:' + c.cap}></i><span>${c.name}</span></button>`)}</div>` : null;
  const row = (x, lead, name, line, h) => html`<button class=${'sp-it' + (x.sel ? ' sel' : '')} tabindex="-1" onClick=${x.pick} onContextMenu=${x.menu}>${lead}<span class="sp-m"><b>${name}</b>${line ? html`<span>${line}</span>` : null}</span>${x.why ? html`<span class="sp-why">${x.why}</span>` : null}${hint(h)}</button>`;
  const games = P.gameRows.length ? html`<div class="sp-sec">${P.gamesHead}</div>${P.gameRows.map(g => row(g, html`<span class="sp-cap" style=${'background:' + g.cap}></span>`, hl(g.name, q), g.line, 'Open'))}` : null;
  const accts = P.acctRows.length ? html`<div class="sp-sec">Accounts</div>${P.acctRows.map(a => row(a, html`<span class="sp-av" style=${'background:' + a.bg}>${a.ini}</span>`, html`${a.cur ? '' : 'Switch to '}${hl(a.name, q)}`, a.line, a.cur ? 'Details' : 'Switch'))}` : null;
  const acts = P.actRows.length ? html`<div class="sp-sec">Actions</div>${P.actRows.map(x => row(x, html`<span class="sp-ic">${icon(x.ic, 15)}</span>`, hl(x.label, q), '', 'Run'))}` : null;
  const tags = P.tags.length ? html`<div class="sp-sec">Tags</div><div class="sp-tags">${P.tags.map(t => html`<button class="sp-tag" tabindex="-1" onClick=${t.pick}><i style=${'background:' + t.dot}></i>${t.label}</button>`)}</div>` : null;
  const empty = (ic, title, text, label, fn) => html`<div class="sp-empty"><span class="sp-ic">${icon(ic, 16)}</span><span class="sp-m"><b>${title}</b><span>${text}</span></span><button class="ap-sm" onClick=${fn}>${label}</button></div>`;
  const body = html`${P.noGames ? empty('grid', 'No games yet', 'Installed games and games your accounts own show up here.', 'Add a game', P.onAddGame) : null}
${P.noAccts ? empty('userplus', 'No accounts yet', 'Add one to switch and play from search.', 'Add account', P.onAddAcct) : null}
${top}${covers}${games}${accts}${acts}${tags}${!P.any && q ? html`<div class="sp-none"><b>Nothing matches "${q}"</b>Try a game name, a tag or an account.</div>` : null}`;
  return html`<div class="sp-dim" onClick=${e => { if (e.target === e.currentTarget) P.close(); }}><div class="sp" role="dialog" aria-label="Search">
<div class="sp-in">${icon('search', 20)}<input value=${q} placeholder="Search games, accounts, tags or actions" aria-label="Search" onInput=${P.onQ} onKeyDown=${P.onKey} ref=${el => { if (el && !el.dataset.f) { el.dataset.f = '1'; setTimeout(() => el.focus(), 0); } }} /><kbd>Esc</kbd></div>
${P.recent.length ? html`<div class="sp-recent">${P.recent.map(r => html`<button onClick=${r.pick}>${icon('history', 13)}${r.label}</button>`)}</div>` : null}
<div class="sp-cols"><div class="sp-cats">${P.cats.map(c => html`<button class=${c.on ? 'on' : ''} aria-pressed=${c.on} onClick=${c.pick}>${icon(c.ic, 15)}${c.label}</button>`)}</div><div class="sp-body">${body}</div></div>
<div class="sp-foot"><span><kbd>↑</kbd><kbd>↓</kbd>move</span><span><kbd>Enter</kbd>open</span><span><kbd>Ctrl</kbd><kbd>Enter</kbd>play</span></div></div></div>`;
}
