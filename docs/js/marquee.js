/* ==========================================================================
   Marquee — Ensure seamless infinite scroll via cloning
   ========================================================================== */

function initMarquee() {
  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const tracks = document.querySelectorAll('.marquee__track');

  tracks.forEach(track => {
    // Clone all children once to ensure seamless looping
    // The HTML already has duplicated content, but this ensures
    // the track is always wide enough for any viewport
    const children = Array.from(track.children);
    const trackWidth = track.scrollWidth;
    const viewportWidth = window.innerWidth;

    // If the track isn't wide enough for seamless scroll, clone more
    if (trackWidth < viewportWidth * 2.5) {
      children.forEach(child => {
        track.appendChild(child.cloneNode(true));
      });
    }
  });

  // Pause marquees when tab is not visible (save CPU)
  document.addEventListener('visibilitychange', () => {
    tracks.forEach(track => {
      if (document.hidden) {
        track.style.animationPlayState = 'paused';
      } else {
        track.style.animationPlayState = 'running';
      }
    });
  });
}
