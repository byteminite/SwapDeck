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

const bar = pct => html`<div style="height:4px;border-radius:99px;background:rgba(var(--fg-rgb),.1);margin-top:7px;overflow:hidden"><i style="display:block;height:100%;width:${pct}%;border-radius:99px;background:linear-gradient(90deg,var(--accent),var(--accent-2));transition:width .6s cubic-bezier(.22,1,.36,1)"></i></div>`;

// s: { icon, label, value, tint?, pct?, action?: { label, on }, grow? }
const statCell = (s, i, all) => html`<div style=${`flex:${s.grow || 1};min-width:0;padding:12px 16px;display:flex;gap:11px;align-items:center;border-right:${i === all.length - 1 ? 0 : 1}px solid rgba(var(--fg-rgb),.07)`}>
<span style=${`width:30px;height:30px;flex:none;border-radius:9px;display:grid;place-items:center;color:${s.tint || 'var(--text-muted)'};background:${s.tint ? `color-mix(in srgb,${s.tint} 16%,transparent)` : 'rgba(var(--fg-rgb),.06)'}`}>${ICONS[s.icon]}</span>
<div style="flex:1;min-width:0"><div style=${LABEL}>${s.label}</div><div style="font:500 13.5px 'Geist',sans-serif;color:var(--text);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title=${s.value}>${s.value}</div>${s.pct != null ? bar(s.pct) : null}</div>
${s.action ? html`<button style="flex:none;border:0;background:transparent;color:var(--accent-strong);font:500 12px 'Geist',sans-serif;cursor:pointer;padding:2px 4px;border-radius:6px" onClick=${s.action.on} class="dch4">${s.action.label}</button>` : null}</div>`;

// A card: title (uppercase label), optional aside on the right of the title, then the body.
const card = (title, body, aside) => html`<section style="border:1px solid rgba(var(--fg-rgb),.08);border-radius:14px;background:rgba(var(--fg-rgb),.02);padding:16px 18px;position:relative;min-width:0">
<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span style=${`flex:1;${LABEL}`}>${title}</span>${aside || null}</div>${body}</section>`;

// p: { stats: [statCell props], links: [{ label, on }], left: [vnodes], right: [vnodes], lightbox?, reader? (vnode) }
export function gameOverview(p) {
  return html`<div style="flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:4px 22px 26px">
<div style="display:flex;align-items:stretch;border:1px solid rgba(var(--fg-rgb),.08);border-radius:14px;background:rgba(var(--fg-rgb),.02);overflow:hidden">${p.stats.map(statCell)}</div>
<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">${p.links.map(l => html`<button style="padding:7px 11px;border-radius:9px;border:1px solid rgba(var(--fg-rgb),.1);background:transparent;color:var(--text-muted);font:500 12px 'Geist',sans-serif;cursor:pointer" onClick=${l.on} class="dcha" title=${'Opens in Steam'}>${l.label}</button>`)}</div>
<div style="display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:18px;margin-top:18px;align-items:start">
<div style="display:flex;flex-direction:column;gap:16px;min-width:0">${p.left}</div>
<div style="display:flex;flex-direction:column;gap:16px;min-width:0">${p.right}</div>
</div>${p.lightbox ? lightbox(p.lightbox) : null}${p.reader || null}</div>`;
}

// The tags card on Overview reuses the editor from the Setup tab (same values, same colour panel).
export const tagsCard = (ed, count) => card('Tags', html`<div style="position:relative">${tagEditor(ed)}</div>`, html`<span style="font:400 11px 'Geist Mono',monospace;color:var(--text-subtle)">${count}</span>`);

const BTN = "padding:7px 12px;border-radius:9px;border:1px solid rgba(var(--fg-rgb),.14);background:transparent;color:var(--text-soft);font:500 12px 'Geist',sans-serif;cursor:pointer;white-space:nowrap";
const MUTED = "font:400 12.5px/1.5 'Geist',sans-serif;color:var(--text-subtle)";

