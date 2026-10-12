// Writes CHANGELOG.md from src/renderer/changelog.js (the in-app "What's new"), so the two never drift apart.
// Usage: node tools/changelog-md.js
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..');

import(pathToFileURL(path.join(root, 'src', 'renderer', 'changelog.js')).href).then(({ CHANGELOG }) => {
  const out = ['# Changelog', '', 'Every SwapDeck version, newest first. The same notes show in the app under *What\'s new*.', ''];
  for (const r of CHANGELOG) {
    out.push(`## ${r.v} · ${r.date}`, '', `**${r.title}**`, '');
    if (r.intro) out.push(r.intro, '');
    for (const [section, items] of r.sections || []) {
      out.push(`### ${section}`, '');
      for (const item of items) out.push(`- ${item}`);
      out.push('');
    }
    out.push(`[Download ${r.v}](https://github.com/byteminite/SwapDeck/releases/tag/v${r.v})`, '');
  }
  fs.writeFileSync(path.join(root, 'CHANGELOG.md'), out.join('\n'));
  console.log('CHANGELOG.md: ' + CHANGELOG.length + ' versions');
});
