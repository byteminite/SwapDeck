// Playback devices for per-game audio profiles: list them, read the default, set the default.
// The work happens in audio-helper.cs, compiled once by PowerShell into a DLL in app data.

const { createHelper } = require('./native');

const run = createHelper({ name: 'audio', version: 2, source: 'audio-helper.cs', cls: 'SDAudio' });

// [{ id, name, def }]
async function list() {
  const out = await run('list');
  return JSON.parse(out.slice(out.indexOf('[')));
}

// The default device per role: { console, multimedia, comms }.
async function current() {
  const out = await run('defaults');
  return JSON.parse(out.slice(out.indexOf('{')));
}

// Games play through the console and multimedia roles; the communications device (voice chat) is left alone.
async function setDefault(id, roles = '01') {
  const out = await run('set', roles + '|' + id);
  if (out !== 'ok') throw new Error("Windows didn't change the sound device (" + out.replace(/^error:/, '') + ').');
}

// Put back what current() returned before the game.
async function restore(prev) {
  if (!prev) return;
  if (prev.console && prev.console === prev.multimedia) return setDefault(prev.console, '01');
  if (prev.console) await setDefault(prev.console, '0');
  if (prev.multimedia) await setDefault(prev.multimedia, '1');
}

module.exports = { list, current, setDefault, restore };
