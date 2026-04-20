/* ==========================================================================
   Account UI — Shared member rail + nav account entry point
   ========================================================================== */

(function() {
  var RESOURCE_META = {
    'growth-dashboard': {
      label: 'Growth Dashboard',
      href: 'tools/growth-dashboard.html'
    },
    'cohort-simulator': {
      label: 'Retention Cohort Simulator',
      href: 'tools/cohort-simulator.html'
    },
    'attribution-impact': {
      label: 'Attribution Impact Calculator',
      href: 'tools/attribution-impact.html'
    },
    'media-mix': {
      label: 'Media Mix Allocator',
      href: 'tools/media-mix.html'
    }
  };

  var ARTICLE_RECOMMENDATIONS = {
    'creative-supply-chain.html': { label: 'Creative Scorecard', href: 'the-index/creative-scorecard.html', type: 'free' },
    'tracking-maturity-ladder.html': { label: 'Attribution Impact Calculator', href: 'tools/attribution-impact.html', resource: 'attribution-impact' },
    'sms-not-emails-cousin.html': { label: 'Retention Cohort Simulator', href: 'tools/cohort-simulator.html', resource: 'cohort-simulator' },
    'future-of-commerce-ai-discovery.html': { label: 'Growth Dashboard', href: 'tools/growth-dashboard.html', resource: 'growth-dashboard' },
    'why-most-meta-accounts-should-only-have-one-campaign.html': { label: 'Growth Dashboard', href: 'tools/growth-dashboard.html', resource: 'growth-dashboard' },
    'meta-is-a-media-bank.html': { label: 'Media Mix Allocator', href: 'tools/media-mix.html', resource: 'media-mix' },
    'loyalty-programs-dont-create-loyalty.html': { label: 'Retention Cohort Simulator', href: 'tools/cohort-simulator.html', resource: 'cohort-simulator' },
    'blended-ltv-most-dangerous-metric.html': { label: 'Retention Cohort Simulator', href: 'tools/cohort-simulator.html', resource: 'cohort-simulator' },
    'paid-media-portfolio-mindset.html': { label: 'Media Mix Allocator', href: 'tools/media-mix.html', resource: 'media-mix' },
    'retention-illusion.html': { label: 'Retention Cohort Simulator', href: 'tools/cohort-simulator.html', resource: 'cohort-simulator' },
    'shopify-conversion-potential.html': { label: 'DTC Health Check', href: 'the-index/health-check.html', type: 'free' },
    'post-purchase-profit-engine.html': { label: 'Retention Cohort Simulator', href: 'tools/cohort-simulator.html', resource: 'cohort-simulator' },
    'stop-day-trading-your-ad-account.html': { label: 'Growth Dashboard', href: 'tools/growth-dashboard.html', resource: 'growth-dashboard' },
    'last-click-attribution-death-spiral.html': { label: 'Attribution Impact Calculator', href: 'tools/attribution-impact.html', resource: 'attribution-impact' },
    'shopify-infrastructure-scale.html': { label: 'Growth Dashboard', href: 'tools/growth-dashboard.html', resource: 'growth-dashboard' },
    'branded-search-real-kpi.html': { label: 'Media Mix Allocator', href: 'tools/media-mix.html', resource: 'media-mix' }
  };

  function getPathPrefix() {
    var path = window.location.pathname;
    if (path.indexOf('/blog/archive/') !== -1) return '../../';
    if (
      path.indexOf('/blog/') !== -1 ||
      path.indexOf('/the-index/') !== -1 ||
      path.indexOf('/tools/') !== -1
    ) {
      return '../';
    }
    return '';
  }

  function toHref(path) {
    return getPathPrefix() + path;
  }

  function getFileName() {
    var parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || 'index.html';
  }

  function getCurrentResource() {
    var fileName = getFileName();
    for (var key in RESOURCE_META) {
      if (RESOURCE_META[key].href.indexOf(fileName) !== -1) {
        return key;
      }
    }
    return null;
  }

  function getRecommendation() {
    var fileName = getFileName();

    if (fileName === 'index.html' && window.location.pathname.indexOf('/blog/') !== -1) {
      return { label: 'Growth Dashboard', href: 'playbooks.html', type: 'member-hub' };
    }

    if (fileName === 'playbooks.html') {
      return { label: 'DTC Health Check', href: 'the-index/health-check.html', type: 'free' };
    }

    if (ARTICLE_RECOMMENDATIONS[fileName]) {
      return ARTICLE_RECOMMENDATIONS[fileName];
    }

    return { label: 'The Refractive Index', href: 'blog/index.html', type: 'hub' };
  }

  function getAccountConfig() {
    var auth = window.RefractiveAuth;
    var state = auth ? auth.getAccountState() : 'signed_out';
    var accessCount = auth ? auth.getAccessCount() : 0;
    var displayName = auth ? auth.getDisplayName() : null;
    var lastResource = auth ? auth.getLastResource() : null;
    var recommendation = getRecommendation();

    return {
      state: state,
      accessCount: accessCount,
      displayName: displayName,
      lastResource: lastResource,
      recommendation: recommendation,
      playbooksHref: toHref('playbooks.html'),
      freeToolsHref: toHref('the-index/health-check.html'),
      indexHref: toHref('blog/index.html')
    };
  }

  function buildRailMarkup(config) {
    if (config.state === 'signed_out') {
      return (
        '<div class="auth-bar__signed-out">' +
          '<div class="auth-bar__copy">' +
            '<span class="auth-bar__headline">Unlock your free Refractive account.</span>' +
          '</div>' +
          '<div class="auth-bar__actions">' +
            '<a href="' + config.playbooksHref + '" class="btn btn--primary btn--sm">Unlock Free Account</a>' +
          '</div>' +
        '</div>'
      );
    }

    var welcomeName = config.displayName ? ', ' + config.displayName : '';

    return (
      '<div class="auth-bar__signed-in">' +
        '<div class="auth-bar__copy">' +
          '<span class="auth-bar__headline">Welcome back' + welcomeName + '.</span>' +
        '</div>' +
        '<div class="auth-bar__actions">' +
          '<a href="' + config.playbooksHref + '" class="btn btn--primary btn--sm">My Account</a>' +
          '<button class="btn btn--ghost btn--sm auth-bar__signout" id="auth-signout">Sign Out</button>' +
        '</div>' +
      '</div>'
    );
  }

  function initAccountRail() {
    var rail = document.getElementById('auth-bar');
    if (!rail) return;

    var inner = rail.querySelector('.auth-bar__inner');
    if (!inner) return;

    var config = getAccountConfig();
    inner.innerHTML = buildRailMarkup(config);
    rail.setAttribute('data-account-state', config.state);
    inner.style.opacity = '1';

    // Bind sign-out button
    var signoutBtn = document.getElementById('auth-signout');
    if (signoutBtn && window.RefractiveAuth && window.RefractiveAuth.signOut) {
      signoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        RefractiveAuth.signOut().then(function() {
          window.location.reload();
        });
      });
    }
  }

  function markLastResource() {
    if (!window.RefractiveAuth || !window.RefractiveAuth.isAuthenticated()) return;
    var currentResource = getCurrentResource();
    if (currentResource) {
      window.RefractiveAuth.setLastResource(currentResource);
    }
  }

  function initAccountUI() {
    if (!window.RefractiveAuth) return;
    if (window.RefractiveAuth.onReady) {
      window.RefractiveAuth.onReady(function() {
        markLastResource();
        initAccountRail();
      });
    } else {
      markLastResource();
      initAccountRail();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccountUI);
  } else {
    initAccountUI();
  }
})();
