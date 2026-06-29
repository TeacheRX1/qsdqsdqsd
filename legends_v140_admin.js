/* ================================================================
 *  Legends v1.4.1 admin sidecar — Streamer Points + admin user tools
 *  ----------------------------------------------------------------
 *  Adds to the admin panel (only visible to admins):
 *    1. A new "📊 Streamer Points" button injected into the admin
 *       tab bar (next to API Keys / Streamers / Notify). Clicking it
 *       opens a fullscreen overlay with day picker + per-streamer
 *       bar chart of points (1 hour = 1 point, summed across viewers).
 *    2. Hides the inline "✎ Edit Stats" pen on each user row in the
 *       Streamers admin tab (replaced by AI chat config + auto stats).
 *    3. Adds a "🗑 Delete User" button per non-admin user row that
 *       calls the new server `adminDeleteUser` action and refreshes.
 *
 *  Bar colour tiers (matches user spec):
 *    1–5 h    red
 *    5–10 h   yellow
 *    10–15 h  green
 *    15–24 h  darker green
 * ================================================================ */
(function () {
  if (window.__legendsV140AdminInstalled) return;
  window.__legendsV140AdminInstalled = true;

  function api()      { return (window.legendsV140 && window.legendsV140.callApi); }
  function getStored(){ return (window.legendsV140 && window.legendsV140.getStored); }

  function isAdminBody() {
    return document.body.classList.contains('v140-is-admin');
  }

  function todayUtc() {
    return new Date().toISOString().slice(0, 10);
  }

  function colourFor(hours) {
    if (hours >= 15) return 'darker';   // 15–24h darker green
    if (hours >= 10) return 'green';    // 10–15h green
    if (hours >= 5)  return 'yellow';   // 5–10h yellow
    return 'red';                        // 1–5h red
  }

  // v1.4.3 — render one row per USER (apiKey). Connected users get a
  // colour bar + "X.XX pts"; users who didn't connect today get a red
  // "did not connect" tag with no bar.
  //
  // v3.0 — also render a 24-cell horizontal timeline below the row
  // showing WHEN the user was tabbing today (per UTC hour). The data
  // is in u.hourly[24] (seconds per hour) coming from the server's
  // HourlyWatchTime table.
  function renderUserRow(u, maxHours) {
    var hours = (Number(u.totalSeconds) || 0) / 3600;
    var pct = Math.max(2, Math.min(100, Math.round(hours / Math.max(0.001, maxHours) * 100)));
    var row = document.createElement('div');
    row.className = 'v140-points-row' + (u.connectedToday ? '' : ' v140-points-row-offline');
    row.innerHTML =
      '<div class="v140-points-name"></div>' +
      '<div class="v140-points-bar">' +
        (u.connectedToday
          ? '<div class="v140-points-bar-fill v140-bar-color-' + colourFor(hours) + '" style="width:' + pct + '%"></div>'
          : '<div class="v140-points-bar-empty">⚠ DID NOT CONNECT TODAY</div>')
      + '</div>' +
      '<div class="v140-points-meta"></div>' +
      '<div class="v140-points-timeline"></div>';
    var nameEl = row.querySelector('.v140-points-name');
    nameEl.textContent = (u.userName || u.kickChannel || u.apiKey.slice(0, 8) + '…') + (u.isAdmin ? ' (admin)' : '');
    var meta = row.querySelector('.v140-points-meta');
    if (u.connectedToday) {
      meta.textContent = u.points.toFixed(2) + ' pts';
    } else {
      meta.textContent = '0.00 pts';
    }
    // 24-cell timeline strip
    var tl = row.querySelector('.v140-points-timeline');
    if (tl && window.WatchtimeBar && typeof window.WatchtimeBar.renderInto === 'function') {
      window.WatchtimeBar.renderInto(tl, u.hourly || [], { highlightNow: true });
    }
    return row;
  }

  function openPointsPage() {
    if (document.getElementById('v140-points-overlay')) return;
    if (!getStored() || !api()) return;
    getStored()(['userApiKey']).then(function (s) {
      var apiKey = s.userApiKey || '';
      if (!apiKey) return;
      var ov = document.createElement('div');
      ov.id = 'v140-points-overlay';
      ov.className = 'v140-points-page';
      ov.innerHTML = ''
        + '<header class="v140-points-header">'
        + '  <h2>📊 Streamer Points</h2>'
        + '  <span>'
        + '    <input type="date" id="v140-points-day" />'
        + '    <button class="v140-btn" id="v140-points-refresh">Refresh</button>'
        + '    <button class="v140-btn v140-btn-secondary" id="v140-points-close">Close</button>'
        + '  </span>'
        + '</header>'
        + '<div class="v140-points-legend">'
        + '  <span><span class="v140-bar-color-red"></span>1–5 pts</span>'
        + '  <span><span class="v140-bar-color-yellow"></span>5–10 pts</span>'
        + '  <span><span class="v140-bar-color-green"></span>10–15 pts</span>'
        + '  <span><span class="v140-bar-color-darker"></span>15–24 pts</span>'
        + '</div>'
        + '<div class="v140-points-summary" id="v140-points-summary">—</div>'
        + '<div class="v140-points-list" id="v140-points-list">Loading…</div>';
      document.body.appendChild(ov);

      var dayInput = document.getElementById('v140-points-day');
      dayInput.value = todayUtc();
      dayInput.max = todayUtc();

      function load() {
        var day = dayInput.value || todayUtc();
        var listEl = document.getElementById('v140-points-list');
        var summaryEl = document.getElementById('v140-points-summary');
        listEl.textContent = 'Loading…';
        api()({
          action: 'aichatPointsByUser',
          apiKey: apiKey,
          day: day,
        }).then(function (resp) {
          if (!resp || !resp.success) {
            listEl.textContent = 'Error: ' + ((resp && resp.message) || 'unknown');
            return;
          }
          var users = resp.users || [];
          if (!users.length) {
            listEl.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8">No active users. Add a key from the API Keys tab.</div>';
            summaryEl.textContent = '0 users · 0 pts total';
            return;
          }
          var connected = users.filter(function (u) { return u.connectedToday; });
          var totalSecs = users.reduce(function (a, u) { return a + (Number(u.totalSeconds) || 0); }, 0);
          var maxHours = Math.max.apply(null, users.map(function (u) { return (u.totalSeconds || 0) / 3600; }).concat([1]));
          summaryEl.textContent = users.length + ' user' + (users.length === 1 ? '' : 's') +
            ' · ' + connected.length + ' connected today · ' +
            (totalSecs / 3600).toFixed(2) + ' pts total · max ' + maxHours.toFixed(2) + ' pts';
          listEl.innerHTML = '';
          users.forEach(function (u) { listEl.appendChild(renderUserRow(u, maxHours)); });
        }).catch(function (e) {
          listEl.textContent = 'Network error: ' + (e && e.message);
        });
      }
      document.getElementById('v140-points-refresh').addEventListener('click', load);
      document.getElementById('v140-points-close').addEventListener('click', function () {
        ov.parentNode.removeChild(ov);
      });
      dayInput.addEventListener('change', load);
      load();
    });
  }

  // ── tab-bar injection ─────────────────────────────────────────
  function findTabBar() {
    // The admin tab bar holds buttons whose text contains "🔑 API Keys".
    // The bar is the parent of that button.
    var apiKeysBtn = Array.prototype.find.call(
      document.querySelectorAll('button'),
      function (b) { return b.textContent && b.textContent.indexOf('API Keys') >= 0; }
    );
    return apiKeysBtn ? apiKeysBtn.parentNode : null;
  }
  function ensurePointsTab() {
    if (!isAdminBody()) return;
    if (document.getElementById('v140-points-tab-injected')) return;
    var bar = findTabBar();
    if (!bar) return;
    var btn = document.createElement('button');
    btn.id = 'v140-points-tab-injected';
    btn.type = 'button';
    btn.className = 'v140-points-tab-btn';
    btn.textContent = '📊 Streamer Points';
    btn.addEventListener('click', openPointsPage);
    bar.appendChild(btn);
  }

  // ── admin user-row decorations (hide ✎ Edit Stats, add 🗑 Delete) ──
  function decorateAdminUserRows() {
    if (!isAdminBody()) return;
    // 1. Hide the "✎ Edit Stats" buttons — text-matched.
    var btns = document.querySelectorAll('button');
    var matchedAny = false;
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var t = (b.textContent || '').trim();
      if (t === '✎ Edit Stats' || t.indexOf('✎ Edit Stats') >= 0) {
        if (!b.classList.contains('v140-edit-stats-hidden')) {
          b.classList.add('v140-edit-stats-hidden');
          matchedAny = true;
          // Inject a Delete User sibling using the row's apiKey if we can
          // find it in the surrounding DOM.
          injectDeleteUserButton(b);
        }
      }
    }
    return matchedAny;
  }

  // Walk up from the Edit Stats button to find the user-card container,
  // then try to find the apiKey + admin flag.
  function injectDeleteUserButton(editBtn) {
    var actionRow = editBtn.parentNode;
    if (!actionRow) return;
    if (actionRow.querySelector('.v140-delete-user-btn')) return;

    // Walk up to find the surrounding user card (it contains both the
    // apiKey-prefix span and the "Admin"/"Active" badges).
    var card = actionRow;
    var apiKey = null;
    var isAdmin = false;
    for (var depth = 0; depth < 8 && card; depth++) {
      var txt = card.textContent || '';
      // apiKey appears somewhere in the card as "<22-char-prefix>..." per
      // popup.bundle.js line 33084 (user.ApiKey.slice(0,22)+'...').
      var m = txt.match(/[A-Za-z0-9_-]{16,}/);
      if (m) apiKey = m[0];
      // Admin badge is rendered as the literal text "Admin" only when
      // user.AdminAccess is true.
      if (/(?:^|\s)Admin(?:\s|$)/m.test(txt) && /Active|Inactive/.test(txt)) isAdmin = true;
      if (apiKey) break;
      card = card.parentNode;
    }
    if (!apiKey) return;

    // 🗑 Delete User
    var del = document.createElement('button');
    del.className = 'v140-delete-user-btn';
    del.type = 'button';
    del.textContent = '🗑 Delete User';
    del.title = isAdmin
      ? 'Refuses on admins — revoke admin first'
      : 'Permanently delete this user (apiKey + their channel + their AI config)';
    del.addEventListener('click', function () { confirmDeleteUser(apiKey, isAdmin); });
    actionRow.appendChild(del);

    // 🔓 Revoke Admin (only on admin rows)
    if (isAdmin) {
      var rev = document.createElement('button');
      rev.className = 'v140-revoke-admin-btn';
      rev.type = 'button';
      rev.textContent = '🔓 Revoke Admin';
      rev.title = 'Demote this user from admin to regular user';
      rev.addEventListener('click', function () { confirmRevokeAdmin(apiKey); });
      actionRow.appendChild(rev);
    }
  }

  function confirmRevokeAdmin(targetApiKey) {
    if (!getStored() || !api()) return;
    if (!window.confirm('REVOKE ADMIN from ' + targetApiKey.slice(0, 12) + '… ?\n\nThey will become a regular user. After this, you can Delete User them if you also want their account / channel removed.')) return;
    getStored()(['userApiKey']).then(function (s) {
      var apiKey = s.userApiKey || '';
      if (!apiKey) { alert('Not logged in.'); return; }
      api()({
        action: 'adminRevokeAdmin',
        apiKey: apiKey,
        targetApiKey: targetApiKey,
      }).then(function (resp) {
        if (resp && resp.success) {
          alert('Admin revoked.');
          var bar = findTabBar();
          if (bar) {
            var active = bar.querySelector('button');
            if (active) active.click();
          }
        } else {
          alert('Could not revoke: ' + ((resp && resp.message) || 'unknown'));
        }
      }).catch(function (e) {
        alert('Network error: ' + (e && e.message));
      });
    });
  }

  function confirmDeleteUser(targetApiKey, targetIsAdmin) {
    if (!getStored() || !api()) return;
    if (targetIsAdmin) {
      alert('This user is an admin. Click 🔓 Revoke Admin first, then Delete User.');
      return;
    }
    var msg = 'PERMANENTLY DELETE this user?\n\n' +
              'This removes their apiKey, their Kick channel from the streamer list, ' +
              'and their AI chat config + pool.\n\n' +
              'Admins cannot be deleted from here — only from the database.\n\n' +
              'apiKey: ' + targetApiKey.slice(0, 12) + '…';
    if (!window.confirm(msg)) return;
    getStored()(['userApiKey']).then(function (s) {
      var apiKey = s.userApiKey || '';
      if (!apiKey) { alert('Not logged in.'); return; }
      api()({
        action: 'adminDeleteUser',
        apiKey: apiKey,
        targetApiKey: targetApiKey,
      }).then(function (resp) {
        if (resp && resp.success) {
          alert('Deleted. Removed: ' + JSON.stringify(resp.summary || {}));
          // Trigger admin panel refresh by clicking the active tab.
          var bar = findTabBar();
          if (bar) {
            var active = bar.querySelector('button');
            if (active) active.click();
          }
        } else {
          alert('Could not delete: ' + ((resp && resp.message) || 'unknown'));
        }
      }).catch(function (e) {
        alert('Network error: ' + (e && e.message));
      });
    });
  }

  // Periodically re-decorate (admin panel re-renders on tab switches).
  function tickAdminEnhancements() {
    ensurePointsTab();
    decorateAdminUserRows();
  }

  function start() {
    var attempts = 0;
    var t = setInterval(function () {
      tickAdminEnhancements();
      if (++attempts > 600) clearInterval(t);  // give up after ~10 min
    }, 1000);
    // Also on click anywhere — covers React tab switches.
    document.addEventListener('click', function () {
      setTimeout(tickAdminEnhancements, 200);
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
