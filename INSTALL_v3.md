# Legends v3.0 — INSTALL

## 1. Server

The server is **drop-in compatible**: schema is migrated on startup, no manual SQL.

### Steps

```bat
:: 1. Stop the running server  (Ctrl-C / pm2 stop legends / your usual method)

:: 2. Back up the DB just in case
copy /Y C:\legends\data\legends.db C:\legends\data\legends.db.pre-v3.bak

:: 3. Unzip legends_server_v3.zip on top of C:\legends\server\
::    The following files are replaced or added:
::      server.js          (modified — actions, heartbeat, schema)
::      aichat.js          (modified — humanizer + Super Fast preset)
::      live_announce.js   (NEW — I'M LIVE state machine)
::      diag.js            (unchanged from previous build, included for completeness)
::      schema.sql         (unchanged)
::      kicklive.js        (unchanged)
::      package.json       (unchanged)

:: 4. (Optional but recommended) Delete the 10 orphan slugs flagged by check.js v2:
sqlite3.exe C:\legends\data\legends.db ^
  "DELETE FROM ChannelLiveState WHERE Slug IN ('zemb99','pilotarifi','ereen51','pytoux','riyadv1','strasx1','robinhogaming','husller','samygh26','shurra66');"

:: 5. Start with more heap so SQL scans don't trigger GC pauses
set NODE_OPTIONS=
node --max-old-space-size=8192 server.js
```

### Env knobs (all optional)

| Variable                   | Default     | What it does |
| -------------------------- | ----------- | ------------ |
| `LIVE_RECHECK_MS`          | 300000      | Recheck announced slugs every N ms (5 min). |
| `LIVE_LOOP_TICK_MS`        | 30000       | Loop wake interval. |
| `LIVE_OFFLINE_FLIP`        | 2           | Consecutive offline reads from Kick before flipping `IsLive` to 0. |
| `LIVE_HEARTBEAT_STALE_MS`  | 300000      | Drop announcement if the streamer's bot hasn't heart-beated in 5 min. |
| `LISTEN_BACKLOG`           | 16384       | OS TCP listen backlog. |
| `LEGACY_GLOBAL_POLLER`     | 0           | Set to `1` to also keep polling all 187 admin slugs every 90 s (you don't want this). |

### How to confirm it's running

After ~30 s of uptime, run `check.js` (v2). Compare to the pre-v3 numbers from your last run:

- `Poller throughput last 5m` should now be SMALL (only announced slugs). e.g. `0-12` is normal, not `56`.
- `/health` should answer **<50 ms** every time (no ECONNREFUSED).
- `[startup] global Kick poller DISABLED` should appear in the server log.
- A new line `[startup] live-state mem cache pre-warmed` is unchanged from before — that's the read cache.

## 2. Extension

Same install pattern as before:

1. Unzip `legends_extension_v3.zip` somewhere (replace your existing extension folder).
2. Go to `chrome://extensions`, toggle Developer Mode on, then click **Reload** on the LEGENDS SUV card.
3. Open the popup. You should see:
   - A big **I'M LIVE** button (red) at the top.
   - A **TODAY · TABBING TIMELINE (UTC)** bar with 24 cells right under it.
4. Click I'M LIVE. The button should:
   - Briefly say `…` (loading),
   - Turn **green** if Kick confirms you're live,
   - Show `live as @yourslug · N viewers` underneath.
5. Other extensions (your friends' bots) should auto-open your tab within ~30 s.
6. When you stop streaming and don't click again, the button auto-turns red within ~5-10 min.

### Verifying the new pieces

- Click I'M LIVE while you ARE live → green.
- Wait 6 min, the recheck loop polls Kick once. If you're still live → button stays green. If you're not → button auto-turns red (other extensions force-close that tab).
- Open `chrome://extensions` → service worker → click "service worker" link → console. You should see periodic `_legendsV3AnnouncedLiveTick` activity (no errors).
- On the admin online-panel, look at any online user — you should see a small blue badge with their tab count next to their name. Once 04:00 UTC rolls past, you'll also see their support account (`@username`).
- Open the AI Chat panel → Speed preset row has a new 🚀 **Super Fast** option at the start.
- Generate a fresh AI batch → look at the messages: no commas, no periods.

## 3. Rollback (just in case)

```bat
:: Stop server
:: Restore your backup files
copy /Y C:\legends\server\backup_v2\* C:\legends\server\
:: Restart
node server.js
```

Schema changes are additive only — the v2 server runs fine against the v3 DB.

## 4. Known small things

- The `getHourlyWatchTime` server endpoint currently returns a 24-bucket array with all-zero seconds because the server-side `StreamerWatchTime` table is per-day, not per-hour. The 24h timeline in the popup is fully populated from the EXTENSION'S OWN per-hour ledger (`chrome.storage.local.wt24hLedger`), which is updated every minute by the worker. So the bar works fine even without the server endpoint feeding hourly data. A future server change can re-bucket the existing data per-hour if you want server-side persistence too.
- Support-account detection requires at least one kick.com tab to be open when the 04:00-04:59 UTC window hits. If no kick.com tab is open, we silently skip and retry the next day.
- The legacy `background.bundle.js` still sends its own (tab-count-less) heartbeat. v3's server.js ignores that path's `tabCount` (default 0) so the worker's count is preserved.