// p: { acct: { name, bg, ini, img }, menuOpen, onMenu, accounts: [{ name, bg, ini, img, count, pick, on }], shots: [{ src, title, open }],
//      count, empty, onFolder }
export function screenshotsCard(p) {
  const body = p.empty ? html`<div style=${MUTED}>${p.empty}</div>` : html`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${p.shots.map(s => html`<button style=${`aspect-ratio:16/9;padding:0;border-radius:10px;border:1px solid rgba(var(--fg-rgb),.08);background:rgba(var(--fg-rgb),.05) url("${s.src}") center/cover;cursor:zoom-in`} onClick=${s.open} title=${s.title} aria-label=${s.title} class="dche2"></button>`)}</div>
<div style="display:flex;align-items:center;gap:8px;margin-top:12px"><span style=${`flex:1;${MUTED}`}>${p.count}</span><button style=${BTN} onClick=${p.onFolder} class="dcha">Open folder</button></div>`;
  return card('Screenshots', body, acctPill(p));
}

// p: { src, caption, close }
export const lightbox = p => html`<div role="dialog" aria-label="Screenshot" style="position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.86);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:28px;cursor:zoom-out;animation:fade .15s ease" onClick=${p.close}><img src=${p.src} alt=${p.caption} style="max-width:100%;max-height:calc(100% - 40px);border-radius:12px;box-shadow:0 30px 80px rgba(0,0,0,.7)" /><div style="font:500 12.5px 'Geist',sans-serif;color:var(--text-muted)">${p.caption} · Esc or click to close</div></div>`;

// p: { items, size, onSubs, onOpen }
export const workshopCard = p => card('Workshop', html`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><div style="flex:1;min-width:120px"><div style="font:600 14px 'Geist',sans-serif">${p.items}</div><div style=${MUTED}>${p.size}</div></div><button style=${BTN} onClick=${p.onSubs} class="dcha">Subscriptions</button><button style=${BTN} onClick=${p.onOpen} class="dcha">Open Workshop</button></div>`);

// p: { value, count, onInput }
export const notesCard = p => card('Notes', html`<textarea maxlength="1000" rows="3" placeholder="e.g. crosshair code, server IPs, what to try next time" value=${p.value} onInput=${p.onInput} aria-label="Notes for this game" style="width:100%;box-sizing:border-box;resize:vertical;min-height:72px;padding:10px 12px;border-radius:10px;border:1px solid rgba(var(--fg-rgb),.1);background:rgba(var(--fg-rgb),.03);color:var(--text-soft);font:400 13px/1.5 'Geist',sans-serif;outline:none" class="dcf14"></textarea>`, html`<span style="font:400 11px 'Geist Mono',monospace;color:var(--text-subtle)">${p.count}</span>`);

// The account pill with its menu, shared by the screenshots and achievements cards.
// p: { acct: { name, bg, ini, img }, menuOpen, onMenu, accounts: [{ name, bg, ini, img, count, pick, on }] }
export function acctPill(p) {
  const av = a => html`<span style=${`width:20px;height:20px;flex:none;border-radius:99px;display:grid;place-items:center;font:700 10px 'Geist',sans-serif;color:#fff;background:${a.img ? `url("${a.img}") center/cover` : a.bg}`}>${a.img ? '' : a.ini}</span>`;
  return html`<div style="position:relative"><button aria-haspopup="true" aria-expanded=${p.menuOpen} style="display:flex;align-items:center;gap:6px;padding:4px 9px 4px 4px;border-radius:99px;border:1px solid rgba(var(--fg-rgb),.12);background:transparent;color:var(--text-soft);font:500 12px 'Geist',sans-serif;cursor:pointer" onClick=${p.onMenu} class="dcha" title="Whose progress">${av(p.acct)}${p.acct.name}<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m6 9 6 6 6-6"></path></svg></button>
${p.menuOpen ? html`<div role="menu" style="position:absolute;right:0;top:34px;z-index:30;min-width:210px;padding:5px;border-radius:12px;background:var(--surface-raised);border:1px solid rgba(var(--fg-rgb),.12);box-shadow:0 16px 40px var(--shadow-c)">${p.accounts.map(a => html`<button role="menuitemradio" aria-checked=${a.on} style=${`display:flex;align-items:center;gap:9px;width:100%;padding:8px 10px;border:0;border-radius:8px;background:${a.on ? 'rgba(var(--fg-rgb),.07)' : 'transparent'};color:var(--text-soft);font:500 12.5px 'Geist',sans-serif;cursor:pointer;text-align:left`} onClick=${a.pick} class="dctg">${av(a)}${a.name}<span style="margin-left:auto;font:500 11px 'Geist Mono',monospace;color:var(--text-subtle)">${a.count}</span></button>`)}</div>` : null}</div>`;
}

