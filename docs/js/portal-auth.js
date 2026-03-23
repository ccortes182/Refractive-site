/* ==========================================================================
   Portal Auth — Client-side login gate
   ========================================================================== */

(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var loginSection  = document.querySelector('.portal-login');
    var landingSection = document.querySelector('.portal-landing');
    var form          = document.getElementById('portal-form');
    var errorEl       = document.getElementById('portal-error');
    var card          = document.querySelector('.portal-login__card');
    var logoutBtn     = document.getElementById('portal-logout');

    if (!loginSection || !landingSection || !form) return;

    // Determine which portal this is
    var portalType = document.body.dataset.portal || 'default';
    var storageKey = 'refractive_' + portalType + '_auth';

    // Credentials
    var VALID_EMAIL = 'growth@refractive.co';
    var VALID_PASS  = 'Illuminate2026';

    // Check existing session
    if (sessionStorage.getItem(storageKey) === 'true') {
      showLanding();
    }

    // Form submit
    form.addEventListener('submit', function(e) {
      e.preventDefault();

      var email = form.querySelector('[name="email"]').value.trim().toLowerCase();
      var pass  = form.querySelector('[name="password"]').value;

      if (email === VALID_EMAIL && pass === VALID_PASS) {
        sessionStorage.setItem(storageKey, 'true');
        showLanding();
      } else {
        // Show error
        errorEl.classList.add('portal-login__error--visible');
        errorEl.textContent = 'Invalid email or password.';

        // Shake
        card.classList.remove('portal-login__card--shake');
        void card.offsetWidth; // force reflow
        card.classList.add('portal-login__card--shake');
      }
    });

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        sessionStorage.removeItem(storageKey);
        loginSection.style.display = '';
        landingSection.classList.remove('portal-landing--visible');
        // Clear form
        form.reset();
        errorEl.classList.remove('portal-login__error--visible');
      });
    }

    function showLanding() {
      loginSection.style.display = 'none';
      landingSection.classList.add('portal-landing--visible');
    }
  });
})();
