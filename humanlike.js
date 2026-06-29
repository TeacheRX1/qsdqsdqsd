// Legends — Humanlike Behavior Layer
// Runs at document_idle on every kick.com page.
//
// Provides:
//  - Per-user pseudo-random seed (derived from API key) so two users
//    don't move/type identically.
//  - Visible red cursor overlay rendered on top of the page.
//  - Bezier-curve mouse path generator (5 curve "shapes" picked by seed).
//  - Real OS-level mouse/keyboard input dispatched via chrome.debugger
//    (the background service worker holds the debugger session;
//    this content script asks via runtime messages).
//  - Humanlike per-character typing for the chat input (variable
//    keypress timing, occasional backspace correction).
//  - AFK profile: occasionally pauses all engagement for a random
//    period to mimic a real user stepping away.
//  - Anti-AFK engagement loop: at randomized intervals, scrolls the
//    chat panel, hovers the emote picker, hovers the video player —
//    so the page sees continuous low-level mouse activity.
//  - Auto-accept cookie banner (Kick / OneTrust / generic selectors).
//  - Auto-accept chat-rules modal.
//  - Multi-language auto-follow with anti-double-click cooldown.
//  - Auto-unmute video and set a safe volume floor.
//
// Existing legacy chat-typing in contentScript.bundle.js delegates to
// this module's window._erHumanType() function so all chat sends go
// through the humanlike pipeline.

