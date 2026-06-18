"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "~/app/_components/Logo";

/* ─────────────────────────────────────────────
   Count-up hook (triggers once in-view)
───────────────────────────────────────────── */
function useCountUp(target: number, duration = 1600, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let t0: number | null = null;
    const tick = (ts: number) => {
      t0 ??= ts;
      const p = Math.min((ts - t0) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, target, duration]);
  return val;
}

/* ─────────────────────────────────────────────
   Data
───────────────────────────────────────────── */
const FEATURES = [
  { icon: "auto_awesome",   title: "AI-Powered Inbox",    desc: "Tacta reads, summarises and prioritises every email so you focus on what actually matters." },
  { icon: "calendar_month", title: "Smart Calendar",      desc: "Scheduling conflicts, reminders and meeting prep — handled automatically." },
  { icon: "bolt",           title: "Command Centre",      desc: "One shortcut to search every email, event and contact across your entire workspace." },
  { icon: "shield_lock",    title: "Privacy First",       desc: "Minimal OAuth scopes. Your message content is never stored on our servers." },
  { icon: "hub",            title: "Deep Integrations",   desc: "Gmail, Calendar, Meet and Drive — unified in one seamless, intelligent workspace." },
  { icon: "speed",          title: "Blazing Fast",        desc: "Optimistic updates and edge caching keep your whole workspace snappy." },
];

const TESTIMONIALS = [
  { quote: "Tacta turned my chaotic inbox into a calm command centre. I save at least 2 hours every day.", name: "Sarah Chen",    role: "Product Lead @ Vercel",           initials: "SC" },
  { quote: "The AI summaries are eerily accurate. I read my emails in 10 minutes instead of an hour.",    name: "Marcus Williams", role: "Founder @ Buildspace",           initials: "MW" },
  { quote: "Scheduling meetings used to drain me. Tacta's smart calendar just handles it. Love it.",       name: "Priya Kapoor", role: "Engineering Manager @ Stripe",    initials: "PK" },
];

const STATS: { value: number; suffix: string; label: string }[] = [
  { value: 2,  suffix: "h+", label: "Saved per user daily" },
  { value: 40, suffix: "k+", label: "Emails processed daily" },
  { value: 99, suffix: "%",  label: "Inbox accuracy rate" },
];

