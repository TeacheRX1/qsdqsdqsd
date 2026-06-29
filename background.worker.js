// ====================================================================
//  Debug logger — must be installed FIRST so every subsequent
//  console.log / console.warn / console.error / unhandled error in
//  the service worker (gate code + bundle + this file) is captured
//  into chrome.storage.local._erDebugLog. The popup has a
//  "Download Debug Log" button that exports the buffer as JSON.
// ====================================================================
try { importScripts("er_logger.js"); } catch (e) { /* never block startup */ }

// ====================================================================
//  v1.4.3 — owner-active gate for live-checks (must run BEFORE the
//  bundle is imported so the wrapped fetch is the one the bundle picks
//  up). The bundle posts `{action:"isChannelLive", slug:X}` to RDP for
//  every configured stream once a minute. We short-circuit those calls
//  for slugs whose owner isn't currently tabbing — same fresh-cache
//  fail-open semantics as the existing `activeOwnerSlugs` gate at
//  tab-open time, so RDP outages don't lock the bot out.
// ====================================================================
(function _erInstallLiveCheckGate() {
  if (self.__erLiveCheckGateInstalled) return;
  self.__erLiveCheckGateInstalled = true;

  var FRESH_MS = 5 * 60 * 1000; // matches background.bundle.js / v143 cleanup

  function _readActiveOwnerSlugs() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get(
          ['activeOwnerSlugs', 'activeOwnerSlugsAt'],
          function (s) {
            var listed = Array.isArray(s && s.activeOwnerSlugs) ? s.activeOwnerSlugs : null;
            var ts = (s && s.activeOwnerSlugsAt) ? Date.parse(s.activeOwnerSlugsAt) : 0;
            var fresh = !!listed && !!ts && (Date.now() - ts) < FRESH_MS;
            var set = {};
            if (fresh) {
              for (var i = 0; i < listed.length; i++) set[String(listed[i]).toLowerCase()] = true;
            }
            resolve({ fresh: fresh, set: set });
          }
        );
      } catch (e) {
        resolve({ fresh: false, set: {} });
      }
    });
  }

  function _extractIsChannelLiveSlug(init) {
    try {
      if (!init || !init.body) return '';
      // `body` will normally be a JSON string; tolerate Blob/FormData by ignoring.
      if (typeof init.body !== 'string') return '';
      // Cheap pre-filter so we don't JSON.parse every fetch in the worker.
      if (init.body.indexOf('isChannelLive') === -1) return '';
      var p = JSON.parse(init.body);
      if (!p || p.action !== 'isChannelLive') return '';
      var raw = p.slug || p.url || '';
      return String(raw).trim().toLowerCase()
        .replace(/^https?:\/\/(www\.)?kick\.com\//i, '')
        .replace(/^@+/, '')
        .replace(/\/$/, '')
        .split('/')[0]
        .split('?')[0];
    } catch (e) { return ''; }
  }

  var _origFetch = self.fetch.bind(self);
  self.fetch = function (input, init) {
    try {
      var slug = _extractIsChannelLiveSlug(init);
      if (slug) {
        return _readActiveOwnerSlugs().then(function (cache) {
          // Only short-circuit when we have a fresh cache AND the slug isn't
          // active. Stale/missing cache => fail-open (let the request through)
          // so a backend hiccup doesn't silently disable live checks.
          if (cache.fresh && !cache.set[slug]) {
            console.log('[ER v1.4.3] gate: skipping isChannelLive for inactive owner', slug);
            var body = JSON.stringify({ success: true, isLive: false, viewerCount: 0, gated: true });
            return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
          return _origFetch(input, init);
        });
      }
    } catch (e) { /* fall through to passthrough */ }
    return _origFetch(input, init);
  };
})();

importScripts("background.bundle.js");

// ================================================================
//  Popup tab management — open/focus popup.html as a tab
// ================================================================
// [FIX] Debounce popup open — prevents rapid double-open if icon clicked quickly
var _popupOpenDebounce = 0;
chrome.action.onClicked.addListener(async () => {
  var now = Date.now();
  if (now - _popupOpenDebounce < 1500) return; // ignore if clicked within 1.5s
  _popupOpenDebounce = now;
  try {
    const popupUrl = chrome.runtime.getURL("popup.html");
    // Query both exact URL and loading state
    const existingTabs = await chrome.tabs.query({ url: popupUrl });

    if (existingTabs.length > 0) {
      const existingTab = existingTabs[0];
      if (existingTab.windowId) {
        await chrome.windows.update(existingTab.windowId, { focused: true }).catch(() => {});
      }
      if (existingTab.id) {
        await chrome.tabs.update(existingTab.id, { active: true }).catch(() => {});
      }
      return;
    }

    await chrome.tabs.create({ url: popupUrl });
  } catch (error) {
    console.error("Failed to open/focus extension tab:", error);
  }
});

// ================================================================
//  Twitch auto-tab — triggered when admin goes live
//  1. Check if the Twitch URL is already open — if yes, do nothing
//  2. If not open, open it in a new tab
//  3. After 20 seconds, CHECK if stream is muted — only unmute if muted
// ================================================================
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'openTwitchTab') {
    var twitchUrl = message.twitchUrl;
    if (!twitchUrl) return;

    var normalizedUrl = twitchUrl.replace(/\/$/, '').toLowerCase();

    // Check if a tab with this Twitch URL is already open — if yes, skip
    chrome.tabs.query({}, function(allTabs) {
      var alreadyOpen = false;
      for (var i = 0; i < allTabs.length; i++) {
        var tabUrl = (allTabs[i].url || '').replace(/\/$/, '').toLowerCase();
        if (tabUrl.split('?')[0].split('#')[0] === normalizedUrl.split('?')[0].split('#')[0]) {
          alreadyOpen = true;
          console.log('[ER] Twitch tab already open — not opening again:', twitchUrl);
          break;
        }
      }

      if (alreadyOpen) {
        // Store active URL for 5-min alarm
        chrome.storage.local.set({ er_active_twitch_url: twitchUrl });
        sendResponse({ success: true, alreadyOpen: true });
        return;
      }

      console.log('[ER] Admin is live — opening Twitch tab:', twitchUrl);
      chrome.storage.local.set({ er_active_twitch_url: twitchUrl });

      chrome.tabs.create({ url: twitchUrl, active: true }, function(tab) {
        if (!tab || !tab.id) return;
        var tabId = tab.id;

        // Wait 20 seconds then CHECK mute state — only unmute if actually muted
        setTimeout(function() {
          chrome.tabs.get(tabId, function(t) {
            if (chrome.runtime.lastError || !t) {
              console.log('[ER] Twitch tab was closed before unmute check.');
              return;
            }

            chrome.scripting.executeScript({
              target: { tabId: tabId },
              func: function() {
                // Priority: check video element muted state directly
                var video = document.querySelector('video');
                if (video) {
                  if (video.muted) {
                    video.muted = false;
                    video.volume = 1;
                    console.log('[ER] Video was muted — unmuted.');
                  } else {
                    console.log('[ER] Video already unmuted — no action taken.');
                  }
                  return;
                }
                // Fallback: Twitch button — only click if label says "Unmute" (meaning currently muted)
                var muteBtn = document.querySelector('[data-a-target="player-mute-unmute-button"]');
                if (muteBtn) {
                  var label = (muteBtn.getAttribute('aria-label') || '').toLowerCase();
                  if (label.includes('unmute')) {
                    muteBtn.click();
                    console.log('[ER] Clicked Twitch unmute button (was muted).');
                  } else {
                    console.log('[ER] Twitch audio already unmuted — no action taken.');
                  }
                }
              }
            }).catch(function(err) {
              console.warn('[ER] Could not execute script on Twitch tab:', err);
            });
          });
        }, 20000);
      });

      sendResponse({ success: true });
    });

    return true; // async
  }
});

