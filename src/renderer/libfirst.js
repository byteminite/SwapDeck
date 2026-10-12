// First start: Welcome, Finding Steam, Your accounts, Make it yours, All set. Shown once on a fresh install
// (and from Settings, General, Replay first start). Everything it changes is an ordinary setting.
import { html } from './vendor/htm-preact.js';
import { icon } from './libicons.js';

const STEPS = ['hi', 'steam', 'accts', 'look', 'done'];
const ACC = [['cyan', '#22d3ee'], ['violet', '#a78bfa'], ['amber', '#f59e0b'], ['red', '#f43f5e'], ['green', '#22c55e'], ['pink', '#ec4899']];

export const startFirst = app => app.setState({ ob: { step: 'hi', skip: [], layout: app.state.settings.layout === 'library' ? 'library' : 'classic' }, setOpen: false });
export const firstDue = (app, st) => !!(st && st.newInstall && !(st.settings || {}).obDone);

function vals(app) {
  const S = app.state, O = S.ob, cfg = S.settings, set = p => app.setState(s => ({ ob: s.ob && { ...s.ob, ...p } }));
  const steam = app.steamState, found = steam !== 'not-found';
  const finish = () => {
    const hidden = [...new Set([...(cfg.hiddenAccts || []), ...O.skip])];
    app.setCfg({ obDone: true, layout: O.layout, hiddenAccts: hidden });
    app.setState({ ob: null });
    app.toast('success', 'Welcome to SwapDeck', 'Pick a game and press Play, or switch accounts from the avatar menu.');
  };
  return {
    step: O.step, idx: STEPS.indexOf(O.step), n: STEPS.length, go: k => () => set({ step: k }),
    skip: () => { app.setCfg({ obDone: true }); app.setState({ ob: null }); },
    found, path: S.steam.exe || '', retrying: !!S.retrying, onRetry: () => app.retry(), onBrowse: () => app.browse(),
    onGetSteam: () => window.api.openProfile('https://store.steampowered.com/about/'),
    accts: S.accounts.map(a => ({ sid: a.sid, name: a.name, ini: app.find(a.sid) ? app.find(a.sid).ini : a.name.slice(0, 2).toUpperCase(), bg: a.avatar ? 'url("' + a.avatar + '") center/cover no-repeat,#111' : (app.find(a.sid) || {}).grad || '#333',
      on: !O.skip.includes(a.sid), toggle: () => set({ skip: O.skip.includes(a.sid) ? O.skip.filter(x => x !== a.sid) : [...O.skip, a.sid] }) })),
    adding: !!S.addOpen, onAdd: () => app.addAcc(),
    layout: O.layout, pickLayout: k => set({ layout: k }),
    accent: cfg.accent || 'cyan', pickAccent: k => app.setCfg({ accent: k }),
    startup: !!cfg.startup, toggleStartup: () => app.setCfg({ startup: !cfg.startup }),
    games: S.lib.filter(g => g.installed).length, covers: S.lib.filter(g => g.steam && g.installed).slice(0, 8).map(g => g.cover),
    finish,
  };
}

const feat = (ic, b, s) => html`<div class="ob-feat"><span class="ob-fic">${icon(ic, 19)}</span><div><b>${b}</b><span>${s}</span></div></div>`;
const cta = (label, fn, off) => html`<button class="ob-cta" disabled=${!!off} onClick=${fn}>${label}${icon('chevron', 16)}</button>`;

