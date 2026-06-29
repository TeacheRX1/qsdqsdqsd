# Legends v3.0 — CHANGELOG

## v3.1.0 — extension pressure reduction

Four optimizations cutting bot-driven request volume by ~70% on top of the v3.0 Kick-poller fix.

### A. Combined `tick` endpoint (server + extension)

Old: every active bot made **4 separate POSTs per minute** — `heartbeat` (self), `heartbeat` (tabCount), `aichatRecordWatchTime` (_self keep-alive), `aichatActiveOwners`. With ~107 bots = ~428 reqs/min just from this loop.

New: one POST per minute — `action: 'tick'` — batches heartbeat + tabCount + watchtime + activeOwners + (optional) announcedLive. Server runs them in parallel and returns a combined payload. **75% reduction.**

Old worker alarms removed: `legendsV143SelfHeartbeat`, `legendsV143ActiveOwnersFetch`. Their helper functions (`selfHeartbeatOnce`, `refreshActiveOwnersOnce`) are now thin shims that call into the v3 combined tick — existing callers keep working without firing duplicate requests.

### B. Versioned `getAnnouncedLive` (server returns `unchanged` fast-path)

`LiveAnnouncements` now carries an in-process **version counter** that bumps every time a slug is added or removed (viewer-count drift doesn't bump it — bots don't act on viewers). The extension passes `lastSeenVersion: N` on every poll. If the server's version still matches, response is just `{ success: true, unchanged: true, version: N }` — no JOIN, no SQL scan, no payload to parse.

In a typical 5-minute window with no I'M LIVE clicks, **all 10 polls (1 per 30s) return `unchanged`**. The server work for getAnnouncedLive drops to almost zero.

### C. Adaptive backoff on getAnnouncedLive

Extension worker tracks consecutive `unchanged` returns:
- streak < 4   → poll every **30 s** (normal cadence)
- streak ≥ 4   → poll every **60 s** (skip every other tick)
- streak ≥ 10  → poll every **120 s** (skip 3 of 4 ticks)

