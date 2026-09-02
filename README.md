# Kavita Webtoon Auto-scroll

Adjustable, pausable auto-scrolling for
[Kavita](https://www.kavitareader.com/)'s Webtoon reader.

The script adds a compact play/pause and speed control to Kavita manga-reader
pages. It works as a userscript in modern browsers and can also be loaded as a
temporary Safari Web Extension on macOS.

## Features

- Adjustable scrolling from 10 to 300 pixels per second
- Play/pause control suitable for mouse or touch
- Pauses when you scroll, click, or touch outside the control
- Remembers the selected speed in the browser
- Handles Kavita's normal and fullscreen Webtoon readers
- Supports Kavita installations hosted at custom domains or base paths
- Makes no network requests and includes no analytics or telemetry

## Install

### Safari on iPhone or iPad

1. Install the free
   [Userscripts app](https://apps.apple.com/us/app/userscripts/id1463298887).
2. Open Userscripts once so it creates its folder in Files.
3. In **Settings > Apps > Safari > Extensions**, enable Userscripts.
4. Download the
   [raw userscript](https://raw.githubusercontent.com/nautxx/kavita-autoscroll/main/kavita-autoscroll.user.js)
   and save it in the folder selected by Userscripts.
5. Open your Kavita reader in Safari, allow Userscripts access to the website,
   and reload the page.

### Safari on macOS

The Userscripts method above also works on macOS. For a temporary native Web
Extension test instead:

1. Download or clone this repository.
2. In Safari **Settings > Advanced**, enable **Show features for web
   developers**.
3. In **Settings > Developer**, enable **Allow unsigned extensions**.
4. Click **Add Temporary Extension…** and select the repository folder.
5. Enable **Kavita Webtoon Auto-scroll**, grant access to your Kavita website,
   and reload the reader.

Safari removes temporary extensions after 24 hours or when Safari quits.

### Chrome, Firefox, Edge, and other desktop browsers

1. Install a userscript manager such as
   [Tampermonkey](https://www.tampermonkey.net/) or
   [Violentmonkey](https://violentmonkey.github.io/).
2. Open the
   [raw userscript](https://raw.githubusercontent.com/nautxx/kavita-autoscroll/main/kavita-autoscroll.user.js).
3. Confirm installation, open a Kavita Webtoon, and reload the reader if it was
   already open.

## Usage

- Select **Play** to begin and **Pause** to stop.
- Move the slider to change speed.
- Press `S` to toggle scrolling on a hardware keyboard.
- Press `[` or `]` to decrease or increase speed.
- Scrolling, clicking, or touching outside the control pauses auto-scroll.

Kavita must be using its **Webtoon** reader mode. The control is injected only
on URLs containing a `/manga/` path segment, which is how Kavita routes its
image reader. If you install the script while a reader is already open, reload
that page once.

## Permissions and privacy

Self-hosted Kavita instances can use any hostname, so the script matches
HTTP(S) pages whose path contains `/manga/`. It does nothing beyond those
matched pages.

The script does not read credentials, call Kavita APIs, send data, or load
remote code. Its only stored value is the selected scrolling speed in that
site's local browser storage. Review the complete source in
[`kavita-autoscroll.user.js`](./kavita-autoscroll.user.js).

## Browser support

The Safari scroll behavior is tested on macOS. The userscript uses standard web
APIs and is designed for current Safari, Chrome, Firefox, Edge, and compatible
userscript managers. iPhone and iPad installation is supported through
Userscripts, but device and Kavita-version differences may require testing.

## Contributing

Bug reports and pull requests are welcome. When reporting a problem, include
your browser, operating system, Kavita version, whether fullscreen was enabled,
and the reader URL with private hostnames or identifiers removed.

## License

[MIT](./LICENSE)
