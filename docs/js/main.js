/* ==========================================================================
   Main — Entry point, initializes all modules
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all modules
  initPrism();
  initNav();
  initBrandCards();
  initMarquee();
  initFaq();
  initAnimations();
  initContactForm();
  initServiceCards();
});

/* ── Service Cards Mouse-Follow Glow Effect ── */
function initServiceCards() {
  const cardsContainer = document.getElementById('cards');
  if (!cardsContainer) return;

  // Only enable on devices with hover
  if (!window.matchMedia('(hover: hover)').matches) return;

  const cards = cardsContainer.querySelectorAll('.service-card');

  cardsContainer.addEventListener('mousemove', (e) => {
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}
