// Library layout: What's new. After an update a small popup shows the highlights (Got it / See everything);
// the full view lists every version with its highlights and all changes.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { CHANGELOG } from './changelog.js';

const HL_IC = ['grid', 'house', 'search', 'power', 'refresh'];

export const openWn = (app, v) => app.setState({ wnFull: v || CHANGELOG[0].v, wn: false });

export function libWnVals(app) {
  const S = app.state;
  if (S.wnFull) {
    const cur = CHANGELOG.find(r => r.v === S.wnFull) || CHANGELOG[0];
    return { full: true, cur, latest: CHANGELOG[0].v, versions: CHANGELOG.map(r => ({ v: r.v, date: r.date, title: r.title, on: r.v === cur.v, pick: () => app.setState({ wnFull: r.v }) })),
      close: () => app.setState({ wnFull: null }), onGithub: () => window.api.openProfile('https://github.com/byteminite/SwapDeck/releases') };
  }
  if (S.wn && !S.locked) {
    const cur = CHANGELOG.find(r => r.v === S.version) || CHANGELOG[0];
    return { full: false, cur, gotIt: () => app.closeWn(), all: () => { app.closeWn(); openWn(app, cur.v); } };
  }
  return null;
}

function full(P) {
  const c = P.cur;
  return html`<div class="tm-ov" onClick=${e => { if (e.target === e.currentTarget) P.close(); }}><div class="wn" role="dialog" aria-modal="true" aria-label="What's new">
<nav class="wn-nav"><h2>What's new</h2><div class="wn-sub">Every SwapDeck version</div>
${P.versions.map(v => html`<button class=${'wn-v' + (v.on ? ' on' : '')} aria-current=${v.on ? 'true' : null} onClick=${v.pick}><b>v${v.v}${v.v === P.latest ? html`<em>LATEST</em>` : null}</b><span>${v.date}</span></button>`)}
<span class="wn-sp"></span><button class="wn-gh" onClick=${P.onGithub}>${icon('external', 14)}Releases on GitHub</button></nav>
<div class="wn-body"><button class="wn-x" aria-label="Close" onClick=${P.close}>${icon('x', 16)}</button>
<div class="wn-hero"><div class="wn-ver">v${c.v}</div><div class="wn-meta"><span>${c.date}</span>${c.v === P.latest ? html`<i>LATEST</i>` : null}</div><h3>${c.title}</h3><p>${c.intro}</p></div>
${c.highlights && c.highlights.length ? html`<div class="wn-k">HIGHLIGHTS</div><div class="wn-hl">${c.highlights.map(([b, s], i) => html`<div class="wn-c"><span class="wn-ic">${icon(HL_IC[i % HL_IC.length], 18)}</span><b>${b}</b><span>${s}</span></div>`)}</div>` : null}
<div class="wn-k">EVERYTHING IN v${c.v}</div><div class="wn-secs">${c.sections.map(([t, items]) => html`<div class="wn-s"><h4>${t}</h4><ul>${items.map(it => html`<li>${it}</li>`)}</ul></div>`)}</div></div></div></div>`;
}

function popup(P) {
  const c = P.cur;
  return html`<div class="tm-ov"><div class="tm wn-pop" role="dialog" aria-modal="true" aria-label=${"What's new in " + c.v}>
<div class="tm-h"><div class="wn-k">WHAT'S NEW IN v${c.v}</div><h3>${c.title}</h3><p>${c.intro}</p></div>
<div class="tm-b">${(c.highlights || []).map(([b, s], i) => html`<div class="wn-pi"><span class="wn-ic">${icon(HL_IC[i % HL_IC.length], 16)}</span><div><b>${b}</b><span>${s}</span></div></div>`)}</div>
<div class="tm-f"><button class="st-btn" onClick=${P.all}>See everything</button><span class="tm-sp"></span><button class="st-btn p" onClick=${P.gotIt}>Got it</button></div></div></div>`;
}

export const wnOverlay = P => P.full ? full(P) : popup(P);
