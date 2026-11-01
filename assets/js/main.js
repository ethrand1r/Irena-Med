// Irena's WhatsApp number in international format, digits only.
const WHATSAPP_NUMBER = "905352460912";

const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const waUrl = (text) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
root.classList.add("js");

// WhatsApp links open a chat with a greeting already written.
document.querySelectorAll("[data-wa]").forEach((link) => {
  link.href = waUrl(link.dataset.wa || root.dataset.waGreeting || "");
  link.target = "_blank";
  link.rel = "noopener";
});

// Hero: intro choreography, sharper video on large screens.
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("is-loaded")));
const heroVideo = document.querySelector(".hero__video");
if (heroVideo) {
  const saveData = navigator.connection && navigator.connection.saveData;
  if (innerWidth > 1100 && !saveData && heroVideo.dataset.hd) {
    heroVideo.src = heroVideo.dataset.hd;
  }
  if (reduceMotion) heroVideo.pause();
  else heroVideo.play().catch(() => {});
}

// Header: solid after the hero, hides while scrolling down, returns on the way up.
const header = document.querySelector("[data-header]");
const hero = document.querySelector(".hero, .phero, .contact--page");
const waFloat = document.querySelector(".wa-float");
let lastY = scrollY;

// Count-up numbers.
const counted = new WeakSet();
const countUp = (el) => {
  if (counted.has(el)) return;
  counted.add(el);
  const target = +el.dataset.count;
  if (reduceMotion) return (el.textContent = target);
  const start = performance.now();
  const dur = 1600;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / dur);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 4)));
    if (t < 1) requestAnimationFrame(tick);
  };
  el.textContent = 0;
  requestAnimationFrame(tick);
};

// Manifesto: words light up as the paragraph passes through the screen.
const manifesto = document.querySelector("[data-words]");
let words = [];
if (manifesto) {
  manifesto.innerHTML = manifesto.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
  words = [...manifesto.querySelectorAll(".w")];
}

// Journey: the step in the middle of the screen drives the sticky picture.
const steps = [...document.querySelectorAll(".step")];
const stepsList = document.querySelector(".steps");
const frames = [...document.querySelectorAll(".journey__frame img")];
const stepNow = document.querySelector("[data-step-now]");
let activeStep = 0;
const setStep = (i) => {
  if (i === activeStep) return;
  activeStep = i;
  steps.forEach((s, n) => s.classList.toggle("is-active", n === i));
  frames.forEach((f, n) => f.classList.toggle("is-on", n === i));
  if (stepNow) stepNow.textContent = i + 1;
};

const parallaxHero = document.querySelector("[data-parallax]");
const parallaxImg = document.querySelector("[data-parallax-img]");

const onScroll = () => {
  const y = scrollY;
  const vh = innerHeight;
  const heroEnd = hero ? hero.offsetHeight - 80 : 0;

  header.classList.toggle("is-solid", y > heroEnd);
  header.classList.toggle("is-hidden", y > 400 && y > lastY && !root.classList.contains("menu-open"));
  waFloat?.classList.toggle("is-shown", y > vh * 0.7);
  lastY = y;

  if (reduceMotion) return;

  if (parallaxHero && y < vh * 1.2) parallaxHero.style.transform = `translate3d(0, ${y * 0.35}px, 0)`;

  if (parallaxImg) {
    const r = parallaxImg.parentElement.getBoundingClientRect();
    if (r.bottom > 0 && r.top < vh) {
      const p = (vh - r.top) / (vh + r.height);
      parallaxImg.style.transform = `translate3d(0, ${-p * 15}%, 0)`;
    }
  }

  if (words.length) {
    const r = manifesto.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    const lit = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle("is-lit", i < lit));
  }

  if (steps.length && getComputedStyle(document.querySelector(".journey__sticky")).display !== "none") {
    let best = 0;
    steps.forEach((s, i) => {
      if (s.getBoundingClientRect().top < vh * 0.55) best = i;
    });
    setStep(best);
    const lr = stepsList.getBoundingClientRect();
    const prog = Math.min(1, Math.max(0, (vh * 0.55 - lr.top) / lr.height));
    stepsList.style.setProperty("--progress", prog.toFixed(3));
  }
};

let ticking = false;
addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(() => { onScroll(); ticking = false; });
    ticking = true;
  }
}, { passive: true });
addEventListener("resize", onScroll);
onScroll();
if (reduceMotion) words.forEach((w) => w.classList.add("is-lit"));

// Reveal on scroll, counters start when seen.
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("is-in");
    e.target.querySelectorAll("[data-count]").forEach(countUp);
    io.unobserve(e.target);
  });
}, { rootMargin: "0px 0px -10% 0px" });
document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
document.querySelectorAll(".hero__stats [data-count]").forEach((el) => setTimeout(() => countUp(el), reduceMotion ? 0 : 900));

