<div align="center">

<br/>

<img src="https://img.shields.io/badge/RAKSHANET-SilentShield-FF2D6B?style=for-the-badge&logo=shield&logoColor=white" alt="RakshaNet" />

<br/><br/>

```
██████╗  █████╗ ██╗  ██╗███████╗██╗  ██╗ █████╗ ███╗   ██╗███████╗████████╗
██╔══██╗██╔══██╗██║ ██╔╝██╔════╝██║  ██║██╔══██╗████╗  ██║██╔════╝╚══██╔══╝
██████╔╝███████║█████╔╝ ███████╗███████║███████║██╔██╗ ██║█████╗     ██║   
██╔══██╗██╔══██║██╔═██╗ ╚════██║██╔══██║██╔══██║██║╚██╗██║██╔══╝     ██║   
██║  ██║██║  ██║██║  ██╗███████║██║  ██║██║  ██║██║ ╚████║███████╗   ██║   
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   
```

### 🛡️ **Protection. Not Surveillance.**

**AI-Powered Personal Safety Network for Women — Real-Time Risk Scoring, Silent SOS & Trusted Responder Ecosystem**

<br/>

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.io)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-FF0055?style=for-the-badge&logo=framer&logoColor=white)](https://framer.com/motion)
[![Google Maps](https://img.shields.io/badge/Google_Maps-4285F4?style=for-the-badge&logo=google-maps&logoColor=white)](https://developers.google.com/maps)
[![Vonage](https://img.shields.io/badge/Vonage_SMS-000000?style=for-the-badge&logo=vonage&logoColor=white)](https://vonage.com)
[![Leaflet](https://img.shields.io/badge/Leaflet.js-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

<br/>

![Status](https://img.shields.io/badge/Status-Production_Ready-00FFA3?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-FF8C42?style=flat-square)
![Version](https://img.shields.io/badge/Version-1.0.0-7B61FF?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Web_PWA-00E5FF?style=flat-square)
![Hackathon](https://img.shields.io/badge/Hackathon-Winner_Track-FFD700?style=flat-square&logo=trophy)

</div>

---

<div align="center">

## 🌟 What is RakshaNet?

</div>

> **RakshaNet SilentShield** is an advanced AI-powered personal safety platform designed specifically for women. It combines real-time biometric sensor fusion, audio anomaly detection, motion analysis, GPS route tracking, and a rule-based **Raksha Risk Score Engine** to proactively detect danger — and automatically escalate to trusted contacts, emergency services, and nearby community helpers without requiring the user to take any action.

**The core philosophy:** *The app acts for you when you cannot act for yourself.*

---

<div align="center">

## 🎯 Key Features

</div>

<table>
<tr>
<td width="50%" valign="top">

### 🔴 Raksha Risk Score Engine
- Rule-based additive distress scoring (0–87)
- 4-factor fusion: Audio + Motion + Route + Time
- 4 escalation levels with automated actions
- Real-time recalculation every 2 seconds

### 🎙️ Audio Anomaly Detection
- Web Audio API microphone monitoring
- Scream/cry detection via frequency spikes
- Real-time dB visualizer in the widget
- Background passive monitoring

### 📡 Motion Anomaly Detection
- DeviceMotion API accelerometer fusion
- Sudden jerk/struggle detection
- Continuous background monitoring
- Auto-reset after anomaly clears

</td>
<td width="50%" valign="top">

### 🗺️ Safe Route Intelligence
- Google Maps + Leaflet dual-engine routing
- Live GPS location tracking
- Route deviation monitoring
- Haversine distance calculations

### 💬 AI Safety Companion (Chat)
- Context-aware AI assistant
- Distress-score-aware responses
- Natural language emergency commands
- Location-informed advice

### 🔐 Privacy-First Design
- End-to-end encrypted incident logs
- No background surveillance
- Evidence vault for recordings
- Local processing where possible

</td>
</tr>
</table>

---

<div align="center">

## 🧠 Raksha Risk Score — System Architecture

</div>

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RAKSHA RISK SCORE ENGINE v1                          │
│                    Rule-Based Additive Distress Scoring                     │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌──────────────┐
  │  🎙️ AUDIO INPUT │   │  📳 MOTION INPUT │   │  📍 ROUTE INPUT  │   │ ⏰ TIME INPUT │
  │                 │   │                 │   │                 │   │              │
  │ Web Audio API   │   │ DeviceMotion    │   │ GPS Coordinates  │   │ Hour of Day  │
  │ Frequency FFT   │   │ Accelerometer   │   │ Location History │   │ 0-23 (local) │
  │ Scream/cry det. │   │ Jerk detection  │   │ Known locations  │   │              │
  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘   └──────┬───────┘
           │                     │                     │                   │
           ▼                     ▼                     ▼                   ▼
  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌──────────────┐
  │  computeAudio   │   │  computeMotion  │   │ computeRoute    │   │ computeTime  │
  │  Score()        │   │  Score()        │   │ RiskScore()     │   │ Context()    │
  │                 │   │                 │   │                 │   │              │
  │  0  → Safe      │   │  0  → Normal    │   │  0-18 (scaled   │   │  0  → Day    │
  │  35 → Anomaly   │   │  20 → Anomaly   │   │  via location   │   │  7  → Evng   │
  │                 │   │                 │   │  + deviation)   │   │  14 → Night  │
  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘   └──────┬───────┘
           │ MAX: 35              │ MAX: 20              │ MAX: 18           │ MAX: 14
           │                     │                     │                   │
           └──────────────────── ▼ ─────────────────── ▼ ──────────────────┘
                                 │         +           │
                        ┌────────▼─────────────────────▼────────┐
                        │                                       │
                        │  TOTAL = Audio + Motion + Route + Time │
                        │  MAX SCORE = 87 points                 │
                        │  User Trigger → Instantly = 87 (CRIT) │
                        │                                       │
                        └────────────────┬──────────────────────┘
                                         │
                                         ▼
                        ┌────────────────────────────────────────┐
                        │         RAKSHA LEVEL MAPPER            │
                        │                                        │
                        │  Score  0     → SAFE      (Level 0)   │
                        │  Score  1–29  → SUSPICIOUS (Level 1)  │
                        │  Score 30–54  → HIGH_RISK  (Level 2)  │
                        │  Score 55–74  → CONFIRMED  (Level 3)  │
                        │  Score 75–87  → CRITICAL   (Level 4)  │
                        │                                        │
                        └────────────────┬───────────────────────┘
                                         │
                              ┌──────────┴──────────┐
                              │  LEVEL ACTION ENGINE │
                              └──────────┬──────────┘
                                         │
          ┌──────────────┬───────────────┼────────────────┬──────────────────┐
          │              │               │                │                  │
          ▼              ▼               ▼                ▼                  ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐    ┌──────────┐       ┌──────────┐
    │ LEVEL 0  │   │ LEVEL 1  │   │ LEVEL 2  │    │ LEVEL 3  │       │ LEVEL 4  │
    │   SAFE   │   │SUSPICIOUS│   │HIGH RISK │    │CONFIRMED │       │CRITICAL  │
    │          │   │          │   │          │    │          │       │          │
    │ Monitor  │   │ Display  │   │ Silent   │    │ Auto-SOS │       │ Police + │
    │ Only     │   │ Warning  │   │ Check-In │    │ + Trusted│       │ Peer Net │
    │          │   │ No Alert │   │ Modal    │    │ Contact  │       │ Broadcast│
    └──────────┘   └──────────┘   └──────────┘    └──────────┘       └──────────┘
                                       │                │                  │
                                  60s timeout      SMS + WhatsApp    All Contacts +
                                  → auto L3        + Location        PCR Dispatch
```

---

<div align="center">

## 🚨 The 4 Risk Levels Explained

</div>

### 🟡 Level 1 — Suspicious `(Score: 1–29)`

> Mild anomaly detected. Monitoring is elevated but no user interruption occurs.

- **Trigger**: Any single signal fires (e.g. only audio OR only night-time context)
- **Action**: Display-only warning in the Raksha Risk Widget
- **User Experience**: Widget badge turns amber — no alerts sent, no interruptions
- **Score Contributions**: Typically single-factor (e.g. Audio: 35 alone = Suspicious)

---

### 🟠 Level 2 — High Risk `(Score: 30–54)` — *Silent Check-In*

> Multiple risk signals active. A silent, non-intrusive check-in is sent to the user.

- **Trigger**: At least 2 signals active simultaneously (e.g. Audio + Motion = 55 → actually Level 3, so L2 typically needs combined route/time signals)
- **Action**: A fullscreen modal appears asking **"Are you safe?"** with Yes / No options
- **Timer**: 60-second auto-escalation countdown — no response = escalates to Level 3
- **If "Yes"**: All anomalies cleared, score reset to 0
- **If "No"**: Immediately fires Level 3 actions

```
┌─────────────────────────────────────────┐
│         ⚠️  ARE YOU SAFE?               │
│                                         │
│   RakshaNet detected elevated risk      │
│   Raksha Risk Score: 42                 │
│                                         │
│   ⏱️ Auto-escalating in 58s             │
│                                         │
│  ✅ Yes, I'm Safe  │  🆘 No, Help Me   │
└─────────────────────────────────────────┘
```

---

### 🔴 Level 3 — Confirmed Risk `(Score: 55–74)` — *Auto-SOS*

> High confidence distress. **SOS is automatically initiated** — no user action needed.

- **Trigger**: Score 55+ OR user taps "No, Help Me" on L2 modal
- **Actions Fired Automatically**:
  1. 📱 **Emergency SMS** sent to primary trusted contact via Vonage SMS API
  2. 💬 **WhatsApp deep-link** opened with pre-written emergency message
  3. 📋 **Incident record** created in Supabase with GPS coordinates
  4. 🔔 **In-app notification** shows SMS delivery confirmation

**SMS Message Template:**
```
🆘 EMERGENCY ALERT — RakshaNet SilentShield

[User's Full Name] is in a danger situation and needs help.

Please check on them immediately — call or go to their location.

📍 Current location: [Address]
🗺️ Navigate: https://maps.google.com/?q=[lat],[lng]

Sent automatically by RakshaNet SilentShield — AI Safety Network.
```

---

### 🆘 Level 4 — Critical Emergency `(Score: 75–87)` — *Full Escalation*

> Maximum threat. **Police PCR unit notified + entire peer network broadcast.**

- **Trigger**: Score 75+ OR manual SOS press (instantly reaches 87)
- **Actions Fired Automatically**:
  1. 🚔 **PCR Unit dispatch** logged with reference number (e.g. `PCR-M4X7-3291`)
  2. 📱 **ALL trusted contacts** receive Critical SMS (parallel Vonage calls)
  3. 💬 **WhatsApp blast** to every contact with CRITICAL message + live maps link
  4. 📡 **Peer network broadcast** — all nearby RakshaNet users within 3km notified
  5. 🔔 **Toast alert** shown to peer helpers asking "Someone needs help — can you assist?"

**Critical SMS Message:**
```
🆘 CRITICAL EMERGENCY — RakshaNet SilentShield

[User's Full Name] is in a danger situation and needs URGENT help immediately!

This is a critical alert. Please reach them RIGHT NOW or call emergency services.

📍 Last known location: [Address]
🗺️ Navigate: https://maps.google.com/?q=[lat],[lng]

Emergency services have been automatically notified.
Sent by RakshaNet SilentShield — AI Safety Network.
```

---

<div align="center">

## 🏗️ System Architecture

</div>

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         RAKSHANET SYSTEM ARCHITECTURE                        │
└──────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────────┐
                              │    USER'S BROWSER    │
                              │   Next.js 16 + React │
                              └──────────┬──────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
    ┌─────────▼──────────┐  ┌────────────▼───────────┐  ┌──────────▼──────────┐
    │  CLIENT LAYER       │  │    CONTEXT LAYER        │  │   SENSOR LAYER      │
    │                     │  │                         │  │                     │
    │ app/page.tsx        │  │ LocationContext.tsx      │  │ audioAnalyzer.ts    │
    │ dashboard/layout    │  │ RakshaScoreContext.tsx   │  │ motionAnalyzer.ts   │
    │ dashboard/page      │  │ NotificationContext.tsx  │  │ Web Audio API       │
    │ safety, profile,    │  │ ThemeContext.tsx          │  │ DeviceMotion API    │
    │ command, vault,     │  │ LanguageContext.tsx       │  │ Geolocation API     │
    │ saferoute, metrics  │  │                         │  │                     │
    └─────────┬──────────┘  └────────────┬───────────┘  └──────────┬──────────┘
              │                          │                          │
              └──────────────────────────▼──────────────────────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  RAKSHA RISK ENGINE  │
                              │                      │
                              │ rakshaRiskScore.ts   │
                              │ engine.ts            │
                              │ audioAnalyzer.ts     │
                              │ motionAnalyzer.ts    │
                              └──────────┬──────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
    ┌─────────▼──────────┐  ┌────────────▼───────────┐  ┌──────────▼──────────┐
    │   NEXT.JS API       │  │      SUPABASE           │  │   EXTERNAL APIs     │
    │   ROUTES            │  │   (Backend-as-a-Service)│  │                     │
    │                     │  │                         │  │ 📱 Vonage SMS API   │
    │ /api/trusted-alert  │  │ • profiles              │  │ 🗺️ Google Maps API  │
    │   POST → L3 SMS     │  │ • trusted_contacts      │  │ 💬 WhatsApp wa.me   │
    │   PUT  → L4 CRIT    │  │ • incidents             │  │ 🌍 Geocoding API    │
    │   GET  → history    │  │ • trusted_contact_alerts│  │                     │
    │                     │  │ • police_alerts         │  │                     │
    │ /api/peer-alert     │  │ • peer_alerts           │  │                     │
    │   POST → broadcast  │  │ • vault_items           │  │                     │
    │   PATCH → respond   │  │                         │  │                     │
    │                     │  │ Realtime Subscriptions  │  │                     │
    │ /api/chat           │  │ Row Level Security      │  │                     │
    │ /api/geocode        │  │ Auth (Email/OAuth)       │  │                     │
    │ /api/vault          │  │                         │  │                     │
    └────────────────────┘  └────────────────────────┘  └────────────────────┘
```

---

<div align="center">

## 🔄 Data & Signal Flow

</div>

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REAL-TIME SIGNAL FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

   EVERY 2 SECONDS:
   ─────────────────────────────────────────────────────────────────────────►

   [Mic]──────► AudioAnomalyAnalyzer ──────► audioScore (0 | 35)
                   FFT Analysis                    │
                   Scream/High-freq                │
                                                   │
   [Accel]────► MotionAnomalyAnalyzer ────► motionScore (0 | 20)
                   Jerk Detection                  │
                   G-force threshold               │
                                                   │            computeRakshaRiskScore()
   [GPS]──────► LocationContext ─────────► routeRiskScore (0–18) ──────► TOTAL ──► LEVEL
                   Haversine math                  │
                   SafeZone check                  │
                                                   │
   [Clock]────► computeTimeContext() ────► timeContextScore (0|7|14)
                   Hour 22-04: 14pts                │
                   Hour 20-06: 7pts                 │
                   Daytime: 0pts                    │

   ─────────────────────────────────────────────────────────────────────────►
   TOTAL SCORE → LEVEL RESOLVER → ACTION ENGINE → UI + NOTIFICATIONS + SMS
```

---

<div align="center">

## 📁 Project Structure

</div>

```
rakshanet/
├── app/
│   ├── api/
│   │   ├── chat/           # AI companion API (context-aware)
│   │   ├── geocode/        # Address-to-coords + reverse geocode
│   │   ├── peer-alert/     # Community broadcast API
│   │   ├── trusted-alert/  # L3/L4 SMS + WhatsApp alert API
│   │   └── vault/          # Evidence vault CRUD
│   ├── auth/               # Login / sign-up pages (Supabase Auth)
│   ├── components/
│   │   ├── AmbientLayer.tsx        # Atmospheric background FX
│   │   ├── ChatWidget.tsx          # AI safety companion chat
│   │   ├── CheckInModal.tsx        # Level 2 silent check-in modal
│   │   ├── MapPicker.tsx           # Location picker (Google Maps/Leaflet)
│   │   ├── NotificationDropdown.tsx # In-app notification center
│   │   ├── ProfileDropdown.tsx     # Theme, language, profile
│   │   ├── RakshaRiskWidget.tsx    # 🔑 Floating risk score widget
│   │   ├── ThemeScript.tsx         # SSR-safe theme initialization
│   │   └── ThemeToggle.tsx         # Dark/light theme toggle
│   ├── context/
│   │   ├── LanguageContext.tsx     # i18n (EN/HI/TA/BN/TE/MR/PA)
│   │   ├── LocationContext.tsx     # GPS + distress engine
│   │   ├── NotificationContext.tsx # In-app notifications
│   │   ├── RakshaScoreContext.tsx  # 🔑 Global risk score provider
│   │   └── ThemeContext.tsx        # Theme preference
│   ├── dashboard/
│   │   ├── layout.tsx      # 🔑 Main authenticated layout
│   │   ├── page.tsx        # Command dashboard home
│   │   ├── command/        # Incident management center
│   │   ├── metrics/        # Impact & analytics
│   │   ├── profile/        # Safety profile configuration
│   │   ├── saferoute/      # Route planner & community map
│   │   ├── safety/         # Silent SOS & manual trigger
│   │   └── vault/          # Encrypted evidence storage
│   ├── globals.css         # Design system tokens + global styles
│   ├── layout.tsx          # Root HTML layout
│   └── page.tsx            # Landing page (animated shield)
├── lib/
│   ├── distress/
│   │   ├── audioAnalyzer.ts    # 🔑 Web Audio API FFT analysis
│   │   ├── engine.ts           # 🔑 Base distress score engine
│   │   ├── motionAnalyzer.ts   # 🔑 DeviceMotion jerk detection
│   │   └── rakshaRiskScore.ts  # 🔑 Rule-based fusion scoring
│   ├── location/
│   │   └── history.ts          # GPS path analysis, haversine, speed
│   └── supabase/
│       ├── client.ts           # Browser Supabase client
│       └── server.ts           # Server-side Supabase client
├── messages/               # i18n JSON (7 languages)
├── public/                 # Static assets (logo, icons)
└── supabase/               # DB migrations & schema
```

---

<div align="center">

## 🚀 Getting Started

</div>

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | `≥ 20` | Runtime |
| npm / pnpm | `≥ 10` | Package manager |
| Supabase account | — | Database + Auth |
| Vonage account | — | SMS delivery |
| Google Maps API key | — | Maps & geocoding |

### 1. Clone & Install

```bash
git clone https://github.com/your-org/rakshanet.git
cd rakshanet
npm install
```

### 2. Configure Environment

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Google Maps (for routing + geocoding)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Vonage SMS (for Level 3 & 4 alerts)
VONAGE_API_KEY=your_vonage_api_key
VONAGE_API_SECRET=your_vonage_api_secret

# AI Chat (for AI safety companion)
OPENAI_API_KEY=sk-your_openai_key
```

### 3. Database Setup

Run the Supabase migrations:

```bash
# Create required tables
supabase db push
# Or paste the schema from /supabase/migrations/
```

**Required Tables:**

| Table | Purpose |
|-------|---------|
| `profiles` | User profile, home/work locations, helper availability |
| `trusted_contacts` | Emergency contacts with phone numbers |
| `incidents` | Auto-created SOS incident records |
| `trusted_contact_alerts` | Log of all SMS/WhatsApp alerts sent |
| `police_alerts` | PCR dispatch records with reference numbers |
| `peer_alerts` | Community helper broadcast records |
| `vault_items` | Encrypted evidence files |

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

<div align="center">

## 🧬 Tech Stack Deep Dive

</div>

| Layer | Technology | Why We Chose It |
|-------|-----------|-----------------|
| **Framework** | Next.js 16 (App Router) | Server components, API routes, ISR caching |
| **UI Library** | React 19 | Concurrent features, useTransition for smooth UX |
| **Language** | TypeScript 5 | Type-safe distress score interfaces & engine contracts |
| **Styling** | Tailwind CSS v4 + Vanilla CSS | Design token system, glassmorphism, dark theme |
| **Animation** | Framer Motion 13 | Physics-based springs, AnimatePresence for modals |
| **Database** | Supabase (PostgreSQL) | Realtime subscriptions for peer alerts, RLS security |
| **Auth** | Supabase Auth | Email + OAuth, session cookies, SSR-compatible |
| **SMS** | Vonage API | Reliable delivery to Indian numbers, E.164 format |
| **Maps** | Google Maps + Leaflet.js | Dual-engine: API routing + open-source fallback |
| **Icons** | Lucide React | Consistent icon system, tree-shakeable |
| **Audio** | Web Audio API (native) | FFT frequency analysis, no external dependency |
| **Motion** | DeviceMotion API (native) | Accelerometer access, jerk threshold detection |
| **i18n** | Custom LanguageContext | 7 languages: EN, HI, TA, BN, TE, MR, PA |
| **Deployment** | Vercel | Edge network, automatic HTTPS, preview deployments |

---

<div align="center">

## 🌐 Page Overview

</div>

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Animated shield hero, feature showcase |
| `/auth/login` | Login | Email + OAuth sign in |
| `/auth/signup` | Sign Up | Account creation with location setup |
| `/dashboard` | Command Center | Live distress score, incident log, GPS map |
| `/dashboard/safety` | Silent SOS | Manual trigger, audio monitor controls |
| `/dashboard/profile` | Safety Profile | Trusted contacts, safe zones, home/work config |
| `/dashboard/command` | Command Center | Full incident management, AI analysis |
| `/dashboard/vault` | Evidence Vault | Encrypted audio/photo recordings |
| `/dashboard/saferoute` | Safe Route | Route planning, community safety map |
| `/dashboard/metrics` | Metrics | Impact stats, incident analytics |

---

<div align="center">

## 🔐 Security & Privacy

</div>

```
┌─────────────────────────────────────────────────────────────┐
│                     PRIVACY ARCHITECTURE                     │
│                                                             │
│  ✅ Row Level Security — users only see their own data      │
│  ✅ Audio processed locally — no audio sent to servers      │
│  ✅ GPS history stored only on-device during session        │
│  ✅ Vault files encrypted before Supabase Storage upload    │
│  ✅ No passive surveillance — sensors activate on request   │
│  ✅ Supabase Auth — JWT sessions, no plaintext passwords    │
│  ✅ HTTPS enforced — all API calls over TLS 1.3             │
│  ✅ No third-party tracking or analytics SDK                │
└─────────────────────────────────────────────────────────────┘
```

---

<div align="center">

## 🌍 Multi-Language Support

</div>

RakshaNet speaks the same language as its users. Full UI translation across:

| Language | Code | Coverage |
|----------|------|----------|
| 🇬🇧 English | `en` | 100% |
| 🇮🇳 Hindi | `hi` | 100% |
| 🇮🇳 Tamil | `ta` | 100% |
| 🇮🇳 Bengali | `bn` | 100% |
| 🇮🇳 Telugu | `te` | 100% |
| 🇮🇳 Marathi | `mr` | 100% |
| 🇮🇳 Punjabi | `pa` | 100% |

Language preference is persisted in Supabase profile so it syncs across devices.

---

<div align="center">

## 🤝 Community Safety Network

</div>

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PEER ALERT BROADCAST SYSTEM                       │
│                                                                     │
│  When Level 4 CRITICAL triggers:                                    │
│                                                                     │
│   [User in Distress]                                                │
│         │                                                           │
│         │ POST /api/peer-alert (radius: 3km)                       │
│         │                                                           │
│         ├──► [Helper A, 0.4km] ──► Realtime toast: "Help needed"  │
│         ├──► [Helper B, 1.2km] ──► Realtime toast: "Help needed"  │
│         └──► [Helper C, 2.8km] ──► Realtime toast: "Help needed"  │
│                                                                     │
│   Helpers see: Distance, message, "View & Respond" CTA             │
│   Helper data: opt-in `helper_availability` flag in profile        │
│                                                                     │
│   Powered by: Supabase Realtime postgres_changes subscription      │
└─────────────────────────────────────────────────────────────────────┘
```

---

<div align="center">

## 📊 Raksha Risk Score Quick Reference

</div>

```
  SCORE  │  LEVEL          │  COLOR   │  ACTION
─────────┼─────────────────┼──────────┼─────────────────────────────────────
  0      │  SAFE           │  🟢 Green│  Monitor only
  1–29   │  SUSPICIOUS     │  🟡 Amber│  Widget warning — no alert
  30–54  │  HIGH RISK      │  🟠 Orange│  Silent check-in modal (60s timer)
  55–74  │  CONFIRMED RISK │  🔴 Red  │  Auto-SOS + Trusted contact SMS
  75–87  │  CRITICAL       │  ⚫ Dark │  Police PCR + All contacts + Peers
─────────┼─────────────────┼──────────┼─────────────────────────────────────
  
  FACTOR SCORING:
  ──────────────────────────────────────────────────────
  Audio Anomaly (scream/distress detected)  →  +35 pts
  Sudden Motion (jerk/struggle detected)    →  +20 pts
  Route Risk (off-route / unknown area)     →  +0 to +18 pts
  Time & Context (night = 10pm–4am)         →  +0 | +7 | +14 pts
  User Manual SOS Trigger                   →  → 87 (instant CRITICAL)
  ──────────────────────────────────────────────────────
  MAX TOTAL SCORE                           =  87 pts
```

---

<div align="center">

## 🏆 Why RakshaNet Wins

</div>

| Challenge | Our Solution |
|-----------|-------------|
| **"I can't press SOS in danger"** | Automatic escalation via sensor fusion — no user action needed |
| **"False alarms waste responders"** | 4-tier graduated system: warning → check-in → SOS → emergency |
| **"Trusted contacts don't know where I am"** | Live Google Maps link + address in every SMS |
| **"Police take time, no one else can help"** | Peer broadcast notifies nearby RakshaNet users instantly |
| **"I'm scared, I don't know what to say"** | AI companion knows your distress score and guides you |
| **"It'll drain my battery"** | Sensors are opt-in; only GPS is always-on (browser native) |
| **"I don't trust apps with my data"** | All audio processed locally, RLS enforced, no third-party tracking |

---

<div align="center">

## 📱 Screenshots & Demo

</div>

> *The Obsidian HoloShield UI — a dark, translucent glassmorphic command center designed for clarity under pressure.*

```
┌──────────────────────────────────────────────────────┐
│  🛡️ RAKSHANET COMMAND CENTER          [Live Demo]    │
│  ─────────────────────────────────────────────────── │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  RAKSHA RISK SCORE              Score: 0 / 87   │ │
│  │  ████████████░░░░░░░░  SAFE                     │ │
│  │  Audio ──── 0/35 ░░░░░░░░░░░░░                  │ │
│  │  Motion ─── 0/20 ░░░░░░░░░░░░░                  │ │
│  │  Route ──── 0/18 ░░░░░░░░░░░░░                  │ │
│  │  Context ── 0/14 ░░░░░░░░░░░░░                  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  📍 Current Location: India Gate, New Delhi          │
│  🕐 Time: 11:32 PM  ⚠️ Night context active          │
│                                                      │
│  [🎙️ Start Audio]  [🆘 Emergency SOS]  [🗺️ Route]   │
└──────────────────────────────────────────────────────┘
```

---

<div align="center">

## 📜 License

</div>

MIT License — Built with ❤️ for women's safety across India.

RakshaNet is open-source and free to use, modify, and deploy. If you build on this, please pay it forward — add features, fix bugs, or support women's safety NGOs.

---

<div align="center">

## 👥 Team

</div>

<div align="center">

**Built at Hackathon 2026** — *"Technology in service of safety, dignity, and freedom."*

<br/>

```
प्रोटेक्शन, निगरानी नहीं।
Protection. Not Surveillance.
```

<br/>

[![Made with ❤️](https://img.shields.io/badge/Made_with-❤️_for_Safety-FF2D6B?style=for-the-badge)](https://github.com)
[![India](https://img.shields.io/badge/Built_in-🇮🇳_India-FF9933?style=for-the-badge)](https://github.com)

</div>

---

<div align="center">
<sub>RakshaNet SilentShield v1.0 · Next.js 16 · React 19 · Supabase · Vonage · Google Maps · Framer Motion</sub>
</div>
