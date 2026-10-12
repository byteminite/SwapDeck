// Library layout: the account menu under the top-right avatar, and the full-width account page.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';
import { dropdown } from './libgames.js';

export function acctMenu(M) {
  const row = r => html`<div class=${'am-row' + (r.cur ? ' cur' : '')} role="button" tabindex="0" aria-label=${r.cur ? r.name + ', signed in' : 'Switch to ' + r.name} onClick=${r.onSwitch} onKeyDown=${e => { if (e.key === 'Enter' && e.target === e.currentTarget) r.onSwitch(); }}>
<span class="am-av" style=${'background:' + r.bg}>${r.ini}<s style=${'background:' + r.dot}></s></span>
<div class="am-m"><b>${r.name}</b><span>${r.sub}</span></div>
${r.cur ? html`<span class="am-cb">CURRENT</span>` : null}${r.linked ? null : html`<button class="am-cn" onClick=${r.onConnect}>Connect</button>`}
<button class="am-ib" aria-label=${'Details for ' + r.name} title="Details" onClick=${r.onInfo}>${icon('info', 14)}</button></div>`;
  return html`<div class="lg-catch" onClick=${M.close}></div><div class="am" role="dialog" aria-label="Accounts">
<div class="am-h"><b>Accounts</b><span>${M.count}${M.hiddenN ? html` · ${M.hiddenN} hidden <button class="am-show" onClick=${M.onShowHidden}>Show</button>` : null}</span></div>
<div class="am-list">${M.rows.length ? M.rows.map(row) : html`<div class="am-none">No accounts yet. Add one to switch with a click.</div>`}</div>
<div class="am-f">${M.unlinkedN ? html`<button class="c" onClick=${M.onConnectAll}>${icon('link', 14)}Connect all (${M.unlinkedN})</button>` : M.rows.length ? html`<span class="am-done">${icon('check', 14)}All connected</span>` : null}
<button disabled=${M.adding} onClick=${M.onAdd}>${icon('userplus', 14)}${M.adding ? 'Waiting for Steam' : 'Add account'}</button></div></div>`;
}

function head(P) {
  const chips = html`${P.cur ? html`<span class="ap-chip cur">Signed in now</span>` : null}<span class="ap-chip"><i style=${'background:' + P.dot}></i>${P.status}</span>${P.linked ? null : html`<span class="ap-chip warn">Not connected</span>`}
${P.tags.map(t => html`<button class="ap-chip tag" title="Remove tag" aria-label=${'Remove tag ' + t.label} onClick=${t.remove}><i style=${'background:' + t.dot}></i>${t.label}${icon('x', 11)}</button>`)}
<label class="ap-tagx">${icon('plus', 12)}<input value=${P.tagDraft} placeholder="Tag" maxlength="20" aria-label="Add a tag, then press Enter" onInput=${P.onTagDraft} onKeyDown=${P.onTagKey} /></label>`;
  return html`<div class="ap-head"><button class="ap-back" aria-label="Back" onClick=${P.onBack}>${icon('back', 18)}</button>
<span class="ap-av" style=${'background:' + P.av}>${P.ini}<s style=${'background:' + P.dot}></s></span>
<div class="ap-id"><h1>${P.name}<button class=${P.pinned ? 'on' : ''} aria-pressed=${P.pinned} aria-label=${P.pinned ? 'Unpin account' : 'Pin account'} title=${P.pinned ? 'Pinned to the top of Accounts' : 'Pin to the top of Accounts'} onClick=${P.onPin}>${icon('star', 18)}</button></h1><div class="ap-st">${chips}</div></div>
<div class="ap-acts"><button class="ap-btn" onClick=${P.onProfile}>${icon('external', 16)}Steam profile</button>${P.signedIn ? html`<button class="gp-cta" disabled>${icon('check', 17)}Signed in</button>` : html`<button class="gp-cta" onClick=${P.onSwitch}>${icon('repeat', 17)}${P.swLabel}</button>`}</div></div>`;
}

function stats(P) {
  const conn = P.linked ? null : html`<div class="ap-conn"><span class="ap-cic">${icon('link', 20)}</span><div class="ap-cm"><b>Connect ${P.name} for stats</b><span>See its level, every game it owns, friends, bans and wallet. One sign-in through Steam.</span></div><button class="gp-cta" onClick=${P.onConnect}>${icon('link', 16)}Connect</button></div>`;
  return html`${conn}<div class="ap-stats">${P.stats.map(s => html`<div class="ap-stat"><label>${s.label}</label>${s.v == null ? html`<b class="lock" title="Connect to see">${icon('lock', 15)}</b>` : html`<b class=${s.bad ? 'bad' : s.good ? 'good' : ''}>${s.v}</b>`}</div>`)}</div>`;
}

