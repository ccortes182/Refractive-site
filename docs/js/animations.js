/* ==========================================================================
   Animations — GSAP ScrollTrigger fade-ins + Hero letter animation
   ========================================================================== */

function initAnimations() {
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('gsap-ready');

  // ── Respect reduced motion preference ──
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    // Reveal all animated elements immediately without motion
    document.querySelectorAll('[data-animate], [data-animate-stagger] > *').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    document.querySelectorAll('.hero__headline .char').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    // Reveal hero subhead and CTA
    document.querySelectorAll('.hero__subhead, .hero__content .btn').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    // Reveal mission text words
    document.querySelectorAll('[data-animate="text-reveal"] .word').forEach(el => {
      el.classList.add('is-revealed');
    });
    // Show glow dividers
    document.querySelectorAll('.section--glow-top').forEach(el => {
      el.classList.add('is-visible');
    });
    return;
  }

  // ── Hero Headline Letter Animation ──
  animateHeroHeadline();

  // ── Timeline Progress Animation ──
  initTimelineProgress();

  // ── Process Step Reveal ──
  initProcessStepAnimations();

  // ── Animated Stat Counters on Brand Cards ──
  initStatCounters();

  // ── ScrollTrigger Fade-Up for [data-animate] elements ──
  initScrollAnimations();

  // ── Mission Text Word Reveal ──
  initTextReveal();

  // ── Parallax on Process Step Images ──
  initProcessParallax();

  // ── Section Divider Draw-on-Scroll ──
  initDividerAnimations();

  // ── Staggered children animations ──
  initStaggerAnimations();

}

function animateHeroHeadline() {
  const headline = document.getElementById('hero-headline');
  if (!headline) return;

  // Split text into individual characters (preserving HTML like <br>)
  const html = headline.innerHTML;
  const parts = html.split(/(<br\s*\/?>)/gi);

  headline.innerHTML = parts.map(part => {
    // Preserve <br> tags as-is
    if (part.match(/<br\s*\/?>/i)) return part;
    // Wrap each character in a span
    return part.split('').map(char => {
      if (char === ' ') return ' ';
      return `<span class="char">${char}</span>`;
    }).join('');
  }).join('');

  // Animate characters in
  const chars = headline.querySelectorAll('.char');

  gsap.to(chars, {
    opacity: 1,
    y: 0,
    rotateX: 0,
    duration: 0.8,
    stagger: 0.025,
    ease: 'power3.out',
    delay: 0.3
  });

  // Also fade in the hero subhead and CTA
  const heroContent = headline.closest('.hero__content');
  if (heroContent) {
    gsap.fromTo(
      heroContent.querySelectorAll('.hero__subhead, .btn'),
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, delay: 1.2, ease: 'power2.out' }
    );
  }
}

function initTimelineProgress() {
  const wrapper = document.getElementById('process-steps');
  const progress = document.getElementById('timeline-progress');
  if (!wrapper || !progress) return;

  gsap.to(progress, {
    height: '100%',
    ease: 'none',
    scrollTrigger: {
      trigger: wrapper,
      start: 'top 60%',
      end: 'bottom 40%',
      scrub: 0.3
    }
  });
}

function initProcessStepAnimations() {
  const steps = document.querySelectorAll('.process-step');

  steps.forEach((step, i) => {
    const dot = step.querySelector('.process-step__dot');
    const content = step.querySelector('.process-step__content');
    const visual = step.querySelector('.process-step__visual');

    // Animate the dot
    if (dot) {
      gsap.fromTo(dot,
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: step,
            start: 'top 70%',
            once: true
          }
        }
      );
    }

    // Animate content (slides in from the side)
    if (content) {
      const isRight = content.closest('.process-step__right');
      gsap.fromTo(content,
        { opacity: 0, x: isRight ? 40 : -40 },
        {
          opacity: 1,
          x: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: step,
            start: 'top 70%',
            once: true
          }
        }
      );
    }

    // Animate visual
    if (visual) {
      const isRight = visual.closest('.process-step__right');
      gsap.fromTo(visual,
        { opacity: 0, x: isRight ? 40 : -40 },
        {
          opacity: 1,
          x: 0,
          duration: 0.7,
          delay: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: step,
            start: 'top 70%',
            once: true
          }
        }
      );
    }
  });
}

