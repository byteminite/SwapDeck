// The classic (1.0) account gallery: tall panels in a sideways row, the hovered/selected one expands.
// Offered as Settings > General > Accounts layout > Gallery. Colours follow the current theme and accent.

import { html } from './vendor/htm-preact.js';

const W_EXP = 340, W_COL = 104;
const ic = {
  link: html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  star: (s, fill) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill=${fill} stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  clock: html`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  lock: html`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  arrow: html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  check: html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  plus: html`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
};
const stop = e => e.stopPropagation();
const box = "font:600 10.5px 'Geist Mono',monospace;padding:6px 9px;border-radius:9px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.14);color:#e8e8ec;backdrop-filter:blur(6px)";

// h: helpers from the app (tile values already worked out per account), app: the App component.
export function galleryEl(app, tiles, accts, selId) {
  const S = app.state;
  const byId = Object.fromEntries(accts.map(a => [a.id, a]));
  const expId = S.hover && tiles.some(t => t.id === S.hover) ? S.hover : selId;
  return html`
<div ref=${app.galRef} onWheel=${app.galWheel} style="position:relative;flex:1;min-height:0;display:flex;align-items:stretch;gap:10px;overflow-x:auto;overflow-y:hidden;padding:4px 24px 14px;scrollbar-width:thin" onMouseLeave=${() => app.setState({ hover: null })}>
  ${tiles.map(t => {
    const a = byId[t.id], exp = t.id === expId, isSel = t.id === selId;
    const bg = a.avatar ? `url("${a.avatar}") center/cover no-repeat,#111` : 'radial-gradient(120% 70% at 18% 8%,rgba(255,255,255,.26),transparent 58%),' + a.grad;
    const ring = t.cur ? '0 0 0 2px var(--accent),0 0 44px rgba(var(--accent-rgb),.26)' : (isSel && !exp ? '0 0 0 2px rgba(var(--fg-rgb),.45)' : '0 0 0 1px rgba(var(--fg-rgb),.1)');
    const onClick = () => { app.select(t.id); clearTimeout(app._clk); app._clk = app.later(240, () => app.openDetails(t.id)); };
    const onDbl = e => { e.preventDefault(); clearTimeout(app._clk); app.switchTo(t.id); };
    return html`
  <div key=${t.id} data-pid=${t.id} style=${`position:relative;flex:none;width:${exp ? W_EXP : W_COL}px;min-height:440px;border-radius:20px;overflow:hidden;cursor:pointer;user-select:none;transition:width .55s cubic-bezier(.22,1,.36,1),box-shadow .3s;background:${bg};box-shadow:${ring}`}
    onMouseEnter=${() => { if (S.hover !== t.id) app.setState({ hover: t.id, kbd: false }); }} onClick=${onClick} onDblClick=${onDbl} onContextMenu=${e => { e.preventDefault(); app.openDetails(t.id); }}>
    ${!a.avatar ? html`<div style=${`position:absolute;right:-14px;top:34px;font:700 170px/1 'Geist Mono',monospace;letter-spacing:-.04em;color:rgba(255,255,255,.13);opacity:${exp ? 1 : 0};transition:opacity .4s;pointer-events:none`}>${a.ini}</div>` : null}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(0,0,0,0) 20%,rgba(0,0,0,.9) 100%);pointer-events:none"></div>
    <div style=${`position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding:16px 0 18px;opacity:${exp ? 0 : 1};transition:opacity .25s;pointer-events:none`}>
      ${!a.avatar ? html`<span style="width:46px;height:46px;border-radius:14px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.2);display:grid;place-items:center;font:600 15px 'Geist Mono',monospace;color:#fff">${a.ini}</span>` : null}
      <span style=${`margin-top:10px;width:8px;height:8px;border-radius:99px;background:${t.stDot};box-shadow:0 0 0 2px rgba(0,0,0,.35)`}></span>
      <div style="margin-top:auto;display:flex;flex-direction:column;align-items:center;gap:10px;color:#fbbf24">
        ${a.linked ? ic.link : null}
        ${a.pinned ? ic.star(13, '#fbbf24') : null}
        <span style="writing-mode:vertical-rl;transform:rotate(180deg);font:600 13.5px 'Geist',sans-serif;color:#fff;white-space:nowrap;max-height:230px;overflow:hidden;text-overflow:ellipsis">${a.name}</span>
      </div>
    </div>
    <div style=${`position:absolute;top:14px;left:16px;right:14px;display:flex;align-items:center;gap:6px;opacity:${exp ? 1 : 0};transition:opacity .3s .1s;pointer-events:${exp ? 'auto' : 'none'}`}>
      ${t.cur ? html`<span style="display:flex;align-items:center;gap:6px;font:600 9.5px 'Geist Mono',monospace;letter-spacing:.09em;padding:5px 9px;border-radius:99px;background:var(--accent-chip);color:var(--accent-light);border:1px solid rgba(var(--accent-rgb),.5);backdrop-filter:blur(6px);white-space:nowrap"><span style="width:6px;height:6px;border-radius:99px;background:var(--accent)"></span>${t.curLabel}</span>` : null}
      ${S.fetching[t.id] !== undefined ? html`<span style=${box}>UPDATING…</span>` : null}
      <button style=${`margin-left:auto;width:30px;height:30px;border-radius:9px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.28);backdrop-filter:blur(6px);display:grid;place-items:center;cursor:pointer;color:${a.pinned ? '#fbbf24' : '#fff'}`} onClick=${e => { e.stopPropagation(); app.mut(t.id, { pinned: !a.pinned }); }} onDblClick=${stop} title=${a.pinned ? 'Unpin' : 'Pin to front'}>${ic.star(14, a.pinned ? '#fbbf24' : 'none')}</button>
    </div>
    <div style=${`position:absolute;left:20px;bottom:18px;width:300px;opacity:${exp ? 1 : 0};transform:${exp ? 'translateY(0px)' : 'translateY(16px)'};transition:opacity .35s .12s,transform .5s .12s;pointer-events:${exp ? 'auto' : 'none'}`}>
      <div style="display:flex;align-items:center;gap:6px;font:500 10.5px 'Geist Mono',monospace;color:rgba(255,255,255,.72)">${ic.clock}Last used ${a.last}</div>
      <div style="font:700 23px/1.15 'Geist',sans-serif;color:#fff;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em">${a.name}</div>
      <div style="font:500 11.5px 'Geist Mono',monospace;color:rgba(255,255,255,.7);margin-top:2px">${a.login}</div>
      <div style=${`display:flex;align-items:center;gap:7px;margin-top:8px;font:500 12px 'Geist',sans-serif;color:${t.stFg === 'var(--text-subtle)' ? 'rgba(255,255,255,.62)' : '#fff'}`}><span style=${`width:7px;height:7px;border-radius:99px;background:${t.stDot}`}></span>${t.stText}</div>
      <div style="display:flex;gap:5px;margin-top:10px;flex-wrap:wrap;min-height:21px">
        ${t.tags.map(g => html`<span style=${`font:600 9.5px 'Geist Mono',monospace;letter-spacing:.05em;text-transform:uppercase;padding:4px 9px;border-radius:99px;background:rgba(0,0,0,.42);color:${g.fg};border:1px solid ${g.bd};backdrop-filter:blur(6px)`}>${g.label}</span>`)}
      </div>
      <div style=${`font:400 12px/1.5 'Geist',sans-serif;color:${a.note ? 'rgba(255,255,255,.82)' : 'rgba(255,255,255,.5)'};margin-top:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden`}>${a.note || 'No note'}</div>
      ${a.linked
        ? html`<div style="display:flex;align-items:center;gap:6px;margin-top:11px;flex-wrap:wrap">${t.stats.length ? t.stats.map(x => html`<span style=${box + ';color:' + (x.fg.startsWith('var') ? '#e8e8ec' : x.fg)}>${x.label}</span>`) : html`<span style=${box}>CONNECTED · STATS NOT LOADED</span>`}</div>`
        : html`<div style="display:flex;align-items:center;gap:7px;margin-top:11px;font:500 11px 'Geist',sans-serif;color:rgba(255,255,255,.62)">${ic.lock}Not connected · public profile only</div>`}
      <div style="display:flex;gap:7px;margin-top:12px">
        ${t.canSwitch
          ? html`<button style="flex:1;display:flex;align-items:center;gap:10px;padding:10px 14px;border:0;border-radius:11px;background:#fff;color:#0a0a0c;font:600 13px 'Geist',sans-serif;cursor:pointer" onClick=${e => { e.stopPropagation(); app.switchTo(t.id); }} onDblClick=${stop}>${t.swLabel}${t.swHint && t.swHint.startsWith('then ') ? html`<span style="font:600 10px 'Geist Mono',monospace;padding:3px 7px;border-radius:6px;background:rgba(10,10,12,.08);color:#3f3f46">▶ ${t.swHint.slice(5)}</span>` : null}<span style="margin-left:auto;display:flex">${ic.arrow}</span></button>`
          : html`<div style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:11px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.18);color:#fff;font:600 13px 'Geist',sans-serif;backdrop-filter:blur(6px)">${ic.check}Signed in</div>`}
      </div>
    </div>
  </div>`;
  })}
  <div style="flex:none;width:78px;min-height:440px;border-radius:20px;border:1.5px dashed rgba(var(--fg-rgb),.18);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--text-subtle);cursor:pointer" onClick=${() => app.addAcc()}>
    ${ic.plus}
    <span style="writing-mode:vertical-rl;transform:rotate(180deg);font:500 12px 'Geist',sans-serif;white-space:nowrap">Add account</span>
  </div>
</div>`;
}
