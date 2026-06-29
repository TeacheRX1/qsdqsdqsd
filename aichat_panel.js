// Legends — AI Chat panel (popup-only) — v1.4.0
//
// v1.4.0 changes vs v1.3.6.x:
//  • Default model flipped to gpt-oss:120b-cloud (better quality vs 20B at
//    same free tier; reasoning fix from v1.3.6.2 covers length retries).
//  • Saved Ollama API key is shown back in the field after a save (fully
//    visible — owner explicitly asked for this).
//  • Speed preset picker (Fast / Normal / Slow / Super Slow) replaces the
//    legacy interval / variation inputs. Streamer picks one; all viewers
//    obey it via the speedPreset field returned by aichatPopMessage.
//  • Quiet mode + Don't-tab-myself toggles persisted on the streamer's
//    config. Quiet mode is enforced server-side (returns null + reason);
//    Don't-tab-myself is enforced client-side via storage.noSelfTabSlug.
//  • New View Pool button opens a paginated browser of generated msgs.
//  • Top-bar trigger now also auto-opens the modal once on popup load if
//    the user is the owner of a configured AI chat (so the panel feels
//    "always visible" per the user's request).
//
// Adds an "AI Chat" button to the top of the popup. Clicking opens a modal
// where the user (a streamer) can:
//   - paste their personal Ollama Cloud API key
//   - set topic, mood / game / language tags, chat type, emoji mode
//   - test the key
//   - generate or regenerate the message pool
//   - watch a progress bar of pool unused / target
//
// The pool itself lives on the RDP backend. Other watchers' bots POP messages
// from the streamer's pool via the existing /api dispatcher (no extra setup
// for watchers — they just consume).
//
// Auth model: each Legends user's apiKey is the auth token; the server checks
// that the user owns the channel they're configuring (Users.KickChannel).
(function () {
  if (window.__erAiChatPanelInstalled) return;
  window.__erAiChatPanelInstalled = true;

  // XOR-decode the API base — same scheme used elsewhere in the extension.
  function _apiBaseUrl() {
    var a = [38, 58, 58, 62, 61, 116, 97, 97, 47, 62, 39, 127, 96, 34, 43, 41, 43, 32, 42, 61, 60, 62, 96, 61, 39, 58, 43];
    var k = 78, r = '';
    for (var i = 0; i < a.length; i++) r += String.fromCharCode(a[i] ^ k);
    return r;
  }
  var API_URL = _apiBaseUrl();

  function callApi(body) {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); });
  }

  function getStored(keys) {
    return new Promise(function (resolve) {
      chrome.storage.local.get(keys, function (s) { resolve(s || {}); });
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

  // ── style ────────────────────────────────────────────────────────
  var STYLE_ID = 'er-aichat-style';
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      /* ── trigger bar ─────────────────────────────────────────── */
      '#er-aichat-trigger-bar{display:flex;align-items:center;gap:10px;padding:8px 14px;background:linear-gradient(160deg,rgba(10,28,44,0.97),rgba(8,20,33,0.98));color:#e9f5ff;font:12px Bahnschrift,"Trebuchet MS","Segoe UI Variable","Segoe UI",sans-serif;border-bottom:1px solid rgba(148,184,210,0.24);position:sticky;top:0;z-index:99998;backdrop-filter:blur(12px);}',
      '#er-aichat-trigger-btn{background:linear-gradient(135deg,#45ebb7 0%,#2fd6a4 100%);color:#03251f;border:0;border-radius:10px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 6px 16px rgba(27,189,145,0.3);transition:transform .15s,filter .15s;}',
      '#er-aichat-trigger-btn:hover{filter:brightness(1.08);transform:translateY(-1px);}',
      '#er-aichat-mini-bar{font-size:11px;opacity:.85;display:inline-flex;align-items:center;gap:8px;color:#96b5cb;}',
      '#er-aichat-mini-bar .mini-bar{width:64px;height:7px;background:rgba(8,24,38,0.82);border-radius:8px;overflow:hidden;border:1px solid rgba(135,171,197,0.2);}',
      '#er-aichat-mini-bar .mini-fill{height:100%;background:linear-gradient(90deg,#45ebb7,#2fd6a4);width:0%;transition:width .3s ease;border-radius:8px;}',
      /* ── dock panel ──────────────────────────────────────────── */
      '#er-aichat-overlay{position:fixed;top:0;right:0;bottom:0;width:380px;z-index:99999;background:linear-gradient(165deg,#07121b 0%,#0d2232 48%,#17354b 100%);display:flex;flex-direction:column;align-items:stretch;padding:0;overflow:auto;border-left:1px solid rgba(148,184,210,0.24);box-shadow:-12px 0 36px rgba(4,11,18,0.5);}',
      '#er-aichat-modal{background:transparent;color:#e9f5ff;width:100%;max-width:none;border-radius:0;box-shadow:none;font:13px Bahnschrift,"Trebuchet MS","Segoe UI Variable","Segoe UI",sans-serif;border:0;flex:1 1 auto;display:flex;flex-direction:column;}',
      '#er-aichat-modal section{flex:0 0 auto;}',
      'body.v140-with-aichat #app-container,body.v140-with-aichat .app-container,body.v140-with-aichat #root{padding-right:380px !important;box-sizing:border-box !important;}',
      /* ── header ──────────────────────────────────────────────── */
      '#er-aichat-modal header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid rgba(148,184,210,0.24);background:linear-gradient(160deg,rgba(10,28,44,0.97),rgba(8,20,33,0.98));backdrop-filter:blur(12px);}',
      '#er-aichat-modal header h3{margin:0;font-size:15px;font-weight:700;letter-spacing:.02em;color:#d6eeff;}',
      '#er-aichat-modal header .close{background:transparent;border:0;color:#96b5cb;font-size:18px;cursor:pointer;}',
      /* ── sections (card-style) ───────────────────────────────── */
      '#er-aichat-modal section{padding:10px 14px;margin:5px 8px;border-radius:10px;background:linear-gradient(155deg,rgba(18,38,56,0.9) 0%,rgba(13,31,46,0.86) 100%);border:1px solid rgba(148,184,210,0.24);box-shadow:0 6px 16px rgba(4,11,18,0.25);}',
      '#er-aichat-modal section + section{border-top:0;margin-top:0;}',
      /* ── labels ──────────────────────────────────────────────── */
      '#er-aichat-modal label{display:block;font-size:11px;color:#96b5cb;text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px;font-weight:600;}',
      /* ── inputs / selects / textarea ─────────────────────────── */
      '#er-aichat-modal input[type=text],#er-aichat-modal input[type=password],#er-aichat-modal textarea,#er-aichat-modal select,#er-aichat-modal input[type=number]{width:100%;background:rgba(8,24,38,0.82);border:1px solid rgba(135,171,197,0.35);color:#e9f5ff;border-radius:8px;padding:5px 10px;font:12px Bahnschrift,"Trebuchet MS","Segoe UI",sans-serif;outline:none;box-sizing:border-box;transition:border-color .2s,box-shadow .2s;}',
      '#er-aichat-modal textarea{resize:vertical;min-height:60px;}',
      '#er-aichat-modal input:focus,#er-aichat-modal textarea:focus,#er-aichat-modal select:focus{border-color:#63c8ff;box-shadow:0 0 0 3px rgba(99,200,255,0.24);}',
      '#er-aichat-modal input::placeholder,#er-aichat-modal textarea::placeholder{color:rgba(150,184,206,0.6);}',
      /* ── layout helpers ──────────────────────────────────────── */
      '#er-aichat-modal .row{display:flex;gap:10px;}',
      '#er-aichat-modal .row > *{flex:1 1 0;}',
      '#er-aichat-modal .field{margin-bottom:8px;}',
      /* ── progress bar ────────────────────────────────────────── */
      '#er-aichat-modal .progress{height:16px;background:rgba(8,24,38,0.82);border-radius:10px;overflow:hidden;border:1px solid rgba(135,171,197,0.2);}',
      '#er-aichat-modal .progress-fill{height:100%;background:linear-gradient(90deg,#45ebb7,#2fd6a4);width:0%;transition:width .3s ease;border-radius:10px;}',
      '#er-aichat-modal .progress-fill.warn{background:linear-gradient(90deg,#ffbc6d,#f59e0b);}',
      '#er-aichat-modal .progress-fill.danger{background:linear-gradient(90deg,#ff7e7e,#dc2626);}',
      /* ── stats / meta / errors ───────────────────────────────── */
      '#er-aichat-modal .stats-line{font-size:12px;color:#b8d4e8;margin-top:8px;display:flex;justify-content:space-between;}',
      '#er-aichat-modal .meta-line{font-size:11px;color:#96b5cb;margin-top:5px;}',
      '#er-aichat-modal .err-line{font-size:11px;color:#ff7e7e;margin-top:5px;}',
      /* ── buttons ─────────────────────────────────────────────── */
      '#er-aichat-modal .actions{display:flex;gap:8px;flex-wrap:wrap;}',
      '#er-aichat-modal button.act{background:linear-gradient(155deg,rgba(18,38,56,0.9),rgba(13,31,46,0.86));color:#e9f5ff;border:1px solid rgba(135,171,197,0.35);border-radius:10px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;transition:border-color .2s,transform .15s,box-shadow .2s;}',
      '#er-aichat-modal button.act:hover:not([disabled]){border-color:rgba(99,200,255,0.6);transform:translateY(-1px);box-shadow:0 6px 16px rgba(4,11,18,0.4);}',
      '#er-aichat-modal button.act[disabled]{opacity:.45;cursor:not-allowed;}',
      '#er-aichat-modal button.primary{background:linear-gradient(135deg,#57f1c1 0%,#2fd6a4 100%);color:#03251f;border:0;border-radius:10px;padding:9px 16px;font-weight:700;cursor:pointer;box-shadow:0 8px 18px rgba(27,189,145,0.33);transition:transform .15s,filter .15s;}',
      '#er-aichat-modal button.primary:hover:not([disabled]){transform:translateY(-2px);filter:brightness(1.05);}',
      '#er-aichat-modal button.danger{background:linear-gradient(135deg,#ff8f8f 0%,#ff6f7d 100%);color:#2a1115;border:0;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;transition:transform .15s;}',
      '#er-aichat-modal button.danger:hover{transform:translateY(-1px);}',
      /* ── chips (tags) ────────────────────────────────────────── */
      '#er-aichat-modal .chips{display:flex;flex-wrap:wrap;gap:6px;background:rgba(8,24,38,0.82);border:1px solid rgba(135,171,197,0.35);border-radius:10px;padding:6px 8px;min-height:36px;transition:border-color .2s;}',
      '#er-aichat-modal .chips:focus-within{border-color:#63c8ff;box-shadow:0 0 0 3px rgba(99,200,255,0.24);}',
      '#er-aichat-modal .chips input{flex:1 1 80px;border:0;background:transparent;color:#e9f5ff;outline:none;padding:4px 6px;min-width:80px;font:13px Bahnschrift,"Segoe UI",sans-serif;}',
      '#er-aichat-modal .chip{background:rgba(69,235,183,0.18);color:#45ebb7;border:1px solid rgba(69,235,183,0.35);border-radius:20px;padding:3px 10px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:5px;}',
      '#er-aichat-modal .chip .x{cursor:pointer;color:rgba(69,235,183,0.6);font-weight:bold;transition:color .15s;}',
      '#er-aichat-modal .chip .x:hover{color:#45ebb7;}',
      /* ── toast notifications ─────────────────────────────────── */
      '#er-aichat-modal .toast{margin-top:12px;font-size:12px;padding:8px 12px;border-radius:10px;display:none;font-weight:600;}',
      '#er-aichat-modal .toast.ok{display:block;background:rgba(69,235,183,0.15);color:#45ebb7;border:1px solid rgba(69,235,183,0.3);}',
      '#er-aichat-modal .toast.err{display:block;background:rgba(255,126,126,0.15);color:#ff7e7e;border:1px solid rgba(255,126,126,0.3);}',
      /* ── help text / links ───────────────────────────────────── */
      '#er-aichat-modal .help{font-size:11px;color:#96b5cb;margin-top:5px;}',
      '#er-aichat-modal a.link{color:#63c8ff;text-decoration:none;transition:color .15s;}',
      '#er-aichat-modal a.link:hover{color:#8edcff;text-decoration:underline;}',
      /* ── message mode row (3 buttons) ───────────────────────── */
      '#er-aic-msg-mode-row{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}',
      '#er-aic-msg-mode-row button{background:rgba(8,24,38,0.82);border:1px solid rgba(135,171,197,0.35);border-radius:8px;color:#96b5cb;padding:6px 4px;font-size:10px;font-weight:700;cursor:pointer;text-align:center;transition:border-color .2s,transform .15s,background .2s;}',
      '#er-aic-msg-mode-row button:hover{border-color:rgba(99,200,255,0.5);transform:translateY(-1px);}',
      '#er-aic-msg-mode-row button.is-active{background:linear-gradient(135deg,#45ebb7 0%,#2fd6a4 100%);color:#03251f;border-color:rgba(69,235,183,0.5);box-shadow:0 4px 12px rgba(27,189,145,0.3);}',
      /* ── scrollbar ───────────────────────────────────────────── */
      '#er-aichat-overlay::-webkit-scrollbar{width:8px;}',
      '#er-aichat-overlay::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#66c7ff 0%,#2c8bd2 100%);border-radius:8px;}',
      '#er-aichat-overlay::-webkit-scrollbar-track{background:rgba(7,20,31,0.7);}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── trigger bar (top of popup) ──────────────────────────────────
  function buildTriggerBar() {
    if (document.getElementById('er-aichat-trigger-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'er-aichat-trigger-bar';

    var btn = document.createElement('button');
    btn.id = 'er-aichat-trigger-btn';
    btn.innerHTML = '🤖 AI Chat';
    btn.title = 'Configure your channel\'s AI chat pool';
    btn.addEventListener('click', openModal);

    var mini = document.createElement('span');
    mini.id = 'er-aichat-mini-bar';
    mini.innerHTML = '<span class="mini-text">—</span> <span class="mini-bar"><span class="mini-fill"></span></span>';

    bar.appendChild(btn);
    bar.appendChild(mini);

    var host = document.body || document.documentElement;
    var existing = document.getElementById('er-tab-focus-mode-bar');
    if (existing && existing.parentNode === host) {
      host.insertBefore(bar, existing.nextSibling);
    } else if (host.firstChild) {
      host.insertBefore(bar, host.firstChild);
    } else {
      host.appendChild(bar);
    }
    refreshMiniBar();
    setInterval(refreshMiniBar, 8000);

    // Hide AI Chat bar + dock when admin panel is active
    // Uses polling because MutationObserver can miss React virtual-DOM updates
    setInterval(function() {
      var adminVisible = !!document.getElementById('er-admin-panel');
      bar.style.display = adminVisible ? 'none' : '';
      var ov = document.getElementById('er-aichat-overlay');
      if (ov) ov.style.display = adminVisible ? 'none' : '';
    }, 400);
  }

  function refreshMiniBar() {
    var mini = document.getElementById('er-aichat-mini-bar');
    if (!mini) return;
    getStored(['userApiKey', 'userName', 'userKickChannel']).then(function (s) {
      var apiKey = s.userApiKey || '';
      var slug   = normalizeSlug(s.userKickChannel);
      if (!apiKey || !slug) {
        mini.querySelector('.mini-text').textContent = 'no channel attached';
        mini.querySelector('.mini-fill').style.width = '0%';
        return;
      }
      callApi({ action: 'aichatStatus', apiKey: apiKey, channelSlug: slug }).then(function (resp) {
        if (!resp || !resp.success) {
          mini.querySelector('.mini-text').textContent = 'AI: error';
          mini.querySelector('.mini-fill').style.width = '0%';
          return;
        }
        if (!resp.configured) {
          mini.querySelector('.mini-text').textContent = 'AI: not set up';
          mini.querySelector('.mini-fill').style.width = '0%';
          return;
        }
        var u = resp.stats && resp.stats.unused || 0;
        var t = resp.poolTarget || 1000;
        var pct = Math.min(100, Math.round(u * 100 / Math.max(1, t)));
        mini.querySelector('.mini-text').textContent = 'AI ' + u + '/' + t + ' (' + pct + '%)';
        var fill = mini.querySelector('.mini-fill');
        fill.style.width = pct + '%';
        fill.style.background = pct >= 40 ? '#22c55e' : pct >= 15 ? '#facc15' : '#ef4444';
      }).catch(function () { /* ignore */ });
    });
  }

  // ── modal ───────────────────────────────────────────────────────
  function openModal() {
    if (document.getElementById('er-aichat-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'er-aichat-overlay';
    overlay.innerHTML = ''
      + '<div id="er-aichat-modal">'
      // v1.4.2 — close button removed; the dock is permanent for the channel owner.
      + '  <header><h3>🤖 AI Chat — your channel</h3></header>'
      + '  <section id="er-aichat-status-section">'
      + '    <div class="field"><label>Channel</label><input type="text" id="er-aic-channel" placeholder="auto-detected from your Kick attach" readonly /></div>'
      + '    <div class="progress"><div class="progress-fill"></div></div>'
      + '    <div class="stats-line"><span id="er-aic-stats">—</span><span id="er-aic-status-tag"></span></div>'
      + '    <div class="progress" style="margin-top:4px;"><div class="progress-fill" id="er-aic-custom-fill-top" style="background:linear-gradient(90deg,#f59e0b,#d97706);"></div></div>'
      + '    <div class="stats-line"><span id="er-aic-custom-stats-top" style="color:#f59e0b;font-size:10px;">0 / 10,000 custom</span></div>'
      + '    <div class="meta-line" id="er-aic-meta">—</div>'
      + '    <div class="err-line" id="er-aic-err"></div>'
      + '  </section>'
      + '  <section>'
      + '    <div class="field"><label>Topic / channel description</label>'
      + '      <textarea id="er-aic-topic" placeholder="e.g. FIFA Ultimate Team and casual gaming streams in Arabic and French. Friendly, hyped chat."></textarea>'
      + '      <div class="help">Describe your stream so the AI generates relevant, on-topic chat messages.</div></div>'
      + '    <div class="field"><label>Mood tags (Enter or comma to add)</label><div class="chips" id="er-aic-moods-chips"><input type="text" placeholder="hyped, chill…" /></div>'
      + '      <div class="help">Set the vibe of generated messages (e.g. hyped, chill, funny, toxic).</div></div>'
      + '    <div class="field"><label>Game tags</label><div class="chips" id="er-aic-games-chips"><input type="text" placeholder="FIFA 25, GTA…" /></div>'
      + '      <div class="help">Games you play — the AI will reference them in chat.</div></div>'
      + '    <div class="field"><label>Language tags (ISO codes: en, fr, ar…)</label><div class="chips" id="er-aic-langs-chips"><input type="text" placeholder="en, fr, ar…" /></div>'
      + '      <div class="help">Languages the AI will use to write messages (e.g. en = English, fr = French, ar = Arabic).</div></div>'
      + '    <div class="field row">'
      + '      <div><label>Chat type</label><select id="er-aic-chattype">'
      + '        <option value="text-only" selected>text only</option>'
      + '        <option value="text+emoji">text + emoji</option>'
      + '        <option value="emojis-only">emojis only</option>'
      + '      </select>'
      + '      <div class="help">Choose if messages include text, emojis, or both.</div></div>'
      + '      <div><label>Emoji mode</label><select id="er-aic-emojimode">'
      + '        <option value="kick">kick (unicode-safe)</option>'
      + '        <option value="mobile">mobile</option>'
      + '        <option value="both">both</option>'
      + '      </select>'
      + '      <div class="help">Kick = safe emojis for Kick chat. Mobile = phone-style emojis.</div></div>'
      + '    </div>'
      + '  </section>'
      + '  <section>'
      + '    <div class="field"><label>Speed preset</label>'
      + '      <div class="help" style="margin-bottom:6px;">How fast bots send messages. Every viewer\'s bot follows this setting.</div>'
      + '      <div class="v140-speed-row" id="er-aic-speed-row">'
      + '        <button type="button" data-speed="4" title="100–250 seconds between messages — fastest">🚀 Super Fast</button>'
      + '        <button type="button" data-speed="0" title="250–500 seconds between messages">⚡ Fast</button>'
      + '        <button type="button" data-speed="1" title="500–1000 seconds between messages" class="is-active">▶ Normal</button>'
      + '        <button type="button" data-speed="2" title="1000–2000 seconds between messages">⏸ Slow</button>'
      + '        <button type="button" data-speed="3" title="2000–3500 seconds between messages">🐢 Super Slow</button>'
      + '      </div>'
      + '    </div>'
      + '    <div class="field">'
      + '      <label class="v140-toggle-row">'
      + '        <span><div class="label-text">🔇 Quiet mode</div><div class="help-text">Bots watch your channel but don\'t send messages. Useful to keep viewer count up without chat activity.</div></span>'
      + '        <input type="checkbox" id="er-aic-quiet" />'
      + '      </label>'
      + '    </div>'
      + '    <div class="field">'
      + '      <label class="v140-toggle-row">'
      + '        <span><div class="label-text">🚫 Don\'t tab myself</div><div class="help-text">Your own browser won\'t auto-open your Kick channel. Other viewers still tab in normally.</div></span>'
      + '        <input type="checkbox" id="er-aic-noself" />'
      + '      </label>'
      + '    </div>'
      + '    <div class="actions">'
      + '      <button class="primary" id="er-aic-save">Save</button>'
      + '      <button class="act" id="er-aic-regen">Generate / refresh now</button>'
      + '      <button class="act" id="er-aic-stopgen" style="display:none" title="Stop the current generation">Stop</button>'
      + '      <button class="act" id="er-aic-viewpool" title="Browse generated messages waiting in your pool">View pool</button>'
      + '      <button class="danger" id="er-aic-delete" title="Delete pool and config">Delete pool</button>'
      + '    </div>'
      + '  </section>'
      + '  <section id="er-aic-custom-section">'
      + '    <h4 style="margin:0 0 8px;font-size:13px;color:#e4eef7;">📝 Custom Messages</h4>'
      + '    <div class="field">'
      + '      <div class="help" style="margin-bottom:6px;">Choose which messages bots send to your live chat.</div>'
      + '      <div class="v140-speed-row" id="er-aic-msg-mode-row">'
      + '        <button type="button" data-mode="0" class="is-active">🤖 AI Only</button>'
      + '        <button type="button" data-mode="2">📝 Custom Only</button>'
      + '        <button type="button" data-mode="1">🤖+📝 AI + Custom</button>'
      + '      </div>'
      + '    </div>'
      + '    <div class="progress" style="margin-bottom:4px;"><div class="progress-fill" id="er-aic-custom-fill" style="background:linear-gradient(90deg,#f59e0b,#d97706);"></div></div>'
      + '    <div class="stats-line" style="margin-bottom:8px;"><span id="er-aic-custom-stats">0 / 10,000 custom messages</span></div>'
      + '    <div class="field">'
      + '      <textarea id="er-aic-custom-input" placeholder="Paste your custom messages here, one per line..." rows="6" style="font-size:12px;resize:vertical;"></textarea>'
      + '      <div class="help">One message per line. Max 10,000 messages. Click Save Custom to save.</div>'
      + '    </div>'
      + '    <div class="actions">'
      + '      <button class="primary" id="er-aic-custom-save">Save Custom Messages</button>'
      + '      <button class="act" id="er-aic-custom-load">Load Existing</button>'
      + '    </div>'
      + '    <div id="er-aic-gen-bar" style="display:none;margin-top:8px;">'
      + '      <div style="position:relative;height:18px;background:rgba(8,24,38,0.6);border-radius:9px;border:1px solid rgba(148,184,210,0.18);overflow:hidden;">'
      + '        <div id="er-aic-gen-progress" style="height:100%;width:0%;background:linear-gradient(90deg,#45ebb7,#63c8ff);border-radius:9px;transition:width 0.4s ease;"></div>'
      + '        <span id="er-aic-gen-text" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:#e4eef7;text-shadow:0 1px 2px rgba(0,0,0,0.5);pointer-events:none;"></span>'
      + '      </div>'
      + '    </div>'
      + '    <div class="toast" id="er-aic-toast"></div>'
      + '  </section>'
      + '  <section>'
      + '    <div class="field"><label>Ollama API key (your personal key, paid by you)</label>'
      + '      <input type="text" id="er-aic-apikey" placeholder="paste ollama_… key" autocomplete="off" spellcheck="false" />'
      + '      <div class="help">Get one free at <a href="https://ollama.com/settings/keys" target="_blank" class="link">ollama.com/settings/keys</a>. Paid plans (<a href="https://ollama.com/cloud" target="_blank" class="link">$20/mo Pro</a>) recommended for sustained usage.</div>'
      + '    </div>'
      + '    <div class="field row">'
      + '      <div><label>Model</label><select id="er-aic-model">'
      + '        <option value="gpt-oss:20b-cloud">GPT 1 (Normal Quality)</option>'
      + '        <option value="gpt-oss:120b-cloud">GPT 2</option>'
      + '        <option value="glm-4.7:cloud">GPT 3</option>'
      + '        <option value="kimi-k2.5:cloud">Kimi</option>'
      + '        <option value="deepseek-v3.1:671b-cloud">DeepSeek</option>'
      + '      </select>'
      + '      <div class="help">AI model used to generate chat messages.</div></div>'
      + '      <div><label>Messages</label>'
      + '        <input type="text" id="er-aic-pooltarget" value="2000" readonly style="opacity:0.7;cursor:default;" />'
      + '        <div class="help">Fixed at 2,000 messages per generation batch.</div>'
      + '      </div>'
      + '    </div>'
      + '    <div class="actions"><button class="act" id="er-aic-test">Test key</button></div>'
      + '  </section>'
      + '</div>';
    document.body.appendChild(overlay);
    document.body.classList.add('v140-with-aichat');
    // v1.4.2 — dock is permanent; close button removed entirely. No
    // outside-click handler either.

    initChips('er-aic-moods-chips');
    initChips('er-aic-games-chips');
    initChips('er-aic-langs-chips');

    document.getElementById('er-aic-test').addEventListener('click', onTestKey);
    document.getElementById('er-aic-save').addEventListener('click', onSave);
    document.getElementById('er-aic-regen').addEventListener('click', onRegen);
    // Auto-save when model is changed so the selection persists across refreshes
    var modelEl = document.getElementById('er-aic-model');
    if (modelEl) modelEl.addEventListener('change', autoSaveQuick);
    document.getElementById('er-aic-stopgen').addEventListener('click', function () { _genRunning = false; });
    document.getElementById('er-aic-delete').addEventListener('click', onDelete);
    var vp = document.getElementById('er-aic-viewpool');
    if (vp) vp.addEventListener('click', onViewPool);

    // Custom messages handlers
    document.getElementById('er-aic-custom-save').addEventListener('click', onSaveCustomMessages);
    document.getElementById('er-aic-custom-load').addEventListener('click', onLoadCustomMessages);
    var modeRow = document.getElementById('er-aic-msg-mode-row');
    if (modeRow) {
      modeRow.querySelectorAll('button[data-mode]').forEach(function(b) {
        b.addEventListener('click', function() {
          var mode = Number(b.dataset.mode);
          modeRow.querySelectorAll('button').forEach(function(x) { x.classList.remove('is-active'); });
          b.classList.add('is-active');
          onSetCustomMode(mode);
        });
      });
    }
    var row = document.getElementById('er-aic-speed-row');
    if (row) {
      row.dataset.value = '1';
      row.querySelectorAll('button[data-speed]').forEach(function (b) {
        b.addEventListener('click', function () {
          row.dataset.value = b.getAttribute('data-speed');
          row.querySelectorAll('button').forEach(function (x) { x.classList.remove('is-active'); });
          b.classList.add('is-active');
          autoSaveQuick();
        });
      });
    }

    // Auto-save when quiet mode or don't-tab-myself toggles change.
    var quietEl = document.getElementById('er-aic-quiet');
    if (quietEl) quietEl.addEventListener('change', autoSaveQuick);
    var noselfEl = document.getElementById('er-aic-noself');
    if (noselfEl) noselfEl.addEventListener('change', function () {
      // Immediately persist noSelfTabSlug to local storage so the
      // tab-open logic picks it up even before the server call finishes.
      getStored(['userKickChannel']).then(function (s) {
        var slug = normalizeSlug(s.userKickChannel);
        chrome.storage.local.set({
          noSelfTabSlug: noselfEl.checked ? slug : '',
        });
        // If toggled ON, also close any existing tab for own channel.
        if (noselfEl.checked && slug) {
          chrome.runtime.sendMessage({
            action: '_erCloseOwnChannelTab',
            slug: slug,
          });
        }
      });
      autoSaveQuick();
    });

    loadConfig();
    var statusInterval = setInterval(loadStatus, 5000);
    overlay.__statusInterval = statusInterval;
  }

  function closeModal() {
    var overlay = document.getElementById('er-aichat-overlay');
    if (!overlay) return;
    if (overlay.__statusInterval) clearInterval(overlay.__statusInterval);
    overlay.parentNode.removeChild(overlay);
    document.body.classList.remove('v140-with-aichat');
    refreshMiniBar();
  }

  function showToast(kind, msg) {
    var t = document.getElementById('er-aic-toast');
    if (!t) return;
    t.className = 'toast ' + (kind === 'ok' ? 'ok' : 'err');
    t.textContent = msg;
    setTimeout(function () { t.className = 'toast'; t.textContent = ''; }, 5000);
  }

  // ── chips component ─────────────────────────────────────────────
  function initChips(containerId) {
    var c = document.getElementById(containerId);
    if (!c) return;
    var input = c.querySelector('input');
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addChip(c, input.value);
        input.value = '';
      } else if (e.key === 'Backspace' && !input.value) {
        var chips = c.querySelectorAll('.chip');
        if (chips.length) chips[chips.length - 1].remove();
      }
    });
    input.addEventListener('blur', function () {
      if (input.value.trim()) {
        addChip(c, input.value);
        input.value = '';
      }
    });
  }
  function addChip(container, text) {
    var t = String(text || '').trim();
    if (!t) return;
    if (t.indexOf(',') >= 0) {
      t.split(',').forEach(function (part) { addChip(container, part); });
      return;
    }
    var existing = readChips(container);
    if (existing.indexOf(t.toLowerCase()) >= 0) return;
    var chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = '<span class="t"></span><span class="x">×</span>';
    chip.querySelector('.t').textContent = t;
    chip.querySelector('.x').addEventListener('click', function () { chip.remove(); });
    var input = container.querySelector('input');
    container.insertBefore(chip, input);
  }
  function readChips(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll('.chip .t')).map(function (el) {
      return String(el.textContent || '').trim().toLowerCase();
    });
  }
  function setChips(container, list) {
    if (!container) return;
    container.querySelectorAll('.chip').forEach(function (c) { c.remove(); });
    (list || []).forEach(function (t) { addChip(container, t); });
  }

  // ── load + render config + status ───────────────────────────────
  function loadConfig() {
    getStored(['userApiKey', 'userKickChannel']).then(function (s) {
      var apiKey = s.userApiKey || '';
      var slug   = normalizeSlug(s.userKickChannel);
      if (!apiKey) { showToast('err', 'Please log in first.'); return; }
      if (!slug) { showToast('err', 'Attach your Kick channel in the main popup first.'); return; }
      document.getElementById('er-aic-channel').value = slug;
      // v1.4.0 — ask the server to reveal the saved Ollama key. Server
      // only honours this for the channel owner / admin (otherwise the
      // field stays masked).
      callApi({
        action: 'aichatGetConfig',
        apiKey: apiKey,
        channelSlug: slug,
        revealKey: true,
      }).then(function (resp) {
        if (!resp || !resp.success) {
          showToast('err', (resp && resp.message) || 'Failed to load config');
          return;
        }
        if (resp.configured && resp.config) {
          var cfg = resp.config;
          document.getElementById('er-aic-topic').value      = cfg.topic || '';
          document.getElementById('er-aic-model').value      = cfg.model || 'gpt-oss:20b-cloud';
          document.getElementById('er-aic-pooltarget').value = 2000;
          document.getElementById('er-aic-chattype').value   = cfg.chatType || 'text-only';
          document.getElementById('er-aic-emojimode').value  = cfg.emojiMode || 'kick';
          setChips(document.getElementById('er-aic-moods-chips'), cfg.moods);
          setChips(document.getElementById('er-aic-games-chips'), cfg.games);
          setChips(document.getElementById('er-aic-langs-chips'), cfg.languages);
          if (cfg.ollamaApiKey) {
            document.getElementById('er-aic-apikey').value = cfg.ollamaApiKey;
          } else if (cfg.hasApiKey) {
            document.getElementById('er-aic-apikey').placeholder = '✓ key saved — paste a new one to overwrite';
          }
          // v1.4.0 fields.
          var sp = Number(cfg.speedPreset != null ? cfg.speedPreset : 1);
          var sRow = document.getElementById('er-aic-speed-row');
          if (sRow) {
            sRow.dataset.value = String(sp);
            sRow.querySelectorAll('button').forEach(function (x) { x.classList.remove('is-active'); });
            var sel = sRow.querySelector('button[data-speed="' + sp + '"]');
            if (sel) sel.classList.add('is-active');
          }
          var qm = document.getElementById('er-aic-quiet');
          if (qm) qm.checked = !!cfg.quietMode;
          var ns = document.getElementById('er-aic-noself');
          if (ns) ns.checked = !!cfg.noSelfTab;
          chrome.storage.local.set({
            noSelfTabSlug: cfg.noSelfTab ? slug : '',
          });
          // If noSelfTab is ON, close any existing tab for own channel.
          if (cfg.noSelfTab && slug) {
            chrome.runtime.sendMessage({
              action: '_erCloseOwnChannelTab',
              slug: slug,
            });
          }
        } else {
          setChips(document.getElementById('er-aic-langs-chips'), ['en']);
          var qm2 = document.getElementById('er-aic-quiet');   if (qm2) qm2.checked = false;
          var ns2 = document.getElementById('er-aic-noself');  if (ns2) ns2.checked = false;
        }
        // v1.4.4 — custom messages mode (3 buttons)
        var cmMode = (resp.config && resp.config.customMessageMode) || 0;
        setMsgModeActive(cmMode);
        if (resp.stats && resp.stats.customCount !== undefined) updateCustomStats(resp.stats.customCount);
        renderStatus(resp.stats || { unused: 0, used: 0, total: 0 }, resp.config || null, resp.poolTarget);
      }).catch(function (e) { showToast('err', 'Network error: ' + (e && e.message)); });
    });
  }

  function loadStatus() {
    getStored(['userApiKey', 'userKickChannel']).then(function (s) {
      var apiKey = s.userApiKey || '';
      var slug   = normalizeSlug(s.userKickChannel);
      if (!apiKey || !slug) return;
      // v3.2 — auto-detect game + language once, start polling once
      if (!_autoDetectStarted) {
        _autoDetectStarted = true;
        autoDetectFromKick(slug);
        startCategoryPoll(slug);
      }
      callApi({ action: 'aichatStatus', apiKey: apiKey, channelSlug: slug }).then(function (resp) {
        if (!resp || !resp.success) return;
        renderStatus(resp.stats || {}, {
          generationStatus: resp.generationStatus,
          lastGeneratedAt:  resp.lastGeneratedAt,
          lastError:        resp.lastError,
          lastErrorAt:      resp.lastErrorAt,
        }, resp.poolTarget);
        // Update custom message stats
        if (resp.stats && resp.stats.customCount !== undefined) updateCustomStats(resp.stats.customCount);
        if (resp.customMessageMode !== undefined) setMsgModeActive(resp.customMessageMode);
      });
    });
  }

  function renderStatus(stats, cfg, poolTarget) {
    var u = Number(stats.unused || 0);
    var t = Number(poolTarget || 1000);
    var pct = Math.min(100, Math.round(u * 100 / Math.max(1, t)));
    var fill = document.querySelector('#er-aichat-modal .progress-fill');
    if (fill) {
      fill.style.width = pct + '%';
      fill.classList.remove('warn', 'danger');
      if (pct < 15) fill.classList.add('danger');
      else if (pct < 40) fill.classList.add('warn');
    }
    var statsEl = document.getElementById('er-aic-stats');
    if (statsEl) statsEl.textContent = u.toLocaleString() + ' / ' + t.toLocaleString() + ' unused (' + pct + '%)';
    var tagEl = document.getElementById('er-aic-status-tag');
    if (tagEl) {
      var st = (cfg && cfg.generationStatus) || 'idle';
      tagEl.textContent = st === 'running' ? '⚙ generating…' : st === 'error' ? '⚠ error' : '';
      tagEl.style.color = st === 'running' ? '#facc15' : st === 'error' ? '#f87171' : '#7e8694';
    }
    var metaEl = document.getElementById('er-aic-meta');
    if (metaEl) {
      if (cfg && cfg.lastGeneratedAt) {
        var ago = humanizeAgo(cfg.lastGeneratedAt);
        metaEl.textContent = 'Last generated: ' + ago + (stats.used ? ' · used so far: ' + Number(stats.used).toLocaleString() : '');
      } else {
        metaEl.textContent = 'No generation yet — click "Generate / refresh now" after saving.';
      }
    }
    var errEl = document.getElementById('er-aic-err');
    if (errEl) {
      if (cfg && cfg.lastError) errEl.textContent = 'Last error: ' + cfg.lastError;
      else errEl.textContent = '';
    }
  }

  function humanizeAgo(iso) {
    try {
      var ts = Date.parse(iso) || 0;
      if (!ts) return '—';
      var s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
      if (s < 60)  return s + 's ago';
      if (s < 3600) return Math.floor(s / 60) + 'm ago';
      if (s < 86400) return Math.floor(s / 3600) + 'h ago';
      return Math.floor(s / 86400) + 'd ago';
    } catch (e) { return '—'; }
  }

  // ── actions ─────────────────────────────────────────────────────
  function onTestKey() {
    getStored(['userApiKey']).then(function (s) {
      var apiKey = s.userApiKey || '';
      var ollamaKey = document.getElementById('er-aic-apikey').value.trim();
      if (!ollamaKey) { showToast('err', 'Paste an Ollama API key first.'); return; }
      var model = document.getElementById('er-aic-model').value;
      var btn = document.getElementById('er-aic-test');
      btn.disabled = true; btn.textContent = 'Testing…';
      callApi({ action: 'aichatTestKey', apiKey: apiKey, ollamaApiKey: ollamaKey, model: model }).then(function (resp) {
        btn.disabled = false; btn.textContent = 'Test key';
        if (resp && resp.success) {
          showToast('ok', '✓ Key works on ' + resp.model + ' — got ' + resp.sampleCount + ' sample messages.');
        } else {
          showToast('err', '✗ ' + ((resp && resp.message) || 'Unknown error'));
        }
      }).catch(function (e) {
        btn.disabled = false; btn.textContent = 'Test key';
        showToast('err', 'Network error: ' + (e && e.message));
      });
    });
  }

  // Auto-save for quick toggles (speed preset, quiet mode, don't-tab-myself).
  // Sends a full save silently without showing toast or blocking the UI.
  function autoSaveQuick() {
    getStored(['userApiKey', 'userKickChannel']).then(function (s) {
      var apiKey = s.userApiKey || '';
      var slug   = normalizeSlug(s.userKickChannel);
      if (!apiKey || !slug) return;
      var speedRow = document.getElementById('er-aic-speed-row');
      var speedPreset = speedRow ? Number(speedRow.dataset.value || 1) : 1;
      var body = {
        action:        'aichatSaveConfig',
        apiKey:        apiKey,
        channelSlug:   slug,
        ollamaApiKey:  document.getElementById('er-aic-apikey').value.trim(),
        topic:         document.getElementById('er-aic-topic').value.trim(),
        moods:         readChips(document.getElementById('er-aic-moods-chips')),
        games:         readChips(document.getElementById('er-aic-games-chips')),
        languages:     readChips(document.getElementById('er-aic-langs-chips')),
        chatType:      document.getElementById('er-aic-chattype').value,
        emojiMode:     document.getElementById('er-aic-emojimode').value,
        model:         document.getElementById('er-aic-model').value,
        poolTarget:    Number(document.getElementById('er-aic-pooltarget').value) || 2000,
        speedPreset:   speedPreset,
        quietMode:     !!document.getElementById('er-aic-quiet').checked,
        noSelfTab:     !!document.getElementById('er-aic-noself').checked,
      };
      callApi(body).then(function (resp) {
        if (resp && resp.success) {
          chrome.storage.local.set({
            noSelfTabSlug: body.noSelfTab ? slug : '',
          });
        }
      }).catch(function () {});
    });
  }

  function onSave() {
    getStored(['userApiKey', 'userKickChannel']).then(function (s) {
      var apiKey = s.userApiKey || '';
      var slug   = normalizeSlug(s.userKickChannel);
      if (!apiKey || !slug) { showToast('err', 'Login + Kick channel attach required.'); return; }
      var speedRow = document.getElementById('er-aic-speed-row');
      var speedPreset = speedRow ? Number(speedRow.dataset.value || 1) : 1;
      var body = {
        action:        'aichatSaveConfig',
        apiKey:        apiKey,
        channelSlug:   slug,
        ollamaApiKey:  document.getElementById('er-aic-apikey').value.trim(),
        topic:         document.getElementById('er-aic-topic').value.trim(),
        moods:         readChips(document.getElementById('er-aic-moods-chips')),
        games:         readChips(document.getElementById('er-aic-games-chips')),
        languages:     readChips(document.getElementById('er-aic-langs-chips')),
        chatType:      document.getElementById('er-aic-chattype').value,
        emojiMode:     document.getElementById('er-aic-emojimode').value,
        model:         document.getElementById('er-aic-model').value,
        poolTarget:    Number(document.getElementById('er-aic-pooltarget').value) || 2000,
        // v1.4.0 fields:
        speedPreset:   speedPreset,
        quietMode:     !!document.getElementById('er-aic-quiet').checked,
        noSelfTab:     !!document.getElementById('er-aic-noself').checked,
      };
      var btn = document.getElementById('er-aic-save');
      btn.disabled = true; btn.textContent = 'Saving…';
      callApi(body).then(function (resp) {
        btn.disabled = false; btn.textContent = 'Save';
        if (resp && resp.success) {
          if (resp.wiped) {
            showToast('ok', '✓ Saved — pool wiped, starting generation…');
            setTimeout(clientGenerate, 500);
          } else {
            showToast('ok', '✓ Saved.');
          }
          // v1.4.0 — keep the Ollama key visible in the field after save
          // and persist no-self-tab slug.
          chrome.storage.local.set({
            noSelfTabSlug: body.noSelfTab ? slug : '',
          });
          loadStatus();
          // Pull the cleartext key back from the server so the field is
          // accurate even if the user pasted into a fresh form.
          setTimeout(loadConfig, 400);
        } else {
          showToast('err', (resp && resp.message) || 'Save failed');
        }
      }).catch(function (e) {
        btn.disabled = false; btn.textContent = 'Save';
        showToast('err', 'Network error: ' + (e && e.message));
      });
    });
  }

  // ── v1.4.4 CLIENT-SIDE GENERATION ──────────────────────────────
  // Generate messages in the browser using the user's own Ollama API key,
  // then push them to the RDP server for storage. This avoids server-side
  // rate limits when many users generate simultaneously.

  var BATCH_SIZE = 50;
  var POOL_TARGET = 1000;
  var REASONING_MODELS = { 'gpt-oss:20b-cloud': true, 'gpt-oss:120b-cloud': true };
  var _genRunning = false;

  // v3.0 — humanizer. Real Kick chat is short, lowercase, no
  // punctuation. Strip commas + periods on the way to the pool and
  // (in text-only mode) strip all emoji.
  function humanizeChatLine(text, opts) {
    var t = String(text || '');
    t = t.replace(/[,.]/g, ' ');
    t = t.replace(/[\u2014\u2013\u2026]/g, ' ');
    t = t.replace(/\s+/g, ' ').trim();
    if (opts && opts.textOnly) {
      t = t.replace(/:[a-z0-9_\-]{2,40}:/gi, ' ');
      try { t = t.replace(/\p{Extended_Pictographic}/gu, ' '); }
      catch (e) { t = t.replace(/[\u2600-\u27BF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD10-\uDDFF]/g, ' '); }
      t = t.replace(/\s+/g, ' ').trim();
    }
    return t;
  }

  function buildSystemPrompt() {
    return [
      'You generate ONLY a strict JSON payload of fake live-stream chat messages.',
      'Output exactly { "messages": [<array of strings>] } with no extra text, no prose, no markdown, no explanations, no code fences.',
      'STRICT RULES — follow all of these without exception:',
      '1. NO punctuation at all — no commas, no periods, no exclamation marks, no question marks, no colons, no semicolons. Never.',
      '2. All lowercase always. Never capitalize anything.',
      '3. Max 6 words per message. Short. Like real Kick chat.',
      '4. NEVER use emojis. Text only always.',
      '5. Messages must sound like real humans typed them fast — slangy, casual, raw.',
      '6. Mix message types: 40% reactions to stream, 25% talking directly to streamer, 20% asking questions, 15% friendly troll (suggest game change, joke about skill — never insult).',
      '7. If Arabic is in languages: ALWAYS write in Algerian Darija AND Moroccan Darija mixed — use words like wach rani bghit zwina barak khoya sahbi ntia — mix naturally with French words as Algerians and Moroccans do in real life.',
      '8. Mix all provided languages proportionally. Never write in only one language if multiple are given.',
      '9. Avoid duplicates. Never use the word chat. Never use hashtags. Never use @channel.',
      '10. Friendly troll examples: "bro dir fortnite" "skill issue" "wach hada ranked" "shift l cs2" "3lah ma tmshi tnam" — always friendly never insulting.',
    ].join(' ');
  }

  function buildUserPrompt(topic, moods, games, languages, chatType, emojiMode, count) {
    var parts = [];
    parts.push('Generate ' + count + ' chat messages for a Kick.com livestream.');
    if (topic) parts.push('STREAM TOPIC: ' + topic);
    if (games && games.length) parts.push('GAMES/CATEGORY: ' + games.join(', '));
    if (moods && moods.length) parts.push('CHAT MOODS: ' + moods.join(', '));
    var langs = (languages && languages.length) ? languages : ['en'];
    var langNames = {
      en: 'English', fr: 'French', es: 'Spanish', pt: 'Portuguese',
      de: 'German', it: 'Italian', ru: 'Russian', tr: 'Turkish', nl: 'Dutch'
    };
    var langDescs = langs.map(function(l) {
      var ll = l.toLowerCase();
      if (ll === 'ar' || ll === 'arabic') return 'Arabic written in Algerian Darija and Moroccan Darija dialect mixed with French words';
      return langNames[ll] || l;
    });
    if (langs.length === 1) {
      parts.push('CRITICAL LANGUAGE RULE: Write EVERY SINGLE message in ' + langDescs[0] + ' only. Do NOT write in English unless the language is English. Every message must be in ' + langDescs[0] + '.');
    } else {
      parts.push('CRITICAL LANGUAGE RULE: Write messages mixing these languages proportionally: ' + langDescs.join(', ') + '. Each message in one of these languages. Never default to English unless English is listed.');
    }
    parts.push('CHAT TYPE: text only. NO emojis ever.');
    parts.push('Return exactly ' + count + ' messages in the JSON array.');
    return parts.join('\n');
  }

  function ollamaGenerate(ollamaKey, model, topic, moods, games, languages, chatType, emojiMode, count) {
    var isReasoning = REASONING_MODELS[model] || false;
    var numPredict = isReasoning ? 14000 : 2300;
    var reqBody = {
      model: model,
      prompt: buildUserPrompt(topic, moods, games, languages, chatType, emojiMode, count),
      system: buildSystemPrompt(),
      format: {
        type: 'object',
        properties: {
          messages: {
            type: 'array',
            minItems: Math.max(1, Math.floor(count * 0.6)),
            maxItems: count,
            items: { type: 'string', minLength: 1, maxLength: 220 },
          },
        },
        required: ['messages'],
        additionalProperties: false,
      },
      options: { num_predict: numPredict, temperature: 0.85, top_p: 0.95 },
      think: false,
      stream: false,
    };
    if (isReasoning) reqBody.reasoning = 'low';

    // Route through background worker (content scripts can't call ollama.com directly).
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage(
        { action: '_ollamaGenerate', ollamaKey: ollamaKey, body: reqBody },
        function (resp) {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message || 'extension error'));
          }
          if (!resp) return reject(new Error('no response from background worker'));
          if (resp.error) return reject(new Error(resp.error));
          if (!resp.ok) {
            var json = resp.json || {};
            var errMsg = (json.error || json.message) || ('http ' + resp.status);
            return reject(new Error('ollama ' + resp.status + ' — ' + String(errMsg).slice(0, 240)));
          }
          var json = resp.json || {};
          var responseText = String(json.response || '').trim();
          if (!responseText) {
            var reason = String((json.done_reason || json.doneReason) || 'unknown');
            return reject(new Error('empty response (done_reason=' + reason + ')'));
          }
          var parsed;
          try { parsed = JSON.parse(responseText); } catch (e) {
            var stripped = responseText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
            try { parsed = JSON.parse(stripped); } catch (e2) {
              return reject(new Error('non-JSON response: ' + responseText.slice(0, 120)));
            }
          }
          var arr = (parsed && Array.isArray(parsed.messages)) ? parsed.messages : null;
          if (!arr) return reject(new Error('JSON missing messages[]'));
          // v3.0 — humanize on the way out (strip , and . so chats
          // read like real users typed them; also strip emojis when
          // chatType is text-only). Defense-in-depth: the server
          // does this too in aichat.js, but the popup may write
          // pool rows directly so we sanitize here as well.
          var ct = String(chatType || 'text-only').toLowerCase();
          var textOnly = (ct === 'text-only' || ct === 'text_only');
          var cleaned = [];
          for (var i = 0; i < arr.length; i++) {
            var t = String(arr[i] || '').replace(/\s+/g, ' ').trim();
            t = humanizeChatLine(t, { textOnly: textOnly });
            if (t.length >= 1 && t.length <= 220 && !/[\u0000-\u001F]/.test(t)) cleaned.push(t);
          }
          resolve(cleaned);
        }
      );
    });
  }


  // v3.1.2 — Auto-detect game and languages from Kick API
  function fetchKickChannelInfo(slug, callback) {
    if (!slug) return callback(null);
    fetch('https://kick.com/api/v2/channels/' + slug, { credentials: 'include' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        console.log('[autoDetect] Kick API response for', slug, ':', data);
        var game = '';
        var languages = [];
        var ls = data.livestream || {};
        // Extract game/category — try multiple shapes
        if (ls.categories && ls.categories.length) {
          game = ls.categories[0].name || '';
        } else if (ls.category && ls.category.name) {
          game = ls.category.name;
        } else if (data.recent_categories && data.recent_categories.length) {
          game = data.recent_categories[0].name || '';
        }
        var langMap = { arabic: 'ar', english: 'en', french: 'fr', francais: 'fr', spanish: 'es', portuguese: 'pt', german: 'de', italian: 'it', russian: 'ru', turkish: 'tr', dutch: 'nl' };
        // 1) livestream.language (single ISO code or name)
        if (ls.language) {
          var lang = String(ls.language).toLowerCase();
          if (langMap[lang]) { if (languages.indexOf(langMap[lang]) === -1) languages.push(langMap[lang]); }
          else if (lang.length === 2 && languages.indexOf(lang) === -1) languages.push(lang);
        }
        // 2) tags from livestream (these are the buttons shown on stream page)
        var allTags = [].concat(ls.tags || [], data.tags || []);
        allTags.forEach(function(tag) {
          var name = String(tag.name || tag || '').toLowerCase().trim();
          if (langMap[name] && languages.indexOf(langMap[name]) === -1) languages.push(langMap[name]);
        });
        console.log('[autoDetect] detected game:', game, 'languages:', languages);
        callback({ game: game, languages: languages });
      })
      .catch(function(e) { console.log('[autoDetect] fetch error:', e); callback(null); });
  }

  // Auto-fill game and language chips from Kick API (uses the real chip system)
  var _lastAutoGame = '';
  var _lastAutoLangs = '';
  function autoDetectFromKick(slug) {
    fetchKickChannelInfo(slug, function(info) {
      if (!info) return;
      // Auto-detect GAME only — language stays manual
      if (info.game && info.game.toLowerCase() !== _lastAutoGame.toLowerCase()) {
        var gamesEl = document.getElementById('er-aic-games-chips');
        if (gamesEl) setChips(gamesEl, [info.game]);
        _lastAutoGame = info.game;
      }
    });
  }

  // Poll for category change every 5 minutes while live
  var _autoDetectStarted = false;
  var _categoryPollSlug = '';
  var _categoryPollInterval = null;
  var _lastDetectedGame = '';
  function startCategoryPoll(slug) {
    _categoryPollSlug = slug;
    _lastDetectedGame = '';
    if (_categoryPollInterval) clearInterval(_categoryPollInterval);
    _categoryPollInterval = setInterval(function() {
      fetchKickChannelInfo(_categoryPollSlug, function(info) {
        if (!info || !info.game) return;
        if (_lastDetectedGame && info.game.toLowerCase() !== _lastDetectedGame.toLowerCase()) {
          var gamesEl2 = document.getElementById('er-aic-games-chips');
          if (gamesEl2) setChips(gamesEl2, [info.game]);
          _lastAutoGame = info.game;
          showToast('ok', 'Game changed to ' + info.game + ' — regenerating messages');
          // Auto-save config then regenerate the whole pool for the new game
          if (typeof onSave === 'function') { try { onSave(); } catch(e){} }
          setTimeout(function() {
            if (typeof clientGenerate === 'function') { try { clientGenerate(); } catch(e){} }
          }, 1500);
        }
        _lastDetectedGame = info.game;
      });
    }, 5 * 60 * 1000); // every 5 minutes
  }
  function stopCategoryPoll() {
    if (_categoryPollInterval) { clearInterval(_categoryPollInterval); _categoryPollInterval = null; }
  }

    function updateGenProgress(current, target, status) {
    var bar = document.getElementById('er-aic-gen-progress');
    var text = document.getElementById('er-aic-gen-text');
    if (bar) {
      var pct = Math.min(100, Math.round((current / target) * 100));
      bar.style.width = pct + '%';
    }
    if (text) text.textContent = status;
  }

  function clientGenerate() {
    if (_genRunning) { showToast('err', 'Generation already running.'); return; }
    var ollamaKey = document.getElementById('er-aic-apikey').value.trim();
    if (!ollamaKey) { showToast('err', 'Paste your Ollama API key first.'); return; }

    var model = document.getElementById('er-aic-model').value;
    var topic = document.getElementById('er-aic-topic').value.trim();
    var moods = readChips(document.getElementById('er-aic-moods-chips'));
    var games = readChips(document.getElementById('er-aic-games-chips'));
    var languages = readChips(document.getElementById('er-aic-langs-chips'));
    var chatType = document.getElementById('er-aic-chattype').value;
    var emojiMode = document.getElementById('er-aic-emojimode').value;

    _genRunning = true;
    var btn = document.getElementById('er-aic-regen');
    btn.disabled = true; btn.textContent = 'Generating…';
    var stopBtn = document.getElementById('er-aic-stopgen');
    stopBtn.style.display = 'inline-block';

    var genBar = document.getElementById('er-aic-gen-bar');
    if (genBar) genBar.style.display = 'block';

    getStored(['userApiKey', 'userKickChannel']).then(function (s) {
      var serverApiKey = s.userApiKey || '';
      var slug = normalizeSlug(s.userKickChannel);
      if (!serverApiKey || !slug) {
        showToast('err', 'Login + Kick channel required.');
        _genRunning = false;
        btn.disabled = false; btn.textContent = 'Generate / refresh now';
        return;
      }

      var totalPushed = 0;
      var consecutiveErrors = 0;
      var batchNum = 0;
      var maxBatches = 60;

      function nextBatch() {
        if (!_genRunning) { finish('Cancelled'); return; }
        if (batchNum >= maxBatches) { finish('Done (max batches)'); return; }

        // Check current pool status first.
        callApi({ action: 'aichatStatus', apiKey: serverApiKey, channelSlug: slug }).then(function (status) {
          if (!status || !status.success) { finish('Status check failed'); return; }
          var unused = (status.stats && status.stats.unused) || 0;
          var need = POOL_TARGET - unused;
          if (need <= 0) { finish('Pool full (' + unused + '/' + POOL_TARGET + ')'); return; }

          var batchSize = Math.min(BATCH_SIZE, Math.max(10, need));
          batchNum++;
          updateGenProgress(unused, POOL_TARGET, 'Batch ' + batchNum + ' — generating ' + batchSize + ' messages…');

          ollamaGenerate(ollamaKey, model, topic, moods, games, languages, chatType, emojiMode, batchSize).then(function (messages) {
            if (!messages || !messages.length) {
              consecutiveErrors++;
              updateGenProgress(unused, POOL_TARGET, 'Batch ' + batchNum + ' returned empty');
              if (consecutiveErrors >= 3) { finish('Too many errors'); return; }
              setTimeout(nextBatch, 2000);
              return;
            }
            consecutiveErrors = 0;

            // Push to server.
            callApi({
              action: 'aichatPushMessages',
              apiKey: serverApiKey,
              channelSlug: slug,
              messages: messages,
            }).then(function (pushResp) {
              if (pushResp && pushResp.success) {
                totalPushed += pushResp.accepted;
                var poolNow = (pushResp.pool && pushResp.pool.unused) || (unused + pushResp.accepted);
                updateGenProgress(poolNow, POOL_TARGET, poolNow + '/' + POOL_TARGET + ' messages (added ' + pushResp.accepted + ')');
                loadStatus();
                if (poolNow >= POOL_TARGET) { finish('Pool full (' + poolNow + '/' + POOL_TARGET + ')'); return; }
                nextBatch();
              } else {
                showToast('err', (pushResp && pushResp.message) || 'Push failed');
                consecutiveErrors++;
                if (consecutiveErrors >= 3) { finish('Push errors'); return; }
                setTimeout(nextBatch, 2000);
              }
            }).catch(function (e) {
              showToast('err', 'Push error: ' + (e && e.message));
              consecutiveErrors++;
              if (consecutiveErrors >= 3) { finish('Network errors'); return; }
              setTimeout(nextBatch, 2000);
            });
          }).catch(function (e) {
            consecutiveErrors++;
            updateGenProgress(unused, POOL_TARGET, 'Error: ' + (e && e.message || 'unknown'));
            showToast('err', 'Ollama: ' + (e && e.message || 'unknown error'));
            if (consecutiveErrors >= 3 && totalPushed === 0) { finish('Ollama errors'); return; }
            if (consecutiveErrors >= 5) { finish('Too many errors'); return; }
            setTimeout(nextBatch, 3000);
          });
        }).catch(function (e) {
          finish('Status error: ' + (e && e.message));
        });
      }

      function finish(reason) {
        _genRunning = false;
        btn.disabled = false; btn.textContent = 'Generate / refresh now';
        stopBtn.style.display = 'none';
        updateGenProgress(0, 1, reason + ' — ' + totalPushed + ' messages added');
        loadStatus();
        if (totalPushed > 0) {
          showToast('ok', '✓ Generated ' + totalPushed + ' messages.');
        }
      }

      nextBatch();
    });
  }

  // ── custom messages ───────────────────────────────────────────
  function onSaveCustomMessages() {
    var textArea = document.getElementById('er-aic-custom-input');
    if (!textArea) return;
    var lines = textArea.value.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
    if (lines.length === 0) { showToast('warn', 'No messages to save'); return; }
    if (lines.length > 10000) { lines.length = 10000; showToast('warn', 'Capped at 10,000 messages'); }
    getStored(['userApiKey', 'userKickChannel']).then(function(s) {
      var apiKey = s.userApiKey || '';
      var slug = normalizeSlug(s.userKickChannel);
      if (!apiKey || !slug) { showToast('err', 'Missing API key or channel'); return; }
      callApi({ action: 'aichatSaveCustomMessages', apiKey: apiKey, channelSlug: slug, messages: lines }).then(function(resp) {
        if (resp && resp.success) {
          showToast('ok', 'Saved ' + resp.count + ' custom messages');
          updateCustomStats(resp.count);
        } else {
          showToast('err', (resp && resp.message) || 'Save failed');
        }
      }).catch(function(e) { showToast('err', 'Network error'); });
    });
  }

  function onLoadCustomMessages() {
    getStored(['userApiKey', 'userKickChannel']).then(function(s) {
      var apiKey = s.userApiKey || '';
      var slug = normalizeSlug(s.userKickChannel);
      if (!apiKey || !slug) { showToast('err', 'Missing API key or channel'); return; }
      callApi({ action: 'aichatGetCustomMessages', apiKey: apiKey, channelSlug: slug }).then(function(resp) {
        if (resp && resp.success) {
          var textArea = document.getElementById('er-aic-custom-input');
          if (textArea) textArea.value = (resp.messages || []).join('\n');
          updateCustomStats(resp.count || 0);
          showToast('ok', 'Loaded ' + (resp.count || 0) + ' custom messages');
        } else {
          showToast('err', (resp && resp.message) || 'Load failed');
        }
      }).catch(function(e) { showToast('err', 'Network error'); });
    });
  }

  function onSetCustomMode(mode) {
    var labels = { 0: 'AI Only', 1: 'AI + Custom', 2: 'Custom Only' };
    getStored(['userApiKey', 'userKickChannel']).then(function(s) {
      var apiKey = s.userApiKey || '';
      var slug = normalizeSlug(s.userKickChannel);
      if (!apiKey || !slug) return;
      callApi({ action: 'aichatSetCustomMessageMode', apiKey: apiKey, channelSlug: slug, mode: mode }).then(function(resp) {
        if (resp && resp.success) {
          showToast('ok', (labels[mode] || 'Mode ' + mode) + ' active');
        }
      });
    });
  }

  function setMsgModeActive(mode) {
    var row = document.getElementById('er-aic-msg-mode-row');
    if (!row) return;
    row.querySelectorAll('button').forEach(function(b) {
      b.classList.toggle('is-active', Number(b.dataset.mode) === Number(mode));
    });
  }

  function updateCustomStats(count) {
    var pct = Math.min(100, Math.round(count * 100 / 10000)) + '%';
    var label = Number(count).toLocaleString() + ' / 10,000 custom messages';
    var el = document.getElementById('er-aic-custom-stats');
    if (el) el.textContent = label;
    var fill = document.getElementById('er-aic-custom-fill');
    if (fill) fill.style.width = pct;
    // top bar mirror
    var elTop = document.getElementById('er-aic-custom-stats-top');
    if (elTop) elTop.textContent = Number(count).toLocaleString() + ' / 10,000 custom';
    var fillTop = document.getElementById('er-aic-custom-fill-top');
    if (fillTop) fillTop.style.width = pct;
  }

  function onRegen() {
    clientGenerate();
  }

  function onDelete() {
    if (!confirm('Delete the AI chat pool and config for this channel? You can re-create it any time.')) return;
    getStored(['userApiKey', 'userKickChannel']).then(function (s) {
      var apiKey = s.userApiKey || '';
      var slug   = normalizeSlug(s.userKickChannel);
      if (!apiKey || !slug) return;
      callApi({ action: 'aichatDelete', apiKey: apiKey, channelSlug: slug }).then(function (resp) {
        if (resp && resp.success) {
          showToast('ok', '✓ Deleted.');
          setTimeout(closeModal, 800);
        } else {
          showToast('err', (resp && resp.message) || 'Delete failed');
        }
      });
    });
  }

  // ── v1.4.0 View Pool ───────────────────────────────────────────
  function onViewPool() {
    getStored(['userApiKey', 'userKickChannel']).then(function (s) {
      var apiKey = s.userApiKey || '';
      var slug   = normalizeSlug(s.userKickChannel);
      if (!apiKey || !slug) { showToast('err', 'Login + Kick channel attach required.'); return; }
      openPoolModal(apiKey, slug);
    });
  }

  function openPoolModal(apiKey, slug) {
    if (document.getElementById('er-aic-pool-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'er-aic-pool-overlay';
    ov.className = 'v140-pool-modal';
    ov.innerHTML = ''
      + '<div class="v140-pool-modal-inner">'
      + '  <header>'
      + '    <span>📜 AI Chat pool — ' + slug + '</span>'
      + '    <span>'
      + '      <select id="er-aic-pool-filter">'
      + '        <option value="unused" selected>Unused (next to send)</option>'
      + '        <option value="used">Used (audit)</option>'
      + '        <option value="all">All</option>'
      + '      </select>'
      + '      <button class="v140-btn v140-btn-secondary" id="er-aic-pool-close">Close</button>'
      + '    </span>'
      + '  </header>'
      + '  <div class="v140-pool-list" id="er-aic-pool-list">Loading…</div>'
      + '  <footer>'
      + '    <span id="er-aic-pool-meta">—</span>'
      + '    <span>'
      + '      <button class="v140-btn v140-btn-secondary" id="er-aic-pool-prev">‹ Prev</button>'
      + '      <button class="v140-btn v140-btn-secondary" id="er-aic-pool-next">Next ›</button>'
      + '    </span>'
      + '  </footer>'
      + '</div>';
    document.body.appendChild(ov);
    var page = 1, pageSize = 50;
    function load() {
      var filter = document.getElementById('er-aic-pool-filter').value;
      callApi({
        action: 'aichatViewPool',
        apiKey: apiKey,
        channelSlug: slug,
        filter: filter,
        page: page,
        pageSize: pageSize,
      }).then(function (resp) {
        var list = document.getElementById('er-aic-pool-list');
        var meta = document.getElementById('er-aic-pool-meta');
        if (!resp || !resp.success) {
          list.textContent = 'Error: ' + ((resp && resp.message) || 'unknown');
          return;
        }
        list.innerHTML = '';
        if (!resp.items || !resp.items.length) {
          list.innerHTML = '<div style="padding:24px;color:#94a3b8;text-align:center">No messages match this filter.</div>';
        } else {
          resp.items.forEach(function (it) {
            var div = document.createElement('div');
            div.className = 'v140-pool-row' + (it.usedAt ? ' is-used' : '');
            var when = it.usedAt ? ('used ' + new Date(it.usedAt).toLocaleString())
                                 : ('queued ' + new Date(it.createdAt).toLocaleString());
            div.innerHTML =
              '<div style="font-size:11px;color:#64748b">#' + it.id + ' · ' + when + '</div>' +
              '<div style="margin-top:2px;color:#e5e7eb"></div>';
            div.lastChild.textContent = it.text || '';
            list.appendChild(div);
          });
        }
        meta.textContent = 'page ' + resp.page + ' / ' + resp.totalPages +
          ' · ' + resp.total + ' message(s)';
        document.getElementById('er-aic-pool-prev').disabled = resp.page <= 1;
        document.getElementById('er-aic-pool-next').disabled = resp.page >= resp.totalPages;
      });
    }
    document.getElementById('er-aic-pool-close').addEventListener('click', function () {
      ov.parentNode.removeChild(ov);
    });
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.parentNode.removeChild(ov); });
    document.getElementById('er-aic-pool-filter').addEventListener('change', function () { page = 1; load(); });
    document.getElementById('er-aic-pool-prev').addEventListener('click', function () { page = Math.max(1, page - 1); load(); });
    document.getElementById('er-aic-pool-next').addEventListener('click', function () { page = page + 1; load(); });
    load();
  }

  // v1.4.3 — open the panel always, no config check. The dock is
  // permanent for every popup user. Configured users see live status;
  // unconfigured users see the empty form so they can set up from the
  // dock itself.
  function alwaysAutoOpen() {
    getStored(['userApiKey']).then(function (s) {
      var apiKey = s.userApiKey || '';
      if (!apiKey) return;       // not logged in yet
      openModal();
    });
  }

  // ── boot ────────────────────────────────────────────────────────
  function boot() {
    injectStyle();
    // v1.4.3 — drop the trigger bar entirely. The dock is always open.
    setTimeout(alwaysAutoOpen, 1200);  // wait for popup React to settle
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
