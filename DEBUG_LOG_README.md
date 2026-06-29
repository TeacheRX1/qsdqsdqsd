# LEGENDS SUV — Debug Log Build (v2.0.1)

This build adds a **full debug logger** to the extension so we can pin
down why live + currently-tabbing streamers are getting their tabs
auto-closed. It does NOT change any of the existing behavior yet — it
just captures everything that happens, so the next time the bug occurs
you can export the log and send it to me.

## What's new in this build

- `er_logger.js` — installed first in every extension context
  (service worker, content scripts, popup). Wraps `console.log` /
  `warn` / `error` / `info` / `debug`, captures unhandled errors and
  unhandled promise rejections, and writes a rolling buffer of the
  last **3,000 entries** to `chrome.storage.local._erDebugLog`.
- `er_logger_ui.js` — adds a floating **🪲 Debug Log** button at the
  bottom-right of the popup. Click it to open a viewer where you can:
    - Filter by substring (case-insensitive)
    - Toggle "errors/warnings only"
    - **⬇ Download** the full buffer as a JSON file (this is what you
      send to me)
    - Copy the last 200 entries to clipboard
    - Clear the buffer (use right before reproducing a bug so the file
      contains only the relevant trace)
- `manifest.json` — version bumped to `2.0.1`, both files registered.

## How to install (Windows / Chrome)

1. Stop the running extension if needed (just close all browser windows
   or disable the extension via `chrome://extensions`).
2. Replace your existing `NEW_EXTENTION_fixed` folder with this one.
3. Open `chrome://extensions/`, enable Developer Mode, click **Reload**
   on "LEGENDS SUV", or remove the old version and **Load unpacked** →
   pick this folder.
4. Open the popup once so it can initialize the logger UI.
5. You should see a green/red **🪲 Debug Log (N)** pill at the
   bottom-right of the popup.

## How to capture a "live + tabbing streamer got closed" event

1. Open the popup, click **🪲 Debug Log** → **Clear** (start fresh).
2. Close the modal, leave the bot running. Watch the popup until you
   see a streamer get closed who you know is live + tabbing.
3. Immediately open the popup, click **🪲 Debug Log** → **⬇ Download**.
4. Send me the downloaded `er-debug-log-<timestamp>.json` file.

The file is plain JSON — it contains an entry per console.log /
warning / error / unhandled-rejection across all contexts (service
worker, content scripts on each kick.com page, popup), each with:

```
{
  "t":   1716557742123,        // unix ms
  "ctx": "kick:dz_era",        // which page/context emitted it
  "lvl": "warn",
  "msg": "[KickBot] Page-offline detected (last-live-text) — close requested for https://kick.com/dz_era"
}
```

## What I'll look for in the log

The tab-close paths I already know about (with their log prefixes — so
you can also Ctrl-F these yourself in the viewer):

| Trigger                              | Log prefix |
| ------------------------------------ | ---------- |
| Active-owner gate hit                | `[ER v1.4.3] gate: skipping isChannelLive for inactive owner` |
| RDP live-check returned false        | `[ER] Live check <slug> (via RDP): isLive=false` |
| Periodic cleanup closed the tab      | `[ER] Closed tab - stream offline:` |
| Content script saw "OFFLINE" / "Last live X ago" | `[KickBot] Page-offline detected (last-live-text)` |
| Verified-offline marker set          | `[ER verified-offline] marked` |
| Broken-page strike (no video / no chat) | `[ER broken-page] strike N` |
| Tab-close guard cooldown hit         | `[ER Guard] Skipping tab close for` |
| Background actually removed the tab  | `[ER Guard] Closed offline tab` |
| Dedup closed duplicate slug          | `[ER dedup] Closed duplicate kick.com/...` |
| noSelfTab self-channel close         | `[ER v1.4.4] noSelfTab` |

For each suspect close, the log will show the chain of decisions in
order, so we'll know whether the bug is the active-owner gate, a false
visual-offline detection (most likely suspect — `_detectVisualOffline`
matches very short tokens like the Russian `оф`, which could collide
with random chat messages), the Kick API parser, or the RDP
active-owner gate on the server side.

## Footprint / safety

- The logger does **not** alter the existing live-check / tab-close
  logic at all. It only watches.
- Memory: 3,000 entries × ~200 bytes ≈ 600 KB max in
  `chrome.storage.local`. Oldest entries are dropped automatically.
- Disk: same — chrome.storage.local persists to disk.
- No network calls. Logs never leave the browser unless you click
  **Download** yourself.
