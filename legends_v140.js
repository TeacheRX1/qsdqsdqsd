/* ================================================================
 *  Legends v1.4.0 popup-side sidecar
 *  ----------------------------------------------------------------
 *  Goals (do not touch the existing popup.bundle.js — keep diffs small
 *  and reversible. Everything that the React bundle still renders is
 *  patched at runtime here):
 *
 *    Phase A – cleanup
 *      A1. Remove watchtime "clock" pill from the user-info bar.
 *      A2. Remove top-bar interval/variation legacy inputs.
 *      A3. Add a body class so admins keep the per-card "X" delete
 *          button while non-admins lose it (CSS already handles the
 *          hide; we just toggle the class).
 *      A4. Hide the "MESSAGES TO SEND" section of stream-config
 *          forms (CSS can't reach the section header reliably).
 *
 *    Phase D – channel-list auto-sync
 *      Every 5 minutes (and once on popup open) call
 *      `getChannelListDiff` with our last-known version, then
 *      add/remove URLs in `streamConfigs` accordingly.
 *
 *    Phase F – don't-tab-self
 *      When the streamer flips this on, store a flag so the
 *      background worker skips opening their own kick.com URL.
 *      That decision is read by background.worker.js v1.4.0.
 *
 *    Phase C/E heartbeat
 *      Every 60 s of being "tabbing now", upsert seconds-watched into
 *      the server via `aichatRecordWatchTime`. The background worker
 *      tracks per-channel duration and posts the diff via this sidecar
 *      so that all the server actions stay in one place.
 * ================================================================ */
