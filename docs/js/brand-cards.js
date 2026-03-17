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
    });

    card.addEventListener('mouseleave', () => {
      video.pause();
      video.currentTime = 0;
    });
  });
}
