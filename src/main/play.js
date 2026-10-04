// Library "Play": switch to the game's account if needed, apply its display profile and sound device,
// start its companion apps, launch it, notice when it's running and when it closes, then put
// everything back. Stop never kills the game; it only restores and ends tracking.
// Companion apps SwapDeck started (and only those) are closed afterwards if the user asked for it.

const path = require('path');
const { spawn, execFile } = require('child_process');
const { shell } = require('electron');
const steam = require('./steam');
const store = require('./store');
const display = require('./display');
const audio = require('./audio');
const library = require('./library');

const ex = (cmd, args) => new Promise(r => execFile(cmd, args, { windowsHide: true }, (e, out) => r(e ? '' : String(out))));
const isRunning = async name => (await ex('tasklist', ['/FI', 'IMAGENAME eq ' + name, '/NH', '/FO', 'CSV'])).toLowerCase().includes('"' + name.toLowerCase() + '"');
// Ask nicely first (like clicking X); force it only if it's still open a few seconds later.
async function closeApp(name) {
  await ex('taskkill', ['/IM', name, '/T']);
  await new Promise(r => setTimeout(r, 5000));
  if (await isRunning(name)) await ex('taskkill', ['/IM', name, '/T', '/F']);
}

function createPlayer({ getLoc, accounts, switchTo, send, applyNormal }) {
  let session = null; // { gid, appid, steam, saved, restore, mode, monId, runningAt, timer, child }

  const emit = s => send('launch', {
    gid: s.gid, steps: s.steps, step: s.step, running: s.running,
    mon: s.monId, res: s.resTxt, changed: s.changed, mode: s.mode, restore: s.restore, acct: s.acct,
  });

  async function end(reason, error) {
    const s = session;
    if (!s) return;
    session = null;
    clearInterval(s.timer);
    let restored = false, restoreErr = null;
    if (s.saved && s.restore) {
      try { await display.restore(s.saved); store.setDisplaySaved(null); restored = true; }
      catch (e) { restoreErr = e.message; }
    }
    if (s.prevAudio) {
      try { await audio.setDefault(s.prevAudio); }
      catch (e) { send('notice', { type: 'warning', title: "Couldn't switch the sound back", msg: e.message }); }
    }
    for (const name of s.closeOnEnd) closeApp(name);
    const cfg = store.gameCfg(s.gid);
    const ms = s.runningAt ? Date.now() - s.runningAt : 0;
    store.setGameCfg(s.gid, { lastPlayed: Date.now(), playMs: (cfg.playMs || 0) + (s.steam ? 0 : ms) });
    // Playtime per account: Steam games count from when Steam reported them running.
    const played = s.steam ? (s.seenAt ? Date.now() - s.seenAt : 0) : ms;
    if (s.logAcct && played > 0) store.addPlay(s.logAcct, s.gid, played);
    send('launch-end', { gid: s.gid, reason, error: error || null, restored, restoreErr, hadMon: !!s.saved, restoreOn: s.restore, monId: s.monId, res: s.resTxt });
  }

  async function play(id) {
    if (session) return { ok: false, code: 'RUNNING', error: 'A game is already running through SwapDeck.' };
    const loc = getLoc();
    const lib = library.build(loc.dir, accounts());
    const g = lib.find(x => x.id === id);
    if (!g) return { ok: false, error: 'That game is no longer in your library.' };
    if (g.steam && !g.installed) { await shell.openExternal('steam://install/' + g.appid); return { ok: true, install: true }; }
    if (g.steam && !loc.exe) return { ok: false, code: 'NOT_FOUND', error: 'Steam not found' };
    if (!g.steam && !g.installed) return { ok: false, error: 'The game\'s .exe is missing: ' + g.exe };

    const st = await steam.status();
    const acc = g.steam && g.acct ? accounts().find(a => a.sid === g.acct) : null;
    const needSw = !!acc && !(st.running && st.activeSid === acc.sid);
    let mon = null, needD = false;
    const res = g.display.res ? store.resProfiles().find(p => p.id === g.display.res) || null : null;
    const mons = g.display.mon || res ? await display.list().catch(() => []) : [];
    if (g.display.mon) {
      mon = mons.find(m => m.id === g.display.mon) || null;
      needD = !!mon && !(mon.primary && mon.attached && g.display.mode === 'primary');
    }
    // Resolution: on the game's monitor, or the primary when the game uses the default display.
    const resMon = mon || mons.find(m => m.primary) || null;
    const needR = !!res && !!resMon && !(resMon.attached && resMon.w === res.w && resMon.h === res.h && !res.stretch && !needD);
    const resTxt = res ? res.name + ' (' + res.w + '×' + res.h + (res.stretch ? ', stretched' : '') + ')' : '';
    const cur = accounts().find(a => a.sid === st.activeSid);
    const steps = [];
    if (g.steam) steps.push(needSw
      ? { k: 'acct', label: 'Switching to ' + acc.name, sub: 'Restarting Steam as ' + acc.login }
      : { k: 'acct', label: acc ? 'Switching to ' + acc.name : 'Steam account', sub: (acc ? 'Already signed in' : 'Using ' + (cur ? cur.name : 'the current account')) + ' · skipped', skip: true });
    steps.push(needD || needR
      ? { k: 'disp', label: 'Setting display', sub: [needD ? mon.label + (g.display.mode === 'only' ? ' only · others off' : ' → primary') : null, needR ? resTxt : null].filter(Boolean).join(' · ') }
      : { k: 'disp', label: 'Setting display', sub: (mon ? mon.label + ' is already primary' : 'Default display') + ' · skipped', skip: true });
    // Sound device and companion apps (steps only appear when the game uses them).
    let dev = null, prevAudio = null;
    if (g.audio) {
      const devs = await audio.list().catch(() => []);
      dev = devs.find(d => d.id === g.audio) || null;
      prevAudio = (devs.find(d => d.def) || {}).id || null;
      steps.push(dev && dev.id !== prevAudio
        ? { k: 'audio', label: 'Setting sound', sub: dev.name }
        : { k: 'audio', label: 'Setting sound', sub: (dev ? dev.name + ' is already in use' : "That sound device isn't connected") + ' · skipped', skip: true });
    }
    const apps = (g.apps || []).filter(a => a.path);
    const toStart = [];
    for (const a of apps) if (!(await isRunning(path.basename(a.path)))) toStart.push(a);
    if (apps.length) steps.push(toStart.length
      ? { k: 'apps', label: 'Starting companion apps', sub: toStart.map(a => path.basename(a.path, '.exe')).join(', ') }
      : { k: 'apps', label: 'Companion apps', sub: 'Already running · skipped', skip: true });
    const viaLauncher = g.steam && !!g.launcher;
    steps.push({ k: 'launch', label: 'Launching ' + g.name, sub: viaLauncher ? 'via ' + path.basename(g.launcher) + (g.opts ? ' ' + g.opts : '') : g.steam ? 'steam://rungameid/' + g.appid + (g.opts ? ' ' + g.opts : '') : path.basename(g.exe) + (g.opts ? ' ' + g.opts : '') });
    steps.push({ k: 'run', label: 'Game running' });

    const s = session = {
      gid: id, appid: g.appid, steam: g.steam, steps, step: 0, running: false,
      monId: needD ? mon.id : null, resTxt: needR ? resTxt : null, changed: needD || needR, mode: g.display.mode, restore: g.display.restore, acct: acc ? acc.sid : null,
      saved: null, runningAt: 0, timer: null, seenAt: 0, prevAudio: null, closeOnEnd: [],
      logAcct: acc ? acc.sid : g.steam ? st.activeSid || null : 'local',
    };
    emit(s);
    try {
      if (needSw) {
        const r = await switchTo(acc.sid, { forPlay: true });
        if (!r.ok) throw new Error(r.error || 'Switching account failed.');
        if (!r.signedIn) throw new Error(r.warn || 'Steam didn\'t sign in.');
      }
      if (session !== s) return { ok: false, cancelled: true };
      s.step++; emit(s);

      if (needD || needR) {
        s.saved = await display.apply(needD ? mon.id : null, g.display.mode, needR ? res : null);
        store.setDisplaySaved(s.saved);
        send('display-changed', { label: (needD ? mon : resMon).label, mode: needD ? g.display.mode : null, res: needR ? resTxt : null });
      }
      if (session !== s) return { ok: false, cancelled: true };
      s.step++; emit(s);

      if (g.audio) {
        if (dev && dev.id !== prevAudio) {
          try { await audio.setDefault(dev.id); s.prevAudio = prevAudio; }
          catch (e) { send('notice', { type: 'warning', title: "Couldn't switch the sound", msg: e.message }); }
        }
        s.step++; emit(s);
      }
      if (apps.length) {
        for (const a of toStart) {
          try {
            const c = spawn(a.path, steam.splitArgs(a.args), { cwd: path.dirname(a.path), detached: true, stdio: 'ignore', windowsHide: false });
            c.on('error', e => send('notice', { type: 'warning', title: "Couldn't start " + path.basename(a.path, '.exe'), msg: e.message }));
            c.unref();
            if (a.close) s.closeOnEnd.push(path.basename(a.path));
          } catch (e) { send('notice', { type: 'warning', title: "Couldn't start " + path.basename(a.path, '.exe'), msg: e.message }); }
        }
        s.step++; emit(s);
      }
      if (session !== s) return { ok: false, cancelled: true };

      if (viaLauncher) {
        // A launcher such as Content Manager: start it instead of the game. Steam stays signed in,
        // and the game is tracked through Steam's RunningAppID as usual once the launcher starts it.
        const child = spawn(g.launcher, steam.splitArgs(g.opts), { cwd: path.dirname(g.launcher), detached: true, stdio: 'ignore', windowsHide: false });
        child.on('error', e => { if (session === s) end('error', 'Couldn\'t start ' + path.basename(g.launcher) + ': ' + e.message); });
        // Closing the launcher without ever starting the game ends the session.
        child.on('exit', () => { if (session === s && !s.seenAt) end('exit'); });
        child.unref();
      } else if (g.steam) {
        steam.start(loc.exe, store.settings().steamArgs, ['-applaunch', String(g.appid), ...steam.splitArgs(g.opts)]);
      } else {
        const child = spawn(g.exe, steam.splitArgs(g.opts), { cwd: path.dirname(g.exe), detached: true, stdio: 'ignore', windowsHide: false });
        child.on('error', e => { if (session === s) end('error', 'Couldn\'t start the game: ' + e.message); });
        child.on('exit', () => { if (session === s && s.running) end('exit'); });
        child.unref();
      }
      s.step++;
      s.running = true; s.runningAt = Date.now();
      emit(s);

      if (g.steam) {
        // Steam reports the running game in the registry (RunningAppID). Wait for it to appear, then to go away.
        let seen = false, gone = 0;
        const startedAt = Date.now();
        s.timer = setInterval(async () => {
          if (session !== s) return clearInterval(s.timer);
          const r = await steam.readSteamReg().catch(() => null);
          if (!r) return;
          if (String(r.runningAppId) === String(g.appid)) { if (!seen) s.seenAt = Date.now(); seen = true; gone = 0; }
          else if (seen && ++gone >= 2) end('exit');
          else if (!seen && !viaLauncher && Date.now() - startedAt > 180000) {
            // Never showed up (launcher-only game, or it failed to start). Stop watching; the user can press Stop.
            clearInterval(s.timer);
          }
        }, 2000);
      }
      return { ok: true };
    } catch (e) {
      await end('error', e.message);
      return { ok: false, error: e.message };
    }
  }

  const stop = () => end('stopped');

  async function restoreNow() {
    // Go back to the layout saved before the change; without one, fall back to the normal setup.
    const saved = store.displaySaved();
    try {
      if (saved) await display.restore(saved); else await applyNormal();
      store.setDisplaySaved(null);
      if (session) session.saved = null;
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  // Settings "Test a profile": make the monitor primary for 10 s, then switch back.
  async function test(monId) {
    if (session) return { ok: false, error: 'Finish your game first.' };
    try {
      const before = await display.apply(monId, 'primary');
      store.setDisplaySaved(before);
      await new Promise(r => setTimeout(r, 10000));
      await display.restore(before);
      store.setDisplaySaved(null);
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  // Settings "Test" on a resolution profile: apply it to the primary monitor for 10 s, then switch back.
  async function testRes(p) {
    if (session) return { ok: false, error: 'Finish your game first.' };
    try {
      const before = await display.apply(null, 'primary', p);
      store.setDisplaySaved(before);
      await new Promise(r => setTimeout(r, 10000));
      await display.restore(before);
      store.setDisplaySaved(null);
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  const current = () => session && { gid: session.gid, steps: session.steps, step: session.step, running: session.running, mon: session.monId, res: session.resTxt, changed: session.changed, mode: session.mode, restore: session.restore, acct: session.acct };

  return { play, stop, restoreNow, test, testRes, current };
}

module.exports = { createPlayer };
