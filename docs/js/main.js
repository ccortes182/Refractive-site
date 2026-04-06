/* ==========================================================================
   Main — Entry point, initializes all modules
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all modules
  initPrism();
  initBrandDistortion();
  initNav();
  initBrandCards();
  initMarquee();
  initFaq();
  initAnimations();
  initContactForm();
  initBrandExpand();
});

/* ── Brand Cards Expand Toggle (mobile) ── */
function initBrandExpand() {
  const btn = document.getElementById('brand-expand');
  const grid = document.querySelector('.brand-grid');
  if (!btn || !grid) return;

  btn.addEventListener('click', () => {
    const isExpanded = grid.classList.toggle('is-expanded');
    btn.setAttribute('aria-expanded', isExpanded);
    btn.querySelector('.brand-expand__text').textContent = isExpanded ? 'Show less' : 'See all results';
  });
}
