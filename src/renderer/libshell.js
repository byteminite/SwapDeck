// Library layout: the window frame (rail on the left, greeting + page pills + bell + avatar on top).
// Each page renders into the content area; Classic's overlays (settings, profile, launch, toasts) stay on top.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';

function rail(L) {
  const btn = (k, ic, tip, on, badge) => html`<button class=${'ls-rbtn' + (L.page === k ? ' on' : '')} aria-label=${tip} aria-current=${L.page === k ? 'page' : null} onClick=${on}>${icon(ic)}${badge ? html`<span class="ls-badge">${badge}</span>` : null}<span class="ls-tip">${tip}</span></button>`;
  return html`<nav class="ls-rail" aria-label="Main">
<button class="ls-logo" aria-label="Recently played" onClick=${() => L.go('recent')}><i></i></button>
<button class="ls-rbtn" aria-label="Search" onClick=${L.onSearch}>${icon('search')}<span class="ls-tip">Search  Ctrl K</span></button>
${btn('recent', 'house', 'Home', () => L.go('recent'))}
<div class="ls-rlabel">GAMES</div>
${btn('fav', 'heart', 'Favourites', () => L.go('fav'))}
${btn('games', 'grid', 'Library', () => L.go('games'))}
${btn('upd', 'refresh', 'Updates', () => L.go('upd'), L.updCount)}
<div class="ls-grow"></div>
<button class="ls-rbtn" aria-label="Settings" onClick=${L.onSettings}>${icon('settings')}<span class="ls-tip">Settings</span></button>
</nav>`;
}

function top(L) {
  return html`<header class="ls-top">
<div class="ls-hi"><b>${L.hiName}</b><span>${L.hiSub}</span></div>
<div class="ls-pills">${L.pills.map(p => html`<button class=${'ls-pill' + (p.on ? ' on' : '')} aria-current=${p.on ? 'page' : null} onClick=${p.go}>${p.label}</button>`)}</div>
<div class="ls-topr">
<button class="ls-circ" aria-label="Notifications" onClick=${L.onBell}>${icon('bell', 17)}</button>
<button class="ls-me" aria-label="Accounts" style=${'background:' + L.meBg} onClick=${L.onMe}>${L.meIni}${L.meOnline ? html`<i></i>` : null}</button>
</div>
</header>`;
}

function placeholder(L) {
  return html`<div class="ls-soon"><span class="ls-soon-ic">${icon('hammer', 26)}</span><b>${L.pageTitle}</b><span>This page is being built. Switch back to Classic in Settings, Appearance any time.</span></div>`;
}

export function libShell(b) {
  const L = b.ls;
  return html`<div class="ls">${rail(L)}<div class="ls-main">${top(L)}<main class="ls-content" ref=${L.contentRef}>${L.content || placeholder(L)}</main></div></div>`;
}
