// Library layout: the right-click menu on a game (cover, row or search result). Sub-lists (Play as, Set account,
// Tags) open in place with a Back row, so the menu never runs off the screen.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { accountsOf } from './libgrid.js';
import { openArt } from './libart.js';

const W = 260, H = 420;
const avBg = a => a.avatar ? 'url("' + a.avatar + '") center/cover no-repeat,#111' : a.grad;

export function openGameMenu(app, id, e) {
  e.preventDefault(); e.stopPropagation();
  const x = Math.min(e.clientX, window.innerWidth - W - 8), y = Math.min(e.clientY, window.innerHeight - H - 8);
  app.setState({ gm: { id, x: Math.max(8, x), y: Math.max(52, y), sub: null }, lsDd: null, lsMenu: false });
}

export function hideGame(app, g) {
  const list = app.state.settings.hiddenGames || [];
  app.setCfg({ hiddenGames: [...list.filter(x => x !== g.id), g.id] });
  app.toast('info', g.name + ' is hidden', 'Steam still has it. Show it again from Settings, General.', { label: 'Undo', fn: () => app.setCfg({ hiddenGames: (app.state.settings.hiddenGames || []).filter(x => x !== g.id) }) });
}

function items(app, g) {
  const L = app.state.launch, run = !!(L && L.gid === g.id), close = f => () => { app.setState({ gm: null }); f(); };
  const sub = k => () => app.setState(s => ({ gm: { ...s.gm, sub: k } }));
  const owners = accountsOf(g).map(id => app.find(id)).filter(Boolean);
  return [
    { label: run ? 'Running' : g.installed ? 'Play' : 'Install', ic: g.installed ? 'play' : 'download', off: run, run: close(() => app.play(g.id)) },
    g.steam && g.installed && app.accts.length > 1 && !run ? { label: 'Play as', ic: 'users', more: true, run: sub('as') } : null,
    { label: 'Open page', ic: 'info', run: close(() => app.openGame(g.id)) },
    { sep: true },
    { label: g.fav ? 'Remove from favourites' : 'Add to favourites', ic: 'heart', run: close(() => app.toggleFav(g.id)) },
    { label: 'Tags', ic: 'tags', more: true, run: sub('tags') },
    g.steam ? { label: 'Set account', ic: 'user', more: true, hint: g.acct && app.find(g.acct) ? app.find(g.acct).name : owners.length ? 'Auto' : '', run: sub('acct') } : null,
    { sep: true },
    g.steam ? { label: 'Change artwork', ic: 'grid', run: close(() => openArt(app, g.id)) } : { label: 'Edit game', ic: 'settings', run: close(() => app.openEdit(g.id)) },
    g.installed ? { label: 'Open folder', ic: 'drive', run: close(() => window.api.gameFolder(g.id).then(r => { if (r && !r.ok) app.toast('warning', "Couldn't open the folder", 'It may have moved or been removed.'); })) } : null,
    g.installed ? { label: 'Desktop shortcut', ic: 'external', run: close(() => app.shortcut(g, g.acct && app.find(g.acct), null)) } : null,
    g.steam ? { label: 'Store page', ic: 'external', run: close(() => window.api.openSteamPage('store', g.appid)) } : null,
    { sep: true },
    g.steam ? { label: 'Hide from Library', ic: 'x', danger: true, run: close(() => hideGame(app, g)) } : { label: 'Remove from SwapDeck', ic: 'x', danger: true, run: close(() => app.setState({ rmId: g.id })) },
  ].filter(Boolean);
}

function subItems(app, g, k) {
  const close = f => () => { app.setState({ gm: null }); f(); };
  if (k === 'as') return app.accts.map(a => ({ label: a.name, av: avBg(a), ini: a.avatar ? '' : a.ini, hint: a.current ? 'Signed in' : '', run: close(() => app.play(g.id, a.id)) }));
  if (k === 'acct') {
    const pick = id => close(() => app.gset(g.id, { acct: id }));
    return [{ label: 'Whoever is signed in', ic: 'users', on: !g.acct, run: pick(null) }, ...app.accts.map(a => ({ label: a.name, av: avBg(a), ini: a.avatar ? '' : a.ini, on: g.acct === a.id, run: pick(a.id) }))];
  }
  const tags = app.tagOrder();
  if (!tags.length) return [{ label: 'No tags yet', off: true }];
  return tags.map(t => { const on = (g.tags || []).includes(t); return { label: t, dot: 'rgb(' + app.tagRgb(t) + ')', on, keep: true, run: () => app.setGameTags(g.id, on ? g.tags.filter(x => x !== t) : [...(g.tags || []), t]) }; });
}

const SUB_TITLE = { as: 'Play as', acct: 'Plays as', tags: 'Tags' };

export function libMenuVals(app) {
  const M = app.state.gm, g = M && app.gfind(M.id);
  if (!g) return null;
  const list = M.sub ? subItems(app, g, M.sub) : items(app, g);
  return { name: g.name, x: M.x, y: M.y, title: M.sub ? SUB_TITLE[M.sub] : null, list, close: () => app.setState({ gm: null }), back: () => app.setState(s => ({ gm: { ...s.gm, sub: null } })) };
}

export function gameMenu(P) {
  const row = it => it.sep ? html`<div class="gm-sep"></div>` : html`<button class=${'gm-it' + (it.danger ? ' d' : '') + (it.on ? ' on' : '')} role="menuitem" disabled=${!!it.off} onClick=${it.run}>
${it.av ? html`<span class="gm-av" style=${'background:' + it.av}>${it.ini}</span>` : it.dot ? html`<span class="gm-dot" style=${'background:' + it.dot}></span>` : html`<span class="gm-ic">${it.ic ? icon(it.ic, 15) : null}</span>`}
<span class="gm-l">${it.label}</span>${it.hint ? html`<span class="gm-h">${it.hint}</span>` : null}${it.on ? icon('check', 14) : null}${it.more ? html`<span class="gm-more">${icon('chevron', 14)}</span>` : null}</button>`;
  return html`<div class="gm-catch" onClick=${P.close} onContextMenu=${e => { e.preventDefault(); P.close(); }}></div>
<div class="gm" key=${P.title || "main"} role="menu" aria-label=${P.name} style=${'left:' + P.x + 'px;top:' + P.y + 'px'} ref=${el => { if (el && !el.dataset.f) { el.dataset.f = '1'; setTimeout(() => { const b = el.querySelector('.gm-it:not([disabled])'); if (b) b.focus(); }, 0); } }}
onKeyDown=${e => { const its = [...e.currentTarget.querySelectorAll('.gm-it:not([disabled])')], i = its.indexOf(document.activeElement); if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = its[(i + (e.key === 'ArrowDown' ? 1 : -1) + its.length) % its.length]; if (n) n.focus(); } }}>
${P.title ? html`<button class="gm-it gm-back" onClick=${P.back}><span class="gm-ic">${icon('back', 15)}</span><span class="gm-l">${P.title}</span></button><div class="gm-sep"></div>` : html`<div class="gm-name">${P.name}</div>`}
<div class="gm-list">${P.list.map(row)}</div></div>`;
}
