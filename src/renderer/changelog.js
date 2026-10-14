// What's new, shown once after an update and in Settings > About. Newest first.
// `highlights` is the short list for the popup; `sections` is the full list.

export const CHANGELOG = [
  {
    v: '1.7.0', date: '14 Oct 2026',
    title: 'Scripts before a game starts',
    intro: 'Run a script before a game starts, like one that swaps your wheel profile per car class, and pick which one each time you press Play.',
    highlights: [
      ['Scripts', 'Add a .ps1, .bat, .cmd or .exe to a game\'s Setup. SwapDeck runs it, waits until it finishes, then starts the game.'],
      ['Which script?', 'Press Play on a game with scripts and pick one. The last one you used is already picked, and No script is always there.'],
      ['Own setup', 'Tick Custom options and a script gets its own monitor, sound, apps and launch options, for that script only.'],
      ['When it goes wrong', 'If a script fails or takes too long, SwapDeck shows what it said and asks: Launch anyway or Cancel.'],
      ['Shortcuts', 'Make a desktop shortcut for one script, or one that asks which script every time.'],
    ],
    sections: [
      ['Scripts', [
        'Setup > Scripts: add a script, give it a name (GT3, Hypercar…), arguments and a time limit (30 seconds unless you change it)',
        'The same script can be added more than once with different arguments, like -Class GT3 and -Class HY',
        'Test runs a script right away and shows whether it worked, with the last line it printed if it didn\'t',
        'At Play, the script runs after your account, display, sound and apps are set, and the game waits for it',
        'Nothing needs to change in your script: SwapDeck counts it as done when it closes, and an exit code of 0 means it worked',
      ]],
      ['Custom options', [
        'Tick Custom options on a script to give it its own account, display, sound, apps, launch options or launcher',
        'Each card says SAME AS GAME or CHANGED, and USE GAME\'S puts a card back to the game\'s setting',
        'The script\'s card on Setup sums up what it changes, like Speakers · SimHub',
        'Untick it and the script uses the game\'s setup again. Its own setup is kept for later',
      ]],
      ['Playing', [
        'Which script? opens from every Play button, the tray and the controller (A plays the highlighted script)',
        'In the tray, a game with scripts opens its scripts underneath it. Click one to play',
        'Try again after a failed start uses the same script',
        'Home and the Now playing bar show which script you played with, like Le Mans Ultimate · GT3',
        'Create desktop shortcut on a game with scripts asks: one script, or ask every time',
      ]],
      ['App', [
        'Settings > About credits Munder Difflin and PandaOS, where SwapDeck is made with Claude Code',
        'The starting screen for non-Steam games and modpacks no longer ticks a step off before it\'s done',
      ]],
      ['Good to know', [
        'Scripts run hidden, in their own folder. PowerShell scripts run with -ExecutionPolicy Bypass for that one run only',
        'SwapDeck never closes your script. Cancel and Stop put your display and sound back and leave the script running',
        'If a script only took long and then finishes fine, the game starts by itself',
        'The Classic layout shows your scripts and asks which one at Play. A script\'s own setup is edited in the Library layout',
      ]],
    ],
  },
  {
    v: '1.6.3', date: '12 Oct 2026',
    title: 'Owned games show up right away',
    intro: 'Games your accounts own show up as soon as you connect them, and the Library tells you when they\'re hidden.',
    highlights: [
      ['Right away', 'Connect an account and the games it owns show up in the Library straight away, no restart needed.'],
      ['Hidden games', 'When owned games that aren\'t installed are hidden, the Library says so, with a button to show them.'],
    ],
    sections: [
      ['Fixes', [
        'Games an account owns only showed up after restarting SwapDeck or switching layout. They now show up as soon as the account\'s game list arrives',
        'With Show games that aren\'t installed turned off, the Library now says how many owned games are hidden, with Show them',
      ]],
    ],
  },
  {
    v: '1.6.2', date: '12 Oct 2026',
    title: 'Modpack message fix',
    intro: 'A small fix: the Found Minecraft modpacks message no longer comes back every time you open SwapDeck.',
    highlights: [
      ['Modpack message fixed', 'SwapDeck only offers packs you haven\'t added yet, also right after it starts.'],
    ],
    sections: [
      ['Fixes', [
        'Found Minecraft modpacks showed up on every start, even for packs already in your Library. It now only offers new packs',
      ]],
    ],
  },
  {
    v: '1.6.1', date: '12 Oct 2026',
    title: 'Updates arrive sooner',
    intro: 'SwapDeck now hears about new versions within minutes, and tells you with a Windows notification when one is ready.',
    highlights: [
      ['Faster updates', 'SwapDeck checks for a new version every 30 minutes, and again when you open it.'],
      ['A notification', 'When an update is ready and SwapDeck is in the tray, Windows shows a notification. Click it to open SwapDeck.'],
      ['Light mode fixes', 'The Details button and the account line on covers are easy to read again.'],
    ],
    sections: [
      ['Updates', [
        'SwapDeck checks GitHub for a new version every 30 minutes instead of every 6 hours',
        'Opening the window or the tray panel checks too, if the last check was over 5 minutes ago',
        'When an update has downloaded and SwapDeck isn\'t on screen, a Windows notification says it\'s ready. Click it to open SwapDeck and restart',
      ]],
      ['Fixes', [
        'Light mode: the Details button you see when you hover a cover shows its icon again',
        'Light mode: Switches to … on covers is readable on dark cover art',
      ]],
      ['Good to know', [
        'Each check downloads one small file from GitHub. Nothing about you or your PC is sent',
        'Turn off notifications for SwapDeck in Windows Settings > System > Notifications if you don\'t want them',
      ]],
    ],
  },
  {
    v: '1.6.0', date: '12 Oct 2026',
    title: 'Minecraft modpacks in your Library',
    intro: 'SwapDeck finds your Minecraft modpacks from Modrinth, CurseForge and Prism Launcher. Add the ones you want and Play starts them with their own setup.',
    highlights: [
      ['Modpacks as games', 'SwapDeck finds the packs you installed with Modrinth, CurseForge or Prism Launcher. Pick the ones you want in your Library.'],
      ['Play starts the pack', 'Play opens the launcher straight into that pack, no clicking through it first.'],
      ['Their own setup', 'Give a pack its own monitor, resolution, sound device and companion apps, like any other game.'],
      ['Everything goes back', 'SwapDeck notices when Minecraft closes and puts your display and sound back.'],
    ],
    sections: [
      ['Minecraft modpacks', [
        'SwapDeck finds packs from Modrinth, CurseForge and Prism Launcher on this PC. The bell says when it finds new ones (a message in Classic), and Review lets you pick which ones go in your Library',
        'Settings > General > Choose packs adds or removes packs any time. Right-click a pack > Remove from Library takes it out, and it stays in its launcher',
        'Packs show with their own icon, its colours behind it, and the time you played them',
        'A new Minecraft choice in the Source filter, in both layouts',
        'Play opens the pack in its launcher, the same way the launcher\'s own desktop shortcut does',
        'The game page and Setup work like any other game: monitor, resolution, sound device, companion apps, tags, favourites and notes',
        'SwapDeck finds Minecraft once it starts and puts everything back when you close it. Stop > Close the game too closes Minecraft, not the launcher',
        'Right-click a pack > Change artwork gives it your own icon and banner. The cover takes its colours from your icon',
        'Turn off Settings > General > Look for Minecraft modpacks and SwapDeck doesn\'t look at all',
      ]],
      ['Good to know', [
        'Mods, updates and your Minecraft account stay in the launcher. SwapDeck only starts the pack',
        'SwapDeck reads the launchers\' own pack lists on your PC. Nothing is sent anywhere',
        'If a launcher asks something first, like signing in or updating the pack, answer it there. SwapDeck waits up to 5 minutes for Minecraft',
        'CurseForge packs need CurseForge set to Use CurseForge launcher (Settings > Minecraft). With the Mojang launcher, CurseForge doesn\'t start packs from shortcuts. SwapDeck reminds you when a CurseForge pack starts',
        'ATLauncher and MultiMC packs aren\'t listed yet. Add them with Add game and the launcher\'s own launch options',
      ]],
    ],
  },
  {
    v: '1.5.0', date: '12 Oct 2026',
    title: 'A new Library layout',
    intro: 'Pick the new Library layout in Settings: your games up front as covers, with Home, Favourites, Updates, search and full pages for games, accounts and settings.',
    highlights: [
      ['Library layout', 'A rail on the left, your games as covers and full pages for every game. Classic stays the default, switch in Settings → Appearance.'],
      ['Home', 'Your running or last game, Jump back in, recent sessions with the setup they used, this week and your latest achievements.'],
      ['Search', 'Press Ctrl + K to find a game, a tag or an account, or run an action. Enter opens, Ctrl + Enter plays.'],
      ['Stop asks', 'Stop tracking only, or close the game too, like Alt+F4. Pick once or let SwapDeck remember.'],
      ['Updates tab', 'What Steam is updating, what\'s waiting and what it updated lately. Play when done starts a game as soon as its update finishes.'],
    ],
    sections: [
      ['Library layout', [
        'Pick it in Settings → Appearance, or on first start. Classic stays as it was and stays the default',
        'My games shows covers with tabs (All, Installed, Not installed, Never played), Tag, Account and Source filters and sorting',
        'Hover a cover for Play, details, a heart and who it plays as, like "Switches to Crosshair"',
        'Right-click a game: Play, Play as another account once, tags, its account, Change artwork, Open folder, Desktop shortcut, Store page or Hide from Library',
        'Starting a game shows each step, with steps that were already right marked Ready. Back to library keeps a Now playing bar at the bottom',
        'Cancel stops a game while it starts. If it can\'t start, the screen says what went wrong, with Try again',
        'Pages, game pages and covers ease in, the tab underline slides, and buttons give a small press. Reduce motion in Settings turns it off',
        'A sun and moon button switches between light and dark, in the rail and in Classic\'s top bar. The new colours pour in from the button, a little differently every time',
      ]],
      ['Game pages', [
        'Every game opens as a full page with Overview, Achievements and Setup, with Setup in two columns',
        'An Achievements tab on every game: how rare each one is, which of your accounts have it, filters and sorting',
        'CS2 stats fit in one row. Commendations and medals open with a button',
      ]],
      ['Home, Favourites and Updates', [
        'Home shows the running or last played game, Jump back in, recent sessions by day, this week\'s hours and your accounts with Switch',
        'Sessions show the monitor, resolution, sound device and companion apps they used (games you play from now on)',
        'Latest achievements across all your accounts, read from Steam on this PC, no sign-in needed',
        'Favourites as big cards. Drag them into your own order, or sort by last played or name. You play these a lot suggests more',
        'Updates shows what Steam is updating and what\'s waiting, This week and Recently updated. Open Steam downloads to pause or reorder',
        'Play when done starts a game when its update finishes, while SwapDeck is open (the tray is fine)',
      ]],
      ['Accounts', [
        'Your avatar at the bottom of the rail opens the account menu: switch, Connect, Connect all and Add account',
        'Each account has a full page with stats, games, sessions, its game after switching, a note and Advanced',
        'Remove from SwapDeck hides an account here and keeps it saved in Steam. Show it again from the account menu or Settings',
        'Switching waits while a game runs, so Steam never restarts under it',
      ]],
      ['Search, tags and notifications', [
        'Ctrl + K searches games, tags, accounts and actions, with your last searches kept',
        'The Tags manager renames, recolours and deletes tags across every game and account, and makes new ones',
        'The bell shows what needs you: updates, a running game, accounts to connect, a SwapDeck update, Steam closed or not found, offline',
        'New patch notes for games you\'ve played show in the bell too, and open straight in the news reader',
      ]],
      ['Settings and tray', [
        'Settings is a full page with a menu, Find a setting, and every setting from before',
        'New: When I press Stop, Open SwapDeck on, Hide account names (initials, for streaming), Lock now, Hidden accounts and games, Replay first start',
        'The tray panel lists every installed game, shows a game starting and finds games as you type. The tray icon gets a green dot while you play',
        'Classic Settings get Hide account names (Security) and When I press Stop (General) too',
        'Change artwork gives a Steam game your own cover and banner in SwapDeck. Steam\'s own library keeps its art',
      ]],
      ['Good to know', [
        'Stop still never closes a game unless you pick Close the game too. Closing asks the game\'s windows to close, like Alt+F4, and never forces it',
        'If a game doesn\'t close (for example it asks to save), SwapDeck says so and puts your display and sound back anyway',
        'New installs get a short first start: finding Steam, your accounts, layout and accent. You can skip it',
        'Latest achievements and Recently updated read Steam\'s files on this PC. Nothing is sent anywhere',
        'Achievement rarity and patch notes come from Steam\'s public servers, no sign-in. Patch notes are checked every 6 hours for your 10 most recently played games',
      ]],
    ],
  },
  {
    v: '1.4.0', date: '11 Oct 2026',
    title: 'A new account profile',
    intro: 'Account details open as a full profile, the Library shows every game your accounts own, and everything CS2 now lives on CS2\'s own page.',
    highlights: [
      ['New profile', 'Account details fill the window: the account on the left, its games, sessions and status on the right.'],
      ['All games', 'See every game an account owns and open any of them with ⓘ, installed or not.'],
      ['Owned games', 'Games your accounts own show in the Library as Not installed. Untick Not installed in Tags to hide them.'],
      ['Right account', 'Games show who owns them, and when only one account does, it\'s picked for you.'],
      ['CS2 in one place', 'Premier rating, ranks and medals are on CS2\'s page, with its per-account settings behind the gear.'],
    ],
    sections: [
      ['Account profile', [
        'Account details open full window, with the account on the left: Switch, Steam profile, favourite, Refresh and tags, plus level, games owned, friends and bans',
        'This account at a glance: hours played through SwapDeck, games owned, Steam wallet and member since',
        'A Last played banner when the account has a recent session',
        'Games on this account shows its most played games, with Played through SwapDeck and Recent sessions in the same card',
        'Public profile as tiles: online status, visibility, VAC and trade bans, limited account and member since',
      ]],
      ['All games', [
        'See all games lists every game the account owns, with total hours, the last 2 weeks and a playtime bar',
        'Sort by Hours, Last 2 weeks or Name. Games with a VAC ban are marked',
        'The ⓘ next to a game opens its page with the profile still behind it. Close it and you\'re back where you were',
        'Games that aren\'t installed on this PC open too',
      ]],
      ['Library', [
        'Every game your saved accounts own shows up, marked Not installed when it isn\'t on this PC, including games you uninstalled',
        'Not installed in the Tags menu shows or hides them. It starts ticked',
        'Games with no account picked show who owns them, like "Majkl, B3"',
        'A game\'s Steam account list only shows the accounts that own it. When just one does, it\'s picked for you',
      ]],
      ['Accounts', [
        'Connect all on the Accounts page connects every account that isn\'t connected yet, one after another. Skip leaves one for later',
        'After you add an account, Connect for stats opens straight away so SwapDeck learns which games it owns. Close it to connect later',
      ]],
      ['CS2', [
        'CS2 stats moved from the account to CS2\'s Overview: Premier rating, Competitive and Wingman ranks, level, commendations, medals and any cooldown',
        'Pick whose stats in the card\'s corner, like Achievements and Friends who play',
        'CS2 settings moved to CS2\'s page, behind the gear: the per-account autoexec and Copy settings from another account',
        'Pick the account in the settings card. It starts on the game\'s account, or the one signed in',
      ]],
      ['Good to know', [
        'The account\'s CS2 tab and Steam account card are gone. Level, wallet, games owned and friends are on the profile, CS2 Prime status isn\'t shown anymore',
        'Games owned, All games, wallet and level need Connect for stats, like before',
        'Which games an account owns comes from its game list when it\'s connected for stats. For other accounts, SwapDeck only knows the games they\'ve played on this PC',
      ]],
    ],
  },
  {
    v: '1.3.0', date: '8 Oct 2026',
    title: 'Steam-style game details',
    intro: 'Every game now has a Steam-style page with its updates, news, screenshots, achievements and friends, and SwapDeck fits your screen better.',
    highlights: [
      ['Game details', 'An Overview with update status, playtime, achievements, Steam links, screenshots, workshop, DLC and notes.'],
      ['News & patch notes', 'Read them right in SwapDeck. Posts since you last played are tagged New.'],
      ['Friends who play', 'See which friends play a game, and which DLC an account owns, for accounts connected for stats.'],
      ['Update badges', 'Library covers and the tray panel show when Steam is updating a game.'],
      ['Fits your screen', 'Auto UI scale now suits 1080p, 1440p and 4K, so a bigger window shows more instead of making everything bigger.'],
    ],
    sections: [
      ['Game details', [
        'A game\'s details open on a new Overview. Its account, display, sound and launch options are behind the gear button next to the close button',
        'Update status straight from Steam: up to date, queued, downloading with progress, paused, verifying or failed',
        'Last played, playtime and achievements at a glance, plus one-click links to the store page, DLC, community hub, discussions, guides, workshop, market and support',
        'Screenshots per account, with a full-size view and Open folder',
        'Achievements per account with your latest unlocks, and Show all. Hidden ones stay hidden until you unlock them',
        'Workshop items installed and their size, DLC with art (Installed marked), and a note for each game',
      ]],
      ['News & patch notes', [
        'The developer\'s announcements and patch notes, newest first',
        'Click one to read the whole post in SwapDeck, with headings, lists and pictures. Steam links open in Steam, trailers on YouTube, and Open in Steam is always there',
        'Posts since you last played the game are tagged New',
      ]],
      ['Connected accounts', [
        'Friends who play: friends who played recently, with their hours, and everyone who\'s played it before. Click a friend to open their profile',
        'DLC shows Owned / Not owned for the account, including DLC installed on this PC by another account',
        'Pick which connected account in the card\'s corner',
      ]],
      ['Library & tray', [
        'Update badges on Library covers and in the tray panel\'s recent games: Update queued, Updating 42%, Update paused or Update failed',
        'A game\'s note (crosshair code, server IP…) shows on the launch screen when you press Play, with a Copy button',
      ]],
      ['App', [
        'Auto UI scale follows your screen instead of the window size: 100% on 1080p, a little larger on 1440p and 4K, and portrait monitors count by their short side',
        'The account and game details panels grow with the window, and a new install opens at a size that fits your screen',
        'Ctrl + / Ctrl − and the fixed sizes in Settings work as before',
      ]],
      ['Good to know', [
        'News, DLC and friends come from Steam only when you open a game\'s details, and are cached for a while',
        'Friends and owned DLC use the connected account\'s saved Steam sign-in, the same one Refresh stats uses. Nothing is sent anywhere but Steam',
        'If Auto felt big before, it will look smaller now. Pick a fixed size in Settings if you prefer',
      ]],
    ],
  },
  {
    v: '1.2.0', date: '8 Oct 2026',
    title: 'Tags, favourites and a quick shortcut',
    intro: 'Tag and star your games, filter by several tags at once, and open SwapDeck from anywhere.',
    highlights: [
      ['Game tags', 'Tag each game in its details, with your own tags and colours. Accounts use the same tags.'],
      ['Favourites', 'Star games and accounts, and they come first.'],
      ['New Tags filter', 'Tick as many tags as you like on Accounts and Library. No more scrolling sideways.'],
      ['Shortcut', 'Optionally open the tray panel from any app (Ctrl + Alt + S by default, changeable in Settings).'],
      ['Smoother updates', '"Restart now" shows "Installing update" instead of just closing.'],
    ],
    sections: [
      ['Tags', [
        'Games have their own tags: tag them in their details, with the ready-made fps, racing and horror tags or your own',
        'Accounts use the same tag editor, and tags made on games can be used on accounts and the other way round',
        'Tag colours: click a tag\'s dot to pick one of 8 colours or any custom colour. A tag looks the same everywhere',
        'Tags keep their place: ticking or unticking a tag never moves it around',
      ]],
      ['Favourites', [
        'Star games on their cover or in their details. Starred games come first in the Library, whatever the sort',
        'The account Pin is now called Favourite, and pinned accounts stay starred',
      ]],
      ['Tags filter', [
        'One Tags button on Accounts and Library replaces the sideways-scrolling row',
        'Tick as many tags as you like, plus Favourites, and anything with any of them shows',
        'Ticked tags show as chips you can remove, with Clear',
        'In the Library, All / Steam / Non-Steam is now its own switch',
      ]],
      ['Tray panel shortcut', [
        'Optionally open the tray panel from any app with Ctrl + Alt + S. Off by default: Settings > General, under "Keep running in the tray"',
        'Change the key to two of Ctrl, Alt and Shift plus a key. SwapDeck tells you if another program already uses it, and refuses keys that would block typing (like AltGr characters)',
      ]],
      ['App', [
        '"Restart now" shows "Installing update, SwapDeck reopens in a few seconds" instead of just closing',
        'It waits while a game you launched through SwapDeck is still running, so your display and sound are put back first',
        'The switching screen shows the account\'s avatar',
        'Backups are checked more carefully when restoring',
      ]],
      ['Good to know', [
        'Games no longer show the tags of the account they launch with, so tag them in their details',
        '"Accent follows the running game\'s tag" now uses those game tags',
      ]],
    ],
  },
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
