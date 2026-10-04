// Playback devices for per-game audio profiles: list them, read the default, set the default.
// The work happens in audio-helper.cs, compiled once by PowerShell into a DLL in app data.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { app } = require('electron');

const VERSION = 1;
const PS1 = `param([string]$Op, [string]$Target, [string]$DllPath, [string]$SrcPath)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $DllPath)) { Add-Type -Path $SrcPath -OutputAssembly $DllPath -OutputType Library }
Add-Type -Path $DllPath
$t = if ($Target -eq '_none_') { '' } else { $Target }
[SDAudio]::Run($Op, $t)
`;

let paths = null;
function ensureFiles() {
  if (paths) return paths;
  const dir = app.getPath('userData');
  const src = path.join(dir, `sd-audio-v${VERSION}.cs`);
  const ps1 = path.join(dir, `sd-audio-v${VERSION}.ps1`);
  const dll = path.join(dir, `sd-audio-v${VERSION}.dll`);
  if (!fs.existsSync(src)) fs.writeFileSync(src, fs.readFileSync(path.join(__dirname, 'audio-helper.cs'), 'utf8'));
  fs.writeFileSync(ps1, PS1);
  paths = { src, ps1, dll };
  return paths;
}

function run(cmd, arg) {
  const p = ensureFiles();
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', p.ps1,
      '-Op', cmd, '-Target', arg || '_none_', '-DllPath', p.dll, '-SrcPath', p.src],
    { windowsHide: true, timeout: 60000 }, (err, stdout, stderr) => {
      const out = String(stdout || '').trim();
      if (err && !out) return reject(new Error(String(stderr || err.message).trim().split('\n')[0]));
      resolve(out);
    });
  });
}

// [{ id, name, def }]
async function list() {
  const out = await run('list');
  return JSON.parse(out.slice(out.indexOf('[')));
}

async function current() {
  const d = (await list()).find(x => x.def);
  return d ? d.id : null;
}

async function setDefault(id) {
  const out = await run('set', id);
  if (out !== 'ok') throw new Error("Windows didn't change the sound device (" + out.replace(/^error:/, '') + ').');
}

module.exports = { list, current, setDefault };