function games(P) {
  const G = P.games;
  const seg = html`<span class="su-seg">${G.sorts.map(s => html`<button class=${s.on ? 'on' : ''} aria-pressed=${s.on} onClick=${s.pick}>${s.label}</button>`)}</span>`;
  const linked = G.loading ? html`<div class="ap-mut">Loading the games this account owns...</div>`
    : G.empty ? html`<div class="ap-mut">No game list yet. Use Refresh stats under Advanced.</div>`
      : html`${G.rows.map(r => html`<button class="ap-g" onClick=${r.onInfo}><span class="ap-gic" style=${'background:' + r.icBg}>${r.ab}</span><span class="ap-gm"><b>${r.n}</b><span>${r.w !== '—' ? r.w + ' in the last 2 weeks' : 'Not played lately'}${r.banned ? ' · VAC banned' : ''}</span></span><span class="ap-bar"><i style=${'width:' + r.pct}></i></span><span class="ap-h">${r.h}</span></button>`)}
${G.more ? html`<button class="ap-more" onClick=${G.toggleMore}>${G.more}</button>` : null}`;
  const here = G.here.length ? G.here.map(g => html`<button class="ap-g" onClick=${g.on}><span class="ap-gcap" style=${'background:' + g.bg}></span><span class="ap-gm"><b>${g.name}</b><span>Plays as this account</span></span></button>`)
    : html`<div class="ap-mut">Connect this account to see every game it owns.</div>`;
  return html`<div class="ap-card"><h3>${G.linked ? 'Games on this account' : 'Games set to this account'}<span class="ap-hr"><small>${G.summary}</small>${G.linked && !G.loading && !G.empty ? seg : null}</span></h3>${G.linked ? linked : here}</div>`;
}

function side(P) {
  return html`<div class="ap-card"><h3>At a glance</h3><div class="ap-kv">${P.glance.map(k => html`<div><label>${k.label}</label>${k.v == null ? html`<b class="mut">Connect to see</b>` : html`<b class=${k.good ? 'good' : k.bad ? 'bad' : ''}>${k.v}</b>`}</div>`)}</div></div>
<div class="ap-card"><h3>After switching to ${P.name}</h3>${P.launchDd.open ? html`<div class="lg-catch" onClick=${P.closeLaunch}></div>` : null}
<div class="ap-line"><span class="ap-mut">Start a game</span><div class="ap-dd">${dropdown(P.launchDd)}</div></div><div class="ap-hint">${P.launchNow}</div>
<label class="ap-l" for="apNote">Note <small>${P.noteCount}</small></label><textarea id="apNote" class="ap-note" rows="2" maxlength="140" placeholder="What this account is for, a friend code..." value=${P.note} onInput=${P.onNote}></textarea>
<details class="ap-adv"><summary>${icon('chevron', 14)}Advanced</summary>
<div class="ap-row"><b>Login name</b><code>${P.login}</code><button class="ap-copy" aria-label="Copy login name" onClick=${P.copyLogin}>${icon('copy', 13)}</button></div>
<div class="ap-row"><b>SteamID64</b><code>${P.sid}</code><button class="ap-copy" aria-label="Copy SteamID64" onClick=${P.copySid}>${icon('copy', 13)}</button></div>
<div class="ap-row"><b>Stats</b><span>${P.updLabel}</span><button class="ap-sm" disabled=${P.fetching} onClick=${P.onRefresh}>Refresh</button></div>
${P.pwSaved ? html`<div class="ap-row"><b>Saved password</b><span>Used to reconnect</span><button class="ap-sm" onClick=${P.onForgetPw}>Forget</button></div>` : null}
${P.linked ? html`<div class="ap-row"><b>Connected for stats</b><span></span><button class="ap-sm" onClick=${P.onUnlink}>Disconnect</button></div>` : null}</details></div>
<div class="ap-card"><div class="ap-danger">${P.rmAsk ? html`<div class="ap-cm"><b>Remove ${P.name} from SwapDeck?</b><span>It disappears from SwapDeck but stays saved in Steam. Show it again from the account menu.</span></div><button class="ap-sm" onClick=${P.onRemoveNo}>Cancel</button><button class="ap-sm d" onClick=${P.onRemoveYes}>Remove</button>`
  : html`<div class="ap-cm"><b>Remove from SwapDeck</b><span>Hides it here. Steam keeps its saved sign-in.</span></div><button class="ap-sm" onClick=${P.onRemove}>Remove</button>`}</div>
<div class="ap-danger ap-sep"><div class="ap-cm"><b>Forget on this PC</b><span>Also removes its saved sign-in from Steam. The Steam account itself isn't touched.</span></div><button class="ap-sm d" onClick=${P.onForget}>Forget</button></div></div>`;
}

export function acctPage(P) {
  const B = P.band;
  const band = B ? html`<div class="ap-band" style=${'background:' + B.bg}><div><div class=${'ap-k' + (B.live ? ' live' : '')}>${B.live ? html`<i></i>` : null}${B.k}</div><b>${B.name}</b><span>${B.sub}</span></div><div class="ap-sp"></div><button class="gp-chip" onClick=${B.act}>${icon(B.live ? 'grid' : 'info', 16)}${B.label}</button></div>` : null;
  const sess = html`<div class="ap-card"><h3>Recent sessions <small>through SwapDeck</small></h3>${P.sessions.length ? P.sessions.map(s => html`<div class="ap-s"><b>${s.name}</b>${s.when}<em>${s.dur}</em></div>`) : html`<div class="ap-mut">No sessions yet.</div>`}</div>`;
  return html`<div class="ap">${head(P)}${band}${stats(P)}<div class="ap-cols"><div>${games(P)}${sess}</div><div>${side(P)}</div></div></div>`;
}
