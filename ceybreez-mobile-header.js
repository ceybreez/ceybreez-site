/* CeyBreez V4.14 mobile horizontal header helper */
(function () {
  function initMobileHeader() {
    document.body.classList.remove('menu-open');
    document.documentElement.classList.remove('menu-open');

    var toggle = document.getElementById('menuToggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');

    var nav = document.getElementById('mainNav');
    if (!nav) return;
    nav.classList.remove('open');

    /* On each page, bring the active link into view without opening a menu. */
    if (window.matchMedia('(max-width: 900px)').matches) {
      var active = nav.querySelector('a.active');
      if (active) {
        requestAnimationFrame(function () {
          active.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileHeader, { once: true });
  } else {
    initMobileHeader();
  }

  window.addEventListener('resize', function () {
    if (window.innerWidth <= 900) {
      document.body.classList.remove('menu-open');
      document.documentElement.classList.remove('menu-open');
    }
  }, { passive: true });
})();
