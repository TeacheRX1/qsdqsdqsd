/* ================================================================
 *  ER Debug Logger — v1.0
 *  Captures errors and key decisions from every extension context
 *  (service worker, content scripts, popup) into a rolling buffer
 *  in chrome.storage.local under `_erDebugLog`. The popup exposes
 *  a "Download Debug Log" button (see legends_v140.js) that pulls
 *  this buffer down as a JSON file you can share for diagnosis.
 *
 *  Design goals:
 *    - Zero-config: just require it before everything else.
 *    - Failure-proof: never throws into caller code.
 *    - No console recursion: wraps console.log/warn/error/info but
 *      ALWAYS delegates to the originals after capture.
 *    - Bounded memory: keeps at most LOG_MAX entries (oldest dropped).
 *    - Survives service-worker restarts: persisted to storage.
 *
 *  Public API (attached to globalThis/self/window):
 *    erLog(tag, data)         — record a structured event entry
 *    erLogger.flushNow()      — flush pending entries to storage now
 *    erLogger.getLog(cb)      — read the full buffer (cb(arr))
 *    erLogger.clear(cb)       — clear the buffer
 * ================================================================ */
(function () {
  var GLOB = (typeof self !== 'undefined') ? self
           : (typeof globalThis !== 'undefined') ? globalThis
           : (typeof window !== 'undefined') ? window : {};

  if (GLOB.__erLoggerInstalled) return;
  GLOB.__erLoggerInstalled = true;

  var LOG_KEY     = '_erDebugLog';
  var LOG_MAX     = 3000;     // entries kept across restarts
  var FLUSH_MS    = 1500;     // batch writes to storage every 1.5s
  var FLUSH_AT    = 80;       // ...or when pending hits this size

  function _detectCtx() {
    try {
      // Service worker (MV3 background) — has no `document`.
      if (typeof document === 'undefined') return 'sw';
      var loc = (typeof location !== 'undefined') ? location : null;
      if (loc && loc.protocol === 'chrome-extension:') return 'popup';
      if (loc && loc.hostname) {
        if (loc.hostname.indexOf('kick.com') !== -1) {
          var p = (loc.pathname || '').replace(/\/$/, '').split('/')[1] || '';
          return p ? ('kick:' + p.slice(0, 30).toLowerCase()) : 'kick';
        }
        if (loc.hostname.indexOf('twitch.tv') !== -1) {
          var pt = (loc.pathname || '').replace(/\/$/, '').split('/')[1] || '';
          return pt ? ('twitch:' + pt.slice(0, 30).toLowerCase()) : 'twitch';
        }
        return loc.hostname;
      }
    } catch (e) {}
    return 'unknown';
  }

  var CTX = _detectCtx();

  // ── safe stringify ─────────────────────────────────────────────
  function _safeStr(v, depth) {
    if (v == null) return String(v);
    var t = typeof v;
    if (t === 'string') return v;
    if (t === 'number' || t === 'boolean') return String(v);
    if (t === 'function') return '[function]';
    if (depth == null) depth = 0;
    if (depth > 2) return '[…]';
    try {
      if (v instanceof Error) {
        return 'Error: ' + (v.message || '') + (v.stack ? ('\n' + String(v.stack).split('\n').slice(0, 6).join('\n')) : '');
      }
      // Avoid huge dumps for DOM/Tab objects.
      if (typeof v === 'object') {
        if (typeof v.nodeType === 'number') return '[DOM ' + (v.nodeName || '?') + ']';
        var seen = new WeakSet();
        return JSON.stringify(v, function (k, val) {
          if (val && typeof val === 'object') {
            if (seen.has(val)) return '[circ]';
            seen.add(val);
          }
          if (typeof val === 'function') return '[fn]';
          if (typeof val === 'bigint') return val.toString() + 'n';
          return val;
        });
      }
    } catch (e) { /* fall through */ }
    try { return String(v); } catch (e2) { return '<unserializable>'; }
  }

  function _formatArgs(args) {
    var out = [];
    for (var i = 0; i < args.length; i++) out.push(_safeStr(args[i]));
    var joined = out.join(' ');
    // Cap individual entries so a giant payload can't blow storage.
    if (joined.length > 4000) joined = joined.slice(0, 4000) + '…[+' + (joined.length - 4000) + 'B]';
    return joined;
  }

  // ── pending buffer + storage flush ─────────────────────────────
  var _pending  = [];
  var _flushing = false;
  var _timer    = null;

  function _scheduleFlush() {
    if (_timer) return;
    _timer = setTimeout(function () { _timer = null; _flush(); }, FLUSH_MS);
  }

  function _flush() {
    if (_flushing || !_pending.length) return;
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    _flushing = true;
    var batch = _pending.splice(0, _pending.length);
    try {
      chrome.storage.local.get([LOG_KEY], function (s) {
        var arr = (s && Array.isArray(s[LOG_KEY])) ? s[LOG_KEY] : [];
        if (arr.length + batch.length > LOG_MAX) {
          arr = arr.slice(arr.length + batch.length - LOG_MAX);
        }
        for (var i = 0; i < batch.length; i++) arr.push(batch[i]);
        try {
          var setPayload = {};
          setPayload[LOG_KEY] = arr;
          chrome.storage.local.set(setPayload, function () { _flushing = false; });
        } catch (e) { _flushing = false; }
      });
    } catch (e) { _flushing = false; }
  }

  function _push(level, args) {
    try {
      var entry = {
        t:   Date.now(),
        ctx: CTX,
        lvl: level,
        msg: _formatArgs(args || [])
      };
      _pending.push(entry);
      if (_pending.length >= FLUSH_AT) _flush();
      else _scheduleFlush();
    } catch (e) { /* never throw out of logger */ }
  }

  // ── wrap console ───────────────────────────────────────────────
  var _origConsole = {};
  ['log', 'warn', 'error', 'info', 'debug'].forEach(function (lvl) {
    var orig = (typeof console !== 'undefined' && console[lvl]) ? console[lvl].bind(console) : function () {};
    _origConsole[lvl] = orig;
    try {
      console[lvl] = function () {
        try { _push(lvl, arguments); } catch (e) {}
        try { orig.apply(console, arguments); } catch (e) {}
      };
    } catch (e) {}
  });

  // ── capture unhandled errors / rejections ──────────────────────
  try {
    if (GLOB && typeof GLOB.addEventListener === 'function') {
      GLOB.addEventListener('error', function (ev) {
        try {
          var info = {
            kind:    'window.error',
            message: ev && ev.message,
            file:    ev && ev.filename,
            line:    ev && ev.lineno,
            col:     ev && ev.colno,
            stack:   ev && ev.error && ev.error.stack
          };
          _push('error', ['[unhandled]', info]);
        } catch (e) {}
      });
      GLOB.addEventListener('unhandledrejection', function (ev) {
        try {
          var r = ev && ev.reason;
          _push('error', ['[unhandled-rejection]', r]);
        } catch (e) {}
      });
    }
  } catch (e) {}

  // ── chrome.runtime.lastError observer (best-effort) ────────────
  // Many chrome.* callbacks set chrome.runtime.lastError silently. We
  // can't intercept those globally, but at least extensions usually log
  // them — and our console wrapper captures those logs.

  // ── public API ────────────────────────────────────────────────
  var api = {
    flushNow: _flush,
    log: function () { _push('event', arguments); },
    getLog: function (cb) {
      try {
        chrome.storage.local.get([LOG_KEY], function (s) {
          cb && cb((s && s[LOG_KEY]) || []);
        });
      } catch (e) { cb && cb([]); }
    },
    clear: function (cb) {
      _pending.length = 0;
      try {
        chrome.storage.local.remove([LOG_KEY], function () { cb && cb(); });
      } catch (e) { cb && cb(); }
    }
  };
  try { GLOB.erLogger = api; } catch (e) {}
  try { GLOB.erLog = function (tag, data) { _push('event', [tag, data]); }; } catch (e) {}

  // Initial breadcrumb so we always see when each context loaded.
  _push('info', ['[erLogger] installed in', CTX, 'at', new Date().toISOString()]);
})();
