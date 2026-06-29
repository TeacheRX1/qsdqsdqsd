/* ================================================================
 *  ER Debug Logger UI — floating button in the popup that:
 *    • Shows a count of captured entries (and how many are errors).
 *    • Lets you DOWNLOAD the full log buffer as a JSON file you can
 *      share for diagnosis.
 *    • Lets you VIEW the last 200 entries inline (quick triage).
 *    • Lets you CLEAR the buffer (start fresh before reproducing a bug).
 *    • Lets you COPY the last 200 entries to clipboard as plain text.
 *
 *  Loaded only from popup.html (this file is harmless in other contexts
 *  but only the popup mounts the UI). Does not depend on the React
 *  bundle — uses raw DOM so it can't break the existing app.
 * ================================================================ */
(function () {
  if (typeof window === 'undefined') return;
  if (window.__erLoggerUiInstalled) return;
  window.__erLoggerUiInstalled = true;

  // Only render in the popup (chrome-extension:// pages).
  try {
    if (location.protocol !== 'chrome-extension:') return;
  } catch (e) { return; }

  var LOG_KEY = '_erDebugLog';

  function $(tag, props) {
    var el = document.createElement(tag);
    if (props) {
      for (var k in props) {
        if (k === 'style') el.style.cssText = props[k];
        else if (k === 'text') el.textContent = props[k];
        else if (k === 'html') el.innerHTML = props[k];
        else el.setAttribute(k, props[k]);
      }
    }
    return el;
  }

  function fmtTs(ms) {
    try {
      var d = new Date(ms);
      var hh = String(d.getHours()).padStart(2, '0');
      var mm = String(d.getMinutes()).padStart(2, '0');
      var ss = String(d.getSeconds()).padStart(2, '0');
      var sss = String(d.getMilliseconds()).padStart(3, '0');
      return hh + ':' + mm + ':' + ss + '.' + sss;
    } catch (e) { return String(ms); }
  }

  function readLog(cb) {
    try {
      chrome.storage.local.get([LOG_KEY], function (s) {
        cb((s && Array.isArray(s[LOG_KEY])) ? s[LOG_KEY] : []);
      });
    } catch (e) { cb([]); }
  }

  function downloadLog() {
    if (window.erLogger && typeof window.erLogger.flushNow === 'function') {
      try { window.erLogger.flushNow(); } catch (e) {}
    }
    // Give the flush a moment, then download.
    setTimeout(function () {
      readLog(function (arr) {
        var meta = {
          exportedAt: new Date().toISOString(),
          userAgent:  (navigator && navigator.userAgent) || '',
          entries:    arr.length,
          errors:     arr.filter(function (e) { return e && e.lvl === 'error'; }).length,
          warnings:   arr.filter(function (e) { return e && e.lvl === 'warn';  }).length,
        };
        var payload = JSON.stringify({ meta: meta, log: arr }, null, 2);
        try {
          var blob = new Blob([payload], { type: 'application/json' });
          var url  = URL.createObjectURL(blob);
          var a    = $('a', {
            href: url,
            download: 'er-debug-log-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json'
          });
          document.body.appendChild(a);
          a.click();
          setTimeout(function () {
            try { URL.revokeObjectURL(url); } catch (e) {}
            try { a.remove(); } catch (e) {}
          }, 1000);
        } catch (e) {
          // Fallback: open in new tab so user can save manually.
          var w = window.open('', '_blank');
          if (w) { w.document.body.innerText = payload; }
        }
      });
    }, 250);
  }

  function clearLog() {
    if (!confirm('Clear the debug log buffer? This cannot be undone.')) return;
    try {
      chrome.storage.local.remove([LOG_KEY], function () {
        refreshBadge();
        showViewer();
      });
    } catch (e) {}
  }

  function copyLastEntries() {
    readLog(function (arr) {
      var slice = arr.slice(-200);
      var txt = slice.map(function (e) {
        return fmtTs(e.t) + ' [' + (e.ctx || '?') + '] ' + (e.lvl || 'log').toUpperCase() + ' — ' + (e.msg || '');
      }).join('\n');
      try {
        navigator.clipboard.writeText(txt).then(function () {
          flash('Copied ' + slice.length + ' entries');
        }, function () { flash('Copy failed'); });
      } catch (e) { flash('Copy failed'); }
    });
  }

  function flash(msg) {
    var f = $('div', {
      style: 'position:fixed;left:50%;top:14px;transform:translateX(-50%);background:#222;color:#fff;padding:6px 12px;border-radius:6px;font:600 12px/1.4 -apple-system,Segoe UI,sans-serif;z-index:2147483647;box-shadow:0 4px 14px rgba(0,0,0,.5);',
      text: msg
    });
    document.body.appendChild(f);
    setTimeout(function () { try { f.remove(); } catch (e) {} }, 1500);
  }

  // ── floating button ──────────────────────────────────────────
  var btn;
  function ensureButton() {
    if (btn && document.body.contains(btn)) return;
    btn = $('button', {
      id: 'er-debug-log-btn',
      title: 'Open ER Debug Log',
      style:
        'position:fixed;right:10px;bottom:10px;z-index:2147483646;' +
        'background:#0f1418;color:#00ff88;border:1px solid #00ff88;border-radius:18px;' +
        'padding:7px 12px;font:700 11px/1 -apple-system,Segoe UI,sans-serif;cursor:pointer;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.5);user-select:none;'
    });
    btn.textContent = '🪲 Debug Log';
    btn.addEventListener('click', showViewer);
    document.body.appendChild(btn);
  }

  function refreshBadge() {
    readLog(function (arr) {
      ensureButton();
      var errs = 0, warns = 0;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] && arr[i].lvl === 'error') errs++;
        else if (arr[i] && arr[i].lvl === 'warn') warns++;
      }
      var label = '🪲 Debug Log (' + arr.length + ')';
      if (errs) label += ' • ' + errs + ' err';
      btn.textContent = label;
      // Tint the border red if there are recent errors.
      btn.style.borderColor = errs ? '#ff5050' : (warns ? '#ffb84d' : '#00ff88');
      btn.style.color       = errs ? '#ff8080' : (warns ? '#ffd28a' : '#00ff88');
    });
  }

  // ── viewer modal ─────────────────────────────────────────────
  function showViewer() {
    var old = document.getElementById('er-debug-log-modal');
    if (old) { try { old.remove(); } catch (e) {} }

    var overlay = $('div', {
      id: 'er-debug-log-modal',
      style:
        'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.78);' +
        'display:flex;align-items:center;justify-content:center;padding:20px;'
    });
    var panel = $('div', {
      style:
        'width:min(900px,100%);max-height:88vh;background:#0c1116;border:1px solid #1f2a33;' +
        'border-radius:10px;display:flex;flex-direction:column;overflow:hidden;color:#e6edf3;' +
        'font:13px/1.45 -apple-system,Segoe UI,sans-serif;box-shadow:0 14px 50px rgba(0,0,0,.65);'
    });
    var head = $('div', {
      style:
        'display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #1c2630;' +
        'background:#0f161c;'
    });
    head.appendChild($('div', {
      style: 'font-weight:700;color:#00ff88;font-size:14px;',
      text:  '🪲 ER Debug Log'
    }));
    var sub = $('div', { id: 'er-debug-log-sub', style: 'flex:1;color:#7d8a96;font-size:12px;', text: 'loading…' });
    head.appendChild(sub);

    function mkBtn(label, color, handler) {
      var b = $('button', {
        style:
          'background:transparent;color:' + color + ';border:1px solid ' + color + ';' +
          'border-radius:6px;padding:5px 10px;font-weight:600;cursor:pointer;font-size:12px;'
      });
      b.textContent = label;
      b.addEventListener('click', handler);
      return b;
    }
    head.appendChild(mkBtn('⬇ Download', '#00ff88', downloadLog));
    head.appendChild(mkBtn('Copy last 200', '#7dd3fc', copyLastEntries));
    head.appendChild(mkBtn('Clear', '#ff8080', clearLog));
    head.appendChild(mkBtn('Close', '#9aa6b2', function () { overlay.remove(); }));

    var filterRow = $('div', {
      style:
        'display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid #1c2630;' +
        'background:#0a0f14;'
    });
    var search = $('input', {
      type: 'text', placeholder: 'Filter (substring, case-insensitive)…',
      style:
        'flex:1;background:#0c1116;border:1px solid #1c2630;color:#e6edf3;border-radius:6px;' +
        'padding:6px 10px;font-size:12px;outline:none;'
    });
    filterRow.appendChild(search);
    var onlyErrors = $('label', { style: 'display:flex;align-items:center;gap:6px;font-size:12px;color:#9aa6b2;cursor:pointer;' });
    var cbErr = $('input', { type: 'checkbox' });
    onlyErrors.appendChild(cbErr);
    onlyErrors.appendChild(document.createTextNode('errors/warnings only'));
    filterRow.appendChild(onlyErrors);

    var body = $('div', {
      style:
        'flex:1;overflow:auto;padding:8px 12px;background:#0a0f14;font:11.5px/1.45 ui-monospace,Consolas,monospace;' +
        'color:#cfd8e3;white-space:pre-wrap;word-break:break-word;'
    });

    function render() {
      readLog(function (arr) {
        sub.textContent = arr.length + ' entries  •  ' +
          arr.filter(function (e) { return e && e.lvl === 'error'; }).length + ' errors  •  ' +
          arr.filter(function (e) { return e && e.lvl === 'warn';  }).length + ' warnings';
        var q = (search.value || '').toLowerCase();
        var errOnly = !!cbErr.checked;
        var filt = arr.filter(function (e) {
          if (!e) return false;
          if (errOnly && e.lvl !== 'error' && e.lvl !== 'warn') return false;
          if (!q) return true;
          var hay = (e.ctx + ' ' + e.lvl + ' ' + e.msg).toLowerCase();
          return hay.indexOf(q) !== -1;
        });
        // Show last 800 of the filtered set so the DOM stays snappy.
        var view = filt.slice(-800);
        var html = view.map(function (e) {
          var color =
            e.lvl === 'error' ? '#ff7676' :
            e.lvl === 'warn'  ? '#ffb84d' :
            e.lvl === 'info'  ? '#7dd3fc' :
            e.lvl === 'event' ? '#a5f3a5' : '#cfd8e3';
          var line =
            '<span style="color:#5b6b78">' + fmtTs(e.t) + '</span> ' +
            '<span style="color:#8fa1b3">[' + (e.ctx || '?') + ']</span> ' +
            '<span style="color:' + color + ';font-weight:700">' + (e.lvl || 'log').toUpperCase() + '</span> ' +
            esc(e.msg || '');
          return '<div>' + line + '</div>';
        }).join('');
        if (filt.length > view.length) {
          html = '<div style="color:#5b6b78">… showing last ' + view.length + ' of ' + filt.length + ' matching ' +
                 (q || errOnly ? '(filtered)' : '') + ' entries …</div>' + html;
        }
        body.innerHTML = html || '<div style="color:#5b6b78">(no entries match the filter)</div>';
        body.scrollTop = body.scrollHeight;
      });
    }
    function esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    search.addEventListener('input', render);
    cbErr.addEventListener('change', render);

    panel.appendChild(head);
    panel.appendChild(filterRow);
    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
    render();
  }

  function start() {
    ensureButton();
    refreshBadge();
    // Live-refresh badge as new entries arrive.
    try {
      if (chrome && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(function (changes, area) {
          if (area !== 'local') return;
          if (changes && changes[LOG_KEY]) refreshBadge();
        });
      }
    } catch (e) {}
    // Periodic safety net for the badge in case the storage event listener is throttled.
    setInterval(refreshBadge, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