const achRow = a => html`<div style=${`display:flex;gap:12px;align-items:center;padding:9px 0;border-top:1px solid rgba(var(--fg-rgb),.06);opacity:${a.got ? 1 : .5}`}>
<span style=${`width:40px;height:40px;flex:none;border-radius:9px;background:rgba(var(--fg-rgb),.06) ${a.icon ? `url("${a.icon}") center/cover` : ''}`}></span>
<div style="min-width:0;flex:1"><div style="font:600 13px 'Geist',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title=${a.name}>${a.name}</div><div style="font:400 12px/1.4 'Geist',sans-serif;color:var(--text-subtle);margin-top:2px">${a.desc}</div></div>
<span style="flex:none;font:500 11px 'Geist Mono',monospace;color:var(--text-subtle);white-space:nowrap">${a.when}</span></div>`;

// p: { pill, head, pct, rows: [{ name, desc, icon, got, when }], showAll: { label, on } | null, note, loading }
export function achievementsCard(p) {
  const medal = html`<span style="width:46px;height:46px;flex:none;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(var(--accent-rgb),.25),rgba(var(--accent2-rgb),.15));color:var(--accent)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"></circle><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"></path></svg></span>`;
  const body = html`<div style="display:flex;align-items:center;gap:14px">${medal}<div style="flex:1;min-width:0"><div style="font:600 14px 'Geist',sans-serif">${p.head}</div>${p.pct != null ? bar(p.pct) : null}</div></div>
${p.note ? html`<div style=${`${MUTED};margin-top:12px`}>${p.note}</div>` : null}
${p.rows.length ? html`<div style="margin-top:10px;max-height:420px;overflow-y:auto">${p.rows.map(achRow)}</div>` : null}
${p.loading ? html`<div style=${`${MUTED};margin-top:10px`}>Loading…</div>` : null}`;
  const aside = html`<div style="display:flex;align-items:center;gap:6px">${p.showAll ? html`<button style="border:0;background:transparent;color:var(--accent-strong);font:500 12px 'Geist',sans-serif;cursor:pointer;padding:2px 4px;border-radius:6px" onClick=${p.showAll.on} class="dch4">${p.showAll.label}</button>` : null}${p.pill ? acctPill(p.pill) : null}</div>`;
  return card('Achievements', body, aside);
}

const NEWS_ICONS = {
  patch: html`<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`,
  news: html`<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>`,
};
const skeleton = html`<div style="height:62px;border-radius:12px;margin-bottom:8px;background:rgba(var(--fg-rgb),.05);animation:shim 1.4s ease-in-out infinite"></div>`;

// p: { state: 'loading' | 'error' | 'ok', groups: [{ day, items: [{ patch, title, isNew, open }] }], onRetry, onAll }
export function activityCard(p) {
  const LINK = "border:0;background:transparent;color:var(--accent-strong);font:500 12px 'Geist',sans-serif;cursor:pointer;padding:2px 4px;border-radius:6px";
  const body = p.state === 'loading' ? html`${skeleton}${skeleton}${skeleton}`
    : p.state === 'error' ? html`<div style="display:flex;align-items:center;gap:10px"><div style=${`flex:1;${MUTED}`}>Couldn't load news from Steam. Check your connection.</div><button style=${BTN} onClick=${p.onRetry} class="dcha">Try again</button></div>`
    : !p.groups.length ? html`<div style=${MUTED}>No announcements from the developer yet.</div>`
    : html`${p.groups.map((grp, gi) => html`<div style=${`display:flex;align-items:center;gap:10px;margin:${gi ? 14 : 0}px 0 8px;${LABEL}`}>${grp.day}<span style="flex:1;height:1px;background:rgba(var(--fg-rgb),.07)"></span></div>
${grp.items.map(n => html`<button style="display:flex;gap:14px;align-items:center;width:100%;margin-bottom:8px;padding:12px 14px;border-radius:12px;border:1px solid rgba(var(--fg-rgb),.07);background:rgba(var(--fg-rgb),.02);color:inherit;cursor:pointer;text-align:left" onClick=${n.open} title="Read in SwapDeck" class="dche2"><span style="width:40px;height:40px;flex:none;border-radius:10px;display:grid;place-items:center;background:rgba(var(--fg-rgb),.06);color:var(--text-muted)">${n.patch ? NEWS_ICONS.patch : NEWS_ICONS.news}</span><span style="min-width:0"><span style=${`display:flex;align-items:center;gap:7px;${LABEL}`}>${n.patch ? 'Patch notes' : 'News'}${n.isNew ? html`<span style="padding:1px 6px;border-radius:99px;background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent-strong);letter-spacing:.06em" title="Posted after you last played">New</span>` : null}</span><span style="display:block;font:500 14px 'Geist',sans-serif;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n.title}</span></span></button>`)}`)}`;
  return card('Activity', body, html`<button style=${LINK} onClick=${p.onAll} class="dch4">All news in Steam</button>`);
}