// Mobile steps: on small screens each step lights its dot when in view.
const stepIo = new IntersectionObserver((entries) => {
  entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-active"));
}, { rootMargin: "0px 0px -40% 0px" });
if (matchMedia("(max-width: 1080px)").matches) steps.forEach((s) => stepIo.observe(s));

// Carousels: arrows scroll by one card; [data-autoplay] tracks turn by themselves
// while on screen, pause on hover, focus or touch, and start over at the end.
document.querySelectorAll("[data-carousel]").forEach((section) => {
  const track = section.querySelector(".track");
  const buttons = section.querySelectorAll(".round");
  if (!track) return;
  const step = () => {
    const card = [...track.children].find((el) => !el.hidden);
    return card ? card.offsetWidth + parseFloat(getComputedStyle(track).columnGap || 0) : 0;
  };
  const atEnd = () => track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
  const sync = () => {
    if (buttons.length < 2) return;
    buttons[0].disabled = track.scrollLeft < 8;
    buttons[1].disabled = atEnd();
  };
  const go = (dir) => track.scrollBy({ left: dir * step(), behavior: reduceMotion ? "auto" : "smooth" });
  buttons.forEach((b) => b.addEventListener("click", () => go(+b.dataset.dir)));
  track.addEventListener("scroll", sync, { passive: true });
  addEventListener("resize", sync);
  sync();

  // Before/after: filter by treatment.
  section.querySelectorAll("[data-filter]").forEach((btn, _, all) => btn.addEventListener("click", () => {
    all.forEach((b) => { b.classList.toggle("is-on", b === btn); b.setAttribute("aria-pressed", b === btn); });
    track.querySelectorAll("[data-t]").forEach((el) => (el.hidden = btn.dataset.filter && el.dataset.t !== btn.dataset.filter));
    track.scrollTo({ left: 0 });
    sync();
  }));

  if (!track.hasAttribute("data-autoplay") || reduceMotion) return;
  let paused = false;
  let visible = false;
  const pause = () => (paused = true);
  const resume = () => (paused = false);
  section.addEventListener("pointerenter", pause);
  section.addEventListener("pointerleave", resume);
  section.addEventListener("focusin", pause);
  section.addEventListener("focusout", resume);
  track.addEventListener("touchstart", pause, { passive: true });
  track.addEventListener("touchend", () => setTimeout(resume, 4000), { passive: true });
  new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.3 }).observe(track);
  setInterval(() => {
    if (paused || !visible || document.hidden) return;
    if (atEnd()) track.scrollTo({ left: 0, behavior: "smooth" });
    else go(1);
  }, 4500);
});

// Before/after: the slider moves the dividing line.
document.querySelectorAll(".ba__range").forEach((input) => {
  const frame = input.closest(".ba__frame");
  input.addEventListener("input", () => frame.style.setProperty("--pos", `${input.value}%`));
});

// Mobile menu.
const burger = document.querySelector(".burger");
const menu = document.getElementById("menu");
const setMenu = (open) => {
  root.classList.toggle("menu-open", open);
  burger.setAttribute("aria-expanded", open);
  burger.setAttribute("aria-label", open ? burger.dataset.labelClose : burger.dataset.labelOpen);
  if (open) menu.hidden = false;
  requestAnimationFrame(() => menu.classList.toggle("is-open", open));
  document.body.style.overflow = open ? "hidden" : "";
  if (!open) setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 700);
};
burger?.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
menu?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
addEventListener("keydown", (e) => e.key === "Escape" && root.classList.contains("menu-open") && setMenu(false));

// Contact: the answers become a WhatsApp message, previewed as a chat bubble.
const form = document.querySelector(".composer__form");
const bubble = document.querySelector(".bubble");
const msg = document.querySelector(".bubble__msg");
if (form && msg) {
  const t = JSON.parse(document.getElementById("wa-template").textContent);
  const compose = () => {
    const d = Object.fromEntries(new FormData(form));
    const lines = [t.hello + (d.name ? `, ${t.me} ${d.name.trim()}` : "") + "."];
    if (d.treatment) lines.push(`${t.interested} ${d.treatment}.`);
    if (d.from) lines.push(`${t.from} ${d.from.trim()}.`);
    if (d.company) lines.push(d.company + ".");
    lines.push(t.ask);
    return lines.join("\n");
  };
  const update = () => {
    msg.textContent = compose();
    bubble.classList.remove("is-typing");
    void bubble.offsetWidth;
    bubble.classList.add("is-typing");
  };
  form.addEventListener("input", update);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    window.open(waUrl(compose()), "_blank", "noopener");
  });
  msg.textContent = compose();
}

document.getElementById("year").textContent = new Date().getFullYear();