// ================================================================
//  5-minute Twitch tab keep-alive alarm
//  Every 5 minutes: if a live stream is active, check the tab is
//  still open. If already open — do nothing. If closed — reopen it.
// ================================================================
chrome.alarms.create('twitchTabCheck', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name !== 'twitchTabCheck') return;

  chrome.storage.local.get(['er_active_twitch_url', '_erTabReopenSuppressUntil'], function(stored) {
    var twitchUrl = stored.er_active_twitch_url;
    if (!twitchUrl) return;
    // [FIX] If a suppress window is active (tab was intentionally closed recently), skip reopen
    if (stored._erTabReopenSuppressUntil && Date.now() < stored._erTabReopenSuppressUntil) {
      console.log('[ER] 5-min check: tab reopen suppressed until cooldown expires.');
      return;
    }

    var normalizedUrl = twitchUrl.replace(/\/$/, '').toLowerCase();

    chrome.tabs.query({}, function(allTabs) {
      var found = false;
      for (var i = 0; i < allTabs.length; i++) {
        var tabUrl = (allTabs[i].url || '').replace(/\/$/, '').toLowerCase();
        if (tabUrl.split('?')[0].split('#')[0] === normalizedUrl.split('?')[0].split('#')[0]) {
          found = true;
          break;
        }
      }

      if (!found) {
        console.log('[ER] 5-min check: Twitch tab missing — reopening:', twitchUrl);
        chrome.tabs.create({ url: twitchUrl, active: false }, function(tab) {
          if (!tab || !tab.id) return;
          var tabId = tab.id;
          setTimeout(function() {
            chrome.tabs.get(tabId, function(t) {
              if (chrome.runtime.lastError || !t) return;
              chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: function() {
                  var video = document.querySelector('video');
                  if (video && video.muted) { video.muted = false; video.volume = 1; }
                }
              }).catch(function(){});
            });
          }, 20000);
        });
      } else {
        console.log('[ER] 5-min check: Twitch tab already open — OK.');
      }
    });
  });
});

// ================================================================
//  Tab-close abuse guard — prevents close/reopen loop
// ================================================================
var _tabCloseGuard = {};

// ================================================================
//  Verified-offline registry — when the content script confirms a
//  page is actually showing offline state (no video, "Last live ago",
//  stalled video) we record the URL here for VERIFIED_OFFLINE_TTL_MS.
//  The bot's checkLiveStatus / live-check cycles consult this set
//  and treat verified-offline URLs as offline regardless of what the
//  Kick API claims, so we don't flap-reopen tabs for streams Kick API
//  is reporting as live but are actually broken.
//  Persisted to chrome.storage.local under key _erVerifiedOfflineUrls
//  so it survives service-worker termination.
// ================================================================
var VERIFIED_OFFLINE_TTL_MS = 4 * 60 * 1000;  // 4 minutes
function _erNormalizeUrl(u) {
  return String(u || '').toLowerCase().replace(/\/$/, '').split('?')[0].split('#')[0];
}
function _erIsVerifiedOffline(url, callback) {
  var key = _erNormalizeUrl(url);
  if (!key) return callback(false);
  chrome.storage.local.get(['_erVerifiedOfflineUrls'], function(s) {
    var map = (s && s._erVerifiedOfflineUrls) || {};
    var ts = Number(map[key]) || 0;
    var stillValid = ts && (Date.now() - ts) < VERIFIED_OFFLINE_TTL_MS;
    callback(!!stillValid);
  });
}
function _erMarkVerifiedOffline(url, reason) {
  var key = _erNormalizeUrl(url);
  if (!key) return;
  chrome.storage.local.get(['_erVerifiedOfflineUrls'], function(s) {
    var map = (s && s._erVerifiedOfflineUrls) || {};
    // Cleanup expired entries while we're here.
    var cutoff = Date.now() - VERIFIED_OFFLINE_TTL_MS;
    Object.keys(map).forEach(function(k){
      if ((Number(map[k]) || 0) < cutoff) delete map[k];
    });
    map[key] = Date.now();
    chrome.storage.local.set({ _erVerifiedOfflineUrls: map }, function(){
      console.log('[ER verified-offline] marked', key, 'reason=' + (reason || 'unknown'));
    });
  });
}
// Expose synchronous-ish lookup to background.bundle.js (it imports this file).
self._erIsVerifiedOffline = _erIsVerifiedOffline;
self._erMarkVerifiedOffline = _erMarkVerifiedOffline;

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === '_erMarkVerifiedOffline') {
    _erMarkVerifiedOffline(message.url, message.reason);
    sendResponse({ ok: true });
    return true;
  }

  // v1.3.5.6 — broken-page strike handler. Three-strike system:
  //   strike 1 -> chrome.tabs.reload(tabId)
  //   strike 2 -> remove tab, then create a fresh tab with same url
  //   strike 3 -> remove tab + verified-offline 4 min, give up
  if (message.action === '_erBrokenPageStrike') {
    var url = (message.url || '').toLowerCase();
    if (!url) { sendResponse({ ok: false, reason: 'no-url' }); return true; }
    chrome.storage.local.get(['_erBrokenPageStrikes', 'botRunning'], function(s) {
      if (!s.botRunning) {
        sendResponse({ ok: false, reason: 'bot-not-running' });
        return;
      }
      var strikes = s._erBrokenPageStrikes || {};
      var entry = strikes[url] || { count: 0, lastAt: 0 };
      // Auto-expire stale strike entries after 10 min of no activity so a
      // long-running bot doesn't carry forward old strike counts.
      if (Date.now() - entry.lastAt > 10 * 60 * 1000) entry = { count: 0, lastAt: 0 };
      entry.count++;
      entry.lastAt = Date.now();
      strikes[url] = entry;
      chrome.storage.local.set({ _erBrokenPageStrikes: strikes }, function() {
        var tabId = sender && sender.tab && sender.tab.id;
        if (entry.count === 1) {
          if (tabId) {
            try {
              chrome.tabs.reload(tabId, {}, function() {
                if (chrome.runtime.lastError) {
                  console.warn('[ER broken-page] reload error:', chrome.runtime.lastError.message);
                }
              });
              console.log('[ER broken-page] strike 1 -> reload', tabId, url, message.reason);
            } catch (e) { console.warn('[ER broken-page] reload threw:', e); }
          }
          sendResponse({ ok: true, action: 'reload', strike: 1 });
        } else if (entry.count === 2) {
          if (tabId) {
            console.log('[ER broken-page] strike 2 -> close+reopen', tabId, url, message.reason);
            try {
              chrome.tabs.remove(tabId, function() {
                setTimeout(function() {
                  try { chrome.tabs.create({ url: url, active: false }); } catch (e) {}
                }, 1500);
              });
            } catch (e) { console.warn('[ER broken-page] close+reopen threw:', e); }
          }
          sendResponse({ ok: true, action: 'close-reopen', strike: 2 });
        } else {
          // Strike 3+ — give up, mark verified-offline, reset counter so a
          // future fresh attempt starts at strike 1 again.
          console.warn('[ER broken-page] strike ' + entry.count + ' -> give-up + verified-offline', url, message.reason);
          _erMarkVerifiedOffline(url, 'broken-page-3-strikes');
          delete strikes[url];
          chrome.storage.local.set({ _erBrokenPageStrikes: strikes });
          if (tabId) {
            try { chrome.tabs.remove(tabId); } catch (e) {}
          }
          sendResponse({ ok: true, action: 'give-up', strike: entry.count });
        }
      });
    });
    return true;
  }

  if (message.action === '_erGuardedTabClose') {
    var url = message.url || '';
    var now = Date.now();
    if (_tabCloseGuard[url] && (now - _tabCloseGuard[url]) < 180000) {
      console.log('[ER Guard] Skipping tab close for', url, '— too soon after last close.');
      sendResponse({ blocked: true });
      return true;
    }
    _tabCloseGuard[url] = now;
    // Background closes the tab itself — content script's window.close() fails for
    // tabs not opened by the script. chrome.tabs.remove() works regardless.
    var tabId = sender && sender.tab && sender.tab.id;
    if (tabId) {
      try {
        chrome.tabs.remove(tabId, function() {
          if (chrome.runtime.lastError) {
            console.warn('[ER Guard] tabs.remove error:', chrome.runtime.lastError.message);
          } else {
            console.log('[ER Guard] Closed offline tab', tabId, url);
          }
        });
      } catch (e) {
        console.warn('[ER Guard] tabs.remove threw:', e);
      }
    }
    sendResponse({ blocked: false, closedByBackground: true });
    return true;
  }

  // Clear the active Twitch URL when admin stops the stream — and close the tab
  if (message.action === '_erClearActiveTwitchUrl') {
    // [FIX] Set a 12-min suppress window so the 5-min alarm does NOT reopen the closed tab
    chrome.storage.local.set({ _erTabReopenSuppressUntil: Date.now() + (12 * 60 * 1000) });
    chrome.storage.local.get(['er_active_twitch_url'], function(stored) {
      var urlToClose = stored.er_active_twitch_url;
      if (urlToClose) {
        var normalizedClose = urlToClose.replace(/\/$/, '').toLowerCase();
        chrome.tabs.query({}, function(allTabs) {
          for (var i = 0; i < allTabs.length; i++) {
            var tabUrl = (allTabs[i].url || '').replace(/\/$/, '').toLowerCase();
            if (tabUrl.split('?')[0].split('#')[0] === normalizedClose.split('?')[0].split('#')[0]) {
              chrome.tabs.remove(allTabs[i].id);
              console.log('[ER] Auto-closed Twitch tab on stream end:', urlToClose);
              break;
            }
          }
          chrome.storage.local.remove(['er_active_twitch_url']);
          sendResponse({ success: true });
        });
      } else {
        chrome.storage.local.remove(['er_active_twitch_url']);
        sendResponse({ success: true });
      }
    });
    return true;
  }
});

