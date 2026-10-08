// Tags UI shared by the Accounts and Library screens: the "Tags" filter button with its list, the ticked
// tags as removable chips, the tag editor used in game and account details, and the colour panel for a
// tag's colour. Values come from ui.js (tagPickVals / tagEditVals / colorVals); this file is markup only.

import { html } from './vendor/htm-preact.js';

export const TAG_PRESETS = [['Cyan', '34,211,238'], ['Blue', '96,165,250'], ['Violet', '167,139,250'], ['Pink', '244,114,182'],
  ['Red', '248,113,113'], ['Orange', '251,146,60'], ['Yellow', '250,204,21'], ['Green', '74,222,128']];
export const PANEL_W = 252;

const MONO = "font:600 11px 'Geist Mono',monospace;letter-spacing:.05em;text-transform:uppercase";
const stop = e => e.stopPropagation();
export const star = (s, fill) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill=${fill} stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
const xIcon = html`<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
const tagIcon = html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"></path><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"></circle></svg>`;
const chevron = html`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m6 9 6 6 6-6"></path></svg>`;

// p: { name, swatches: [{ label, rgb, on, pick }], hex, onCustom, onCustomDone, canReset, onReset, pos? }
// With pos it floats next to the tag that opened it (pos is relative to the tag's box); without, it sits inline.
export function colorPanel(p) {
  const float = p.pos ? `position:absolute;z-index:80;width:${PANEL_W}px;left:${p.pos.left}px;${p.pos.top != null ? 'top:' + p.pos.top : 'bottom:' + p.pos.bottom}px;background:var(--surface-raised);box-shadow:0 16px 40px var(--shadow-c);animation:var(--m-pop)` : 'margin:4px 2px 6px 8px;background:rgba(var(--fg-rgb),.035)';
  return html`<div data-colorpanel style="${float};box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid rgba(var(--fg-rgb),.12)" onMouseDown=${stop}>
<div style="font:600 10.5px 'Geist Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--text-subtle);margin-bottom:10px">Colour for ${p.name}</div>
<div style="display:grid;grid-template-columns:repeat(8,22px);gap:7px">${p.swatches.map(s => html`<button style="width:22px;height:22px;border-radius:99px;border:0;padding:0;cursor:pointer;background:rgb(${s.rgb});box-shadow:${s.on ? '0 0 0 2px var(--surface-raised),0 0 0 4px var(--text)' : 'none'}" onClick=${s.pick} aria-label=${s.label} title=${s.label} aria-pressed=${s.on}></button>`)}</div>
<div style="display:flex;align-items:center;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(var(--fg-rgb),.07)"><label style="display:flex;align-items:center;gap:10px;font:500 12.5px 'Geist',sans-serif;color:var(--text-soft);cursor:pointer"><input type="color" value=${p.hex} onInput=${p.onCustom} onChange=${p.onCustomDone} style="width:28px;height:22px;border:1px solid rgba(var(--fg-rgb),.2);border-radius:6px;background:transparent;padding:0;cursor:pointer" />Custom colour</label>${p.canReset ? html`<button style="margin-left:auto;border:0;background:transparent;color:var(--text-subtle);font:500 12px 'Geist',sans-serif;cursor:pointer;padding:4px 6px;border-radius:6px" onClick=${p.onReset} class="dch4">Reset</button>` : null}</div>
</div>`;
}

// The colour dot is its own button (not inside the tag's button), so it also works from the keyboard.
const dotBtn = (rgb, name, onDot, ring, extra = '') => html`<button data-colordot aria-label=${'Change colour of ' + name} title="Change colour" style="width:26px;height:26px;flex:none;border:0;padding:0;background:transparent;border-radius:99px;display:grid;place-items:center;cursor:pointer;${extra}" onMouseDown=${stop} onClick=${onDot}><span style="width:11px;height:11px;border-radius:99px;background:${rgb};box-shadow:0 0 0 2px ${ring},0 0 0 3px rgba(var(--fg-rgb),.2)"></span></button>`;
const box = on => html`<span style="width:16px;height:16px;flex:none;box-sizing:border-box;border-radius:5px;display:grid;place-items:center;border:1.5px solid ${on ? 'var(--accent)' : 'rgba(var(--fg-rgb),.3)'};background:${on ? 'var(--accent)' : 'transparent'};color:var(--accent-contrast)">${on ? html`<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>` : null}</span>`;
const count = n => html`<span style="margin-left:auto;font:500 11px 'Geist Mono',monospace;color:var(--text-subtle)">${n}</span>`;
const ROW = `display:flex;align-items:center;gap:12px;width:100%;height:36px;padding:0 10px;box-sizing:border-box;border-radius:9px;border:0;background:transparent;color:var(--text-soft);${MONO};font-size:11.5px;cursor:pointer;text-align:left`;
const favRow = f => html`<button role="menuitemcheckbox" aria-checked=${f.on} style=${ROW} onClick=${f.toggle} class="dctg">${box(f.on)}<span style="color:#fbbf24;display:flex;width:12px;justify-content:center">${star(13, '#fbbf24')}</span>Favourites${count(f.n)}</button>`;
// The row's button leaves a gap where the dot button sits on top of it.
const tagRow = r => html`<div style="position:relative"><button role="menuitemcheckbox" aria-checked=${r.on} style=${ROW} onClick=${r.toggle} class="dctg">${box(r.on)}<span style="width:12px;flex:none"></span>${r.label}${count(r.n)}</button>${dotBtn(r.dot, r.label, r.onDot, 'var(--surface-raised)', 'position:absolute;left:35px;top:5px')}</div>`;