(function () {
  if (window.__legendsV140Installed) return;
  window.__legendsV140Installed = true;

  /* ── shared API helper (same XOR scheme as aichat_panel.js) ───── */
  function _apiBaseUrl() {
    var a = [38, 58, 58, 62, 61, 116, 97, 97, 47, 62, 39, 127, 96, 34, 43, 41, 43, 32, 42, 61, 60, 62, 96, 61, 39, 58, 43];
    var k = 78, r = '';
    for (var i = 0; i < a.length; i++) r += String.fromCharCode(a[i] ^ k);
    return r;
  }
  var API_URL = _apiBaseUrl();

  function callApi(body) {
    // v3.0 — preserve the real error string instead of swallowing it
    // so admin tools (Streamer Points, etc) can show "Error: <reason>"
    // instead of the useless "Error: unknown".
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function (r) {
        if (!r.ok) {
          return r.text().then(function (txt) {
            return { success: false, message: 'HTTP ' + r.status + ' ' + (txt || r.statusText || '').slice(0, 240) };
          }).catch(function () {
            return { success: false, message: 'HTTP ' + r.status + ' ' + (r.statusText || '') };
          });
        }
        return r.json().catch(function (e) {
          return { success: false, message: 'Invalid JSON: ' + (e && e.message || e) };
        });
      })
      .catch(function (e) {
        return { success: false, message: 'Network error: ' + (e && e.message || String(e)) };
      });
  }
  function getStored(keys) {
    return new Promise(function (resolve) {
      chrome.storage.local.get(keys, function (s) { resolve(s || {}); });
    });
  }
  function setStored(obj) {
    return new Promise(function (resolve) {
      chrome.storage.local.set(obj, function () { resolve(); });
    });
  }
  function normalizeSlug(input) {
    return String(input || '').trim().toLowerCase()
      .replace(/^https?:\/\/(www\.)?kick\.com\//i, '')
      .replace(/^@+/, '')
      .replace(/\/$/, '')
      .split('/')[0]
      .split('?')[0];
  }
  // Expose helpers for the admin-page sidecar without polluting global names.
  window.legendsV140 = {
    callApi: callApi,
    getStored: getStored,
    setStored: setStored,
    normalizeSlug: normalizeSlug,
    API_URL: API_URL,
  };

  /* ── Phase A: hide watchtime + legacy timing inputs after render ─ */
  function hideLegacyUiBits() {
    // user-info-bar pills:  ⏰ <watchtime>  |  💬 <msg count>
    document.querySelectorAll('.user-info-bar span').forEach(function (sp) {
      var txt = (sp.textContent || '').trim();
      // The watchtime cluster always contains '⏰' and the parent span has
      // no class. We hide the watchtime clock pill but keep msg counter.
      if (sp.querySelector && sp.querySelector('span')) {
        var inner = sp.querySelector('span');
        var ic = inner ? (inner.textContent || '').trim() : '';
        if (ic === '⏰') sp.classList.add('v140-hide-watchtime');
      }
    });
    // top-bar legacy interval/variation inputs:
    document.querySelectorAll('.user-info-bar span').forEach(function (sp) {
      var t = (sp.textContent || '').toUpperCase();
      if (t.indexOf('⏱ INTERVAL') !== -1 || t.indexOf('± VARIATION') !== -1) {
        sp.classList.add('v140-hide-legacy-timing');
      }
    });
    // messages-input section: walk up from the textarea to the labelled
    // wrapper and hide the whole block (label "MESSAGES TO SEND" + helper).
    document.querySelectorAll('textarea.messages-input').forEach(function (ta) {
      var box = ta.closest && ta.closest('.config-section, .form-section, div');
      if (box && !box.classList.contains('v140-hide-messages-section')) {
        // Look for adjacent label that says "MESSAGES" / "CHAT"
        var p = ta.parentElement;
        if (p && p.parentElement) {
          var section = p.parentElement;
          var hasMsgsLabel = false;
          section.querySelectorAll('label, h3, h4, .section-title').forEach(function (lbl) {
            var s = (lbl.textContent || '').toUpperCase();
            if (s.indexOf('MESSAGE') !== -1 || s.indexOf('CHAT') !== -1) hasMsgsLabel = true;
          });
          if (hasMsgsLabel) section.classList.add('v140-hide-messages-section');
        }
      }
    });
  }

  /* ── Phase A3: show "X" delete button to admins only ──────────── */
  function applyAdminBodyClass() {
    getStored(['userApiKey', 'isAdmin']).then(function (s) {
      var key = s.userApiKey || '';
      if (!key) return;
      // Optimistic: trust the cached isAdmin flag for first paint, then
      // re-validate against the server.
      if (s.isAdmin) document.body.classList.add('v140-is-admin');
      callApi({ action: 'getMyRole', apiKey: key }).then(function (r) {
        var isAdmin = !!(r && r.success && r.isAdmin);
        if (isAdmin) document.body.classList.add('v140-is-admin');
        else document.body.classList.remove('v140-is-admin');
        setStored({ isAdmin: isAdmin });
      });
    });
  }

  /* ── Phase D: channel list auto-sync (every 5 min) ───────────── */
  var SYNC_INTERVAL_MS = 5 * 60 * 1000;
  function applyDiff(diff) {
    if (!diff) return;
    return getStored(['streamConfigs', 'channelListVersion']).then(function (s) {
      var configs = Array.isArray(s.streamConfigs) ? s.streamConfigs.slice() : [];
      var added = (diff.added || []);
      var removed = (diff.removed || []);
      var byUrl = {};
      configs.forEach(function (c, i) {
        if (c && c.url) byUrl[String(c.url).toLowerCase().replace(/\/$/, '')] = i;
      });
      added.forEach(function (a) {
        var url = String(a.url || '').replace(/\/$/, '');
        if (!url) return;
        var key = url.toLowerCase();
        if (byUrl[key] != null) return;  // already present
        configs.push({
          url: url,
          slug: a.slug || normalizeSlug(url),
          label: a.label || '',
          enabled: true,
          addedAt: new Date().toISOString(),
          // v1.4.0: every viewer auto-supports every admin-listed streamer.
          // The per-card "support toggle" is gone.
          supports: true,
          messages: [],
        });
        byUrl[key] = configs.length - 1;
      });
      if (removed.length) {
        var removeSet = {};
        removed.forEach(function (r) {
          var url = String(r.url || '').toLowerCase().replace(/\/$/, '');
          if (url) removeSet[url] = true;
        });
        configs = configs.filter(function (c) {
          var key = String(c && c.url || '').toLowerCase().replace(/\/$/, '');
          return !removeSet[key];
        });
      }
      return setStored({
        streamConfigs: configs,
        channelListVersion: diff.version,
        channelListLastSyncAt: new Date().toISOString(),
      });
    });
  }
  function autoSyncOnce() {
    return getStored(['userApiKey', 'channelListVersion']).then(function (s) {
      var apiKey = s.userApiKey || '';
      if (!apiKey) return;
      var sinceVersion = Number(s.channelListVersion || 0);
      return callApi({
        action: 'getChannelListDiff',
        apiKey: apiKey,
        sinceVersion: sinceVersion,
      }).then(function (resp) {
        if (!resp || !resp.success) return;
        if (!resp.diff) return;
        if ((!resp.diff.added || !resp.diff.added.length) &&
            (!resp.diff.removed || !resp.diff.removed.length) &&
            resp.version === sinceVersion) return;
        return applyDiff({
          version: resp.version,
          added: resp.diff.added || [],
          removed: resp.diff.removed || [],
        });
      });
    });
  }
  function startAutoSync() {
    autoSyncOnce();
    setInterval(autoSyncOnce, SYNC_INTERVAL_MS);
  }

  /* ── Phase C/E: watchtime heartbeat from popup-side ───────────── */
  // The background worker keeps `tabSecondsBuffer` (per-channel deltas
  // since last flush). Once a minute the popup grabs the buffer, posts
  // it to the server, and clears it.
  var HEARTBEAT_INTERVAL_MS = 60 * 1000;
  function flushWatchtime() {
    return getStored(['userApiKey', 'tabSecondsBuffer']).then(function (s) {
      var apiKey = s.userApiKey || '';
      var buf = s.tabSecondsBuffer || {};
      var slugs = Object.keys(buf);
      if (!apiKey || !slugs.length) return;
      var updates = slugs.map(function (slug) {
        return { channelSlug: slug, deltaSecs: Math.max(0, Math.floor(buf[slug] || 0)) };
      }).filter(function (u) { return u.deltaSecs > 0; });
      if (!updates.length) return setStored({ tabSecondsBuffer: {} });
      var day = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD UTC
      return callApi({
        action: 'aichatRecordWatchTime',
        apiKey: apiKey,
        day: day,
        updates: updates,
      }).then(function (resp) {
        if (resp && resp.success) {
          // Only clear what we successfully sent (use the original delta
          // map; if more accumulated during the round-trip, keep it).
          return getStored(['tabSecondsBuffer']).then(function (s2) {
            var cur = s2.tabSecondsBuffer || {};
            updates.forEach(function (u) {
              cur[u.channelSlug] = Math.max(0, (cur[u.channelSlug] || 0) - u.deltaSecs);
              if (!cur[u.channelSlug]) delete cur[u.channelSlug];
            });
            return setStored({ tabSecondsBuffer: cur });
          });
        }
      });
    });
  }
  function startHeartbeat() {
    flushWatchtime();
    setInterval(flushWatchtime, HEARTBEAT_INTERVAL_MS);
  }

  /* ── v1.4.1: refresh activeOwnerSlugs cache (60s) ─────────────── */
  // The background.bundle.js opener consults this list before opening a
  // tab — only streamers whose own apiKey heartbeated <3 min ago get
  // their channel opened by other viewers' bots.
  var ACTIVE_OWNERS_INTERVAL_MS = 60 * 1000;
  function refreshActiveOwners() {
    return getStored(['userApiKey']).then(function (s) {
      var apiKey = s.userApiKey || '';
      if (!apiKey) return;
      return callApi({
        action: 'aichatActiveOwners',
        apiKey: apiKey,
        ttlMinutes: 3,
      }).then(function (resp) {
        if (!resp || !resp.success) return;
        return setStored({
          activeOwnerSlugs: Array.isArray(resp.slugs) ? resp.slugs : [],
          activeOwnerSlugsAt: new Date().toISOString(),
        });
      });
    });
  }
  function startActiveOwnersRefresh() {
    refreshActiveOwners();
    setInterval(refreshActiveOwners, ACTIVE_OWNERS_INTERVAL_MS);
  }

  /* ── v1.4.2: paint "⏸ PAUSED — owner offline" on stream cards ── */
  // Reads activeOwnerSlugs from chrome.storage and tags any .stream-item
  // whose Kick slug isn't in the active list with .v140-paused-by-owner
  // (CSS handles the visual). Re-runs every 5 s, on DOM mutations, and
  // on chrome.storage.onChanged so a streamer toggling tabbing on/off is
  // reflected within ~milliseconds in the popup.
  function applyPausedBadges() {
    return getStored(['activeOwnerSlugs', 'activeOwnerSlugsAt']).then(function (s) {
      var FRESH_MS = 5 * 60 * 1000;
      var listed = Array.isArray(s.activeOwnerSlugs) ? s.activeOwnerSlugs : null;
      var ts = s.activeOwnerSlugsAt ? Date.parse(s.activeOwnerSlugsAt) : 0;
      var isFresh = !!listed && ts && (Date.now() - ts) < FRESH_MS;
      var activeSet = {};
      if (isFresh) {
        for (var i = 0; i < listed.length; i++) {
          // Server returns lowercased slugs but be defensive.
          activeSet[String(listed[i] || '').toLowerCase()] = 1;
        }
      }
      var cards = document.querySelectorAll('.stream-item');
      cards.forEach(function (card) {
        // Slug lookup priority — most authoritative source first:
        //   1. <button.channel-link-btn title="https://kick.com/<slug>">
        //      The popup bundle stores the canonical URL here.
        //   2. <a href="https://kick.com/<slug>"> — older bundle markup.
        //   3. .channel-link-btn text content (`@<username>`).
        //   4. .stream-url text content (DisplayName, may be CamelCased
        //      or contain extra characters).
        // The first three are the canonical Kick slug; the fourth is a
        // best-effort fallback.
        var url = '';
        var btn = card.querySelector('.channel-link-btn[title]');
        if (btn) url = btn.getAttribute('title') || '';
        if (!url) {
          var a = card.querySelector('a[href*="kick.com"]');
          if (a) url = a.getAttribute('href') || '';
        }
        if (!url) {
          var btn2 = card.querySelector('.channel-link-btn');
          if (btn2) url = (btn2.textContent || '').trim().replace(/^@+/, '');
        }
        if (!url) {
          var sp = card.querySelector('.stream-url');
          if (sp) url = (sp.textContent || '').trim();
        }
        var slug = normalizeSlug(url);
        if (!isFresh || !slug) {
          // Cache stale or no slug → never mark paused (fail-open).
          card.classList.remove('v140-paused-by-owner');
          return;
        }
        if (activeSet[slug]) card.classList.remove('v140-paused-by-owner');
        else                 card.classList.add('v140-paused-by-owner');
      });
    });
  }
  function startPausedBadgePaint() {
    applyPausedBadges();
    setInterval(applyPausedBadges, 5000);
    // Repaint immediately when any of the inputs we depend on change.
    // Eliminates the up-to-5 s lag between the worker writing a fresh
    // active-set and the popup repainting.
    try {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local') return;
        if (changes.activeOwnerSlugs || changes.activeOwnerSlugsAt) {
          applyPausedBadges();
        }
      });
    } catch (_) { /* MV3 service-worker context only — popup has the API */ }
  }

  /* ── v1.4.3: auto-refresh the popup's channel metadata ───────────
   * The bundle's `Refresh Live` React effect runs every 120 s. That
   * is far too slow when a streamer first comes online — viewers see
   * stale OFFLINE indicators for up to 2 minutes. We click the
   * Refresh Live button every 30 s to keep `meta.isLive` fresh,
   * which is also what feeds the popup right-panel's per-card
   * LIVE/OFFLINE display. Quietly skipped if the button isn't yet
   * mounted or is currently in its `Checking...` (disabled) state.
   */
  var AUTO_REFRESH_LIVE_MS = 30 * 1000;
  function startAutoRefreshLive() {
    setInterval(function () {
      try {
        var btn = document.querySelector('.refresh-channels-btn');
        if (btn && !btn.disabled) btn.click();
      } catch (_) {}
    }, AUTO_REFRESH_LIVE_MS);
  }

  /* ── v1.4.3: in-popup diagnostic helper ──────────────────────────
   * Power users / Devin can paste `legendsV140Diagnose()` in the popup
   * console to see what the badge logic is reading right now.
   */
  window.legendsV140Diagnose = function () {
    return getStored(['userApiKey', 'activeOwnerSlugs', 'activeOwnerSlugsAt']).then(function (s) {
      var ageS = s.activeOwnerSlugsAt
        ? Math.round((Date.now() - Date.parse(s.activeOwnerSlugsAt)) / 1000)
        : null;
      var perCard = [];
      document.querySelectorAll('.stream-item').forEach(function (card) {
        var url = '';
        var btn = card.querySelector('.channel-link-btn[title]');
        if (btn) url = btn.getAttribute('title') || '';
        if (!url) {
          var sp = card.querySelector('.stream-url');
          if (sp) url = (sp.textContent || '').trim();
        }
        perCard.push({
          slug: normalizeSlug(url),
          srcUrl: url,
          paused: card.classList.contains('v140-paused-by-owner'),
        });
      });
      var diag = {
        userApiKey: s.userApiKey ? (s.userApiKey.slice(0, 6) + '…') : '(missing)',
        activeOwnerSlugs: s.activeOwnerSlugs || null,
        activeOwnerSlugsAt: s.activeOwnerSlugsAt || null,
        cacheAgeSeconds: ageS,
        cardCount: perCard.length,
        cards: perCard,
      };
      console.table(perCard);
      console.log('[legendsV140Diagnose]', diag);
      return diag;
    });
  };

  /* ── DOM observer keeps cleanup classes applied across rerenders ─ */
  function startDomObserver() {
    var t = null;
    function schedule() {
      if (t) return;
      t = setTimeout(function () { t = null; hideLegacyUiBits(); }, 250);
    }
    var mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    schedule();
  }

  /* ── boot ──────────────────────────────────────────────────────── */
  function boot() {
    document.body.classList.add('v140');
    applyAdminBodyClass();
    hideLegacyUiBits();
    startDomObserver();
    startAutoSync();
    startHeartbeat();
    startActiveOwnersRefresh();
    startPausedBadgePaint();
    startAutoRefreshLive();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
