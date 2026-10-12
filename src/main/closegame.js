// Stop > "Close the game too": asks the game's windows to close (close-helper.cs, WM_CLOSE only, never a kill)
// and waits for its processes to end.

const path = require('path');
const { createHelper } = require('./native');

const run = createHelper({ name: 'close', version: 3, source: 'close-helper.cs', cls: 'SDClose' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const parse = out => { try { return JSON.parse(out.slice(out.indexOf('{'))); } catch { return { procs: [], windows: 0 }; } };

// Steam games: their install folder under steamapps\common. Other games: exactly their .exe, never a whole
// folder, since a non-Steam .exe can sit next to unrelated programs (Downloads, Desktop).
function targetOf(g) {
  if (g.steam) return g.folder && /\\steamapps\\common\\[^\\]+$/i.test(path.resolve(g.folder)) ? path.resolve(g.folder) : null;
  return g.exe && /\.exe$/i.test(g.exe) ? path.resolve(g.exe) : null;
}

async function closeGame(target, timeoutMs = 15000) {
  if (!target) return { ok: false, error: "SwapDeck doesn't know where this game runs from." };
  const first = parse(await run('close', target));
  if (!first.procs.length) return { ok: true, already: true };
  if (!first.windows) return { ok: false, error: 'It has no window SwapDeck can close. Close it from the game.' };
  for (let t = 0; t < timeoutMs; t += 1000) {
    await wait(1000);
    if (!parse(await run('find', target)).procs.length) return { ok: true };
  }
  return { ok: false, error: "It didn't close. It may be asking something on screen, like saving." };
}

module.exports = { closeGame, targetOf };
