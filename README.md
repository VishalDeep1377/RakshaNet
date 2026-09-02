<div align="center">

<img src="./public/github-banner.png" alt="RakshaNet Banner" width="100%" style="width: 100%; height: 350px; object-fit: cover; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 10px 40px rgba(0,229,255,0.2);" />

<a href="https://rakshanet.vercel.app">
  <img src="https://readme-typing-svg.herokuapp.com?font=Orbitron&weight=900&size=40&pause=1000&color=FF2D6B&center=true&vCenter=true&width=800&height=80&lines=RAKSHANET+SILENTSHIELD;AI-POWERED+WOMEN'S+SAFETY;REAL-TIME+RISK+FUSION;PROTECTION.+NOT+SURVEILLANCE." alt="Typing SVG" />
</a>

<br/>
<br/>

[![Next.js](https://img.shields.io/badge/Framework-Next.js_16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/Library-React_19-20232A?style=for-the-badge&logo=react)](https://reactjs.org)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.io)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)

<br/>

**Built at Hackathon 2026 🏆 Winner Track**

<p align="center">
  RakshaNet is an intelligent AI safety ecosystem that actively monitors biometric, motion, audio, and geospatial signals to detect distress. It acts as an invisible shield—automatically initiating SOS protocols when you cannot.
</p>

---

</div>

<br/>

<div align="center">
  <h2>⚡ SUPERCHARGED TECH STACK ⚡</h2>
  <br/>
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,supabase,nodejs,git,github,vscode,vercel&perline=10" />
  </a>
  <br/><br/>
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=figma,googlecloud,postman,framermotion,html,css,js,postgres,bash,npm&perline=10" />
  </a>
</div>

<br/>
<br/>

## 🌟 Intelligent System Architecture

RakshaNet is built on a modular Edge-Ready Architecture leveraging real-time sensor fusion and serverless execution. 

```mermaid
graph TD
    classDef client fill:#060a12,stroke:#00E5FF,stroke-width:2px,color:#fff;
    classDef engine fill:#1A0033,stroke:#B47FFF,stroke-width:2px,color:#fff;
    classDef api fill:#330018,stroke:#FF2D6B,stroke-width:2px,color:#fff;
    classDef external fill:#002233,stroke:#00FFA3,stroke-width:2px,color:#fff;
    classDef db fill:#00331A,stroke:#3ECF8E,stroke-width:2px,color:#fff;

    subgraph User Device Edge 
      A(📱 Device Accelerometer):::client --> |Jerk Data| E
      B(🎙️ Device Microphone):::client --> |FFT Analysis| E
      C(📍 Device GPS Location):::client --> |Lat/Lng Map| E
      D(⏰ System Clock):::client --> |Hour Context| E
    end

    E{🧠 Raksha Risk Engine v1}:::engine

    subgraph Serverless API Gateway
      E --> |Level 2: Warning| F[Alert Modal Module]:::api
      E --> |Level 3: Confirm| G[Trusted Alert Sender]:::api
      E --> |Level 4: Critical| H[Community Peer Broadcast]:::api
    end

    subgraph Integrations
      G --> I[Vonage SMS Service]:::external
      G --> J[WhatsApp Deep Link]:::external
      H --> K[Google Maps Routing]:::external
    end

    subgraph Realtime Cloud Database
      G --> L[(Supabase Main DB)]:::db
      H --> L
      L --> M[Realtime Helper Subscription]:::db
    end
```

<br/>

## 🧮 How the "Raksha Risk Score" Works

The core of the application is a fully deterministic, rule-based additive logic engine that scores physical risk vectors continuously (every 2 seconds).

```mermaid
pie title "Risk Factory Weight Allocations (Max 87 points)"
    "Audio Anomaly (Scream/Crash)" : 35
    "Sudden Motion (Struggle/Fall)" : 20
    "Route/Location Risk" : 18
    "Time of Day Vulnerability" : 14
```

### Flow of Execution

```mermaid
flowchart LR
    classDef audio fill:#FF8C42,stroke:#000,color:#fff;
    classDef motion fill:#B47FFF,stroke:#000,color:#fff;
    classDef route fill:#00E5FF,stroke:#000,color:#fff;
    classDef time fill:#FFBA08,stroke:#000,color:#fff;
    classDef result fill:#FF2D55,stroke:#000,color:#fff;

    A[Audio Input > 0.18 RMS]:::audio --> |+ 35 pt| E(SUM FUSION)
    B[Motion > 22 m/s² Jerk]:::motion --> |+ 20 pt| E
    C[Off-route or Unknown GPS]:::route --> |+ up to 18 pt| E
    D[Night-time Hours 10PM-4AM]:::time --> |+ 14 pt| E
    
    E --> SCORE{TOTAL SCORE}:::result

    SCORE --> |0-29| F(Level 1 - Safe/Sus)
    SCORE --> |30-54| G(Level 2 - High Risk)
    SCORE --> |55-74| H(Level 3 - Auto SOS)
    SCORE --> |75-87| I(Level 4 - Critical)
```

<br/>
<br/>

## 🚨 The 4-Tier Automated Escalation Ladder

RakshaNet is designed to handle false positives gracefully while guaranteeing absolute escalation during genuine life-threatening emergencies, without the user ever clicking a button.

```mermaid
sequenceDiagram
    autonumber
    participant U as App User
    participant E as Risk Engine
    participant C as Trusted Contacts
    participant P as Peer Comm Network
    
    U->>E: Background Signal Uploads
    
    Note over E: Score crosses 40 (LEVEL 2)
    E->>U: Silent Modal: "Are you safe?" (60s timer)
    
    opt If user presses "Safe"
        U->>E: Signal Cleared
        E->>E: Reset Score to 0
    end
    
    opt Timer expires OR user taps "Help Me" OR Score jumps to 60+
        Note over E: Escalated to LEVEL 3
        E->>C: Auto-sends Emergency SMS via Vonage
        E->>C: Push Live Map Location
    end

    Note over E: If Score hits 75+ (LEVEL 4)
    E->>P: Blast Help Needed nearby (3KM Radius)
    P-->>U: Peer Network Responder Routing Starts!
```

---

<br/>

## 🛠 Features Deep-Dive

<details open>
  <summary><b><font size="+1">🎙️ SilentSOS Audio API</font></b></summary>
  <blockquote>
    <p><b>🧠 Innovation Detail:</b> Analyzes soundwave FFT patterns strictly locally inside the browser. Identifies frequency spikes corresponding to human screams or glass breaking.</p>
    <p><b>🔒 Privacy / Security:</b> <em>Local Only.</em> Mic data is processed on-device. Zero audio files are transmitted to servers protecting privacy.</p>
  </blockquote>
</details>

<details open>
  <summary><b><font size="+1">📳 Motion Jerk Engine</font></b></summary>
  <blockquote>
    <p><b>🧠 Innovation Detail:</b> Hooks into HTML5 <code>DeviceMotion</code>. Reads 3D axis acceleration data at 12fps to identify sudden delta spikes >22m/s².</p>
    <p><b>🔒 Privacy / Security:</b> <em>Battery Efficient.</em> Automatically disables itself when the device is idle, minimizing background drain.</p>
  </blockquote>
</details>

<details open>
  <summary><b><font size="+1">📡 Realtime Peer Radar</font></b></summary>
  <blockquote>
    <p><b>🧠 Innovation Detail:</b> Utilizes Supabase <code>postgres_changes</code>. Any nearby user opted-in as a "Helper" instantly sees a pulsing pop-up radar alert when you're in distress.</p>
    <p><b>🔒 Privacy / Security:</b> <em>Encrypted Socket.</em> Data streams securely over wss:// with strict RLS (Row Level Security).</p>
  </blockquote>
</details>

<details open>
  <summary><b><font size="+1">🗺️ Smart Safe-Route</font></b></summary>
  <blockquote>
    <p><b>🧠 Innovation Detail:</b> Fuses Google Maps Directions API with customized Haversine off-route vector tracking. Evaluates path corridors dynamically.</p>
    <p><b>🔒 Privacy / Security:</b> <em>Anonymous Paths.</em> Route history clears immediately after session logic concludes.</p>
  </blockquote>
</details>

---

<br/>

<div align="center">
  <h2>🛡️ Meet the Obsidian HoloShield Interface</h2>
  <img src="https://readme-typing-svg.herokuapp.com?font=JetBrains+Mono&size=16&color=00FFA3&center=true&vCenter=true&lines=>_Loading_Command_Center...;>_Rendering_Glassmorphic_UI...;>_Ready_For_Deployment" />
</div>

RakshaNet abandons boring layouts for a cutting-edge **Cyber-Security Command Center** aesthetic:
- **Glassmorphic Panels:** Intense backdrop blur (`backdrop-filter`) with semi-transparent panel borders mimicking tactical HUDs.
- **Micro-Animations:** Driven by `framer-motion`, every number tick, chart load, and action pulses and fluidly enters the frame ensuring the interface feels "alive".
- **Dynamic Context Glows:** The UI changes global accent colors automatically based on the risk level. Ambient shadows pulse red during Level 4 Crits.

<br/>

> **"Because safety shouldn't feel obsolete. It should feel like state-of-the-art protection."**

---

<br/>

<div align="center">
  <h2>🚀 Setup Your Local Instance</h2>
</div>

#### Installation

```bash
# 1. Clone the repo
git clone https://github.com/VishalDeep1377/RakshaNet.git

# 2. Enter workspace
cd rakshanet

# 3. Install packages
npm install
```

#### Environment Variables

Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
VONAGE_API_KEY=your_vonage_key
VONAGE_API_SECRET=your_vonage_secret
```

#### Boot Server
```bash
npm run dev
```

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/Made%20with-❤️%20in%20India-FF9933?style=for-the-badge" />
  <br/>
  <br/>
  <i>Open Source for a Safer Tomorrow.</i>
</p>
