/* ==========================================================================
   Newsletter Form — Intercept footer subscribe forms (Netlify Forms)
   ========================================================================== */

(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var forms = document.querySelectorAll('.footer__newsletter');

    forms.forEach(function(form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();

        var emailInput = form.querySelector('input[type="email"]');
        var btn = form.querySelector('button[type="submit"]');
        if (!emailInput || !btn) return;

        var email = emailInput.value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          emailInput.style.borderColor = 'var(--color-error, #e53e3e)';
          return;
        }

        emailInput.style.borderColor = '';
        var originalText = btn.textContent;
        btn.textContent = 'Subscribing...';
        btn.disabled = true;

        var formData = new FormData(form);

        fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(formData).toString()
        })
        .then(function(response) {
          if (!response.ok) throw new Error('Submission failed');
          emailInput.value = '';
          btn.textContent = 'Subscribed!';
          btn.disabled = true;
          btn.style.opacity = '0.7';
        })
        .catch(function() {
          btn.textContent = originalText;
          btn.disabled = false;
          emailInput.style.borderColor = 'var(--color-error, #e53e3e)';
        });
      });
    });
  });
})();