// p: { state, items: [{ name, art, badge: { label, ok } | null }], more, note, onStore }
export function dlcCard(p) {
  const body = p.state === 'loading' ? html`<div style=${MUTED}>Loading…</div>`
    : p.state === 'error' ? html`<div style=${MUTED}>Couldn't load DLC from Steam.</div>`
    : html`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${p.items.map(d => html`<div style="border-radius:10px;overflow:hidden;border:1px solid rgba(var(--fg-rgb),.08);min-width:0"><div style=${`position:relative;aspect-ratio:460/215;background:rgba(var(--fg-rgb),.05) url("${d.art}") center/cover`}>${d.badge ? html`<span style=${`position:absolute;top:6px;right:6px;background:rgba(0,0,0,.7);font:600 10px 'Geist Mono',monospace;letter-spacing:.06em;padding:2px 7px;border-radius:99px;border:1px solid ${d.badge.ok ? 'rgba(74,222,128,.45)' : 'rgba(var(--fg-rgb),.15)'};color:${d.badge.ok ? 'var(--ok-fg)' : 'var(--text-subtle)'}`}>${d.badge.label}</span>` : null}</div><div style="padding:8px 10px;font:500 12px/1.35 'Geist',sans-serif;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden" title=${d.name}>${d.name}</div></div>`)}</div>${p.more ? html`<div style=${`${MUTED};margin-top:10px`}>${p.more}</div>` : null}${p.note ? html`<div style=${`${MUTED};margin-top:6px`}>${p.note}</div>` : null}`;
  return card('DLC', body, html`<button style="border:0;background:transparent;color:var(--accent-strong);font:500 12px 'Geist',sans-serif;cursor:pointer;padding:2px 4px;border-radius:6px" onClick=${p.onStore} class="dch4">View in store</button>`);
}