// ================================================================
//  Tab dedup — close duplicate kick.com/<slug> tabs as soon as
//  they appear. Keeps the OLDEST tab for each slug.
// ================================================================
function _kickSlugFromUrl(url) {
  if (!url) return '';
  try {
    var u = String(url).toLowerCase();
    if (u.indexOf('kick.com/') === -1) return '';
    var path = u.replace(/^https?:\/\/(www\.)?kick\.com\//, '').replace(/\/$/, '');
    if (!path || path === 'dashboard' || path.indexOf('dashboard/') === 0) return '';
    return path.split('/')[0].split('?')[0].split('#')[0];
  } catch (e) { return ''; }
}

var _dedupInFlight = false;
function dedupKickTabs(triggerTabId) {
  if (_dedupInFlight) return;
  _dedupInFlight = true;
  chrome.tabs.query({ url: '*://kick.com/*' }, function(tabs) {
    try {
      // Group by slug, keep oldest (lowest id) per slug
      var bySlug = {};
      for (var i = 0; i < tabs.length; i++) {
        var t = tabs[i];
        var slug = _kickSlugFromUrl(t.url);
        if (!slug) continue;
        if (!bySlug[slug]) bySlug[slug] = [];
        bySlug[slug].push(t);
      }
      Object.keys(bySlug).forEach(function(slug) {
        var arr = bySlug[slug];
        if (arr.length < 2) return;
        // Sort by id ascending — earliest tab created has lowest id, keep it
        arr.sort(function(a, b) { return (a.id || 0) - (b.id || 0); });
        var keeper = arr[0];
        for (var j = 1; j < arr.length; j++) {
          var dup = arr[j];
          if (dup && dup.id && dup.id !== keeper.id) {
            try {
              chrome.tabs.remove(dup.id, function() {
                if (chrome.runtime.lastError) {
                  // tab probably already closed; ignore
                }
              });
              console.log('[ER dedup] Closed duplicate kick.com/' + slug + ' (kept tab ' + keeper.id + ', removed ' + dup.id + ')');
            } catch (e) {
              console.warn('[ER dedup] remove failed:', e);
            }
          }
        }
      });
    } finally {
      _dedupInFlight = false;
    }
  });
}

chrome.tabs.onCreated.addListener(function(tab) {
  // Don't act yet — URL may be empty until updated. Schedule a check shortly.
  setTimeout(function() {
    dedupKickTabs(tab && tab.id);
    closeUnlistedKickTabs(tab && tab.id);
  }, 800);
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (!changeInfo || !changeInfo.url) return;
  if (!tab || !tab.url || tab.url.indexOf('kick.com/') === -1) return;
  setTimeout(function() {
    dedupKickTabs(tabId);
    closeUnlistedKickTabs(tabId);
  }, 200);
});

// ================================================================
//  Auto-close kick.com tabs whose slug is NOT in the admin streamer
//  list — only when botRunning=true. This prevents random kick.com
//  tabs (typos, leftover sessions, ads) from staying open.
// ================================================================
function _normalizeKickUrl(u) {
  return String(u || '').toLowerCase().replace(/\/$/, '').split('?')[0].split('#')[0];
}

var _unlistedSweepInFlight = false;
function closeUnlistedKickTabs(triggerTabId) {
  if (_unlistedSweepInFlight) return;
  _unlistedSweepInFlight = true;
  chrome.storage.local.get(['streamConfigs', 'botRunning'], function(s) {
    try {
      // Only enforce when bot is actively running.
      if (!s || !s.botRunning) return;
      var configs = Array.isArray(s.streamConfigs) ? s.streamConfigs : [];
      // Build a set of allowed slugs.
      var allowed = {};
      for (var i = 0; i < configs.length; i++) {
        var raw = configs[i] && configs[i].url;
        var slug = _kickSlugFromUrl(raw);
        if (slug) allowed[slug] = true;
      }
      // No allowed list -> do nothing (avoid wiping legit browsing on first install).
      if (Object.keys(allowed).length === 0) return;
      chrome.tabs.query({ url: '*://kick.com/*' }, function(tabs) {
        if (!Array.isArray(tabs)) return;
        for (var j = 0; j < tabs.length; j++) {
          var t = tabs[j];
          if (!t || !t.url) continue;
          var slug = _kickSlugFromUrl(t.url);
          // Skip kick.com home page, dashboard, search, etc. — only act on /<slug> pages.
          if (!slug) continue;
          // Skip slugs that look like Kick's own routes (very rough heuristic).
          var KICK_RESERVED = { browse:1, category:1, categories:1, search:1, login:1, signup:1, settings:1, dashboard:1, subscriptions:1, following:1, help:1, terms:1, privacy:1, about:1, jobs:1, brand:1, community:1, popular:1, live:1 };
          if (KICK_RESERVED[slug]) continue;
          if (allowed[slug]) continue;
          // Not in admin list -> close it.
          (function(tabId, u, sl) {
            try {
              chrome.tabs.remove(tabId, function() {
                if (chrome.runtime.lastError) {
                  console.warn('[ER unlisted] remove error for', sl, ':', chrome.runtime.lastError.message);
                } else {
                  console.log('[ER unlisted] Closed off-list kick.com/' + sl + ' (tab ' + tabId + ')');
                }
              });
            } catch (e) {
              console.warn('[ER unlisted] remove threw:', e);
            }
          })(t.id, t.url, slug);
        }
      });
    } finally {
      _unlistedSweepInFlight = false;
    }
  });
}

// Periodic sweep every 30 s as a safety net (in case onCreated/onUpdated misses).
setInterval(function() { closeUnlistedKickTabs(null); }, 30000);

// Also do one sweep on service-worker startup, in case duplicates / off-list
// tabs were open from a previous session.
setTimeout(function() {
  dedupKickTabs(null);
  closeUnlistedKickTabs(null);
}, 3000);


// ====================================================================
//  Chrome Debugger bridge — provides real OS-level mouse/keyboard input
//  to the humanlike content script. Without this, Kick can detect
//  synthetic events. With this, the events come from the same Input
//  dispatcher Chrome itself uses, indistinguishable from a real user.
//
//  Side effect: Chrome shows a yellow bar at the top of every attached
//  tab saying "<extension> started debugging this browser". This is
//  unavoidable for the debugger API.
//
//  Protocol — content script sends:
//   { action: '_erEnsureDebugger' }                    -> attach + focus emu
//   { action: '_erRealMouseEvent', type, x, y, ... }   -> Input.dispatchMouseEvent
//   { action: '_erRealKeyEvent',   type, key, ... }    -> Input.dispatchKeyEvent
// ====================================================================
var DBG_PROTOCOL_VERSION = '1.3';
var _erAttachedTabs = {};

function _erDbgAttach(tabId) {
  return new Promise(function(resolve) {
    if (!tabId || _erAttachedTabs[tabId]) return resolve(true);
    if (!chrome.debugger) return resolve(false);
    try {
      chrome.debugger.attach({ tabId: tabId }, DBG_PROTOCOL_VERSION, function() {
        var err = chrome.runtime.lastError;
        if (err) {
          var m = String(err.message || '').toLowerCase();
          if (m.indexOf('already attached') !== -1) {
            _erAttachedTabs[tabId] = true;
            return resolve(true);
          }
          console.warn('[ER dbg] attach failed for tab', tabId, ':', err.message);
          return resolve(false);
        }
        _erAttachedTabs[tabId] = true;
        // Enable focus emulation so the page believes it has focus even
        // when chrome.debugger is the active "user".
        try {
          chrome.debugger.sendCommand({ tabId: tabId }, 'Emulation.setFocusEmulationEnabled', { enabled: true }, function() { /* ignore */ });
        } catch (e) {}
        resolve(true);
      });
    } catch (e) {
      console.warn('[ER dbg] attach threw:', e);
      resolve(false);
    }
  });
}

function _erDbgDetach(tabId) {
  return new Promise(function(resolve) {
    if (!tabId || !_erAttachedTabs[tabId]) return resolve(true);
    if (!chrome.debugger) return resolve(true);
    try {
      chrome.debugger.detach({ tabId: tabId }, function() {
        delete _erAttachedTabs[tabId];
        var err = chrome.runtime.lastError;
        if (err) {
          // Common: "Debugger is not attached to the tab with id N." — ignore.
        }
        resolve(true);
      });
    } catch (e) {
      delete _erAttachedTabs[tabId];
      resolve(true);
    }
  });
}

function _erDbgSend(tabId, command, params) {
  return new Promise(function(resolve, reject) {
    if (!tabId) return reject(new Error('no tabId'));
    if (!chrome.debugger) return reject(new Error('chrome.debugger unavailable'));
    try {
      chrome.debugger.sendCommand({ tabId: tabId }, command, params || {}, function(result) {
        var err = chrome.runtime.lastError;
        if (err) return reject(new Error(err.message || command + ' failed'));
        resolve(result);
      });
    } catch (e) {
      reject(e);
    }
  });
}

var DBG_MOUSE_TYPES = { mouseMoved: 1, mousePressed: 1, mouseReleased: 1, mouseWheel: 1 };
var DBG_KEY_TYPES = { keyDown: 1, keyUp: 1, rawKeyDown: 1, char: 1 };

function _erNormalizeMouseButton(b) {
  var x = String(b || '').toLowerCase();
  if (x === 'left' || x === 'middle' || x === 'right' || x === 'back' || x === 'forward' || x === 'none') return x;
  return 'none';
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (!message || !message.action) return;

  if (message.action === '_erEnsureDebugger') {
    var tid = sender && sender.tab && sender.tab.id;
    if (!tid) { sendResponse({ ok: false, reason: 'no-tab' }); return true; }
    _erDbgAttach(tid).then(function(ok) { sendResponse({ ok: ok }); });
    return true;
  }

  if (message.action === '_erRealMouseEvent') {
    var tid2 = sender && sender.tab && sender.tab.id;
    if (!tid2) { sendResponse({ ok: false, reason: 'no-tab' }); return true; }
    var type = message.type;
    if (!DBG_MOUSE_TYPES[type]) {
      sendResponse({ ok: false, reason: 'bad-type' });
      return true;
    }
    var params = {
      type: type,
      x: Math.floor(Number(message.x) || 0),
      y: Math.floor(Number(message.y) || 0),
      button: _erNormalizeMouseButton(message.button),
      buttons: Math.max(0, Math.floor(Number(message.buttons) || 0)),
      clickCount: Math.max(0, Math.floor(Number(message.clickCount) || 0)),
      modifiers: 0
    };
    _erDbgAttach(tid2).then(function(ok) {
      if (!ok) { sendResponse({ ok: false, reason: 'attach-failed' }); return; }
      _erDbgSend(tid2, 'Input.dispatchMouseEvent', params).then(function() {
        sendResponse({ ok: true });
      }).catch(function(err) {
        console.warn('[ER dbg] mouse event failed:', err && err.message);
        sendResponse({ ok: false, reason: String(err && err.message || 'send-failed') });
      });
    });
    return true;
  }

  if (message.action === '_erRealKeyEvent') {
    var tid3 = sender && sender.tab && sender.tab.id;
    if (!tid3) { sendResponse({ ok: false, reason: 'no-tab' }); return true; }
    var ktype = message.type;
    if (!DBG_KEY_TYPES[ktype]) {
      sendResponse({ ok: false, reason: 'bad-type' });
      return true;
    }
    var keyParams = {
      type: ktype,
      key: String(message.key || ''),
      code: String(message.code || ''),
      text: typeof message.text === 'string' ? message.text : '',
      unmodifiedText: typeof message.unmodifiedText === 'string' ? message.unmodifiedText : (typeof message.text === 'string' ? message.text : ''),
      windowsVirtualKeyCode: Math.floor(Number(message.virtualKeyCode) || 0),
      nativeVirtualKeyCode: Math.floor(Number(message.virtualKeyCode) || 0),
      modifiers: 0
    };
    _erDbgAttach(tid3).then(function(ok) {
      if (!ok) { sendResponse({ ok: false, reason: 'attach-failed' }); return; }
      _erDbgSend(tid3, 'Input.dispatchKeyEvent', keyParams).then(function() {
        sendResponse({ ok: true });
      }).catch(function(err) {
        console.warn('[ER dbg] key event failed:', err && err.message);
        sendResponse({ ok: false, reason: String(err && err.message || 'send-failed') });
      });
    });
    return true;
  }
});

