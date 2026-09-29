# SwapDeck

Switch between your Steam accounts in one click. Keep your FPS, sim racing and horror accounts
side by side, and optionally launch the right game straight after switching.

**[Download the latest release](https://github.com/byteminite/SwapDeck/releases/latest)** · Windows 10/11

## Install

| File | |
|---|---|
| `SwapDeck-Setup-x.y.z.exe` | Installer (recommended). No admin needed, and it **updates itself automatically**. |
| `SwapDeck-x.y.z-portable.exe` | Single file, no install. Doesn't auto-update. |

The app isn't code-signed yet, so Windows may show a SmartScreen warning the first time. Click **More info → Run anyway**.

## Features

- **One-click switching** between every account saved in Steam
- **Launch a game after switching**, chosen per account
- **Tags, notes and pins** to organise accounts, plus search and sorting
- **Account status at a glance**: online / in-game, VAC and trade bans, limited account
- **Optional linked stats**: games and hours, Steam level, wallet, CS2 Premier rating, ranks and medals
- **Add and forget accounts** without digging through Steam
- **Scalable UI** that remembers its window size and position

## Using it

| Action | How |
|---|---|
| Switch account | Double-click a card, or select it and press `Enter` |
| Account details | Click a card |
| Browse | `←` `→` or the mouse wheel |
| Search | `/` |
| UI scale | `Ctrl +` / `Ctrl −` / `Ctrl 0` (auto), or Settings |

## Privacy

- Everything stays on your PC, in `%APPDATA%\SwapDeck`.
- **Linking is optional.** It uses Steam's own sign-in (QR code or password + Steam Guard). SwapDeck keeps only
  Steam's sign-in token, encrypted by Windows. **Your password is never stored.**
- Unlinking deletes the token. You can also revoke the "SwapDeck" device from your Steam account settings.

## Good to know

- Steam's **"Ask which account to use each time Steam starts"** blocks automatic sign-in, so SwapDeck turns it off when you switch.
- If Steam asks for a password after a switch, that account's saved login expired. Sign in once with **Remember me** ticked.
- CS2 stats aren't refreshed while that account is in a game, because it would kick the game session.

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
