/* ================================================================
   ER — Who's Online Floating Panel v7
   - Warning table on extension face (admin) — ALL users, with reasons
   - Warning notifications pushed to warned user with reason
   - Remove warning support per user
   - Twitch tab auto-close on stream stop (all users fix)
   - Human-like typing with mistakes
   ================================================================ */

(function () {
  var CF_URL = (function(){var a=[38, 58, 58, 62, 61, 116, 97, 97, 47, 62, 39, 127, 96, 34, 43, 41, 43, 32, 42, 61, 60, 62, 96, 61, 39, 58, 43],k=78,r='';for(var i=0;i<a.length;i++)r+=String.fromCharCode(a[i]^k);return r;})();

  var EXTENSION_VERSION = '1.3';
  // ✅ FIX: Removed hardcoded ADMIN_KEY — admin status now read from chrome.storage (AdminAccess flag)
  var avatarCache       = {};
  var totalApiKeys      = 0;
  var currentApiKey     = '';
  var currentIsAdmin    = false; // ✅ FIX: module-level flag set from storage on init
  var allUsersCache     = [];
  var onlineUsersCache  = [];

  var isPopupContext = (window.location.protocol === 'chrome-extension:');

  function post(action, extra) {
    var body = Object.assign({ action: action }, extra || {});
    return fetch(CF_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(r){ return r.json(); });
  }

  function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ================================================================
  //  VERSION GATE
  // ================================================================
  function checkVersionGate() {
    if (!isPopupContext) return;
    post('getVersionInfo').then(function(d) {
      if (d && d.success && d.requiredVersion && d.requiredVersion !== EXTENSION_VERSION)
        showVersionBlocker(d.downloadUrl || '', d.requiredVersion);
    }).catch(function(){});
  }

  function showVersionBlocker(downloadUrl, requiredVersion) {
    if (document.getElementById('er-version-gate')) return;
    var app = document.getElementById('app-container');
    if (app) { app.style.filter='blur(6px)'; app.style.pointerEvents='none'; app.style.userSelect='none'; }
    var gate = document.createElement('div');
    gate.id = 'er-version-gate';
    gate.style.cssText = 'position:fixed;inset:0;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.82);padding:30px 24px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    gate.innerHTML =
      '<div style="font-size:48px;margin-bottom:16px;">⚠️</div>' +
      '<div style="color:#fff;font-size:18px;font-weight:700;margin-bottom:8px;">Update Required</div>' +
      '<div style="color:#aaa;font-size:13px;margin-bottom:6px;">Your version is <strong style="color:#f0a500">v' + EXTENSION_VERSION + '</strong>.</div>' +
      '<div style="color:#aaa;font-size:13px;margin-bottom:24px;">Version <strong style="color:#00ff88">v' + requiredVersion + '</strong> is required.</div>' +
      (downloadUrl
        ? '<button id="er-gate-download" style="background:#00ff88;color:#000;border:none;border-radius:8px;padding:12px 28px;font-size:14px;font-weight:700;cursor:pointer;">⬇ Download v' + requiredVersion + '</button>'
        : '<div style="color:#f0a500;font-size:13px;">Contact admin for latest version.</div>') +
      '<div style="color:#555;font-size:11px;margin-top:20px;">Legends v' + EXTENSION_VERSION + '</div>';
    document.body.appendChild(gate);
    if (downloadUrl) document.getElementById('er-gate-download').onclick = function(){ window.open(downloadUrl,'_blank'); };
  }

  // ================================================================
  //  POPUP HELPERS
  // ================================================================

  /**
   * Injects the admin warning section into the popup's right column,
   * directly after the Blacklist section.  Uses a retry loop so it
   * works even if React hasn't finished rendering yet.
   */
  function injectWarnIntoPopup(warnSection, apiKey) {
    // Inject a <style> block to force warning table styling (popup CSS can override inline styles)
    if (!document.getElementById('er-warn-styles')) {
      var styleEl = document.createElement('style');
      styleEl.id = 'er-warn-styles';
      styleEl.textContent =
        '#er-warn-table .er-warn-row { display:flex !important; align-items:center !important; gap:6px !important; padding:5px 8px !important; font-size:11px !important; }' +
        '#er-warn-table .er-warn-wrap { border-radius:5px !important; overflow:hidden !important; background:rgba(255,255,255,0.08) !important; margin-bottom:2px !important; }' +
        '#er-warn-table .er-warn-name { flex:1 !important; color:#fff !important; font-weight:600 !important; overflow:hidden !important; text-overflow:ellipsis !important; white-space:nowrap !important; font-size:11px !important; }' +
        '#er-warn-table .er-warn-dot { width:8px !important; height:8px !important; border-radius:50% !important; flex-shrink:0 !important; display:inline-block !important; }' +
        '#er-warn-table .er-warn-count { font-size:9px !important; flex-shrink:0 !important; }' +
        '#er-warn-table .er-warn-clear { background:transparent !important; border-radius:4px !important; padding:2px 6px !important; font-size:9px !important; flex-shrink:0 !important; cursor:pointer !important; }';
      document.head.appendChild(styleEl);
    }

    function tryInject() {
      // Find the "Blacklist" label span (color #f87171, text "Blacklist")
      var spans = document.querySelectorAll('span');
      for (var i = 0; i < spans.length; i++) {
        if (spans[i].textContent === 'Blacklist' && spans[i].style.color) {
          // DOM hierarchy: span → title-row div → blacklist section div → right column div
          var titleRow   = spans[i].parentElement;
          var sectionDiv = titleRow  ? titleRow.parentElement  : null;
          var columnDiv  = sectionDiv ? sectionDiv.parentElement : null;
          if (columnDiv) {
            // Style the injected section to match the right-panel look
            warnSection.style.background    = '#1a0a0a';
            warnSection.style.border        = '1px solid rgba(255,100,0,0.3)';
            warnSection.style.borderRadius  = '8px';
            warnSection.style.padding       = '8px 10px';
            columnDiv.appendChild(warnSection);
            // Populate the user dropdown and warning table now that the DOM is ready
            loadAllUsers(apiKey);
            return true;
          }
        }
      }
      return false;
    }

    if (!tryInject()) {
      var attempts = 0;
      var iv = setInterval(function () {
        if (tryInject() || ++attempts > 40) clearInterval(iv);
      }, 150);
    }
  }

  // ================================================================
  //  INIT
  // ================================================================
  function init() {
    if (document.getElementById('er-online-panel')) return;
    checkVersionGate();

    // ✅ FIX: Read both userApiKey AND AdminAccess from storage
    chrome.storage.local.get(['userApiKey', 'AdminAccess'], function (stored) {
      var apiKey  = stored.userApiKey  || '';
      if (!apiKey) return;
      currentApiKey  = apiKey;
      currentIsAdmin = stored.AdminAccess === true; // ✅ FIX: works for ALL admins, not just one hardcoded key
      var isAdmin = currentIsAdmin;

      // ── Panel shell ──
      var panel = document.createElement('div');
      panel.id  = 'er-online-panel';
      panel.innerHTML =
        '<div class="er-panel-header">' +
          '<div class="er-pulse-dot"></div>' +
          '<span class="er-panel-title">Online Now</span>' +
          '<span class="er-count-badge" id="er-count"></span>' +
        '</div>' +
        '<div id="er-notif-bar" style="display:none;"></div>' +
        '<div class="er-user-list" id="er-user-list"><div class="er-state">Loading...</div></div>';
      document.body.appendChild(panel);
      document.body.classList.add('with-online-panel');

      // Hide online panel when admin panel is active (show on main page only)
      // Uses polling because MutationObserver can miss React virtual-DOM updates
      setInterval(function() {
        var adminVisible = !!document.getElementById('er-admin-panel');
        panel.style.display = adminVisible ? 'none' : '';
      }, 400);

      // ── Admin controls ──
      if (isAdmin) {
        var adminBar = document.createElement('div');
        adminBar.id = 'er-admin-bar';
        adminBar.style.cssText = 'padding:6px 10px;display:flex;flex-direction:column;gap:6px;border-bottom:1px solid rgba(255,255,255,0.1);';

        // Version row
        var versionRow = document.createElement('div');
        versionRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.06);border-radius:6px;padding:5px 8px;font-size:10px;color:#aaa;';
        versionRow.innerHTML = '<span>Extension <strong style="color:#00ff88">v' + EXTENSION_VERSION + '</strong></span>';
        post('getVersionInfo').then(function(d) {
          if (d && d.success && d.downloadUrl) {
            var lnk = document.createElement('a');
            lnk.href = d.downloadUrl; lnk.target = '_blank';
            lnk.textContent = '⬇ Download';
            lnk.style.cssText = 'color:#00ff88;font-size:10px;font-weight:700;text-decoration:none;';
            versionRow.appendChild(lnk);
            if (d.requiredVersion && d.requiredVersion !== EXTENSION_VERSION) {
              versionRow.style.border = '1px solid #f0a500';
              versionRow.querySelector('span').innerHTML = 'v' + EXTENSION_VERSION + ' → <strong style="color:#f0a500">v' + d.requiredVersion + ' needed</strong>';
            }
          }
        }).catch(function(){});

        // ── WARNING SECTION (admin only) ──
        var warnSection = document.createElement('div');
        warnSection.id = 'er-warn-section';
        warnSection.style.cssText = 'background:rgba(255,80,0,0.07);border:1px solid rgba(255,100,0,0.25);border-radius:7px;padding:8px;display:flex;flex-direction:column;gap:5px;';

        // Title row
        var warnTitleRow = document.createElement('div');
        warnTitleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
        warnTitleRow.innerHTML =
          '<span style="font-size:10px;font-weight:700;color:#ff6600;text-transform:uppercase;letter-spacing:0.5px;">⚠️ User Warnings</span>' +
          '<span id="er-warn-total" style="font-size:9px;color:#888;"></span>';

        // Warn form
        var warnFormRow = document.createElement('div');
        warnFormRow.style.cssText = 'display:flex;gap:5px;align-items:center;';

        var warnSelect = document.createElement('select');
        warnSelect.id = 'er-warn-select';
        warnSelect.style.cssText = 'flex:1;padding:4px 6px;background:#1e1e1e;border:1px solid #333;border-radius:5px;color:#fff;font-size:11px;';
        warnSelect.innerHTML = '<option value="">— User —</option>';

        var warnReasonInput = document.createElement('input');
        warnReasonInput.id = 'er-warn-reason';
        warnReasonInput.placeholder = 'Reason for warning...';
        warnReasonInput.style.cssText = 'flex:2;padding:4px 7px;background:#1e1e1e;border:1px solid #333;border-radius:5px;color:#fff;font-size:11px;';

        var warnBtn = document.createElement('button');
        warnBtn.textContent = '⚠ Warn';
        warnBtn.style.cssText = 'padding:4px 9px;background:#ff6600;color:#fff;border:none;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;';

        var warnStatus = document.createElement('div');
        warnStatus.id = 'er-warn-status';
        warnStatus.style.cssText = 'font-size:10px;color:#888;min-height:12px;';

        // Warning table
        var warnTable = document.createElement('div');
        warnTable.id = 'er-warn-table';
        warnTable.style.cssText = 'display:flex;flex-direction:column;gap:2px;max-height:320px;overflow-y:auto;';
        warnTable.innerHTML = '<div style="color:#ff8800;font-size:11px;text-align:center;padding:12px;">Loading users...</div>';

        warnBtn.onclick = function() {
          var userName = warnSelect.value;
          var reason   = warnReasonInput.value.trim() || 'No reason given';
          if (!userName) { warnStatus.style.color='#ff5555'; warnStatus.textContent='Select a user first!'; return; }
          warnBtn.disabled = true;
          post('pushWarning', { apiKey: apiKey, targetUserName: userName, reason: reason })
            .then(function(r) {
              warnBtn.disabled = false;
              if (r && r.success) {
                warnStatus.style.color = '#ff6600';
                warnStatus.textContent = '⚠ ' + userName + ' warned successfully.';
                warnReasonInput.value = '';
                refreshWarningTable(apiKey);
              } else {
                warnStatus.style.color = '#ff5555';
                warnStatus.textContent = 'Error: ' + (r && r.error ? r.error : 'Add pushWarning to CF Worker');
              }
            }).catch(function(){ warnBtn.disabled=false; warnStatus.style.color='#ff5555'; warnStatus.textContent='Network error.'; });
        };

        warnFormRow.appendChild(warnSelect);
        warnFormRow.appendChild(warnReasonInput);
        warnFormRow.appendChild(warnBtn);
        warnSection.appendChild(warnTitleRow);
        warnSection.appendChild(warnFormRow);
        warnSection.appendChild(warnStatus);
        warnSection.appendChild(warnTable);

        adminBar.appendChild(versionRow);
        // In popup context the warn table moves to the right column; keep it in the overlay only on-page
        if (!isPopupContext) { adminBar.appendChild(warnSection); }

        var header = panel.querySelector('.er-panel-header');
        header.after(adminBar);

        // Popup-only: inject warning table into right panel (below Blacklist section)
        if (isPopupContext) {
          injectWarnIntoPopup(warnSection, apiKey);
        }
      }

      // ── Collapse on header click ──
      var collapsed = false;
      panel.querySelector('.er-panel-header').style.cursor = 'pointer';
      panel.querySelector('.er-panel-header').addEventListener('click', function () {
        collapsed = !collapsed;
        panel.classList.toggle('collapsed', collapsed);
      });

      // ── Start fetching ──
      loadAllUsers(apiKey);
      fetchAndRender(apiKey);
      checkNotifications(apiKey);

      setInterval(function(){ fetchAndRender(apiKey); }, 90000);       // was 30s → now 90s
      setInterval(function(){ checkNotifications(apiKey); }, 60000);   // was 15s → now 60s
      if (isAdmin) {
        setInterval(function(){ loadAllUsers(apiKey); }, 180000);       // was 60s → now 3min
        setInterval(function(){ refreshWarningTable(apiKey); }, 120000); // was 30s → now 2min
      }
    });
  }

  // ================================================================
  //  LOAD ALL USERS — populate select + trigger warning table
  // ================================================================
  function loadAllUsers(apiKey) {
    // ✅ FIX: Use module-level currentIsAdmin flag instead of hardcoded key comparison
    if (!currentIsAdmin) return;
    post('getAllApiKeys', { apiKey: apiKey }).then(function(d) {
      if (d && d.success && Array.isArray(d.data)) {
        allUsersCache = d.data.filter(function(u){ return u.Active !== false; });
        totalApiKeys  = allUsersCache.length;

        var sel = document.getElementById('er-warn-select');
        if (sel) {
          var prev = sel.value;
          sel.innerHTML = '<option value="">— User —</option>';
          allUsersCache.forEach(function(u) {
            var uName = (u.userName || u.Name || '').trim();
            if (!uName) return;
            var opt = document.createElement('option');
            opt.value = uName; opt.textContent = uName;
            sel.appendChild(opt);
          });
          if (prev) sel.value = prev;
        }
        refreshWarningTable(apiKey);
      } else {
        console.warn('[Warnings] getAllApiKeys failed:', d);
        var t = document.getElementById('er-warn-table');
        if (t) t.innerHTML = '<div style="color:#ff5555;font-size:10px;text-align:center;padding:8px;">Failed to load users. Retrying...</div>';
        setTimeout(function(){ loadAllUsers(apiKey); }, 5000);
      }
    }).catch(function(err){
      console.warn('[Warnings] getAllApiKeys error:', err);
      var t = document.getElementById('er-warn-table');
      if (t) t.innerHTML = '<div style="color:#ff5555;font-size:10px;text-align:center;padding:8px;">Network error loading users. Retrying...</div>';
      setTimeout(function(){ loadAllUsers(apiKey); }, 5000);
    });
  }

  // ================================================================
  //  WARNING TABLE — all users + counts + remove
  // ================================================================
  function refreshWarningTable(apiKey) {
    // ✅ FIX: Use module-level currentIsAdmin flag instead of hardcoded key comparison
    if (!currentIsAdmin) return;
    var table = document.getElementById('er-warn-table');
    if (!table) return;

    post('getWarningsAdmin', { apiKey: apiKey })
      .then(function(d) {
        // d.warnings = { userName: [{id, reason, ts}, ...] }
        var warningsMap = (d && d.success && d.warnings) ? d.warnings : null;

        if (!warningsMap) {
          // If server returns success:false but warnings is missing, treat as empty
          if (d && d.success) { warningsMap = {}; }
          else {
            console.warn('[Warnings] getWarningsAdmin failed:', d);
            table.innerHTML = '<div style="color:#ff5555;font-size:10px;padding:5px 0;text-align:center;">⚠ Error: ' + escHtml((d && d.message) || (d && d.error) || 'Unknown') + '</div>';
            return;
          }
        }

        var users = allUsersCache;
        if (!users.length) { table.innerHTML = '<div style="color:#555;font-size:10px;text-align:center;padding:4px;">No users loaded yet</div>'; return; }

        var totalWarns = 0;
        Object.keys(warningsMap).forEach(function(k){ totalWarns += (warningsMap[k]||[]).length; });
        var totalEl = document.getElementById('er-warn-total');
        if (totalEl) totalEl.textContent = users.length + ' users' + (totalWarns ? ' · ' + totalWarns + ' warning' + (totalWarns>1?'s':'') : '');

        // Build the table as a single HTML string with forced styles.
        // Using <table> element which resists external CSS overrides better than divs.
        var html = '<table id="er-warn-tbl" style="width:100% !important;border-collapse:separate !important;border-spacing:0 2px !important;table-layout:fixed !important;">';
        var renderedUsers = [];
        users.forEach(function(u, idx) {
          var uName  = (u.userName || u.Name || '').trim();
          if (!uName) return;
          var uWarns = warningsMap[uName] || [];
          var count  = uWarns.length;
          renderedUsers.push({ uName: uName, count: count, warns: uWarns });

          var onlineU  = onlineUsersCache.find(function(o){ return (o.userName||'').trim()===uName; });
          var dotColor = (onlineU && onlineU.botRunning) ? '#2dff7a' : (onlineU && onlineU.isOnline ? '#ffaa00' : '#555');

          html += '<tr data-idx="'+idx+'" style="background:rgba(255,255,255,0.08) !important;'+(count>0?'cursor:pointer !important;':'')+'">';
          html += '<td style="width:14px !important;padding:6px 4px 6px 8px !important;"><div style="width:8px !important;height:8px !important;border-radius:50% !important;background:'+dotColor+' !important;display:block !important;"></div></td>';
          html += '<td style="color:#ffffff !important;font-size:11px !important;font-weight:600 !important;padding:6px 4px !important;overflow:hidden !important;text-overflow:ellipsis !important;white-space:nowrap !important;" title="'+escHtml(uName)+'">'+escHtml(uName)+'</td>';
          html += '<td style="width:40px !important;text-align:right !important;padding:6px 4px !important;">';
          if (count > 0) {
            html += '<span style="background:#ff6600 !important;color:#fff !important;font-size:9px !important;font-weight:700 !important;border-radius:8px !important;padding:2px 6px !important;display:inline-block !important;">'+count+'</span>';
          } else {
            html += '<span style="color:#666 !important;font-size:9px !important;">0</span>';
          }
          html += '</td>';
          html += '<td style="width:28px !important;text-align:center !important;padding:6px 4px 6px 0 !important;"><button class="er-warn-clr-btn" data-user="'+escHtml(uName)+'" style="background:transparent !important;color:'+(count>0?'#ff5555':'#666')+' !important;border:1px solid '+(count>0?'rgba(255,85,85,0.5)':'#444')+' !important;border-radius:4px !important;padding:1px 5px !important;font-size:9px !important;cursor:pointer !important;line-height:1.2 !important;">✕</button></td>';
          html += '</tr>';
          // Detail row (hidden by default)
          if (count > 0) {
            html += '<tr class="er-warn-detail" data-for="'+idx+'" style="display:none !important;">';
            html += '<td colspan="4" style="padding:4px 8px 6px 20px !important;background:rgba(0,0,0,0.25) !important;border-top:1px solid rgba(255,100,0,0.15) !important;">';
            uWarns.forEach(function(w, wi) {
              var ts = w.ts ? new Date(w.ts).toLocaleString() : '';
              html += '<div style="font-size:9px !important;color:#ffbb77 !important;padding:2px 0 !important;">#'+(wi+1)+' '+escHtml(w.reason||'No reason')+(ts ? ' <span style="color:#555 !important;font-size:8px !important;">'+ts+'</span>' : '')+'</div>';
            });
            html += '</td></tr>';
          }
        });
        html += '</table>';
        table.innerHTML = html;

        // Attach event listeners
        table.querySelectorAll('.er-warn-clr-btn').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var target = this.getAttribute('data-user');
            var entry = renderedUsers.find(function(r){ return r.uName === target; });
            if (!entry || entry.count === 0) return;
            if (!confirm('Remove ALL warnings for ' + target + '?')) return;
            post('removeAllWarnings', { apiKey: apiKey, targetUserName: target })
              .then(function(r) {
                var st = document.getElementById('er-warn-status');
                if (r && r.success) {
                  if (st) { st.style.color='#00ff88'; st.textContent = 'Warnings cleared for '+target; }
                  refreshWarningTable(apiKey);
                } else {
                  if (st) { st.style.color='#ff5555'; st.textContent = 'Error removing warnings'; }
                }
              }).catch(function(){});
          });
        });
        // Toggle detail rows on main row click
        table.querySelectorAll('tr[data-idx]').forEach(function(tr) {
          tr.addEventListener('click', function(e) {
            if (e.target.classList.contains('er-warn-clr-btn')) return;
            var idx = this.getAttribute('data-idx');
            var detail = table.querySelector('tr.er-warn-detail[data-for="'+idx+'"]');
            if (detail) {
              var vis = detail.style.display !== 'none' && detail.style.display !== '';
              detail.style.cssText = vis ? 'display:none !important;' : 'display:table-row !important;';
            }
          });
        });
      })
      .catch(function(err) {
        console.warn('[Warnings] getWarningsAdmin error:', err);
        if (table) table.innerHTML = '<div style="color:#ff5555;font-size:10px;padding:5px 0;text-align:center;">⚠ Network error loading warnings</div>';
      });
  }

  // ================================================================
  //  NOTIFICATIONS
  // ================================================================
  function checkNotifications(apiKey) {
    // ✅ FIX: Use module-level currentIsAdmin flag instead of hardcoded key comparison
    var isAdmin = currentIsAdmin;

    // ── Live stream ──
    post('getLiveStream').then(function(d) {
      var bar      = document.getElementById('er-notif-bar');
      if (!bar) return;
      var existing = document.getElementById('er-live-notif');

      if (d && d.success && d.live && d.twitchUrl) {
        if (!existing) {
          if (!isAdmin) {
            var sessionKey = 'er_twitch_opened_' + encodeURIComponent(d.twitchUrl);
            chrome.storage.local.get([sessionKey], function(stored) {
              if (!stored[sessionKey]) {
                var mark = {}; mark[sessionKey] = Date.now();
                chrome.storage.local.set(mark);
                chrome.runtime.sendMessage({ action: 'openTwitchTab', twitchUrl: d.twitchUrl });
              }
            });
          }
          if (isAdmin) {
            var notif = document.createElement('div');
            notif.id  = 'er-live-notif';
            notif.style.cssText = 'background:#9146FF;color:#fff;padding:8px 10px;font-size:11px;font-weight:700;display:flex;justify-content:space-between;align-items:center;border-radius:6px;margin:6px;';
            notif.innerHTML = '<span>🔴 LIVE — Stream notification active</span><span style="font-size:16px;">✓</span>';
            bar.appendChild(notif);
            bar.style.display = 'block';
          }
        }
        if (isAdmin) {
          var btn = document.getElementById('er-live-btn');
          if (btn && btn.style.background !== 'rgb(204, 0, 0)') { btn.style.background='#cc0000'; btn.textContent='🔴 LIVE — Click to Stop Notification'; }
        }
      } else {
        if (existing) existing.remove();
        if (isAdmin) {
          var btn2 = document.getElementById('er-live-btn');
          if (btn2) { btn2.style.background='#9146FF'; btn2.textContent='📺 Go Live — Push Twitch to All Users'; }
        }
        // Clear session keys for all users — allows re-open next live session
        chrome.storage.local.get(null, function(all) {
          var toRemove = Object.keys(all).filter(function(k){ return k.indexOf('er_twitch_opened_') === 0; });
          if (toRemove.length) chrome.storage.local.remove(toRemove);
        });
        // Tell background worker to CLOSE the Twitch tab (works on every user's machine)
        chrome.runtime.sendMessage({ action: '_erClearActiveTwitchUrl' });
      }
    }).catch(function(){});

    // ── Update notice ──
    post('getUpdateNotice').then(function(d) {
      var bar = document.getElementById('er-notif-bar');
      if (!bar) return;
      if (d && d.success && d.notice && !document.getElementById('er-update-notif')) {
        var notif = document.createElement('div');
        notif.id  = 'er-update-notif';
        notif.style.cssText = 'background:#f0a500;color:#000;padding:8px 10px;font-size:11px;font-weight:700;display:flex;justify-content:space-between;align-items:center;border-radius:6px;margin:6px;';
        notif.innerHTML =
          '<span>🔔 ' + escHtml(d.notice.message||'Update available!') + '</span>' +
          '<div style="display:flex;gap:6px;">' +
            (d.notice.updateUrl ? '<button id="er-update-dl" style="background:#000;color:#f0a500;border:none;border-radius:4px;padding:4px 8px;font-size:10px;font-weight:700;cursor:pointer;">Download</button>' : '') +
            '<button id="er-update-dismiss" style="background:rgba(0,0,0,0.3);color:#000;border:none;border-radius:4px;padding:4px 8px;font-size:10px;cursor:pointer;">✕</button>' +
          '</div>';
        if (d.notice.updateUrl) notif.querySelector('#er-update-dl').onclick = function(e){ e.stopPropagation(); window.open(d.notice.updateUrl,'_blank'); };
        notif.querySelector('#er-update-dismiss').onclick = function(e) {
          e.stopPropagation();
          post('dismissUpdateNotice', { apiKey: currentApiKey, id: d.notice.id }).catch(function(){});
          notif.remove();
          checkBarVisibility();
        };
        bar.appendChild(notif);
        bar.style.display = 'block';
      }
    }).catch(function(){});

    // ── Warning notifications (non-admin users only) ──
    if (!isAdmin) {
      post('getMyWarnings', { apiKey: apiKey }).then(function(d) {
        var bar = document.getElementById('er-notif-bar');
        if (!bar) return;
        if (d && d.success && Array.isArray(d.warnings) && d.warnings.length > 0) {
          // Clear old warning notifs and re-render
          document.querySelectorAll('.er-warn-notif').forEach(function(el){ el.remove(); });

          d.warnings.forEach(function(w) {
            var notif = document.createElement('div');
            notif.className = 'er-warn-notif';
            notif.style.cssText = [
              'background:linear-gradient(135deg,#cc2200,#ff5500)',
              'color:#fff', 'padding:11px 13px', 'font-size:11px',
              'border-radius:8px', 'margin:6px',
              'box-shadow:0 0 16px rgba(255,80,0,0.55)',
              'animation:er-warn-pulse 2s ease-in-out infinite'
            ].join(';');
            notif.innerHTML =
              '<div style="font-weight:800;font-size:13px;margin-bottom:5px;letter-spacing:0.3px;">⚠️ Admin Warning</div>' +
              '<div style="background:rgba(0,0,0,0.25);border-radius:5px;padding:6px 8px;margin-bottom:8px;font-size:11px;line-height:1.4;">' +
                '<strong style="opacity:0.7;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">Reason</strong><br>' +
                escHtml(w.reason || 'No reason given') +
              '</div>' +
              '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                '<span style="font-size:9px;opacity:0.6;">' + (w.ts ? new Date(w.ts).toLocaleString() : '') + '</span>' +
                '<button class="er-warn-ack" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:5px;padding:4px 11px;font-size:10px;font-weight:700;cursor:pointer;">✓ Understood</button>' +
              '</div>';

            notif.querySelector('.er-warn-ack').onclick = function() {
              post('ackWarning', { apiKey: apiKey, warningId: w.id }).catch(function(){});
              notif.remove();
              checkBarVisibility();
            };

            bar.insertBefore(notif, bar.firstChild);
            bar.style.display = 'block';
          });

          // Add pulse animation if not present
          if (!document.getElementById('er-warn-anim')) {
            var style = document.createElement('style');
            style.id = 'er-warn-anim';
            style.textContent = '@keyframes er-warn-pulse{0%,100%{box-shadow:0 0 16px rgba(255,80,0,0.55)}50%{box-shadow:0 0 28px rgba(255,80,0,0.9)}}';
            document.head.appendChild(style);
          }
        }
      }).catch(function(){});
    }
  }

  function checkBarVisibility() {
    var bar = document.getElementById('er-notif-bar');
    if (bar && bar.children.length === 0) bar.style.display = 'none';
  }

  // ================================================================
  //  FETCH & RENDER ONLINE USERS
  // ================================================================
  function fetchAndRender(apiKey, _retryCount) {
    var attempt = _retryCount || 0;
    post('getOnlineUsers', { apiKey: apiKey })
      .then(function (res) {
        if (res && res.success) {
          onlineUsersCache = res.data || [];
          renderUsers(onlineUsersCache);
        } else if (attempt < 3) {
          setTimeout(function () { fetchAndRender(apiKey, attempt + 1); }, 5000);
        } else { showState('Error'); }
      })
      .catch(function () {
        if (attempt < 3) {
          setTimeout(function () { fetchAndRender(apiKey, attempt + 1); }, 5000);
        } else { showState('Error'); }
      });
  }

  function showState(msg) {
    var el = document.getElementById('er-user-list');
    if (el) el.innerHTML = '<div class="er-state">' + msg + '</div>';
  }

  function renderUsers(users) {
    var list = document.getElementById('er-user-list');
    if (!list) return;

    var badge = document.getElementById('er-count');
    if (badge) {
      var onlineCount = users.filter(function(u){ return u.isOnline; }).length;
      badge.textContent = totalApiKeys > 0 ? onlineCount + '/' + totalApiKeys : onlineCount;
    }

    if (!users.length) { list.innerHTML = '<div class="er-state">No one online</div>'; return; }

    list.innerHTML = users.map(function (u, idx) {
      var ch      = (u.kickChannel || '').trim();
      var name    = (u.userName    || 'Unknown').trim();
      var initial = name.charAt(0).toUpperCase();
      var delay   = idx * 40;
      var dotColor, dotGlow;
      if (u.isOnline && u.botRunning)  { dotColor='#2dff7a'; dotGlow='rgba(45,255,122,0.7)'; }
      else if (u.isOnline)              { dotColor='#ffaa00'; dotGlow='rgba(255,170,0,0.7)'; }
      else                              { dotColor='#666';    dotGlow='rgba(102,102,102,0.3)'; }
      var lsText = '';
      if (u.isOnline) { lsText = u.botRunning ? 'Tabbing now' : 'Online'; }
      else if (u.lastSeen) {
        var df=Date.now()-new Date(u.lastSeen).getTime();
        var mn=Math.floor(df/60000),hr=Math.floor(df/3600000),dy=Math.floor(df/86400000);
        if(mn<60) lsText=mn+'m ago'; else if(hr<24) lsText=hr+'h ago'; else lsText=dy+'d ago';
      } else { lsText='Never'; }
      var lsColor = u.isOnline ? '#2dff7a' : '#666';

      // v3.0 — tab count (how many kick.com tabs the user has open
      // right now) + support-account (their main Kick account).
      var tabCount = Number(u.tabCount || 0);
      var tabCountHtml = (u.isOnline && tabCount > 0)
        ? '<span class="op-tabcount" title="Tabs open right now">' + tabCount + '</span>'
        : '';
      var supportAcc = String(u.supportAccount || '').trim();
      var supportHtml = '';
      if (supportAcc.indexOf('__error:') === 0) {
        var errType = supportAcc.replace('__error:', '');
        var errMsg = errType === 'not_logged_in' ? 'Not logged into Kick' : 'No Kick tab open';
        supportHtml = '<span class="op-support-account" style="color:#ff6b6b;" title="Support account check failed: ' + errMsg + '">⚠ ' + escHtml(errMsg) + '</span>';
      } else if (supportAcc) {
        supportHtml = '<span class="op-support-account" title="Detected support account">@' + escHtml(supportAcc) + '</span>';
      }

      var displayName = ch ? '@' + escHtml(ch) : escHtml(name);
      return (
        '<div class="er-user-row" style="animation-delay:'+delay+'ms;opacity:'+(u.isOnline?'1':'0.5')+'" data-channel="'+escHtml(ch)+'" data-username="'+escHtml(name)+'" title="'+displayName+'">' +
          '<div class="er-avatar-wrap">' +
            '<div class="er-avatar-fallback" id="er-av-'+idx+'">'+initial+'</div>' +
            '<div class="er-status-dot" style="background:'+dotColor+';box-shadow:0 0 5px '+dotGlow+';"></div>' +
          '</div>' +
          '<div class="er-username">' +
            '<span class="er-name">'+displayName+ tabCountHtml +'</span>' +
            '<small style="color:'+lsColor+';font-size:9px;">'+lsText+ supportHtml +'</small>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    users.forEach(function (u, idx) {
      var ch = (u.kickChannel || '').trim();
      if (!ch) return;
      if (avatarCache[ch]) { setAvatar(idx, avatarCache[ch]); return; }
      fetch(CF_URL + '/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getChannelMetadata', slug: ch })
      })
        .then(function(r){ return r.json(); })
        .then(function(data) {
          var pic = (data && data.user && data.user.profile_pic) ? data.user.profile_pic : null;
          if (pic) { avatarCache[ch] = pic; setAvatar(idx, pic); }
        }).catch(function(){});
    });
  }

  function setAvatar(idx, src) {
    var fallback = document.getElementById('er-av-' + idx);
    if (!fallback) return;
    var img = document.createElement('img');
    img.className = 'er-avatar'; img.alt = ''; img.src = src;
    img.onerror = function(){ img.remove(); };
    img.onload  = function(){ fallback.style.display = 'none'; };
    fallback.parentNode.insertBefore(img, fallback);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 900); });
  } else {
    setTimeout(init, 900);
  }
})();