function initStatCounters() {
  const stats = document.querySelectorAll('.brand-card__stat');

  stats.forEach(stat => {
    const numberEl = stat.querySelector('.brand-card__stat-number');
    const value = parseInt(stat.getAttribute('data-stat-value'), 10);
    if (!numberEl || isNaN(value)) return;

    const suffix = numberEl.textContent.replace(/[\d,]/g, ''); // e.g. "%"
    const counter = { val: 0 };

    gsap.to(counter, {
      val: value,
      duration: 1.5,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: stat.closest('.brand-card'),
        start: 'top 80%',
        once: true
      },
      onUpdate: function() {
        numberEl.textContent = Math.round(counter.val) + suffix;
      }
    });
  });
}

function initScrollAnimations() {
  const elements = document.querySelectorAll('[data-animate]:not([data-animate-stagger]):not([data-animate="text-reveal"])');

  elements.forEach(el => {
    const type = el.getAttribute('data-animate');

    const fromVars = { opacity: 0 };
    if (type === 'fade-up') fromVars.y = 40;
    if (type === 'scale-in') fromVars.scale = 0.95;

    gsap.fromTo(el, fromVars, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        once: true
      }
    });
  });
}

function initTextReveal() {
  const elements = document.querySelectorAll('[data-animate="text-reveal"]');

  elements.forEach(el => {
    // Split text into words, preserving gradient-text spans
    const html = el.innerHTML;
    // Process: split by gradient-text spans, then split remaining text into words
    const parts = html.split(/(<span class="gradient-text">.*?<\/span>)/gs);

    el.innerHTML = parts.map(part => {
      if (part.startsWith('<span class="gradient-text">')) {
        // Extract inner text of gradient span and wrap each word
        const inner = part.replace(/<span class="gradient-text">/, '').replace(/<\/span>/, '');
        return inner.split(/\s+/).filter(Boolean).map(word =>
          `<span class="word word--gradient">${word}</span>`
        ).join(' ');
      }
      // Regular text — wrap each word
      return part.split(/\s+/).filter(Boolean).map(word =>
        `<span class="word">${word}</span>`
      ).join(' ');
    }).join(' ');

    // Animate words in with staggered ScrollTrigger
    const words = el.querySelectorAll('.word');

    ScrollTrigger.create({
      trigger: el,
      start: 'top 75%',
      end: 'bottom 25%',
      onEnter: () => {
        words.forEach((word, i) => {
          setTimeout(() => word.classList.add('is-revealed'), i * 50);
        });
      }
    });
  });
}

function initProcessParallax() {
  // Only apply parallax on desktop — mobile stacks single column
  if (window.innerWidth < 768) return;

  const images = document.querySelectorAll('.process-step__visual img');

  images.forEach(img => {
    gsap.to(img, {
      y: -30,
      ease: 'none',
      scrollTrigger: {
        trigger: img.closest('.process-step'),
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.5
      }
    });
  });
}

function initDividerAnimations() {
  const glowSections = document.querySelectorAll('.section--glow-top');

  glowSections.forEach(section => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 85%',
      once: true,
      onEnter: () => section.classList.add('is-visible')
    });
  });
}

function initStaggerAnimations() {
  const containers = document.querySelectorAll('[data-animate-stagger]');

  containers.forEach(container => {
    const children = container.children;

    // Make container visible
    gsap.set(container, { opacity: 1, y: 0, clearProps: 'transform' });

    gsap.fromTo(children,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: container,
          start: 'top 85%',
          once: true
        }
      }
    );
  });
}
