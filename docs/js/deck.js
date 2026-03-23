/* ==========================================================================
   Investor Deck — Navigation & Transitions
   ========================================================================== */

(function() {

  // ── Wait for DOM ──
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // Safety: if GSAP didn't load, content is visible by default, just wire up nav
    var hasGSAP = typeof gsap !== 'undefined';

    // ── Prism ──
    var prism = typeof initDeckPrism === 'function' ? initDeckPrism('deck-prism-bg') : null;

    // ── Slides ──
    var slides = [].slice.call(document.querySelectorAll('.deck-slide'));
    var total = slides.length;
    var current = 0;
    var busy = false;

    // Per-slide shader targets
    var targets = slides.map(function(s) {
      return {
        hueShift:  parseFloat(s.dataset.hue || '0'),
        glow:      parseFloat(s.dataset.glow || '1'),
        colorFreq: parseFloat(s.dataset.colorFreq || '1'),
        bloom:     parseFloat(s.dataset.bloom || '1')
      };
    });

    // ── DOM ──
    var prevBtn     = document.getElementById('deck-prev');
    var nextBtn     = document.getElementById('deck-next');
    var counterEl   = document.getElementById('deck-current');
    var progressBar = document.getElementById('deck-progress-bar');
    var container   = document.getElementById('deck-slides');

    // ── Set initial prism params ──
    if (prism) {
      prism.params.hueShift  = targets[0].hueShift;
      prism.params.glow      = targets[0].glow;
      prism.params.colorFreq = targets[0].colorFreq;
      prism.params.bloom     = targets[0].bloom;
    }

    // ── Hide non-active slide content for animation ──
    slides.forEach(function(slide, i) {
      if (i === 0) return; // first slide content visible by default
      var els = slide.querySelectorAll('.deck-anim');
      for (var j = 0; j < els.length; j++) {
        els[j].classList.add('deck-anim--hidden');
      }
    });

    // ── Animate first slide in ──
    if (hasGSAP) {
      var firstAnims = slides[0].querySelectorAll('.deck-anim');
      if (firstAnims.length) {
        gsap.from(firstAnims, {
          opacity: 0,
          y: 20,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out',
          delay: 0.2
        });
      }
    }

    // ── UI Update ──
    function updateUI() {
      counterEl.textContent = current + 1;
      progressBar.style.width = ((current + 1) / total * 100) + '%';
      prevBtn.disabled = current === 0;
      nextBtn.disabled = current === total - 1;
    }
    updateUI();

    // ── Show slide content ──
    function revealContent(slide) {
      var els = slide.querySelectorAll('.deck-anim');
      if (!els.length) return;

      if (!hasGSAP) {
        for (var i = 0; i < els.length; i++) els[i].classList.remove('deck-anim--hidden');
        return;
      }

      // Ensure hidden, then animate in
      for (var i = 0; i < els.length; i++) {
        els[i].classList.remove('deck-anim--hidden');
      }
      gsap.fromTo(els,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: 'power2.out', delay: 0.1 }
      );
    }

    // ── Hide slide content ──
    function hideContent(slide) {
      var els = slide.querySelectorAll('.deck-anim');
      for (var i = 0; i < els.length; i++) {
        els[i].classList.add('deck-anim--hidden');
        els[i].style.removeProperty('opacity');
        els[i].style.removeProperty('transform');
      }
    }

    // ═══════════════════════════════════════
    // Go To Slide
    // ═══════════════════════════════════════

    function goTo(idx) {
      if (busy || idx < 0 || idx >= total || idx === current) return;
      busy = true;

      var fromSlide = slides[current];
      var toSlide   = slides[idx];
      var fromCard  = fromSlide.querySelector('.deck-card');
      var toCard    = toSlide.querySelector('.deck-card');
      var dir       = idx > current ? 1 : -1;
      var t         = targets[idx];

      current = idx;
      updateUI();

      // No GSAP fallback
      if (!hasGSAP) {
        fromSlide.classList.remove('deck-slide--active');
        toSlide.classList.add('deck-slide--active');
        hideContent(fromSlide);
        revealContent(toSlide);
        if (prism) {
          prism.params.hueShift  = t.hueShift;
          prism.params.glow      = t.glow;
          prism.params.colorFreq = t.colorFreq;
          prism.params.bloom     = t.bloom;
        }
        busy = false;
        return;
      }

      // ── GSAP Timeline ──
      var tl = gsap.timeline({
        onComplete: function() {
          fromSlide.classList.remove('deck-slide--active');
          // Reset the outgoing card
          gsap.set(fromCard, { clearProps: 'opacity,transform' });
          hideContent(fromSlide);
          busy = false;
        }
      });

      // 1) Fade out current card
      tl.to(fromCard, {
        opacity: 0,
        scale: 0.96,
        y: -25 * dir,
        duration: 0.35,
        ease: 'power2.in'
      });

      // 2) Morph prism (overlapping)
      if (prism) {
        tl.to(prism.params, {
          hueShift:  t.hueShift,
          glow:      t.glow,
          colorFreq: t.colorFreq,
          bloom:     t.bloom,
          duration: 0.5,
          ease: 'power2.inOut'
        }, '-=0.15');
      }

      // 3) Show next slide + fade in card
      toSlide.classList.add('deck-slide--active');
      tl.fromTo(toCard,
        { opacity: 0, scale: 0.96, y: 25 * dir },
        {
          opacity: 1, scale: 1, y: 0,
          duration: 0.4,
          ease: 'power2.out',
          onStart: function() {
            revealContent(toSlide);
          }
        },
        '-=0.25'
      );
    }

    // ═══════════════════════════════════════
    // Input
    // ═══════════════════════════════════════

    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goTo(current + 1); }
      if (e.key === 'ArrowLeft')                    { e.preventDefault(); goTo(current - 1); }
      if (e.key === 'Home')                         { e.preventDefault(); goTo(0); }
      if (e.key === 'End')                           { e.preventDefault(); goTo(total - 1); }
    });

    prevBtn.addEventListener('click', function() { goTo(current - 1); });
    nextBtn.addEventListener('click', function() { goTo(current + 1); });

    // Touch
    var tx = 0, ty = 0;
    container.addEventListener('touchstart', function(e) {
      tx = e.changedTouches[0].clientX;
      ty = e.changedTouches[0].clientY;
    }, { passive: true });

    container.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].clientX - tx;
      var dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        goTo(current + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });
  }

})();
