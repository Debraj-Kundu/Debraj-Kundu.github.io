const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* optional */ } },
};

$$("[data-year]").forEach(el => (el.textContent = new Date().getFullYear()));

// Theme toggle (initial theme is set by the inline script in <head>)
$$(".theme-toggle").forEach(btn => btn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  store.set("theme", next);
}));

// Intro loader: once per tab session (flag set in <head>)
const intro = $(".intro");
if (intro && document.documentElement.hasAttribute("data-intro")) {
  const line = $(".intro-line-text", intro), sub = $(".intro-sub", intro);
  const steps = [
    ["GET <b>/debraj</b>", "RESOLVING PROFILE"],
    ["warming <b>caches</b>", "CONNECTING SERVICES"],
    ["<b>200</b> OK", "WELCOME IN"],
  ];
  steps.forEach(([html, label], i) => setTimeout(() => {
    line.innerHTML = html; sub.textContent = label;
    line.style.animation = "none"; void line.offsetWidth; line.style.animation = "";
  }, i * 420));
  setTimeout(() => intro.classList.add("done"), 1450);
  setTimeout(() => { document.documentElement.removeAttribute("data-intro"); intro.remove(); }, 2050);
} else if (intro) intro.remove();

// Smooth scroll (not on the resume view, which stays native)
let lenis;
if (window.Lenis && !reduce && !document.body.classList.contains("resume-body")) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
document.addEventListener("click", e => {
  const link = e.target.closest?.("a[href*='#']");
  if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || link.target === "_blank") return;
  const url = new URL(link.href, location.href);
  if (url.pathname !== location.pathname || !url.hash) return;
  const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (!target) return;
  e.preventDefault();
  closeMenu();
  const offset = ($(".site-header")?.offsetHeight || 80) + 16;
  if (lenis) lenis.scrollTo(target, { offset: -offset });
  else scrollTo({ top: target.getBoundingClientRect().top + scrollY - offset, behavior: reduce ? "auto" : "smooth" });
  history.pushState(null, "", url.hash);
}, true);

// Active section in the nav
const navLinks = $$(".desktop-nav a, .mobile-menu-links a");
const sectionIds = [...new Set(navLinks.map(a => a.hash.slice(1)).filter(Boolean))];
let navFrame = 0;
const updateNav = () => {
  let current = "";
  sectionIds.forEach(id => {
    const s = document.getElementById(id);
    if (s && s.getBoundingClientRect().top <= innerHeight * 0.3) current = id;
  });
  navLinks.forEach(a => a.hash === "#" + current && current ? a.setAttribute("aria-current", "location") : a.removeAttribute("aria-current"));
};
addEventListener("scroll", () => { cancelAnimationFrame(navFrame); navFrame = requestAnimationFrame(updateNav); }, { passive: true });
updateNav();

// Section reveal
if (!reduce && !document.body.classList.contains("resume-body")) {
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.remove("reveal-pending"); io.unobserve(en.target); }
  }), { threshold: 0.05 });
  $$(".section-shell, .skills-showcase").forEach(s => {
    if (s.getBoundingClientRect().top > innerHeight) s.classList.add("reveal-pending");
    io.observe(s);
  });
}

// Typing role
const typing = $(".typing-animated");
if (typing && !reduce) {
  const roles = JSON.parse(typing.dataset.roles);
  let r = 0, c = roles[0].length, del = true;
  const text = $(".typing-text", typing);
  const tick = () => {
    c += del ? -1 : 1;
    text.textContent = roles[r].slice(0, c);
    if (del && c === 0) { r = (r + 1) % roles.length; del = false; setTimeout(tick, 300); }
    else if (!del && c === roles[r].length) { del = true; setTimeout(tick, 1800); }
    else setTimeout(tick, del ? 35 : 80);
  };
  setTimeout(tick, 1800);
}

