// Library layout: My games (sub-tabs, filter dropdowns, cover grid).
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { heartBurst } from './libmotion.js';

export function dropdown(d) {
  return html`<div class="lg-ddw">
<button class=${'lg-dd' + (d.set ? ' set' : '') + (d.wide ? ' wide' : '')} aria-haspopup="listbox" aria-expanded=${d.open} onClick=${d.toggle}><span>${d.label}</span>${d.set ? html`<span class="lg-x" role="button" aria-label="Clear" onClick=${d.clear}>${icon('x', 12)}</span>` : icon('chevron', 14)}</button>
${d.open ? html`<div class=${'lg-ddm' + (d.right ? ' r' : '')} role="listbox">${d.opts.map(o => o.sep ? html`<div class="lg-ddsep"></div>` : o.head ? html`<div class="lg-ddh">${o.head}</div>` : html`<button class=${'lg-ddo' + (o.on ? ' on' : '')} role="option" aria-selected=${o.on} onClick=${o.pick}>${o.dot ? html`<span class="lg-dt" style=${'background:' + o.dot}></span>` : null}${o.av ? html`<span class="lg-av" style=${'background:' + o.av}></span>` : null}${o.ic ? html`<span class="lg-ic">${icon(o.ic, 13)}</span>` : null}<span class="lg-ol">${o.label}</span>${o.n != null ? html`<span class="lg-c">${o.n}</span>` : null}${o.on ? html`<span class="lg-ck">${icon('check', 15)}</span>` : null}</button>`)}</div>` : null}
</div>`;
}

// A modpack has only a small square icon: blur it big behind, show it sharp in the middle like an app icon.
export const packArt = (src, cls = '') => html`<span class=${'pk-bg ' + cls} style=${'background-image:url("' + src + '")'}></span><span class=${'pk-ic ' + cls} style=${'background-image:url("' + src + '")'}></span>`;

export function cover(c) {
  return html`<div class="lg-cover" role="button" tabindex="0" data-gid=${c.id} aria-label=${c.name} onClick=${c.onOpen} onKeyDown=${c.onKey} onContextMenu=${c.onMenu}>
<div class=${'lg-art' + (c.ni ? ' ni' : '')} style=${'background:' + c.bg}>
${c.packIcon ? packArt(c.packIcon) : c.fallback ? html`<div class="lg-fall">${c.name}</div>` : null}
<div class="lg-shade"></div>
${c.flag ? html`<span class=${'lg-flag ' + c.flag.cls}>${c.flag.cls === 'run' ? html`<i></i>` : null}${c.flag.label}</span>` : null}
<button class=${'lg-fv' + (c.fav ? ' on' : '')} aria-label=${c.fav ? 'Remove from favourites' : 'Add to favourites'} title=${c.fav ? 'Remove from favourites' : 'Add to favourites'} onClick=${e => { if (!c.fav) heartBurst(e.currentTarget); c.onFav(e); }}>${icon('heart', 14)}</button>
<div class="lg-acts"><button class="lg-ab" aria-label="Details" title="Details" onClick=${c.onInfo}>${icon('info', 15)}</button><button class="lg-ab play" aria-label=${c.playLabel} title=${c.playLabel} onClick=${c.onPlay}>${icon(c.playIc, 15)}</button></div>
<span class=${'lg-ash' + (c.hintSw ? ' sw' : '')}>${c.hint}</span>
</div>
<div class="lg-cname" title=${c.name}>${c.name}</div>
<div class="lg-cacct"><i style=${'background:' + c.dot}></i><span>${c.who}</span></div>
</div>`;
}

export function gamesPage(G) {
  const tabs = html`<div class="lg-tabs">${G.subs.map(s => html`<button class=${'lg-tab' + (s.on ? ' on' : '')} aria-pressed=${s.on} onClick=${s.pick}>${icon(s.ic, 15)}<span>${s.label}</span><span class="lg-n">${s.n}</span></button>`)}<i class="tab-ink" aria-hidden="true"></i><div class="lg-sortl">Sorting: ${dropdown(G.sortDd)}</div></div>`;
  const filters = html`<div class="lg-filters">${dropdown(G.tagDd)}${dropdown(G.acctDd)}${dropdown(G.srcDd)}<button class="lg-add" onClick=${G.onAdd}>${icon('plus', 15)}Add game</button>
<label class="lg-search">${icon('search', 15)}<input value=${G.q} placeholder="Search" aria-label="Search your games" onInput=${G.onQ} /></label></div>`;
  const niBar = G.niHidden ? html`<div class="lg-fbar">${G.niHidden} owned ${G.niHidden === 1 ? 'game isn\'t' : 'games aren\'t'} installed and hidden.<button onClick=${G.showNi}>Show them</button></div>` : null;
  const bar = G.anyFilter ? html`<div class="lg-fbar">${G.shown} of ${G.total} games<button onClick=${G.clear}>Clear filters</button></div>` : null;
  const body = G.loading ? html`<div class="lg-grid">${[0, 1, 2, 3, 4, 5].map(i => html`<div class="lg-skel" style=${'animation-delay:' + i / 10 + 's'}></div>`)}</div>`
    : G.cards.length ? html`<div class="lg-grid">${G.cards.map(cover)}</div>`
      : G.total ? html`<div class="lg-empty">No games match these filters.<button onClick=${G.clear}>Clear filters</button></div>`
        : html`<div class="lg-empty big"><span class="lg-eic">${icon('grid', 26)}</span><b>No games yet</b><span>${G.noSteam ? "SwapDeck can't find Steam, so there are no Steam games to show. Point it to Steam, or add a game that isn't on Steam." : "Install a game in Steam and it shows up here, or add one that isn't on Steam."}</span><div class="lg-eacts">${G.noSteam ? html`<button onClick=${G.onFindSteam}>Find Steam</button>` : null}<button onClick=${G.onAdd}>${icon('plus', 15)}Add a game</button></div></div>`;
  return html`<div class="lg">${G.ddOpen ? html`<div class="lg-catch" onClick=${G.closeDd}></div>` : null}${tabs}${filters}${niBar}${bar}${body}</div>`;
}
