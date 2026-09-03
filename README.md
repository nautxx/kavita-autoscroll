# Kavita Webtoon Auto-scroll

Adjustable, pausable auto-scrolling for
[Kavita](https://www.kavitareader.com/)'s Webtoon reader.

The script adds a compact play/pause and speed control to Kavita manga-reader
pages. It works as a userscript in modern browsers and can also be loaded as a
temporary Safari Web Extension on macOS.

For extension-free clients—including an iPad Home Screen web app—the included
Docker injector can place the same script into Kavita's HTML at the server.

## Features

- Adjustable scrolling from 10 to 300 pixels per second
- Play/pause control suitable for mouse or touch
- Automatically hides the controls while scrolling and reveals them on input
- Can automatically start when Kavita enters Webtoon mode
- Can be placed in any screen corner and remembers the selection
- Moves out of the way when Kavita's reader menu opens
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

### Docker injector

The injector sits between your public reverse proxy and Kavita. It serves the
script from the same origin and adds its script tag to Kavita's HTML, so no
browser extension is required.

Build it locally from the repository root:

```bash
docker build \
  --file injector/Dockerfile \
  --build-arg AUTOSCROLL_VERSION=0.6.1 \
  --tag ghcr.io/nautxx/kavita-autoscroll-injector:0.6.1 \
  .
```

See [`examples/docker-compose.yml`](./examples/docker-compose.yml) for a full
example. Point Caddy or your other public reverse proxy at the injector's port,
not directly at Kavita. `KAVITA_UPSTREAM` may be changed when your Kavita
service uses another Compose hostname or port. The example includes a local
build definition; remove its `build` block if you only want to pull the
published GHCR image. The injector also reads these optional values from the
Compose environment:

- `AUTOSCROLL_TOGGLE_SHORTCUT` (default `s`)
- `AUTOSCROLL_SLOWER_SHORTCUT` (default `[`)
- `AUTOSCROLL_FASTER_SHORTCUT` (default `]`)
- `AUTOSCROLL_SPEED_STEP` (default `5` pixels per second)

Set them in the Compose `.env` file and recreate the injector container. Values
use the browser's `KeyboardEvent.key` names, such as `Space`, `ArrowDown`, or a
single printable character. Avoid double quotes and HTML-special characters in
shortcut values. `AUTOSCROLL_SPEED_STEP` must be a positive number and controls
both the keyboard increment and slider step.

### Keybindings

Put the exact key name in the Compose `.env` file. Common values are:

| Physical key | `.env` value |
| --- | --- |
| Enter | `Enter` |
| Spacebar | `Space` |
| Up arrow | `ArrowUp` |
| Down arrow | `ArrowDown` |
| Left arrow | `ArrowLeft` |
| Right arrow | `ArrowRight` |
| Letter S | `s` |
| Left bracket | `[` |
| Right bracket | `]` |

For example, this uses Enter to toggle scrolling and the arrow keys to adjust
the speed by 10 pixels per second:

```dotenv
AUTOSCROLL_TOGGLE_SHORTCUT=Enter
AUTOSCROLL_SLOWER_SHORTCUT=ArrowDown
AUTOSCROLL_FASTER_SHORTCUT=ArrowUp
AUTOSCROLL_SPEED_STEP=10
```

Key names are case-insensitive. Each binding must be one key; combinations
using Control, Command, or Alt are intentionally ignored. Recreate the injector
container after editing `.env`.

## Usage

- Select the play icon to begin and the pause icon to stop.
- Move the slider to change speed.
- Select the four-corner icon to open settings. From there, move the controls
  to any corner or enable **Auto-start in Webtoon mode**.
- Press `S` to toggle scrolling on a hardware keyboard.
- Press `[` or `]` to decrease or increase speed.
- Scrolling, clicking, or touching outside the control pauses auto-scroll.
- While auto-scroll is running, the controls fade away after 2.5 seconds of
  inactivity. Move the pointer, touch the page, or use the keyboard to reveal
  them. The controls remain visible while paused.

Kavita must be using its **Webtoon** reader mode. The controls appear only when
Kavita's infinite scroller is active, including when a reading profile or
Automatic Webtoon Reader Mode selects it. If you install the script while a
reader is already open, reload that page once.

## Permissions and privacy

Self-hosted Kavita instances can use any hostname, so the script matches
HTTP(S) pages whose path contains `/manga/`. It does nothing beyond those
matched pages.

The script does not read credentials, call Kavita APIs, send data, or load
remote code. Its only stored values are the scrolling speed, preferred control
corner, and auto-start preference in that site's local browser storage. Review the complete source in
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

## Packaging a release

Run:

```bash
./scripts/package.sh 0.6.1
```

This creates a userscript, a WebExtension ZIP, and `SHA256SUMS.txt` under the
versioned `build/release/v0.6.1/` directory. The injector image uses the
userscript at the repository root as its source, so the browser and server
packages stay on the same version.

Pushing a matching tag such as `v0.6.1` runs the release workflow. It publishes
the assets as a GitHub release and builds `linux/amd64` and `linux/arm64`
injector images in GitHub Container Registry.

## License

[MIT](./LICENSE)