// Skills showcase: tabs + auto-rotate while in view and idle
const showcase = $(".skills-showcase");
if (showcase) {
  const tabs = $$("[role=tab]", showcase), panels = $$("[role=tabpanel]", showcase);
  const play = $(".skills-play", showcase);
  let active = 0, paused = false, hovering = false, inView = false;
  const select = (i, focus) => {
    active = (i + tabs.length) % tabs.length;
    tabs.forEach((t, j) => { t.setAttribute("aria-selected", j === active); t.tabIndex = j === active ? 0 : -1; });
    panels.forEach((p, j) => { p.hidden = j !== active; if (j === active) { p.classList.remove("swap"); void p.offsetWidth; p.classList.add("swap"); } });
    if (focus) tabs[active].focus();
  };
  const pause = () => { paused = true; play?.classList.add("paused"); play?.setAttribute("aria-label", "Resume skill rotation"); };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => { select(i); pause(); });
    t.addEventListener("keydown", e => {
      const map = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in map)) return;
      e.preventDefault(); select(map[e.key], true); pause();
    });
  });
  play?.addEventListener("click", () => {
    if (paused) { paused = false; play.classList.remove("paused"); play.setAttribute("aria-label", "Pause skill rotation"); }
    else pause();
  });
  if (reduce) play?.remove();
  showcase.addEventListener("mouseenter", () => (hovering = true));
  showcase.addEventListener("mouseleave", () => (hovering = false));
  showcase.addEventListener("focusin", () => (hovering = true));
  showcase.addEventListener("focusout", e => { if (!showcase.contains(e.relatedTarget)) hovering = false; });
  new IntersectionObserver(([en]) => (inView = en.isIntersecting), { threshold: 0.2 }).observe(showcase);
  setInterval(() => { if (inView && !paused && !hovering && !reduce) select(active + 1); }, 6500);
}

// Mobile menu with focus trap and particle labels
const menu = $(".mobile-menu"), menuBtn = $(".menu-toggle");
let lastFocus = null;
function closeMenu() {
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  document.body.style.overflow = "";
  menuBtn?.setAttribute("aria-expanded", "false");
  lenis?.start();
  lastFocus?.focus({ preventScroll: true });
}
if (menu && menuBtn) {
  menuBtn.addEventListener("click", () => {
    lastFocus = document.activeElement;
    menu.hidden = false;
    document.body.style.overflow = "hidden";
    menuBtn.setAttribute("aria-expanded", "true");
    lenis?.stop();
    updateNav();
    requestAnimationFrame(() => $(".mobile-menu-close", menu).focus());
    if (!reduce) $$(".particle-label", menu).forEach(particles);
  });
  $(".mobile-menu-close", menu).addEventListener("click", closeMenu);
  $$("a", menu).forEach(a => a.addEventListener("click", closeMenu));
  addEventListener("resize", () => innerWidth > 700 && closeMenu());
  addEventListener("keydown", e => {
    if (menu.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); closeMenu(); }
    if (e.key !== "Tab") return;
    const f = $$("a[href], button", menu), first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

// Dots fly in and assemble into the label text, then hand off to real text
function particles(label) {
  const text = $("span", label), canvas = $("canvas", label);
  const ctx = canvas.getContext("2d"), mask = document.createElement("canvas");
  const ink = mask.getContext("2d", { willReadFrequently: true });
  const style = getComputedStyle(text), rect = text.getBoundingClientRect();
  mask.width = Math.ceil(rect.width); mask.height = Math.ceil(rect.height);
  if (!mask.width || !mask.height) return;
  ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ink.letterSpacing = style.letterSpacing;
  ink.fillStyle = "#fff";
  const m = ink.measureText(text.textContent);
  ink.fillText(text.textContent, 0, (mask.height - m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2 + m.actualBoundingBoxAscent);
  const px = ink.getImageData(0, 0, mask.width, mask.height).data, pts = [];
  for (let y = 0; y < mask.height; y += 3) for (let x = 0; x < mask.width; x += 3) {
    if (px[(y * mask.width + x) * 4 + 3] < 100) continue;
    const s = pts.length * 2.39996;
    pts.push({ x: x + 24, y: y + 18, dx: Math.cos(s) * (14 + x % 13), dy: Math.sin(s) * (10 + y % 9) });
  }
  const w = mask.width + 48, h = mask.height + 36, k = Math.min(devicePixelRatio || 1, 2);
  canvas.width = w * k; canvas.height = h * k; canvas.style.width = w + "px"; canvas.style.height = h + "px";
  ctx.setTransform(k, 0, 0, k, 0, 0); ctx.fillStyle = style.color;
  text.style.opacity = "0"; canvas.style.opacity = "1";
  let start;
  const draw = t => {
    start ??= t;
    const el = t - start, rem = Math.pow(1 - Math.min(el / 420, 1), 3), fade = Math.max(0, Math.min((el - 420) / 100, 1));
    ctx.clearRect(0, 0, w, h); ctx.globalAlpha = 0.9;
    for (const p of pts) { ctx.beginPath(); ctx.arc(p.x + p.dx * rem, p.y + p.dy * rem, 1, 0, Math.PI * 2); ctx.fill(); }
    canvas.style.opacity = String(1 - fade); text.style.opacity = String(fade);
    if (el < 520) requestAnimationFrame(draw); else { ctx.clearRect(0, 0, w, h); text.style.opacity = "1"; }
  };
  requestAnimationFrame(draw);
}
