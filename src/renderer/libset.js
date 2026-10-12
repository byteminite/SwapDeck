// Library layout: the full Settings page (section nav, Find a setting, every section in one scroll).
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { filterSecs, renderSec } from './libsetui.js';
import { generalSec, steamSec, appearanceSec } from './libsetsecs.js';
import { displaysSec } from './libsetdisp.js';
import { securitySec, updatesSec, aboutSec, SET_NAV } from './libsetsecs2.js';

const goTo = k => { const el = document.getElementById('st-' + k); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

// Highlights the section being read while the page scrolls. Attached once to the shell's scroll area.
function spy(app) {
  return el => {
    if (!el || el.dataset.spy) return;
    el.dataset.spy = '1';
    // The page may not be in the document yet when Preact hands over the element.
    requestAnimationFrame(() => attach(app, el));
  };
}

function attach(app, el) {
  const box = el.closest('.ls-content');
  if (!box) return;
  const onScroll = () => {
    if (!el.isConnected) { box.removeEventListener('scroll', onScroll); return; }
    let cur = SET_NAV[0][0];
    el.querySelectorAll('.st-sec').forEach(s => { if (s.getBoundingClientRect().top - box.getBoundingClientRect().top < 160) cur = s.dataset.sec; });
    if (cur !== app.state.setSec) app.setState({ setSec: cur });
  };
  box.addEventListener('scroll', onScroll, { passive: true });
  const first = app.state.setSec;
  if (first && first !== 'general') goTo(first);
  else box.scrollTop = 0;
}

export function settingsPage(app, b) {
  const S = app.state, q = S.stQ || '';
  const secs = filterSecs([generalSec(app, b), steamSec(app, b), displaysSec(app, b), appearanceSec(app, b), securitySec(app, b), updatesSec(app, b), aboutSec(app, b)], q);
  const nav = html`<nav class="st-nav" aria-label="Settings sections"><h2>Settings</h2><div class="st-navsub">Esc to go back</div>
<label class="st-find">${icon('search', 15)}<input value=${q} placeholder="Find a setting" aria-label="Find a setting" onInput=${e => app.setState({ stQ: e.target.value })} />${q ? html`<button aria-label="Clear" onClick=${() => app.setState({ stQ: '' })}>${icon('x', 13)}</button>` : null}</label>
${SET_NAV.filter(([k]) => secs.some(s => s.k === k)).map(([k, label, ic]) => html`<button class=${'st-nb' + ((S.setSec || 'general') === k ? ' on' : '')} aria-current=${(S.setSec || 'general') === k ? 'true' : null} onClick=${() => { app.setState({ setSec: k }); goTo(k); }}>${icon(ic, 17)}${label}</button>`)}</nav>`;
  return html`<div class="stp">${nav}<div class="st-main" ref=${spy(app)}>${secs.length ? secs.map(renderSec) : html`<div class="st-none">No setting matches "${q}".</div>`}</div></div>`;
}
