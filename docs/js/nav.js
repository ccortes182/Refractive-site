/* ==========================================================================
   Navigation — Scroll behavior + Mobile hamburger
   ========================================================================== */

function initNav() {
  const nav = document.getElementById('nav');
  const hamburger = document.querySelector('.nav__hamburger');
  const mobileOverlay = document.getElementById('mobile-nav');
  const mobileLinks = mobileOverlay.querySelectorAll('a');

  // Scroll detection — add scrolled class for background
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        if (window.scrollY > 0) {
          nav.classList.add('nav--scrolled');
        } else {
          nav.classList.remove('nav--scrolled');
        }
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Check initial state

  // Mobile hamburger toggle
  function toggleMobileNav() {
    const isActive = hamburger.classList.toggle('is-active');
    mobileOverlay.classList.toggle('is-active');
    hamburger.setAttribute('aria-expanded', isActive);
    document.body.style.overflow = isActive ? 'hidden' : '';
  }

  function closeMobileNav() {
    hamburger.classList.remove('is-active');
    mobileOverlay.classList.remove('is-active');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', toggleMobileNav);

  // Close mobile nav on link click
  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileOverlay.classList.contains('is-active')) {
      closeMobileNav();
    }
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const navHeight = nav.offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });
}