const VIEWS = {
  hi: P => html`<div class="ob-logo"><i></i></div><h1>Welcome to SwapDeck</h1><p class="ob-lead">Switch Steam accounts in one click, and give every game its own setup.</p>
<div class="ob-feats">${feat('repeat', 'One-click account switching', 'No more typing passwords to change accounts.')}${feat('monitor', 'Each game, its own setup', 'Pick the account, monitor, resolution and sound for every game.')}${feat('history', 'Everything goes back', 'When you are done, your display and sound go back to normal.')}</div>
<div class="ob-go">${cta('Get started', P.go('steam'))}</div><div class="ob-fine">Free and open source. Your sign-ins stay on this PC.</div>`,
  steam: P => html`<h1>Finding Steam</h1><p class="ob-lead">SwapDeck works with the Steam that's already on your PC.</p>
<div class="ob-box">${P.retrying ? html`<div class="ob-find"><span class="ob-ic"><span class="ln-spin big"></span></span><div><b>Looking for Steam...</b><span>Checking the usual places on this PC.</span></div></div>`
  : P.found ? html`<div class="ob-find ok"><span class="ob-ic">${icon('check2', 22)}</span><div><b>Found Steam</b><span><code>${P.path}</code></span><span>It remembers ${P.accts.length} ${P.accts.length === 1 ? 'account' : 'accounts'} on this PC.</span></div></div>`
    : html`<div class="ob-find bad"><span class="ob-ic">${icon('search', 22)}</span><div><b>SwapDeck couldn't find Steam</b><span>Steam needs to be installed. If it's in an unusual folder, point SwapDeck to it.</span></div></div>`}</div>
<div class="ob-go">${P.found ? html`<button class="st-btn" onClick=${P.go('hi')}>Back</button>${cta('Continue', P.go('accts'))}` : html`<button class="st-btn" onClick=${P.onGetSteam}>${icon('external', 15)}Get Steam</button><button class="st-btn" onClick=${P.onBrowse}>Find it myself</button>${cta('Try again', P.onRetry)}`}</div>`,
  accts: P => { const n = P.accts.filter(a => a.on).length; return html`<h1>Your accounts</h1><p class="ob-lead">These are the Steam accounts that have signed in on this PC. Pick the ones you want in SwapDeck.</p>
<div class="ob-box list">${P.accts.length ? P.accts.map(a => html`<div class="ob-acc"><span class="ob-av" style=${'background:' + a.bg}>${a.bg.startsWith('url') ? '' : a.ini}</span><div class="ob-m"><b>${a.name}</b><span>Signed in on this PC before</span></div><button class=${'st-tg' + (a.on ? ' on' : '')} role="switch" aria-checked=${a.on} aria-label=${'Add ' + a.name} onClick=${a.toggle}></button></div>`)
  : html`<div class="ob-none">No Steam accounts have signed in on this PC yet.</div>`}
<button class="ob-add" disabled=${P.adding} onClick=${P.onAdd}>${icon('userplus', 15)}${P.adding ? 'Waiting for Steam to sign in' : 'Add another account'}</button></div>
<div class="ob-go"><button class="st-btn" onClick=${P.go('steam')}>Back</button>${cta(P.accts.length ? (n ? 'Add ' + n + (n === 1 ? ' account' : ' accounts') : 'Continue without accounts') : 'Continue', P.go('look'))}</div>`; },
  look: P => { const bar = 'border-radius:5px;background:rgba(var(--fg-rgb),.12)';
    const lay = (k, t, s, mini) => html`<button class=${'st-lay' + (P.layout === k ? ' on' : '')} aria-pressed=${P.layout === k} onClick=${() => P.pickLayout(k)}><div class="st-mini">${mini}</div><b>${t}${P.layout === k ? html`<span class="st-chk">${icon('check', 13)}</span>` : null}</b><span>${s}</span></button>`;
    return html`<h1>Make it yours</h1><p class="ob-lead">You can change all of this later in Settings.</p>
<div class="st-lays ob-lays">${lay('library', 'Library', 'Your games up front, with covers', html`<i style=${'width:12px;' + bar}></i><div class="st-mg">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => html`<i style=${'border-radius:4px;background:' + (i === 1 ? 'var(--accent)' : 'rgba(var(--fg-rgb),.12)')}></i>`)}</div>`)}${lay('classic', 'Classic', 'Your accounts up front, as in 1.4.0', html`<i style=${'flex:1;' + bar}></i><i style=${'flex:1;' + bar}></i><i style=${'flex:1;' + bar}></i>`)}</div>
<div class="ob-box"><div class="ob-opt"><div class="ob-m"><b>Accent colour</b><span>Buttons and highlights.</span></div><div class="ob-sw">${ACC.map(([k, c]) => html`<button class=${P.accent === k ? 'on' : ''} style=${'background:' + c + ';color:' + c} aria-label=${'Accent ' + k} aria-pressed=${P.accent === k} onClick=${() => P.pickAccent(k)}></button>`)}</div></div>
<div class="ob-opt"><div class="ob-m"><b>Start with Windows</b><span>Waits quietly in the tray, ready to switch.</span></div><button class=${'st-tg' + (P.startup ? ' on' : '')} role="switch" aria-checked=${P.startup} aria-label="Start with Windows" onClick=${P.toggleStartup}></button></div></div>
<div class="ob-go"><button class="st-btn" onClick=${P.go('accts')}>Back</button>${cta('Finish', P.go('done'))}</div>`; },
  done: P => { const n = P.accts.filter(a => a.on).length; return html`<div class="ob-done">${icon('check', 40)}</div><h1>You're all set</h1><p class="ob-lead">Pick a game and press Play. SwapDeck switches to the right account for you.</p>
<div class="ob-sum"><div><b>${n}</b><span>${n === 1 ? 'account' : 'accounts'}</span></div><div><b>${P.games}</b><span>installed games</span></div><div><b>${P.layout === 'library' ? 'Library' : 'Classic'}</b><span>layout</span></div></div>
<div class="ob-go">${cta('Open SwapDeck', P.finish)}</div><div class="ob-fine">Tip: connect accounts for stats later, from the account menu or an account's page.</div>`; },
};

export function firstOverlay(app) {
  if (!app.state.ob) return null;
  const P = vals(app);
  return html`<div class="ob" role="dialog" aria-modal="true" aria-label="Set up SwapDeck"><div class="ob-glow"></div>
<div class="ob-covers">${P.covers.map(c => html`<i style=${'background-image:url("' + c + '")'}></i>`)}</div>
<div class="ob-top"><div class="ob-brand"><span class="ob-lg"><i></i></span>SwapDeck</div><div class="ob-dots" aria-label=${'Step ' + (P.idx + 1) + ' of ' + P.n}>${STEPS.map((s, k) => html`<i class=${k <= P.idx ? 'on' : ''}></i>`)}</div>${P.step !== 'done' ? html`<button class="ob-skip" onClick=${P.skip}>Skip setup</button>` : html`<span style="width:90px"></span>`}</div>
<div class="ob-stage"><div class="ob-card" key=${P.step}>${VIEWS[P.step](P)}</div></div></div>`;
}