/* ─────────────────────────────────────────────
   Clean flat tactile grid background
───────────────────────────────────────────── */
function TactileBg() {
  return (
    <div className="lp-rings" aria-hidden>
      <div className="lp-grid-pattern" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Navbar
───────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header className={`lp-nav${scrolled ? " lp-nav--solid" : ""}`}>
      <div className="lp-wrap lp-nav__row">
        <Link href="/" className="lp-nav__logo">
          <Logo size={30} />
        </Link>

        <nav className="lp-nav__links" aria-label="Primary navigation">
          <a href="#features">Features</a>
          <a href="#testimonials">Testimonials</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <div className="lp-nav__actions">
          <Link href="/login" className="lp-btn lp-btn-ghost">Sign in</Link>
          <Link href="/login" className="lp-btn lp-btn-filled">Get started</Link>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────
   Hero
───────────────────────────────────────────── */
function Hero() {
  return (
    <section className="lp-hero">
      <TactileBg />
      <div className="lp-wrap lp-hero__inner">
        {/* Badge */}
        <div className="lp-badge">
          <span className="material-symbols-outlined lp-badge__icon">auto_awesome</span>
          AI-Powered Command Centre
        </div>

        {/* Headline */}
        <h1 className="lp-hero__h1">
          Your Gmail &amp; Calendar,<br />
          <span className="lp-gradient-text">Reimagined.</span>
        </h1>

        <p className="lp-hero__sub">
          Tacta is your AI-powered command centre for Google Workspace. Read smarter,
          schedule faster, and take back hours of your day — every single day.
        </p>

        {/* CTAs */}
        <div className="lp-hero__ctas">
          <Link href="/login" className="lp-btn lp-btn-filled lp-btn-lg">
            <span className="material-symbols-outlined" aria-hidden>rocket_launch</span>
            Start for free
          </Link>
          <a href="#features" className="lp-btn lp-btn-tonal lp-btn-lg">
            See how it works
            <span className="material-symbols-outlined" aria-hidden>arrow_downward</span>
          </a>
        </div>

        <p className="lp-hero__note">No credit card required · Free forever plan</p>

        {/* Floating mockup */}
        <div className="lp-mockup-wrap">
          <AppMockup />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   App Mockup
───────────────────────────────────────────── */
function AppMockup() {
  const MAILS = [
    { from: "Sarah Chen",  subj: "Q3 roadmap review",     time: "9:41 AM",   unread: true,  tag: "Urgent" },
    { from: "GitHub",      subj: "New PR: feat/tacta-ai", time: "8:12 AM",   unread: true,  tag: "Dev" },
    { from: "Vercel",      subj: "Deployment successful", time: "7:00 AM",   unread: false, tag: "" },
    { from: "Marcus W.",   subj: "Coffee next week?",     time: "Yesterday", unread: false, tag: "" },
    { from: "Stripe",      subj: "Invoice #4821 paid",    time: "Mon",       unread: false, tag: "" },
  ];
  const NAV_ICONS = ["inbox", "calendar_month", "chat", "settings"];

  return (
    <div className="lp-mockup">
      {/* sidebar */}
      <aside className="lp-mockup__sidebar">
        {NAV_ICONS.map((ic, i) => (
          <div key={ic} className={`lp-mockup__nav-item${i === 0 ? " active" : ""}`}>
            <span className="material-symbols-outlined">{ic}</span>
          </div>
        ))}
      </aside>

      {/* mail list */}
      <div className="lp-mockup__list">
        <div className="lp-mockup__search">
          <span className="material-symbols-outlined">search</span>
          <span>Search everything…</span>
        </div>
        {MAILS.map((m, i) => (
          <div key={i} className={`lp-mockup__row${m.unread ? " unread" : ""}${i === 0 ? " selected" : ""}`}>
            <div className="lp-mockup__avatar">{m.from[0]}</div>
            <div className="lp-mockup__meta">
              <div className="lp-mockup__from">
                {m.from}
                {m.tag && <span className="lp-mockup__tag">{m.tag}</span>}
              </div>
              <div className="lp-mockup__subj">{m.subj}</div>
            </div>
            <span className="lp-mockup__time">{m.time}</span>
          </div>
        ))}
      </div>

      {/* detail panel */}
      <div className="lp-mockup__detail">
        <div className="lp-mockup__detail-header">
          <div className="lp-mockup__detail-avatar">S</div>
          <div>
            <p className="lp-mockup__detail-name">Sarah Chen</p>
            <p className="lp-mockup__detail-to">to me, team@tacta.online</p>
          </div>
        </div>
        <p className="lp-mockup__detail-subject">Q3 roadmap review</p>
        <div className="lp-mockup__detail-body">
          <p>Hey team 👋</p>
          <p>Wanted to loop you in on our Q3 roadmap. We're locking in priorities this week and your input would be invaluable…</p>
        </div>
        <div className="lp-mockup__ai">
          <span className="material-symbols-outlined">auto_awesome</span>
          AI Summary: Sarah wants your Q3 input. Deadline: Friday EOD.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Stats
───────────────────────────────────────────── */
function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e?.isIntersecting) setActive(true); }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const v0 = useCountUp(STATS[0]!.value, 1400, active);
  const v1 = useCountUp(STATS[1]!.value, 1400, active);
  const v2 = useCountUp(STATS[2]!.value, 1400, active);
  const vals = [v0, v1, v2];

  return (
    <div ref={ref} className="lp-stats">
      <div className="lp-wrap lp-stats__grid">
        {STATS.map((s, i) => (
          <div key={i} className="lp-stat">
            <span className="lp-stat__num">{vals[i]}{s.suffix}</span>
            <span className="lp-stat__label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Features
───────────────────────────────────────────── */
function Features() {
  return (
    <section id="features" className="lp-section">
      <div className="lp-wrap">
        <div className="lp-section__head">
          <span className="lp-eyebrow">Everything you need</span>
          <h2 className="lp-section__title">Built for how you actually work</h2>
          <p className="lp-section__sub">Six powerful capabilities, seamlessly woven into one beautiful workspace.</p>
        </div>
        <div className="lp-features__grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="lp-card lp-feature">
              <div className="lp-feature__icon">
                <span className="material-symbols-outlined">{f.icon}</span>
              </div>
              <h3 className="lp-feature__title">{f.title}</h3>
              <p className="lp-feature__desc">{f.desc}</p>
              <span className="lp-feature__arrow material-symbols-outlined">arrow_forward</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Testimonials
───────────────────────────────────────────── */
function Testimonials() {
  return (
    <section id="testimonials" className="lp-section lp-section--tinted">
      <div className="lp-wrap">
        <div className="lp-section__head">
          <span className="lp-eyebrow">Loved by teams</span>
          <h2 className="lp-section__title">Real people, real results</h2>
        </div>
        <div className="lp-testimonials__grid">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="lp-card lp-testimonial">
              <div className="lp-testimonial__stars">★★★★★</div>
              <p className="lp-testimonial__quote">"{t.quote}"</p>
              <div className="lp-testimonial__author">
                <div className="lp-testimonial__avatar">{t.initials}</div>
                <div>
                  <p className="lp-testimonial__name">{t.name}</p>
                  <p className="lp-testimonial__role">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Pricing
───────────────────────────────────────────── */
function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      desc: "Perfect for individuals who want a smarter inbox.",
      features: ["AI email summaries", "Google Calendar sync", "100 AI actions/mo", "1 connected account"],
      cta: "Get started",
      pro: false,
    },
    {
      name: "Pro",
      price: "$12",
      desc: "For power users who want every advantage.",
      features: ["Everything in Free", "Unlimited AI actions", "Priority inbox AI", "Up to 5 accounts", "Custom shortcuts", "Early access features"],
      cta: "Start 14-day trial",
      pro: true,
    },
    {
      name: "Team",
      price: "$29",
      desc: "Shared inbox, delegation and admin controls.",
      features: ["Everything in Pro", "Team shared inbox", "Admin dashboard", "SAML SSO", "Priority support", "SLA guarantee"],
      cta: "Contact sales",
      pro: false,
    },
  ];

  return (
    <section id="pricing" className="lp-section">
      <div className="lp-wrap">
        <div className="lp-section__head">
          <span className="lp-eyebrow">Simple pricing</span>
          <h2 className="lp-section__title">Start free, scale when ready</h2>
        </div>
        <div className="lp-pricing__grid">
          {plans.map((p) => (
            <div key={p.name} className={`lp-plan${p.pro ? " lp-plan--pro" : ""}`}>
              {p.pro && <div className="lp-plan__badge">Most popular</div>}
              <p className="lp-plan__name">{p.name}</p>
              <p className="lp-plan__price">{p.price}<span>/mo</span></p>
              <p className="lp-plan__desc">{p.desc}</p>
              <ul className="lp-plan__list">
                {p.features.map((f) => (
                  <li key={f}>
                    <span className="material-symbols-outlined">check_circle</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`lp-btn lp-btn-lg lp-btn-full ${p.pro ? "lp-btn-filled" : "lp-btn-outlined"}`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   CTA Banner
───────────────────────────────────────────── */
function CtaBanner() {
  return (
    <section className="lp-cta">
      <TactileBg />
      <div className="lp-wrap lp-cta__inner">
        <Logo size={48} showText={true} />
        <h2 className="lp-cta__title">Ready to take command<br />of your inbox?</h2>
        <p className="lp-cta__sub">
          Join thousands of professionals who start their morning with Tacta instead of inbox dread.
        </p>
        <Link href="/login" className="lp-btn lp-btn-surface lp-btn-lg">
          <span className="material-symbols-outlined" aria-hidden>rocket_launch</span>
          Launch Tacta — it&apos;s free
        </Link>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Footer
───────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer__top">
        <div className="lp-footer__brand">
          <Logo size={28} />
          <p>A command centre for Gmail &amp; Google Calendar.</p>
        </div>
        <div className="lp-footer__cols">
          {[
            { title: "Product",  links: [["Features","#features"],["Pricing","#pricing"],["Dashboard","/chat"]] },
            { title: "Company",  links: [["About","#"],["Blog","#"],["Careers","#"]] },
            { title: "Legal",    links: [["Privacy","/privacy"],["Terms","/terms"],["Cookies","#"]] },
          ].map((col) => (
            <div key={col.title} className="lp-footer__col">
              <span className="lp-footer__col-title">{col.title}</span>
              {col.links.map(([label, href]) => (
                <a key={label} href={href!}>{label}</a>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="lp-wrap lp-footer__bottom">
        <span>© {new Date().getFullYear()} Tacta. All rights reserved.</span>
        <span>Made with ❤️ for productivity nerds</span>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   Root
───────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <>
      <style>{CSS}</style>
      <div className="lp-root">
        <Navbar />
        <Hero />
        <StatsStrip />
        <Features />
        <Testimonials />
        <Pricing />
        <CtaBanner />
        <Footer />
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES — every colour, font, radius and shadow comes from the project's CSS
   custom properties defined in base.css / globals.css.
   All classes are lp-prefixed to avoid leaking into the app shell.
───────────────────────────────────────────────────────────────────────────────*/
const CSS = `
/* ── Base ── */
.lp-root {
  font-family: var(--font-sans);
  color: var(--color-on-background);
  background: var(--color-background);
  overflow-x: hidden;
}
.lp-wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-gutter);
}

/* ── Minimalist Headline ── */
.lp-gradient-text {
  color: var(--color-primary);
}

/* ── Buttons ── */
.lp-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0.5rem 1.25rem;
  border-radius: var(--radius-full);
  font-family: var(--font-sans);
  font-size: var(--text-label-lg-size);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: all var(--duration-base) var(--ease-standard);
  white-space: nowrap;
  line-height: var(--text-label-lg-line);
}
.lp-btn-filled {
  background: var(--color-primary);
  color: var(--color-on-primary);
}
.lp-btn-filled:hover {
  filter: brightness(1.05);
}
.lp-btn-tonal {
  background: var(--color-secondary-container);
  color: var(--color-on-secondary-container);
}
.lp-btn-tonal:hover {
  filter: brightness(0.96);
}
.lp-btn-ghost {
  background: transparent;
  color: var(--color-on-surface-variant);
}
.lp-btn-ghost:hover {
  background: var(--color-surface-container-low);
  color: var(--color-primary);
}
.lp-btn-outlined {
  background: transparent;
  color: var(--color-primary);
  border: 1.5px solid var(--color-outline-variant);
}
.lp-btn-outlined:hover {
  background: var(--color-primary-container);
  border-color: var(--color-primary);
}
.lp-btn-surface {
  background: var(--color-surface-container-lowest);
  color: var(--color-primary);
  border: 1px solid var(--color-outline-variant);
}
.lp-btn-surface:hover {
  background: var(--color-surface-container-low);
}
.lp-btn-lg {
  padding: 0.8125rem 1.875rem;
  font-size: var(--text-body-lg-size);
}
.lp-btn-full {
  width: 100%;
  justify-content: center;
}

/* ── Navbar ── */
.lp-nav {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 200;
  padding: 1.125rem 0;
  transition: background var(--duration-base) var(--ease-standard),
              box-shadow var(--duration-base) var(--ease-standard),
              padding var(--duration-base) var(--ease-standard);
}
.lp-nav--solid {
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 1px 0 var(--color-outline-variant);
  padding: 0.625rem 0;
}
.lp-nav__row {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}
.lp-nav__logo { display: flex; align-items: center; text-decoration: none; }
.lp-nav__links {
  display: flex;
  gap: var(--space-xl);
  margin-left: auto;
}
.lp-nav__links a {
  font-size: var(--text-label-lg-size);
  font-weight: 500;
  color: var(--color-on-surface-variant);
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-standard);
}
.lp-nav__links a:hover { color: var(--color-primary); }
.lp-nav__actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-left: var(--space-lg);
}

/* ── Clean flat tactile grid background ── */
.lp-rings {
  pointer-events: none;
  position: absolute;
  inset: 0;
  overflow: hidden;
  opacity: 0.15;
}
.lp-grid-pattern {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(to right, var(--color-outline-variant) 1px, transparent 1px),
    linear-gradient(to bottom, var(--color-outline-variant) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* ── Hero ── */
.lp-hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  align-items: center;
  padding: 9rem 0 5rem;
  overflow: hidden;
}
.lp-hero__inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* Badge */
.lp-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0.3125rem var(--space-md);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent);
  color: var(--color-primary);
  font-size: var(--text-label-md-size);
  font-weight: 600;
  margin-bottom: var(--space-lg);
  animation: lp-up 0.55s ease both;
}
.lp-badge__icon { font-size: 14px; }

/* Headline */
.lp-hero__h1 {
  font-family: var(--font-serif);
  font-size: clamp(2.5rem, 7vw, 4.75rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--color-on-background);
  margin: 0 0 var(--space-lg);
  animation: lp-up 0.55s 0.08s ease both;
}

.lp-hero__sub {
  font-size: clamp(1rem, 2vw, 1.1875rem);
  color: var(--color-on-surface-variant);
  max-width: 580px;
  line-height: 1.75;
  margin: 0 0 var(--space-xl);
  animation: lp-up 0.55s 0.16s ease both;
}
.lp-hero__ctas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  justify-content: center;
  animation: lp-up 0.55s 0.24s ease both;
}
.lp-hero__note {
  margin-top: var(--space-md);
  font-size: var(--text-label-md-size);
  color: var(--color-outline);
  animation: lp-up 0.55s 0.32s ease both;
}

/* ── App Mockup ── */
.lp-mockup-wrap {
  margin-top: 4.5rem;
  width: 100%;
  max-width: 960px;
  animation: lp-up 0.55s 0.4s ease both;
}
.lp-mockup {
  display: grid;
  grid-template-columns: 52px 230px 1fr;
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--color-outline-variant);
  box-shadow: 0 20px 48px rgba(0,0,0,0.06);
  background: var(--color-surface);
  height: 360px;
}

/* Mockup sidebar */
.lp-mockup__sidebar {
  background: var(--color-surface-container-low);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-md) 0;
  gap: var(--space-xs);
  border-right: var(--border-subtle);
}
.lp-mockup__nav-item {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-md);
  color: var(--color-on-surface-variant);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard);
}
.lp-mockup__nav-item .material-symbols-outlined { font-size: 18px; }
.lp-mockup__nav-item.active,
.lp-mockup__nav-item:hover {
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
}

/* Mockup mail list */
.lp-mockup__list {
  border-right: var(--border-subtle);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
}
.lp-mockup__search {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0.6875rem var(--space-md);
  border-bottom: var(--border-subtle);
  color: var(--color-outline);
  font-size: var(--text-label-md-size);
}
.lp-mockup__search .material-symbols-outlined { font-size: 14px; }
.lp-mockup__row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0.5625rem var(--space-md);
  border-bottom: var(--border-subtle);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard);
}
.lp-mockup__row:hover { background: var(--color-surface-container-low); }
.lp-mockup__row.selected { background: var(--color-primary-container); }
.lp-mockup__row.unread .lp-mockup__from { color: var(--color-primary); font-weight: 600; }
.lp-mockup__avatar {
  width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  font-size: 0.6875rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.lp-mockup__meta { flex: 1; min-width: 0; }
.lp-mockup__from {
  font-size: 0.6875rem; font-weight: 500; color: var(--color-on-surface);
  display: flex; align-items: center; gap: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lp-mockup__subj {
  font-size: 0.625rem; color: var(--color-on-surface-variant);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lp-mockup__time { font-size: 0.5625rem; color: var(--color-outline); flex-shrink: 0; }
.lp-mockup__tag {
  padding: 0.1rem 0.4rem; border-radius: var(--radius-full);
  background: var(--color-secondary-container);
  color: var(--color-on-secondary-container);
  font-size: 0.5rem; font-weight: 700;
}

/* Mockup detail */
.lp-mockup__detail {
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  background: var(--color-surface-container-lowest);
  overflow: hidden;
}
.lp-mockup__detail-header { display: flex; align-items: center; gap: var(--space-sm); }
.lp-mockup__detail-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 0.875rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.lp-mockup__detail-name { font-size: 0.8125rem; font-weight: 600; color: var(--color-on-surface); margin: 0; }
.lp-mockup__detail-to  { font-size: 0.6875rem; color: var(--color-on-surface-variant); margin: 0; }
.lp-mockup__detail-subject { font-size: var(--text-body-lg-size); font-weight: 700; color: var(--color-on-surface); }
.lp-mockup__detail-body { font-size: var(--text-body-md-size); color: var(--color-on-surface-variant); line-height: 1.65; }
.lp-mockup__detail-body p { margin: 0 0 0.4rem; }
.lp-mockup__ai {
  margin-top: auto;
  display: inline-flex; align-items: center; gap: var(--space-xs);
  padding: 0.5rem var(--space-md);
  border-radius: var(--radius-lg);
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  font-size: var(--text-label-md-size); font-weight: 500;
  border: 1px solid var(--color-outline-variant);
}
.lp-mockup__ai .material-symbols-outlined { font-size: 14px; }

/* ── Stats strip ── */
.lp-stats {
  background: var(--color-primary);
  padding: var(--space-xl) 0;
}
.lp-stats__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-xl);
  text-align: center;
}
.lp-stat { display: flex; flex-direction: column; gap: var(--space-xs); }
.lp-stat__num {
  font-family: var(--font-serif);
  font-size: clamp(2.25rem, 5vw, 3.25rem);
  font-weight: 700;
  color: var(--color-on-primary);
  line-height: 1;
}
.lp-stat__label {
  font-size: var(--text-body-md-size);
  color: color-mix(in srgb, var(--color-on-primary) 75%, transparent);
}

/* ── Sections ── */
.lp-section { padding: 6rem 0; }
.lp-section--tinted { background: var(--color-surface-container-low); }
.lp-section__head { text-align: center; margin-bottom: 3.5rem; }
.lp-eyebrow {
  display: inline-block;
  padding: 0.25rem 0.875rem;
  border-radius: var(--radius-full);
  background: var(--color-secondary-container);
  color: var(--color-on-secondary-container);
  font-size: var(--text-label-md-size);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: var(--space-md);
}
.lp-section__title {
  font-family: var(--font-serif);
  font-size: clamp(1.625rem, 4vw, 2.375rem);
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--color-on-background);
  margin: 0 0 var(--space-md);
  line-height: 1.2;
}
.lp-section__sub {
  font-size: var(--text-body-lg-size);
  color: var(--color-on-surface-variant);
  max-width: 540px;
  margin: 0 auto;
  line-height: 1.75;
}

/* ── Card base ── */
.lp-card {
  background: var(--color-surface-container-lowest);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-outline-variant);
  transition: all var(--duration-base) var(--ease-standard);
}
.lp-card:hover {
  border-color: var(--color-primary);
}

/* ── Features ── */
.lp-features__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
}
.lp-feature {
  padding: var(--space-xl);
  position: relative;
  overflow: hidden;
  cursor: default;
}
.lp-feature__icon {
  width: 44px; height: 44px;
  border-radius: var(--radius-lg);
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: var(--space-lg);
  transition: all var(--duration-base) var(--ease-standard);
}
.lp-feature__icon .material-symbols-outlined { font-size: 22px; }
.lp-feature:hover .lp-feature__icon {
  background: var(--color-primary);
  color: var(--color-on-primary);
}
.lp-feature__title {
  font-size: var(--text-title-lg-size);
  font-weight: 600;
  color: var(--color-on-surface);
  margin: 0 0 var(--space-sm);
  line-height: var(--text-title-lg-line);
}
.lp-feature__desc {
  font-size: var(--text-body-md-size);
  color: var(--color-on-surface-variant);
  line-height: 1.7;
  margin: 0;
}
.lp-feature__arrow {
  position: absolute; bottom: var(--space-lg); right: var(--space-lg);
  font-size: 16px; color: var(--color-primary);
  opacity: 0;
  transition: all var(--duration-fast) var(--ease-standard);
}
.lp-feature:hover .lp-feature__arrow { opacity: 1; }

/* ── Testimonials ── */
.lp-testimonials__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
}
.lp-testimonial { padding: var(--space-xl); }
.lp-testimonial__stars {
  color: #f59e0b;
  font-size: 0.9375rem;
  letter-spacing: 2px;
  margin-bottom: var(--space-md);
}
.lp-testimonial__quote {
  font-size: var(--text-body-lg-size);
  font-style: italic;
  color: var(--color-on-surface);
  line-height: 1.7;
  margin: 0 0 var(--space-lg);
}
.lp-testimonial__author { display: flex; align-items: center; gap: var(--space-md); }
.lp-testimonial__avatar {
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: var(--text-label-md-size); font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.lp-testimonial__name { font-size: var(--text-label-lg-size); font-weight: 700; color: var(--color-on-surface); margin: 0; }
.lp-testimonial__role { font-size: var(--text-label-md-size); color: var(--color-on-surface-variant); margin: 0; }

/* ── Pricing ── */
.lp-pricing__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
  align-items: start;
}
.lp-plan {
  background: var(--color-surface-container-lowest);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-outline-variant);
  padding: 2.25rem var(--space-xl);
  position: relative;
}
.lp-plan--pro {
  background: var(--color-surface-container-high);
  border: 2px solid var(--color-primary);
}
.lp-plan__badge {
  position: absolute; top: -0.6875rem; left: 50%; transform: translateX(-50%);
  background: var(--color-tertiary-container);
  color: var(--color-on-tertiary-container);
  font-size: 0.625rem; font-weight: 800;
  padding: 0.25rem 0.875rem;
  border-radius: var(--radius-full);
  white-space: nowrap; text-transform: uppercase; letter-spacing: 0.06em;
}
.lp-plan__name {
  font-size: var(--text-label-lg-size); font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--color-on-surface-variant); margin: 0 0 0.5rem;
}
.lp-plan--pro .lp-plan__name { color: var(--color-primary); }
.lp-plan__price {
  font-family: var(--font-serif);
  font-size: 2.75rem; font-weight: 700; letter-spacing: -0.04em;
  color: var(--color-on-surface); line-height: 1; margin: 0 0 0.75rem;
}
.lp-plan--pro .lp-plan__price { color: var(--color-on-surface); }
.lp-plan__price span {
  font-family: var(--font-sans);
  font-size: var(--text-body-lg-size); font-weight: 500;
  color: var(--color-outline); vertical-align: super;
}
.lp-plan--pro .lp-plan__price span { color: var(--color-outline); }
.lp-plan__desc {
  font-size: var(--text-body-md-size); color: var(--color-on-surface-variant);
  margin: 0 0 var(--space-xl); line-height: 1.65;
}
.lp-plan--pro .lp-plan__desc { color: var(--color-on-surface-variant); }
.lp-plan__list {
  list-style: none; margin: 0 0 var(--space-xl); padding: 0;
  display: flex; flex-direction: column; gap: 0.625rem;
}
.lp-plan__list li {
  display: flex; align-items: center; gap: var(--space-sm);
  font-size: var(--text-body-md-size); color: var(--color-on-surface);
}
.lp-plan--pro .lp-plan__list li { color: var(--color-on-surface); }
.lp-plan__list .material-symbols-outlined { font-size: 16px; color: var(--color-primary); }
.lp-plan--pro .lp-plan__list .material-symbols-outlined { color: var(--color-primary); }

/* ── CTA Banner ── */
.lp-cta {
  position: relative;
  background: var(--color-surface-container-high);
  border-top: 1px solid var(--color-outline-variant);
  border-bottom: 1px solid var(--color-outline-variant);
  padding: 7rem 0;
  overflow: hidden;
}
.lp-cta__inner {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-lg);
}
.lp-cta__title {
  font-family: var(--font-serif);
  font-size: clamp(1.875rem, 5vw, 3.25rem);
  font-weight: 700; letter-spacing: -0.03em; line-height: 1.15;
  color: var(--color-on-surface);
  margin: 0;
}
.lp-cta__sub {
  font-size: var(--text-body-lg-size);
  color: var(--color-on-surface-variant);
  max-width: 500px; line-height: 1.75; margin: 0;
}

/* ── Footer ── */
.lp-footer { background: var(--color-inverse-surface); padding: 3.5rem 0 0; }
.lp-footer__top {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 3rem;
  padding-bottom: 2.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-inverse-on-surface) 15%, transparent);
}
.lp-footer__brand p {
  font-size: var(--text-body-md-size);
  color: color-mix(in srgb, var(--color-inverse-on-surface) 55%, transparent);
  margin: 0.75rem 0 0; max-width: 240px; line-height: 1.6;
}
.lp-footer__cols { display: flex; gap: 3rem; }
.lp-footer__col { display: flex; flex-direction: column; gap: var(--space-md); }
.lp-footer__col-title {
  font-size: var(--text-label-md-size); font-weight: 700;
  color: var(--color-inverse-on-surface); text-transform: uppercase; letter-spacing: 0.07em;
}
.lp-footer__col a {
  font-size: var(--text-body-md-size);
  color: color-mix(in srgb, var(--color-inverse-on-surface) 55%, transparent);
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-standard);
}
.lp-footer__col a:hover { color: var(--color-inverse-primary); }
.lp-footer__bottom {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.375rem 0;
  font-size: var(--text-label-md-size);
  color: color-mix(in srgb, var(--color-inverse-on-surface) 40%, transparent);
}

/* ── Keyframes ── */
@keyframes lp-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Responsive ── */
@media (max-width: 960px) {
  .lp-features__grid,
  .lp-testimonials__grid,
  .lp-pricing__grid { grid-template-columns: 1fr; }
  .lp-plan--pro { transform: none; }
  .lp-stats__grid { gap: var(--space-lg); }
  .lp-nav__links { display: none; }
  .lp-footer__top { grid-template-columns: 1fr; gap: var(--space-xl); }
  .lp-footer__cols { flex-wrap: wrap; gap: var(--space-xl); }
  .lp-mockup { grid-template-columns: 48px 1fr; height: 260px; }
  .lp-mockup__detail { display: none; }
  .lp-hero { padding: 7rem 0 4rem; }
}
@media (max-width: 600px) {
  .lp-hero__ctas { flex-direction: column; align-items: stretch; }
  .lp-stats__grid { grid-template-columns: 1fr; }
  .lp-footer__bottom { flex-direction: column; gap: var(--space-xs); text-align: center; }
}
`;