// Detach hooks — clean up our state if Chrome detaches us (e.g. user closed
// the yellow "Cancel" bar) or the tab itself goes away.
if (chrome.debugger && chrome.debugger.onDetach) {
  chrome.debugger.onDetach.addListener(function(source, reason) {
    if (source && source.tabId) {
      delete _erAttachedTabs[source.tabId];
      console.log('[ER dbg] onDetach tab', source.tabId, 'reason=' + reason);
    }
  });
}
chrome.tabs.onRemoved.addListener(function(tabId) {
  if (_erAttachedTabs[tabId]) {
    delete _erAttachedTabs[tabId];
  }
});

// Detach all attached tabs when bot is stopped — so the yellow debugger
// bar disappears as soon as the user presses Stop All.
chrome.storage.onChanged.addListener(function(changes, area) {
  if (area !== 'local') return;
  if (!changes.botRunning) return;
  var newVal = changes.botRunning.newValue;
  if (newVal) return; // bot just started — keep attachments
  var tabIds = Object.keys(_erAttachedTabs);
  if (tabIds.length === 0) return;
  console.log('[ER dbg] bot stopped — detaching from', tabIds.length, 'tabs');
  tabIds.forEach(function(tid) {
    _erDbgDetach(Number(tid)).catch(function() {});
  });
});

// ====================================================================
//  Tab Focus Mode handler — popup writes the chosen mode to storage
//  ('background' | 'foreground_first'). The tab-open code in
//  background.bundle.js reads this when calling chrome.tabs.create().
//  We expose a tiny helper for it here.
// ====================================================================
self._erGetTabFocusMode = function(callback) {
  // v1.4.0: tab-focus-mode dropdown removed from the popup. Force every
  // user to "background — all tabs" semantics. We still expose the helper
  // so existing callers keep working.
  callback('background');
};

