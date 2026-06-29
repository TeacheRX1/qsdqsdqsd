// ============================================================
// LEGENDS SUV — Block Image|Video (ALWAYS ON)
// Based on the same method as the "Block Image|Video" extension:
// uses CSS visibility:hidden + opacity:0 so the video element
// stays connected and KEEPS COUNTING as a viewer, but renders
// nothing — saving GPU/CPU/bandwidth across many bot tabs.
// ============================================================
(function () {
  'use strict';

  var checker = /url\(\s*?['"]?\s*?(\S+?)\s*?["']?\s*?\)/i;
  var head = document.documentElement || document.head;

  // Create the hiding stylesheet
  var style = document.getElementById('legends-block-media');
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('id', 'legends-block-media');
    if (head) head.appendChild(style);
  }

  var hide = ' {visibility: hidden !important; opacity: 0 !important} ';

  // Hide images, video, svg, canvas, and background-images (always on)
  var rules = '';
  rules += ' img' + hide;
  rules += ' video' + hide;
  rules += ' svg' + hide;
  rules += ' canvas' + hide;
  rules += ' picture' + hide;
  rules += ' [style*="background-image"]' + hide;
  rules += ' .legends-hide-bg' + hide;
  style.innerText = rules;

  // Tag any element that has a background-image so it gets hidden
  function tagBg(node) {
    try {
      if (!node || !node.tagName) return;
      var computed = window.getComputedStyle(node, null);
      var value = computed.getPropertyValue('background-image');
      var match = checker.exec(value);
      if (match && match.length && match[1] && match[1] !== 'none') {
        node.classList.add('legends-hide-bg');
      }
    } catch (e) {}
  }

  // Watch for new elements (the Kick player re-injects constantly)
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      for (var i = 0; i < mutation.addedNodes.length; i++) {
        var node = mutation.addedNodes[i];
        if (node.tagName) {
          tagBg(node);
          try {
            var childs = node.querySelectorAll('*');
            for (var j = 0; j < childs.length; j++) tagBg(childs[j]);
          } catch (e) {}
        }
      }
    });
  });

  function start() {
    if (document.documentElement) {
      // Tag existing background-image elements
      try {
        var all = document.querySelectorAll('*');
        for (var i = 0; i < all.length; i++) tagBg(all[i]);
      } catch (e) {}
      observer.observe(document.documentElement, { subtree: true, childList: true });
    } else {
      setTimeout(start, 30);
    }
  }
  start();

  console.log('[Legends] Block Image|Video active (always on)');
})();
