// Legends — Tab Focus Mode UI (popup-only)
// Adds a small dropdown to the top of the popup that lets the user choose
// how new tabs are opened by the live-check loop:
//   "background"        — all tabs open in the background (default)
//   "foreground_first"  — the FIRST tab of each open-cycle gets foreground
//                         focus; subsequent tabs in the same cycle stay in
//                         the background.
// The selected mode is stored in chrome.storage.local under "tabFocusMode"
// and consulted by background.bundle.js when calling chrome.tabs.create().
(function () {
  if (window.__erTabFocusModeUiInstalled) return;
  window.__erTabFocusModeUiInstalled = true;

  function buildBar() {
    if (document.getElementById("er-tab-focus-mode-bar")) return;
    var bar = document.createElement("div");
    bar.id = "er-tab-focus-mode-bar";
    bar.style.cssText = [
      "display:flex",
      "align-items:center",
      "gap:8px",
      "padding:6px 10px",
      "background:#0f1218",
      "color:#e6e6e6",
      "font-size:12px",
      "font-family:system-ui,Segoe UI,Roboto,sans-serif",
      "border-bottom:1px solid #1f2630",
      "position:sticky",
      "top:0",
      "z-index:99999"
    ].join(";");

    var label = document.createElement("span");
    label.textContent = "Tab Focus Mode:";
    label.style.cssText = "opacity:0.85";

    var select = document.createElement("select");
    select.id = "er-tab-focus-mode-select";
    select.style.cssText = [
      "background:#1a2030",
      "color:#e6e6e6",
      "border:1px solid #2a3242",
      "border-radius:4px",
      "padding:4px 6px",
      "font-size:12px",
      "outline:none"
    ].join(";");

    var optBg = document.createElement("option");
    optBg.value = "background";
    optBg.textContent = "Background (all tabs)";

    var optFg = document.createElement("option");
    optFg.value = "foreground_first";
    optFg.textContent = "Foreground-First (focus first tab)";

    select.appendChild(optBg);
    select.appendChild(optFg);

    var hint = document.createElement("span");
    hint.id = "er-tab-focus-mode-hint";
    hint.style.cssText = "opacity:0.6;font-size:11px;margin-left:auto";
    hint.textContent = "v1.3.5";

    bar.appendChild(label);
    bar.appendChild(select);
    bar.appendChild(hint);

    var host = document.body || document.documentElement;
    if (host.firstChild) {
      host.insertBefore(bar, host.firstChild);
    } else {
      host.appendChild(bar);
    }

    // Restore saved value.
    try {
      chrome.storage.local.get(["tabFocusMode"], function (s) {
        var val = s && s.tabFocusMode === "foreground_first" ? "foreground_first" : "background";
        select.value = val;
      });
    } catch (e) {}

    select.addEventListener("change", function () {
      var v = select.value === "foreground_first" ? "foreground_first" : "background";
      try {
        chrome.storage.local.set({ tabFocusMode: v }, function () {
          hint.textContent = "saved: " + v;
          setTimeout(function () { hint.textContent = "v1.3.5"; }, 1800);
        });
      } catch (e) {
        hint.textContent = "save error";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildBar, { once: true });
  } else {
    buildBar();
  }
})();
