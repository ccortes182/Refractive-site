/* Refractive — analytics event bindings.
 * Pushes conversion events to the dataLayer so GTM can map them to Google
 * Ads, Meta, and LinkedIn conversion tags.
 */
(function () {
  'use strict';

  function track(formName, form) {
    if (!window.RefractiveAnalytics) return;
    var extras = {};
    var email = form.querySelector('input[type="email"]');
    if (email && email.value) {
      extras.lead_email_domain = (email.value.split('@')[1] || '').toLowerCase();
    }
    window.RefractiveAnalytics.trackLead(formName, extras);
  }

  function bind() {
    var contact = document.getElementById('contact-form');
    if (contact && !contact.dataset.analyticsBound) {
      contact.dataset.analyticsBound = '1';
      contact.addEventListener('submit', function () { track('contact', contact); });
    }

    document.querySelectorAll('form[name="newsletter"]').forEach(function (form) {
      if (form.dataset.analyticsBound) return;
      form.dataset.analyticsBound = '1';
      form.addEventListener('submit', function () {
        if (window.RefractiveAnalytics) {
          window.RefractiveAnalytics.trackEvent('newsletter_signup', {
            form_name: 'newsletter',
            page_path: location.pathname
          });
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
