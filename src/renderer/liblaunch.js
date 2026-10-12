// Library layout: the start screen (steps while a game launches, then "Your setup is on"), the account switch
// screen, and the Now playing bar shown after "Back to library".
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';

const STATE_IC = { active: html`<span class="ln-spin"></span>`, done: icon('check', 16), fail: icon('x', 16) };

function steps(list) {
  return list.map(s => html`<div class=${'ln-stp ' + s.st}><span class="ln-ic">${icon(s.ic, 16)}</span><div class="ln-m"><b>${s.label}</b><span>${s.sub}</span></div><span class="ln-st">${s.tag ? html`<em class=${s.tagCls}>${s.tag}</em>` : STATE_IC[s.st] || null}</span></div>`);
}

export function launchScreen(L) {
  return html`<div class="ln" role="dialog" aria-modal="true" aria-label=${L.name} aria-live="polite">
<div class="ln-bg" style=${'background:' + L.bg}></div><div class="ln-shade"></div>
<div class="ln-in">
<div class="ln-who"><span class="ln-cv" style=${'background:' + L.cover}></span><div>
<div class=${'ln-k' + (L.running ? ' run' : L.failed ? ' bad' : '')}>${L.running ? html`<i></i>RUNNING` : L.failed ? "COULDN'T START" : 'STARTING · ' + L.pct + '%'}</div>
<h1>${L.name}</h1>
<span class="ln-as">${L.asPill.map(p => html`<i style=${'background:' + p.bg}>${p.ini}</i>`)}${L.asArrow ? html`<span class="ln-arr">${icon('chevron', 15)}</span>` : null}${L.asText}</span>
${L.note ? html`<button class="ln-note" onClick=${L.onCopy}>${L.noteCopied ? 'Copied' : 'Note: ' + L.note}</button>` : null}
</div></div>
<div class="ln-panel">${L.failed ? html`<h3>Something went wrong</h3><div class="ln-err">${icon('alert', 16)}<span>${L.error}</span></div>${L.steps.length ? steps(L.steps) : null}<div class="ln-sub">Your display and sound are back to how they were.</div>`
  : html`<h3>${L.running ? 'Your setup is on' : 'Getting your setup ready'}</h3><div class="ln-sub">${L.running ? 'SwapDeck puts everything back when the game closes.' : 'This takes a few seconds.'}</div>
<div class="ln-bar"><i style=${'width:' + (L.running ? 100 : L.pct) + '%'}></i></div>${steps(L.steps)}`}
${L.running ? html`<div class="ln-acts"><button class="ln-btn" onClick=${L.onStop}>${icon('x', 15)}Stop</button><button class="ln-cta" onClick=${L.onHide}>${icon('grid', 16)}Back to library</button></div><div class="ln-hint">${L.hint}</div>`
    : L.failed ? html`<div class="ln-acts"><button class="ln-btn" onClick=${L.onHide}>${icon('grid', 15)}Back to library</button><button class="ln-btn" onClick=${L.onPage}>${icon('info', 15)}Game page</button><button class="ln-cta" onClick=${L.onRetry}>${icon('history', 16)}Try again</button></div>`
    : html`<div class="ln-acts"><button class="ln-btn" onClick=${L.onCancel}>${icon('x', 15)}Cancel</button><button class="ln-btn" onClick=${L.onHide}>${icon('grid', 15)}Back to library</button></div>${L.cfTip ? html`<div class="ln-hint ln-tip">CurseForge has to be set to Use CurseForge launcher (Settings > Minecraft), or it won't start the pack.</div>` : null}<div class="ln-hint">Cancel puts back anything already changed.</div>`}
</div></div></div>`;
}

export function switchScreen(W) {
  return html`<div class="ln sw" role="dialog" aria-modal="true" aria-label=${'Switching to ' + W.name} aria-live="polite">
<div class="ln-bg acct" style=${'background:' + W.bg}></div><div class="ln-shade"></div>
<div class="ln-in"><div class="ln-center">
<div class="ln-pair">${W.from ? html`<span class="ln-av from" style=${'background:' + W.from.bg}>${W.from.ini}</span><span class="ln-dots"><i></i><i></i><i></i></span>` : null}<span class="ln-av to" style=${'background:' + W.bg}>${W.ini}</span></div>
<h1>Switching to ${W.name}</h1>
<div class="ln-panel"><div class="ln-bar"><i style=${'width:' + W.pct + '%'}></i></div>${steps(W.steps)}</div>
</div></div></div>`;
}

export function nowPlaying(N) {
  return html`<div class="np" role="status"><span class="np-cap" style=${'background:' + N.cover}></span>
<div class="np-m"><div class=${'np-k' + (N.running ? '' : ' start')}><i></i>${N.running ? 'NOW PLAYING' : 'STARTING'}</div><b>${N.name}</b><span>${N.sub}</span></div>
<button class="np-btn" onClick=${N.onShow}>Show</button>${N.running ? html`<button class="np-btn" onClick=${N.onStop}>Stop</button>` : null}</div>`;
}
