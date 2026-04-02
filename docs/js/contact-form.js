/* ==========================================================================
   Contact Form — Validation + Submission handling
   ========================================================================== */

function initContactForm() {
  const form = document.getElementById('contact-form');
  const successEl = document.getElementById('form-success');

  if (!form) return;

  // Create error elements for required fields
  const errorMap = {};
  const requiredFields = [
    { id: 'first-name', message: 'First name is required.' },
    { id: 'email', message: 'Please enter a valid email address.' },
    { id: 'revenue', message: 'Please select a revenue range.' }
  ];

  requiredFields.forEach(({ id, message }) => {
    const field = form.querySelector('#' + id);
    if (!field) return;
    const errorEl = document.createElement('span');
    errorEl.className = 'form-error';
    errorEl.id = id + '-error';
    errorEl.setAttribute('role', 'alert');
    errorEl.textContent = message;
    errorEl.hidden = true;
    field.parentNode.appendChild(errorEl);
    field.setAttribute('aria-describedby', errorEl.id);
    errorMap[id] = { field, errorEl };
  });

  function showError(id) {
    const entry = errorMap[id];
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
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const firstName = form.querySelector('#first-name');
    const email = form.querySelector('#email');
    const revenue = form.querySelector('#revenue');

    let valid = true;
    let firstInvalid = null;

    if (!firstName.value.trim()) {
      showError('first-name');
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

    // Simulate form submission (replace with real endpoint)
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    // Collect form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // For now, log data and show success (wire up backend later)
    console.log('Form submission:', data);

    setTimeout(() => {
      form.style.display = 'none';
      successEl.hidden = false;

      gsap.fromTo(successEl,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }, 800);
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
