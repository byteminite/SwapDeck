// Library "Play": switch to the game's account if needed, apply its display profile, launch it,
// notice when it's running and when it closes, then restore the display.
// Stop never kills the game; it only restores the display and ends tracking.

const path = require('path');
const { spawn } = require('child_process');
const { shell } = require('electron');
const steam = require('./steam');
const store = require('./store');
const display = require('./display');
const library = require('./library');

function createPlayer({ getLoc, accounts, switchTo, send }) {
  let session = null; // { gid, appid, steam, saved, restore, mode, monId, runningAt, timer, child }

  const emit = s => send('launch', {
    gid: s.gid, steps: s.steps, step: s.step, running: s.running,
    mon: s.monId, mode: s.mode, restore: s.restore, acct: s.acct,
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
    const cfg = store.gameCfg(s.gid);
    const ms = s.runningAt ? Date.now() - s.runningAt : 0;
    store.setGameCfg(s.gid, { lastPlayed: Date.now(), playMs: (cfg.playMs || 0) + (s.steam ? 0 : ms) });
    send('launch-end', { gid: s.gid, reason, error: error || null, restored, restoreErr, hadMon: !!s.saved, restoreOn: s.restore, monId: s.monId });
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
    if (g.display.mon) {
      const mons = await display.list().catch(() => []);
      mon = mons.find(m => m.id === g.display.mon) || null;
      needD = !!mon && !(mon.primary && mon.attached && g.display.mode === 'primary');
    }
    const cur = accounts().find(a => a.sid === st.activeSid);
    const steps = [];
    if (g.steam) steps.push(needSw
      ? { k: 'acct', label: 'Switching to ' + acc.name, sub: 'Restarting Steam as ' + acc.login }
      : { k: 'acct', label: acc ? 'Switching to ' + acc.name : 'Steam account', sub: (acc ? 'Already signed in' : 'Using ' + (cur ? cur.name : 'the current account')) + ' · skipped', skip: true });
    steps.push(needD
      ? { k: 'disp', label: 'Setting display', sub: mon.label + (g.display.mode === 'only' ? ' only · others off' : ' → primary') }
      : { k: 'disp', label: 'Setting display', sub: (mon ? mon.label + ' is already primary' : 'Default display') + ' · skipped', skip: true });
    steps.push({ k: 'launch', label: 'Launching ' + g.name, sub: g.steam ? 'steam://rungameid/' + g.appid + (g.opts ? ' ' + g.opts : '') : path.basename(g.exe) + (g.opts ? ' ' + g.opts : '') });
    steps.push({ k: 'run', label: 'Game running' });

    const s = session = {
      gid: id, appid: g.appid, steam: g.steam, steps, step: 0, running: false,
      monId: needD ? mon.id : null, mode: g.display.mode, restore: g.display.restore, acct: acc ? acc.sid : null,
      saved: null, runningAt: 0, timer: null,
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

      if (needD) {
        s.saved = await display.apply(mon.id, g.display.mode);
        store.setDisplaySaved(s.saved);
        send('display-changed', { label: mon.label, mode: g.display.mode });
      }
      if (session !== s) return { ok: false, cancelled: true };
      s.step++; emit(s);

      if (g.steam) {
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
          if (String(r.runningAppId) === String(g.appid)) { seen = true; gone = 0; }
          else if (seen && ++gone >= 2) end('exit');
          else if (!seen && Date.now() - startedAt > 180000) {
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
    const saved = store.displaySaved();
    if (!saved) return { ok: false, error: 'There\'s no saved display layout to go back to.' };
    try {
      await display.restore(saved);
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

  const current = () => session && { gid: session.gid, steps: session.steps, step: session.step, running: session.running, mon: session.monId, mode: session.mode, restore: session.restore, acct: session.acct };

  return { play, stop, restoreNow, test, current };
}

module.exports = { createPlayer };
