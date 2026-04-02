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

    // Hashed credentials (SHA-256)
    var VALID_HASH = 'e82c3ca2482ea3c6fe829d1ac274662d30e1c7195e588b0a1505ec434c5610f5';

    async function hashInput(email, pass) {
      var raw = email + ':' + pass;
      var encoded = new TextEncoder().encode(raw);
      var buffer = await crypto.subtle.digest('SHA-256', encoded);
      var arr = Array.from(new Uint8Array(buffer));
      return arr.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    }

    // Check existing session
    if (sessionStorage.getItem(storageKey) === 'true') {
      showLanding();
    }

    // Form submit
    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      var email = form.querySelector('[name="email"]').value.trim().toLowerCase();
      var pass  = form.querySelector('[name="password"]').value;
      var hash  = await hashInput(email, pass);

      if (hash === VALID_HASH) {
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