Any real change (an I'M LIVE click, an offline flip) instantly resets streak → cadence back to 30 s. So fresh updates still arrive within 30 s; quiet periods cost a quarter as much.

### D. Server-side memoize on `aichatActiveOwners` (already shipped in v3.0)

Verified the 30 s in-process cache + singleflight is in place. All 107 bots hitting the endpoint within a window now share one DB pass instead of 107.

### Combined effect (with v3.0 + v3.1)

| State                         | Pre-v3   | v3.0   | v3.1                    |
| ----------------------------- | -------- | ------ | ----------------------- |
| Kick API calls / hour         | ~7,500   | ~60    | ~60                     |
| Extension reqs/min (107 bots) | ~640     | ~640   | **~180**                |
| SQL work per request          | full     | full   | mostly cached/versioned |
| `/health` p95 latency         | broken   | <50 ms | <50 ms                  |

---

## v3.0.1 fix-up (24h timeline relocation)

- **24h timeline bar removed from the regular popup.** It was previously shown to every user — that was wrong.
- **24h timeline now lives inside the admin "Streamer Points" page**, one strip per user, so admins can see exactly what hours each user was tabbing in a given day.
- **Server: new `HourlyWatchTime(ApiKey, Day, Hour, Seconds)` table** populated from `aichatRecordWatchTime` using the MAX delta across the user's reported channels (matches how `aichatPointsByUser` computes daily wall-clock).
- **`aichatPointsByUser` now returns a 24-bucket `hourly` array per user** so the admin overlay can draw the strips in a single round-trip.
- **Network-error UX fix.** `legendsV140.callApi` now surfaces real fetch / HTTP / JSON errors. The Streamer Points page used to show the meaningless `Error: unknown` whenever the server returned non-2xx; it now shows e.g. `Error: HTTP 502 Bad Gateway`, `Error: Network error: Failed to fetch`, etc.

---



## What changed at a glance

| Area              | Before                                          | After                                           |
| ----------------- | ----------------------------------------------- | ----------------------------------------------- |
| Live detection    | Global Kick poller every 90s for all 187 slugs  | "I'M LIVE" button → only announced streamers polled (every 5 min) |
| CPU pressure      | One core at 93% non-stop                        | ~90% reduction in Kick API calls                |
| Listen backlog    | 511 (OS default)                                | 16,384                                          |
| `/health` reachability | ECONNREFUSED under load                      | Always reachable (kernel queue won't overflow)  |
| Online panel      | User + status dot                               | User + tab count badge + support-account name   |
| Popup             | (no live button)                                | "I'M LIVE" button (red/green) + 24h timeline bar |
| AI chat output    | Sometimes commas & periods                      | Always stripped — reads like a real human       |
| AI chat presets   | Fast / Normal / Slow / Super Slow               | + 🚀 **Super Fast** (100-250 s)                 |
| Watchtime         | Server only knows total per day                 | Extension keeps per-hour ledger (24 buckets)    |
| Support-account   | Unknown                                         | Auto-detected daily at 04:00 UTC                |

---

## Server (`fixed_server/`)

### New files
- **`live_announce.js`** — full state machine for the I'M LIVE button.
  - `goLive(apiKey)` — validates the streamer is heart-beating, calls Kick once to verify, inserts into `LiveAnnouncements`.
  - `goOffline(apiKey)` — removes the row, marks the channel offline.
  - `getMyLiveStatus(apiKey)` — single-user status read.
  - `getAnnouncedLive()` — global list of currently-announced live channels, with viewer counts.
  - `startRecheckLoop()` — wakes up every 30 s, re-checks slugs whose `NextCheckAt <= now`. 2-strike offline gate before flipping `IsLive` to 0.

### Schema migrations (idempotent, run at startup)
- New table: **`LiveAnnouncements`** (`ApiKey` PK, `Slug`, `AnnouncedAt`, `LastChecked`, `NextCheckAt`, `IsLive`, `LastViewerCount`, `ConsecutiveOffline`).
- New columns on **`ER_Heartbeats`**: `TabCount INTEGER`, `SupportAccount TEXT`, `SupportAccountCheckedAt TEXT`.
- New indexes: `StreamerChatPool(UsedAt)`, `ER_Heartbeats(LastSeen)`, `CommunityPromptAcks(ApiKey)`, `PollVoteAcks(ApiKey)`.

### New action handlers (POST /)
- `goLive`, `goOffline`, `getMyLiveStatus`, `getAnnouncedLive`
- `reportSupportAccount` { apiKey, supportAccount } — stores the user's main Kick account name
- `getHourlyWatchTime` { apiKey, day } — 24-bucket array of seconds tabbed (server-side data + the extension's own per-hour ledger)

### Behaviour changes
- `heartbeat` now accepts optional `tabCount` field. Only updates `ER_Heartbeats.TabCount` when explicitly present (legacy heartbeats without it don't reset the count to 0).
- `getOnlineUsers` now includes `tabCount` and `supportAccount` on each user row.
- Global Kick poller is gated behind `LEGACY_GLOBAL_POLLER=1` env var — DEFAULT OFF in v3. The new flow only polls slugs that streamers have explicitly announced via I'M LIVE.
- AI-chat output (`aichat.ollamaGenerateBatch`) now runs a `humanizeMessage` pass:
  - strips commas + periods + em/en dashes + ellipses
  - when `chatType` is `text-only`: strips all emojis (unicode + Kick `:emote_name:` tokens)
- New speed preset **index 4 = 🚀 Super Fast (100-250 s)**.
- `app.listen()` backlog raised to **16,384** (override via `LISTEN_BACKLOG` env).

---

## Extension (`fixed_extension/`)

### New files
- **`im_live_btn.js`** — popup-side red/green button. Polls `getMyLiveStatus` every 30 s while popup is open.
- **`watchtime_bar.js`** — 24-cell horizontal timeline of today's tabbing, level-graded green by minutes per hour. Tooltip on hover.

### Modified files
- **`background.worker.js`** — four new MV3 alarms:
  - `legendsV3AnnouncedLive` (every 30 s): POST `getAnnouncedLive`, force-open new announced tabs, force-close ones that withdrew.
  - `legendsV3TabCountHeartbeat` (every 60 s): count open kick.com tabs, send extended `heartbeat` with `tabCount`.
  - `legendsV3WatchtimeLedger` (every 60 s): increment current UTC-hour bucket in `chrome.storage.local.wt24hLedger`.
  - `legendsV3SupportAccountCheck` (every 30 min, only fires within 04:00-04:59 UTC, once per day): reads the logged-in username from a kick.com tab and POSTs `reportSupportAccount`.
- **`online_panel.js`** — every row now shows the user's tab count badge + detected support account.
- **`aichat_panel.js`** — adds the 🚀 Super Fast preset button; system prompt now instructs the LLM to skip commas + periods; defensive in-browser humanizer also applied on generation responses.
- **`popup.html`** — wires `im_live_btn.js` + `watchtime_bar.js`.
- **`popup.override.css`** — styles for I'M LIVE button (red/green), 24h timeline, tab-count badge, support-account tag.
- **`manifest.json`** — version bumped to **3.0.0**; new web-accessible resources registered.

---

## Operational changes / how to run

```bat
:: Recommended start command (boosts Node heap so big SQL scans don't trigger GC pauses):
node --max-old-space-size=8192 server.js

:: Env knobs available in v3 (defaults shown):
::   LIVE_RECHECK_MS=300000           recheck announced slugs every 5 min
::   LIVE_LOOP_TICK_MS=30000          loop wake interval
::   LIVE_OFFLINE_FLIP=2              consecutive offline reads before flipping IsLive=0
::   LIVE_HEARTBEAT_STALE_MS=300000   expire announcement if streamer's heartbeat hasn't landed in 5 min
::   LISTEN_BACKLOG=16384             override OS listen backlog
::   LEGACY_GLOBAL_POLLER=0           set to 1 to also keep polling all 187 slugs every 90 s
```

## What's NOT changed

- All existing actions (`getOnlineUsers`, `aichatRecordWatchTime`, `aichatPopMessage`, `getChannelMetadata`, `isChannelLive`, etc.) keep their existing behaviour.
- No DB data loss — all migrations are additive.
- The legacy `background.bundle.js` heartbeat still works; the new worker heartbeat coexists with it.
