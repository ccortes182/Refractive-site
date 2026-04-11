/* ==========================================================================
   Lead Modal — Reuses the homepage contact form in a compact modal
   ========================================================================== */

function initLeadModal() {
  const triggers = Array.from(document.querySelectorAll('[data-lead-modal]'));

  if (!triggers.length) return;

  const modal = buildLeadModal();
  const dialog = modal.querySelector('.lead-modal__dialog');
  const closeBtn = modal.querySelector('.lead-modal__close');
  const form = modal.querySelector('#lead-modal-form');
  const successEl = modal.querySelector('#lead-modal-success');
  let activeTrigger = null;

  document.body.appendChild(modal);

  if (typeof initContactFormInstance === 'function') {
    initContactFormInstance(form, successEl);
  }

  function getFocusableElements() {
    return Array.from(
      modal.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter(element => !element.hidden && !element.closest('[hidden]'));
  }

  function openModal(trigger) {
    activeTrigger = trigger;

    if (typeof resetContactFormInstance === 'function') {
      resetContactFormInstance(form, successEl);
    }

    const ctaLabelField = form.querySelector('[name="cta_label"]');
    const ctaContextField = form.querySelector('[name="cta_context"]');
    const ctaPageField = form.querySelector('[name="cta_page"]');
    const ctaHrefField = form.querySelector('[name="cta_href"]');
    const label = trigger.textContent.replace(/\s+/g, ' ').trim();
    const context = trigger.dataset.leadContext || getLeadContext(trigger);

    if (ctaLabelField) ctaLabelField.value = label;
    if (ctaContextField) ctaContextField.value = context;
    if (ctaPageField) ctaPageField.value = window.location.pathname;
    if (ctaHrefField) ctaHrefField.value = trigger.getAttribute('href') || '';

    modal.hidden = false;
    document.body.classList.add('has-modal-open');

    window.requestAnimationFrame(() => {
      const firstField = form.querySelector('[name="first_name"]');
      if (firstField) firstField.focus();
    });
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('has-modal-open');

    if (activeTrigger) {
      activeTrigger.focus();
      activeTrigger = null;
    }
  }

  triggers.forEach(trigger => {
    trigger.addEventListener('click', event => {
      event.preventDefault();
      openModal(trigger);
    });
  });

  modal.addEventListener('click', event => {
    if (event.target === modal || event.target.hasAttribute('data-lead-modal-close')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', event => {
    if (modal.hidden) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  closeBtn.addEventListener('click', closeModal);
}

function getLeadContext(trigger) {
  const section = trigger.closest('section[id]');
  if (section && section.id) return section.id;
  return document.body.dataset.page || 'unknown-page';
}

function buildLeadModal() {
  const wrapper = document.createElement('div');
  wrapper.className = 'lead-modal';
  wrapper.id = 'lead-modal';
  wrapper.hidden = true;

  wrapper.innerHTML = `
    <div class="lead-modal__backdrop" data-lead-modal-close></div>
    <div class="lead-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title">
      <button type="button" class="lead-modal__close" aria-label="Close form">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M18 6 6 18"></path>
          <path d="m6 6 12 12"></path>
        </svg>
      </button>

      <h2 class="section__heading section__heading--center lead-modal__title" id="lead-modal-title">Let's build something that compounds</h2>

      <form class="contact-form contact-form--modal" id="lead-modal-form" name="contact" method="POST" data-netlify="true" data-netlify-honeypot="bot-field">
        <input type="hidden" name="form-name" value="contact">
        <input type="hidden" name="cta_label" value="">
        <input type="hidden" name="cta_context" value="">
        <input type="hidden" name="cta_page" value="">
        <input type="hidden" name="cta_href" value="">
        <p class="visually-hidden"><label>Don't fill this out: <input name="bot-field"></label></p>

        <div class="contact-grid">
          <div class="form-group">
            <label for="lead-first-name" class="form-label">First name</label>
            <input type="text" id="lead-first-name" name="first_name" class="form-input" required autocomplete="given-name">
          </div>

          <div class="form-group">
            <label for="lead-last-name" class="form-label">Last name</label>
            <input type="text" id="lead-last-name" name="last_name" class="form-input" required autocomplete="family-name">
          </div>

          <div class="form-group">
            <label for="lead-email" class="form-label">Email</label>
            <input type="email" id="lead-email" name="email" class="form-input" required autocomplete="email">
          </div>

          <div class="form-group">
            <label for="lead-company" class="form-label">Company / Brand</label>
            <input type="text" id="lead-company" name="company" class="form-input" autocomplete="organization">
          </div>

          <div class="form-group form-group--full">
            <label for="lead-revenue" class="form-label">Monthly revenue range</label>
            <select id="lead-revenue" name="revenue" class="form-select" required>
              <option value="" disabled selected>Select a range</option>
              <option value="under-1m">Under $1M</option>
              <option value="1m-5m">$1M - $5M</option>
              <option value="5m-20m">$5M - $20M</option>
              <option value="20m-plus">$20M+</option>
            </select>
          </div>

          <div class="form-group form-group--full">
            <label for="lead-message" class="form-label">Message</label>
            <textarea id="lead-message" name="message" class="form-textarea" rows="3"></textarea>
          </div>

          <div class="form-group form-group--full">
            <button type="submit" class="btn btn--primary btn--lg btn--full">Book a Growth Audit</button>
          </div>
        </div>

        <div class="form-success" id="lead-modal-success" hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;color:var(--color-primary);margin-bottom:var(--space-sm)">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <h3 style="margin-bottom:var(--space-xs)">We got your message</h3>
          <p>Thanks for reaching out. We'll be in touch within 24 hours.</p>
        </div>
      </form>
    </div>
  `;

  return wrapper;
}
