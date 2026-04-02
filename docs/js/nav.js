/* ==========================================================================
   Navigation — Scroll behavior + Mobile hamburger
   ========================================================================== */

function initNav() {
  if (initNav._initialized) return;
  initNav._initialized = true;

  const nav = document.getElementById('nav');
  if (!nav) return;
  const authBar = document.getElementById('auth-bar');
  const hamburger = document.querySelector('.nav__hamburger');
  const mobileOverlay = document.getElementById('mobile-nav');
  const mobileLinks = mobileOverlay ? mobileOverlay.querySelectorAll('a') : [];

  // Scroll detection — add scrolled class for background
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        if (window.scrollY > 0) {
          nav.classList.add('nav--scrolled');
          if (authBar) authBar.classList.add('auth-bar--scrolled');
        } else {
          nav.classList.remove('nav--scrolled');
          if (authBar) authBar.classList.remove('auth-bar--scrolled');
        }
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Check initial state

  const mainContent = document.getElementById('main-content');

  // Mobile hamburger toggle
  function openMobileNav() {
    if (!hamburger || !mobileOverlay) return;
    hamburger.classList.add('is-active');
    mobileOverlay.classList.add('is-active');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (mainContent) mainContent.setAttribute('aria-hidden', 'true');
    // Move focus to first link in overlay
    const firstLink = mobileOverlay.querySelector('a');
    if (firstLink) firstLink.focus();
  }

  function closeMobileNav() {
    if (!hamburger || !mobileOverlay) return;
    hamburger.classList.remove('is-active');
    mobileOverlay.classList.remove('is-active');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (mainContent) mainContent.removeAttribute('aria-hidden');
    hamburger.focus();
  }

  function toggleMobileNav() {
    if (!hamburger || !mobileOverlay) return;
    if (hamburger.classList.contains('is-active')) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  }

  if (hamburger) hamburger.addEventListener('click', toggleMobileNav);

  // Close mobile nav on link click
  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });

  // Focus trap + escape key
  document.addEventListener('keydown', (e) => {
    if (!mobileOverlay || !mobileOverlay.classList.contains('is-active')) return;

    if (e.key === 'Escape') {
      closeMobileNav();
      return;
    }

    // Focus trap within mobile overlay
    if (e.key === 'Tab') {
      const focusable = mobileOverlay.querySelectorAll('a, button');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
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

// Auto-initialize when DOM is ready (safe to call multiple times due to guard)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNav);
} else {
  initNav();
}
