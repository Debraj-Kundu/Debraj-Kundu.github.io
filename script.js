document.getElementById('yr').textContent = new Date().getFullYear();

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGsap = window.gsap && window.ScrollTrigger;

// Card spotlight follows the cursor
document.querySelectorAll('.card').forEach(c => c.addEventListener('pointermove', e => {
  const r = c.getBoundingClientRect();
  c.style.setProperty('--x', `${e.clientX - r.left}px`);
  c.style.setProperty('--y', `${e.clientY - r.top}px`);
}));

// Active nav link
const links = [...document.querySelectorAll('.nav nav a')];
const navObs = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('section[id]').forEach(s => navObs.observe(s));

// Typing rotator in the hero
const phrases = ['scale to millions.', 'stay fast under load.', 'never drop a message.', 'stay secure by design.', 'cost less to run.'];
const el = document.querySelector('.rotate');
if (!reduce) {
  let i = 0, j = phrases[0].length, del = true;
  (function tick() {
    const p = phrases[i];
    el.textContent = p.slice(0, j);
    if (del) { j--; if (j < 0) { del = false; i = (i + 1) % phrases.length; j = 0; } }
    else { j++; if (j > phrases[i].length) { del = true; return setTimeout(tick, 2200); } }
    setTimeout(tick, del ? 35 : 70);
  })();
}

// Counters
function count(b) {
  const end = +b.dataset.count, dec = +(b.dataset.dec || 0);
  if (reduce || !hasGsap) return (b.textContent = end.toFixed(dec));
  const o = { v: 0 };
  gsap.to(o, { v: end, duration: 1.8, ease: 'power2.out', onUpdate: () => (b.textContent = o.v.toFixed(dec)) });
}

if (hasGsap && !reduce) {
  gsap.registerPlugin(ScrollTrigger);

  // Smooth scrolling (Lenis) synced with ScrollTrigger
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -70 }); }
    }));
  }

  gsap.from('.h-in', { y: 30, opacity: 0, duration: 1, stagger: 0.12, ease: 'power3.out' });
  gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });

  gsap.set('.reveal', { y: 40, opacity: 0 });
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    once: true,
    onEnter: els => gsap.to(els, { y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: 'power3.out' }),
  });
  document.querySelectorAll('[data-count]').forEach(b =>
    ScrollTrigger.create({ trigger: b, start: 'top 90%', once: true, onEnter: () => count(b) }));
} else {
  document.querySelectorAll('[data-count]').forEach(count);
}
