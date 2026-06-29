// Legends — Focus Lock
// Runs in MAIN world at document_start on every kick.com page.
// Forces the page to ALWAYS believe it is visible and focused so Kick's
// JavaScript never pauses chat / video / heartbeat when the tab is in
// the background or another window has focus. This is what allows the
// bot to keep chatting, clicking, and watching from background tabs
// without Kick suspending playback.
//
// Behavior:
//   1. Override Document.prototype.hidden / visibilityState / hasFocus
//      and the same on `document` itself, so any code reading them
//      sees "visible / true / 'visible'".
//   2. Patch EventTarget.prototype.addEventListener and
//      removeEventListener so listeners for visibilitychange / blur /
//      focus / focusin / focusout / pagehide / webkitvisibilitychange
//      registered on window / document / document.documentElement /
//      document.body are silently dropped. Kick code can call these
//      but the listener never fires.
//   3. No-op the on-property setters (window.onfocus, window.onblur,
//      document.onvisibilitychange, etc.) so Kick can't reattach via
//      direct assignment.
//   4. Re-apply every 1500 ms in case some script restores originals.

(() => {
  try {
    if (window.top !== window) return;
  } catch {
    return;
  }
  const INSTALL_FLAG = "__erFocusLockInstalled";
  if (window[INSTALL_FLAG]) return;
  try {
    Object.defineProperty(window, INSTALL_FLAG, {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    });
  } catch {
    window[INSTALL_FLAG] = true;
  }

  const SUPPRESSED_EVENTS = new Set([
    "blur",
    "focus",
    "focusin",
    "focusout",
    "visibilitychange",
    "webkitvisibilitychange",
    "pagehide"
  ]);

  function rootTargets() {
    return new Set([window, document, document.documentElement, document.body]);
  }

  function canRedefine(obj, key) {
    if (!obj) return false;
    try {
      const desc = Object.getOwnPropertyDescriptor(obj, key);
      return !desc || desc.configurable !== false;
    } catch {
      return false;
    }
  }

  function defineGetter(target, key, getter, enumerable = false) {
    if (!target || typeof getter !== "function") return;
    if (!canRedefine(target, key)) return;
    try {
      Object.defineProperty(target, key, {
        configurable: true,
        enumerable: enumerable,
        get: getter
      });
    } catch {}
  }

  function defineValue(target, key, value, enumerable = false) {
    if (!target) return;
    if (!canRedefine(target, key)) return;
    try {
      Object.defineProperty(target, key, {
        configurable: true,
        enumerable: enumerable,
        writable: false,
        value: value
      });
    } catch {}
  }

  function patchVisibility() {
    const docProto = window.Document?.prototype;
    defineGetter(docProto, "hidden", () => false);
    defineGetter(docProto, "visibilityState", () => "visible");
    defineGetter(docProto, "webkitHidden", () => false);
    defineGetter(docProto, "webkitVisibilityState", () => "visible");
    defineValue(docProto, "hasFocus", () => true);
    defineGetter(document, "hidden", () => false);
    defineGetter(document, "visibilityState", () => "visible");
    defineGetter(document, "webkitHidden", () => false);
    defineGetter(document, "webkitVisibilityState", () => "visible");
    defineValue(document, "hasFocus", () => true);
  }

  function lower(s) {
    return String(s || "").trim().toLowerCase();
  }

  function shouldSuppress(target, eventType) {
    const t = lower(eventType);
    if (!SUPPRESSED_EVENTS.has(t)) return false;
    return rootTargets().has(target);
  }

  function patchAddRemoveListener() {
    const proto = window.EventTarget?.prototype;
    if (!proto) return;
    const origAdd = proto.addEventListener;
    const origRemove = proto.removeEventListener;
    if (typeof origAdd !== "function") return;

    if (!window.__erFocusLockNativeAddEventListener) {
      defineValue(window, "__erFocusLockNativeAddEventListener", origAdd);
    }
    if (typeof origRemove === "function" && !window.__erFocusLockNativeRemoveEventListener) {
      defineValue(window, "__erFocusLockNativeRemoveEventListener", origRemove);
    }

    if (!window.__erFocusLockAddPatched) {
      const ensureTarget = (t) => (t == null ? window : t);
      const wrappedAdd = function (eventType, listener, options) {
        const target = ensureTarget(this);
        if (listener && shouldSuppress(target, eventType)) {
          // Silently drop registration.
          return;
        }
        return origAdd.call(target, eventType, listener, options);
      };
      defineValue(proto, "addEventListener", wrappedAdd);
      defineValue(window, "__erFocusLockAddPatched", true);
    }

    if (typeof origRemove === "function" && !window.__erFocusLockRemovePatched) {
      const ensureTarget2 = (t) => (t == null ? window : t);
      const wrappedRemove = function (eventType, listener, options) {
        const target = ensureTarget2(this);
        if (listener && shouldSuppress(target, eventType)) {
          return;
        }
        return origRemove.call(target, eventType, listener, options);
      };
      defineValue(proto, "removeEventListener", wrappedRemove);
      defineValue(window, "__erFocusLockRemovePatched", true);
    }
  }

  function patchOnHandlers() {
    const noopGet = () => null;
    const noopSet = () => {};
    const stub = (target, key) => {
      if (!target || !canRedefine(target, key)) return;
      try {
        Object.defineProperty(target, key, {
          configurable: true,
          enumerable: false,
          get: noopGet,
          set: noopSet
        });
      } catch {}
    };
    stub(window, "onfocus");
    stub(window, "onblur");
    stub(window, "onfocusin");
    stub(window, "onfocusout");
    stub(document, "onvisibilitychange");
    stub(document, "onwebkitvisibilitychange");
    stub(window, "onpagehide");
  }

  function applyAll() {
    patchVisibility();
    patchAddRemoveListener();
    patchOnHandlers();
  }

  applyAll();
  const refreshTimer = window.setInterval(applyAll, 1500);
  const nativeAdd = window.__erFocusLockNativeAddEventListener;
  if (typeof nativeAdd === "function") {
    nativeAdd.call(
      window,
      "beforeunload",
      () => {
        window.clearInterval(refreshTimer);
      },
      { once: true }
    );
  }
})();
