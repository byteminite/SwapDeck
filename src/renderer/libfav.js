// Library layout: Favourites (big cards in your own order, drag to reorder, suggestions to add).
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { dropdown } from './libgames.js';
import { card, libList } from './libgamesvals.js';

const SORTS = [['mine', 'Your order'], ['last', 'Last played'], ['name', 'Name']];
let dragId = null;

function rel(ms) {
  if (!ms) return 'Not played yet';
  const day = t => { const x = new Date(t); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const d = Math.round((day(Date.now()) - day(ms)) / 86400000);
  return d < 1 ? 'Played today' : d === 1 ? 'Played yesterday' : d < 30 ? 'Played ' + d + ' days ago' : d < 365 ? 'Played ' + Math.floor(d / 30) + ' months ago' : 'Played over a year ago';
}

// Favourites in the saved order; new favourites go to the end, removed ones drop out.
function ordered(app) {
  const favs = libList(app).filter(g => g.fav), saved = app.state.settings.favOrder || [];
  const known = saved.filter(id => favs.some(g => g.id === id));
  return [...known, ...favs.filter(g => !known.includes(g.id)).map(g => g.id)].map(id => app.gfind(id));
}

function moveFav(app, id, toId) {
  const order = ordered(app).map(g => g.id), from = order.indexOf(id), to = order.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return;
  order.splice(to, 0, order.splice(from, 1)[0]);
  app.setCfg({ favOrder: order });
}

function dragHandlers(app, id, mine) {
  if (!mine) return {};
  const clear = () => document.querySelectorAll('.fv-card').forEach(c => c.classList.remove('drag', 'over'));
  return {
    draggable: true,
    onDragStart: e => { dragId = id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); e.currentTarget.classList.add('drag'); },
    onDragEnd: () => { dragId = null; clear(); },
    onDragOver: e => { if (!dragId) return; e.preventDefault(); e.currentTarget.classList.add('over'); },
    onDragLeave: e => e.currentTarget.classList.remove('over'),
    onDrop: e => { e.preventDefault(); const from = dragId; dragId = null; clear(); if (from && from !== id) moveFav(app, from, id); },
  };
}

