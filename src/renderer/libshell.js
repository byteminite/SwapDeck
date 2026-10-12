// Library layout: the window frame (rail on the left, greeting + page pills + bell + avatar on top).
// Each page renders into the content area; Classic's overlays (settings, profile, launch, toasts) stay on top.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { launchScreen, switchScreen, nowPlaying } from './liblaunch.js';

function rail(L) {
  const btn = (k, ic, tip, on, badge) => html`<button class=${'ls-rbtn' + (L.page === k && !L.setOn ? ' on' : '')} aria-label=${tip} aria-current=${L.page === k && !L.setOn ? 'page' : null} onClick=${on}>${icon(ic)}${badge ? html`<span class="ls-badge">${badge}</span>` : null}<span class="ls-tip">${tip}</span></button>`;
  return html`<nav class="ls-rail" aria-label="Main">
<button class="ls-logo" aria-label="Recently played" onClick=${() => L.go('recent')}><i></i></button>
<button class="ls-rbtn" aria-label="Search" onClick=${L.onSearch}>${icon('search')}<span class="ls-tip">Search  Ctrl K</span></button>
${btn('recent', 'house', 'Home', () => L.go('recent'))}
<div class="ls-rlabel">GAMES</div>
${btn('fav', 'heart', 'Favourites', () => L.go('fav'))}
${btn('games', 'grid', 'Library', () => L.go('games'))}
${btn('upd', 'refresh', 'Updates', () => L.go('upd'), L.updCount)}
<div class="ls-grow"></div>
<button class=${'ls-rbtn' + (L.setOn ? ' on' : '')} aria-label="Settings" aria-current=${L.setOn ? 'page' : null} onClick=${L.onSettings}>${icon('settings')}<span class="ls-tip">Settings</span></button>
</nav>`;
}

function top(L) {
  return html`<header class="ls-top">
<div class="ls-hi"><b>${L.hiName}</b><span>${L.hiSub}</span></div>
<div class="ls-pills">${L.pills.map(p => html`<button class=${'ls-pill' + (p.on ? ' on' : '')} aria-current=${p.on ? 'page' : null} onClick=${p.go}>${p.label}</button>`)}</div>
<div class="ls-topr">
<button class=${'ls-circ' + (L.bellOn ? ' on' : '')} aria-label=${'Notifications' + (L.bellN ? ', ' + L.bellN + ' unread' : '')} aria-expanded=${L.bellOn} onClick=${L.onBell}>${icon('bell', 17)}${L.bellN ? html`<span class="ls-cnt">${L.bellN}</span>` : null}</button>
<button class="ls-me" aria-label="Accounts" aria-haspopup="dialog" aria-expanded=${!!L.menu} style=${'background:' + L.meBg} onClick=${L.onMe}>${L.meIni}${L.meOnline ? html`<i></i>` : null}</button>
</div>
</header>`;
}

function placeholder(L) {
  return html`<div class="ls-soon"><span class="ls-soon-ic">${icon('hammer', 26)}</span><b>${L.pageTitle}</b><span>This page is being built. Switch back to Classic in Settings, Appearance any time.</span></div>`;
}

export function libShell(b) {
  const L = b.ls;
  // Lock now: nothing of the library stays on screen (or in the page) behind the lock screen.
  if (b.lockOn) return null;
  return html`<div class="ls">${rail(L)}<div class="ls-main">${top(L)}<main class="ls-content" ref=${L.contentRef}>${L.settings ? L.settings(b) : L.content || placeholder(L)}</main></div>${L.menu}${L.notes}${L.spot}${L.tags}${L.gm}${L.art}${L.lnBar ? nowPlaying(L.lnBar) : null}${L.lnScreen ? launchScreen(L.lnScreen) : null}${L.sw ? switchScreen(L.sw) : null}</div>`;
}
