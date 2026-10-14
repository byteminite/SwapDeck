// Library layout: controller. D-pad or left stick moves focus to the nearest control in that direction inside
// whatever is on top (menu, dialog, overlay or the page), A presses it, B goes back (handled in ui.js), X opens
// the right-click menu, Y plays, LB/RB change page (or tab on a game page), Menu searches, View shows the bell.
import { html } from './vendor/htm-preact.js';
import { openSpot } from './libspot.js';

const LAYERS = ['.sd-modal', '.ob', '.tm-ov', '.gm', '.sp-dim', '.nt', '.am', '.so', '.ln', '.ls'];
const FOCUSABLE = 'button:not([disabled]), [role="button"], [tabindex="0"], input:not([type="hidden"]), textarea, a[href]';
const PAGES = ['recent', 'fav', 'games', 'upd'];

function layer() {
  for (const sel of LAYERS) { const els = document.querySelectorAll(sel); if (els.length) return els[els.length - 1]; }
  return document.body;
}
// Off-screen controls count too, so moving down past the bottom row scrolls the page instead of getting stuck.
const visible = el => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden'; };
const center = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

// Nearest control in the pressed direction: distance along it, plus a penalty for drifting sideways.
function move(dir) {
  const root = layer(), all = [...root.querySelectorAll(FOCUSABLE)].filter(el => visible(el) && !el.closest('[aria-hidden="true"]'));
  if (!all.length) return;
  const cur = root.contains(document.activeElement) && all.includes(document.activeElement) ? document.activeElement : null;
  if (!cur) { (root.querySelector('.lg-cover, .fv-card, .rp-hero button, .st-nb, .gm-it') || all[0]).focus(); return; }
  const a = center(cur.getBoundingClientRect()), [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  let best = null, score = Infinity;
  for (const el of all) {
    if (el === cur || el.contains(cur) || cur.contains(el)) continue;
    const b = center(el.getBoundingClientRect()), along = (b.x - a.x) * dx + (b.y - a.y) * dy, side = Math.abs((b.x - a.x) * dy) + Math.abs((b.y - a.y) * dx);
    if (along <= 4) continue;
    const s = along + side * 2.5;
    if (s < score) { score = s; best = el; }
  }
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
}

function gidOf(el) { const c = el && el.closest('[data-gid]'); return c && c.getAttribute('data-gid'); }

export function libPad(app, k) {
  if (!app.state.padOn) {
    app.setState({ padOn: true });
    document.body.classList.add('sd-pad');
    const off = () => { app.setState({ padOn: false }); document.body.classList.remove('sd-pad'); window.removeEventListener('mousemove', off); };
    window.addEventListener('mousemove', off);
  }
  const S = app.state, act = document.activeElement;
  if (['up', 'down', 'left', 'right'].includes(k)) return move(k);
  // "Which script?": A on a script plays with it (a mouse picks with one click and plays with a double click).
  if (k === 'a' && act && act.closest('.sc-list')) { act.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); return; }
  if (k === 'a') { if (act && act !== document.body) act.click(); else move('down'); return; }
  if (k === 'x' && act) { const r = act.getBoundingClientRect(); act.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); return; }
  if (k === 'y') { const gid = gidOf(act) || (S.gd && S.gd); if (gid) app.play(gid); return; }
  if (k === 'menu') return openSpot(app);
  if (k === 'view') return app.setState(s => ({ lsNotes: !s.lsNotes }));
  if (k === 'lb' || k === 'rb') {
    const d = k === 'rb' ? 1 : -1;
    // Game page: press the real tab buttons, so each tab loads what it needs (CS2's Setup cards, achievements).
    if (S.gd) { const tabs = [...document.querySelectorAll('.gp-tabs .gp-tab')], i = tabs.findIndex(t => t.classList.contains('on')); if (tabs.length) tabs[(i + d + tabs.length) % tabs.length].click(); return; }
    const i = PAGES.indexOf(S.libPage || S.settings.libStart || 'games');
    app.setState({ libPage: PAGES[(i + d + PAGES.length) % PAGES.length], drawerId: null, setOpen: false });
  }
}

export function padHints(on) {
  if (!on) return null;
  const k = (key, label) => html`<span><kbd>${key}</kbd>${label}</span>`;
  return html`<div class="pad-hints" aria-hidden="true">${k('A', 'Open')}${k('B', 'Back')}${k('X', 'Options')}${k('Y', 'Play')}${k('LB RB', 'Pages')}${k('☰', 'Search')}</div>`;
}
