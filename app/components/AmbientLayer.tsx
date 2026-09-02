"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function AmbientLayer() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!mounted) return null;

  // Reduced particle count on mobile for performance
  const particleCount = isMobile ? 6 : 12;

  // Circuit SVG path (extremely subtle network overlay)
  const circuitPath = (
    <svg
      width="100%"
      height="100%"
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0.05,
        pointerEvents: "none",
        zIndex: 0,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M -100 200 L 200 200 L 300 400 L 600 400 M 800 150 L 1000 150 L 1200 300 M 400 800 L 500 700 L 900 700"
        stroke="url(#circuit-grad)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="200" cy="200" r="3" fill="url(#circuit-grad)" />
      <circle cx="300" cy="400" r="4" fill="url(#circuit-grad)" />
      <circle cx="600" cy="400" r="3" fill="url(#circuit-grad)" />
      <circle cx="800" cy="150" r="3" fill="url(#circuit-grad)" />
      <circle cx="1000" cy="150" r="4" fill="url(#circuit-grad)" />
      <circle cx="1200" cy="300" r="3" fill="url(#circuit-grad)" />
      <circle cx="400" cy="800" r="3" fill="url(#circuit-grad)" />
      <circle cx="500" cy="700" r="4" fill="url(#circuit-grad)" />
      <circle cx="900" cy="700" r="3" fill="url(#circuit-grad)" />
      
      <defs>
        <linearGradient id="circuit-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#7C5CFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: -1,
        overflow: "hidden",
      }}
    >
      {/* 1. Underlying animated grid with radial mask */}
      <div className="bg-grid" style={{ position: "absolute", inset: 0, opacity: 0.6 }} />

      {/* 2. Atmospheric CSS radial blobs (ambient lighting) */}
      <div
        className="ambient-blob ambient-blob-cyan"
        style={{ width: "60vw", height: "60vh", top: "-10%", left: "-10%" }}
      />
      <div
        className="ambient-blob ambient-blob-violet"
        style={{ width: "50vw", height: "50vh", bottom: "-10%", right: "-10%" }}
      />
      
      {/* 3. Circuit SVG paths */}
      {circuitPath}

      {/* 4. CSS Particles (organic vertical float) */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, opacity: 0.5 }}>
        {Array.from({ length: particleCount }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: Math.random() * 2 + 1 + "px",
              height: Math.random() * 2 + 1 + "px",
              background: i % 3 === 0 ? "#FF304F" : "#00E5FF", // Occasional danger red particle
              borderRadius: "50%",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              boxShadow: `0 0 8px ${i % 3 === 0 ? "#FF304F" : "#00E5FF"}`,
              animation: `particle-float ${15 + Math.random() * 20}s linear infinite`,
              animationDelay: `-${Math.random() * 20}s`,
            }}
          />
        ))}
      </div>

      {/* 5. Extreme subtle scanlines */}
      <div className="scanlines" />
    </div>
  );
}
