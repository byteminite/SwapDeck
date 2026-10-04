// Runs a small C# helper (display-helper.cs, audio-helper.cs) through Windows PowerShell. The C# is
// compiled once into a DLL in app data. Calls to one helper run one at a time, so a first-run compile
// or two display changes never overlap.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { app } = require('electron');

// Compiles to a temporary file and renames it, so an interrupted compile never leaves a half-written DLL.
// If an existing DLL can't be loaded, it's rebuilt. Output is UTF-8 so device names keep their accents.
const PS1 = cls => `param([string]$Op, [string]$Target, [string]$DllPath, [string]$SrcPath)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
function Build { $tmp = $DllPath + '.' + $PID + '.tmp'; Add-Type -Path $SrcPath -OutputAssembly $tmp -OutputType Library; Move-Item -LiteralPath $tmp -Destination $DllPath -Force }
if (-not (Test-Path -LiteralPath $DllPath)) { Build }
try { Add-Type -Path $DllPath } catch { Remove-Item -LiteralPath $DllPath -Force -ErrorAction SilentlyContinue; Build; Add-Type -Path $DllPath }
$t = if ($Target -eq '_none_') { '' } else { $Target }
[${cls}]::Run($Op, $t)
`;

function createHelper({ name, version, source, cls }) {
  let paths = null, queue = Promise.resolve();
  function ensureFiles() {
    if (paths) return paths;
    const dir = app.getPath('userData');
    const src = path.join(dir, `sd-${name}-v${version}.cs`);
    const ps1 = path.join(dir, `sd-${name}-v${version}.ps1`);
    const dll = path.join(dir, `sd-${name}-v${version}.dll`);
    // Copy out of the (possibly packed) app so PowerShell can read it.
    if (!fs.existsSync(src)) fs.writeFileSync(src, fs.readFileSync(path.join(__dirname, source), 'utf8'));
    fs.writeFileSync(ps1, PS1(cls));
    paths = { src, ps1, dll };
    return paths;
  }
  function exec(cmd, arg) {
    const p = ensureFiles();
    return new Promise((resolve, reject) => {
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', p.ps1,
        '-Op', cmd, '-Target', arg || '_none_', '-DllPath', p.dll, '-SrcPath', p.src],
      { windowsHide: true, timeout: 60000, encoding: 'utf8' }, (err, stdout, stderr) => {
        const out = String(stdout || '').replace(/^﻿/, '').trim();
        if (err && !out) return reject(new Error(String(stderr || err.message).trim().split('\n')[0]));
        resolve(out);
      });
    });
  }
  // One call at a time per helper.
  return function run(cmd, arg) {
    const next = queue.then(() => exec(cmd, arg));
    queue = next.catch(() => {});
    return next;
  };
}

module.exports = { createHelper };
