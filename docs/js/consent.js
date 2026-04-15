/* Refractive — Consent Manager (Google Consent Mode v2)
 *
 * Loads before analytics-loader.js. Defaults all consent to denied, shows a
 * lightweight banner if the visitor has not yet chosen, and updates consent
 * state when they do. Choice is persisted in localStorage under the key
 * "refractive_consent" and re-applied on every page load.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'refractive_consent';
  var POLICY_VERSION = 1;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });

  function readStoredChoice() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.v === POLICY_VERSION) return parsed;
      return null;
    } catch (e) {
      return null;
    }
  }

  function storeChoice(choice) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        v: POLICY_VERSION,
        choice: choice,
        ts: Date.now()
      }));
    } catch (e) { /* ignore */ }
  }

  function applyChoice(choice) {
    var granted = choice === 'accepted';
    gtag('consent', 'update', {
      ad_storage: granted ? 'granted' : 'denied',
      ad_user_data: granted ? 'granted' : 'denied',
      ad_personalization: granted ? 'granted' : 'denied',
      analytics_storage: granted ? 'granted' : 'denied'
    });
    window.dataLayer.push({ event: 'consent_' + choice });
  }

  function buildBanner() {
    var banner = document.createElement('div');
    banner.className = 'consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML = [
      '<div class="consent-banner__inner">',
        '<p class="consent-banner__text">',
          'We use cookies to measure traffic, improve the site, and show relevant ads. ',
          'See our <a href="/cookies.html">cookie policy</a>.',
        '</p>',
        '<div class="consent-banner__actions">',
          '<button type="button" class="consent-banner__btn consent-banner__btn--ghost" data-consent="declined">Decline</button>',
          '<button type="button" class="consent-banner__btn consent-banner__btn--primary" data-consent="accepted">Accept all</button>',
        '</div>',
      '</div>'
    ].join('');
    return banner;
  }

  function showBanner() {
    if (document.querySelector('.consent-banner')) return;
    var attach = function () {
      var banner = buildBanner();
      document.body.appendChild(banner);
      banner.addEventListener('click', function (e) {
        var target = e.target.closest('[data-consent]');
        if (!target) return;
        var choice = target.getAttribute('data-consent');
        storeChoice(choice);
        applyChoice(choice);
        banner.remove();
      });
    };
    if (document.body) attach();
    else document.addEventListener('DOMContentLoaded', attach, { once: true });
  }

  var stored = readStoredChoice();
  if (stored) {
    applyChoice(stored.choice);
  } else {
    showBanner();
  }

  window.RefractiveConsent = {
    reopen: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      showBanner();
    },
    current: function () {
      var s = readStoredChoice();
      return s ? s.choice : null;
    }
  };
})();