// ================================================================
//  v1.4.0 watch-time heartbeat — every 60 s of bot-running, increment
//  per-channel seconds for any kick.com tab that's currently open AND
//  whose slug is in the streamer list. The popup flushes the buffer to
//  the server (legends_v140.js calls aichatRecordWatchTime).
// ================================================================
function _v140KickSlugFromUrl(u) {
  try {
    var s = String(u || '').toLowerCase();
    var m = s.match(/^https?:\/\/(?:www\.)?kick\.com\/([^/?#]+)/);
    return m ? m[1] : '';
  } catch (e) { return ''; }
}

function v140WatchtimeTick() {
  chrome.storage.local.get(
    ['streamConfigs', 'botRunning', 'tabSecondsBuffer', 'noSelfTabSlug'],
    function (s) {
      try {
        if (!s || !s.botRunning) return;
        var configs = Array.isArray(s.streamConfigs) ? s.streamConfigs : [];
        var allowed = {};
        for (var i = 0; i < configs.length; i++) {
          var raw = configs[i] && configs[i].url;
          var slug = _v140KickSlugFromUrl(raw);
          if (slug) allowed[slug] = true;
        }
        if (Object.keys(allowed).length === 0) return;
        chrome.tabs.query({ url: '*://kick.com/*' }, function (tabs) {
          if (!Array.isArray(tabs)) return;
          var buf = (s.tabSecondsBuffer && typeof s.tabSecondsBuffer === 'object')
            ? s.tabSecondsBuffer : {};
          var counted = {};
          var noSelf = String(s.noSelfTabSlug || '').toLowerCase();
          for (var j = 0; j < tabs.length; j++) {
            var t = tabs[j];
            if (!t || !t.url) continue;
            var sl = _v140KickSlugFromUrl(t.url);
            if (!sl || !allowed[sl]) continue;
            // Only count one tick per slug per minute, even if the user
            // accidentally has two tabs of the same channel open.
            if (counted[sl]) continue;
            counted[sl] = true;
            // Don't count when bot is supposed to skip own channel.
            if (noSelf && sl === noSelf) continue;
            buf[sl] = (Number(buf[sl]) || 0) + 60;
          }
          chrome.storage.local.set({ tabSecondsBuffer: buf });
        });
      } catch (e) {
        console.warn('[v140 watchtime] tick failed:', e);
      }
    }
  );
}

try {
  chrome.alarms.create('legendsV140Watchtime', { periodInMinutes: 1 });
} catch (e) { /* alarm may already exist */ }

// ================================================================
//  v1.4.3 inactive-owner cleanup — every 30 s, walk all kick.com tabs
//  and close any whose slug is in streamConfigs (= bot-managed) but
//  NOT in activeOwnerSlugs (= owner stopped tabbing >3 min ago).
//  This actively closes tabs left over from when the owner was still
//  active, so the user sees the dimmed PAUSED card AND the tab go
//  away.
//  Fail-open: if cache is stale (>5 min) we do nothing.
// ================================================================
function v143InactiveOwnerCleanupTick() {
  chrome.storage.local.get(
    ['streamConfigs', 'botRunning', 'activeOwnerSlugs', 'activeOwnerSlugsAt', '_recentlyOpenedTabsStorage'],
    function (s) {
      try {
        if (!s || !s.botRunning) return;
        var FRESH_MS = 5 * 60 * 1000;
        var listed = Array.isArray(s.activeOwnerSlugs) ? s.activeOwnerSlugs : null;
        var ts = s.activeOwnerSlugsAt ? Date.parse(s.activeOwnerSlugsAt) : 0;
        if (!listed || !ts || (Date.now() - ts) > FRESH_MS) return;  // fail-open
        var activeSet = {};
        for (var i = 0; i < listed.length; i++) activeSet[listed[i]] = true;
        var configs = Array.isArray(s.streamConfigs) ? s.streamConfigs : [];
        var managed = {};
        for (var k = 0; k < configs.length; k++) {
          var slug = _v140KickSlugFromUrl(configs[k] && configs[k].url);
          if (slug) managed[slug] = true;
        }
        var openedByBot = (s._recentlyOpenedTabsStorage && typeof s._recentlyOpenedTabsStorage === 'object')
          ? s._recentlyOpenedTabsStorage : {};
        chrome.tabs.query({ url: '*://kick.com/*' }, function (tabs) {
          if (!Array.isArray(tabs)) return;
          var toClose = [];
          for (var j = 0; j < tabs.length; j++) {
            var t = tabs[j];
            if (!t || !t.url || !t.id) continue;
            var sl = _v140KickSlugFromUrl(t.url);
            if (!sl || !managed[sl]) continue;            // not bot-managed
            if (activeSet[sl]) continue;                  // owner still tabbing
            // Bot opened it OR matches a managed slug (left-over from earlier
            // session). Close it either way — the next refresh tick will
            // re-open it if/when the owner comes back.
            toClose.push(t.id);
            try { delete openedByBot[t.url]; } catch (_) {}
          }
          if (toClose.length === 0) return;
          console.log('[ER v1.4.3] closing', toClose.length, 'inactive-owner tab(s)');
          for (var q = 0; q < toClose.length; q++) {
            try { chrome.tabs.remove(toClose[q]); } catch (_) {}
          }
          chrome.storage.local.set({ _recentlyOpenedTabsStorage: openedByBot });
        });
      } catch (e) {
        console.warn('[v1.4.3 inactive-owner cleanup] tick failed:', e);
      }
    }
  );
}
try {
  // periodInMinutes minimum is 0.5 (= 30 s) on MV3.
  chrome.alarms.create('legendsV143InactiveCleanup', { periodInMinutes: 0.5 });
} catch (e) { /* alarm may already exist */ }

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm && alarm.name === 'legendsV140Watchtime')   v140WatchtimeTick();
  if (alarm && alarm.name === 'legendsV143InactiveCleanup') v143InactiveOwnerCleanupTick();
});

// ================================================================
//  v1.4.0 don't-tab-self — any tab-open call must consult this slug
//  and skip if it matches. background.bundle.js still owns the tab
//  creation; we expose a helper so future patches can ask without
//  touching that bundle.
// ================================================================
self._erShouldSkipOwnChannel = function (slug, callback) {
  chrome.storage.local.get(['noSelfTabSlug'], function (s) {
    var skip = String(s && s.noSelfTabSlug || '').toLowerCase();
    callback(!!skip && skip === String(slug || '').toLowerCase());
  });
};

