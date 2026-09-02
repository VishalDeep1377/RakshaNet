"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Phone,
  Menu,
  X,
  Shield,
  BookOpen,
  MessageCircle,
  Users,
  MapPinned,
  Radio,
  HeartPulse,
  Equal,
  Building2,
  Gavel,
  Handshake,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import ChatWidget from "./components/ChatWidget";

/* ═══════════════════════════════════════════════
   BRAND TOKENS
═══════════════════════════════════════════════ */
const C = {
  bg: "#0A0000",
  accent: "#FF0033",
  accent2: "#CC0022",
  highlight: "#FF4D6D",
  border: "rgba(255,0,50,0.14)",
  textSecondary: "rgba(255,210,215,0.55)",
};

/* ═══════════════════════════════════════════════
   MEDIA ASSETS
═══════════════════════════════════════════════ */
const ASSETS = {
  heroImages: [
    "/media/hero/hero-1.jpg",
    "/media/hero/hero-2.jpg",
    "/media/hero/hero-3.jpg",
    "/media/hero/hero-4.jpg",
  ],
  heroVideo: "/media/hero/hero-loop.mp4",
  pledgeBg: "/media/hero/hero-3.jpg",
};

/* ═══════════════════════════════════════════════
   LETTER-BY-LETTER HEADLINE
═══════════════════════════════════════════════ */
function AnimatedWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  let charIndex = 0;
  return (
    <span className={className} aria-label={text}>
      {words.map((word, wi) => (
        <span key={wi} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
          {word.split("").map((ch, i) => {
            const delay = charIndex++ * 0.035;
            return (
              <span
                key={i}
                className="letter-in"
                style={{ animationDelay: `${delay}s` }}
              >
                {ch}
              </span>
            );
          })}
          {wi < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════════
   NAV
═══════════════════════════════════════════════ */
function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        transition: "all 0.4s",
        background: scrolled ? "rgba(10,0,0,0.92)" : "rgba(10,0,0,0.4)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        suppressHydrationWarning
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 24px",
          height: 96,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {/* Brand Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <img
              suppressHydrationWarning
              src="/logo.png"
              alt="Safety for Women - RakshaNet"
              style={{ height: 110, width: "auto", objectFit: "contain" }}
            />
          </Link>

          {/* Desktop Horizontal Navigation Links */}
          <div className="nav-menu-desktop">
            <Link href="/" className="nav-link-pill-active">
              HOME
            </Link>
            <a href="#about" className="nav-link-text">
              ABOUT US
            </a>
            <a href="#initiatives" className="nav-link-text">
              OUR INITIATIVES
            </a>
            <a href="#our-impact" className="nav-link-text">
              OUR IMPACT
            </a>
            <a href="#resources" className="nav-link-text">
              RESOURCES
            </a>
          </div>
        </div>

        {/* Right CTA Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* AI Chat Button in nav */}
          <button
            onClick={() => {
              const btn = document.getElementById("chat-toggle-btn");
              if (btn) btn.click();
            }}
            title="Ask our AI Safety Assistant"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "linear-gradient(135deg, rgba(255,0,51,0.12), rgba(180,0,40,0.08))",
              border: "1px solid rgba(255,0,51,0.28)",
              borderRadius: 100,
              padding: "7px 16px 7px 12px",
              color: "rgba(255,255,255,0.9)",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "0.04em",
              cursor: "pointer",
              transition: "all 0.25s",
            }}
          >
            <Sparkles size={14} color="#FF0033" />
            AI Assistant
          </button>

          <a href="tel:112" className="pill-call">
            <Phone size={13} /> Call 112
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════════
   HERO — crossfade 4 images + looping background video
═══════════════════════════════════════════════ */
function Hero() {
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % ASSETS.heroImages.length);
    }, 5000);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <section
      style={{
        position: "relative",
        height: "100vh",
        minHeight: 660,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        textAlign: "center",
      }}
    >
      {/* Layer 1 — Crossfading background images */}
      {ASSETS.heroImages.map((src, i) => (
        <div
          key={src}
          className="hero-bg-layer"
          style={{
            backgroundImage: `url(${src})`,
            opacity: i === index ? 0.65 : 0,
          }}
        />
      ))}

      {/* Layer 2 — dark gradient scrim for contrast */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 15,
          background:
            "linear-gradient(180deg, rgba(10,0,0,0.6) 0%, rgba(10,0,0,0.8) 60%, #0A0000 100%)",
        }}
      />

      {/* Layer 3 — Looping video */}
      {!reduceMotion && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.35,
            mixBlendMode: "screen",
          }}
          onError={(e) => {
            (e.currentTarget as HTMLVideoElement).style.display = "none";
          }}
        >
          <source src={ASSETS.heroVideo} type="video/mp4" />
        </video>
      )}

      {/* Layer 4 — Content */}
      <div style={{ position: "relative", zIndex: 30, maxWidth: 820, padding: "0 24px" }}>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", color: "white", marginBottom: 18 }}>
          <AnimatedWords text="ONE VOICE, ONE MISSION" />
        </p>

        <h1
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 900,
            fontSize: "clamp(40px, 7vw, 76px)",
            lineHeight: 1.08,
            letterSpacing: "-2px",
            margin: "0 0 24px",
            color: C.accent,
          }}
        >
          <AnimatedWords text="A Safer India for Women" />
        </h1>

        <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "clamp(17px,2.2vw,22px)", color: "rgba(255,235,238,0.9)", marginBottom: 18 }}>
          Don&apos;t just hope for change,{" "}
          <span style={{ color: C.highlight }}>be the change.</span>
        </p>

        <p style={{ fontSize: 15.5, color: C.textSecondary, lineHeight: 1.75, maxWidth: 640, margin: "0 auto 40px" }}>
          RakshaNet is a pan-India collaborative movement with one mission: a nation
          where every woman is safe. Together, we&apos;re building a unified community
          so no woman is ever left without help — turning distress into safety, and
          keeping support always within reach.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/auth/login" className="btn-primary-pill">
            Join the Movement
          </Link>
          <a href="#our-impact" className="btn-ghost-pill">
            See Our Impact
          </a>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   INITIATIVES — with imagery
