// Scripts a game runs before it starts (F-007): a .ps1, .bat, .cmd or .exe the user picked, run hidden in its own
// folder. SwapDeck waits for it to exit; exit code 0 means it worked. Nothing ever kills a script: one that is still
// running when the user gives up keeps going on its own.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { splitArgs } = require('./steam');

const SCRIPT_EXT = /\.(ps1|bat|cmd|exe)$/i;
const MAX_SCRIPTS = 12;
const DEFAULT_TIMEOUT_S = 30;
const TAIL_BYTES = 4000;

// cmd.exe reads its own command line, so arguments with spaces or cmd symbols are quoted; quotes inside are dropped.
const cmdQuote = a => /[\s&|<>^()]/.test(a) || a === '' ? '"' + a.replace(/"/g, '') + '"' : a.replace(/"/g, '');

function commandFor(file, args) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.ps1') return { cmd: 'powershell.exe', args: ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file, ...args], verbatim: false };
  if (ext === '.bat' || ext === '.cmd') return { cmd: 'cmd.exe', args: ['/d', '/s', '/c', '"' + ['"' + file + '"', ...args.map(cmdQuote)].join(' ') + '"'], verbatim: true };
  return { cmd: file, args, verbatim: false };
}

// PowerShell prints an error as "script.ps1 : message" (wrapped over several lines), then "At ..." and "+ ..." detail.
function psError(t) {
  const lines = t.split(/\r?\n/);
  const end = lines.findIndex(l => /^\s*(\+ |At line:|At [A-Za-z]:\\)/.test(l));
  if (end <= 0) return '';
  let start = end;
  while (start > 0 && lines[start - 1].trim()) start--;
  return lines.slice(start, end).map(l => l.trim()).join(' ').replace(/^.*?\.ps1 : /i, '');
}
// What the script said last (errors first), shown when it fails.
function lastLine(out, err) {
  const pick = t => t.split(/\r?\n/).map(l => l.trim()).filter(Boolean).pop() || '';
  return (psError(err) || pick(err) || pick(out)).slice(0, 300);
}

// Starts a script. `done` resolves once it exits: { ok: true, ms } or { ok: false, ms, code, line, error }.
function run(script) {
  const startedAt = Date.now();
  if (!script || !SCRIPT_EXT.test(script.path || '')) return { done: Promise.resolve({ ok: false, ms: 0, error: 'That file type can\'t run as a script.' }) };
  if (!fs.existsSync(script.path)) return { done: Promise.resolve({ ok: false, ms: 0, error: 'The script file is missing: ' + script.path }) };
  const c = commandFor(script.path, splitArgs(script.args));
  const done = new Promise(resolve => {
    let out = '', err = '';
    const keep = (buf, s) => (buf + s).slice(-TAIL_BYTES);
    let child;
    try {
      child = spawn(c.cmd, c.args, { cwd: path.dirname(script.path), windowsHide: true, windowsVerbatimArguments: c.verbatim, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { resolve({ ok: false, ms: 0, error: 'Couldn\'t start the script: ' + e.message }); return; }
    child.stdout.on('data', d => { out = keep(out, String(d)); });
    child.stderr.on('data', d => { err = keep(err, String(d)); });
    child.on('error', e => resolve({ ok: false, ms: Date.now() - startedAt, error: 'Couldn\'t start the script: ' + e.message }));
    child.on('close', code => resolve(code === 0
      ? { ok: true, ms: Date.now() - startedAt }
      : { ok: false, ms: Date.now() - startedAt, code, line: lastLine(out, err) }));
  });
  return { done };
}

// Waits for the script, or for its time limit: { timedOut: true } then, while `done` keeps waiting for the real end.
function runWithLimit(script) {
  const r = run(script);
  const limitMs = (script.timeoutS || DEFAULT_TIMEOUT_S) * 1000;
  let timer;
  const limit = new Promise(resolve => { timer = setTimeout(() => resolve({ ok: false, timedOut: true, ms: limitMs }), limitMs); });
  const first = Promise.race([r.done, limit]).finally(() => clearTimeout(timer));
  return { first, done: r.done };
}

// Settings from the renderer: only picked script files, sensible lengths and limits.
function cleanScripts(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list
    .filter(s => s && typeof s.path === 'string' && SCRIPT_EXT.test(s.path))
    .slice(0, MAX_SCRIPTS)
    .map(s => {
      let id = typeof s.id === 'string' && /^[a-z0-9]{1,16}$/.test(s.id) ? s.id : '';
      while (!id || seen.has(id)) id = Math.random().toString(36).slice(2, 10);
      seen.add(id);
      const t = Math.round(Number(s.timeoutS));
      return {
        id, path: s.path,
        name: String(s.name || '').trim().slice(0, 40) || path.basename(s.path, path.extname(s.path)),
        args: String(s.args || '').slice(0, 300),
        timeoutS: Number.isFinite(t) ? Math.max(5, Math.min(300, t)) : DEFAULT_TIMEOUT_S,
        custom: !!s.custom,
      };
    });
}

// Which script a Play runs: the one asked for, 'none', or (no choice given, e.g. a desktop shortcut) the last one used.
function pickScript(game, choice) {
  const list = game.scripts || [];
  if (!list.length || choice === 'none') return null;
  const want = typeof choice === 'string' && choice ? choice : game.lastScript;
  return list.find(s => s.id === want) || null;
}

module.exports = { run, runWithLimit, cleanScripts, pickScript, commandFor, SCRIPT_EXT, DEFAULT_TIMEOUT_S };
