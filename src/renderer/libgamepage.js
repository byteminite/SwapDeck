// Library layout: a game's full page (header, banner with Favourite + Play, tabs). The tab bodies reuse the
// same cards as Classic's game details, so both layouts show the same data.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { gameOverview } from './gamepage.js';

function header(P) {
  return html`<div class="gp-head">
<button class="gp-back" aria-label="Back" onClick=${P.onBack}>${icon('chevron', 18)}</button>
<h1 title=${P.name}>${P.name}</h1>
${P.ach ? html`<button class="gp-ach" title="Achievements" onClick=${P.ach.open}><span class="gp-achn"><b>${P.ach.got}</b> / ${P.ach.total}</span><span class="gp-achp">${P.ach.pct}%</span><span class="gp-achbar"><i style=${'width:' + P.ach.pct + '%'}></i></span></button>` : null}
</div>`;
}

function banner(P) {
  return html`<div class="gp-band" style=${'background:' + P.heroBg}>
${P.noArt ? html`<div class="gp-ini">${P.ini}</div>` : null}
<div class="gp-band-in">
<div class="gp-who">${P.who.faces.map(f => html`<i style=${'background:' + f}></i>`)}<span>${P.who.text}</span></div>
<div class="gp-btns">
<button class=${'gp-fav' + (P.fav ? ' on' : '')} aria-pressed=${P.fav} aria-label=${P.fav ? 'Remove from favourites' : 'Add to favourites'} title=${P.fav ? 'Remove from favourites' : 'Add to favourites'} onClick=${e => favPop(e, P)}>${icon('heart', 20)}${SPARKS}</button>
<button class="gp-cta" onClick=${P.onPlay} disabled=${P.playDisabled}>${icon(P.playIc, 18)}${P.playLabel}</button>
</div></div></div>`;
}

// The heart on a game page: adding it makes the heart jump and sparkle (after the re-render, so the class sticks).
// Seven pairs of dots in a rainbow burst out around the heart (a big dot and a smaller one just behind it).
const BURST = ['#7ee8a6', '#c4e35f', '#f2a65a', '#e8d25f', '#f472b6', '#a78bfa', '#818cf8'];
const SPARKS = html`<span class="gp-sparks" aria-hidden="true"><b class="gp-ring"></b>${BURST.flatMap((c, i) => [0, 1].map(k => html`<i class=${k ? 'sm' : ''} style=${'--a:' + (i * 360 / 7 + k * 14) + 'deg;--c:' + c}></i>`))}</span>`;
function favPop(e, P) {
  const btn = e.currentTarget, adding = !P.fav;
  P.onFav();
  if (adding) requestAnimationFrame(() => { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); });
}

export function gamePage(P) {
  const tabs = html`<div class="gp-tabs" role="tablist">${P.tabs.map(t => html`<button class=${'gp-tab' + (t.on ? ' on' : '')} role="tab" aria-selected=${t.on} onClick=${t.pick}>${t.label}</button>`)}<i class="tab-ink" aria-hidden="true"></i></div>`;
  const body = P.tab === 'ach' && P.achEl ? P.achEl
    : P.tab === 'setup' ? (P.setupEl || html`<div class="gp-soon">Setup for this game is next in the build.</div>`)
      : P.ov ? html`<div class="gp-ov">${gameOverview(P.ov)}</div>` : html`<div class="gp-soon">${P.noOvText}</div>`;
  return html`<div class="gp">${header(P)}${banner(P)}${tabs}${body}</div>`;
}