═══════════════════════════════════════════════ */
function Initiatives() {
  const items = [
    {
      icon: Shield,
      title: "SilentShield Rollout",
      desc: "Bringing on-device distress detection to every state, free for anyone who needs it.",
      image: "/media/hero/hero-5.jpg",
      roadmap: false,
    },
    {
      icon: MapPinned,
      title: "SafeRoute Coverage",
      desc: "Expanding risk-scored route data to 50+ cities with local safe-spot mapping.",
      image: "/media/hero/hero-6.jpg",
      roadmap: false,
    },
    {
      icon: Radio,
      title: "Verified Responder Network",
      desc: "Training and vetting community responders across every district we serve.",
      image: "/media/hero/hero-7.jpg",
      roadmap: false,
    },
    {
      icon: BookOpen,
      title: "Safety Education Into School Curriculum",
      desc: "Partnering with state boards to bring practical safety literacy into classrooms.",
      image: "/media/hero/hero-8.jpg",
      roadmap: true,
    },
    {
      icon: Users,
      title: "Annual Safety Recognition Awards",
      desc: "Honoring communities, officers, and volunteers driving real change on the ground.",
      image: "/media/hero/hero-9.jpg",
      roadmap: true,
    },
  ];

  return (
    <section id="initiatives" style={{ position: "relative", padding: "110px 24px", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, overflow: "hidden" }}>
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.25,
          mixBlendMode: "screen",
        }}
      >
        <source src="/media/hero/heroloop-1.mp4.mp4" type="video/mp4" />
      </video>

      {/* Dark Overlay for better contrast */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(10,0,0,0.9), rgba(10,0,0,0.8))" }} />

      {/* Content wrapper */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: 1180, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(32px,4vw,48px)", color: C.accent, marginBottom: 16, letterSpacing: "-1px" }}>
          Our Initiatives
        </h2>
        <p style={{ color: C.textSecondary, fontSize: 15.5, maxWidth: 620, margin: "0 auto 56px", lineHeight: 1.7 }}>
          To empower communities, engage key stakeholders, and drive actionable change
          to create a safer environment for women across India.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, textAlign: "left" }}>
          {items.map((it) => (
            <div key={it.title} className="initiative-card">
              <div className="initiative-card-img" style={{ backgroundImage: `url(${it.image})` }} />
              <div className="initiative-card-body">
                {it.roadmap && <span className="roadmap-tag">Future Roadmap</span>}
                <div className="initiative-icon">
                  <it.icon size={22} color={C.accent} />
                </div>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 17, color: "white", margin: "14px 0 10px" }}>
                  {it.title}
                </h3>
                <p style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.65, marginBottom: 16 }}>{it.desc}</p>
                <div className="initiative-arrow">
                  <ChevronRight size={15} color={C.accent} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   PLEDGE CTA — Let's Act for Women's Safety