export function libFavVals(app) {
  const S = app.state, L = S.launch, me = app.accts.find(a => a.current), sort = S.fvSort || 'mine', mine = sort === 'mine';
  let list = ordered(app);
  if (sort === 'name') list = list.slice().sort((x, y) => x.name.localeCompare(y.name));
  if (sort === 'last') list = list.slice().sort((x, y) => (L && L.running ? (y.id === L.gid) - (x.id === L.gid) : 0) || (y.lastPlayed || 0) - (x.lastPlayed || 0));
  const ids = list.map(g => g.id);
  const cards = list.map((g, i) => {
    const c = card(app, g, me, L), run = c.flag && c.flag.cls === 'run';
    const keyMove = e => { if (!mine || !e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return c.onKey(e); e.preventDefault(); const to = ids[i + (e.key === 'ArrowLeft' ? -1 : 1)]; if (to) moveFav(app, g.id, to); };
    return { ...c, n: i + 1, mine, run, hero: g.steam && g.hero ? 'url("' + g.hero + '") center 30%/cover no-repeat,' + app.gradOf(g) : c.bg,
      last: run ? 'Playing now' : rel(g.lastPlayed), hours: g.hours ? Math.round(g.hours).toLocaleString() + ' h played' : '',
      playLabel: !g.installed ? 'Install' : run ? 'Running' : 'Play', onKey: keyMove, drag: dragHandlers(app, g.id, mine) };
  });
  const sug = libList(app).filter(g => !g.fav && g.installed && g.hours).sort((x, y) => y.hours - x.hours).slice(0, 6)
    .map(g => ({ name: g.name, bg: app.cardBg(g), sub: Math.round(g.hours).toLocaleString() + ' h · ' + rel(g.lastPlayed).replace('Played ', '').replace('Not played yet', 'not played yet'),
      open: () => app.openGame(g.id), add: e => { e.stopPropagation(); app.toggleFav(g.id); } }));
  const pick = k => () => app.setState({ fvSort: k, lsDd: null });
  return {
    cards, sug, mine, count: cards.length,
    sortDd: { label: SORTS.find(s => s[0] === sort)[1], set: false, open: S.lsDd === 'fvsort', right: true, opts: SORTS.map(([k, l]) => ({ label: l, on: sort === k, pick: pick(k) })),
      toggle: () => app.setState(s => ({ lsDd: s.lsDd === 'fvsort' ? null : 'fvsort' })), clear: () => {} },
    ddOpen: S.lsDd === 'fvsort', closeDd: () => app.setState({ lsDd: null }),
  };
}

function favCard(c) {
  return html`<div class="fv-card" role="listitem" tabindex="0" onContextMenu=${c.onMenu} aria-label=${c.name + (c.mine ? ', favourite ' + c.n + '. Alt and arrow keys move it' : '')} onClick=${c.onOpen} onKeyDown=${c.onKey} ...${c.drag}>
<div class="fv-bg" style=${'background:' + c.hero}></div>
${c.flag && c.flag.label !== 'Non-Steam' ? html`<div class="fv-flags"><span class=${'lg-flag ' + c.flag.cls}>${c.flag.cls === 'run' ? html`<i></i>` : null}${c.flag.label}</span></div>` : null}
<div class="fv-in"><span class="fv-cv" style=${'background:' + c.bg}>${c.fallback ? html`<em>${c.name}</em>` : null}</span>
<div class="fv-m"><div class="fv-k">${icon('heart', 12)}${c.mine ? 'FAVOURITE ' + c.n : 'FAVOURITE'}</div><b>${c.name}</b>
<div class=${'fv-s' + (c.hintSw ? ' sw' : '')}><i style=${'background:' + c.dot}></i>${c.hint}</div><div class="fv-s">${c.last}${c.hours ? ' · ' + c.hours : ''}</div></div>
<div class="fv-act"><button class="fv-ib" aria-label="Remove from favourites" title="Remove from favourites" onClick=${c.onFav}>${icon('heart', 15)}</button>
<button class="fv-play" disabled=${c.run} onClick=${c.onPlay}>${icon(c.playIc, 16)}${c.playLabel}</button></div></div></div>`;
}

export function favPage(F) {
  const bar = html`<div class="fv-bar"><h2>Favourites <small>${F.count} ${F.count === 1 ? 'game' : 'games'}</small></h2>${F.count > 1 && F.mine ? html`<span class="fv-hint">${icon('grip', 14)}Drag cards to reorder</span>` : null}<div class="fv-sp"></div>${F.count > 1 ? html`<div class="lg-sortl">Sorting: ${dropdown(F.sortDd)}</div>` : null}</div>`;
  const body = F.count ? html`<div class="fv-grid" role="list">${F.cards.map(favCard)}</div>`
    : html`<div class="fv-empty"><span class="fv-eic">${icon('heart', 26)}</span><b>No favourites yet</b><span>Press the heart on any game to pin it here.</span></div>`;
  const sug = F.sug.length ? html`<div class="fv-sugh">You play these a lot <small>Add them to keep them one click away</small></div><div class="fv-sug">${F.sug.map(s => html`<div class="fv-si" role="button" tabindex="0" onClick=${s.open} onKeyDown=${e => { if (e.key === 'Enter' && e.target === e.currentTarget) s.open(); }}><span class="fv-scv" style=${'background:' + s.bg}></span><div class="fv-sm"><b>${s.name}</b><span>${s.sub}</span></div><button class="fv-add" onClick=${s.add}>${icon('heart', 14)}Add</button></div>`)}</div>` : null;
  return html`<div class="fvp">${F.ddOpen ? html`<div class="lg-catch" onClick=${F.closeDd}></div>` : null}${bar}${body}${sug}</div>`;
}
