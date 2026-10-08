// The short update label shown on Library tiles and in the tray panel, from a game's Steam update state
// (see src/main/gameinfo.js stateOf). Up-to-date and not-installed games get no badge.

const TONES = { run: 'var(--accent-strong)', warn: 'var(--warn-fg)', bad: 'var(--bad-fg)' };

const LABELS = {
  queued: () => ['Update queued', 'warn'],
  downloading: st => [(st.staging ? 'Installing ' : 'Updating ') + st.pct + '%', 'run'],
  paused: st => ['Update paused ' + st.pct + '%', 'warn'],
  verifying: st => ['Verifying ' + st.pct + '%', 'run'],
  failed: st => [st.reason === 'files' ? 'Files missing' : 'Update failed', 'bad'],
};

export function updateBadge(st) {
  const make = st && LABELS[st.state];
  if (!make) return null;
  const [label, tone] = make(st);
  return { label, color: TONES[tone], busy: tone === 'run' };
}
