/* ==========================================================================
   Refractive Scroll Sequence — crystal logo image-sequence pinned to scroll
   ==========================================================================
   Pairs with #refractive-scroll in index.html and the .refractive-scroll__*
   styles in components.css. Requires gsap + ScrollTrigger (loaded via CDN
   above this script in index.html).

   Architecture:
   - Pinning is done by CSS `position: sticky` on .refractive-scroll__pin
     (NOT by GSAP's pin). The section is 500vh tall in CSS, the inner pin
     div is 100vh sticky-at-top. This eliminates GSAP's pin-spacer DOM
     injection (which caused layout jumps and "still frame at end" bugs).
   - GSAP only handles the scrub callback, mapping scroll progress (0..1
     across the section) to a frame index + phrase opacities.
   - ScrollTrigger is created at DOMContentLoaded immediately — no waiting
     on frame loading. drawFrame() gracefully falls back to the nearest
     loaded frame so scrubbing works even while frames are still loading.
   - Frames are lazy-loaded via IntersectionObserver to avoid blocking LCP
     with 5.4 MB of JPEGs on initial page load.
   - prefers-reduced-motion: render one mid-sequence frame statically with
     phrases stacked below. Matches the existing animations.js pattern.
   ========================================================================== */

(function () {
  const FRAME_COUNT = 240;
  const FRAME_BASE = 'frames';
  const FRAME_EXT = 'jpg';
  const STATIC_FRAME_INDEX = 119; // mid-sequence frame for reduced-motion fallback

  function init() {
    const section = document.getElementById('refractive-scroll');
    if (!section) return;
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    const pinEl   = section.querySelector('.refractive-scroll__pin');
    const canvas  = section.querySelector('.refractive-scroll__canvas');
    const ctx     = canvas.getContext('2d');
    const loader  = section.querySelector('.refractive-scroll__loader');
    const countEl = section.querySelector('.refractive-scroll__loader-count');
    const phrases = Array.from(section.querySelectorAll('.refractive-scroll__phrase'));

    const pad = (n) => String(n).padStart(3, '0');
    const srcFor = (i) => `${FRAME_BASE}/3d-icon-frame-${pad(i + 1)}.${FRAME_EXT}`;

    const frames = new Array(FRAME_COUNT);
    let loadedCount = 0;
    let lastDrawnIndex = -1;
    let scrollTrigger = null;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- canvas sizing ----------
    function sizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = pinEl.clientWidth  || window.innerWidth;
      const h = pinEl.clientHeight || window.innerHeight;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawImg(img) {
      if (!img || !img.naturalWidth) return;
      const w = pinEl.clientWidth  || window.innerWidth;
      const h = pinEl.clientHeight || window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth  * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }

    // Pick the frame closest to the requested index that's actually loaded.
    // This means scrubbing works even while frames are still streaming in —
    // the animation gets progressively smoother as more frames arrive.
    function findNearestLoaded(targetIdx) {
      if (frames[targetIdx] && frames[targetIdx].naturalWidth) return targetIdx;
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < FRAME_COUNT; i++) {
        const f = frames[i];
        if (f && f.naturalWidth) {
          const d = Math.abs(i - targetIdx);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
            if (d === 0) break;
          }
        }
      }
      return bestIdx;
    }

    function drawFrame(progress) {
      const targetIdx = Math.round(
        Math.max(0, Math.min(1, progress)) * (FRAME_COUNT - 1)
      );
      const idx = findNearestLoaded(targetIdx);
      if (idx === -1) return; // nothing loaded yet
      if (idx !== lastDrawnIndex) {
        drawImg(frames[idx]);
        lastDrawnIndex = idx;
      }
    }

    // Each phrase owns 25% of the scroll progress.
    // Within its window: fade in 0-30%, hold 30-70%, fade out 70-100%.
    function updatePhrases(progress) {
      for (let i = 0; i < phrases.length; i++) {
        const start = i * 0.25;
        const local = (progress - start) / 0.25;
        let alpha;
        if (local < 0 || local > 1) {
          alpha = 0;
        } else if (local < 0.3) {
          alpha = local / 0.3;
        } else if (local < 0.7) {
          alpha = 1;
        } else {
          alpha = 1 - (local - 0.7) / 0.3;
        }
        const el = phrases[i];
        el.style.opacity = alpha;
        el.style.visibility = alpha > 0.01 ? 'visible' : 'hidden';
      }
    }

    // ---------- reduced-motion fallback ----------
    if (reduceMotion) {
      section.classList.add('refractive-scroll--static');
      const img = new Image();
      img.onload = () => {
        sizeCanvas();
        drawImg(img);
        canvas.classList.add('is-visible');
        if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
      };
      img.src = srcFor(STATIC_FRAME_INDEX);
      return;
    }

    // ---------- initialize ScrollTrigger immediately ----------
    // No waiting on frame loading — ScrollTrigger creates at DOMContentLoaded
    // so the pin-spacer is in the layout from the start (no jumps later).
    // pinType:'fixed' is forced because base.css has overflow-x:hidden on
    // html/body, which would otherwise make GSAP fall back to 'transform'
    // and cause sticky-like layout issues.
    sizeCanvas();
    canvas.classList.add('is-visible');

    scrollTrigger = ScrollTrigger.create({
      trigger: pinEl,
      pin: pinEl,
      pinType: 'fixed',
      start: 'top top',
      end: '+=200%', // 2 viewports of scroll for the full sequence
      scrub: 0.5,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      // Snap to the start, the four phrase-hold centers, and the end. Each
      // window is 25% wide, hold is at 30-70% of the window, so hold-center
      // is at i*0.25 + 0.125 → 0.125 / 0.375 / 0.625 / 0.875.
      snap: {
        snapTo: [0, 0.125, 0.375, 0.625, 0.875, 1],
        duration: { min: 0.2, max: 0.5 },
        delay: 0.15, // wait 150ms after user stops scrolling before snapping
        ease: 'power2.inOut',
      },
      onUpdate: (self) => {
        drawFrame(self.progress);
        updatePhrases(self.progress);
      },
    });

    // ---------- progressive frame loading ----------
    function loadFrame(i) {
      const img = new Image();
      img.decoding = 'async';
      const done = () => {
        frames[i] = img;
        loadedCount++;
        if (countEl) {
          countEl.textContent = `Loading… ${Math.round((loadedCount / FRAME_COUNT) * 100)}%`;
        }
        // As soon as the first frame arrives, hide the loader and draw whatever
        // frame matches the current scroll position.
        if (loadedCount === 1) {
          if (loader) loader.classList.add('is-hidden');
        }
        // A new frame just landed — re-evaluate the current scroll position
        // so the canvas can show a closer-matching frame if we have one now.
        if (scrollTrigger) {
          lastDrawnIndex = -1; // force a redraw even if the index is the same
          drawFrame(scrollTrigger.progress);
        }
      };
      img.onload = done;
      img.onerror = done;
      img.src = srcFor(i);
    }

    function loadAllFrames() {
      for (let i = 0; i < FRAME_COUNT; i++) loadFrame(i);
    }

    // Defer the 5.4 MB download until the user is within ~1 viewport of the
    // section. Avoids hurting initial-page LCP for users who never scroll there.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          io.disconnect();
          loadAllFrames();
        }
      },
      { rootMargin: '100% 0px' }
    );
    io.observe(section);

    // ---------- resize (debounced 150ms) ----------
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        sizeCanvas();
        lastDrawnIndex = -1; // force redraw at the new size
        if (scrollTrigger) {
          drawFrame(scrollTrigger.progress);
          ScrollTrigger.refresh();
        }
      }, 150);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