// CS2's own stats for one account (Premier, ranks, level, commendations, medals), on CS2's Overview.
// p: { pill | null, state: 'none' | 'loading' | 'empty' | 'ok', emptyText, onConnect, onRefresh,
//      cd: { kind, reason, left } | null, premier: { text, fg, bg, bd, wins }, ranks: [{ label, name, ab, col, artBg, wins }],
//      lvl, xpText, xpPct, xpLeft, coms: [{ label, n, color }], medals: [{ name, ab, bg, bd }], medalCount }
const tile = (body, extra = '') => html`<div style=${`border-radius:12px;border:1px solid rgba(var(--fg-rgb),.08);background:rgba(var(--fg-rgb),.02);padding:12px 14px;min-width:0;${extra}`}>${body}</div>`;
export function cs2StatsCard(p) {
  const aside = p.pill ? acctPill(p.pill) : null;
  if (p.state === 'none') return card('CS2 stats', html`<div style=${MUTED}>Premier rating, ranks, level and medals come from CS2's servers for accounts connected for stats.</div><div style="margin-top:10px"><button style=${BTN} onClick=${p.onConnect} class="dcha">Connect for stats</button></div>`, aside);
  if (p.state === 'loading') return card('CS2 stats', html`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${[0, 1, 2].map(i => html`<div style=${`height:92px;border-radius:12px;background:rgba(var(--fg-rgb),.05);animation:shim 1.2s ease-in-out ${i / 10}s infinite`}></div>`)}</div><div style=${`${MUTED};margin-top:10px`}>Asking CS2's servers… usually 5 to 10 seconds</div>`, aside);
  if (p.state === 'empty') return card('CS2 stats', html`<div style=${MUTED}>${p.emptyText}</div><div style="margin-top:10px"><button style=${BTN} onClick=${p.onRefresh} class="dcha">Refresh stats</button></div>`, aside);
  const small = (t, c = 'var(--text-subtle)') => html`<div style=${`font:500 11.5px 'Geist',sans-serif;color:${c};margin-top:6px`}>${t}</div>`;
  const head = t => html`<div style=${LABEL}>${t}</div>`;
  const cd = p.cd ? html`<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.4);margin-bottom:12px"><div style="flex:1;min-width:0"><div style="font:600 13px 'Geist',sans-serif;color:var(--warn-fg)">${p.cd.kind} active</div><div style="font:400 12px 'Geist',sans-serif;color:var(--text-soft);margin-top:1px">Reason: ${p.cd.reason}</div></div><div style="font:700 15px 'Geist Mono',monospace;color:var(--warn-fg)">${p.cd.left}</div></div>`
    : html`<div style="display:inline-flex;align-items:center;gap:7px;margin-bottom:12px;font:600 10.5px 'Geist Mono',monospace;padding:4px 10px;border-radius:99px;background:rgba(74,222,128,.1);color:var(--ok-fg);border:1px solid rgba(74,222,128,.35);text-transform:uppercase"><span style="width:6px;height:6px;border-radius:99px;background:#4ade80"></span>No cooldown or penalty</div>`;
  const pr = p.premier;
  const top = html`<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">
${tile(html`${head('Premier')}<div style=${`font:800 26px/1.15 'Geist Mono',monospace;color:${pr.fg};margin-top:8px`}>${pr.text}</div>${small(pr.wins)}`, `border-color:${pr.bd};background:${pr.bg};border-left:3px solid ${pr.fg}`)}
${p.ranks.map(r => tile(html`${head(r.label)}<div style="display:flex;align-items:center;gap:8px;margin-top:10px"><span style=${`width:46px;height:22px;flex:none;border-radius:6px;background:${r.artBg};border:1px solid ${r.col};display:grid;place-items:center;font:700 10px 'Geist Mono',monospace;color:#fff`}>${r.ab}</span><span style="font:600 12.5px/1.25 'Geist',sans-serif;min-width:0">${r.name}</span></div>${small(r.wins)}`))}</div>`;
  const mid = html`<div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:10px;margin-top:10px">
${tile(html`<div style="display:flex;align-items:center;gap:10px"><span style="width:36px;height:36px;flex:none;border-radius:99px;border:2px solid var(--accent);display:grid;place-items:center;font:700 13px 'Geist Mono',monospace">${p.lvl}</span><div style="flex:1;min-width:0">${head('Profile level')}<div style="font:600 13px 'Geist',sans-serif;margin-top:2px">Level ${p.lvl}</div></div><span style="font:500 11px 'Geist Mono',monospace;color:var(--text-muted)">${p.xpText}</span></div>${bar(p.xpPct)}${small(p.xpLeft)}`)}
${tile(html`${head('Commendations')}<div style="display:flex;flex-direction:column;gap:5px;margin-top:8px">${p.coms.map(c => html`<div style="display:flex;align-items:center;gap:7px;font:500 12px 'Geist',sans-serif;color:var(--text-soft)"><span style=${`width:7px;height:7px;border-radius:99px;background:${c.color}`}></span>${c.label}<span style="margin-left:auto;font:700 12.5px 'Geist Mono',monospace;color:var(--text)">${c.n}</span></div>`)}</div>`)}</div>`;
  const medals = p.medals.length ? html`<div style="margin-top:14px"><div style="display:flex;align-items:baseline;margin-bottom:10px">${head('Medals & service coins')}<span style="margin-left:auto;font:400 11px 'Geist',sans-serif;color:var(--text-subtle)">${p.medalCount}</span></div><div style="display:flex;gap:12px;flex-wrap:wrap">${p.medals.map(m => html`<div style="width:64px;display:flex;flex-direction:column;align-items:center;gap:5px" title=${m.name}><span style=${`width:42px;height:42px;border-radius:99px;background:${m.bg};border:1.5px solid ${m.bd};display:grid;place-items:center;font:700 10px 'Geist Mono',monospace;color:#fff`}>${m.ab}</span><span style="font:400 10.5px/1.3 'Geist',sans-serif;color:var(--text-muted);text-align:center;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${m.name}</span></div>`)}</div></div>` : null;
  // Library layout: one row (Premier, ranks, level); commendations and medals open with More.
  if (p.compact) {
    const tiles = [].concat(top.props.children).filter(x => x && typeof x === 'object');
    const lvl = tile(html`${head('Level')}<div style="font:800 22px/1.15 'Geist Mono',monospace;margin-top:8px">${p.lvl}</div>${small(p.xpLeft)}`);
    const more = html`<button style="margin-top:10px;width:100%;height:32px;border-radius:9px;border:1px dashed rgba(var(--fg-rgb),.18);background:transparent;color:var(--text-muted);font:600 12px 'Geist',sans-serif;cursor:pointer" aria-expanded=${!!p.expanded} onClick=${p.onMore}>${p.expanded ? 'Less' : 'Commendations and medals'}</button>`;
    return card('CS2 stats', html`${cd}<div class="cs-cwrap"><div class="cs-cgrid">${tiles}${lvl}</div></div>${p.expanded ? html`<div style="margin-top:10px">${tile(html`${head('Commendations')}<div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:8px">${p.coms.map(c => html`<span style="display:flex;align-items:center;gap:7px;font:500 12px 'Geist',sans-serif;color:var(--text-soft)"><span style=${`width:7px;height:7px;border-radius:99px;background:${c.color}`}></span>${c.label}<b style="font:700 12.5px 'Geist Mono',monospace;color:var(--text)">${c.n}</b></span>`)}</div>`)}</div>${medals}` : null}${more}`, aside);
  }
  return card('CS2 stats', html`${cd}${top}${mid}${medals}`, aside);
}