// p: { open, onToggle, count, fav: { on, n, toggle }, rows, emptyText, footText, onClear }
export function tagPicker(p) {
  return html`<div data-tagpick style="position:relative;flex:none"><button aria-haspopup="true" aria-expanded=${p.open} style="display:flex;align-items:center;gap:7px;height:30px;padding:0 12px;box-sizing:border-box;border-radius:99px;border:1px solid ${p.open ? 'rgba(var(--fg-rgb),.3)' : 'rgba(var(--fg-rgb),.14)'};background:${p.open ? 'rgba(var(--fg-rgb),.04)' : 'transparent'};color:${p.open ? 'var(--text)' : 'var(--text-muted)'};${MONO};cursor:pointer" onClick=${p.onToggle} class="dcha">${tagIcon}Tags${p.count ? html`<span style="min-width:18px;height:18px;box-sizing:border-box;padding:0 5px;border-radius:99px;background:var(--accent);color:var(--accent-contrast);font:700 10.5px 'Geist Mono',monospace;display:grid;place-items:center">${p.count}</span>` : null}${chevron}</button>
${p.open ? html`<div role="menu" aria-label="Filter by tags" style="position:absolute;top:38px;left:0;z-index:60;width:280px;max-height:min(440px,70vh);overflow-y:auto;overflow-x:hidden;box-sizing:border-box;padding:6px;border-radius:14px;background:var(--surface-raised);border:1px solid rgba(var(--fg-rgb),.12);box-shadow:0 18px 50px var(--shadow-c);animation:var(--m-pop);transform-origin:top left">
${favRow(p.fav)}
<div style="height:1px;background:rgba(var(--fg-rgb),.08);margin:6px 4px"></div><div style="font:600 10.5px 'Geist Mono',monospace;letter-spacing:.08em;color:var(--text-subtle);padding:6px 10px">TAGS</div>
${p.rows.length ? p.rows.map(r => html`${tagRow(r)}${r.color ? colorPanel(r.color) : null}`) : html`<div style="padding:6px 10px 10px;font:400 12.5px/1.5 'Geist',sans-serif;color:var(--text-subtle)">${p.emptyText}</div>`}
<div style="height:1px;background:rgba(var(--fg-rgb),.08);margin:6px 4px"></div><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 2px 0 10px;font:400 11.5px 'Geist',sans-serif;color:var(--text-subtle)"><span>${p.footText}</span><button style="border:0;background:transparent;color:var(--text-subtle);font:500 12px 'Geist',sans-serif;cursor:pointer;padding:6px 8px;border-radius:8px" onClick=${p.onClear} class="dch4">Clear</button></div>
</div>` : null}</div>`;
}

// The ticked tags, on their own row under the toolbar so they never squeeze the search box or the sorts.
export function tagChips(p) {
  if (!p.count) return null;
  return html`<div style="flex:1 1 100%;display:flex;flex-wrap:wrap;align-items:center;gap:8px">${p.chips.map(c => html`<span style="flex:none;display:flex;align-items:center;gap:6px;height:30px;padding:0 5px 0 12px;box-sizing:border-box;border-radius:99px;${MONO};background:${c.bg};color:${c.fg};border:1px solid ${c.bd}">${c.fav ? star(11, 'currentColor') : null}${c.label}<button style="width:20px;height:20px;border-radius:99px;border:0;padding:0;background:rgba(0,0,0,.28);color:inherit;display:grid;place-items:center;cursor:pointer" onClick=${c.onRemove} aria-label=${'Remove ' + c.label}>${xIcon}</button></span>`)}<button style="flex:none;border:0;background:transparent;color:var(--text-subtle);font:500 12px 'Geist',sans-serif;cursor:pointer;padding:6px 8px;border-radius:8px" onClick=${p.onClear} class="dch4">Clear</button></div>`;
}

// Tag editor for a game's or an account's details: every tag as a chip (colour dot + name, filled in its
// colour when ticked), then a field for a new tag. The containing box must be position:relative so the
// colour panel can float next to a chip.
// p: { opts: [{ label, sel, dot, bg, fg, bd, bs, on, onDot }], draft, onDraft, onKey, color }
export function tagEditor(p) {
  return html`<div style="display:flex;flex-wrap:wrap;gap:8px">${p.opts.map(t => html`<span data-tagchip style="display:inline-flex;align-items:center;height:30px;box-sizing:border-box;padding-left:2px;border-radius:99px;${MONO};background:${t.bg};color:${t.fg};border:1px ${t.bs} ${t.bd}" class="dch12">${dotBtn(t.dot, t.label, t.onDot, 'var(--surface)')}<button aria-pressed=${t.sel} style="height:28px;padding:0 12px 0 2px;border:0;background:transparent;color:inherit;font:inherit;letter-spacing:inherit;text-transform:inherit;cursor:pointer" onClick=${t.on}>${t.label}</button></span>`)}<input style="width:128px;height:30px;padding:0 12px;box-sizing:border-box;border-radius:99px;border:1px dashed rgba(var(--fg-rgb),.2);background:transparent;color:var(--text-soft);${MONO};outline:none" placeholder="+ new tag" maxlength="16" aria-label="New tag" value=${p.draft} onInput=${p.onDraft} onKeyDown=${p.onKey} class="dcf13" /></div>${p.color ? colorPanel(p.color) : null}`;
}
