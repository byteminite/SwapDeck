# SwapDeck

A Steam account switcher for Windows, built with Electron from the SwapDeck v2 design.

## Run it

```bash
npm install
npm start
```

## Build

```bash
npm run dist
```

This produces, in `dist\`:

- `SwapDeck-Setup-<version>.exe`: the installer. It installs per user (no admin), adds Start Menu and desktop
  shortcuts, and **updates itself from GitHub Releases**.
- `SwapDeck-<version>-portable.exe`: a single file that runs without installing. It doesn't auto-update.
- `latest.yml` and `SwapDeck-Setup-<version>.exe.blockmap`: update metadata, needed in every release.

The builds aren't code-signed, so Windows SmartScreen may warn on first launch ("More info" → "Run anyway").

## Publishing an update

Installed copies check `github.com/byteminite/SwapDeck` releases at startup and every 6 hours (set in
`package.json` → `build.publish`). They download new versions in the background and install them on restart.

1. Bump `"version"` in `package.json` (e.g. `1.0.1`), then run `npm run dist`.
2. On GitHub: Releases → Draft a new release → tag `v1.0.1`.
3. Upload `SwapDeck-Setup-1.0.1.exe`, `SwapDeck-Setup-1.0.1.exe.blockmap` and `latest.yml` (plus the portable exe if you like).
4. Publish it. Drafts and pre-releases are ignored by the updater.

Alternatively, `npm run release` builds and uploads everything into a draft release automatically. It needs a GitHub
token in the `GH_TOKEN` environment variable; you still publish the draft yourself.

The repository (or at least its releases) must be public; the updater can't read private releases without a token.

## What it does

- **Reads your saved Steam logins** from `<Steam>\config\loginusers.vdf`. Avatars come from Steam's local avatar cache.
- **One-click switching**: closes Steam (gracefully, then forcefully after 10 s), sets `AutoLoginUser` in
  `HKCU\Software\Valve\Steam`, marks the account as most recent in `loginusers.vdf`, restarts Steam and waits
  until it has signed in. Optionally launches a game afterwards via `steam://rungameid/<appid>`.
- **Per-account "launch after switching"**, picked from the games installed in your Steam libraries.
  "Default" follows the setting in Settings.
- **Tags** (`fps`, `racing`, `horror` built in, plus any custom tag), **notes**, **pins**, search, sorting and tag filters.
- **Public profile** (online / in-game status, VAC & trade bans, limited account, member since) from
  `steamcommunity.com/profiles/<id>?xml=1`, with no sign-in needed. Refreshed in the background every few minutes.
- **Add account**: opens Steam's login window and picks the new account up automatically.
- **Forget account**: removes it from Steam's saved logins (`loginusers.vdf`; a `.swapdeck.bak` backup is kept).
- **Link account** (optional): a one-time Steam sign-in by QR code (Steam Mobile app) or password + Steam Guard.
  Unlocks Steam level, wallet, friends, owned games with hours (total and last 2 weeks), VAC bans per game,
  CS2 Prime, Premier rating, Competitive/Wingman ranks, CS2 level/XP, commendations, cooldowns and medals/coins.

Keyboard: `← →` browse, `Enter` switch, `/` search, `Esc` closes dialogs. The mouse wheel scrolls the gallery sideways.

UI scale: "Auto" (default) scales the whole UI to the window size. Pick a fixed scale in Settings, or use
`Ctrl +` / `Ctrl −` / `Ctrl + mouse wheel`, and `Ctrl 0` to go back to auto.

## Where data lives

All in `%APPDATA%\SwapDeck\`:

- `swapdeck.json`: settings, tags, notes, pins and cached stats.
- `tokens.json`: Steam refresh tokens for linked accounts, encrypted with Windows DPAPI (Electron `safeStorage`).
  Passwords are never stored. Unlinking an account deletes its token.

Linking adds a "SwapDeck (<PC name>)" entry to that account's authorized devices on Steam. You can revoke it there anytime.

## Notes and limits

- Steam's "Ask which account to use each time Steam starts" ("Who's playing?" picker) overrides auto-login, so
  SwapDeck turns it off when switching (`AlwaysShowUserChooser` in `config\config.vdf`; a `.swapdeck.bak` is kept).
- Switching relies on Steam's "Remember me" token. If a saved login has expired, Steam asks for the password once.
- CS2 stats are skipped while the account is in a game on another session, because asking the CS2 game coordinator
  then would kick that session. The last known CS2 stats stay visible.
- CS2 medals and coins come from the account's CS2 inventory (collectibles), read with the linked session.
- Windows only (registry, `tasklist` and `taskkill`).

## Project layout

```
main.js               Electron main process + IPC
preload.js            window.api bridge (contextIsolation, sandboxed)
src/main/steam.js     registry, process control, loginusers.vdf, avatars, installed games
src/main/vdf.js       Valve KeyValues parser/serializer
src/main/profile.js   public profile (XML)
src/main/link.js      QR / password sign-in via steam-session
src/main/stats.js     linked stats via steam-user + CS2 game coordinator (globaloffensive)
src/main/store.js     JSON store + encrypted tokens
src/renderer/         UI (Preact + htm, no build step)
```

## License

MIT, see [LICENSE](LICENSE).
