/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/pages/Content/arrive.js":
/*!*************************************!*\
  !*** ./src/pages/Content/arrive.js ***!
  \*************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* module decorator */ module = __webpack_require__.nmd(module);
(function () {
  var enterModule = typeof reactHotLoaderGlobal !== 'undefined' ? reactHotLoaderGlobal.enterModule : undefined;
  enterModule && enterModule(module);
})();
var __signature__ = typeof reactHotLoaderGlobal !== 'undefined' ? reactHotLoaderGlobal.default.signature : function (a) {
  return a;
};
/*
 * arrive.js
 * v2.4.1
 * https://github.com/uzairfarooq/arrive
 * MIT licensed
 *
 * Copyright (c) 2014-2017 Uzair Farooq
 */

var Arrive = function (e, t, n) {
  'use strict';

  function r(e, t, n) {
    l.addMethod(t, n, e.unbindEvent), l.addMethod(t, n, e.unbindEventWithSelectorOrCallback), l.addMethod(t, n, e.unbindEventWithSelectorAndCallback);
  }
  function i(e) {
    e.arrive = f.bindEvent, r(f, e, 'unbindArrive'), e.leave = d.bindEvent, r(d, e, 'unbindLeave');
  }
  if (e.MutationObserver && 'undefined' != typeof HTMLElement) {
    var o = 0,
      l = function () {
        var t = HTMLElement.prototype.matches || HTMLElement.prototype.webkitMatchesSelector || HTMLElement.prototype.mozMatchesSelector || HTMLElement.prototype.msMatchesSelector;
        return {
          matchesSelector: function (e, n) {
            return e instanceof HTMLElement && t.call(e, n);
          },
          addMethod: function (e, t, r) {
            var i = e[t];
            e[t] = function () {
              return r.length == arguments.length ? r.apply(this, arguments) : 'function' == typeof i ? i.apply(this, arguments) : n;
            };
          },
          callCallbacks: function (e, t) {
            t && t.options.onceOnly && 1 == t.firedElems.length && (e = [e[0]]);
            for (var n, r = 0; n = e[r]; r++) n && n.callback && n.callback.call(n.elem, n.elem);
            t && t.options.onceOnly && 1 == t.firedElems.length && t.me.unbindEventWithSelectorAndCallback.call(t.target, t.selector, t.callback);
          },
          checkChildNodesRecursively: function (e, t, n, r) {
            for (var i, o = 0; i = e[o]; o++) n(i, t, r) && r.push({
              callback: t.callback,
              elem: i
            }), i.childNodes.length > 0 && l.checkChildNodesRecursively(i.childNodes, t, n, r);
          },
          mergeArrays: function (e, t) {
            var n,
              r = {};
            for (n in e) e.hasOwnProperty(n) && (r[n] = e[n]);
            for (n in t) t.hasOwnProperty(n) && (r[n] = t[n]);
            return r;
          },
          toElementsArray: function (t) {
            return n === t || 'number' == typeof t.length && t !== e || (t = [t]), t;
          }
        };
      }(),
      c = function () {
        var e = function () {
          this._eventsBucket = [], this._beforeAdding = null, this._beforeRemoving = null;
        };
        return e.prototype.addEvent = function (e, t, n, r) {
          var i = {
            target: e,
            selector: t,
            options: n,
            callback: r,
            firedElems: []
          };
          return this._beforeAdding && this._beforeAdding(i), this._eventsBucket.push(i), i;
        }, e.prototype.removeEvent = function (e) {
          for (var t, n = this._eventsBucket.length - 1; t = this._eventsBucket[n]; n--) if (e(t)) {
            this._beforeRemoving && this._beforeRemoving(t);
            var r = this._eventsBucket.splice(n, 1);
            r && r.length && (r[0].callback = null);
          }
        }, e.prototype.beforeAdding = function (e) {
          this._beforeAdding = e;
        }, e.prototype.beforeRemoving = function (e) {
          this._beforeRemoving = e;
        }, e;
      }(),
      a = function (t, r) {
        var i = new c(),
          o = this,
          a = {
            fireOnAttributesModification: !1
          };
        return i.beforeAdding(function (n) {
          var i,
            l = n.target;
          (l === e.document || l === e) && (l = document.getElementsByTagName('html')[0]), i = new MutationObserver(function (e) {
            r.call(this, e, n);
          });
          var c = t(n.options);
          i.observe(l, c), n.observer = i, n.me = o;
        }), i.beforeRemoving(function (e) {
          e.observer.disconnect();
        }), this.bindEvent = function (e, t, n) {
          t = l.mergeArrays(a, t);
          for (var r = l.toElementsArray(this), o = 0; o < r.length; o++) i.addEvent(r[o], e, t, n);
        }, this.unbindEvent = function () {
          var e = l.toElementsArray(this);
          i.removeEvent(function (t) {
            for (var r = 0; r < e.length; r++) if (this === n || t.target === e[r]) return !0;
            return !1;
          });
        }, this.unbindEventWithSelectorOrCallback = function (e) {
          var t,
            r = l.toElementsArray(this),
            o = e;
          t = 'function' == typeof e ? function (e) {
            for (var t = 0; t < r.length; t++) if ((this === n || e.target === r[t]) && e.callback === o) return !0;
            return !1;
          } : function (t) {
            for (var i = 0; i < r.length; i++) if ((this === n || t.target === r[i]) && t.selector === e) return !0;
            return !1;
          }, i.removeEvent(t);
        }, this.unbindEventWithSelectorAndCallback = function (e, t) {
          var r = l.toElementsArray(this);
          i.removeEvent(function (i) {
            for (var o = 0; o < r.length; o++) if ((this === n || i.target === r[o]) && i.selector === e && i.callback === t) return !0;
            return !1;
          });
        }, this;
      },
      s = function () {
        function e(e) {
          var t = {
            attributes: !1,
            childList: !0,
            subtree: !0
          };
          return e.fireOnAttributesModification && (t.attributes = !0), t;
        }
        function t(e, t) {
          e.forEach(function (e) {
            var n = e.addedNodes,
              i = e.target,
              o = [];
            null !== n && n.length > 0 ? l.checkChildNodesRecursively(n, t, r, o) : 'attributes' === e.type && r(i, t, o) && o.push({
              callback: t.callback,
              elem: i
            }), l.callCallbacks(o, t);
          });
        }
        function r(e, t) {
          return l.matchesSelector(e, t.selector) && (e._id === n && (e._id = o++), -1 == t.firedElems.indexOf(e._id)) ? (t.firedElems.push(e._id), !0) : !1;
        }
        var i = {
          fireOnAttributesModification: !1,
          onceOnly: !1,
          existing: !1
        };
        f = new a(e, t);
        var c = f.bindEvent;
        return f.bindEvent = function (e, t, r) {
          n === r ? (r = t, t = i) : t = l.mergeArrays(i, t);
          var o = l.toElementsArray(this);
          if (t.existing) {
            for (var a = [], s = 0; s < o.length; s++) for (var u = o[s].querySelectorAll(e), f = 0; f < u.length; f++) a.push({
              callback: r,
              elem: u[f]
            });
            if (t.onceOnly && a.length) return r.call(a[0].elem, a[0].elem);
            setTimeout(l.callCallbacks, 1, a);
          }
          c.call(this, e, t, r);
        }, f;
      },
      u = function () {
        function e() {
          var e = {
            childList: !0,
            subtree: !0
          };
          return e;
        }
        function t(e, t) {
          e.forEach(function (e) {
            var n = e.removedNodes,
              i = [];
            null !== n && n.length > 0 && l.checkChildNodesRecursively(n, t, r, i), l.callCallbacks(i, t);
          });
        }
        function r(e, t) {
          return l.matchesSelector(e, t.selector);
        }
        var i = {};
        d = new a(e, t);
        var o = d.bindEvent;
        return d.bindEvent = function (e, t, r) {
          n === r ? (r = t, t = i) : t = l.mergeArrays(i, t), o.call(this, e, t, r);
        }, d;
      },
      f = new s(),
      d = new u();
    t && i(t.fn), i(HTMLElement.prototype), i(NodeList.prototype), i(HTMLCollection.prototype), i(HTMLDocument.prototype), i(Window.prototype);
    var h = {};
    return r(f, h, 'unbindAllArrive'), r(d, h, 'unbindAllLeave'), h;
  }
}(window, 'undefined' == typeof jQuery ? null : jQuery, void 0);
;
(function () {
  var reactHotLoader = typeof reactHotLoaderGlobal !== 'undefined' ? reactHotLoaderGlobal.default : undefined;
  if (!reactHotLoader) {
    return;
  }
  reactHotLoader.register(Arrive, "Arrive", "er-extension/content/arrive.js");
})();
;
(function () {
  var leaveModule = typeof reactHotLoaderGlobal !== 'undefined' ? reactHotLoaderGlobal.leaveModule : undefined;
  leaveModule && leaveModule(module);
})();

/***/ }),

/***/ "./src/pages/Content/autosetQualilty.ts":
/*!**********************************************!*\
  !*** ./src/pages/Content/autosetQualilty.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   checkLiveStram: () => (/* binding */ checkLiveStram),
/* harmony export */   setLowestQualitySmooth: () => (/* binding */ setLowestQualitySmooth)
/* harmony export */ });
/* harmony import */ var _helper__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./helper */ "./src/pages/Content/helper.ts");
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};

function wakeControls() {
    var video = document.querySelector('video');
    if (!video)
        return;
    var rect = video.getBoundingClientRect();
    video.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
    }));
    console.log('[Controls] Mouse move simulated → controls visible');
}
function humanClick(el) {
    if (!el)
        return;
    var rect = el.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    var events = [
        new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            pointerType: 'mouse',
            clientX: x,
            clientY: y,
            isPrimary: true,
        }),
        new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
        }),
        new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
        }),
        new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
        }),
    ];
    events.forEach(function (e) { return el.dispatchEvent(e); });
}
function setLowestQualitySmooth() {
    console.log('[Quality] Starting smooth quality change');
    wakeControls();
    (0,_helper__WEBPACK_IMPORTED_MODULE_0__.arriveListener)('#video-player + div button[aria-haspopup="menu"]');
    setTimeout(function () {
        var buttons = document.querySelectorAll('#video-player + div button[aria-haspopup="menu"]');
        if (!buttons.length) {
            console.log('[Quality] ❌ Settings button not found');
            return;
        }
        var settingsBtn = buttons.length === 1 ? buttons[0] : buttons[1];
        console.log('[Quality] ⚙️ Settings button found:', settingsBtn);
        if (!settingsBtn) {
            console.log('[Quality] ❌ Settings button not found');
            return;
        }
        console.log('[Quality] ⚙️ Clicking settings');
        humanClick(settingsBtn);
        var interval = setInterval(function () {
            var items = document.querySelectorAll('div[role="menuitemradio"]');
            if (!items.length) {
                console.log('[Quality] Waiting for quality menu...');
                return;
            }
            var target = null;       // exact 720p if found
            var fallbackBelow = null; // highest option <= 720
            var firstOption = null;   // any option as last resort
            items.forEach(function (el) {
                var text = el.innerText.trim();
                console.log('[Quality] Option:', text);
                var m = text.match(/(\d+)p/);
                if (m) {
                    if (!firstOption) firstOption = el;
                    var val = parseInt(m[1], 10);
                    if (val === 720) target = el;
                    if (val <= 720) {
                        // items are listed highest->lowest, so the FIRST one <=720 is the closest to 720
                        if (!fallbackBelow) fallbackBelow = el;
                    }
                }
            });
            var chosen = target || fallbackBelow || firstOption;
            if (chosen) {
                console.log('[Quality] Selecting:', chosen.innerText);
                humanClick(chosen);
            }
            clearInterval(interval);
            // Let controls auto-hide naturally
            console.log('[Quality] Done — controls will hide automatically');
        }, 100);
    }, 200); // small delay to allow controls to appear
}
function checkLiveStram() {
    return __awaiter(this, void 0, void 0, function () {
        var hasAccess, storageKey, data, checklivetext;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('[KickBot] startStreaming() called');
                    return [4 /*yield*/, new Promise(function (r) { return chrome.storage.local.get(['hasAccess'], r); })];
                case 1:
                    hasAccess = (_a.sent()).hasAccess;
                    console.log('[KickBot] hasAccess:', hasAccess);
                    if (!hasAccess) {
                        console.warn('[KickBot] Stopping: hasAccess=false');
                        return [2 /*return*/];
                    }
                    storageKey = window.location.href;
                    return [4 /*yield*/, (0,_helper__WEBPACK_IMPORTED_MODULE_0__.getStore)(storageKey, null)];
                case 2:
                    data = _a.sent();
                    console.log('[KickBot] Loaded config:', data);
                    if (!data) {
                        // Retry instead of permanently stopping — config may not be written yet on fresh tab.
                        // Note: original code referenced `startStreaming` here but that symbol does not exist
                        // in this module's scope (webpack split). Using `checkLiveStram` (this function) instead.
                        if (typeof checkLiveStram._noDataRetries === 'undefined') checkLiveStram._noDataRetries = 0;
                        checkLiveStram._noDataRetries++;
                        var retryDelay = Math.min(3000 * checkLiveStram._noDataRetries, 20000);
                        if (checkLiveStram._noDataRetries <= 10) {
                            console.warn('[KickBot] No config yet — retry #' + checkLiveStram._noDataRetries + ' in ' + (retryDelay/1000) + 's');
                            setTimeout(function() { checkLiveStram(); }, retryDelay);
                        } else {
                            console.warn('[KickBot] Giving up after 10 retries — no config found');
                            checkLiveStram._noDataRetries = 0;
                        }
                        return [2 /*return*/];
                    }
                    checkLiveStram._noDataRetries = 0;
                    // Active flag
                    return [4 /*yield*/, (0,_helper__WEBPACK_IMPORTED_MODULE_0__.arriveListener)('[data-testid="viewer-count"]')];
                case 3:
                    _a.sent();
                    // Check if stream is actually live by looking for video player or chat input
                    // (NOT viewer count, which may be hidden by the streamer)
                    var isLive = document.querySelector('video') || 
                                 document.querySelector('[data-testid="chat-input"]') ||
                                 document.querySelector('[class*="ChatInput"]');
                    if (!isLive) {
                        console.warn('[KickBot] Stream not live or ended: no video player or chat input found, will retry');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, sleep(3000)];
                case 4:
                    _a.sent(); // wait for 10 seconds to ensure stream is live
                    console.log('[KickBot] Stream appears to be live. Setting lowest quality.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000');
                    setLowestQualitySmooth();
                    return [2 /*return*/];
            }
        });
    });
}
// maek a sleep function
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
// setLowestQualitySmooth()

