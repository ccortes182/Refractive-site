/* ==========================================================================
   Contact Form — Validation + Submission handling (Netlify Forms)
   ========================================================================== */

function initContactForm() {
  const form = document.getElementById('contact-form');
  const successEl = document.getElementById('form-success');
  initContactFormInstance(form, successEl);
}

function initContactFormInstance(form, successEl) {
  if (!form || form.dataset.contactFormInitialized === 'true') return;
  form.dataset.contactFormInitialized = 'true';

  // Create error elements for required fields
  const errorMap = {};
  const requiredFields = [
    { name: 'first_name', fallbackId: 'first-name', message: 'First name is required.' },
    { name: 'email', fallbackId: 'email', message: 'Please enter a valid email address.' },
    { name: 'revenue', fallbackId: 'revenue', message: 'Please select a revenue range.' }
  ];

  requiredFields.forEach(({ name, fallbackId, message }) => {
    const field = form.querySelector(`[name="${name}"]`);
    if (!field) return;
    const fieldId = field.id || `${form.id || 'contact-form'}-${fallbackId}`;
    field.id = fieldId;
    const errorEl = document.createElement('span');
    errorEl.className = 'form-error';
    errorEl.id = fieldId + '-error';
    errorEl.setAttribute('role', 'alert');
    errorEl.textContent = message;
    errorEl.hidden = true;
    field.parentNode.appendChild(errorEl);
    field.setAttribute('aria-describedby', errorEl.id);
    errorMap[name] = { field, errorEl };
  });

  function showError(name) {
    const entry = errorMap[name];
    if (!entry) return;
    entry.field.style.borderColor = 'var(--color-error)';
    entry.field.setAttribute('aria-invalid', 'true');
    entry.errorEl.hidden = false;
  }

  function clearErrors() {
    Object.values(errorMap).forEach(({ field, errorEl }) => {
      field.style.borderColor = '';
      field.removeAttribute('aria-invalid');
      errorEl.hidden = true;
    });

    const networkErr = form.querySelector('.form-error--network');
    if (networkErr) networkErr.hidden = true;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const firstName = form.querySelector('[name="first_name"]');
    const email = form.querySelector('[name="email"]');
    const revenue = form.querySelector('[name="revenue"]');

    if (!firstName || !email || !revenue) return;

    let valid = true;
    let firstInvalid = null;

    if (!firstName.value.trim()) {
      showError('first_name');
      if (!firstInvalid) firstInvalid = firstName;
      valid = false;
    }

    if (!email.value.trim() || !isValidEmail(email.value)) {
      showError('email');
      if (!firstInvalid) firstInvalid = email;
      valid = false;
    }

    if (!revenue.value) {
      showError('revenue');
      if (!firstInvalid) firstInvalid = revenue;
      valid = false;
    }

    if (!valid) {
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.dataset.originalText || submitBtn.textContent;
    submitBtn.dataset.originalText = originalText;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    const formData = new FormData(form);

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData).toString()
    })
    .then(function(response) {
      if (!response.ok) throw new Error('Form submission failed');
      // Hide the grid but keep the form container for stable layout
      var grid = form.querySelector('.contact-grid');
      if (grid) grid.hidden = true;
      form.reset();
      clearErrors();
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      successEl.hidden = false;
      successEl.style.display = 'flex';
      successEl.style.flexDirection = 'column';
      successEl.style.alignItems = 'center';
      successEl.style.justifyContent = 'center';
      successEl.style.textAlign = 'center';
      successEl.style.minHeight = '320px';
      successEl.style.padding = 'var(--space-xl) 0';

      gsap.fromTo(successEl,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    })
    .catch(function() {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      // Show a generic error — the form structure is valid, so this is a network issue
      var networkErr = form.querySelector('.form-error--network');
      if (!networkErr) {
        networkErr = document.createElement('p');
        networkErr.className = 'form-error form-error--network';
        networkErr.setAttribute('role', 'alert');
        networkErr.textContent = 'Something went wrong. Please try again or email us directly.';
        form.querySelector('.contact-grid').appendChild(networkErr);
      }
      networkErr.hidden = false;
    });
  });
}

function resetContactFormInstance(form, successEl) {
  if (!form) return;

  form.reset();

  const grid = form.querySelector('.contact-grid');
  if (grid) grid.hidden = false;

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = false;
    if (submitBtn.dataset.originalText) {
      submitBtn.textContent = submitBtn.dataset.originalText;
    }
  }

  form.querySelectorAll('.form-error').forEach(errorEl => {
    errorEl.hidden = true;
  });

  form.querySelectorAll('[aria-invalid="true"]').forEach(field => {
    field.removeAttribute('aria-invalid');
    field.style.borderColor = '';
  });

  if (successEl) {
    successEl.hidden = true;
    successEl.removeAttribute('style');
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
