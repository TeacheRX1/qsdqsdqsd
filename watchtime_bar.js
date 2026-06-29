// ================================================================
//  Legends Extension — v3.0  24-hour watchtime bar (admin renderer)
// ----------------------------------------------------------------
//  Reusable helper for rendering a 24-cell horizontal bar that
//  shows when (UTC hour bucket) a given user was tabbing for a
//  given day.
//
//  v3.0 update — the bar is NO LONGER auto-mounted in the main
//  popup body. It is now drawn only inside the admin "Streamer
//  Points" page (one strip per user, alongside their daily points).
//  legends_v140_admin.js calls window.WatchtimeBar.renderInto(...)
//  for each user row.
//
//  Server data source: aichatPointsByUser now returns a 24-int
//  array `hours` per user (seconds tabbed in that UTC hour). If a
//  user has no per-hour data yet (legacy rows), the bar shows as
//  all empty cells.
// ================================================================
(function () {
  'use strict';
  if (window.WatchtimeBar) return;

  function _formatHms(seconds) {
    var s = Math.max(0, Math.floor(seconds));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var ss = s % 60;
    if (h > 0) return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
    if (m > 0) return m + 'm ' + (ss < 10 ? '0' : '') + ss + 's';
    return ss + 's';
  }

  function _level(seconds) {
    if (seconds <= 0)      return 0;
    if (seconds < 5  * 60) return 1;   // <5 min
    if (seconds < 20 * 60) return 2;   // <20 min
    if (seconds < 40 * 60) return 3;   // <40 min
    return 4;                          // 40-60 min (almost full hour)
  }

  // Render a 24-cell strip into `container` populated from
  // `hoursArray` (length 24, seconds per UTC hour). Existing
  // children of `container` are replaced. `opts.highlightNow` (bool)
  // highlights the current UTC hour. `opts.day` (YYYY-MM-DD) is
  // shown in cell tooltips.
  function renderInto(container, hoursArray, opts) {
    if (!container) return;
    opts = opts || {};
    var arr = Array.isArray(hoursArray) ? hoursArray : [];
    while (arr.length < 24) arr.push(0);
    var nowUtcHour = (new Date()).getUTCHours();
    container.innerHTML = '';
    container.className = (container.className || '') + ' wt-24h-bar wt-24h-bar-admin';
    var total = 0;
    for (var h = 0; h < 24; h++) {
      var secs = Math.max(0, Math.floor(Number(arr[h]) || 0));
      total += secs;
      var cell = document.createElement('div');
      var lvl = _level(secs);
      cell.className = 'wt-cell lvl-' + lvl + (opts.highlightNow && h === nowUtcHour ? ' is-now' : '');
      var hh = (h < 10 ? '0' : '') + h;
      cell.setAttribute('data-label', hh + ':00 — ' + _formatHms(secs));
      cell.title = hh + ':00 UTC · ' + _formatHms(secs);
      container.appendChild(cell);
    }
    return { totalSeconds: total };
  }

  window.WatchtimeBar = {
    renderInto: renderInto,
    formatHms:  _formatHms,
    level:      _level,
  };
})();
