/* ==========================================================================
   Deck — navigation, transitions, and chart choreography
   --------------------------------------------------------------------------
   Two drivers share one slide API:
     • carousel  (>= 768px) — horizontal, one slide at a time, GSAP crossfade
     • story     (<  768px) — vertical scroll-snap, IntersectionObserver driven

   Both call the same enter/leave hooks, so slide markup is authored once.
   ========================================================================== */

(function() {

  var STORY_MAX = 767;          // story mode at or below this width
  var EMBED_BASE_W = 1440;      // logical width the Lucerna iframe renders at

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    var hasGSAP = typeof gsap !== 'undefined';
    var reduced = window.matchMedia &&
                  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var animates = hasGSAP && !reduced;

    var slides = [].slice.call(document.querySelectorAll('.deck-slide'));
    if (!slides.length) return;
    var total = slides.length;

    var counterEl   = document.getElementById('deck-current');
    var progressBar = document.getElementById('deck-progress-bar');
    var container   = document.getElementById('deck-slides');
    var prevBtn     = document.getElementById('deck-prev');
    var nextBtn     = document.getElementById('deck-next');

    var story = window.innerWidth <= STORY_MAX;
    if (story) document.body.classList.add('deck-body--story');

    // ── Prism background ──
    var prism = typeof initDeckPrism === 'function' ? initDeckPrism('deck-prism-bg') : null;

    var targets = slides.map(function(s) {
      return {
        hueShift:  parseFloat(s.dataset.hue || '0'),
        glow:      parseFloat(s.dataset.glow || '1'),
        colorFreq: parseFloat(s.dataset.colorFreq || '1'),
        bloom:     parseFloat(s.dataset.bloom || '1')
      };
    });

    function applyPrism(idx, tween) {
      if (!prism) return;
      var t = targets[idx];
      if (!t) return;
      if (tween && animates) {
        gsap.to(prism.params, {
          hueShift: t.hueShift, glow: t.glow,
          colorFreq: t.colorFreq, bloom: t.bloom,
          duration: 0.5, ease: 'power2.inOut'
        });
      } else {
        prism.params.hueShift  = t.hueShift;
        prism.params.glow      = t.glow;
        prism.params.colorFreq = t.colorFreq;
        prism.params.bloom     = t.bloom;
      }
    }

    // ── Charts: build every slide up front, at final state ──
    var Charts = window.DeckCharts;
    if (Charts) slides.forEach(function(s) { Charts.render(s); });

    // ═══════════════════════════════════════
    // Content reveal
    // ═══════════════════════════════════════

    // Kinetic type: wrap each character so headlines can cascade in.
    function splitChars(node) {
      if (node.__deckChars) return node.__deckChars;
      var out = [];

      (function walk(parent) {
        [].slice.call(parent.childNodes).forEach(function(kid) {
          if (kid.nodeType === 3) {
            var frag = document.createDocumentFragment();
            var text = kid.textContent;
            for (var i = 0; i < text.length; i++) {
              if (text[i] === ' ' || text[i] === '\n') {
                frag.appendChild(document.createTextNode(text[i]));
                continue;
              }
              var s = document.createElement('span');
              s.className = 'deck-char';
              s.textContent = text[i];
              frag.appendChild(s);
              out.push(s);
            }
            parent.replaceChild(frag, kid);
          } else if (kid.nodeType === 1 && kid.tagName !== 'BR') {
            walk(kid);
          }
        });
      })(node);

      node.__deckChars = out;
      return out;
    }

    function animParts(slide) {
      return [].slice.call(slide.querySelectorAll('.deck-anim'));
    }

    function hideContent(slide) {
      animParts(slide).forEach(function(elm) {
        elm.classList.add('deck-anim--hidden');
        elm.style.removeProperty('opacity');
        elm.style.removeProperty('transform');
        elm.style.removeProperty('clip-path');
        if (elm.__deckChars && animates) {
          gsap.set(elm.__deckChars, { clearProps: 'all' });
        }
      });
      if (Charts) Charts.reset(slide);
    }

    function revealContent(slide) {
      var parts = animParts(slide);

      if (!animates) {
        parts.forEach(function(elm) { elm.classList.remove('deck-anim--hidden'); });
        if (Charts) Charts.play(slide);
        return;
      }

      parts.forEach(function(elm) { elm.classList.remove('deck-anim--hidden'); });

      var i = 0;
      parts.forEach(function(elm) {
        var motion = elm.getAttribute('data-motion');
        var delay = 0.1 + i * 0.06;

        if (motion === 'chars') {
          var chars = splitChars(elm);
          gsap.set(elm, { opacity: 1, y: 0 });
          gsap.fromTo(chars,
            { opacity: 0, y: 26, rotateX: -55 },
            {
              opacity: 1, y: 0, rotateX: 0,
              duration: 0.62, delay: delay, stagger: 0.018, ease: 'power3.out'
            }
          );
        } else if (motion === 'mask') {
          gsap.fromTo(elm,
            { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
            {
              opacity: 1, clipPath: 'inset(0 0% 0 0)',
              duration: 0.7, delay: delay, ease: 'power3.out',
              onComplete: function() { elm.style.removeProperty('clip-path'); }
            }
          );
        } else if (motion === 'clip') {
          gsap.fromTo(elm,
            { opacity: 0, clipPath: 'inset(100% 0 0 0)' },
            {
              opacity: 1, clipPath: 'inset(0% 0 0 0)',
              duration: 0.6, delay: delay, ease: 'power2.out',
              onComplete: function() { elm.style.removeProperty('clip-path'); }
            }
          );
        } else if (motion === 'scale') {
          gsap.fromTo(elm,
            { opacity: 0, scale: 0.9 },
            { opacity: 1, scale: 1, duration: 0.55, delay: delay, ease: 'back.out(1.5)' }
          );
        } else {
          gsap.fromTo(elm,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.45, delay: delay, ease: 'power2.out' }
          );
        }
        i++;
      });

      // Charts land just after the copy, so the eye reads the claim first.
      if (Charts) {
        gsap.delayedCall(0.15, function() { Charts.play(slide); });
      }
    }

    // ═══════════════════════════════════════
    // Lucerna live embed — loaded only when its slide is reached
    // ═══════════════════════════════════════

    function fitEmbeds() {
      [].slice.call(document.querySelectorAll('.deck-embed')).forEach(function(embed) {
        var vp = embed.querySelector('.deck-embed__viewport');
        var frame = embed.querySelector('.deck-embed__frame');
        if (!vp || !frame) return;
        var scale = vp.clientWidth / EMBED_BASE_W;
        frame.style.transform = 'scale(' + scale + ')';
        frame.style.height = (vp.clientHeight / scale) + 'px';
      });
    }

    function activateEmbeds(slide) {
      [].slice.call(slide.querySelectorAll('.deck-embed[data-src]')).forEach(function(embed) {
        // On a phone the poster image stands in: the app bundle is ~1.2MB and
        // the dashboard is built for a desktop viewport. Mark it static so the
        // loading overlay doesn't sit there forever over an image that is
        // already the final state.
        if (window.innerWidth <= STORY_MAX) {
          embed.classList.add('is-static');
          return;
        }

        var frame = embed.querySelector('.deck-embed__frame');
        if (!frame || frame.getAttribute('src')) return;

        frame.addEventListener('load', function() {
          embed.classList.add('is-loaded');
          fitEmbeds();
        });
        frame.setAttribute('src', embed.getAttribute('data-src'));
        fitEmbeds();
      });
    }

    window.addEventListener('resize', fitEmbeds);

    // ═══════════════════════════════════════
    // Shared slide lifecycle
    // ═══════════════════════════════════════

    var current = 0;

    function updateChrome(idx) {
      if (counterEl) counterEl.textContent = idx + 1;
      if (progressBar) progressBar.style.width = ((idx + 1) / total * 100) + '%';
      if (prevBtn) prevBtn.disabled = idx === 0;
      if (nextBtn) nextBtn.disabled = idx === total - 1;

      var items = gridEl ? gridEl.querySelectorAll('.deck-grid__item') : [];
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle('is-current', i === idx);
      }
    }

    function syncHash(idx) {
      var hash = '#slide-' + (idx + 1);
      if (window.location.hash !== hash && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search + hash);
      }
    }

    function enterSlide(idx, tweenPrism) {
      current = idx;
      updateChrome(idx);
      syncHash(idx);
      applyPrism(idx, tweenPrism);
      activateEmbeds(slides[idx]);
    }

    // Slide index from the URL, e.g. #slide-9 or #9
    function hashIndex() {
      var m = /^#(?:slide-)?(\d+)$/.exec(window.location.hash || '');
      if (!m) return 0;
      var idx = parseInt(m[1], 10) - 1;
      return (idx >= 0 && idx < total) ? idx : 0;
    }

    // ═══════════════════════════════════════
    // Grid navigator — jump anywhere in one tap
    // ═══════════════════════════════════════

    var gridEl = null;

    function buildGrid() {
      gridEl = document.createElement('div');
      gridEl.className = 'deck-grid';
      gridEl.id = 'deck-grid';
      gridEl.setAttribute('hidden', '');
      gridEl.setAttribute('role', 'dialog');
      gridEl.setAttribute('aria-modal', 'true');
      gridEl.setAttribute('aria-label', 'Jump to slide');

      var head = document.createElement('div');
      head.className = 'deck-grid__head';
      head.innerHTML = '<span class="deck-grid__title">All slides</span>';

      var close = document.createElement('button');
      close.className = 'deck-grid__close';
      close.setAttribute('aria-label', 'Close slide list');
      close.innerHTML = '&times;';
      close.addEventListener('click', function() { toggleGrid(false); });
      head.appendChild(close);
      gridEl.appendChild(head);

      var items = document.createElement('div');
      items.className = 'deck-grid__items';

      slides.forEach(function(slide, i) {
        var label = slide.getAttribute('data-title');
        if (!label) {
          var aria = slide.getAttribute('aria-label') || '';
          label = aria.indexOf(':') > -1 ? aria.split(':').slice(1).join(':').trim() : 'Slide ' + (i + 1);
        }
        var btn = document.createElement('button');
        btn.className = 'deck-grid__item';
        btn.setAttribute('data-idx', i);
        btn.innerHTML = '<span class="deck-grid__num">' + String(i + 1).padStart(2, '0') + '</span>' +
                        '<span class="deck-grid__label"></span>';
        btn.querySelector('.deck-grid__label').textContent = label;
        btn.addEventListener('click', function() {
          toggleGrid(false);
          goTo(i);
        });
        items.appendChild(btn);
      });

      gridEl.appendChild(items);
      document.body.appendChild(gridEl);
    }

    function toggleGrid(force) {
      if (!gridEl) return;
      var open = force !== undefined ? force : gridEl.hasAttribute('hidden');
      if (open) {
        gridEl.removeAttribute('hidden');
        document.body.classList.add('deck-grid-open');
        var cur = gridEl.querySelector('.deck-grid__item.is-current');
        if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'center' });
      } else {
        gridEl.setAttribute('hidden', '');
        document.body.classList.remove('deck-grid-open');
      }
    }

    buildGrid();

    var counterBtn = document.getElementById('deck-counter');
    if (counterBtn) {
      counterBtn.setAttribute('role', 'button');
      counterBtn.setAttribute('tabindex', '0');
      counterBtn.setAttribute('aria-label', 'Show all slides');
      counterBtn.addEventListener('click', function() { toggleGrid(); });
      counterBtn.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGrid(); }
      });
    }

    // ═══════════════════════════════════════
    // Driver: carousel (desktop / tablet)
    // ═══════════════════════════════════════

    var goTo;

    if (!story) {
      var busy = false;

      // Everything but the opening slide starts hidden.
      slides.forEach(function(slide, i) {
        if (i === 0) return;
        animParts(slide).forEach(function(elm) { elm.classList.add('deck-anim--hidden'); });
        if (Charts) Charts.reset(slide);
      });

      goTo = function(idx) {
        if (busy || idx < 0 || idx >= total || idx === current) return;
        busy = true;

        var fromSlide = slides[current];
        var toSlide   = slides[idx];
        var fromCard  = fromSlide.querySelector('.deck-card');
        var toCard    = toSlide.querySelector('.deck-card');
        var dir       = idx > current ? 1 : -1;

        enterSlide(idx, true);

        if (!animates) {
          fromSlide.classList.remove('deck-slide--active');
          toSlide.classList.add('deck-slide--active');
          hideContent(fromSlide);
          revealContent(toSlide);
          busy = false;
          return;
        }

        var tl = gsap.timeline({
          onComplete: function() {
            fromSlide.classList.remove('deck-slide--active');
            gsap.set(fromCard, { clearProps: 'opacity,transform' });
            hideContent(fromSlide);
            busy = false;
          }
        });

        tl.to(fromCard, {
          opacity: 0, scale: 0.96, y: -25 * dir,
          duration: 0.35, ease: 'power2.in'
        });

        toSlide.classList.add('deck-slide--active');
        tl.fromTo(toCard,
          { opacity: 0, scale: 0.96, y: 25 * dir },
          {
            opacity: 1, scale: 1, y: 0,
            duration: 0.4, ease: 'power2.out',
            onStart: function() { revealContent(toSlide); }
          },
          '-=0.25'
        );
      };

      // Open at the slide named in the URL.
      var start = hashIndex();
      if (start > 0) {
        slides[0].classList.remove('deck-slide--active');
        animParts(slides[0]).forEach(function(elm) { elm.classList.add('deck-anim--hidden'); });
        if (Charts) Charts.reset(slides[0]);
        slides[start].classList.add('deck-slide--active');
        current = start;
      }

      enterSlide(current, false);
      revealContent(slides[current]);

      if (prevBtn) prevBtn.addEventListener('click', function() { goTo(current - 1); });
      if (nextBtn) nextBtn.addEventListener('click', function() { goTo(current + 1); });

      // Touch swipe on tablets.
      if (container) {
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

    // ═══════════════════════════════════════
    // Driver: story mode (phones)
    // ═══════════════════════════════════════

    } else {
      // All slides are in normal flow; scroll-snap handles paging.
      slides.forEach(function(slide, i) {
        slide.classList.add('deck-slide--active');
        if (i !== hashIndex()) {
          animParts(slide).forEach(function(elm) { elm.classList.add('deck-anim--hidden'); });
          if (Charts) Charts.reset(slide);
        }
      });

      goTo = function(idx) {
        if (idx < 0 || idx >= total) return;
        slides[idx].scrollIntoView({
          behavior: animates ? 'smooth' : 'auto',
          block: 'start'
        });
      };

      var seen = {};

      var io = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          var idx = slides.indexOf(entry.target);
          if (idx < 0) return;

          if (entry.isIntersecting && entry.intersectionRatio > 0.55) {
            enterSlide(idx, true);
            if (!seen[idx]) {
              seen[idx] = true;
              revealContent(entry.target);
            }
          } else if (!entry.isIntersecting && seen[idx]) {
            // Reset once fully out of view so scrolling back replays the chart.
            seen[idx] = false;
            hideContent(entry.target);
          }
        });
      }, { threshold: [0, 0.55, 0.9] });

      slides.forEach(function(slide) { io.observe(slide); });

      // Prev/next still work as page jumps.
      if (prevBtn) prevBtn.addEventListener('click', function() { goTo(current - 1); });
      if (nextBtn) nextBtn.addEventListener('click', function() { goTo(current + 1); });

      var startIdx = hashIndex();
      if (startIdx > 0) {
        // Wait for layout before jumping to the deep-linked slide.
        requestAnimationFrame(function() {
          slides[startIdx].scrollIntoView({ block: 'start' });
        });
      } else {
        enterSlide(0, false);
        revealContent(slides[0]);
        seen[0] = true;
      }
    }

    // ═══════════════════════════════════════
    // Keyboard (both drivers)
    // ═══════════════════════════════════════

    document.addEventListener('keydown', function(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape' && gridEl && !gridEl.hasAttribute('hidden')) {
        e.preventDefault(); toggleGrid(false); return;
      }
      if (e.key === 'g' || e.key === 'G') { e.preventDefault(); toggleGrid(); return; }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault(); goTo(current + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault(); goTo(current - 1);
      } else if (e.key === 'Home') {
        e.preventDefault(); goTo(0);
      } else if (e.key === 'End') {
        e.preventDefault(); goTo(total - 1);
      }
    });

    // Crossing the story/carousel breakpoint changes the whole driver, so a
    // reload is the honest way to switch rather than half-rewiring listeners.
    var wasStory = story;
    var resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        var nowStory = window.innerWidth <= STORY_MAX;
        if (nowStory !== wasStory) window.location.reload();
      }, 250);
    });
  }

})();
