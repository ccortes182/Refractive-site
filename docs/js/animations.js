/* ==========================================================================
   Animations — GSAP ScrollTrigger fade-ins + Hero letter animation
   ========================================================================== */

function initAnimations() {
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('gsap-ready');

  // ── Hero Headline Letter Animation ──
  animateHeroHeadline();

  // ── Timeline Progress Animation ──
  initTimelineProgress();

  // ── Process Step Reveal ──
  initProcessStepAnimations();

  // ── ScrollTrigger Fade-Up for [data-animate] elements ──
  initScrollAnimations();

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

function initScrollAnimations() {
  const elements = document.querySelectorAll('[data-animate]:not([data-animate-stagger])');

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