// ── Keyboard-like typing simulation with human-like mistakes (1 in 10 chars) ──
var _typoMap = {
    'a':'s','b':'v','c':'x','d':'s','e':'r','f':'g','g':'h','h':'j','i':'u','j':'k',
    'k':'l','l':'k','m':'n','n':'m','o':'p','p':'o','q':'w','r':'e','s':'a','t':'r',
    'u':'y','v':'b','w':'q','x':'z','y':'u','z':'x',
    'A':'S','B':'V','C':'X','D':'S','E':'R','F':'G','G':'H','H':'J','I':'U','J':'K',
    'K':'L','L':'K','M':'N','N':'M','O':'P','P':'O','Q':'W','R':'E','S':'A','T':'R',
    'U':'Y','V':'B','W':'Q','X':'Z','Y':'U','Z':'X'
};
function _typeOneChar(el, char) {
    try {
        el.focus();
        el.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true }));
        el.dispatchEvent(new KeyboardEvent('keypress', { key: char, charCode: char.charCodeAt(0), bubbles: true, cancelable: true }));
        _insertTextModern(el, (el.textContent || '') + char);
        el.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
    } catch(e) {}
}
function _typeBackspace(el) {
    try {
        el.focus();
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', code: 'Backspace', bubbles: true }));
        var cur = el.textContent || '';
        if (cur.length > 0) _insertTextModern(el, cur.slice(0, -1));
        el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Backspace', code: 'Backspace', bubbles: true }));
    } catch(e) {}
}
// ── Modern text insertion for React/Vue contenteditable (replaces deprecated document.execCommand) ──
// Uses direct textContent assignment + InputEvent — works with Chrome 2024+ and Kick's Vue/React frontend.
function _insertTextModern(el, text) {
    try {
        el.focus();
        // ① Try React fiber internal setter first (most reliable for React-controlled inputs)
        try {
            var fiberKey = Object.keys(el).find(function(k) {
                return k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance');
            });
            if (fiberKey) {
                var fiber = el[fiberKey];
                var inst = fiber && (fiber.stateNode || fiber);
                if (inst && inst.setState) {
                    // class component
                    inst.setState({ value: text });
                }
            }
            // Also try native input value setter (works for <input> and <textarea>)
            var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'innerText') ||
                               Object.getOwnPropertyDescriptor(window.Node.prototype, 'textContent');
            if (nativeSetter && nativeSetter.set) {
                nativeSetter.set.call(el, text);
            } else {
                el.textContent = text;
            }
        } catch(innerErr) {
            el.textContent = text;
        }
        // ② Move cursor to end so framework sees caret at correct position
        var range = document.createRange();
        var sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false); // collapse to END
        sel.removeAllRanges();
        sel.addRange(range);
        // ③ Fire both a plain Event and an InputEvent — different framework versions listen to different ones
        el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: text
        }));
        // ④ Also fire 'change' for any onChange handlers
        el.dispatchEvent(new Event('change', { bubbles: true }));
        // ⑤ Kick uses Vue/React — fire a second InputEvent after a microtask to ensure framework picks it up
        Promise.resolve().then(function() {
            try {
                el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
            } catch(e) {}
        });
    } catch(e) { console.warn('[KickBot] _insertTextModern error:', e); }
}
// ── React-aware flush: fires a native InputEvent so React re-reads the DOM ──
function _flushReactInput(el) {
    try {
        var content = el.innerText || el.textContent || '';
        el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: content, inputType: 'insertText' }));
    } catch(e) {}
}

// ── Robust send: humanlike-cursor click on the green Chat button if available,
// then fall back to direct btn.click() and finally to dispatched Enter. v1.3.5.5
// adds the humanlike path so the cursor visibly walks to the button before
// clicking — matches AK's behaviour and helps avoid bot-detection that watches
// for messages sent without any preceding mouse activity over the send button.
function _clickSendButton(retries) {
    retries = (retries === undefined) ? 4 : retries;
    if (typeof window._erClickSendButton === 'function') {
        try {
            window._erClickSendButton().catch(function() {});
            return true;
        } catch (e) { /* fall through */ }
    }
    var btn = document.querySelector('#send-message-button');
    if (btn) {
        // Force click regardless of disabled state — the button may appear disabled
        // because the framework hasn't caught up yet, but the click still works on Kick
        btn.click();
        return true;
    }
    // Fallback: send via Enter key on the chat input
    var chatEl = document.querySelector('[data-testid="chat-input"]');
    if (chatEl) {
        chatEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        chatEl.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        chatEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        return true;
    }
    if (retries > 0) {
        setTimeout(function() { _clickSendButton(retries - 1); }, 200);
    }
    return false;
}

// simulateTypingAsync — v1.3.5: delegates to humanlike.js's humanType when
// available, falling back to the legacy direct-insertion path. The humanlike
// version uses chrome.debugger Input.dispatchKeyEvent so each character looks
// like a real OS-level keypress to Kick.
function simulateTypingAsync(el, text) {
    if (!el || !text) return Promise.resolve();
    return new Promise(function(resolve) {
        try {
            if (typeof window._erHumanType === 'function') {
                try { el.focus(); } catch(e) {}
                try { el.textContent = ''; } catch(e) {}
                try {
                    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'deleteContentBackward' }));
                } catch(e) {}
                Promise.resolve(window._erHumanType(text)).then(function() {
                    resolve();
                }).catch(function(err) {
                    console.warn('[KickBot] humanlike type fell back:', err);
                    try { _insertTextModern(el, text); } catch(e2) {}
                    resolve();
                });
                return;
            }
        } catch(e) {
            console.warn('[KickBot] simulateTypingAsync delegate error:', e);
        }
        // Legacy fallback — instant paste via modern insertion.
        var typingMs = Math.min(text.length * (60 + Math.floor(Math.random() * 30)), 4000);
        setTimeout(function() {
            _insertTextModern(el, text);
            resolve();
        }, typingMs);
    });
}


/***/ }),

/***/ "./src/pages/Content/helper.ts":
/*!*************************************!*\
  !*** ./src/pages/Content/helper.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   arriveListener: () => (/* binding */ arriveListener),
/* harmony export */   getStore: () => (/* binding */ getStore)
/* harmony export */ });
/* harmony import */ var _arrive__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./arrive */ "./src/pages/Content/arrive.js");
/* harmony import */ var _arrive__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_arrive__WEBPACK_IMPORTED_MODULE_0__);

function arriveListener(selector, index) {
    if (index === void 0) { index = 0; }
    return new Promise(function (resolve) {
        document.arrive(selector, {
            fireOnAttributesModification: true,
            existing: true,
            onceOnly: true,
        }, function (newElem) {
            if (newElem) {
                console.log('Element arrived:', newElem);
                resolve(newElem);
            }
            else {
                console.log("Timeout reached for selector: ".concat(selector));
                resolve(null);
            }
        });
    });
}
function getStore(key, nullable) {
    return new Promise(function (resolve) {
        chrome.storage.local.get([key], function (result) {
            resolve(result[key] || nullable);
        });
    });
}


/***/ }),

/***/ "./src/pages/Content/index.ts":
/*!************************************!*\
  !*** ./src/pages/Content/index.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _autosetQualilty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./autosetQualilty */ "./src/pages/Content/autosetQualilty.ts");
/* harmony import */ var _helper__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./helper */ "./src/pages/Content/helper.ts");
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};


// Global flag — set to true when Stop All is pressed
var isBotStopped = false;

// v1.4.4 — Auto-click "Chat paused for scrolling" button with human-like behavior.
// When Kick's chat scrolls up and shows the "paused" banner, wait 2-3 minutes
// (like a real person reading old messages) then simulate a realistic mouse click
// on the button to resume scrolling.
var _autoScrollTimer = null;
var _autoScrollPending = false; // true = we detected "paused", waiting before click

function _findPausedButton() {
  var btns = document.querySelectorAll('button');
  for (var i = 0; i < btns.length; i++) {
    var txt = (btns[i].textContent || '').trim().toLowerCase();
    if (txt.indexOf('paused') !== -1 || txt.indexOf('resume') !== -1) {
      return btns[i];
    }
  }
  return null;
}

function _simulateHumanClick(el) {
  // Use the visible red-dot virtual mouse (humanlike.js / CDP) when available.
  // Falls back to invisible DOM events only if humanlike.js hasn't loaded yet.
  if (typeof window.__erClickElement === 'function') {
    console.log('[KickBot] Using red-dot cursor to click element');
    window.__erClickElement(el).catch(function (e) {
      console.warn('[KickBot] Red-dot click failed, falling back to DOM events', e);
      _domClick(el);
    });
    return;
  }
  console.log('[KickBot] humanlike.js not loaded — using DOM event fallback');
  _domClick(el);
}

function _domClick(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return;
  var rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  var x = rect.left + rect.width * (0.3 + Math.random() * 0.4);
  var y = rect.top + rect.height * (0.3 + Math.random() * 0.4);
  var common = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 };
  el.dispatchEvent(new MouseEvent('mouseenter', common));
  el.dispatchEvent(new MouseEvent('mouseover', common));
  el.dispatchEvent(new MouseEvent('mousemove', common));
  setTimeout(function () {
    el.dispatchEvent(new MouseEvent('mousedown', common));
    var releaseDelay = 50 + Math.floor(Math.random() * 80);
    setTimeout(function () {
      el.dispatchEvent(new MouseEvent('mouseup', common));
      el.dispatchEvent(new MouseEvent('click', common));
    }, releaseDelay);
  }, 100 + Math.floor(Math.random() * 200));
}

function _autoScrollCheck() {
  if (isBotStopped) { _autoScrollPending = false; return; }
  var btn = _findPausedButton();
  if (btn && !_autoScrollPending) {
    // Detected "paused" — schedule a click after 2-3 minutes (human-like delay)
    _autoScrollPending = true;
    var delay = (120 + Math.floor(Math.random() * 60)) * 1000; // 120-180 seconds
    console.log('[KickBot] Chat paused detected — will click resume in ' + Math.round(delay / 1000) + 's');
    setTimeout(function () {
      _autoScrollPending = false;
      if (isBotStopped) return;
      var btnNow = _findPausedButton();
      if (btnNow) {
        console.log('[KickBot] Clicking chat resume button (human-like)');
        _simulateHumanClick(btnNow);
      }
    }, delay);
  }
}

function startAutoScrollResume() {
  if (_autoScrollTimer) return;
  _autoScrollPending = false;
  // Check every 30 seconds if chat is paused
  _autoScrollTimer = setInterval(_autoScrollCheck, 30000);
}
function stopAutoScrollResume() {
  if (_autoScrollTimer) { clearInterval(_autoScrollTimer); _autoScrollTimer = null; }
  _autoScrollPending = false;
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    console.log('Content script received message:', message);
    if (message.action === 'startStreaming') {
        isBotStopped = false;
        // Reset retry counter — background signal means config is now in storage
        startStreaming._noDataRetries = 0;
        startInactiveOfflineWatcher();
        startAutoScrollResume();
        simulateHumanEntry(function() {
            startStreaming();
            (0,_autosetQualilty__WEBPACK_IMPORTED_MODULE_0__.checkLiveStram)();
        });
    }
    if (message.action === 'stopStreaming') {
        isBotStopped = true;
        _streamingLoopActive = false;
        stopAutoScrollResume();
        console.log('[KickBot] stopStreaming received — bot stopped.');
        sendResponse({ success: true });
    }
    if (message.action === 'sendCustomChat') {
        var text = (message && message.text) ? String(message.text) : '';
        var repeat = message && message.repeat ? Number(message.repeat) : 1;
        if (!text) {
            sendResponse({ success: false, error: 'No text' });
            return;
        }
        if (!repeat || repeat < 1) repeat = 1;
        if (repeat > 5) repeat = 5;
        (function sendLoop(i) {
            if (i >= repeat) { sendResponse({ success: true }); return; }
            setTimeout(function() {
                try {
                    var inputArea = document.querySelector('[data-testid="chat-input"]');
                    if (!inputArea) {
                        console.warn('[KickBot] sendCustomChat: chat input not found, skipping repeat', i);
                        sendLoop(i + 1);
                        return;
                    }
                    // If chat is locked by slowmode, wait and retry this repeat after 2s
                    if (inputArea.getAttribute('contenteditable') === 'false') {
                        console.warn('[KickBot] Chat locked (slowmode), waiting 2s then retrying repeat', i);
                        setTimeout(function() { sendLoop(i); }, 2000);
                        return;
                    }
                    inputArea.focus();
                    setTimeout(function() {
                        try {
                            var inputArea2 = document.querySelector('[data-testid="chat-input"]');
                            if (!inputArea2) { sendLoop(i + 1); return; }
                            // Use modern insertion (execCommand removed in Chrome 2024+)
                            _insertTextModern(inputArea2, text);
                            setTimeout(function() {
                                try {
                                    _clickSendButton(3);
                                } catch(e) {}
                                // Wait between repeats for Kick slowmode
                                setTimeout(function() { sendLoop(i + 1); }, i < repeat - 1 ? 2200 : 400);
                            }, 300);
                        } catch(e) { sendLoop(i + 1); }
                    }, 200);
                } catch(e) { sendLoop(i + 1); }
            }, i === 0 ? 500 : 0);
        })(0);
        return true;
    }
    if (message.action === 'executeQuickSend') {
        var preset = message && message.preset ? String(message.preset) : 'random';
        (function() {
            var PRESETS = {
                kekw:   { emotes: ['[emote:37225:KEKLEO]', '[emote:37226:KEKW]'] },
                dance:  { emotes: ['[emote:4147910:BBoomer]','[emote:39251:beeBobble]','[emote:4147884:vibePls]','[emote:39260:DanceDance]'] },
                police: { emotes: ['[emote:37230:POLICE]'] },
                random: { emotes: ['[emote:3753119:asmonSmash]','[emote:4147910:BBoomer]','[emote:39251:beeBobble]','[emote:37217:Bwop]','[emote:37218:Clap]','[emote:37221:EZ]','[emote:37224:GIGACHAD]','[emote:37226:KEKW]','[emote:37225:KEKLEO]','[emote:37227:LULW]','[emote:37228:NODDERS]','[emote:37230:POLICE]','[emote:37232:PeepoClap]','[emote:37233:PogU]','[emote:37234:Prayge]','[emote:37240:WeirdChamp]','[emote:37243:gachiGASM]','[emote:39260:DanceDance]','[emote:4147884:vibePls]','[emote:4148074:HYPERCLAP]','[emote:4148081:Sadge]'] }
            };
            var cfg = PRESETS[preset] || PRESETS.random;

            function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
            function shuffle(arr) {
                var a = arr.slice();
                for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i+1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
                return a;
            }

            // 1-5 messages
            var msgCount = randInt(1, 5);
            var messages = [];
            var shuffled = shuffle(cfg.emotes);
            for (var m = 0; m < msgCount; m++) {
                // 1 emote per line, 10% chance of 2 emotes
                var pick1 = shuffled[m % shuffled.length];
                if (Math.random() < 0.1 && cfg.emotes.length > 1) {
                    // 2 emotes on this line
                    var pick2 = cfg.emotes[Math.floor(Math.random() * cfg.emotes.length)];
                    messages.push(pick1 + ' ' + pick2);
                } else {
                    messages.push(pick1);
                }
            }

            // Send messages sequentially with human-like random delays
            (function sendNext(idx) {
                if (idx >= messages.length) { sendResponse({ success: true, sent: idx }); return; }
                var txt = messages[idx];
                var delay = idx === 0 ? randInt(200, 800) : randInt(1800, 3500);
                setTimeout(function() {
                    try {
                        var el = document.querySelector('[data-testid="chat-input"]');
                        if (!el) { sendNext(idx + 1); return; }
                        el.focus();
                        setTimeout(function() {
                            var el2 = document.querySelector('[data-testid="chat-input"]');
                            if (!el2) { sendNext(idx + 1); return; }
                            // Use modern insertion (execCommand removed in Chrome 2024+)
                            _insertTextModern(el2, txt);
                            setTimeout(function() {
                                _clickSendButton(3);
                                sendNext(idx + 1);
                            }, 300);
                        }, 200);
                    } catch(e) { sendNext(idx + 1); }
                }, delay);
            })(0);
        })();
        return true;
    }

    if (message.action === 'clickPollOption') {
        var option = message && message.option ? Number(message.option) : 0;
        if (!option || option < 1 || option > 4) { sendResponse({ success: false, error: 'Invalid option' }); return; }
        (function () {
            // Kick poll: data-testid="poll-option-list" contains <button role="radio" value="0">, value="1", etc.
            var list = document.querySelector('[data-testid="poll-option-list"]');
            if (!list) {
                sendResponse({ success: false, error: 'Poll not visible on this page' });
                return;
            }
            var buttons = list.querySelectorAll('button[role="radio"]');
            if (!buttons || buttons.length < option) {
                sendResponse({ success: false, error: 'Option ' + option + ' not found (only ' + (buttons ? buttons.length : 0) + ' options)' });
                return;
            }
            var target = buttons[option - 1];
            try {
                target.scrollIntoView({ block: 'center' });
                target.focus();
                target.click();
                sendResponse({ success: true });
            } catch (e) {
                sendResponse({ success: false, error: String(e) });
            }
        })();
        return true;
    }
});

