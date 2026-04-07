/* ==========================================================================
   Portal Auth — Supabase-backed login for client & investor portals
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

    var portalType = document.body.dataset.portal || 'default';
    var sb = window.RefractiveSupabase;

    // Check existing Supabase session
    if (sb) {
      sb.auth.getSession().then(function(result) {
        var session = result.data && result.data.session;
        if (!session) return;
        // Set cookie for edge function
        setAuthCookie(session.access_token);
        // Verify portal access
        return sb.from('portal_access')
          .select('portal_type')
          .eq('user_id', session.user.id)
          .eq('portal_type', portalType)
          .is('revoked_at', null)
          .then(function(res) {
            if (res.data && res.data.length > 0) {
              showLanding();
            }
          });
      });
    }

    // Form submit
    form.addEventListener('submit', function(e) {
      e.preventDefault();

      var email = form.querySelector('[name="email"]').value.trim().toLowerCase();
      var pass  = form.querySelector('[name="password"]').value;
      var submitBtn = form.querySelector('button[type="submit"]');

      if (!email || !pass) {
        showError('Please enter your email and password.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';
      clearError();

      if (!sb) {
        showError('Authentication service unavailable. Please try again later.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
        return;
      }

      sb.auth.signInWithPassword({ email: email, password: pass })
        .then(function(result) {
          if (result.error) throw result.error;
          var user = result.data.user;
          var session = result.data.session;
          // Set cookie for edge function so protected pages load
          if (session) setAuthCookie(session.access_token);
          // Check portal access
          return sb.from('portal_access')
            .select('portal_type')
            .eq('user_id', user.id)
            .eq('portal_type', portalType)
            .is('revoked_at', null)
            .then(function(res) {
              if (!res.data || res.data.length === 0) {
                throw new Error('You do not have access to this portal. Contact Refractive to request access.');
              }
              showLanding();
            });
        })
        .catch(function(err) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In';
          showError(err.message || 'Invalid email or password.');
          // Shake animation
          card.classList.remove('portal-login__card--shake');
          void card.offsetWidth;
          card.classList.add('portal-login__card--shake');
        });
    });

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        clearAuthCookie();
        if (sb) {
          sb.auth.signOut().then(function() {
            showLogin();
          });
        } else {
          showLogin();
        }
      });
    }

    function showLanding() {
      loginSection.style.display = 'none';
      landingSection.classList.add('portal-landing--visible');
    }

    function showLogin() {
      loginSection.style.display = '';
      landingSection.classList.remove('portal-landing--visible');
      form.reset();
      clearError();
    }

    function showError(msg) {
      errorEl.classList.add('portal-login__error--visible');
      errorEl.textContent = msg;
    }

    function clearError() {
      errorEl.classList.remove('portal-login__error--visible');
      errorEl.textContent = '';
    }

    function setAuthCookie(token) {
      var maxAge = 60 * 60; // 1 hour — matches Supabase JWT expiry
      document.cookie = 'sb-access-token=' + token + ';path=/;max-age=' + maxAge + ';SameSite=Lax;Secure';
    }

    function clearAuthCookie() {
      document.cookie = 'sb-access-token=;path=/;max-age=0;SameSite=Lax;Secure';
    }
  });
})();
