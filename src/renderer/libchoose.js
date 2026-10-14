// Library layout: "Which script?" (F-007). Play on a game with scripts asks which one runs before the game,
// with the last one used already picked and "No script" at the bottom. Same look as the Stop question.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';

const NONE = 'none';
const fileName = p => String(p || '').split('\\').pop();

// What Play should pick first: the last script used if it still exists, else the first one.
export function firstPick(g) {
  const list = g.scripts || [];
  if (g.lastScript === NONE || list.some(s => s.id === g.lastScript)) return g.lastScript;
  return list.length ? list[0].id : NONE;
}

export function chooseVals(app) {
  const A = app.state.scAsk, g = A && app.gfind(A.gid);
  if (!g) return null;
  const rows = [
    ...(g.scripts || []).map(s => ({ id: s.id, name: s.name, sub: fileName(s.path) + (s.args ? ' ' + s.args : ''), last: s.id === g.lastScript })),
    { id: NONE, name: 'No script', sub: "Play with the game's setup only", none: true, last: g.lastScript === NONE },
  ];
  const close = () => app.setState({ scAsk: null });
  const go = id => { close(); app.play(A.gid, A.asSid, id || A.pick); };
  const pick = id => app.setState(s => ({ scAsk: s.scAsk && { ...s.scAsk, pick: id } }));
  const move = d => { const i = rows.findIndex(r => r.id === A.pick); pick(rows[(i + d + rows.length) % rows.length].id); };
  return { name: g.name, cap: app.cardBg(g), rows, pick: A.pick, onPick: pick, move, go, close };
}

function onKey(P, e) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); P.move(e.key === 'ArrowDown' ? 1 : -1); focusPicked(e.currentTarget); return; }
  if (e.key === 'Enter' && e.target.closest('.sc-list')) { e.preventDefault(); P.go(); }
}

// Keeps keyboard focus on the picked row, so arrows, Enter and a controller's A all act on it.
const focusPicked = el => { if (el) requestAnimationFrame(() => { const b = el.querySelector('.sa-o.on'); if (b && document.activeElement !== b) b.focus(); }); };

export function chooseOverlay(P) {
  const opt = r => html`<button class=${'sa-o' + (P.pick === r.id ? ' on' : '')} role="radio" aria-checked=${P.pick === r.id} tabindex=${P.pick === r.id ? 0 : -1} onClick=${() => P.onPick(r.id)} onFocus=${() => P.pick !== r.id && P.onPick(r.id)} onDblClick=${() => P.go(r.id)}>
<span class=${'sa-ic' + (r.none ? ' sc-none' : '')}>${icon(r.none ? 'x' : 'script', 18)}</span><div class="sa-m"><b>${r.name}${r.last ? html`<em>LAST USED</em>` : null}</b><span class=${r.none ? '' : 'sc-sub'}>${r.sub}</span></div><span class="sa-rd"></span></button>`;
  return html`<div class="tm-ov" onClick=${e => { if (e.target === e.currentTarget) P.close(); }}><div class="sa" role="dialog" aria-modal="true" aria-label=${'Which script for ' + P.name} onKeyDown=${e => onKey(P, e)}>
<div class="sa-h"><span class="sa-cap" style=${'background:' + P.cap}></span><div><h3>Which script?</h3><span>${P.name} · runs before the game starts</span></div></div>
<div class="sc-list" role="radiogroup" aria-label="Scripts" ref=${focusPicked}>${P.rows.map(opt)}</div>
<div class="sa-f"><span class="sc-keys">Arrows to pick, Enter to play</span><span class="tm-sp"></span>
<button class="st-btn" onClick=${P.close}>Cancel</button><button class="st-btn p sc-go" onClick=${() => P.go()}>${icon('play', 13)}Play</button></div></div></div>`;
}