(function () {
  if (window.top !== window) return;
  if (window.__erHumanlikeInstalled) return;
  Object.defineProperty(window, "__erHumanlikeInstalled", {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });

  // ===================================================================
  //  Constants
  // ===================================================================
  const ENGAGEMENT_MIN_GAP_MS = 4000;
  const ENGAGEMENT_MAX_GAP_MS = 10000;
  const WANDER_MIN_GAP_MS = 800;
  const WANDER_MAX_GAP_MS = 2200;
  const AFK_CHECK_INTERVAL_MS = 60000;
  const AFK_TRIGGER_PROBABILITY = 0.12; // 12% per check -> ~1 fake AFK every ~8 min
  const AFK_DURATION_MIN_MS = 90000;    // 1.5 min
  const AFK_DURATION_MAX_MS = 5 * 60000; // 5 min
  const FOLLOW_COOLDOWN_MS = 30000;
  const COOKIE_COOLDOWN_MS = 12000;
  const RULES_COOLDOWN_MS = 12000;
  const TYPING_PROFILES = [
    { perCharMin: 55, perCharMax: 170, mistakeRate: 0.04 }, // careful
    { perCharMin: 35, perCharMax: 120, mistakeRate: 0.06 }, // normal
    { perCharMin: 20, perCharMax: 75,  mistakeRate: 0.08 }  // fast
  ];

  // Multi-language follow / unfollow detection strings (lowercased).
  const FOLLOW_TEXTS = ["follow", "suivre", "seguir", "folgen", "تابع", "متابعة", "follow channel", "obserwuj", "takip et", "подписаться"];
  const UNFOLLOW_TEXTS = ["unfollow", "following", "ne plus suivre", "dejar de seguir", "nicht mehr folgen", "smettere di seguire", "إلغاء المتابعة", "обсерwowane", "przestań obserwować", "takipten çık", "вы подписаны", "отписаться"];

  // ===================================================================
  //  Per-user seeded RNG
  // ===================================================================
  function fnv1a(str) {
    const s = String(str == null ? "" : str);
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      hash ^= s.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
  }
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      let r = t;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  let _seedString = "";
  let _seededRng = Math.random;
  let _typingProfileIdx = 1;
  let _cursorCurveType = 0;
  function applySeed(s) {
    _seedString = String(s || "");
    const seed = fnv1a(_seedString || ("legends:" + Date.now()));
    _seededRng = mulberry32(seed);
    _typingProfileIdx = seed % TYPING_PROFILES.length;
    _cursorCurveType = seed % 5;
  }
  function rand() { return _seededRng(); }
  function randInt(min, max) {
    const a = Math.floor(min); const b = Math.floor(max);
    if (b <= a) return a;
    return a + Math.floor(rand() * (b - a + 1));
  }
  function randRange(min, max) {
    if (max <= min) return min;
    return min + rand() * (max - min);
  }

  // Seed from chrome.storage as soon as we can (uses apiKey + url path).
  try {
    chrome.storage && chrome.storage.local.get(["apiKey", "_userIdHint"], function (r) {
      const seedSource = (r && (r._userIdHint || r.apiKey)) || (location.host + location.pathname);
      applySeed(String(seedSource));
    });
  } catch (e) {
    applySeed(location.host + location.pathname);
  }

  // ===================================================================
  //  Cursor overlay (red dot)
  // ===================================================================
  let _cursor = null;
  let _cursorPos = {
    x: Math.max(12, Math.floor(window.innerWidth * 0.5)),
    y: Math.max(12, Math.floor(window.innerHeight * 0.5))
  };
  function ensureCursor() {
    if (_cursor && document.body.contains(_cursor)) return _cursor;
    const existing = document.getElementById("__er_auto_cursor");
    if (existing) {
      _cursor = existing;
      return _cursor;
    }
    // Inject a one-time stylesheet for the breathing pulse so the dot
    // is visible even when the bot is idle (no clicks/moves yet).
    if (!document.getElementById("__er_auto_cursor_style")) {
      const style = document.createElement("style");
      style.id = "__er_auto_cursor_style";
      style.textContent =
        "@keyframes __erAutoCursorPulse{0%{transform:scale(0.8);opacity:0.85}50%{transform:scale(1.25);opacity:1}100%{transform:scale(0.8);opacity:0.85}}" +
        "#__er_auto_cursor{position:fixed!important;left:0!important;top:0!important;width:18px!important;height:18px!important;border-radius:50%!important;" +
        "background:radial-gradient(circle, rgba(255,30,30,0.95) 0%, rgba(255,40,40,0.7) 55%, rgba(255,40,40,0) 100%)!important;" +
        "box-shadow:0 0 10px 3px rgba(255,40,40,0.85),0 0 22px 6px rgba(255,40,40,0.35)!important;" +
        "border:2px solid rgba(255,255,255,0.55)!important;pointer-events:none!important;z-index:2147483647!important;" +
        "transition:transform 80ms linear!important;will-change:transform!important}" +
        "#__er_auto_cursor.__er_idle{animation:__erAutoCursorPulse 1.6s ease-in-out infinite}";
      (document.head || document.documentElement).appendChild(style);
    }
    const el = document.createElement("div");
    el.id = "__er_auto_cursor";
    el.className = "__er_idle";
    el.style.transform = "translate3d(" + _cursorPos.x + "px," + _cursorPos.y + "px,0)";
    (document.body || document.documentElement).appendChild(el);
    _cursor = el;
    return el;
  }
  function moveCursorTo(x, y) {
    _cursorPos.x = Math.max(0, Math.min(window.innerWidth - 1, Math.floor(x)));
    _cursorPos.y = Math.max(0, Math.min(window.innerHeight - 1, Math.floor(y)));
    const el = ensureCursor();
    el.style.transform = "translate3d(" + _cursorPos.x + "px," + _cursorPos.y + "px,0)";
    // Drop the breathing pulse while actively moving so the dot doesn't
    // jitter against the keyframe scale; restored shortly after by the
    // idle-watchdog below.
    if (el.classList.contains("__er_idle")) el.classList.remove("__er_idle");
    _cursorIdleSince = Date.now();
  }
  let _cursorIdleSince = Date.now();
  // Make sure the dot exists from page load and survives Kick re-rendering
  // body/root on SPA navigation. Also restore the breathing pulse when idle.
  function _cursorWatchdog() {
    try {
      ensureCursor();
      if (_cursor && !_cursor.classList.contains("__er_idle") && Date.now() - _cursorIdleSince > 800) {
        _cursor.classList.add("__er_idle");
      }
    } catch (e) {}
  }
  let _cursorObserver = null;
  function _attachCursorObserver() {
    if (_cursorObserver) return;
    if (typeof MutationObserver !== "function" || !document.body) return;
    try {
      _cursorObserver = new MutationObserver(function () {
        // If the dot was stripped during a SPA re-render, re-add it
        // immediately — no waiting for the 1.5 s watchdog tick.
        if (!document.getElementById("__er_auto_cursor")) {
          _cursor = null;
          ensureCursor();
        }
      });
      _cursorObserver.observe(document.body, { childList: true, subtree: false });
    } catch (e) {}
  }
  function _bootCursor() {
    ensureCursor();
    _attachCursorObserver();
    setInterval(_cursorWatchdog, 600);
  }
  if (document.body) {
    _bootCursor();
  } else {
    document.addEventListener("DOMContentLoaded", _bootCursor, { once: true });
  }
  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, Math.max(0, Math.floor(Number(ms) || 0))); });
  }

  // ===================================================================
  //  Bezier curve mouse path
  // ===================================================================
  function quadBezier(p0, p1, p2, t) {
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
    };
  }
  function cubicBezier(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
    };
  }
  function buildPath(from, to, curveType) {
    // 5 curve "shapes" — each gives a different feel.
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const steps = Math.max(8, Math.min(45, Math.floor(dist / 18) + randInt(4, 14)));
    const sign = rand() < 0.5 ? -1 : 1;
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const perp = { x: -dy / dist, y: dx / dist };
    const arc = randRange(0.18, 0.55) * dist * sign;
    const ctrl = { x: mid.x + perp.x * arc, y: mid.y + perp.y * arc };
    const ctrl2 = {
      x: mid.x + perp.x * arc * randRange(0.4, 0.95) + (rand() - 0.5) * dist * 0.18,
      y: mid.y + perp.y * arc * randRange(0.4, 0.95) + (rand() - 0.5) * dist * 0.18
    };
    const pts = [];
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      let p;
      switch (curveType) {
        case 0: p = quadBezier(from, ctrl, to, t); break;
        case 1: p = cubicBezier(from, ctrl, ctrl2, to, t); break;
        case 2: p = quadBezier(from, { x: ctrl.x, y: ctrl.y - arc * 0.3 }, to, t); break;
        case 3: p = cubicBezier(from, { x: from.x + dx * 0.25, y: from.y + dy * 0.1 }, { x: from.x + dx * 0.7, y: from.y + dy * 0.9 }, to, t); break;
        case 4: default: p = cubicBezier(from, ctrl, { x: to.x - dx * 0.1, y: to.y - dy * 0.05 }, to, t); break;
      }
      // small jitter
      p.x += (rand() - 0.5) * 1.6;
      p.y += (rand() - 0.5) * 1.6;
      pts.push({ x: p.x, y: p.y, dt: randInt(8, 22) });
    }
    return pts;
  }

  // ===================================================================
  //  Real input via Chrome Debugger (BG-mediated)
  // ===================================================================
  function bgSend(action, payload) {
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage(Object.assign({ action: action }, payload || {}), function (resp) {
          resolve(resp || null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }
  async function realMouse(type, x, y, opts) {
    opts = opts || {};
    return bgSend("_erRealMouseEvent", {
      type: type,
      x: Math.floor(x),
      y: Math.floor(y),
      button: opts.button || "none",
      buttons: typeof opts.buttons === "number" ? opts.buttons : 0,
      clickCount: typeof opts.clickCount === "number" ? opts.clickCount : 0
    });
  }
  async function realKey(type, info) {
    return bgSend("_erRealKeyEvent", Object.assign({ type: type }, info || {}));
  }
  async function ensureDebuggerAttached() {
    return bgSend("_erEnsureDebugger", {});
  }

  // ===================================================================
  //  Mouse helpers (move along bezier + click)
  // ===================================================================
  async function moveMouseTo(x, y) {
    const path = buildPath(_cursorPos, { x: x, y: y }, _cursorCurveType);
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      moveCursorTo(p.x, p.y);
      await realMouse("mouseMoved", p.x, p.y, { button: "none", buttons: 0 });
      await sleep(p.dt);
    }
    moveCursorTo(x, y);
  }
  async function clickAt(x, y) {
    await ensureDebuggerAttached();
    await moveMouseTo(x, y);
    await sleep(randInt(40, 110));
    await realMouse("mousePressed", x, y, { button: "left", buttons: 1, clickCount: 1 });
    await sleep(randInt(35, 95));
    await realMouse("mouseReleased", x, y, { button: "left", buttons: 0, clickCount: 1 });
  }
  async function hoverAt(x, y) {
    await moveMouseTo(x, y);
    await sleep(randInt(180, 480));
  }
  function elementCenter(el) {
    if (!el || typeof el.getBoundingClientRect !== "function") return null;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    return {
      x: r.left + r.width * randRange(0.32, 0.68),
      y: r.top + r.height * randRange(0.34, 0.66)
    };
  }
  async function clickElement(el) {
    if (!el) return false;
    if (typeof el.scrollIntoView === "function") {
      try { el.scrollIntoView({ block: "center", inline: "center", behavior: "auto" }); } catch (e) {}
      await sleep(randInt(120, 280));
    }
    const c = elementCenter(el);
    if (!c) return false;
    await clickAt(c.x, c.y);
    return true;
  }

  // ===================================================================
  //  Humanlike typing
  // ===================================================================
  const _keyMap = {
    " ": { key: " ", code: "Space", virtualKeyCode: 32, text: " " },
    "\n": { key: "Enter", code: "Enter", virtualKeyCode: 13, text: "" }
  };
  function buildKeyDescriptor(ch) {
    if (_keyMap[ch]) return _keyMap[ch];
    const code = /^[a-zA-Z]$/.test(ch) ? "Key" + ch.toUpperCase() : ch.length === 1 ? "Key_" + ch.charCodeAt(0).toString(16) : "";
    const vk = ch.length === 1 ? ch.toUpperCase().charCodeAt(0) : 0;
    return { key: ch, code: code, virtualKeyCode: vk, text: ch };
  }
  async function typeChar(ch) {
    const k = buildKeyDescriptor(ch);
    await realKey("keyDown", { key: k.key, code: k.code, virtualKeyCode: k.virtualKeyCode, text: k.text });
    await sleep(randInt(20, 70));
    await realKey("keyUp", { key: k.key, code: k.code, virtualKeyCode: k.virtualKeyCode });
  }
  async function pressBackspace() {
    await realKey("keyDown", { key: "Backspace", code: "Backspace", virtualKeyCode: 8, text: "" });
    await sleep(randInt(20, 70));
    await realKey("keyUp", { key: "Backspace", code: "Backspace", virtualKeyCode: 8 });
  }
  async function humanType(text) {
    const profile = TYPING_PROFILES[_typingProfileIdx] || TYPING_PROFILES[1];
    await ensureDebuggerAttached();
    const chars = String(text == null ? "" : text);
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      // typo disabled — emotes like KEKW would break if letters are removed
      await typeChar(c);
      await sleep(randInt(profile.perCharMin, profile.perCharMax));
    }
  }
  async function pressEnter() {
    await ensureDebuggerAttached();
    await realKey("keyDown", { key: "Enter", code: "Enter", virtualKeyCode: 13, text: "\r" });
    await sleep(randInt(25, 80));
    await realKey("keyUp", { key: "Enter", code: "Enter", virtualKeyCode: 13 });
  }

  // ===================================================================
  //  Send-button finder + visible click
  // ===================================================================
  // Multi-language send-button labels — each entry is a plain word that
  // shows up as the visible text of the send button in different locales.
  const SEND_LABELS = [
    "chat", "send", "send message",
    "envoyer", "envoyer un message",
    "enviar", "enviar mensaje",
    "senden",
    "invia",
    "wyślij",
    "gönder",
    "отправить",
    "إرسال", "ارسال", "أرسل"
  ];
  function findSendButton() {
    // 1. Direct id match — Kick exposes #send-message-button.
    var btn = document.getElementById("send-message-button");
    if (btn) return btn;
    // 2. data-testid variants.
    btn = document.querySelector("[data-testid='send-message-button']") ||
          document.querySelector("[data-testid='send-button']") ||
          document.querySelector("[data-testid='chat-send']");
    if (btn) return btn;
    // 3. aria-label match.
    var aria = document.querySelectorAll("button[aria-label]");
    for (var i = 0; i < aria.length; i++) {
      var a = (aria[i].getAttribute("aria-label") || "").toLowerCase();
      if (a.indexOf("send message") !== -1 || a.indexOf("send chat") !== -1) {
        return aria[i];
      }
    }
    // 4. Visible text match against SEND_LABELS, restricted to buttons that
    //    sit inside a chat container so we don't accidentally pick a random
    //    "Send" button somewhere else on the page.
    var roots = document.querySelectorAll(
      "#channel-chatroom, [data-testid='chat-container'], " +
      "[data-testid='chat-input-wrapper'], [class*='chat']"
    );
    var pool = [];
    for (var r = 0; r < roots.length; r++) {
      var rb = roots[r].querySelectorAll("button");
      for (var k = 0; k < rb.length; k++) pool.push(rb[k]);
    }
    if (pool.length === 0) {
      pool = Array.prototype.slice.call(document.querySelectorAll("button"));
    }
    for (var j = 0; j < pool.length; j++) {
      var b = pool[j];
      if (!b || b.disabled) continue;
      var t = (b.innerText || b.textContent || "").trim().toLowerCase();
      if (!t || t.length > 32) continue;
      for (var s = 0; s < SEND_LABELS.length; s++) {
        if (t === SEND_LABELS[s] || t.indexOf(SEND_LABELS[s]) !== -1) {
          return b;
        }
      }
    }
    return null;
  }
  async function clickSendButton() {
    var btn = findSendButton();
    if (!btn) {
      console.warn("[Legends humanlike] send button not found — falling back to Enter");
      await pressEnter();
      return false;
    }
    // Use the real-mouse path: cursor walks along bezier to the button,
    // then mouseDown + mouseUp via Chrome Debugger API.
    await clickElement(btn);
    console.log("[Legends humanlike] clicked send button");
    return true;
  }

  // Expose helpers for legacy code in contentScript.bundle.js to delegate to.
  window._erHumanType = humanType;
  window._erPressEnter = pressEnter;
  window._erClickElement = clickElement;
  window._erClickSendButton = clickSendButton;
  window._erFindSendButton = findSendButton;
  window._erHoverAt = hoverAt;

  // ===================================================================
  //  AFK profile
  // ===================================================================
  const _afk = { until: 0, profileBuiltAt: 0 };
  function isAfk() { return Date.now() < _afk.until; }
  setInterval(function () {
    if (isAfk()) return;
    if (rand() < AFK_TRIGGER_PROBABILITY) {
      const dur = randInt(AFK_DURATION_MIN_MS, AFK_DURATION_MAX_MS);
      _afk.until = Date.now() + dur;
      console.log("[Legends humanlike] simulating AFK for", Math.round(dur / 1000), "s");
    }
  }, AFK_CHECK_INTERVAL_MS);

  // ===================================================================
  //  Anti-AFK engagement loop (scroll + hover)
  // ===================================================================
  function chatScrollContainer() {
    return (
      document.getElementById("chatroom-messages") ||
      document.querySelector("#channel-chatroom [id='chatroom-messages']") ||
      document.querySelector("[data-testid='chatroom-messages']") ||
      null
    );
  }
  function emotePickerEl() {
    return (
      document.querySelector("#chat-emotes-picker-panel") ||
      document.querySelector("#quick-emotes-holder") ||
      document.querySelector("button[data-testid='emoji-picker-button']") ||
      null
    );
  }
  function videoEl() {
    return (
      document.getElementById("video-player") ||
      document.getElementById("injected-embedded-channel-player-video") ||
      document.getElementById("injected-channel-player") ||
      document.querySelector("video") ||
      null
    );
  }
  function videoContainerEl() {
    var v = videoEl();
    if (!v) return null;
    var p = v.closest("[data-testid='player'], #video-player, [class*='player']");
    return p || v.parentElement || v;
  }
  function volumeButtonEl() {
    return (
      document.querySelector("[data-testid='volume-button']") ||
      document.querySelector("button[aria-label*='volume' i]") ||
      document.querySelector("button[aria-label*='mute' i]") ||
      null
    );
  }
  function settingsButtonEl() {
    return (
      document.querySelector("[data-testid='settings-button']") ||
      document.querySelector("button[aria-label*='settings' i]") ||
      document.querySelector("button[aria-label*='quality' i]") ||
      null
    );
  }
  function chatInputEl() {
    return (
      document.querySelector("[data-testid='chat-input']") ||
      document.querySelector("[contenteditable='true'][role='textbox']") ||
      null
    );
  }

  async function scrollChatPanel() {
    const ctn = chatScrollContainer();
    if (!ctn) return false;
    // First, drift the cursor into the chat panel area so the scroll
    // looks like it came from a user mousing over the chat.
    var c = elementCenter(ctn);
    if (c) await moveMouseTo(c.x, c.y);
    const scrollMax = Math.max(0, ctn.scrollHeight - ctn.clientHeight);
    if (scrollMax <= 0) return false;
    const direction = rand() < 0.55 ? 1 : -1;
    const steps = randInt(3, 6);
    for (let i = 0; i < steps; i++) {
      const delta = randInt(45, 140) * direction;
      ctn.scrollTop = Math.max(0, Math.min(scrollMax, (Number(ctn.scrollTop) || 0) + delta));
      ctn.dispatchEvent(new Event("scroll", { bubbles: true }));
      await sleep(randInt(80, 220));
    }
    return true;
  }
  async function hoverEmotePicker() {
    const el = emotePickerEl();
    if (!el) return false;
    const c = elementCenter(el);
    if (!c) return false;
    await hoverAt(c.x, c.y);
    return true;
  }
  async function hoverVideo() {
    const el = videoContainerEl();
    if (!el) return false;
    const c = elementCenter(el);
    if (!c) return false;
    await hoverAt(c.x, c.y);
    return true;
  }
  async function hoverVolume() {
    const el = volumeButtonEl();
    if (!el) return false;
    const c = elementCenter(el);
    if (!c) return false;
    await hoverAt(c.x, c.y);
    // Linger a bit so the volume slider has time to expand under a real user.
    await sleep(randInt(400, 900));
    return true;
  }
  async function hoverSettings() {
    const el = settingsButtonEl();
    if (!el) return false;
    const c = elementCenter(el);
    if (!c) return false;
    await hoverAt(c.x, c.y);
    await sleep(randInt(350, 800));
    return true;
  }
  async function hoverChatInput() {
    const el = chatInputEl();
    if (!el) return false;
    const c = elementCenter(el);
    if (!c) return false;
    await hoverAt(c.x, c.y);
    return true;
  }
  async function wanderToRandomSpot() {
    // Drift to a nearby random spot. Stays in viewport with a margin.
    var margin = 60;
    var maxStep = 220;
    var dx = (rand() - 0.5) * 2 * maxStep;
    var dy = (rand() - 0.5) * 2 * maxStep;
    var x = Math.max(margin, Math.min(window.innerWidth - margin, _cursorPos.x + dx));
    var y = Math.max(margin, Math.min(window.innerHeight - margin, _cursorPos.y + dy));
    await moveMouseTo(x, y);
    return true;
  }

  // ----- Always-on micro-wander loop ------------------------------------
  // The cursor drifts a few px every 0.8 - 2.2 s so it is never frozen.
  let _wanderBusy = false;
  async function wanderTick() {
    if (_wanderBusy) return;
    if (_engagementBusy) return; // don't fight the scripted task
    _wanderBusy = true;
    try {
      await wanderToRandomSpot();
    } catch (e) {
      // swallow
    } finally {
      _wanderBusy = false;
    }
  }
  function scheduleWander() {
    const wait = randInt(WANDER_MIN_GAP_MS, WANDER_MAX_GAP_MS);
    setTimeout(function () {
      wanderTick().finally(scheduleWander);
    }, wait);
  }
  setTimeout(scheduleWander, randInt(2000, 4000));

  // ----- Scripted engagement tasks --------------------------------------
  // Periodically the cursor visits a real UI target and does something —
  // hover the volume, hover quality, scroll chat, hover emote picker etc.
  // The order is shuffled per user via the seeded RNG.
  const TASK_FNS = [
    { name: "hoverVolume",      fn: hoverVolume      },
    { name: "hoverSettings",    fn: hoverSettings    },
    { name: "scrollChatPanel",  fn: scrollChatPanel  },
    { name: "hoverEmotePicker", fn: hoverEmotePicker },
    { name: "hoverVideo",       fn: hoverVideo       },
    { name: "hoverChatInput",   fn: hoverChatInput   }
  ];
  let _taskOrder = TASK_FNS.slice();
  let _taskIndex = 0;
  function rebuildTaskOrder() {
    // Fisher-Yates with seeded rand.
    _taskOrder = TASK_FNS.slice();
    for (let i = _taskOrder.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = _taskOrder[i]; _taskOrder[i] = _taskOrder[j]; _taskOrder[j] = t;
    }
    _taskIndex = 0;
  }
  rebuildTaskOrder();

  let _engagementBusy = false;
  async function engagementTick() {
    if (_engagementBusy) return;
    if (isAfk()) return;
    _engagementBusy = true;
    try {
      if (_taskIndex >= _taskOrder.length) rebuildTaskOrder();
      const task = _taskOrder[_taskIndex++];
      const ok = await task.fn();
      if (!ok) {
        // Target wasn't found yet (page still loading) — fall back to a wander.
        await wanderToRandomSpot();
      }
      // 30% chance to chain a second action immediately so the cursor
      // really seems busy, like AK does.
      if (rand() < 0.3) {
        await sleep(randInt(150, 400));
        if (_taskIndex >= _taskOrder.length) rebuildTaskOrder();
        const task2 = _taskOrder[_taskIndex++];
        await task2.fn();
      }
    } catch (e) {
      console.warn("[Legends humanlike] engagement error:", e);
    } finally {
      _engagementBusy = false;
    }
  }
  function scheduleEngagement() {
    const wait = randInt(ENGAGEMENT_MIN_GAP_MS, ENGAGEMENT_MAX_GAP_MS);
    setTimeout(function () {
      engagementTick().finally(scheduleEngagement);
    }, wait);
  }
  setTimeout(scheduleEngagement, randInt(3500, 6500));

  // ===================================================================
  //  Auto-accept cookie banner (multi-source, multi-language)
  // ===================================================================
  let _lastCookieClickAt = 0;
  function findCookieBtn() {
    return (
      document.querySelector("[data-testid='accept-cookies']") ||
      document.getElementById("accept-cookies") ||
      document.getElementById("cookie-accept") ||
      document.getElementById("onetrust-accept-btn-handler") ||
      null
    );
  }
  async function acceptCookieBanner() {
    if (Date.now() - _lastCookieClickAt < COOKIE_COOLDOWN_MS) return false;
    const btn = findCookieBtn();
    if (!btn || btn.disabled) return false;
    _lastCookieClickAt = Date.now();
    await clickElement(btn);
    console.log("[Legends humanlike] accepted cookie banner");
    return true;
  }

  // ===================================================================
  //  Auto-accept chat-rules modal
  // ===================================================================
  let _lastRulesClickAt = 0;
  async function acceptChatRules() {
    if (Date.now() - _lastRulesClickAt < RULES_COOLDOWN_MS) return false;
    const panel = document.getElementById("chat-rules-panel");
    if (!panel) return false;
    const buttons = [...panel.querySelectorAll("button")].filter(function (b) {
      if (!b || b.disabled) return false;
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (!buttons.length) return false;
    const btn = buttons[buttons.length - 1]; // last button in the panel — Accept
    _lastRulesClickAt = Date.now();
    await clickElement(btn);
    console.log("[Legends humanlike] accepted chat rules");
    return true;
  }

  // ===================================================================
  //  Multi-language Auto-Follow
  // ===================================================================
  let _lastFollowClickAt = 0;
  function buttonText(btn) {
    if (!btn) return "";
    const txt = (btn.textContent || "").trim().toLowerCase();
    const aria = String(btn.getAttribute("aria-label") || "").trim().toLowerCase();
    return txt + " ::aria:: " + aria;
  }
  function findFollowButton() {
    const candidates = [];
    const dt = document.querySelector("[data-testid='follow-button']");
    if (dt) candidates.push(dt);
    [...document.querySelectorAll("button")].forEach(function (b) {
      if (b && !b.disabled) {
        const r = b.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) candidates.push(b);
      }
    });
    for (const b of candidates) {
      const txt = buttonText(b);
      const isUnfollow = UNFOLLOW_TEXTS.some(function (s) { return txt.indexOf(s) !== -1; });
      if (isUnfollow) {
        return { btn: b, alreadyFollowing: true };
      }
    }
    for (const b of candidates) {
      const txt = buttonText(b);
      const isFollow = FOLLOW_TEXTS.some(function (s) { return txt.indexOf(s) !== -1; });
      if (isFollow) {
        return { btn: b, alreadyFollowing: false };
      }
    }
    return { btn: null, alreadyFollowing: false };
  }
  async function autoFollow() {
    if (Date.now() - _lastFollowClickAt < FOLLOW_COOLDOWN_MS) return;
    const r = findFollowButton();
    if (r.alreadyFollowing) return;
    if (!r.btn) return;
    _lastFollowClickAt = Date.now();
    await clickElement(r.btn);
    console.log("[Legends humanlike] auto-followed via button:", buttonText(r.btn));
  }
  // Close any "Are you sure you want to unfollow" popup defensively.
  function closeUnfollowPopup() {
    const popup = document.querySelector("[role='dialog']");
    if (!popup) return false;
    const txt = (popup.textContent || "").toLowerCase();
    const looksUnfollow = UNFOLLOW_TEXTS.some(function (s) { return txt.indexOf(s) !== -1; });
    if (!looksUnfollow) return false;
    const cancelBtn = [...popup.querySelectorAll("button")].find(function (b) {
      const t = (b.textContent || "").trim().toLowerCase();
      return t === "cancel" || t === "annuler" || t === "cancelar" || t === "abbrechen" || t === "إلغاء" || t === "отмена" || t === "iptal";
    });
    if (cancelBtn) {
      cancelBtn.click();
      console.log("[Legends humanlike] closed unfollow popup");
      return true;
    }
    return false;
  }

  // ===================================================================
  //  Auto-unmute + safe volume
  // ===================================================================
  function fixVolume() {
    const v = videoEl();
    if (!v) return false;
    let changed = false;
    try {
      if (v.muted) { v.muted = false; changed = true; }
      if (typeof v.volume === "number" && v.volume <= 0.001) { v.volume = 0.4; changed = true; }
    } catch (e) {}
    if (changed) console.log("[Legends humanlike] unmuted + restored volume");
    return changed;
  }

  // ===================================================================
  //  Page-level orchestration loop
  // ===================================================================
  async function pageOrchestrationTick() {
    try {
      await acceptCookieBanner();
    } catch (e) {}
    try {
      await acceptChatRules();
    } catch (e) {}
    try {
      closeUnfollowPopup();
    } catch (e) {}
    try {
      await autoFollow();
    } catch (e) {}
    try {
      fixVolume();
    } catch (e) {}
  }
  // First run after page settles, then every 5 s.
  setTimeout(pageOrchestrationTick, 3000);
  setInterval(pageOrchestrationTick, 5000);

  // ===================================================================
  //  Diagnostics handle (background can ping this)
  // ===================================================================
  window._erHumanlikeStatus = function () {
    return {
      seed: _seedString,
      typingProfile: _typingProfileIdx,
      cursorCurveType: _cursorCurveType,
      afkUntil: _afk.until,
      cursorPos: _cursorPos
    };
  };

  // Expose clickElement so other content scripts (e.g. auto-scroll resume)
  // can use the visible red-dot cursor via CDP.
  window.__erClickElement = clickElement;

  console.log("[Legends humanlike] installed (typingProfile=" + _typingProfileIdx + ", curve=" + _cursorCurveType + ")");
})();
