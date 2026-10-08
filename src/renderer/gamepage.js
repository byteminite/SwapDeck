// The Overview tab of a game's details: a Steam-style page with a stats bar, Steam links and cards
// (activity, screenshots, achievements, tags, friends, notes, workshop, DLC). Values come from
// ui.js (gameVals → gOv); this file is markup only. Cards with nothing to show are left out by ui.js.

import { html } from './vendor/htm-preact.js';
import { tagEditor } from './tagpicker.js';

const LABEL = "font:600 10.5px 'Geist Mono',monospace;letter-spacing:.09em;text-transform:uppercase;color:var(--text-subtle)";
const ICONS = {
  calendar: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 2v4M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M3 10h18"></path></svg>`,
  clock: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>`,
  medal: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"></circle><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"></path></svg>`,
  check: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>`,
  download: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"></path></svg>`,
  pause: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect></svg>`,
  warn: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path><path d="M12 9v4M12 17h.01"></path></svg>`,
  dash: html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 12h12"></path></svg>`,
};
export const ICON = ICONS;

const bar = pct => html`<div style="height:4px;border-radius:99px;background:rgba(var(--fg-rgb),.1);margin-top:7px;overflow:hidden"><i style="display:block;height:100%;width:${pct}%;border-radius:99px;background:linear-gradient(90deg,var(--accent),var(--accent-2));transition:width .6s cubic-bezier(.22,1,.36,1)"></i></div>`;

// s: { icon, label, value, tint?, pct?, action?: { label, on }, grow? }
const statCell = (s, i, all) => html`<div style=${`flex:${s.grow || 1};min-width:0;padding:12px 16px;display:flex;gap:11px;align-items:center;border-right:${i === all.length - 1 ? 0 : 1}px solid rgba(var(--fg-rgb),.07)`}>
<span style=${`width:30px;height:30px;flex:none;border-radius:9px;display:grid;place-items:center;color:${s.tint || 'var(--text-muted)'};background:${s.tint ? `color-mix(in srgb,${s.tint} 16%,transparent)` : 'rgba(var(--fg-rgb),.06)'}`}>${ICONS[s.icon]}</span>
<div style="flex:1;min-width:0"><div style=${LABEL}>${s.label}</div><div style="font:500 13.5px 'Geist',sans-serif;color:var(--text);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title=${s.value}>${s.value}</div>${s.pct != null ? bar(s.pct) : null}</div>
${s.action ? html`<button style="flex:none;border:0;background:transparent;color:var(--accent-strong);font:500 12px 'Geist',sans-serif;cursor:pointer;padding:2px 4px;border-radius:6px" onClick=${s.action.on} class="dch4">${s.action.label}</button>` : null}</div>`;

// A card: title (uppercase label), optional aside on the right of the title, then the body.
export const card = (title, body, aside) => html`<section style="border:1px solid rgba(var(--fg-rgb),.08);border-radius:14px;background:rgba(var(--fg-rgb),.02);padding:16px 18px;position:relative;min-width:0">
<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span style=${`flex:1;${LABEL}`}>${title}</span>${aside || null}</div>${body}</section>`;

// p: { tabs: [{ label, on, pick }], hint }
export function gameTabs(p) {
  return html`<div role="tablist" style="flex:none;display:flex;align-items:center;gap:18px;padding:0 22px;border-bottom:1px solid rgba(var(--fg-rgb),.07)">${p.tabs.map(t => html`<button role="tab" aria-selected=${t.on} style=${`position:relative;padding:13px 2px;border:0;background:transparent;color:${t.on ? 'var(--text)' : 'var(--text-subtle)'};font:500 13.5px 'Geist',sans-serif;cursor:pointer;box-shadow:${t.on ? 'inset 0 -2px 0 var(--accent)' : 'none'}`} onClick=${t.pick} class="dch4">${t.label}</button>`)}<div style="flex:1"></div><span style="font:400 12px 'Geist',sans-serif;color:var(--text-subtle)">${p.hint}</span></div>`;
}

// p: { stats: [statCell props], links: [{ label, on }], left: [vnodes], right: [vnodes] }
export function gameOverview(p) {
  return html`<div style="flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:18px 22px 26px">
<div style="display:flex;align-items:stretch;border:1px solid rgba(var(--fg-rgb),.08);border-radius:14px;background:rgba(var(--fg-rgb),.02);overflow:hidden">${p.stats.map(statCell)}</div>
<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">${p.links.map(l => html`<button style="padding:7px 11px;border-radius:9px;border:1px solid rgba(var(--fg-rgb),.1);background:transparent;color:var(--text-muted);font:500 12px 'Geist',sans-serif;cursor:pointer" onClick=${l.on} class="dcha" title=${'Opens in Steam'}>${l.label}</button>`)}</div>
<div style="display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:18px;margin-top:18px;align-items:start">
<div style="display:flex;flex-direction:column;gap:16px;min-width:0">${p.left}</div>
<div style="display:flex;flex-direction:column;gap:16px;min-width:0">${p.right}</div>
</div></div>`;
}

// The tags card on Overview reuses the editor from the Setup tab (same values, same colour panel).
export const tagsCard = (ed, count) => card('Tags', html`<div style="position:relative">${tagEditor(ed)}</div>`, html`<span style="font:400 11px 'Geist Mono',monospace;color:var(--text-subtle)">${count}</span>`);