// Simulates a real human landing on the page before the bot starts
function simulateHumanEntry(callback) {
    var delay1 = 300 + Math.floor(Math.random() * 400); // 0.3s–0.7s before first move
    setTimeout(function() {
        // 1. Random mouse move across the page
        var moveX = 200 + Math.floor(Math.random() * (window.innerWidth - 400));
        var moveY = 150 + Math.floor(Math.random() * (window.innerHeight - 300));
        document.dispatchEvent(new MouseEvent('mousemove', {
            bubbles: true,
            clientX: moveX,
            clientY: moveY
        }));

        var delay2 = 200 + Math.floor(Math.random() * 300); // 0.2s–0.5s pause
        setTimeout(function() {
            // 2. Scroll down slightly like a user reading the page
            var scrollAmount = 80 + Math.floor(Math.random() * 120);
            window.scrollBy({ top: scrollAmount, behavior: 'smooth' });

            var delay3 = 150 + Math.floor(Math.random() * 250); // 0.15s–0.4s pause
            setTimeout(function() {
                // 3. Click somewhere on the page body (not a button — just settling in)
                var clickTarget = document.querySelector('main') || document.body;
                if (clickTarget) {
                    var rect = clickTarget.getBoundingClientRect();
                    var cx = rect.left + 100 + Math.floor(Math.random() * 200);
                    var cy = rect.top + 100 + Math.floor(Math.random() * 150);
                    clickTarget.dispatchEvent(new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        clientX: cx,
                        clientY: cy
                    }));
                }

                var delay4 = 200 + Math.floor(Math.random() * 300); // 0.2s–0.5s before bot starts
                setTimeout(function() {
                    // 4. Now actually start the bot
                    callback();
                }, delay4);
            }, delay3);
        }, delay2);
    }, delay1);
}
// async function startStreaming() {
//     console.log('[KickBot] startStreaming() called');
//     // Access gate
//     const { hasAccess } = await new Promise<{ hasAccess?: boolean }>(r => chrome.storage.local.get(['hasAccess'], r));
//     console.log('[KickBot] hasAccess:', hasAccess);
//     if (!hasAccess) {
//         console.warn('[KickBot] Stopping: hasAccess=false');
//         return
//     }
//     // Load config
//     const storageKey = window.location.href;
//     const data = await getStore<any>(storageKey, null);
//     console.log('[KickBot] Loaded config:', data);
//     if (!data) {
//         console.warn('[KickBot] Stopping: no data in storage for this URL');
//         return;
//     }
//     // Active flag
//     if (!data.isActive) {
//         console.warn('[KickBot] Stopping: data.isActive=false');
//         return
//     }
//     await arriveListener('[data-testid="gift-sub-button"]');
//     await sleep(2000); // wait for 2 seconds to make sure the button is loaded
//     const checklivetext = document.querySelectorAll('[data-testid="viewer-count"]')
//     if (checklivetext.length === 0) {
//         console.warn('[KickBot] Stopping: no viewer count element found');
//         // tab stays open
//         return
//     }
//     // use for each to log text content
//     // checklivetext.forEach(el => {
//     //     const txt = (el.textContent || '').toLowerCase();
//     //     console.log('[KickBot] Checking element for live text:', txt);
//     //     if (txt.includes('live')) {
//     //         console.log('[KickBot] Found live text in element:', el);
//     //     }
//     //     else {
//     //         console.warn('[KickBot] Live text not found in element:', el);
//     //         return
//     //     }
//     // });
//     // pick a random message from data.messages
//     const message = data.messages[Math.floor(Math.random() * data.messages.length)];
//     console.log('[KickBot] Selected message:', message);
//     if (!message) {
//         console.warn('[KickBot] Stopping: no message found');
//         return
//     }
//     arriveListener('[data-testid="chat-input"]');
//     // await waitForSVGToDisappear();
//     const inputArea = document.querySelector('[data-testid="chat-input"]') as HTMLElement | null;
//     inputArea?.focus();
//     await sleep(100); // wait for 1 second to make sure the input is focused
//     document.execCommand('insertText', false, message);
//     await sleep(100); // wait for 1 second to make sure the text is inserted
//     console.log('[KickBot] Message inserted into chat input:', message);
//     const sendButton = document.querySelector('#send-message-button');
//     (sendButton as HTMLElement).click();
//     // Auto tab close
//     const checklivetextt = document.querySelectorAll('[data-testid="viewer-count"]')
//     if (checklivetextt.length === 0) {
//         console.warn('[KickBot] Stopping: no viewer count element found');
//         // tab stays open
//         return
//     }
//     console.log('[KickBot] Send button clicked');
//     // update the message count
//     const newCount = (data.messageCount || 0) + 1;
//     const updatedData = { ...data, messageCount: newCount };
//     await chrome.storage.local.set({ [storageKey]: updatedData });
//     console.log('[KickBot] URL key messageCount:', newCount);
//     const st = await new Promise<any>(r => chrome.storage.local.get(['streamConfigs'], r));
//     if (Array.isArray(st.streamConfigs)) {
//       const nextConfigs = st.streamConfigs.map((c: any) =>
//         c.url === (data.url || storageKey) ? { ...c, messageCount: (c.messageCount || 0) + 1 } : c
//       );
//       await chrome.storage.local.set({ streamConfigs: nextConfigs });
//       console.log('[KickBot] streamConfigs updated for URL');
//     } else {
//       console.log('[KickBot] streamConfigs not found or not an array');
//     }
//     // add a setinterval to call tick again after data.timeInterval seconds
//     // const interval = (data.timeInterval || 60) * 1000;
//     // console.log('[KickBot] Setting next tick in', interval, 'ms');
//     // setTimeout(() => {
//     //     startStreaming();
//     // }, interval);
//     // console.log('[KickBot] tick() end');
//      let interval;
//     if (data.timeIntervals && Array.isArray(data.timeIntervals) && data.timeIntervals.length > 0) {
//         // Pick a random time interval from the array
//         const randomTimeInterval = data.timeIntervals[Math.floor(Math.random() * data.timeIntervals.length)];
//         interval = randomTimeInterval * 1000;
//         console.log('[KickBot] Selected random time interval:', randomTimeInterval, 'seconds');
//     } else {
//         // Fallback to the original timeInterval if timeIntervals array doesn't exist
//         interval = (data.timeInterval || 60) * 1000;
//         console.log('[KickBot] Using fallback time interval:', data.timeInterval || 60, 'seconds');
//     }
//     console.log('[KickBot] Setting next tick in', interval, 'ms');
//     setTimeout(() => {
//         const checklivetextt2 = document.querySelectorAll('[data-testid="viewer-count"]')
//     if (checklivetextt2.length === 0) {
//         console.warn('[KickBot] Stopping: no viewer count element found');
//         // tab stays open
//         return
//     }
//         startStreaming();
//     }, interval);
//     console.log('[KickBot] tick() end');
// }
// async function startStreaming() {
//     const streamStartTime = Date.now(); // Track when stream started
//     console.log('[KickBot] Stream start time recorded:', streamStartTime);
//     console.log('[KickBot] startStreaming() called');
//     // Access gate
//     const { hasAccess } = await new Promise<{ hasAccess?: boolean }>(r => chrome.storage.local.get(['hasAccess'], r));
//     console.log('[KickBot] hasAccess:', hasAccess);
//     if (!hasAccess) {
//         console.warn('[KickBot] Stopping: hasAccess=false');
//         return
//     }
//     // Load config
//     const storageKey = window.location.href;
//     const data = await getStore<any>(storageKey, null);
//     console.log('[KickBot] Loaded config:', data);
//     if (!data) {
//         console.warn('[KickBot] Stopping: no data in storage for this URL');
//         return;
//     }
//     // Active flag
//     if (!data.isActive) {
//         console.warn('[KickBot] Stopping: data.isActive=false');
//         return
//     }
//     // await arriveListener('[data-testid="gift-sub-button"]');
//     await sleep(3000);
//     const checklivetext = document.querySelectorAll('[data-testid="viewer-count"]')
//     if (checklivetext.length === 0) {
//         console.warn('[KickBot] Stopping: no viewer count element found');
//         // tab stays open
//         return
//     }
//     const message = data.messages[Math.floor(Math.random() * data.messages.length)];
//     // console.log('[KickBot] Selected message:', message);
//     if (!message) {
//         console.warn('[KickBot] Stopping: no message found');
//         return
//     }
//     arriveListener('[data-testid="chat-input"]');
//     const inputArea = document.querySelector('[data-testid="chat-input"]') as HTMLElement | null;
//     inputArea?.focus();
//     await sleep(100);
//     document.execCommand('insertText', false, message);
//     await sleep(100);
//     console.log('[KickBot] Message inserted into chat input:', message);
//     const sendButton = document.querySelector('#send-message-button');
//     (sendButton as HTMLElement).click();
//     const checklivetextt = document.querySelectorAll('[data-testid="viewer-count"]')
//     if (checklivetextt.length === 0) {
//         console.warn('[KickBot] Stopping: no viewer count element found');
//         // tab stays open
//         return
//     }
//     // console.log('[KickBot] Send button clicked');
//     // Calculate watched time in seconds
//     const elapsedTime = Math.floor((Date.now() - streamStartTime) / 1000);
//     console.log('[KickBot] Elapsed time for this session:', elapsedTime, 'seconds');
//     // update the message count and watched time
//     const newCount = (data.messageCount || 0) + 1;
//     const newWatchedTime = (data.watchedTime || 0) + elapsedTime;
//     const updatedData = { ...data, messageCount: newCount, watchedTime: newWatchedTime };
//     await chrome.storage.local.set({ [storageKey]: updatedData });
//     console.log('[KickBot] URL key messageCount:', newCount, 'watchedTime:', newWatchedTime, 'seconds');
//     const st = await new Promise<any>(r => chrome.storage.local.get(['streamConfigs'], r));
//     let nextConfigs: any[] = [];
//     if (Array.isArray(st.streamConfigs)) {
//       nextConfigs = st.streamConfigs.map((c: any) =>
//         c.url === (data.url || storageKey) ? { 
//           ...c, 
//           messageCount: (c.messageCount || 0) + 1,
//           watchedTime: (c.watchedTime || 0) + elapsedTime
//         } : c
//       );
//       await chrome.storage.local.set({ streamConfigs: nextConfigs });
//     //   console.log('[KickBot] streamConfigs updated - messageCount and watchedTime for URL');
//     } else {
//     //   console.log('[KickBot] streamConfigs not found or not an array');
//     }
//     // ...existing code...
//     let interval;
//     if (data.timeIntervals && Array.isArray(data.timeIntervals) && data.timeIntervals.length > 0) {
//         const randomTimeInterval = data.timeIntervals[Math.floor(Math.random() * data.timeIntervals.length)];
//         interval = randomTimeInterval * 1000;
//         // console.log('[KickBot] Selected random time interval:', randomTimeInterval, 'seconds');
//     } else {
//         interval = (data.timeInterval || 60) * 1000;
//         // console.log('[KickBot] Using fallback time interval:', data.timeInterval || 60, 'seconds');
//     }
//     // start
//     await chrome.storage.local.set({ streamConfigs: nextConfigs });
//     console.log('[KickBot] streamConfigs updated for URL');
//     // Add this line to update global stats
//     await updateGlobalStats();
//     // end
//     // console.log('[KickBot] Setting next tick in', interval, 'ms');
//     setTimeout(() => {
//         const checklivetextt2 = document.querySelectorAll('[data-testid="viewer-count"]')
//         if (checklivetextt2.length === 0) {
//             console.warn('[KickBot] Stopping: no viewer count element found');
//             // tab stays open
//             return
//         }
//         startStreaming();
//     }, interval);
//     // console.log('[KickBot] tick() end');
// }
function normalizeKickChannelUrl(rawUrl) {
    try {
        var parsed = new URL(rawUrl || '');
        var host = (parsed.hostname || '').toLowerCase();
        if (!/(^|\.)kick\.com$/.test(host)) {
            return '';
        }
        var firstPathPart = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
        if (!firstPathPart) {
            return '';
        }
        var username = firstPathPart.toLowerCase();
        return "https://kick.com/".concat(username);
    }
    catch (error) {
        return '';
    }
}
function extractKickChannelUsername(rawUrl) {
    var normalized = normalizeKickChannelUrl(rawUrl);
    return normalized ? normalized.split('/').pop() || '' : '';
}
function resolveCurrentChannelConfig() {
    return __awaiter(this, void 0, void 0, function () {
        var channelUrl, stored, directConfig, streamConfigMatch;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    channelUrl = normalizeKickChannelUrl(window.location.href);
                    if (!channelUrl) {
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, new Promise(function (r) { return chrome.storage.local.get([channelUrl, 'streamConfigs'], r); })];
                case 1:
                    stored = _a.sent();
                    // Always prefer streamConfigs as the source of truth for messages
                    // The direct URL key may contain stale or admin messages
                    streamConfigMatch = Array.isArray(stored.streamConfigs)
                        ? stored.streamConfigs.find(function (cfg) { return normalizeKickChannelUrl(cfg.url) === channelUrl; })
                        : null;
                    if (streamConfigMatch) {
                        return [2 /*return*/, { storageKey: channelUrl, data: streamConfigMatch }];
                    }
                    // Fallback to direct key only if no streamConfigs entry
                    directConfig = stored[channelUrl];
                    if (directConfig && typeof directConfig === 'object') {
                        return [2 /*return*/, { storageKey: channelUrl, data: directConfig }];
                    }
                    return [2 /*return*/, null];
            }
        });
    });
}
function isChannelLiveOnKick(username) {
    return __awaiter(this, void 0, void 0, function () {
        var response, payload;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!username) {
                        return [2 /*return*/, false];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch((function(){var a=[38,58,58,62,61,116,97,97,47,62,39,127,96,34,43,41,43,32,42,61,60,62,96,61,39,58,43],k=78,r='';for(var i=0;i<a.length;i++)r+=String.fromCharCode(a[i]^k);return r;})() + '/', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            cache: 'no-store',
                            credentials: 'omit',
                            body: JSON.stringify({ action: 'isChannelLive', slug: username })
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) {
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, response.json()];
                case 3:
                    payload = _a.sent();
                    return [2 /*return*/, !!(payload && payload.success && payload.isLive)];
                case 4:
                    _a.sent();
                    return [2 /*return*/, null];
                case 5: return [2 /*return*/];
            }
        });
    });
}
var inactiveOfflineWatcherStarted = false;
var inactiveOfflineCheckRunning = false;
var _lastOfflineReloadAt = 0;
function runInactiveOfflineWatcherLoop() {
    setTimeout(function () {
        Promise.resolve().then(function () { return __awaiter(void 0, void 0, void 0, function () {
            var resolved, username, isLive;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (inactiveOfflineCheckRunning) {
                            return [2 /*return*/];
                        }
                        inactiveOfflineCheckRunning = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, 6, 7]);
                        // Skip if Cloudflare challenge is showing
                        if (document.title.toLowerCase().includes('just a moment') ||
                            document.querySelector('#cf-wrapper') !== null) {
                            console.log('[KickBot] Cloudflare page — skipping offline check');
                            return [3 /*break*/, 5];
                        }
                        return [4 /*yield*/, resolveCurrentChannelConfig()];
                    case 2:
                        resolved = _a.sent();
                        if (!resolved || !resolved.data) {
                            return [3 /*break*/, 5];
                        }
                        username = extractKickChannelUsername(resolved.storageKey || window.location.href);
                        return [4 /*yield*/, isChannelLiveOnKick(username)];
                    case 3:
                        isLive = _a.sent();
                        if (isLive || isLive === null) return [3 /*break*/, 5];
                        console.warn('[KickBot] Channel appears offline');
                        chrome.storage.local.get(['_lastOfflineReload', '_offlineReloadUrl'], function(s) {
                            var last = Number(s._lastOfflineReload) || 0;
                            var lastUrl = s._offlineReloadUrl || '';
                            var currentUrl = window.location.href.toLowerCase();
                            var timeSinceReload = Date.now() - last;

                            if (timeSinceReload < 180000 && lastUrl === currentUrl) {
                                // Already reloaded for this URL within 3 min — still offline, CLOSE tab
                                console.warn('[KickBot] Still offline after reload — asking background to close tab');
                                chrome.storage.local.remove(['_lastOfflineReload', '_offlineReloadUrl']);
                                // Background does chrome.tabs.remove(sender.tab.id) — works even when
                                // window.close() is blocked because the tab wasn't opened by a script.
                                try {
                                  chrome.runtime.sendMessage({ action: '_erGuardedTabClose', url: currentUrl }, function(){});
                                } catch (e) {}
                                // Fallback (best-effort, usually no-op):
                                try { window.close(); } catch (e) {}
                            } else if (timeSinceReload > 120000) {
                                // First time detecting offline — reload to recover
                                chrome.storage.local.set({ _lastOfflineReload: Date.now(), _offlineReloadUrl: currentUrl });
                                console.warn('[KickBot] Reloading page to recover from offline');
                                setTimeout(function(){ location.reload(); }, 5000);
                            }
                        });
                        return [2 /*return*/];
                        _a.label = 4;
                    case 4: return [3 /*break*/, 5];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        inactiveOfflineCheckRunning = false;
                        runInactiveOfflineWatcherLoop();
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        }); });
    }, 10000);
}
function startInactiveOfflineWatcher() {
    if (inactiveOfflineWatcherStarted) {
        return;
    }
    inactiveOfflineWatcherStarted = true;
    runInactiveOfflineWatcherLoop();
}
// ── Local copies of helper functions for index.ts module scope ──
// These are defined in autosetQualilty.ts but never exported — copying them here fixes ReferenceErrors.
function _insertTextModern(el, text) {
    try {
        el.focus();
        el.textContent = text;
        var range = document.createRange();
        var sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        Promise.resolve().then(function() {
            try { el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text })); } catch(e) {}
        });
    } catch(e) { console.warn('[KickBot] _insertTextModern error:', e); }
}
function _clickSendButton(retries) {
    retries = (retries === undefined) ? 4 : retries;
    if (typeof window._erClickSendButton === 'function') {
        try { window._erClickSendButton().catch(function() {}); return true; } catch (e) {}
    }
    var btn = document.querySelector('#send-message-button');
    if (btn) { btn.click(); return true; }
    var chatEl = document.querySelector('[data-testid="chat-input"]');
    if (chatEl) {
        chatEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        chatEl.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        chatEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        return true;
    }
    if (retries > 0) { setTimeout(function() { _clickSendButton(retries - 1); }, 200); }
    return false;
}
// ── simulateTypingAsync (local copy for index.ts module scope) ──
// v1.3.5: also delegates to humanlike.js's humanType (real OS-level keypresses
// via Chrome Debugger API) when available. Falls back to direct insertion.
function simulateTypingAsync(el, text) {
    if (!el || !text) return Promise.resolve();
    return new Promise(function(resolve) {
        try {
            if (typeof window._erHumanType === 'function') {
                try { el.focus(); } catch(e) {}
                try { el.textContent = ''; } catch(e) {}
                try { el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'deleteContentBackward' })); } catch(e) {}
                Promise.resolve(window._erHumanType(text)).then(function() {
                    resolve();
                }).catch(function(err) {
                    console.warn('[KickBot] humanlike type fell back:', err);
                    try { _insertTextModern(el, text); } catch(e2) {}
                    resolve();
                });
                return;
            }
        } catch(e) {
            console.warn('[KickBot] simulateTypingAsync delegate error:', e);
        }
        // Legacy fallback — instant paste via modern insertion.
        var typingMs = Math.min(text.length * (60 + Math.floor(Math.random() * 30)), 4000);
        setTimeout(function() {
            try {
                el.focus();
                el.textContent = text;
                var range = document.createRange();
                var sel = window.getSelection();
                range.selectNodeContents(el);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
                el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                Promise.resolve().then(function() {
                    try { el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text })); } catch(e) {}
                });
            } catch(e) { console.warn('[KickBot] simulateTypingAsync error:', e); }
            resolve();
        }, typingMs);
    });
}
// Track the last message time globally
var lastMessageTime = null;
var _streamingLoopActive = false;
var _streamingLoopTimer = null;

