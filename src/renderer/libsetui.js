// Library layout Settings: the small building blocks (rows, toggles, segments) and the Find filter.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';

export const tg = (on, fn, label) => html`<button class=${'st-tg' + (on ? ' on' : '')} role="switch" aria-checked=${!!on} aria-label=${label} onClick=${fn}></button>`;
export const seg = opts => html`<div class="st-seg" role="group">${opts.map(o => html`<button class=${o.on ? 'on' : ''} aria-pressed=${!!o.on} onClick=${o.pick}>${o.ic ? icon(o.ic, 14) : null}${o.label}</button>`)}</div>`;
export const btn = (label, fn, o = {}) => html`<button class=${'st-btn sm' + (o.p ? ' p' : '') + (o.d ? ' d' : '')} disabled=${!!o.off} onClick=${fn}>${o.ic ? icon(o.ic, 14) : null}${label}</button>`;
export const badge = (label, warn) => html`<span class=${'st-badge' + (warn ? ' warn' : '')}>${label}</span>`;

// A row is data first ({ title, sub, ctrl, q, cls }) so Find can filter it before anything renders.
export const row = (title, sub, ctrl, cls, q) => ({ title, sub, ctrl, cls: cls || '', q: (q || title + ' ' + (typeof sub === 'string' ? sub : '')).toLowerCase() });

export function filterSecs(secs, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return secs;
  return secs.map(s => s.title.toLowerCase().includes(q) ? s : { ...s, rows: s.rows.filter(r => r.q.includes(q)) }).filter(s => s.rows.length);
}

export function renderSec(s) {
  return html`<section class="st-sec" id=${'st-' + s.k} data-sec=${s.k}><h3>${s.title}</h3><p>${s.sub}</p><div class="st-card">${s.rows.map(r => r.raw ? r.raw : html`<div class=${'st-row ' + r.cls}><div class="st-m"><b>${r.title}</b>${r.sub ? html`<span>${r.sub}</span>` : null}</div>${r.ctrl || null}</div>`)}</div></section>`;
}
