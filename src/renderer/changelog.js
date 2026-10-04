// What's new, shown once after an update and in Settings > About. Newest first.
// `highlights` is the short list for the popup; `sections` is the full list.

export const CHANGELOG = [
  {
    v: '1.1.0', date: '5 Oct 2026',
    title: 'SwapDeck now launches your games',
    intro: 'Every game can bring its own account, monitor, resolution, sound and helper apps, and everything is put back when you quit.',
    highlights: [
      ['Library', 'Steam and non-Steam games with their art. Play switches account, display, resolution and sound, starts helper apps, then puts it all back.'],
      ['Resolution profiles', 'Make your own, like 1280 × 960 stretched for CS2, and pick one per game.'],
      ['Displays', 'Your normal monitor setup drawn to scale. Games can switch on a monitor that is off in Windows, and restoring is exact.'],
      ['New look', 'A "Who\'s playing?" picker (or the classic gallery), Dark / OLED / Light themes and accent colours.'],
      ['Tray & startup', 'A mini panel in the tray to switch accounts or start a recent game, and Start with Windows.'],
    ],
    sections: [
      ['Library', [
        'All your installed Steam games with their Steam artwork, plus any non-Steam game (anything with an .exe)',
        'Per game: Steam account, display (make primary, or use only this monitor), resolution profile, sound device, companion apps, launcher and launch options',
        'Everything is put back when the game exits. Stop never closes your game',
        'Launcher support: start Content Manager (or any launcher) instead of the game, and keep the Steam art and tracking',
        'Import launch options from Steam',
        'Desktop shortcuts that launch a game with all of its settings',
        'Session history and playtime per account for games launched through SwapDeck',
      ]],
      ['Accounts', [
        'New "Who\'s playing?" picker, or the classic gallery (Settings > General)',
        'Steam avatars everywhere, and an outline on the signed-in account',
        'CS2 settings per account: a per-account autoexec, and copy settings between accounts (with a backup)',
        'Account stats are now called "Connect for stats"',
      ]],
      ['Displays', [
        'Normal setup: every connected monitor, on or off, drawn to scale',
        'Restoring uses Windows\' own display configuration, so rotation, positions and refresh rates come back exactly, even when Windows renumbers monitors',
        'Restore display now, for when a game crashes',
      ]],
      ['App', [
        'Dark, OLED Black and Light themes with accent colours, including your Windows accent',
        'Tray mode with a mini panel, and Start with Windows',
        'Open on Accounts or Library',
        'Backup and restore of settings (never sign-ins)',
        'Keyboard and controller navigation',
        'This What\'s new window',
      ]],
      ['Fixes', [
        'Game icons in an account\'s game list were broken for stats saved by 1.0.0',
        'Art for newer Steam games (like Assetto Corsa Rally) now loads',
        'Steam\'s "ask which account to use" setting is turned off in every form, so it can\'t block switching',
      ]],
    ],
  },
  {
    v: '1.0.0', date: '29 Sep 2026',
    title: 'First release',
    intro: 'Switch between your Steam accounts in one click.',
    highlights: [],
    sections: [
      ['Features', [
        'One-click switching between every account saved in Steam',
        'Launch a game after switching, chosen per account',
        'Tags, notes and pins, plus search and sorting',
        'Status at a glance: online / in-game, VAC and trade bans, limited account',
        'Optional linked stats: games and hours, Steam level, wallet, CS2 Premier rating, ranks and medals',
        'Automatic updates from GitHub',
      ]],
    ],
  },
];

// "1.10.0" > "1.9.2"
export function newer(a, b) {
  const pa = String(a || '0').split('.').map(Number), pb = String(b || '0').split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
}