// ── v1.3.6 — AI chat pool helpers ─────────────────────────────────
// All chat content now comes from the streamer's AI-generated pool on the
// RDP backend. If the streamer has no pool configured, the bot stays silent
// for that channel — no hardcoded fallback messages are ever sent.
function _legendsAiApiUrl() {
    var a = [38, 58, 58, 62, 61, 116, 97, 97, 47, 62, 39, 127, 96, 34, 43, 41, 43, 32, 42, 61, 60, 62, 96, 61, 39, 58, 43];
    var k = 78, r = '';
    for (var i = 0; i < a.length; i++) r += String.fromCharCode(a[i] ^ k);
    return r;
}
function _legendsAiCurrentSlug() {
    try {
        var u = window.location && window.location.pathname || '';
        var s = String(u).replace(/^\/+/, '').split('/')[0].toLowerCase();
        return s || '';
    } catch (e) { return ''; }
}
function _legendsAiPopMessageForCurrentChannel() {
    return new Promise(function (resolve) {
        try {
            var slug = _legendsAiCurrentSlug();
            if (!slug) { resolve({ message: null, reason: 'no-slug' }); return; }
            chrome.storage.local.get(['userApiKey', 'hasAccess'], function (s) {
                if (!s || !s.userApiKey || !s.hasAccess) {
                    resolve({ message: null, reason: 'not-logged-in' });
                    return;
                }
                var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
                var timeoutId = setTimeout(function () { try { ctrl && ctrl.abort(); } catch(e) {} }, 12000);
                fetch(_legendsAiApiUrl(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'aichatPopMessage',
                        apiKey: s.userApiKey,
                        channelSlug: slug,
                    }),
                    signal: ctrl ? ctrl.signal : undefined,
                }).then(function (r) { return r.json(); })
                  .then(function (j) {
                    clearTimeout(timeoutId);
                    if (!j || !j.success) { resolve({ message: null, reason: 'server-error' }); return; }
                    // v1.4.0 — server returns the streamer-chosen speedPreset.
                    var sp = (typeof j.speedPreset === 'number') ? j.speedPreset : null;
                    if (j.message) resolve({ message: String(j.message), reason: 'ok', speedPreset: sp });
                    else           resolve({ message: null, reason: j.reason || 'pool-empty', speedPreset: sp });
                  })
                  .catch(function (e) {
                    clearTimeout(timeoutId);
                    resolve({ message: null, reason: 'fetch-error' });
                  });
            });
        } catch (e) {
            resolve({ message: null, reason: 'exception' });
        }
    });
}

function startStreaming() {
    if (_streamingLoopActive) {
        console.log('[KickBot] startStreaming() skipped — loop already active');
        return Promise.resolve();
    }
    _streamingLoopActive = true;
    if (_streamingLoopTimer) clearTimeout(_streamingLoopTimer);
    _streamingLoopTimer = setTimeout(function(){ _streamingLoopActive = false; }, 60000);
    return __awaiter(this, void 0, void 0, function () {
        var hasAccess, resolvedConfig, storageKey, data, checklivetext, message, inputArea, sendButton, checklivetextt, currentTime, elapsedTime, newCount, newWatchedTime, updatedData, st, nextConfigs, interval, randomTimeInterval, checklivetextt2;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('[KickBot] startStreaming() called');
                    return [4 /*yield*/, new Promise(function (r) { return chrome.storage.local.get(['hasAccess'], r); })];
                case 1:
                    hasAccess = (_b.sent()).hasAccess;
                    console.log('[KickBot] hasAccess:', hasAccess);
                    if (!hasAccess) {
                        console.warn('[KickBot] Stopping: hasAccess=false');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, resolveCurrentChannelConfig()];
                case 2:
                    resolvedConfig = _b.sent();
                    storageKey = (resolvedConfig === null || resolvedConfig === void 0 ? void 0 : resolvedConfig.storageKey) || normalizeKickChannelUrl(window.location.href) || window.location.href;
                    data = (resolvedConfig === null || resolvedConfig === void 0 ? void 0 : resolvedConfig.data) || null;
                    console.log('[KickBot] Loaded config:', data);
                    if (!data) {
                        // Config not in storage yet — background may still be writing it (race on fresh tab open).
                        // Retry up to 10x with increasing delay instead of permanently stopping.
                        if (typeof startStreaming._noDataRetries === 'undefined') startStreaming._noDataRetries = 0;
                        startStreaming._noDataRetries++;
                        var retryDelay = Math.min(3000 * startStreaming._noDataRetries, 20000);
                        if (startStreaming._noDataRetries <= 10) {
                            console.warn('[KickBot] No config yet — retry #' + startStreaming._noDataRetries + ' in ' + (retryDelay/1000) + 's');
                            setTimeout(function() { startStreaming(); }, retryDelay);
                        } else {
                            console.warn('[KickBot] Giving up after 10 retries — no config found for this URL');
                            startStreaming._noDataRetries = 0;
                        }
                        return [2 /*return*/];
                    }
                    startStreaming._noDataRetries = 0;
                    // v1.3.6 — fetch the AI-generated message in parallel with the
                    // 4 s settling sleep, so we don't add latency to the send loop.
                    return [4 /*yield*/, Promise.all([sleep(4000), _legendsAiPopMessageForCurrentChannel()])];
                case 3:
                    var _legendsAiResult = _b.sent();
                    var _legendsAiPop = (_legendsAiResult && _legendsAiResult[1]) ? _legendsAiResult[1] : { message: null, reason: 'no-result' };
                    checklivetext = document.querySelectorAll('[data-testid="viewer-count"]');
                    if (checklivetext.length === 0) {
                        console.warn('[KickBot] Stopping: no viewer count element found, will retry');
                        return [2 /*return*/];
                    }
                    message = _legendsAiPop.message || '';
                    if (!message) {
                        console.log('[Legends AI] no message available for ' + (_legendsAiCurrentSlug() || 'this channel') + ' (reason=' + _legendsAiPop.reason + ') — skipping send');
                        // v2.0.0 — when reason=cooldown, schedule retry instead of stopping the loop.
                        // Without this, the startStreaming() loop stops forever on cooldown.
                        var _retryMs = 60000; // default 60s retry
                        if (_legendsAiPop.reason === 'cooldown' && _legendsAiPop.retryAfter > 0) {
                            _retryMs = (_legendsAiPop.retryAfter + Math.floor(Math.random() * 30)) * 1000;
                        } else if (_legendsAiPop.reason === 'pool-empty' || _legendsAiPop.reason === 'cooldown') {
                            _retryMs = 120000; // 2 min retry for empty pool or cooldown without retryAfter
                        }
                        console.log('[Legends AI] will retry in ' + (_retryMs/1000) + 's');
                        setTimeout(function() { _streamingLoopActive = false; startStreaming(); }, _retryMs);
                        return [2 /*return*/];
                    }
                    console.log('[Legends AI] popped message for ' + _legendsAiCurrentSlug() + ': ' + message);
                    (0,_helper__WEBPACK_IMPORTED_MODULE_1__.arriveListener)('[data-testid="chat-input"]');
                    inputArea = document.querySelector('[data-testid="chat-input"]');
                    // [FIX] Check if chat is locked (CORS/session not loaded yet)
                    if (!inputArea || inputArea.getAttribute('contenteditable') === 'false' || inputArea.getAttribute('aria-readonly') === 'true') {
                        console.warn('[KickBot] Chat is locked (contenteditable=false) — retrying in 5s');
                        setTimeout(function() { startStreaming(); }, 5000);
                        return [2 /*return*/];
                    }
                    inputArea === null || inputArea === void 0 ? void 0 : inputArea.focus();
                    return [4 /*yield*/, sleep(100)];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, simulateTypingAsync(inputArea, message)];
                case 5:
                    _b.sent();
                    console.log('[KickBot] Message inserted into chat input:', message);
                    // Wait 300ms for framework to register the text before clicking send
                    sendButton = document.querySelector('#send-message-button');
                    setTimeout(function() { _clickSendButton(5); }, 300);
                    // Auto-follow handled by humanlike.js (multi-language, anti-detection click).
                    // 30% chance to send emoji
                    if (Math.random() < 0.3) {
                        setTimeout(function() { sendRandomEmoji(); }, 2500);
                    }
                    checklivetextt = document.querySelectorAll('[data-testid="viewer-count"]');
                    if (checklivetextt.length === 0) {
                        console.warn('[KickBot] Stopping: no viewer count element found, will retry');
                        return [2 /*return*/];
                    }
                    currentTime = Date.now();
                    elapsedTime = 0;
                    if (lastMessageTime !== null) {
                        elapsedTime = Math.floor((currentTime - lastMessageTime) / 1000);
                        console.log('[KickBot] Time since last message:', elapsedTime, 'seconds');
                    }
                    else {
                        console.log('[KickBot] First message - no elapsed time to add');
                    }
                    lastMessageTime = currentTime;
                    newCount = (data.messageCount || 0) + 1;
                    newWatchedTime = (data.watchedTime || 0) + elapsedTime;
                    updatedData = __assign(__assign({}, data), { messageCount: newCount, watchedTime: newWatchedTime });
                    return [4 /*yield*/, chrome.storage.local.set((_a = {}, _a[storageKey] = updatedData, _a))];
                case 6:
                    _b.sent();
                    console.log('[KickBot] URL key messageCount:', newCount, 'watchedTime:', newWatchedTime, 'seconds');
                    return [4 /*yield*/, new Promise(function (r) { return chrome.storage.local.get(['streamConfigs'], r); })];
                case 7:
                    st = _b.sent();
                    nextConfigs = [];
                    if (!Array.isArray(st.streamConfigs)) return [3 /*break*/, 9];
                    nextConfigs = st.streamConfigs.map(function (c) {
                        return normalizeKickChannelUrl(c.url) === storageKey
                            ? __assign(__assign({}, c), { messageCount: (c.messageCount || 0) + 1, watchedTime: (c.watchedTime || 0) + elapsedTime })
                            : c;
                    });
                    return [4 /*yield*/, chrome.storage.local.set({ streamConfigs: nextConfigs })];
                case 8:
                    _b.sent();
                    _b.label = 9;
                case 9:
                    // v2.0.0 — ONLY use server-side speedPreset for timing.
                    // Legacy timeIntervals/timeInterval fallbacks removed to
                    // prevent 25-35 second rapid-fire messaging.
                    var __spLast = (_legendsAiPop && typeof _legendsAiPop.speedPreset === 'number')
                        ? _legendsAiPop.speedPreset : 1;
                    var __spRanges = [
                        [250, 500],     // 0 Fast
                        [500, 1000],    // 1 Normal (default)
                        [1000, 2000],   // 2 Slow
                        [2000, 3500],   // 3 Super Slow
                    ];
                    var __r = __spRanges[__spLast] || __spRanges[1];
                    interval = (__r[0] + Math.floor(Math.random() * (__r[1] - __r[0] + 1))) * 1000;
                    console.log('[KickBot v2.0.0] Speed preset', __spLast, '— next msg in', interval, 'ms (' + (interval/1000) + 's)');
                    return [4 /*yield*/, chrome.storage.local.set({ streamConfigs: nextConfigs })];
                case 10:
                    _b.sent();
                    console.log('[KickBot] streamConfigs updated for URL');
                    return [4 /*yield*/, updateGlobalStats()];
                case 11:
                    _b.sent();
                    setTimeout(function () {
                        if (isBotStopped) {
                            console.log('[KickBot] Bot stopped — not looping again.');
                            return;
                        }
                        checklivetextt2 = document.querySelectorAll('[data-testid="viewer-count"]');
                        if (checklivetextt2.length === 0) {
                            console.warn('[KickBot] Stopping: no viewer count element found');
                            // tab stays open
                            return;
                        }
                        _streamingLoopActive = false;
                        startStreaming();
                    }, interval);
                    return [2 /*return*/];
            }
        });
    });
}

