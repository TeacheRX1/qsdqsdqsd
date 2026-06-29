// ================================================================
//  Legends Extension — v3.0  "I'M LIVE" button
// ----------------------------------------------------------------
//  Adds a single red/green button to the popup header. The flow:
//
//    1. Streamer clicks I'M LIVE while popup is open.
//    2. Extension calls server `goLive` with the user's apiKey.
//    3. Server validates (heartbeat fresh? Kick says is_live=true?)
//       and announces the slug in LiveAnnouncements.
//    4. Every 30 s while the popup is open we re-fetch
//       getMyLiveStatus and update the colour.
//    5. The background worker also polls getAnnouncedLive every
//       30 s for the FORCE-OPEN side of the contract; that part
//       lives in background.worker.js (`liveAnnouncePoll`).
//
//  No build step / no bundler — plain old script tag in popup.html.
//  Uses window.legendsV140.callApi() which is loaded earlier.
// ================================================================

(function () {
  'use strict';

  if (window.__imLiveBtnLoaded) return;
  window.__imLiveBtnLoaded = true;

  var POLL_MS = 30 * 1000;
  var _pollTimer = null;
  var _btn = null;
  var _stateLabel = null;
  var _statusLine = null;
  var _busy = false;

  function _readyApi() {
    return !!(window.legendsV140 && typeof window.legendsV140.callApi === 'function');
  }

  function _waitForApi(cb) {
    if (_readyApi()) return cb();
    var n = 0;
    var t = setInterval(function () {
      if (_readyApi() || ++n > 200) {  // ~10 s max
        clearInterval(t);
        if (_readyApi()) cb();
      }
    }, 50);
  }

  function _api(body) {
    return window.legendsV140.callApi(body);
  }

  function _getApiKey() {
    return window.legendsV140.getStored(['userApiKey']).then(function (s) {
      return (s && s.userApiKey) || '';
    });
  }

  function _setBtnState(state, info) {
    if (!_btn || !_stateLabel || !_statusLine) return;
    // state: 'off' | 'on' | 'loading'
    _btn.classList.remove('im-live-on', 'im-live-off', 'im-live-loading');
    if (state === 'on') {
      _btn.classList.add('im-live-on');
      _stateLabel.textContent = 'LIVE';
      _btn.title = 'You are announced as live. Click to go offline.';
    } else if (state === 'loading') {
      _btn.classList.add('im-live-loading');
      _stateLabel.textContent = '…';
    } else {
      _btn.classList.add('im-live-off');
      _stateLabel.textContent = 'I\'M LIVE';
      _btn.title = 'Click when you start streaming. Server will broadcast your tab to all bots.';
    }
    if (info && info.message) {
      _statusLine.textContent = info.message;
      _statusLine.style.display = 'block';
    } else if (info && info.clear) {
      _statusLine.textContent = '';
      _statusLine.style.display = 'none';
    }
  }

  function _refreshStatus() {
    return _getApiKey().then(function (apiKey) {
      if (!apiKey) {
        _setBtnState('off', { message: 'Set your apiKey first.' });
        return;
      }
      return _api({ action: 'getMyLiveStatus', apiKey: apiKey }).then(function (r) {
        if (!r) return;  // network blip
        if (r.isAnnounced && r.isLive) {
          var viewers = r.viewerCount ? (' · ' + r.viewerCount + ' viewers') : '';
          _setBtnState('on', { message: 'live as @' + (r.slug || '?') + viewers });
        } else {
          _setBtnState('off', { clear: true });
        }
      });
    });
  }

  function _onClick() {
    if (_busy) return;
    _busy = true;
    _setBtnState('loading');
    _getApiKey().then(function (apiKey) {
      if (!apiKey) {
        _busy = false;
        _setBtnState('off', { message: 'Set your apiKey first.' });
        return;
      }
      // If currently on -> turn off; else -> go live.
      var goingLive = _btn.classList.contains('im-live-off') || _btn.classList.contains('im-live-loading');
      var action = goingLive ? 'goLive' : 'goOffline';
      return _api({ action: action, apiKey: apiKey }).then(function (r) {
        _busy = false;
        if (!r) {
          _setBtnState('off', { message: 'network error — try again' });
          return;
        }
        if (r.success && action === 'goLive') {
          _setBtnState('on', { message: 'live as @' + (r.slug || '?') });
        } else if (r.success && action === 'goOffline') {
          _setBtnState('off', { message: 'stopped' });
          setTimeout(function () { _setBtnState('off', { clear: true }); }, 3000);
        } else {
          _setBtnState('off', { message: (r && r.message) || 'failed' });
        }
        // Whichever happened, always do a follow-up status read to
        // make sure UI matches server truth.
        setTimeout(_refreshStatus, 1500);
      });
    }).catch(function () {
      _busy = false;
      _setBtnState('off', { message: 'error — try again' });
    });
  }

  function _injectMarkup() {
    if (document.getElementById('im-live-btn')) return;
    var host = document.querySelector('.user-info-bar') || document.body;

    var wrap = document.createElement('div');
    wrap.className = 'im-live-wrap';
    wrap.innerHTML =
      '<button type="button" id="im-live-btn" class="im-live-btn im-live-off">' +
      '  <span class="im-live-dot"></span>' +
      '  <span id="im-live-state" class="im-live-state">I\'M LIVE</span>' +
      '</button>' +
      '<div id="im-live-status" class="im-live-status" style="display:none"></div>';

    // Place at top of body so it never gets covered by other panels.
    document.body.insertBefore(wrap, document.body.firstChild);

    _btn        = wrap.querySelector('#im-live-btn');
    _stateLabel = wrap.querySelector('#im-live-state');
    _statusLine = wrap.querySelector('#im-live-status');
    _btn.addEventListener('click', _onClick);
  }

  function _start() {
    _injectMarkup();
    _refreshStatus();
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(_refreshStatus, POLL_MS);
  }

  // DOM-ready or already-ready.
  function _ready(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(fn, 0);
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  _ready(function () {
    _waitForApi(_start);
  });
})();