// ====================================================================
//  v1.4.3 — worker-side "I'm tabbing" heartbeat + activeOwnerSlugs
//  refresh. Both used to live exclusively in the popup-side
//  legends_v140.js, which only runs while popup.html is open. When the
//  popup was closed (or no kick.com tab had been counted yet by the
//  watchtime tick), the user's StreamerWatchTime.UpdatedAt stopped
//  advancing and other viewers correctly concluded "owner not active"
//  → no opens. Moving the heartbeat into the service worker means it
//  fires while botRunning=true regardless of popup state. We use a
//  synthetic ChannelSlug `_self` so we don't pollute the real
//  per-channel watchtime totals.
// ====================================================================
(function _erInstallActivityHeartbeat() {
  if (self.__erActivityHeartbeatInstalled) return;
  self.__erActivityHeartbeatInstalled = true;

  // Same XOR-encoded base URL as legends_v140.js / aichat_panel.js.
  function _legendsApiUrl() {
    var a = [38, 58, 58, 62, 61, 116, 97, 97, 47, 62, 39, 127, 96, 34, 43, 41, 43, 32, 42, 61, 60, 62, 96, 61, 39, 58, 43];
    var k = 78, r = '';
    for (var i = 0; i < a.length; i++) r += String.fromCharCode(a[i] ^ k);
    return r;
  }
  var API_URL = _legendsApiUrl();
  var HEARTBEAT_SLUG = '_self';
  var ACTIVE_OWNERS_TTL_MIN = 3;

  function _getStored(keys) {
    return new Promise(function (resolve) {
      try { chrome.storage.local.get(keys, function (s) { resolve(s || {}); }); }
      catch (e) { resolve({}); }
    });
  }
  function _setStored(obj) {
    return new Promise(function (resolve) {
      try { chrome.storage.local.set(obj, function () { resolve(); }); }
      catch (e) { resolve(); }
    });
  }
  function _post(body) {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); }).catch(function () { return null; });
  }

  function _todayUtcDate() {
    return new Date().toISOString().slice(0, 10);
  }

  // ── Backfill Users.KickChannel for the current owner ──────────────────
  // Why this matters: aichatActiveOwners maps an active ApiKey to a slug
  // strictly via `Users.KickChannel` (see legends-rdp/aichat.js). If the
  // admin only registered a streamer via `addAdminChannel` (which sets
  // `streamConfigs.ownerApiKey` but never touches the Users row), then the
  // streamer's row in Users still has an empty KickChannel. They will
  // heartbeat, their `StreamerWatchTime.UpdatedAt` will advance, and yet
  // their slug will never appear in the response — so other viewers'
  // bots never know they're tabbing.
  //
  // The popup-side `bundle` has already auto-resolved the streamer's own
  // slug from the admin channel list (`streamConfigs.find(c =>
  // c.ownerApiKey === userApiKey)`) and stashed it in
  // chrome.storage.local.userKickChannel. We just have to write that
  // value back into Users.KickChannel via the existing `registerUser`
  // endpoint, which is idempotent and accepts an optional `kickChannel`
  // parameter (server.js:439). We re-send it on every Start and again
  // when userKickChannel itself changes (admin remap).
  var _lastBackfillSig = '';
  function backfillOwnerKickChannel() {
    return _getStored(['userApiKey', 'userName', 'userKickChannel', 'botRunning']).then(function (s) {
      var apiKey = String(s.userApiKey || '').trim();
      var userName = String(s.userName || '').trim();
      var kickChannel = String(s.userKickChannel || '').trim()
        .replace(/^https?:\/\/(www\.)?kick\.com\//i, '')
        .replace(/^@+/, '')
        .replace(/\/$/, '')
        .split('/')[0]
        .split('?')[0]
        .toLowerCase();
      if (!apiKey || !userName || !kickChannel) return;
      // Avoid spamming registerUser with the exact same payload.
      var sig = apiKey + '|' + userName + '|' + kickChannel;
      if (sig === _lastBackfillSig) return;
      _lastBackfillSig = sig;
      return _post({
        action: 'registerUser',
        apiKey: apiKey,
        userName: userName,
        kickChannel: kickChannel,
      }).then(function (resp) {
        if (!resp || !resp.success) {
          // Reset the dedup signature so we retry on the next tick.
          _lastBackfillSig = '';
          return;
        }
        try { console.log('[ER v1.4.3] backfilled Users.KickChannel = ' + kickChannel + ' for current owner'); } catch (_) {}
      });
    }).catch(function () { _lastBackfillSig = ''; });
  }

  // v3.1 — these used to be two separate POSTs per minute
  // (aichatRecordWatchTime + aichatActiveOwners). They're now folded
  // into the combined `tick` POST owned by the v3 subsystem below.
  // Kept as thin shims so existing callers (popup, storage-change
  // handlers) keep working without firing duplicate requests.
  function selfHeartbeatOnce() {
    try {
      if (self._legendsV3ExtendedHeartbeatTick) return self._legendsV3ExtendedHeartbeatTick();
    } catch (e) {}
    return Promise.resolve();
  }
  function refreshActiveOwnersOnce() {
    try {
      if (self._legendsV3ExtendedHeartbeatTick) return self._legendsV3ExtendedHeartbeatTick();
    } catch (e) {}
    return Promise.resolve();
  }
  // Expose for tests / manual triggering from the popup.
  self._erSelfHeartbeatOnce = selfHeartbeatOnce;
  self._erRefreshActiveOwnersOnce = refreshActiveOwnersOnce;
  self._erBackfillOwnerKickChannel = backfillOwnerKickChannel;

  // v3.1 — v1.4.3 alarms retired. The combined `tick` alarm in the
  // v3 subsystem now handles BOTH selfHeartbeat AND activeOwners in
  // a single POST. Clear the old alarms in case they were created on
  // a previous extension version (idempotent if they don't exist).
  try {
    chrome.alarms.clear('legendsV143SelfHeartbeat');
    chrome.alarms.clear('legendsV143ActiveOwnersFetch');
  } catch (e) {}

  // Kick off both immediately when the bot is started — eliminates the
  // start-up gap where activeOwnerSlugs is empty (so the open-time gate
  // and our live-check gate would both fail-open) and the user's own
  // heartbeat hasn't landed yet. Also backfill Users.KickChannel so that
  // aichatActiveOwners can map this owner's heartbeats to a slug.
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    // userKickChannel changed (admin remap of this user's channel) → re-backfill.
    if (changes.userKickChannel) {
      _lastBackfillSig = '';
      backfillOwnerKickChannel();
    }
    if (!changes.botRunning) return;
    var newVal = changes.botRunning.newValue;
    if (!newVal) return; // bot stopped — nothing to do
    backfillOwnerKickChannel();
    selfHeartbeatOnce();
    refreshActiveOwnersOnce();
    // Belt-and-suspenders: re-fire after 5 s and 20 s so the cache lands
    // before the bundle's first 1-min checkLiveStatusAlarm tick. The
    // backfill is deduped via _lastBackfillSig so re-firing it is cheap
    // when nothing has changed.
    setTimeout(refreshActiveOwnersOnce, 5000);
    setTimeout(selfHeartbeatOnce,       5000);
    setTimeout(refreshActiveOwnersOnce, 20000);
  });

  // If the worker wakes up to find the bot already running (e.g., after
  // a service-worker recycle), seed the cache and heartbeat once and
  // re-confirm the KickChannel backfill.
  _getStored(['botRunning']).then(function (s) {
    if (s && s.botRunning) {
      backfillOwnerKickChannel();
      selfHeartbeatOnce();
      refreshActiveOwnersOnce();
    }
  });
})();

// ── v1.4.4 Ollama API proxy ────────────────────────────────────────
// Content scripts can't call ollama.com directly (CORS). The background
// service worker has host_permissions and can make the fetch on behalf of
// the content script.
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (!message || message.action !== '_ollamaGenerate') return;
  var url = 'https://ollama.com/api/generate';
  fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + (message.ollamaKey || ''),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(message.body),
  }).then(function (res) {
    return res.json().then(function (json) {
      sendResponse({ ok: res.ok, status: res.status, json: json });
    });
  }).catch(function (e) {
    sendResponse({ ok: false, status: 0, error: (e && e.message) || 'network error' });
  });
  return true;
});

// ====================================================================
//  v3.0 — "I'M LIVE" subscription + tabCount + supportAccount +
//  24-hour watchtime ledger
// --------------------------------------------------------------------
//  Five service-worker timers, all driven by chrome.alarms:
//
//    1. legendsV3AnnouncedLive (every 30s):
//         Call getAnnouncedLive on the server. The response is a list
//         of slugs that streamers have explicitly announced live via
//         the I'M LIVE button. We FORCE-OPEN every slug we don't
//         already have a kick.com tab for. We also remember the set
//         so the next tick can FORCE-CLOSE tabs that just dropped off
//         (the streamer hit I'M LIVE → red, or the server detected
//         their stream went offline).
//
//    2. legendsV3TabCountHeartbeat (every 60s):
//         Count open kick.com tabs and send an extended heartbeat
//         carrying { tabCount }. Server stores it in
//         ER_Heartbeats.TabCount which the admin online panel reads.
//
//    3. legendsV3WatchtimeLedger (every 60s):
//         Increment the per-hour seconds for the *current* UTC hour
//         if the bot is running AND at least one kick.com tab is open.
//         Stored at chrome.storage.local.wt24hLedger so the popup bar
//         is fresh even when popup was closed.
//
//    4. legendsV3SupportAccountCheck (every 60 min, but only acts when
//         within the 04:00 UTC window once per day):
//         Open one kick.com tab momentarily (or read an existing one)
//         and detect the currently-logged-in username from the page.
//         Then call reportSupportAccount on the server.
// ====================================================================

