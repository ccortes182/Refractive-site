/* ==========================================================================
   Career Application Form — Validation + Netlify file upload submission
   ========================================================================== */

function initCareerApplicationForms() {
  const forms = document.querySelectorAll('.career-application-form');
  forms.forEach(form => initCareerApplicationForm(form));
}

function initCareerApplicationForm(form) {
  if (!form || form.dataset.careerFormInitialized === 'true') return;
  form.dataset.careerFormInitialized = 'true';

  const successEl = form.querySelector('.form-success');
  const fields = [
    { name: 'first_name', message: 'First name is required.' },
    { name: 'last_name', message: 'Last name is required.' },
    { name: 'email', message: 'Please enter a valid email address.' },
    { name: 'resume', message: 'Please upload your resume.' }
  ];
  const errorMap = {};

  fields.forEach(({ name, message }) => {
    const field = form.querySelector(`[name="${name}"]`);
    if (!field) return;

    const fieldId = field.id || `${form.id || 'career-form'}-${name}`;
    field.id = fieldId;

    const errorEl = document.createElement('span');
    errorEl.className = 'form-error';
    errorEl.id = `${fieldId}-error`;
    errorEl.setAttribute('role', 'alert');
    errorEl.textContent = message;
    errorEl.hidden = true;
    field.parentNode.appendChild(errorEl);
    field.setAttribute('aria-describedby', errorEl.id);

    errorMap[name] = { field, errorEl };
  });

  function showError(name, message) {
    const entry = errorMap[name];
    if (!entry) return;
    entry.field.style.borderColor = 'var(--color-error)';
    entry.field.setAttribute('aria-invalid', 'true');
    if (message) entry.errorEl.textContent = message;
    entry.errorEl.hidden = false;
  }

  function clearErrors() {
    Object.entries(errorMap).forEach(([name, { field, errorEl }]) => {
      field.style.borderColor = '';
      field.removeAttribute('aria-invalid');
      errorEl.hidden = true;
      const config = fields.find(item => item.name === name);
      if (config) errorEl.textContent = config.message;
    });

    const networkErr = form.querySelector('.form-error--network');
    if (networkErr) networkErr.hidden = true;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    clearErrors();

    const firstName = form.querySelector('[name="first_name"]');
    const lastName = form.querySelector('[name="last_name"]');
    const email = form.querySelector('[name="email"]');
    const resume = form.querySelector('[name="resume"]');

    let valid = true;
    let firstInvalid = null;

    if (!firstName || !firstName.value.trim()) {
      showError('first_name');
      firstInvalid = firstInvalid || firstName;
      valid = false;
    }

    if (!lastName || !lastName.value.trim()) {
      showError('last_name');
      firstInvalid = firstInvalid || lastName;
      valid = false;
    }

    if (!email || !email.value.trim() || !isValidCareerEmail(email.value)) {
      showError('email');
      firstInvalid = firstInvalid || email;
      valid = false;
    }

    const file = resume && resume.files ? resume.files[0] : null;
    if (!file) {
      showError('resume');
      firstInvalid = firstInvalid || resume;
      valid = false;
    } else if (file.size > 8 * 1024 * 1024) {
      showError('resume', 'Resume must be 8MB or smaller.');
      firstInvalid = firstInvalid || resume;
      valid = false;
    }

    if (!valid) {
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.dataset.originalText || submitBtn.textContent;
    submitBtn.dataset.originalText = originalText;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    try {
      const response = await fetch('/', {
        method: 'POST',
        body: new FormData(form)
      });

      if (!response.ok) throw new Error('Submission failed');

      const grid = form.querySelector('.contact-grid');
      if (grid) grid.hidden = true;
      form.reset();
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;

      if (successEl) {
        successEl.hidden = false;
        successEl.style.display = 'flex';
        successEl.style.flexDirection = 'column';
        successEl.style.alignItems = 'center';
        successEl.style.justifyContent = 'center';
        successEl.style.textAlign = 'center';
        successEl.style.minHeight = '280px';
        successEl.style.padding = 'var(--space-xl) 0';
      }
    } catch (error) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;

      let networkErr = form.querySelector('.form-error--network');
      if (!networkErr) {
        networkErr = document.createElement('p');
        networkErr.className = 'form-error form-error--network';
        networkErr.setAttribute('role', 'alert');
        networkErr.textContent = 'Something went wrong. Please try again or email careers@refractive.co directly.';
        form.querySelector('.contact-grid').appendChild(networkErr);
      }

      networkErr.hidden = false;
    }
  });
}

function isValidCareerEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
