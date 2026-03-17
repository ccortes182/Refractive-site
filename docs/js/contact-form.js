/* ==========================================================================
   Contact Form — Validation + Submission handling
   ========================================================================== */

function initContactForm() {
  const form = document.getElementById('contact-form');
  const successEl = document.getElementById('form-success');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Basic validation
    const firstName = form.querySelector('#first-name');
    const email = form.querySelector('#email');
    const revenue = form.querySelector('#revenue');

    // Clear previous errors
    form.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(input => {
      input.style.borderColor = '';
    });

    let valid = true;

    if (!firstName.value.trim()) {
      firstName.style.borderColor = 'var(--color-error)';
      valid = false;
    }

    if (!email.value.trim() || !isValidEmail(email.value)) {
      email.style.borderColor = 'var(--color-error)';
      valid = false;
    }

    if (!revenue.value) {
      revenue.style.borderColor = 'var(--color-error)';
      valid = false;
    }

    if (!valid) return;

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