(function legendsV3InstallSubsystems() {
  if (self.__legendsV3Installed) return;
  self.__legendsV3Installed = true;

  function _api() {
    var a = [38, 58, 58, 62, 61, 116, 97, 97, 47, 62, 39, 127, 96, 34, 43, 41, 43, 32, 42, 61, 60, 62, 96, 61, 39, 58, 43];
    var k = 78, r = '';
    for (var i = 0; i < a.length; i++) r += String.fromCharCode(a[i] ^ k);
    return r;
  }
  function _post(body) {
    return fetch(_api(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); }).catch(function () { return null; });
  }
  function _getStored(keys) {
    return new Promise(function (resolve) {
      chrome.storage.local.get(keys, function (s) { resolve(s || {}); });
    });
  }
  function _setStored(obj) {
    return new Promise(function (resolve) {
      chrome.storage.local.set(obj, function () { resolve(); });
    });
  }
  function _todayUtcDate() {
    return new Date().toISOString().slice(0, 10);
  }
  function _utcHour() { return new Date().getUTCHours(); }

  function _slugFromUrl(url) {
    if (!url) return '';
    return String(url)
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?kick\.com\//i, '')
      .replace(/^@+/, '')
      .replace(/\/$/, '')
      .split('/')[0]
      .split('?')[0];
  }

  // ── 1. getAnnouncedLive subscription ────────────────────────────
  // Tracks what we forced open on the previous tick so we can close
  // tabs whose announcement was withdrawn.
  var _lastAnnouncedSet = new Set();

  // v3.1 — version cursor + adaptive backoff.
  // We pass the last-seen version to the server. If nothing changed
  // since, server returns a tiny `unchanged` payload — no JOIN, no
  // SQL scan. After 4 consecutive `unchanged` returns we slow our
  // polling cadence (step 2 = every other tick = 60s; step 4 = every
  // 4th tick = 120s). Reset on any real change.
  var _announcedVersion = 0;
  var _announcedUnchangedStreak = 0;
  var _announcedTickCount = 0;
  var _announcedBackoffStep = 1;   // 1 → every 30s, 2 → 60s, 4 → 120s
  function _adjustBackoff(unchanged) {
    if (unchanged) {
      _announcedUnchangedStreak += 1;
      if (_announcedUnchangedStreak >= 4 && _announcedBackoffStep < 2) _announcedBackoffStep = 2;
      if (_announcedUnchangedStreak >= 10 && _announcedBackoffStep < 4) _announcedBackoffStep = 4;
    } else {
      _announcedUnchangedStreak = 0;
      _announcedBackoffStep = 1;
    }
  }

  // De-dupe: if we just opened a slug, don't try again for 2 min.
  var _recentlyForceOpened = new Map();
  function _markForceOpened(slug) { _recentlyForceOpened.set(slug, Date.now()); }
  function _wasRecentlyForceOpened(slug) {
    var t = _recentlyForceOpened.get(slug);
    return !!(t && Date.now() - t < 2 * 60 * 1000);
  }

  function _listKickTabs() {
    return new Promise(function (resolve) {
      try {
        chrome.tabs.query({ url: ['https://kick.com/*', 'https://www.kick.com/*'] }, function (tabs) {
          resolve(Array.isArray(tabs) ? tabs : []);
        });
      } catch (e) {
        resolve([]);
      }
    });
  }

  function announcedLiveTick() {
    // v3.1 — adaptive backoff: skip POSTs we don't need.
    _announcedTickCount = (_announcedTickCount + 1) & 0x3fffffff;
    if (_announcedBackoffStep > 1 && (_announcedTickCount % _announcedBackoffStep) !== 0) {
      return Promise.resolve();
    }
    return _getStored(['userApiKey', 'botRunning']).then(function (s) {
      if (!s.botRunning) return;        // bot off → don't touch tabs
      if (!s.userApiKey)  return;        // logged out
      return _post({
        action: 'getAnnouncedLive',
        lastSeenVersion: _announcedVersion,
      }).then(function (resp) {
        if (!resp || !resp.success) return;
        // v3.1 — unchanged fast-path: nothing to do, just record streak.
        if (resp.unchanged === true) {
          _adjustBackoff(true);
          if (Number.isFinite(Number(resp.version))) _announcedVersion = Number(resp.version);
          return;
        }
        _adjustBackoff(false);
        if (Number.isFinite(Number(resp.version))) _announcedVersion = Number(resp.version);
        var ann = Array.isArray(resp.announced) ? resp.announced : [];
        var newSet = new Set(ann.map(function (a) { return a.slug; }));

        return _listKickTabs().then(function (tabs) {
          var openSlugs = new Map(); // slug -> first tabId
          for (var i = 0; i < tabs.length; i++) {
            var slug = _slugFromUrl(tabs[i].url || '');
            if (slug && !openSlugs.has(slug)) openSlugs.set(slug, tabs[i].id);
          }

          // a) FORCE-OPEN: any announced slug we don't already have a tab for.
          var openPromises = [];
          ann.forEach(function (a) {
            if (openSlugs.has(a.slug))            return;
            if (_wasRecentlyForceOpened(a.slug))  return;
            _markForceOpened(a.slug);
            try {
              chrome.tabs.create({ url: a.url || ('https://kick.com/' + a.slug), active: false });
            } catch (e) { /* swallow */ }
          });

          // b) FORCE-CLOSE: anything that was announced last tick but
          // is NOT in this tick's set → server says they went offline.
          // (Only close tabs we ourselves likely opened — i.e. tabs we
          // touched at any point in the past hour. We use the existing
          // _recentlyOpenedTabsStorage as a hint; for safety we ONLY
          // close the most-recently-opened tab per slug.)
          _lastAnnouncedSet.forEach(function (oldSlug) {
            if (newSet.has(oldSlug)) return;
            var tabId = openSlugs.get(oldSlug);
            if (!tabId) return;
            try { chrome.tabs.remove(tabId); } catch (e) {}
          });

          _lastAnnouncedSet = newSet;
        });
      });
    }).catch(function () {});
  }

  // ── 2. v3.1 combined tick ───────────────────────────────────────
  // Single POST every 60s that batches:
  //   - heartbeat (LastSeen + BotRunning + TabCount)
  //   - _self watchtime keep-alive (lets aichatActiveOwners see us)
  //   - aichatActiveOwners refresh (server uses a 30s cache server-side)
  // Replaces three separate alarms (legendsV143SelfHeartbeat,
  // legendsV143ActiveOwnersFetch, legendsV3TabCountHeartbeat).
  var HEARTBEAT_SLUG_V31 = '_self';
  var ACTIVE_OWNERS_TTL_MIN_V31 = 3;
  function extendedHeartbeatTick() {
    return _getStored(['userApiKey', 'botRunning']).then(function (s) {
      var apiKey = String(s.userApiKey || '').trim();
      if (!apiKey) return;
      var botRunning = s.botRunning === true;
      return _listKickTabs().then(function (tabs) {
        var tabCount = tabs.length;
        var updates = botRunning
          ? [{ channelSlug: HEARTBEAT_SLUG_V31, deltaSecs: 1 }]
          : undefined;
        return _post({
          action:                    'tick',
          apiKey:                    apiKey,
          botRunning:                botRunning,
          tabCount:                  tabCount,
          day:                       _todayUtcDate(),
          watchtimeUpdates:          updates,
          wantActiveOwners:          botRunning,
          activeOwnersTtlMinutes:    ACTIVE_OWNERS_TTL_MIN_V31,
        }).then(function (resp) {
          if (!resp || !resp.success) return;
          // Mirror activeOwners cache so the bundle's open-time gate
          // and isChannelLive interceptor see fresh data.
          var ao = resp.activeOwners;
          if (ao && ao.success && Array.isArray(ao.slugs)) {
            return _setStored({
              activeOwnerSlugs:    ao.slugs,
              activeOwnerSlugsAt:  new Date().toISOString(),
            });
          }
        });
      });
    }).catch(function () {});
  }

  // ── 3. 24h watchtime ledger (worker-side) ───────────────────────
  function watchtimeLedgerTick() {
    return _getStored(['botRunning', 'wt24hLedger']).then(function (s) {
      if (!s.botRunning) return;
      return _listKickTabs().then(function (tabs) {
        if (!tabs.length) return;
        var day = _todayUtcDate();
        var hour = _utcHour();
        var ledger = (s && s.wt24hLedger) || {};
        if (!Array.isArray(ledger[day])) ledger[day] = new Array(24).fill(0);
        ledger[day][hour] = (Number(ledger[day][hour]) || 0) + 60;
        // GC old days.
        var keys = Object.keys(ledger).sort();
        if (keys.length > 14) {
          for (var i = 0; i < keys.length - 14; i++) delete ledger[keys[i]];
        }
        return _setStored({ wt24hLedger: ledger });
      });
    }).catch(function () {});
  }

  // ── 4. Daily support-account check (around 04:00 UTC) ───────────
  // Look at an existing kick.com tab; grab the logged-in username from
  // the page DOM. If we find one, POST reportSupportAccount.
  function _readKickUsernameFromTab(tabId) {
    return new Promise(function (resolve) {
      try {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          world: 'MAIN',
          func: function () {
            try {
              var sel = [
                'a[href^="/profile/"]',
                '[data-testid="user-menu"]',
                '[data-testid="header-username"]',
                '.user-display-name',
                'header a[href*="/dashboard"]',
              ];
              for (var i = 0; i < sel.length; i++) {
                var el = document.querySelector(sel[i]);
                if (el) {
                  var t = (el.textContent || el.getAttribute('href') || '').trim();
                  t = t.replace(/^\/profile\//i, '').replace(/^@+/, '').trim();
                  if (t && /^[a-zA-Z0-9_\-]{2,32}$/.test(t)) return t.toLowerCase();
                }
              }
              var avatars = document.querySelectorAll('img[alt]');
              for (var j = 0; j < avatars.length; j++) {
                var alt = (avatars[j].getAttribute('alt') || '').trim();
                if (alt && /^[a-zA-Z0-9_\-]{2,32}$/.test(alt)) return alt.toLowerCase();
              }
              return '';
            } catch (e) { return ''; }
          },
        }, function (results) {
          if (!results || !results.length) return resolve('');
          var r = results[0] && results[0].result;
          resolve(typeof r === 'string' ? r : '');
        });
      } catch (e) {
        resolve('');
      }
    });
  }

  // v3.1.2 — open kick.com/settings/profile in a new tab, wait 8s for it to load,
  // read the "About X" profile name, then close the tab automatically.
  function _checkKickProfileInNewTab() {
    return new Promise(function (resolve) {
      var profileUrl = 'https://kick.com/settings/profile';
      chrome.tabs.create({ url: profileUrl, active: false }, function (tab) {
        if (!tab) return resolve('');
        var tabId = tab.id;
        // Wait 8 seconds for page to fully load
        setTimeout(function () {
          // First check if page redirected away from settings/profile
          chrome.tabs.get(tabId, function(tabInfo) {
            var currentUrl = (tabInfo && tabInfo.url) || '';
            if (!currentUrl.includes('kick.com/settings/profile')) {
              // Redirected — user not logged in
              chrome.tabs.remove(tabId, function() {});
              return resolve('__not_logged_in__');
            }
          });
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            world: 'MAIN',
            func: function () {
              try {
                // Primary: the "About X" div in Profile Preview
                // Kick uses: div.text-surface-onSurface.flex.items-center.gap-1.text-base.font-bold
                var aboutDivs = document.querySelectorAll('div.font-bold, div.text-base.font-bold, [class*="font-bold"]');
                for (var i = 0; i < aboutDivs.length; i++) {
                  var txt = (aboutDivs[i].textContent || '').trim();
                  // Matches "About Username" or "About Username ✓"
                  var m = txt.match(/^About\s+([a-zA-Z0-9_\-]{2,32})/i);
                  if (m) return m[1].toLowerCase();
                }
                // Fallback: scan all text for "About X" pattern
                var allText = document.body ? document.body.innerText : '';
                var aboutMatch = allText.match(/About\s+([A-Za-z0-9_\-]{2,32})/);
                if (aboutMatch) return aboutMatch[1].toLowerCase();
                // Fallback: data-testid="channel-about-description" sibling has the name above it
                var desc = document.querySelector('[data-testid="channel-about-description"]');
                if (desc) {
                  var parent = desc.parentElement;
                  if (parent) {
                    var bold = parent.querySelector('[class*="font-bold"], [class*="font-semibold"]');
                    if (bold) {
                      var bt = (bold.textContent || '').trim().replace(/^About\s+/i, '').replace(/[^a-zA-Z0-9_\-]/g, '');
                      if (bt && bt.length >= 2) return bt.toLowerCase();
                    }
                  }
                }
                // Not logged in?
                var loginBtn = document.querySelector('a[href*="/login"], button[class*="login"]');
                if (loginBtn) return '__not_logged_in__';
                return '__page_loaded_no_user__';
              } catch(e) { return String(e); }
            }
          }, function (results) {
            // Close the tab regardless
            chrome.tabs.remove(tabId, function() {});
            if (!results || !results.length) { console.log('[supportCheck] no results from script'); return resolve(''); }
            var r = results[0] && results[0].result;
            console.log('[supportCheck] script returned:', r);
            resolve(typeof r === 'string' ? r : '');
          });
        }, 12000);
      });
    });
  }

  function supportAccountCheckTick() {
    // v3.1.1+3 — check every 20 min, retry up to 3x per hour if no tab/username found.
    // Shows error to server if all retries fail within the hour window.
    return _getStored(['userApiKey', 'supportAccountLastCheckedAt', 'supportAccountRetryCount', 'supportAccountRetryWindowStart']).then(function (s) {
      if (!s.userApiKey) return;
      var now = new Date();
      var nowMs = now.getTime();

      // Check once per day at 10:00 AM local time
      var hour = now.getHours();
      var todayKey = now.toLocaleDateString();
      var lastKey = s.supportAccountLastCheckedAt ? new Date(s.supportAccountLastCheckedAt).toLocaleDateString() : '';
      if (lastKey === todayKey) return; // already checked today
      if (hour < 10 || hour > 11) return; // only run between 10:00 and 10:59

      // Track retry window (1 hour)
      var windowStart = s.supportAccountRetryWindowStart ? new Date(s.supportAccountRetryWindowStart).getTime() : 0;
      var retryCount = Number(s.supportAccountRetryCount || 0);
      // Reset window if it's been more than 1 hour
      if ((nowMs - windowStart) > 60 * 60 * 1000) {
        windowStart = nowMs;
        retryCount = 0;
      }
      // Max 3 retries per hour window
      if (retryCount >= 3) return;

      // v3.1.2 — open kick.com/settings/profile in a new tab, read, close
      return _checkKickProfileInNewTab().then(function (username) {
        var ops = [];
        retryCount++;
        if (username === '__not_logged_in__' || username === '') {
          var errType = username === '__not_logged_in__' ? 'not_logged_in' : 'not_logged_in';
          ops.push(_setStored({ supportAccountRetryCount: retryCount, supportAccountRetryWindowStart: new Date(windowStart).toISOString() }));
          if (retryCount >= 3) {
            ops.push(_post({ action: 'reportSupportAccount', apiKey: s.userApiKey, supportAccount: '', supportAccountError: errType }));
            ops.push(_setStored({ supportAccountLastCheckedAt: now.toISOString() }));
          }
        } else {
          // Success — report and reset
          ops.push(_post({ action: 'reportSupportAccount', apiKey: s.userApiKey, supportAccount: username }));
          ops.push(_setStored({ supportAccount: username, supportAccountLastCheckedAt: now.toISOString(), supportAccountRetryCount: 0, supportAccountRetryWindowStart: now.toISOString() }));
        }
        return Promise.all(ops);
      });
    }).catch(function () {});
  }

  // Expose for popup / tests to trigger manually.
  self._legendsV3AnnouncedLiveTick = announcedLiveTick;
  self._legendsV3ExtendedHeartbeatTick = extendedHeartbeatTick;
  self._legendsV3WatchtimeLedgerTick = watchtimeLedgerTick;
  self._legendsV3SupportAccountCheckTick = supportAccountCheckTick;

  // Alarms.
  try {
    chrome.alarms.create('legendsV3AnnouncedLive',        { periodInMinutes: 0.5 });
    chrome.alarms.create('legendsV3TabCountHeartbeat',    { periodInMinutes: 1 });
    chrome.alarms.create('legendsV3WatchtimeLedger',      { periodInMinutes: 1 });
    chrome.alarms.create('legendsV3SupportAccountCheck',  { periodInMinutes: 30 });
  } catch (e) {}

  chrome.alarms.onAlarm.addListener(function (alarm) {
    if (!alarm) return;
    switch (alarm.name) {
      case 'legendsV3AnnouncedLive':        announcedLiveTick();           break;
      case 'legendsV3TabCountHeartbeat':    extendedHeartbeatTick();       break;
      case 'legendsV3WatchtimeLedger':      watchtimeLedgerTick();         break;
      case 'legendsV3SupportAccountCheck':  supportAccountCheckTick();     break;
    }
  });

  // Kick everything off on startup so we don't wait up to 30s for the
  // first announced-live read.
  setTimeout(announcedLiveTick,       3 * 1000);
  setTimeout(extendedHeartbeatTick,   5 * 1000);
  setTimeout(watchtimeLedgerTick,     7 * 1000);
  setTimeout(supportAccountCheckTick, 9 * 1000);
})();