═══════════════════════════════════════════════ */
function Pledge() {
  return (
    <section
      id="get-involved"
      style={{
        position: "relative",
        padding: "140px 24px",
        textAlign: "center",
        overflow: "hidden",
        backgroundImage: `linear-gradient(180deg, rgba(10,0,0,0.7), rgba(10,0,0,0.9)), url(${ASSETS.pledgeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundColor: "#150005",
      }}
    >
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.3,
          zIndex: 0,
          mixBlendMode: "screen",
        }}
        onError={(e) => {
          (e.currentTarget as HTMLVideoElement).style.display = "none";
        }}
      >
        <source src={ASSETS.heroVideo} type="video/mp4" />
      </video>

      <div style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(32px,5vw,54px)", color: "white", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 22 }}>
          Let&apos;s Act for Women&apos;s Safety. Together.
        </h2>
        <p style={{ fontSize: 16.5, color: "rgba(255,220,225,0.85)", lineHeight: 1.7, marginBottom: 40, maxWidth: 640, margin: "0 auto 40px" }}>
          Commit to being an active part of the solution. Your pledge is a promise to
          stand for safety, respect, and equality across every street and home in India.
        </p>
        <Link href="/auth/login" className="btn-primary-pill">
          Join the Movement
        </Link>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   UN SDGs
═══════════════════════════════════════════════ */
function SDGs() {
  const goals = [
    { n: 3, label: "Good Health and Well-Being", color: "#4C9F38", Icon: HeartPulse },
    { n: 4, label: "Quality Education", color: "#C5192D", Icon: BookOpen },
    { n: 5, label: "Gender Equality", color: "#FF3A21", Icon: Equal },
    { n: 11, label: "Sustainable Cities and Communities", color: "#FD9D24", Icon: Building2 },
    { n: 16, label: "Peace, Justice and Strong Institutions", color: "#00689D", Icon: Gavel },
    { n: 17, label: "Partnerships for the Goals", color: "#19486A", Icon: Handshake },
  ];

  return (
    <section id="our-impact" style={{ position: "relative", padding: "110px 24px", overflow: "hidden", background: "#060002" }}>
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.22,
          zIndex: 0,
          filter: "contrast(1.1) brightness(0.6)",
        }}
        onError={(e) => {
          (e.currentTarget as HTMLVideoElement).style.display = "none";
        }}
      >
        <source src={ASSETS.heroVideo} type="video/mp4" />
      </video>

      {/* Dark scrim overlay for SDG card readability */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(10,0,0,0.6) 0%, rgba(10,0,0,0.92) 100%)" }} />

      <div style={{ position: "relative", zIndex: 2, maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "0.15em", color: "white", marginBottom: 8 }}>
          ALIGNED WITH <span style={{ color: C.accent }}>UN SDGs</span>
        </p>
        <p style={{ color: C.textSecondary, fontSize: 13.5, marginBottom: 48 }}>
          Sustainable Development Goals
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
          {goals.map((g) => (
            <div key={g.n} className="sdg-card" style={{ background: g.color }}>
              <g.Icon size={26} color="white" />
              <span className="sdg-num">{g.n}</span>
              <span className="sdg-label">{g.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        {/* Brand Column */}
        <div>
          <img
            src="/logo.png"
            alt="Safety for Women - RakshaNet"
            style={{ height: 50, width: "auto", objectFit: "contain", marginBottom: 16 }}
          />
          <p style={{ fontSize: 13.5, color: "rgba(240,244,255,0.5)", lineHeight: 1.6, maxWidth: 300 }}>
            Pan-India privacy-first AI safety network protecting women across every city and district.
          </p>
        </div>

        {/* Column 2: INITIATIVES */}
        <div>
          <div className="footer-col-title">Initiatives</div>
          <ul className="footer-col-links">
            <li><a href="#initiatives">SilentShield Rollout</a></li>
            <li><a href="#initiatives">SafeRoute Coverage</a></li>
            <li><a href="#initiatives">Responder Network</a></li>
            <li><a href="#initiatives">Safety Education</a></li>
            <li><a href="#initiatives">Recognition Awards</a></li>
          </ul>
        </div>

        {/* Column 3: SOCIALS */}
        <div>
          <div className="footer-col-title">Socials</div>
          <ul className="footer-col-links">
            <li><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a></li>
            <li><a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a></li>
            <li><a href="https://twitter.com" target="_blank" rel="noreferrer">Twitter / X</a></li>
            <li><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a></li>
          </ul>
        </div>

        {/* Column 4: LEGAL */}
        <div>
          <div className="footer-col-title">Legal</div>
          <ul className="footer-col-links">
            <li><a href="#">Terms of Use</a></li>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Cookie Policy</a></li>
            <li><a href="tel:112" style={{ color: "#FF0033", fontWeight: 700 }}>Emergency Call 112</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom-bar">
        <span>© 2025 RakshaNet — One Voice, One Mission. All rights reserved.</span>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════
   SMOKE CURSOR EFFECT
═══════════════════════════════════════════════ */
function SmokeCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // We only want this on desktop ideally, or just listen to mousemove.
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", handleResize);

    const particles: { x: number; y: number; size: number; maxLife: number; life: number; vx: number; vy: number; color: string }[] = [];

    const colors = [
      "rgba(255, 0, 51, 0.18)",   // Brand Red
      "rgba(200, 20, 50, 0.12)",  // Deep Crimson
      "rgba(80, 80, 80, 0.1)"     // Ash
    ];

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      const spawnCount = Math.random() > 0.4 ? 2 : 1;
      for(let i = 0; i < spawnCount; i++) {
        particles.push({
          x: mouseX + (Math.random() - 0.5) * 30,
          y: mouseY + (Math.random() - 0.5) * 30,
          size: Math.random() * 25 + 15,
          maxLife: Math.random() * 50 + 40,
          life: 0,
          vx: (Math.random() - 0.5) * 0.8,
          vy: Math.random() * -1.5 - 0.5,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.size += 0.4;

        const progress = p.life / p.maxLife;
        if (progress >= 1) {
          particles.splice(i, 1);
          i--;
          continue;
        }

        const alpha = 1 - Math.pow(progress, 2); 
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = "screen";
        
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}

/* ═══════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════ */
export default function MovementPage() {
  return (
    <div suppressHydrationWarning>
      <SmokeCursor />
      <Nav />
      <Hero />
      <Initiatives />
      <Pledge />
      <SDGs />
      <Footer />
      {/* Global Chat Widget — floats over entire page */}
      <ChatWidget />
    </div>
  );
}