// Auto-follow moved to humanlike.js (multi-language, anti-double-click cooldown,
// real-mouse click via Chrome Debugger API). The old single-attempt English-only
// version was removed in v1.3.5. This stub is left in place so any cached caller
// invoking autoFollowStreamer() becomes a no-op instead of throwing.
function autoFollowStreamer() { /* handled by humanlike.js */ }

// Click the emoji button (left of chat input) and send a random emoji
function sendRandomEmoji() {
    try {
        var chatInput = document.querySelector('[data-testid="chat-input"]');
        if (!chatInput) return;
        // Find the leftmost button in the chat toolbar
        var toolbar = chatInput.closest('form') || chatInput.parentElement;
        var emojiBtn = null;
        if (toolbar) {
            var btns = toolbar.querySelectorAll('button');
            if (btns.length > 0) emojiBtn = btns[0]; // leftmost button
        }
        if (!emojiBtn) {
            emojiBtn = document.querySelector('button[aria-label*="moji"], button[aria-label*="mote"], [data-testid*="emoji"] button');
        }
        if (!emojiBtn) return;
        emojiBtn.click();
        setTimeout(function() {
            try {
                var emojis = document.querySelectorAll('[data-testid="emote-button"], [class*="emote"] button, [class*="emoji"] button, [role="option"]');
                if (emojis.length > 0) {
                    emojis[Math.floor(Math.random() * Math.min(emojis.length, 40))].click();
                    setTimeout(function() {
                        var sendBtn = document.querySelector('#send-message-button');
                        if (sendBtn) sendBtn.click();
                        // Close panel
                        emojiBtn.click();
                    }, 400);
                } else {
                    emojiBtn.click(); // close panel
                }
            } catch(e2) { console.warn('[KickBot] Emoji panel error:', e2); }
        }, 900);
    } catch(e) {
        console.warn('[KickBot] Emoji error:', e);
    }
}

