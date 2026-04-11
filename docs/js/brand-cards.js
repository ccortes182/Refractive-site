/* ==========================================================================
   Brand Cards — Video hover play/pause + touch fallback
   ========================================================================== */

function initBrandCards() {
  const supportsHover = window.matchMedia('(hover: hover)').matches;
  const cards = document.querySelectorAll('.brand-card');

  cards.forEach(card => {
    const video = card.querySelector('.brand-card__video');
    if (!video) return;

    // On touch devices, remove video to save memory/bandwidth
    if (!supportsHover) {
      video.remove();
      return;
    }

    card.addEventListener('mouseenter', () => {
      video.play().catch(() => {
        // Silently handle autoplay restrictions
      });

      // Animate stat counter on hover
      const stat = card.querySelector('.brand-card__stat');
      if (stat) {
        const numEl = stat.querySelector('.brand-card__stat-number');
        const target = parseInt(stat.dataset.statValue, 10);
        if (numEl && target) {
          animateCounter(numEl, target);
        }
      }
    });

    card.addEventListener('mouseleave', () => {
      video.pause();
      video.currentTime = 0;
    });
  });
}

function initServiceCardGlow() {
  const supportsHover = window.matchMedia('(hover: hover)').matches;
  const cards = document.querySelectorAll('.service-card');
  if (!supportsHover || !cards.length) return;

  const setGlowPosition = (card, clientX, clientY) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${clientY - rect.top}px`);
  };

  cards.forEach(card => {
    const resetGlow = () => {
      card.style.setProperty('--mouse-x', '50%');
      card.style.setProperty('--mouse-y', '50%');
    };

    resetGlow();

    card.addEventListener('pointerenter', event => {
      setGlowPosition(card, event.clientX, event.clientY);
    });

    card.addEventListener('pointermove', event => {
      setGlowPosition(card, event.clientX, event.clientY);
    });

    card.addEventListener('pointerleave', resetGlow);
  });
}

function animateCounter(el, target) {
  const duration = 800;
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    el.textContent = current + '%';

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  el.textContent = '0%';
  requestAnimationFrame(tick);
}