// p: { pill | null, state: 'none' | 'loading' | 'error' | 'ok', error, recent: [{ name, avatar, sub, open }], recentLabel,
//      ever: [{ name, avatar, open }], everLabel, onConnect }
export function friendsCard(p) {
  const face = (f, s) => html`<span style=${`display:block;width:${s}px;height:${s}px;flex:none;border-radius:8px;background:rgba(var(--fg-rgb),.08) ${f.avatar ? `url("${f.avatar}") center/cover` : ''}`}></span>`;
  const body = p.state === 'none' ? html`<div style=${MUTED}>See which friends play this game: connect one of your accounts for stats in its details.</div><div style="margin-top:10px"><button style=${BTN} onClick=${p.onConnect} class="dcha">Connect for stats</button></div>`
    : p.state === 'loading' ? html`<div style=${MUTED}>Asking Steam…</div>`
    : p.state === 'error' ? html`<div style=${MUTED}>Couldn't load friends from Steam: ${p.error}</div>`
    : !p.recent.length && !p.ever.length ? html`<div style=${MUTED}>None of your friends have played this yet.</div>`
    : html`${p.recent.length ? html`<div style=${`${MUTED};margin-bottom:10px`}>${p.recentLabel}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 14px">${p.recent.map(f => html`<button style="display:flex;align-items:center;gap:9px;min-width:0;padding:0;border:0;background:transparent;color:inherit;cursor:pointer;text-align:left" onClick=${f.open} title="Open Steam profile">${face(f, 32)}<span style="min-width:0"><span style="display:block;font:500 13px 'Geist',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.name}</span><span style="display:block;font:400 11.5px 'Geist',sans-serif;color:var(--text-subtle)">${f.sub}</span></span></button>`)}</div>` : null}
${p.ever.length ? html`<div style=${`${MUTED};margin-top:${p.recent.length ? 14 : 0}px`}>${p.everLabel}</div><div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px">${p.ever.map(f => html`<button style="padding:0;border:0;background:transparent;cursor:pointer;border-radius:7px" onClick=${f.open} title=${f.name} aria-label=${f.name}>${face(f, 26)}</button>`)}</div>` : null}`;
  return card('Friends who play', body, p.pill ? acctPill(p.pill) : null);
}