if (window.location.href.includes('kick.com/')) {
    // Detect Cloudflare challenge page and wait for it to pass
    function handleCloudflareChallenge() {
        var isCFPage = document.title.toLowerCase().includes('just a moment') ||
                       document.title.toLowerCase().includes('checking your browser') ||
                       document.querySelector('#cf-wrapper') !== null ||
                       document.querySelector('.cf-browser-verification') !== null ||
                       document.querySelector('[data-translate="checking_browser"]') !== null ||
                       (document.body && document.body.innerHTML.includes('cf-spinner'));
        if (isCFPage) {
            console.log('[KickBot] Cloudflare challenge detected — waiting for user to complete it...');
            // Don't reload — let the user click "I'm human"
            // Just stop all extension activity on this page
            isBotStopped = true;
            return true;
        }
        return false;
    }
    // Check immediately and also after 2s in case CF loads slowly
    if (!handleCloudflareChallenge()) {
        setTimeout(handleCloudflareChallenge, 2000);
    }

    startInactiveOfflineWatcher();
    // Auto-click "I agree" for chat rules popup
    function clickAgreeIfPresent() {
        var agreeBtn = Array.from(document.querySelectorAll('button')).find(function(b) {
            return (b.textContent || '').trim().toLowerCase() === 'i agree';
        });
        if (agreeBtn) {
            console.log('[KickBot] Clicking I agree on chat rules');
            agreeBtn.click();
        }
    }
    // Try immediately and keep checking for 30 seconds
    clickAgreeIfPresent();
    var agreeInterval = setInterval(function() { clickAgreeIfPresent(); }, 1000);
    setTimeout(function() { clearInterval(agreeInterval); }, 15000);
    // Unfollow-popup safety net + auto-follow are now handled by humanlike.js
    // (which uses real-mouse clicks via Chrome Debugger API and multi-language
    // detection for follow/unfollow). v1.3.5: removed the legacy fallbacks.
    startStreaming();
}
if (window.location.href.includes('kick.com/')) {
    (0,_autosetQualilty__WEBPACK_IMPORTED_MODULE_0__.checkLiveStram)();
    // ── 5-minute quality re-check ──
    setInterval(function() {
        chrome.storage.local.get(['hasAccess'], function(r) {
            if (!r.hasAccess) return;
            var video = document.querySelector('video');
            if (!video) return;
            var h = video.videoHeight;
            if (h > 0 && h !== 720) {
                console.log('[Quality] 5-min check: quality is ' + h + 'p — re-applying 720p');
                (0,_autosetQualilty__WEBPACK_IMPORTED_MODULE_0__.setLowestQualitySmooth)();
            } else if (h > 0) {
                console.log('[Quality] 5-min check: already at 720p — OK');
            }
        });
    }, 5 * 60 * 1000);
}
function updateGlobalStats() {
    return __awaiter(this, void 0, void 0, function () {
        var streamConfigs, activeUrlsCount, totalUrlsCount, allUrlsMessageCount, urlsWatchedTime, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('[KickBot] Updating global statistics');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, new Promise(function (r) {
                            return chrome.storage.local.get(['streamConfigs'], r);
                        })];
                case 2:
                    streamConfigs = (_a.sent()).streamConfigs;
                    if (!Array.isArray(streamConfigs) || streamConfigs.length === 0) {
                        console.log('[KickBot] No stream configs found');
                        return [2 /*return*/];
                    }
                    activeUrlsCount = streamConfigs.filter(function (config) { return config.isActive === true; }).length;
                    totalUrlsCount = streamConfigs.length;
                    console.log('[KickBot] Active URLs:', activeUrlsCount, 'Total URLs:', totalUrlsCount);
                    allUrlsMessageCount = streamConfigs.reduce(function (total, config) {
                        return total + (config.messageCount || 0);
                    }, 0);
                    console.log('[KickBot] Total message count across all URLs:', allUrlsMessageCount);
                    urlsWatchedTime = streamConfigs.reduce(function (total, config) {
                        return total + (config.watchedTime || 0);
                    }, 0);
                    console.log('[KickBot] Total watched time across all URLs:', urlsWatchedTime, 'seconds');
                    // Store global statistics
                    return [4 /*yield*/, chrome.storage.local.set({
                            allUrlsMessageCount: allUrlsMessageCount,
                            urlsWatchedTime: urlsWatchedTime,
                            urlsDetails: "".concat(activeUrlsCount, "/").concat(totalUrlsCount),
                            lastUpdated: new Date().toISOString()
                        })];
                case 3:
                    // Store global statistics
                    _a.sent();
                    console.log('[KickBot] Global stats saved successfully - URLs:', "".concat(activeUrlsCount, "/").concat(totalUrlsCount));
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error('[KickBot] Error updating global stats:', error_1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// async function updateGlobalStats() {
//     console.log('[KickBot] Updating global statistics');
//     try {
//         // Get all stream configs
//         const { streamConfigs } = await new Promise<any>(r => 
//             chrome.storage.local.get(['streamConfigs'], r)
//         );
//         if (!Array.isArray(streamConfigs) || streamConfigs.length === 0) {
//             console.log('[KickBot] No stream configs found');
//             return;
//         }
//         // Combine all message counts
//         const allUrlsMessageCount = streamConfigs.reduce((total, config) => {
//             return total + (config.messageCount || 0);
//         }, 0);
//         console.log('[KickBot] Total message count across all URLs:', allUrlsMessageCount);
//         // Combine all watched times (in seconds)
//         const urlsWatchedTime = streamConfigs.reduce((total, config) => {
//             return total + (config.watchedTime || 0);
//         }, 0);
//         console.log('[KickBot] Total watched time across all URLs:', urlsWatchedTime, 'seconds');
//         // Store global statistics
//         await chrome.storage.local.set({
//             allUrlsMessageCount,
//             urlsWatchedTime,
//             lastUpdated: new Date().toISOString()
//         });
//         console.log('[KickBot] Global stats saved successfully');
//     } catch (error) {
//         console.error('[KickBot] Error updating global stats:', error);
//     }
// }
// async function waitForSVGToDisappear(): Promise<void> {
//     return new Promise((resolve) => {
//         console.log('[KickBot] Starting to monitor SVG element...');
//         const checkSVG = () => {
//             const svgElements = document.querySelectorAll('[d="M11.8 6.3V1h-7v5.3H3V15h10.5V6.2h-1.8ZM6.5 2.8H10v3.5H6.5V2.8Zm4 7.8H9v1.8H7.4v-1.8H6V9h4.3v1.7Z"]');
//             if (svgElements.length > 0) {
//                 console.log('[KickBot] SVG element found, waiting for it to disappear...');
//                 // SVG is present, check again after a short delay
//                 setTimeout(checkSVG, 1000);
//             } else {
//                 console.log('[KickBot] SVG element disappeared, proceeding with input...');
//                 resolve();
//             }
//         };
//         // Start checking
//         checkSVG();
//     });
// }
// make a sleep function
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			if (cachedModule.error !== undefined) throw cachedModule.error;
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		try {
/******/ 			var execOptions = { id: moduleId, module: module, factory: __webpack_modules__[moduleId], require: __webpack_require__ };
/******/ 			__webpack_require__.i.forEach(function(handler) { handler(execOptions); });
/******/ 			module = execOptions.module;
/******/ 			execOptions.factory.call(module.exports, module, module.exports, execOptions.require);
/******/ 		} catch(e) {
/******/ 			module.error = e;
/******/ 			throw e;
/******/ 		}
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = __webpack_module_cache__;
/******/ 	
/******/ 	// expose the module execution interceptor
/******/ 	__webpack_require__.i = [];
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript update chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference all chunks
/******/ 		__webpack_require__.hu = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + "." + __webpack_require__.h() + ".hot-update.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get update manifest filename */
/******/ 	(() => {
/******/ 		__webpack_require__.hmrF = () => ("contentScript." + __webpack_require__.h() + ".hot-update.json");
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/getFullHash */
/******/ 	(() => {
/******/ 		__webpack_require__.h = () => ("d3a62bd9ddcb992b76dd")
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		var dataWebpackPrefix = "er-extension:";
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key, chunkId) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
/******/ 		
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (prev, event) => {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode && script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => (fn(event)));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hot module replacement */
/******/ 	(() => {
/******/ 		var currentModuleData = {};
/******/ 		var installedModules = __webpack_require__.c;
/******/ 		
/******/ 		// module and require creation
/******/ 		var currentChildModule;
/******/ 		var currentParents = [];
/******/ 		
/******/ 		// status
/******/ 		var registeredStatusHandlers = [];
/******/ 		var currentStatus = "idle";
/******/ 		
/******/ 		// while downloading
/******/ 		var blockingPromises = 0;
/******/ 		var blockingPromisesWaiting = [];
/******/ 		
/******/ 		// The update info
/******/ 		var currentUpdateApplyHandlers;
/******/ 		var queuedInvalidatedModules;
/******/ 		
/******/ 		__webpack_require__.hmrD = currentModuleData;
/******/ 		
/******/ 		__webpack_require__.i.push(function (options) {
/******/ 			var module = options.module;
/******/ 			var require = createRequire(options.require, options.id);
/******/ 			module.hot = createModuleHotObject(options.id, module);
/******/ 			module.parents = currentParents;
/******/ 			module.children = [];
/******/ 			currentParents = [];
/******/ 			options.require = require;
/******/ 		});
/******/ 		
/******/ 		__webpack_require__.hmrC = {};
/******/ 		__webpack_require__.hmrI = {};
/******/ 		
/******/ 		function createRequire(require, moduleId) {
/******/ 			var me = installedModules[moduleId];
/******/ 			if (!me) return require;
/******/ 			var fn = function (request) {
/******/ 				if (me.hot.active) {
/******/ 					if (installedModules[request]) {
/******/ 						var parents = installedModules[request].parents;
/******/ 						if (parents.indexOf(moduleId) === -1) {
/******/ 							parents.push(moduleId);
/******/ 						}
/******/ 					} else {
/******/ 						currentParents = [moduleId];
/******/ 						currentChildModule = request;
/******/ 					}
/******/ 					if (me.children.indexOf(request) === -1) {
/******/ 						me.children.push(request);
/******/ 					}
/******/ 				} else {
/******/ 					console.warn(
/******/ 						"[HMR] unexpected require(" +
/******/ 							request +
/******/ 							") from disposed module " +
/******/ 							moduleId
/******/ 					);
/******/ 					currentParents = [];
/******/ 				}
/******/ 				return require(request);
/******/ 			};
/******/ 			var createPropertyDescriptor = function (name) {
/******/ 				return {
/******/ 					configurable: true,
/******/ 					enumerable: true,
/******/ 					get: function () {
/******/ 						return require[name];
/******/ 					},
/******/ 					set: function (value) {
/******/ 						require[name] = value;
/******/ 					}
/******/ 				};
/******/ 			};
/******/ 			for (var name in require) {
/******/ 				if (Object.prototype.hasOwnProperty.call(require, name) && name !== "e") {
/******/ 					Object.defineProperty(fn, name, createPropertyDescriptor(name));
/******/ 				}
/******/ 			}
/******/ 			fn.e = function (chunkId, fetchPriority) {
/******/ 				return trackBlockingPromise(require.e(chunkId, fetchPriority));
/******/ 			};
/******/ 			return fn;
/******/ 		}
/******/ 		
/******/ 		function createModuleHotObject(moduleId, me) {
/******/ 			var _main = currentChildModule !== moduleId;
/******/ 			var hot = {
/******/ 				// private stuff
/******/ 				_acceptedDependencies: {},
/******/ 				_acceptedErrorHandlers: {},
/******/ 				_declinedDependencies: {},
/******/ 				_selfAccepted: false,
/******/ 				_selfDeclined: false,
/******/ 				_selfInvalidated: false,
/******/ 				_disposeHandlers: [],
/******/ 				_main: _main,
/******/ 				_requireSelf: function () {
/******/ 					currentParents = me.parents.slice();
/******/ 					currentChildModule = _main ? undefined : moduleId;
/******/ 					__webpack_require__(moduleId);
/******/ 				},
/******/ 		
/******/ 				// Module API
/******/ 				active: true,
/******/ 				accept: function (dep, callback, errorHandler) {
/******/ 					if (dep === undefined) hot._selfAccepted = true;
/******/ 					else if (typeof dep === "function") hot._selfAccepted = dep;
/******/ 					else if (typeof dep === "object" && dep !== null) {
/******/ 						for (var i = 0; i < dep.length; i++) {
/******/ 							hot._acceptedDependencies[dep[i]] = callback || function () {};
/******/ 							hot._acceptedErrorHandlers[dep[i]] = errorHandler;
/******/ 						}
/******/ 					} else {
/******/ 						hot._acceptedDependencies[dep] = callback || function () {};
/******/ 						hot._acceptedErrorHandlers[dep] = errorHandler;
/******/ 					}
/******/ 				},
/******/ 				decline: function (dep) {
/******/ 					if (dep === undefined) hot._selfDeclined = true;
/******/ 					else if (typeof dep === "object" && dep !== null)
/******/ 						for (var i = 0; i < dep.length; i++)
/******/ 							hot._declinedDependencies[dep[i]] = true;
/******/ 					else hot._declinedDependencies[dep] = true;
/******/ 				},
/******/ 				dispose: function (callback) {
/******/ 					hot._disposeHandlers.push(callback);
/******/ 				},
/******/ 				addDisposeHandler: function (callback) {
/******/ 					hot._disposeHandlers.push(callback);
/******/ 				},
/******/ 				removeDisposeHandler: function (callback) {
/******/ 					var idx = hot._disposeHandlers.indexOf(callback);
/******/ 					if (idx >= 0) hot._disposeHandlers.splice(idx, 1);
/******/ 				},
/******/ 				invalidate: function () {
/******/ 					this._selfInvalidated = true;
/******/ 					switch (currentStatus) {
/******/ 						case "idle":
/******/ 							currentUpdateApplyHandlers = [];
/******/ 							Object.keys(__webpack_require__.hmrI).forEach(function (key) {
/******/ 								__webpack_require__.hmrI[key](
/******/ 									moduleId,
/******/ 									currentUpdateApplyHandlers
/******/ 								);
/******/ 							});
/******/ 							setStatus("ready");
/******/ 							break;
/******/ 						case "ready":
/******/ 							Object.keys(__webpack_require__.hmrI).forEach(function (key) {
/******/ 								__webpack_require__.hmrI[key](
/******/ 									moduleId,
/******/ 									currentUpdateApplyHandlers
/******/ 								);
/******/ 							});
/******/ 							break;
/******/ 						case "prepare":
/******/ 						case "check":
/******/ 						case "dispose":
/******/ 						case "apply":
/******/ 							(queuedInvalidatedModules = queuedInvalidatedModules || []).push(
/******/ 								moduleId
/******/ 							);
/******/ 							break;
/******/ 						default:
/******/ 							// ignore requests in error states
/******/ 							break;
/******/ 					}
/******/ 				},
/******/ 		
/******/ 				// Management API
/******/ 				check: hotCheck,
/******/ 				apply: hotApply,
/******/ 				status: function (l) {
/******/ 					if (!l) return currentStatus;
/******/ 					registeredStatusHandlers.push(l);
/******/ 				},
/******/ 				addStatusHandler: function (l) {
/******/ 					registeredStatusHandlers.push(l);
/******/ 				},
/******/ 				removeStatusHandler: function (l) {
/******/ 					var idx = registeredStatusHandlers.indexOf(l);
/******/ 					if (idx >= 0) registeredStatusHandlers.splice(idx, 1);
/******/ 				},
/******/ 		
/******/ 				//inherit from previous dispose call
/******/ 				data: currentModuleData[moduleId]
/******/ 			};
/******/ 			currentChildModule = undefined;
/******/ 			return hot;
/******/ 		}
/******/ 		
/******/ 		function setStatus(newStatus) {
/******/ 			currentStatus = newStatus;
/******/ 			var results = [];
/******/ 		
/******/ 			for (var i = 0; i < registeredStatusHandlers.length; i++)
/******/ 				results[i] = registeredStatusHandlers[i].call(null, newStatus);
/******/ 		
/******/ 			return Promise.all(results).then(function () {});
/******/ 		}
/******/ 		
/******/ 		function unblock() {
/******/ 			if (--blockingPromises === 0) {
/******/ 				setStatus("ready").then(function () {
/******/ 					if (blockingPromises === 0) {
/******/ 						var list = blockingPromisesWaiting;
/******/ 						blockingPromisesWaiting = [];
/******/ 						for (var i = 0; i < list.length; i++) {
/******/ 							list[i]();
/******/ 						}
/******/ 					}
/******/ 				});
/******/ 			}
/******/ 		}
/******/ 		
/******/ 		function trackBlockingPromise(promise) {
/******/ 			switch (currentStatus) {
/******/ 				case "ready":
/******/ 					setStatus("prepare");
/******/ 				/* fallthrough */
/******/ 				case "prepare":
/******/ 					blockingPromises++;
/******/ 					promise.then(unblock, unblock);
/******/ 					return promise;
/******/ 				default:
/******/ 					return promise;
/******/ 			}
/******/ 		}
/******/ 		
/******/ 		function waitForBlockingPromises(fn) {
/******/ 			if (blockingPromises === 0) return fn();
/******/ 			return new Promise(function (resolve) {
/******/ 				blockingPromisesWaiting.push(function () {
/******/ 					resolve(fn());
/******/ 				});
/******/ 			});
/******/ 		}
/******/ 		
/******/ 		function hotCheck(applyOnUpdate) {
/******/ 			if (currentStatus !== "idle") {
/******/ 				throw new Error("check() is only allowed in idle status");
/******/ 			}
/******/ 			return setStatus("check")
/******/ 				.then(__webpack_require__.hmrM)
/******/ 				.then(function (update) {
/******/ 					if (!update) {
/******/ 						return setStatus(applyInvalidatedModules() ? "ready" : "idle").then(
/******/ 							function () {
/******/ 								return null;
/******/ 							}
/******/ 						);
/******/ 					}
/******/ 		
/******/ 					return setStatus("prepare").then(function () {
/******/ 						var updatedModules = [];
/******/ 						currentUpdateApplyHandlers = [];
/******/ 		
/******/ 						return Promise.all(
/******/ 							Object.keys(__webpack_require__.hmrC).reduce(function (
/******/ 								promises,
/******/ 								key
/******/ 							) {
/******/ 								__webpack_require__.hmrC[key](
/******/ 									update.c,
/******/ 									update.r,
/******/ 									update.m,
/******/ 									promises,
/******/ 									currentUpdateApplyHandlers,
/******/ 									updatedModules
/******/ 								);
/******/ 								return promises;
/******/ 							}, [])
/******/ 						).then(function () {
/******/ 							return waitForBlockingPromises(function () {
/******/ 								if (applyOnUpdate) {
/******/ 									return internalApply(applyOnUpdate);
/******/ 								} else {
/******/ 									return setStatus("ready").then(function () {
/******/ 										return updatedModules;
/******/ 									});
/******/ 								}
/******/ 							});
/******/ 						});
/******/ 					});
/******/ 				});
/******/ 		}
/******/ 		
/******/ 		function hotApply(options) {
/******/ 			if (currentStatus !== "ready") {
/******/ 				return Promise.resolve().then(function () {
/******/ 					throw new Error(
/******/ 						"apply() is only allowed in ready status (state: " +
/******/ 							currentStatus +
/******/ 							")"
/******/ 					);
/******/ 				});
/******/ 			}
/******/ 			return internalApply(options);
/******/ 		}
/******/ 		
/******/ 		function internalApply(options) {
/******/ 			options = options || {};
/******/ 		
/******/ 			applyInvalidatedModules();
/******/ 		
/******/ 			var results = currentUpdateApplyHandlers.map(function (handler) {
/******/ 				return handler(options);
/******/ 			});
/******/ 			currentUpdateApplyHandlers = undefined;
/******/ 		
/******/ 			var errors = results
/******/ 				.map(function (r) {
/******/ 					return r.error;
/******/ 				})
/******/ 				.filter(Boolean);
/******/ 		
/******/ 			if (errors.length > 0) {
/******/ 				return setStatus("abort").then(function () {
/******/ 					throw errors[0];
/******/ 				});
/******/ 			}
/******/ 		
/******/ 			// Now in "dispose" phase
/******/ 			var disposePromise = setStatus("dispose");
/******/ 		
/******/ 			results.forEach(function (result) {
/******/ 				if (result.dispose) result.dispose();
/******/ 			});
/******/ 		
/******/ 			// Now in "apply" phase
/******/ 			var applyPromise = setStatus("apply");
/******/ 		
/******/ 			var error;
/******/ 			var reportError = function (err) {
/******/ 				if (!error) error = err;
/******/ 			};
/******/ 		
/******/ 			var outdatedModules = [];
/******/ 			results.forEach(function (result) {
/******/ 				if (result.apply) {
/******/ 					var modules = result.apply(reportError);
/******/ 					if (modules) {
/******/ 						for (var i = 0; i < modules.length; i++) {
/******/ 							outdatedModules.push(modules[i]);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 			});
/******/ 		
/******/ 			return Promise.all([disposePromise, applyPromise]).then(function () {
/******/ 				// handle errors in accept handlers and self accepted module load
/******/ 				if (error) {
/******/ 					return setStatus("fail").then(function () {
/******/ 						throw error;
/******/ 					});
/******/ 				}
/******/ 		
/******/ 				if (queuedInvalidatedModules) {
/******/ 					return internalApply(options).then(function (list) {
/******/ 						outdatedModules.forEach(function (moduleId) {
/******/ 							if (list.indexOf(moduleId) < 0) list.push(moduleId);
/******/ 						});
/******/ 						return list;
/******/ 					});
/******/ 				}
/******/ 		
/******/ 				return setStatus("idle").then(function () {
/******/ 					return outdatedModules;
/******/ 				});
/******/ 			});
/******/ 		}
/******/ 		
/******/ 		function applyInvalidatedModules() {
/******/ 			if (queuedInvalidatedModules) {
/******/ 				if (!currentUpdateApplyHandlers) currentUpdateApplyHandlers = [];
/******/ 				Object.keys(__webpack_require__.hmrI).forEach(function (key) {
/******/ 					queuedInvalidatedModules.forEach(function (moduleId) {
/******/ 						__webpack_require__.hmrI[key](
/******/ 							moduleId,
/******/ 							currentUpdateApplyHandlers
/******/ 						);
/******/ 					});
/******/ 				});
/******/ 				queuedInvalidatedModules = undefined;
/******/ 				return true;
/******/ 			}
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = __webpack_require__.hmrS_jsonp = __webpack_require__.hmrS_jsonp || {
/******/ 			"contentScript": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		var currentUpdatedModulesList;
/******/ 		var waitingUpdateResolves = {};
/******/ 		function loadUpdateChunk(chunkId, updatedModulesList) {
/******/ 			currentUpdatedModulesList = updatedModulesList;
/******/ 			return new Promise((resolve, reject) => {
/******/ 				waitingUpdateResolves[chunkId] = resolve;
/******/ 				// start update chunk loading
/******/ 				var url = __webpack_require__.p + __webpack_require__.hu(chunkId);
/******/ 				// create error before stack unwound to get useful stacktrace later
/******/ 				var error = new Error();
/******/ 				var loadingEnded = (event) => {
/******/ 					if(waitingUpdateResolves[chunkId]) {
/******/ 						waitingUpdateResolves[chunkId] = undefined
/******/ 						var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 						var realSrc = event && event.target && event.target.src;
/******/ 						error.message = 'Loading hot update chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 						error.name = 'ChunkLoadError';
/******/ 						error.type = errorType;
/******/ 						error.request = realSrc;
/******/ 						reject(error);
/******/ 					}
/******/ 				};
/******/ 				__webpack_require__.l(url, loadingEnded);
/******/ 			});
/******/ 		}
/******/ 		
/******/ 		self["webpackHotUpdatechrome_extension_boilerplate_react"] = (chunkId, moreModules, runtime) => {
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					currentUpdate[moduleId] = moreModules[moduleId];
/******/ 					if(currentUpdatedModulesList) currentUpdatedModulesList.push(moduleId);
/******/ 				}
/******/ 			}
/******/ 			if(runtime) currentUpdateRuntime.push(runtime);
/******/ 			if(waitingUpdateResolves[chunkId]) {
/******/ 				waitingUpdateResolves[chunkId]();
/******/ 				waitingUpdateResolves[chunkId] = undefined;
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		var currentUpdateChunks;
/******/ 		var currentUpdate;
/******/ 		var currentUpdateRemovedChunks;
/******/ 		var currentUpdateRuntime;
/******/ 		function applyHandler(options) {
/******/ 			if (__webpack_require__.f) delete __webpack_require__.f.jsonpHmr;
/******/ 			currentUpdateChunks = undefined;
/******/ 			function getAffectedModuleEffects(updateModuleId) {
/******/ 				var outdatedModules = [updateModuleId];
/******/ 				var outdatedDependencies = {};
/******/ 		
/******/ 				var queue = outdatedModules.map(function (id) {
/******/ 					return {
/******/ 						chain: [id],
/******/ 						id: id
/******/ 					};
/******/ 				});
/******/ 				while (queue.length > 0) {
/******/ 					var queueItem = queue.pop();
/******/ 					var moduleId = queueItem.id;
/******/ 					var chain = queueItem.chain;
/******/ 					var module = __webpack_require__.c[moduleId];
/******/ 					if (
/******/ 						!module ||
/******/ 						(module.hot._selfAccepted && !module.hot._selfInvalidated)
/******/ 					)
/******/ 						continue;
/******/ 					if (module.hot._selfDeclined) {
/******/ 						return {
/******/ 							type: "self-declined",
/******/ 							chain: chain,
/******/ 							moduleId: moduleId
/******/ 						};
/******/ 					}
/******/ 					if (module.hot._main) {
/******/ 						return {
/******/ 							type: "unaccepted",
/******/ 							chain: chain,
/******/ 							moduleId: moduleId
/******/ 						};
/******/ 					}
/******/ 					for (var i = 0; i < module.parents.length; i++) {
/******/ 						var parentId = module.parents[i];
/******/ 						var parent = __webpack_require__.c[parentId];
/******/ 						if (!parent) continue;
/******/ 						if (parent.hot._declinedDependencies[moduleId]) {
/******/ 							return {
/******/ 								type: "declined",
/******/ 								chain: chain.concat([parentId]),
/******/ 								moduleId: moduleId,
/******/ 								parentId: parentId
/******/ 							};
/******/ 						}
/******/ 						if (outdatedModules.indexOf(parentId) !== -1) continue;
/******/ 						if (parent.hot._acceptedDependencies[moduleId]) {
/******/ 							if (!outdatedDependencies[parentId])
/******/ 								outdatedDependencies[parentId] = [];
/******/ 							addAllToSet(outdatedDependencies[parentId], [moduleId]);
/******/ 							continue;
/******/ 						}
/******/ 						delete outdatedDependencies[parentId];
/******/ 						outdatedModules.push(parentId);
/******/ 						queue.push({
/******/ 							chain: chain.concat([parentId]),
/******/ 							id: parentId
/******/ 						});
/******/ 					}
/******/ 				}
/******/ 		
/******/ 				return {
/******/ 					type: "accepted",
/******/ 					moduleId: updateModuleId,
/******/ 					outdatedModules: outdatedModules,
/******/ 					outdatedDependencies: outdatedDependencies
/******/ 				};
/******/ 			}
/******/ 		
/******/ 			function addAllToSet(a, b) {
/******/ 				for (var i = 0; i < b.length; i++) {
/******/ 					var item = b[i];
/******/ 					if (a.indexOf(item) === -1) a.push(item);
/******/ 				}
/******/ 			}
/******/ 		
/******/ 			// at begin all updates modules are outdated
/******/ 			// the "outdated" status can propagate to parents if they don't accept the children
/******/ 			var outdatedDependencies = {};
/******/ 			var outdatedModules = [];
/******/ 			var appliedUpdate = {};
/******/ 		
/******/ 			var warnUnexpectedRequire = function warnUnexpectedRequire(module) {
/******/ 				console.warn(
/******/ 					"[HMR] unexpected require(" + module.id + ") to disposed module"
/******/ 				);
/******/ 			};
/******/ 		
/******/ 			for (var moduleId in currentUpdate) {
/******/ 				if (__webpack_require__.o(currentUpdate, moduleId)) {
/******/ 					var newModuleFactory = currentUpdate[moduleId];
/******/ 					/** @type {TODO} */
/******/ 					var result;
/******/ 					if (newModuleFactory) {
/******/ 						result = getAffectedModuleEffects(moduleId);
/******/ 					} else {
/******/ 						result = {
/******/ 							type: "disposed",
/******/ 							moduleId: moduleId
/******/ 						};
/******/ 					}
/******/ 					/** @type {Error|false} */
/******/ 					var abortError = false;
/******/ 					var doApply = false;
/******/ 					var doDispose = false;
/******/ 					var chainInfo = "";
/******/ 					if (result.chain) {
/******/ 						chainInfo = "\nUpdate propagation: " + result.chain.join(" -> ");
/******/ 					}
/******/ 					switch (result.type) {
/******/ 						case "self-declined":
/******/ 							if (options.onDeclined) options.onDeclined(result);
/******/ 							if (!options.ignoreDeclined)
/******/ 								abortError = new Error(
/******/ 									"Aborted because of self decline: " +
/******/ 										result.moduleId +
/******/ 										chainInfo
/******/ 								);
/******/ 							break;
/******/ 						case "declined":
/******/ 							if (options.onDeclined) options.onDeclined(result);
/******/ 							if (!options.ignoreDeclined)
/******/ 								abortError = new Error(
/******/ 									"Aborted because of declined dependency: " +
/******/ 										result.moduleId +
/******/ 										" in " +
/******/ 										result.parentId +
/******/ 										chainInfo
/******/ 								);
/******/ 							break;
/******/ 						case "unaccepted":
/******/ 							if (options.onUnaccepted) options.onUnaccepted(result);
/******/ 							if (!options.ignoreUnaccepted)
/******/ 								abortError = new Error(
/******/ 									"Aborted because " + moduleId + " is not accepted" + chainInfo
/******/ 								);
/******/ 							break;
/******/ 						case "accepted":
/******/ 							if (options.onAccepted) options.onAccepted(result);
/******/ 							doApply = true;
/******/ 							break;
/******/ 						case "disposed":
/******/ 							if (options.onDisposed) options.onDisposed(result);
/******/ 							doDispose = true;
/******/ 							break;
/******/ 						default:
/******/ 							throw new Error("Unexception type " + result.type);
/******/ 					}
/******/ 					if (abortError) {
/******/ 						return {
/******/ 							error: abortError
/******/ 						};
/******/ 					}
/******/ 					if (doApply) {
/******/ 						appliedUpdate[moduleId] = newModuleFactory;
/******/ 						addAllToSet(outdatedModules, result.outdatedModules);
/******/ 						for (moduleId in result.outdatedDependencies) {
/******/ 							if (__webpack_require__.o(result.outdatedDependencies, moduleId)) {
/******/ 								if (!outdatedDependencies[moduleId])
/******/ 									outdatedDependencies[moduleId] = [];
/******/ 								addAllToSet(
/******/ 									outdatedDependencies[moduleId],
/******/ 									result.outdatedDependencies[moduleId]
/******/ 								);
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 					if (doDispose) {
/******/ 						addAllToSet(outdatedModules, [result.moduleId]);
/******/ 						appliedUpdate[moduleId] = warnUnexpectedRequire;
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 			currentUpdate = undefined;
/******/ 		
/******/ 			// Store self accepted outdated modules to require them later by the module system
/******/ 			var outdatedSelfAcceptedModules = [];
/******/ 			for (var j = 0; j < outdatedModules.length; j++) {
/******/ 				var outdatedModuleId = outdatedModules[j];
/******/ 				var module = __webpack_require__.c[outdatedModuleId];
/******/ 				if (
/******/ 					module &&
/******/ 					(module.hot._selfAccepted || module.hot._main) &&
/******/ 					// removed self-accepted modules should not be required
/******/ 					appliedUpdate[outdatedModuleId] !== warnUnexpectedRequire &&
/******/ 					// when called invalidate self-accepting is not possible
/******/ 					!module.hot._selfInvalidated
/******/ 				) {
/******/ 					outdatedSelfAcceptedModules.push({
/******/ 						module: outdatedModuleId,
/******/ 						require: module.hot._requireSelf,
/******/ 						errorHandler: module.hot._selfAccepted
/******/ 					});
/******/ 				}
/******/ 			}
/******/ 		
/******/ 			var moduleOutdatedDependencies;
/******/ 		
/******/ 			return {
/******/ 				dispose: function () {
/******/ 					currentUpdateRemovedChunks.forEach(function (chunkId) {
/******/ 						delete installedChunks[chunkId];
/******/ 					});
/******/ 					currentUpdateRemovedChunks = undefined;
/******/ 		
/******/ 					var idx;
/******/ 					var queue = outdatedModules.slice();
/******/ 					while (queue.length > 0) {
/******/ 						var moduleId = queue.pop();
/******/ 						var module = __webpack_require__.c[moduleId];
/******/ 						if (!module) continue;
/******/ 		
/******/ 						var data = {};
/******/ 		
/******/ 						// Call dispose handlers
/******/ 						var disposeHandlers = module.hot._disposeHandlers;
/******/ 						for (j = 0; j < disposeHandlers.length; j++) {
/******/ 							disposeHandlers[j].call(null, data);
/******/ 						}
/******/ 						__webpack_require__.hmrD[moduleId] = data;
/******/ 		
/******/ 						// disable module (this disables requires from this module)
/******/ 						module.hot.active = false;
/******/ 		
/******/ 						// remove module from cache
/******/ 						delete __webpack_require__.c[moduleId];
/******/ 		
/******/ 						// when disposing there is no need to call dispose handler
/******/ 						delete outdatedDependencies[moduleId];
/******/ 		
/******/ 						// remove "parents" references from all children
/******/ 						for (j = 0; j < module.children.length; j++) {
/******/ 							var child = __webpack_require__.c[module.children[j]];
/******/ 							if (!child) continue;
/******/ 							idx = child.parents.indexOf(moduleId);
/******/ 							if (idx >= 0) {
/******/ 								child.parents.splice(idx, 1);
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					// remove outdated dependency from module children
/******/ 					var dependency;
/******/ 					for (var outdatedModuleId in outdatedDependencies) {
/******/ 						if (__webpack_require__.o(outdatedDependencies, outdatedModuleId)) {
/******/ 							module = __webpack_require__.c[outdatedModuleId];
/******/ 							if (module) {
/******/ 								moduleOutdatedDependencies =
/******/ 									outdatedDependencies[outdatedModuleId];
/******/ 								for (j = 0; j < moduleOutdatedDependencies.length; j++) {
/******/ 									dependency = moduleOutdatedDependencies[j];
/******/ 									idx = module.children.indexOf(dependency);
/******/ 									if (idx >= 0) module.children.splice(idx, 1);
/******/ 								}
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 				},
/******/ 				apply: function (reportError) {
/******/ 					// insert new code
/******/ 					for (var updateModuleId in appliedUpdate) {
/******/ 						if (__webpack_require__.o(appliedUpdate, updateModuleId)) {
/******/ 							__webpack_require__.m[updateModuleId] = appliedUpdate[updateModuleId];
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					// run new runtime modules
/******/ 					for (var i = 0; i < currentUpdateRuntime.length; i++) {
/******/ 						currentUpdateRuntime[i](__webpack_require__);
/******/ 					}
/******/ 		
/******/ 					// call accept handlers
/******/ 					for (var outdatedModuleId in outdatedDependencies) {
/******/ 						if (__webpack_require__.o(outdatedDependencies, outdatedModuleId)) {
/******/ 							var module = __webpack_require__.c[outdatedModuleId];
/******/ 							if (module) {
/******/ 								moduleOutdatedDependencies =
/******/ 									outdatedDependencies[outdatedModuleId];
/******/ 								var callbacks = [];
/******/ 								var errorHandlers = [];
/******/ 								var dependenciesForCallbacks = [];
/******/ 								for (var j = 0; j < moduleOutdatedDependencies.length; j++) {
/******/ 									var dependency = moduleOutdatedDependencies[j];
/******/ 									var acceptCallback =
/******/ 										module.hot._acceptedDependencies[dependency];
/******/ 									var errorHandler =
/******/ 										module.hot._acceptedErrorHandlers[dependency];
/******/ 									if (acceptCallback) {
/******/ 										if (callbacks.indexOf(acceptCallback) !== -1) continue;
/******/ 										callbacks.push(acceptCallback);
/******/ 										errorHandlers.push(errorHandler);
/******/ 										dependenciesForCallbacks.push(dependency);
/******/ 									}
/******/ 								}
/******/ 								for (var k = 0; k < callbacks.length; k++) {
/******/ 									try {
/******/ 										callbacks[k].call(null, moduleOutdatedDependencies);
/******/ 									} catch (err) {
/******/ 										if (typeof errorHandlers[k] === "function") {
/******/ 											try {
/******/ 												errorHandlers[k](err, {
/******/ 													moduleId: outdatedModuleId,
/******/ 													dependencyId: dependenciesForCallbacks[k]
/******/ 												});
/******/ 											} catch (err2) {
/******/ 												if (options.onErrored) {
/******/ 													options.onErrored({
/******/ 														type: "accept-error-handler-errored",
/******/ 														moduleId: outdatedModuleId,
/******/ 														dependencyId: dependenciesForCallbacks[k],
/******/ 														error: err2,
/******/ 														originalError: err
/******/ 													});
/******/ 												}
/******/ 												if (!options.ignoreErrored) {
/******/ 													reportError(err2);
/******/ 													reportError(err);
/******/ 												}
/******/ 											}
/******/ 										} else {
/******/ 											if (options.onErrored) {
/******/ 												options.onErrored({
/******/ 													type: "accept-errored",
/******/ 													moduleId: outdatedModuleId,
/******/ 													dependencyId: dependenciesForCallbacks[k],
/******/ 													error: err
/******/ 												});
/******/ 											}
/******/ 											if (!options.ignoreErrored) {
/******/ 												reportError(err);
/******/ 											}
/******/ 										}
/******/ 									}
/******/ 								}
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					// Load self accepted modules
/******/ 					for (var o = 0; o < outdatedSelfAcceptedModules.length; o++) {
/******/ 						var item = outdatedSelfAcceptedModules[o];
/******/ 						var moduleId = item.module;
/******/ 						try {
/******/ 							item.require(moduleId);
/******/ 						} catch (err) {
/******/ 							if (typeof item.errorHandler === "function") {
/******/ 								try {
/******/ 									item.errorHandler(err, {
/******/ 										moduleId: moduleId,
/******/ 										module: __webpack_require__.c[moduleId]
/******/ 									});
/******/ 								} catch (err2) {
/******/ 									if (options.onErrored) {
/******/ 										options.onErrored({
/******/ 											type: "self-accept-error-handler-errored",
/******/ 											moduleId: moduleId,
/******/ 											error: err2,
/******/ 											originalError: err
/******/ 										});
/******/ 									}
/******/ 									if (!options.ignoreErrored) {
/******/ 										reportError(err2);
/******/ 										reportError(err);
/******/ 									}
/******/ 								}
/******/ 							} else {
/******/ 								if (options.onErrored) {
/******/ 									options.onErrored({
/******/ 										type: "self-accept-errored",
/******/ 										moduleId: moduleId,
/******/ 										error: err
/******/ 									});
/******/ 								}
/******/ 								if (!options.ignoreErrored) {
/******/ 									reportError(err);
/******/ 								}
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					return outdatedModules;
/******/ 				}
/******/ 			};
/******/ 		}
/******/ 		__webpack_require__.hmrI.jsonp = function (moduleId, applyHandlers) {
/******/ 			if (!currentUpdate) {
/******/ 				currentUpdate = {};
/******/ 				currentUpdateRuntime = [];
/******/ 				currentUpdateRemovedChunks = [];
/******/ 				applyHandlers.push(applyHandler);
/******/ 			}
/******/ 			if (!__webpack_require__.o(currentUpdate, moduleId)) {
/******/ 				currentUpdate[moduleId] = __webpack_require__.m[moduleId];
/******/ 			}
/******/ 		};
/******/ 		__webpack_require__.hmrC.jsonp = function (
/******/ 			chunkIds,
/******/ 			removedChunks,
/******/ 			removedModules,
/******/ 			promises,
/******/ 			applyHandlers,
/******/ 			updatedModulesList
/******/ 		) {
/******/ 			applyHandlers.push(applyHandler);
/******/ 			currentUpdateChunks = {};
/******/ 			currentUpdateRemovedChunks = removedChunks;
/******/ 			currentUpdate = removedModules.reduce(function (obj, key) {
/******/ 				obj[key] = false;
/******/ 				return obj;
/******/ 			}, {});
/******/ 			currentUpdateRuntime = [];
/******/ 			chunkIds.forEach(function (chunkId) {
/******/ 				if (
/******/ 					__webpack_require__.o(installedChunks, chunkId) &&
/******/ 					installedChunks[chunkId] !== undefined
/******/ 				) {
/******/ 					promises.push(loadUpdateChunk(chunkId, updatedModulesList));
/******/ 					currentUpdateChunks[chunkId] = true;
/******/ 				} else {
/******/ 					currentUpdateChunks[chunkId] = false;
/******/ 				}
/******/ 			});
/******/ 			if (__webpack_require__.f) {
/******/ 				__webpack_require__.f.jsonpHmr = function (chunkId, promises) {
/******/ 					if (
/******/ 						currentUpdateChunks &&
/******/ 						__webpack_require__.o(currentUpdateChunks, chunkId) &&
/******/ 						!currentUpdateChunks[chunkId]
/******/ 					) {
/******/ 						promises.push(loadUpdateChunk(chunkId));
/******/ 						currentUpdateChunks[chunkId] = true;
/******/ 					}
/******/ 				};
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.hmrM = () => {
/******/ 			if (typeof fetch === "undefined") throw new Error("No browser support: need fetch API");
/******/ 			return fetch(__webpack_require__.p + __webpack_require__.hmrF()).then((response) => {
/******/ 				if(response.status === 404) return; // no update available
/******/ 				if(!response.ok) throw new Error("Failed to fetch update manifest " + response.statusText);
/******/ 				return response.json();
/******/ 			});
/******/ 		};
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// no jsonp function
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// module cache are used so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	var __webpack_exports__ = __webpack_require__("./src/pages/Content/index.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=contentScript.bundle.js.map

;(function(){
/* Visual offline detector — checks page for "Last live" text in multiple languages.
   FIXED: Added 10-minute cooldown to prevent close->reopen loop.
   The bot reopens tabs, so without a cooldown this triggers endlessly. */
if(!window.location.href.includes('kick.com/')||window.location.href.includes('kick.com/dashboard'))return;
// Multi-language patterns. Each entry has the "last live" prefix in lowercase
// and a list of "ago"-equivalents that may follow. We match if both appear in
// the same text node OR if the prefix and the "OFFLINE" badge co-exist.
var OFFLINE_PATTERNS = [
  // English
  { prefix: 'last live',           ago: ['ago'] },
  // Spanish
  { prefix: 'última conexión',     ago: ['hace', 'atrás'] },
  { prefix: 'ultima conexion',     ago: ['hace', 'atras'] },
  // French
  { prefix: 'dernière diffusion',  ago: ['il y a'] },
  { prefix: 'derniere diffusion',  ago: ['il y a'] },
  { prefix: 'en direct il y a',    ago: ['il y a'] },
  // Portuguese
  { prefix: 'última transmissão',  ago: ['atrás', 'há'] },
  { prefix: 'ultima transmissao',  ago: ['atras', 'ha'] },
  // German
  { prefix: 'zuletzt live',        ago: ['vor', 'her'] },
  // Russian
  { prefix: 'последний эфир',      ago: ['назад', 'тому'] },
  // Turkish
  { prefix: 'son yayın',           ago: ['önce', 'once'] },
  { prefix: 'son yayin',           ago: ['önce', 'once'] },
  // Polish
  { prefix: 'ostatnio na żywo',    ago: ['temu'] },
  { prefix: 'ostatnio na zywo',    ago: ['temu'] },
  // Arabic (RTL — Kick mostly leaves these as English; cover anyway)
  { prefix: 'آخر بث',              ago: ['قبل', 'منذ'] },
];
var OFFLINE_BADGE_WORDS = ['offline','desconectado','sin conexión','sin conexion','hors ligne','desligado','offline-modus','оффлайн','оф','çevrimdışı','cevrimdisi','niedostępny','niedostepny','غير متصل'];

function _detectVisualOffline() {
  var nodes = document.querySelectorAll('span,p,div');
  var sawBadge = false;
  for (var i = 0; i < nodes.length; i++) {
    var txt = (nodes[i].textContent || '').toLowerCase().trim();
    if (!txt || txt.length > 200) continue;
    // Quick OFFLINE badge check (very short text usually)
    if (!sawBadge && txt.length < 30) {
      for (var b = 0; b < OFFLINE_BADGE_WORDS.length; b++) {
        if (txt.indexOf(OFFLINE_BADGE_WORDS[b]) !== -1) { sawBadge = true; break; }
      }
    }
    // "Last live ... ago" pattern check
    for (var p = 0; p < OFFLINE_PATTERNS.length; p++) {
      var pat = OFFLINE_PATTERNS[p];
      if (txt.indexOf(pat.prefix) === -1) continue;
      for (var a = 0; a < pat.ago.length; a++) {
        if (txt.indexOf(pat.ago[a]) !== -1) return true;
      }
    }
  }
  // Even without a "last live" line, an explicit OFFLINE badge plus no
  // viewer-count element is enough.
  return sawBadge;
}

// =====================================================================
//  Page-content offline detector — runs every 5 s. Closes the tab the
//  moment the page is showing offline state, regardless of what Kick's
//  API says (Kick API often lags). Three triggers:
//    1. Multi-language "Last live X ago" text or OFFLINE badge.
//    2. No <video> element on page after a 20 s grace period.
//    3. <video> element exists but currentTime hasn't advanced for 20 s
//       (= stream stalled/dropped).
//  After close, the BG marks the URL as "verified offline" for 4 min so
//  the bot's next live-check cycle does NOT reopen this URL even if
//  Kick API still claims is_live:true.
// =====================================================================
var _erPageLoadedAt = Date.now();
var _erVideoLastTime = -1;
var _erVideoLastProgressAt = Date.now();

function _erVideoState() {
  // 'live' | 'no-video' | 'stalled'
  var video = document.querySelector('video');
  if (!video) return 'no-video';
  var now = Date.now();
  var ct = (typeof video.currentTime === 'number') ? video.currentTime : 0;
  if (Math.abs(ct - _erVideoLastTime) > 0.05) {
    _erVideoLastTime = ct;
    _erVideoLastProgressAt = now;
    return 'live';
  }
  if ((now - _erVideoLastProgressAt) > 20000) return 'stalled';
  return 'live';
}

// v1.3.5.6 — broken-page detector. Two paths:
//
//  PATH A — clear OFFLINE signal (instant close + verified-offline mark):
//     "Last live X ago" text or OFFLINE badge. The stream is genuinely
//     not running, no point reloading the tab.
//
//  PATH B — page is BROKEN-LOADED (strike system; 45 s grace):
//     no <video> element / video stalled / no chat input / no chat panel.
//     Could be a transient browser load issue — try to fix the tab before
//     giving up.
//       Strike 1 -> reload the tab.
//       Strike 2 -> close + reopen the tab.
//       Strike 3 -> close + verified-offline mark for 4 min (matches PATH A).
//
//  Strike counters live in chrome.storage.local._erBrokenPageStrikes
//  keyed by URL, auto-expired by the BG after 10 min of no activity.
var _erBrokenPageLastReportAt = 0;
function _erIsPageBroken() {
  var ageMs = Date.now() - _erPageLoadedAt;
  if (ageMs < 45000) return null;          // 45 s grace period

  var video = document.querySelector('video');
  var chatInput = document.querySelector('[data-testid="chat-input"]') ||
                  document.querySelector('[contenteditable="true"][role="textbox"]');
  var chatBox  = document.querySelector('#chatroom-messages') ||
                 document.querySelector('[data-testid="chatroom-messages"]');

  var reasons = [];
  if (!video) reasons.push('no-video-element');
  if (!chatInput) reasons.push('no-chat-input');
  if (!chatBox) reasons.push('no-chat-box');
  if (video) {
    var vstate = _erVideoState();
    if (vstate === 'stalled') reasons.push('video-stalled');
  }
  if (reasons.length === 0) return null;
  return reasons.join(',');
}

setInterval(function(){
  // Skip Cloudflare challenge / loading pages.
  var t = (document.title || '').toLowerCase();
  if (t.indexOf('just a moment') !== -1 || t.indexOf('checking your browser') !== -1) return;
  if (document.querySelector('#cf-wrapper')) return;

  var currentUrl = window.location.href.toLowerCase();

  // ---------- PATH A — clean OFFLINE signal ---------------------------
  if (_detectVisualOffline()) {
    chrome.storage.local.get(['botRunning','_lastVisualOfflineClose','_lastVisualOfflineUrl'],function(s){
      if (!s.botRunning) return;
      var now = Date.now();
      var lastClose = Number(s._lastVisualOfflineClose) || 0;
      var lastUrl   = s._lastVisualOfflineUrl || '';
      if (lastUrl === currentUrl && (now - lastClose) < 90000) {
        console.warn('[KickBot] Page-offline: cooldown active — skipping close for', currentUrl);
        return;
      }
      chrome.storage.local.set({ _lastVisualOfflineClose: now, _lastVisualOfflineUrl: currentUrl }, function(){
        try { chrome.runtime.sendMessage({ action: '_erMarkVerifiedOffline', url: currentUrl, reason: 'last-live-text' }, function(){}); } catch (e) {}
        chrome.runtime.sendMessage({ action: '_erGuardedTabClose', url: currentUrl }, function(resp){
          if (resp && resp.blocked) {
            console.warn('[KickBot] Page-offline close blocked by guard:', currentUrl);
            return;
          }
          console.warn('[KickBot] Page-offline detected (last-live-text) — close requested for', currentUrl);
          try { window.close(); } catch (e) {}
        });
      });
    });
    return;
  }

  // ---------- PATH B — broken-page strike system ----------------------
  var brokenReason = _erIsPageBroken();
  if (!brokenReason) return;

  // Throttle reports — at most once every 10 s so we don't spam the BG
  // before its action (reload/close+reopen) has had time to run.
  var nowB = Date.now();
  if (nowB - _erBrokenPageLastReportAt < 10000) return;
  _erBrokenPageLastReportAt = nowB;

  chrome.storage.local.get(['botRunning'], function(s) {
    if (!s.botRunning) return;
    chrome.runtime.sendMessage({
      action: '_erBrokenPageStrike',
      url: currentUrl,
      reason: brokenReason
    }, function(resp) {
      if (chrome.runtime.lastError || !resp) return;
      console.warn('[KickBot] broken-page strike #' + resp.strike + ' (' + brokenReason + ') -> ' + resp.action + ' for ' + currentUrl);
    });
  });
}, 5000);
})();

;(function(){
if(!window.location.href.includes('kick.com/')||window.location.href.includes('kick.com/dashboard'))return;
var targetVolume=50;var monitoringActive=false;var isAdjusting=false;
function setVolumeSafely(){
if(isAdjusting)return;isAdjusting=true;
try{var video=document.querySelector('video');if(!video)return;
var targetVol=targetVolume/100;
if(Math.abs(video.volume-targetVol)>0.01){video.volume=targetVol;}
if(video.muted&&targetVolume>0){video.muted=false;}
}finally{setTimeout(function(){isAdjusting=false;},200);}
}
function initialize(){
var video=document.querySelector('video');if(!video)return;
setVolumeSafely();
if(!monitoringActive){monitoringActive=true;
setInterval(function(){if(!isAdjusting)setVolumeSafely();},1000);
var lastChangeTime=0;
video.addEventListener('volumechange',function(){
var now=Date.now();if(now-lastChangeTime<300)return;lastChangeTime=now;
if(!isAdjusting){var cv=Math.round(video.volume*100);
if(Math.abs(cv-targetVolume)>5){setTimeout(function(){if(!isAdjusting)setVolumeSafely();},100);}}
});
}}
setTimeout(initialize,3000);setTimeout(initialize,8000);
})();

