/* Refractive — GTM loader
 *
 * One container drives every downstream pixel (GA4, Google Ads, Meta, LinkedIn
 * Insight, Microsoft Clarity). All vendor-specific configuration lives in the
 * GTM UI — do not hardcode pixel IDs here.
 *
 * Swap this constant when the production container is created:
 */
(function () {
  'use strict';

  var GTM_CONTAINER_ID = 'GTM-TLNXV5JB';

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    'gtm.start': Date.now(),
    event: 'gtm.js'
  });

  if (!/^GTM-[A-Z0-9]+$/.test(GTM_CONTAINER_ID)) {
    // Placeholder — don't ship a broken request to googletagmanager.com.
    // Once a real ID is set, the regex passes and the script injects.
    return;
  }

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(GTM_CONTAINER_ID);
  var first = document.getElementsByTagName('script')[0];
  first.parentNode.insertBefore(script, first);

  window.RefractiveAnalytics = {
    trackLead: function (formName, extras) {
      var payload = Object.assign({
        event: 'generate_lead',
        form_name: formName || 'unknown',
        page_path: location.pathname
      }, extras || {});
      window.dataLayer.push(payload);
    },
    trackEvent: function (eventName, extras) {
      window.dataLayer.push(Object.assign({ event: eventName }, extras || {}));
    }
  };
})();
