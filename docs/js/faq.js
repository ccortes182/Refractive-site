/* ==========================================================================
   FAQ — Accordion open/close with GSAP height animation
   ========================================================================== */

function initFaq() {
  const items = document.querySelectorAll('.faq-item');

  items.forEach(item => {
    const question = item.querySelector('.faq-item__question');
    const answer = item.querySelector('.faq-item__answer');

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      // Close all other items (accordion behavior)
      items.forEach(other => {
        if (other !== item && other.classList.contains('is-open')) {
          other.classList.remove('is-open');
          other.querySelector('.faq-item__question').setAttribute('aria-expanded', 'false');
          gsap.to(other.querySelector('.faq-item__answer'), {
            height: 0,
            duration: 0.4,
            ease: 'power2.inOut'
          });
        }
      });

      // Toggle current item
      if (isOpen) {
        item.classList.remove('is-open');
        question.setAttribute('aria-expanded', 'false');
        gsap.to(answer, {
          height: 0,
          duration: 0.4,
          ease: 'power2.inOut'
        });
      } else {
        item.classList.add('is-open');
        question.setAttribute('aria-expanded', 'true');
        gsap.to(answer, {
          height: 'auto',
          duration: 0.4,
          ease: 'power2.inOut'
        });
      }
    });
  });
}
