# SwapDeck

Switch between your Steam accounts in one click, and launch every game with the right account, monitor,
resolution and sound already set up. Built for people who keep separate FPS, sim racing and horror accounts.

**[Download the latest release](https://github.com/byteminite/SwapDeck/releases/latest)** · Windows 10/11

## Install

| File | |
|---|---|
| `SwapDeck-Setup-x.y.z.exe` | Installer (recommended). No admin needed, and it **updates itself automatically**. |
| `SwapDeck-x.y.z-portable.exe` | Single file, no install. Doesn't auto-update. |

The app isn't code-signed yet, so Windows may show a SmartScreen warning the first time. Click **More info → Run anyway**.

## Features

**Accounts**
- **One-click switching** between every account saved in Steam: a "Who's playing?" picker, or the classic sideways gallery
- **Tags, notes and pins**, plus search, tag filters and sorting
- **Status at a glance**: online / in-game, VAC and trade bans, limited account
- **Optional stats** ("Connect for stats"): games and hours, Steam level, wallet, CS2 Premier rating, ranks and medals
- **Playtime per account** for games you launch through SwapDeck
- **Add and forget accounts** without digging through Steam

**Library**
- Your installed **Steam games**, with their Steam artwork, plus any **non-Steam game** (anything with an `.exe`)
- Each game can have its own:
  - **Steam account**: Play switches to it first
  - **Display**: make a monitor primary, or use only that monitor (it can even be switched off in Windows)
  - **Resolution profile** you make yourself, e.g. 1280 × 960 stretched for CS2
  - **Sound device**: e.g. your headset for sim racing
  - **Companion apps** started with the game (SimHub, Crew Chief, wheel software…) and optionally closed afterwards
  - **Launcher**: start a tool such as Content Manager instead of the game, and keep the Steam art and tracking
  - **Launch options**
- Everything is **put back when the game exits**. Stop never closes your game.
- **Desktop shortcuts** that launch a game through SwapDeck with all of the above

**App**
- **Themes**: Dark, OLED Black, Light, with accent colours (or your Windows accent)
- **Tray mode** with a quick panel to switch accounts or start a recent game, and **Start with Windows**
- **Displays**: your normal monitor setup, drawn to scale, with "Restore display now" if a game ever crashes
- **Backup and restore** of your settings (never sign-ins)
- **Keyboard and controller** navigation
- **Optional master password** with a lock screen

## Using it

| Action | How |
|---|---|
| Switch account | Click a card (grid) or double-click a panel (gallery), or select it and press `Enter` |
| Account details | `ⓘ` on a card, or right-click |
| Play a game | Library → hover a game → Play, or double-click |
| Move around | Arrow keys, or a controller's d-pad / stick |
| Controller | `A` select · `B` back · `X` details · `LB`/`RB` switch Accounts ↔ Library |
| Search | `/` |
| UI scale | `Ctrl +` / `Ctrl −` / `Ctrl 0` (auto), or Settings |

## Privacy

- Everything stays on your PC, in `%APPDATA%\SwapDeck`.
- **Connecting for stats is optional.** It uses Steam's own sign-in (QR code, password + Steam Guard, or a token you paste).
  SwapDeck keeps Steam's sign-in token, encrypted by Windows. Your password is stored only if you tick "Remember", also encrypted.
- Add a **master password** in Settings → Security for a lock screen on top of Windows' encryption.
- Disconnecting deletes the token. You can also revoke the "SwapDeck" device in your Steam account settings.
- Backups contain your tags, notes, games and profiles, never sign-ins or passwords.

## Good to know

- Steam's **"Ask which account to use each time Steam starts"** blocks automatic sign-in, so SwapDeck turns it off when you switch.
- If Steam asks for a password after a switch, that account's saved login expired. Sign in once with **Remember me** ticked.
- CS2 stats aren't refreshed while that account is in a game, because it would kick the game session.
- **Monitors** only need to be plugged in and powered. SwapDeck can switch one on that's turned off in Windows.
- **Resolution profiles** can only use sizes your graphics driver offers. For stretched 4:3, add the resolution as a custom
  resolution in AMD Software or the NVIDIA Control Panel, and set scaling to Full panel / Full-screen. The **Test** button
  in Settings → Displays tells you if Windows accepts it.

## Development

```bash
npm install
npm start       # run from source
npm run dist    # build installer + portable exe into dist\
```

**Releasing an update:** bump `version` in `package.json`, run `npm run dist`, then publish a GitHub release
(tag `vX.Y.Z`) with `SwapDeck-Setup-X.Y.Z.exe`, its `.blockmap` and `latest.yml`. Installed copies pick it up
automatically. Drafts are ignored.

## License

[MIT](LICENSE)
