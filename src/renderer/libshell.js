// Library layout: the window frame (rail on the left, greeting + page pills + bell + avatar on top).
// Each page renders into the content area; Classic's overlays (settings, profile, launch, toasts) stay on top.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { launchScreen, switchScreen, nowPlaying } from './liblaunch.js';

function rail(L) {
  const btn = (k, ic, tip, on, badge) => html`<button class=${'ls-rbtn' + (L.page === k && !L.setOn ? ' on' : '')} aria-label=${tip} aria-current=${L.page === k && !L.setOn ? 'page' : null} onClick=${on}>${icon(ic)}${badge ? html`<span class="ls-badge">${badge}</span>` : null}<span class="ls-tip">${tip}</span></button>`;
  return html`<nav class="ls-rail" aria-label="Main">
<button class="ls-logo" aria-label="Home" title=${'SwapDeck ' + (L.ver || '')} onClick=${() => L.go('recent')}><img src="app-icon.png" alt="" draggable="false" /></button>
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

// The window has no title bar in this layout: the top bar is the drag area and holds the window buttons.
function winBtns(b) {
  const sv = (d, w = 2.2) => html`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=${w} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: d }}></svg>`;
  return html`<div class="ls-win"><button aria-label="Minimize" onClick=${() => b.onWin('min')}>${sv('<path d="M5 12h14"/>', 2.4)}</button><button aria-label="Maximize" onClick=${() => b.onWin('max')}>${sv('<rect x="4" y="4" width="16" height="16" rx="4"/>')}</button>${b.showClose === false ? null : html`<button class="x" aria-label="Close" onClick=${() => b.onWin('close')}>${sv('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 2.4)}</button>`}</div>`;
}

function top(L, b) {
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
  return html`<div class=${'ls' + (L.rm ? ' rm' : '')}>${rail(L)}<div class="ls-main">${top(L, b)}<main class="ls-content" ref=${L.contentRef}>${L.banner ? html`<div class=${'ls-banner ' + L.banner.tone} role="status">${icon(L.banner.ic, 16)}<span>${L.banner.text}</span>${L.banner.act ? html`<button onClick=${L.banner.go}>${L.banner.act}</button>` : null}</div>` : null}${L.settings ? L.settings(b) : L.content || placeholder(L)}</main></div>${L.menu}${L.notes}${L.spot}${L.tags}${L.gm}${L.art}${L.lnBar ? nowPlaying(L.lnBar) : null}${L.lnScreen ? launchScreen(L.lnScreen) : null}${L.sw ? switchScreen(L.sw) : null}${L.stop}${L.wn}${L.pad}${L.lnScreen || L.sw || L.stop ? html`<div class="ls-drag"></div>` : null}${winBtns(b)}</div>`;
}
