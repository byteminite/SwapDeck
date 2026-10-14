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
const { closeGame, targetOf } = require('./closegame');
const library = require('./library');
const modpacks = require('./modpacks');
const beforelaunch = require('./beforelaunch');

const ex = (cmd, args) => new Promise(r => execFile(cmd, args, { windowsHide: true }, (e, out) => r(e ? '' : String(out))));
const isRunning = async name => (await ex('tasklist', ['/FI', 'IMAGENAME eq ' + name, '/NH', '/FO', 'CSV'])).toLowerCase().includes('"' + name.toLowerCase() + '"');
// Ask nicely first (like clicking X); force it only if it's still open a few seconds later.
async function closeApp(name) {
  await ex('taskkill', ['/IM', name, '/T']);
  await new Promise(r => setTimeout(r, 5000));
  if (await isRunning(name)) await ex('taskkill', ['/IM', name, '/T', '/F']);
}

function createPlayer({ getLoc, accounts, switchTo, send, applyNormal, beforeLaunch }) {
  let session = null; // { gid, appid, steam, saved, restore, mode, monId, runningAt, timer, child }
  let starting = false, testing = false; // a Play still preparing, a display test in progress

  const emit = s => send('launch', {
    gid: s.gid, steps: s.steps, step: s.step, running: s.running,
    mon: s.monId, res: s.resTxt, changed: s.changed, mode: s.mode, restore: s.restore, acct: s.acct, script: s.script, scriptId: s.scriptId, ask: s.ask,
  });

  async function end(reason, error) {
    const s = session;
    if (!s) return;
    session = null;
    clearInterval(s.timer);
    if (s.decide) s.decide('cancel');
    let restored = false, restoreErr = null;
    if (s.saved && s.restore) {
      try { const r = await display.restore(s.saved); if (r && r.fallback) await applyNormal().catch(() => {}); store.setDisplaySaved(null); restored = true; }
      catch (e) { restoreErr = e.message; }
    }
    if (s.prevAudio) {
      try { await audio.restore(s.prevAudio); }
      catch (e) { send('notice', { type: 'warning', title: "Couldn't switch the sound back", msg: e.message }); }
    }
    for (const name of s.closeOnEnd) closeApp(name);
    const cfg = store.gameCfg(s.gid);
    const ms = s.runningAt ? Date.now() - s.runningAt : 0;
    // Steam games and modpacks count from when the game itself was seen running, not from the launch.
    const played = s.steam || s.pack ? (s.seenAt ? Date.now() - s.seenAt : 0) : ms;
    store.setGameCfg(s.gid, { lastPlayed: Date.now(), playMs: (cfg.playMs || 0) + (s.steam ? 0 : played) });
    if (s.logAcct && played > 0) store.addPlay(s.logAcct, s.gid, played, s.setup);
    send('launch-end', { gid: s.gid, reason, error: error || null, restored, restoreErr, hadMon: !!s.saved, restoreOn: s.restore, monId: s.monId, res: s.resTxt });
  }

  async function play(id, asSid, scriptChoice) {
    if (session || starting) return { ok: false, code: 'RUNNING', error: 'A game is already running through SwapDeck.' };
    if (testing) return { ok: false, error: 'A display test is running. Try again in a few seconds.' };
    starting = true;
    try { return await start(id, asSid, scriptChoice); } finally { starting = false; }
  }

  async function start(id, asSid, scriptChoice) {
    const loc = getLoc();
    const lib = library.build(loc.dir);
    let g = lib.find(x => x.id === id);
    if (!g) return { ok: false, error: 'That game is no longer in your library.' };
    if (g.steam && !g.installed) { await shell.openExternal('steam://install/' + g.appid); return { ok: true, install: true }; }
    if (g.steam && !loc.exe) return { ok: false, code: 'NOT_FOUND', error: 'Steam not found' };
    if (g.pack && !g.installed) return { ok: false, error: "This modpack's folder is gone. It may have been deleted in " + g.pack.label + '.' };
    if (!g.steam && !g.installed) return { ok: false, error: 'The game\'s .exe is missing: ' + g.exe };
    const pack = g.pack ? modpacks.scan().find(p => p.id === g.id) : null;
    if (g.pack && !pack) return { ok: false, error: g.pack.label + " doesn't list this modpack any more." };
    // A script picked at Play (or the last one used). With Custom options ticked, its own setup replaces the game's.
    const script = beforelaunch.pickScript(g, scriptChoice);
    if (scriptChoice && (g.scripts || []).length) store.setGameCfg(id, { lastScript: script ? script.id : 'none' });
    g = beforelaunch.withSetup(g, script);

    const st = await steam.status();
    // Right-click > Play as: one launch on another account, without changing the game's own setting.
    const pick = g.steam ? (asSid && accounts().some(a => a.sid === asSid) ? asSid : g.acct) : null;
    const acc = pick ? accounts().find(a => a.sid === pick) : null;
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
      prevAudio = await audio.current().catch(() => null);
      steps.push(dev && !(prevAudio && dev.id === prevAudio.console && dev.id === prevAudio.multimedia)
        ? { k: 'audio', label: 'Setting sound', sub: dev.name }
        : { k: 'audio', label: 'Setting sound', sub: (dev ? dev.name + ' is already in use' : "That sound device isn't connected") + ' · skipped', skip: true });
    }
    const apps = (g.apps || []).filter(a => a.path);
    const toStart = [];
    for (const a of apps) if (!(await isRunning(path.basename(a.path)))) toStart.push(a);
    if (apps.length) steps.push(toStart.length
      ? { k: 'apps', label: 'Starting companion apps', sub: toStart.map(a => path.basename(a.path, '.exe')).join(', ') }
      : { k: 'apps', label: 'Companion apps', sub: 'Already running · skipped', skip: true });
    // The script runs after the apps, and the game waits for it.
    if (script) steps.push({ k: 'script', label: 'Running ' + script.name, sub: path.basename(script.path) + (script.args ? ' ' + script.args : '') });
    const viaLauncher = g.steam && !!g.launcher;
    steps.push({ k: 'launch', label: 'Launching ' + g.name, sub: pack ? 'via ' + pack.label : viaLauncher ? 'via ' + path.basename(g.launcher) + (g.opts ? ' ' + g.opts : '') : g.steam ? 'steam://rungameid/' + g.appid + (g.opts ? ' ' + g.opts : '') : path.basename(g.exe) + (g.opts ? ' ' + g.opts : '') });
    steps.push({ k: 'run', label: 'Game running' });

    const s = session = {
      gid: id, appid: g.appid, steam: g.steam, pack: !!pack, steps, step: 0, running: false,
      monId: needD ? mon.id : null, resTxt: needR ? resTxt : null, changed: needD || needR, mode: g.display.mode, restore: g.display.restore, acct: acc ? acc.sid : null,
      saved: null, runningAt: 0, timer: null, seenAt: 0, prevAudio: null, closeOnEnd: [], script: script ? script.name : null, scriptId: script ? script.id : (g.scripts || []).length ? 'none' : null, ask: null, decide: null,
      logAcct: acc ? acc.sid : g.steam ? st.activeSid || null : 'local',
      // What the game was set up with, kept on the session so Recently played can show it.
      closeTarget: pack ? null : targetOf(g),
      setup: { disp: mon ? mon.label : null, res: res ? res.name : null, snd: dev ? dev.name : null, apps: apps.map(a => path.basename(a.path, '.exe')), script: script ? script.name : null },
    };
    emit(s);
    try {
      if (needSw) {
        const r = await switchTo(acc.sid, { forPlay: true });
        if (!r.ok) throw new Error(r.error || 'Switching account failed.');
        if (!r.signedIn) throw new Error(r.warn || 'Steam didn\'t sign in.');
      }
      if (session !== s) return { ok: false, cancelled: true };
      // Only Steam games have an account step; counting it for the others put the start screen one step ahead.
      if (g.steam) { s.step++; emit(s); }

      if (needD || needR) {
        const saved = await display.apply(needD ? mon.id : null, g.display.mode, needR ? res : null);
        // Stop was pressed while the display was changing: put it straight back.
        if (session !== s) { const r = await display.restore(saved).catch(() => null); if (r && r.fallback) await applyNormal().catch(() => {}); return { ok: false, cancelled: true }; }
        s.saved = saved;
        store.setDisplaySaved(s.saved);
        send('display-changed', { label: (needD ? mon : resMon).label, mode: needD ? g.display.mode : null, res: needR ? resTxt : null });
      }
      if (session !== s) return { ok: false, cancelled: true };
      s.step++; emit(s);

      if (g.audio) {
        if (dev && !(prevAudio && dev.id === prevAudio.console && dev.id === prevAudio.multimedia)) {
          try {
            await audio.setDefault(dev.id);
            if (session !== s) { await audio.restore(prevAudio).catch(() => {}); return { ok: false, cancelled: true }; }
            s.prevAudio = prevAudio;
          } catch (e) { send('notice', { type: 'warning', title: "Couldn't switch the sound", msg: e.message }); }
        }
        if (session !== s) return { ok: false, cancelled: true };
        s.step++; emit(s);
      }
      if (session !== s) return { ok: false, cancelled: true };
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
      if (script) {
        const go = await runScript(s, script);
        if (session !== s) return { ok: false, cancelled: true };
        if (!go) { await end('stopped'); return { ok: false, cancelled: true }; }
        s.step++; emit(s);
      }
      if (beforeLaunch && g.steam) beforeLaunch(g, s.logAcct);

      if (pack) {
        await modpacks.launch(pack);
      } else if (viaLauncher) {
        // A launcher such as Content Manager: start it instead of the game. Steam stays signed in,
        // and the game is tracked through Steam's RunningAppID as usual once the launcher starts it.
        const child = spawn(g.launcher, steam.splitArgs(g.opts), { cwd: path.dirname(g.launcher), detached: true, stdio: 'ignore', windowsHide: false });
        child.on('error', e => { if (session === s) end('error', 'Couldn\'t start ' + path.basename(g.launcher) + ': ' + e.message); });
        // A launcher that exits within seconds handed off to a copy that was already open (Content Manager
        // does this), so keep waiting. Closing it later without ever starting the game ends the session.
        const launchedAt = Date.now();
        child.on('exit', () => { if (session === s && !s.seenAt && Date.now() - launchedAt > 10000) end('exit'); });
        child.unref();
      } else if (g.steam) {
        steam.start(loc.exe, store.settings().steamArgs, ['-applaunch', String(g.appid), ...steam.splitArgs(g.opts)]);
      } else {
        const child = spawn(g.exe, steam.splitArgs(g.opts), { cwd: path.dirname(g.exe), detached: true, stdio: 'ignore', windowsHide: false });
        child.on('error', e => { if (session === s) end('error', 'Couldn\'t start the game: ' + e.message); });
        const launchedAt = Date.now();
        child.on('exit', () => {
          if (session !== s || !s.running) return;
          // Exited within seconds: a launcher stub that started the real game and quit. SwapDeck can't follow
          // that process, so keep the session and let the user press Stop.
          if (Date.now() - launchedAt < 10000) { send('notice', { type: 'info', title: g.name + ' handed off to another program', msg: "SwapDeck can't tell when it closes, so press Stop when you're done to put everything back." }); return; }
          end('exit');
        });
        child.unref();
      }
      s.step++;
      s.running = true; s.runningAt = Date.now();
      emit(s);

      if (pack) watchPack(s, pack);
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
            // Never showed up (it failed to start, or quit within seconds). Stop watching and tell the user.
            clearInterval(s.timer);
            send('notice', { type: 'warning', title: "SwapDeck can't see " + g.name + ' running', msg: 'If it already closed or never started, press Stop to put your display and sound back.' });
          }
        }, 2000);
      }
      return { ok: true };
    } catch (e) {
      await end('error', e.message);
      return { ok: false, error: e.message };
    }
  }

  // Runs the script and waits. If it fails or passes its time limit, the start screen asks: Launch anyway or Cancel.
  // A script that was only slow and then finishes fine carries on by itself. The script is never killed.
  async function runScript(s, script) {
    const r = beforelaunch.runWithLimit(script);
    const first = await r.first;
    if (first.ok) return true;
    if (session !== s) return false;
    const failAsk = res => ({ kind: 'fail', name: script.name, code: res.code ?? null, line: res.line || res.error || '' });
    s.ask = first.timedOut ? { kind: 'time', name: script.name, secs: script.timeoutS || beforelaunch.DEFAULT_TIMEOUT_S } : failAsk(first);
    emit(s);
    const choice = await new Promise(resolve => {
      s.decide = resolve;
      if (first.timedOut) r.done.then(res => {
        if (s.decide !== resolve) return;
        if (res.ok) resolve('anyway');
        else { s.ask = failAsk(res); emit(s); }
      });
    });
    s.decide = null; s.ask = null;
    return choice === 'anyway';
  }
  // The start screen's answer to a script that failed or took too long.
  function decide(choice) {
    if (session && session.decide) session.decide(choice === 'anyway' ? 'anyway' : 'cancel');
    return { ok: true };
  }

  // A modpack: the launcher starts Minecraft as java(w).exe, often after a few minutes of loading or updating.
  // Find that process once (its command line names the pack's folder), then just check it's still there.
  function watchPack(s, pack) {
    const startedAt = Date.now();
    let pid = null, looking = false, hinted = false;
    s.timer = setInterval(async () => {
      if (session !== s) return clearInterval(s.timer);
      if (pid) { if (!modpacks.alive(pid)) end('exit'); return; }
      if (looking) return;
      looking = true;
      const found = await modpacks.findGame(pack.folder).catch(() => null);
      looking = false;
      if (session !== s) return;
      if (found) { pid = found; s.seenAt = Date.now(); s.closeTarget = 'pid:' + found; return; }
      // CurseForge refuses shortcut launches while it's set to use Mojang's launcher, so say how to fix it.
      if (pack.launcher === 'curseforge' && !hinted && Date.now() - startedAt > 25000) {
        hinted = true;
        send('notice', { type: 'info', title: "Did CurseForge say it can't launch?", msg: "If it can't launch with the Mojang launcher: in CurseForge, open Settings > Minecraft and pick Use CurseForge launcher. Then press Stop and Play again." });
      }
      if (Date.now() - startedAt > 300000) {
        clearInterval(s.timer);
        send('notice', { type: 'warning', title: "SwapDeck can't see Minecraft running", msg: 'If ' + pack.label + " didn't start it, press Stop to put your display and sound back." });
      }
    }, 4000);
  }

  const stop = () => end('stopped');
  // Stop and close the game: ask it to close first, then put display and sound back whatever happened.
  async function stopClose() {
    const s = session;
    if (!s) return { ok: true };
    let r = await closeGame(s.closeTarget).catch(e => ({ ok: false, error: e.message }));
    // Nothing found to close, but the game still counts as running (Steam says so, or a launcher handed off):
    // SwapDeck couldn't reach it, so say that instead of reporting it closed.
    if (r.already) {
      const reg = s.steam ? await steam.readSteamReg().catch(() => null) : null;
      const stillOn = s.steam ? !!reg && String(reg.runningAppId) === String(s.appid) : true;
      if (stillOn) r = { ok: false, error: "SwapDeck can't reach its window (anti-cheat or admin rights can block it). Close it from the game." };
    }
    if (session === s) await end(r.ok ? 'closed' : 'stopped');
    return r;
  }

  async function restoreNow() {
    // Go back to the layout saved before the change; without one, fall back to the normal setup.
    const saved = store.displaySaved();
    try {
      // Layouts saved before 1.1.0 name monitors by DISPLAYn, which Windows may have renumbered since: use the normal setup instead.
      if (saved && !/^\\\\\.\\/.test(saved)) { const r = await display.restore(saved); if (r && r.fallback) await applyNormal(); } else await applyNormal();
      store.setDisplaySaved(null);
      if (session) session.saved = null;
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  // Settings "Test a profile": make the monitor primary for 10 s, then switch back.
  async function test(monId) {
    if (session || starting) return { ok: false, error: 'Finish your game first.' };
    if (testing) return { ok: false, error: 'Another test is running.' };
    testing = true;
    try {
      const before = await display.apply(monId, 'primary');
      store.setDisplaySaved(before);
      await new Promise(r => setTimeout(r, 10000));
      const back = await display.restore(before);
      if (back && back.fallback) await applyNormal().catch(() => {});
      store.setDisplaySaved(null);
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; } finally { testing = false; }
  }

  // Settings "Test" on a resolution profile: apply it to the primary monitor for 10 s, then switch back.
  async function testRes(p) {
    if (session || starting) return { ok: false, error: 'Finish your game first.' };
    if (testing) return { ok: false, error: 'Another test is running.' };
    testing = true;
    try {
      const before = await display.apply(null, 'primary', p);
      store.setDisplaySaved(before);
      await new Promise(r => setTimeout(r, 10000));
      const back = await display.restore(before);
      if (back && back.fallback) await applyNormal().catch(() => {});
      store.setDisplaySaved(null);
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; } finally { testing = false; }
  }

  const current = () => session && { gid: session.gid, steps: session.steps, step: session.step, running: session.running, mon: session.monId, res: session.resTxt, changed: session.changed, mode: session.mode, restore: session.restore, acct: session.acct, script: session.script, scriptId: session.scriptId, ask: session.ask };

  return { play, stop, stopClose, restoreNow, test, testRes, current, decide };
}

module.exports = { createPlayer };
