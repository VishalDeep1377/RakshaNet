"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";

type Mode = "login" | "signup";
type Step = "email" | "password";

export default function LoginPage() {
  const [mode, setMode]         = useState<Mode>("login");
  const [step, setStep]         = useState<Step>("email");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [signupDone, setSignupDone] = useState(false);
  const pwdRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (step === "password") pwdRef.current?.focus(); }, [step]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleGoogleLogin = async () => {
    setLoading(true); setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      setError((err as Error).message || "Could not start Google sign-in.");
      setLoading(false);
    }
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) return;
    setError(null);
    setStep("password");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/dashboard";
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSignupDone(true);
      }
    } catch (err) {
      setError((err as Error).message || "Authentication failed.");
    } finally { setLoading(false); }
  };

  const switchMode = (next: Mode) => {
    setMode(next); setStep("email"); setPassword(""); setError(null); setSignupDone(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin-slow  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes spin-rev   { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
        @keyframes float-logo { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pulse-dot  { 0%,100%{opacity:.5;transform:translateX(-50%) scale(1)} 50%{opacity:1;transform:translateX(-50%) scale(1.4)} }
        @keyframes shimmer-tx { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes slide-up   { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow-pulse { 0%,100%{box-shadow:0 4px 24px rgba(255,0,51,.35)} 50%{box-shadow:0 4px 40px rgba(255,0,51,.6)} }

        .rn-login{min-height:100vh;display:flex;background:#0A0000;position:relative;overflow:hidden;font-family:Inter,sans-serif}
        .rn-login::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
          background:radial-gradient(ellipse 55% 55% at 15% 20%,rgba(255,0,51,.13) 0%,transparent 65%),
                      radial-gradient(ellipse 45% 55% at 85% 80%,rgba(180,0,30,.10) 0%,transparent 65%)}
        .rn-login::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.22;
          background-image:linear-gradient(rgba(255,0,51,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,0,51,.08) 1px,transparent 1px);
          background-size:56px 56px}

        .rn-left{display:none;flex:1;position:relative;z-index:1;flex-direction:column;align-items:center;justify-content:center;
          padding:60px 52px;background:linear-gradient(160deg,rgba(255,0,51,.07) 0%,rgba(120,0,15,.04) 50%,transparent 100%);
          border-right:1px solid rgba(255,0,51,.15)}
        @media(min-width:1024px){.rn-left{display:flex}}

        .ring-sys{position:relative;width:230px;height:230px;margin:0 auto 52px}
        .rn-ring{position:absolute;border-radius:50%}
        .rn-ring-1{inset:0;border:1px solid rgba(255,0,51,.30);animation:spin-slow 24s linear infinite}
        .rn-ring-2{inset:22px;border:1px dashed rgba(255,77,109,.20);animation:spin-rev 17s linear infinite}
        .rn-ring-3{inset:44px;border:1px solid rgba(255,0,51,.38);animation:spin-slow 11s linear infinite}
        .rn-orbit{position:absolute;inset:8px;animation:spin-slow 6s linear infinite}
        .rn-orbit2{position:absolute;inset:30px;animation:spin-rev 10s linear infinite}
        .rn-dot{position:absolute;top:0;left:50%;transform:translateX(-50%);width:9px;height:9px;border-radius:50%;
          background:#FF0033;box-shadow:0 0 14px #FF0033,0 0 30px rgba(255,0,51,.55);animation:pulse-dot 2s ease-in-out infinite}
        .rn-dot2{width:7px;height:7px;background:#FF4D6D;box-shadow:0 0 12px #FF4D6D;animation-delay:1s}
        .rn-logo-center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;animation:float-logo 4s ease-in-out infinite}
        .rn-logo-center img{width:108px;height:108px;object-fit:contain;filter:drop-shadow(0 0 22px rgba(255,0,51,.55)) drop-shadow(0 0 44px rgba(255,0,51,.25))}

        .rn-left-h2{font-family:Outfit,sans-serif;font-size:2.1rem;font-weight:900;letter-spacing:-.04em;line-height:1.12;color:#FFE4E8;text-align:center;margin-bottom:10px}
        .rn-left-h2 em{font-style:normal;background:linear-gradient(90deg,#FF0033,#FF6680,#FF0033);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer-tx 3s linear infinite}
        .rn-left-sub{font-size:13.5px;color:rgba(255,210,215,.5);line-height:1.75;max-width:310px;text-align:center;margin:0 auto 36px}
        .rn-badges{display:flex;flex-direction:column;gap:10px;width:100%;max-width:340px}
        .rn-badge{display:flex;align-items:center;gap:12px;padding:12px 18px;background:rgba(255,255,255,.02);border:1px solid rgba(255,0,51,.12);border-radius:12px;transition:all .25s;cursor:default}
        .rn-badge:hover{background:rgba(255,0,51,.07);border-color:rgba(255,0,51,.30);transform:translateX(5px)}
        .rn-badge-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,0,51,.12);font-size:15px;flex-shrink:0}
        .rn-badge-txt{font-size:12.5px;color:rgba(255,210,215,.5);font-weight:500}

        .rn-form-panel{position:relative;z-index:1;width:100%;max-width:480px;margin:0 auto;padding:60px 36px 48px;display:flex;flex-direction:column;justify-content:center;animation:slide-up .5s ease both}
        @media(min-width:1024px){.rn-form-panel{margin:0}}

        .rn-tabs{display:flex;background:rgba(255,255,255,.04);border:1px solid rgba(255,0,51,.15);border-radius:14px;padding:4px;margin-bottom:28px;gap:4px}
        .rn-tab{flex:1;padding:11px 16px;font-size:14px;font-weight:700;border:none;border-radius:10px;cursor:pointer;font-family:Inter,sans-serif;transition:all .25s;background:transparent;color:rgba(255,210,215,.45)}
        .rn-tab.active{background:linear-gradient(135deg,#FF0033 0%,#CC0022 100%);color:#fff;box-shadow:0 2px 16px rgba(255,0,51,.4)}
        .rn-tab:not(.active):hover{background:rgba(255,0,51,.08);color:rgba(255,210,215,.75)}

        .rn-input{width:100%;padding:13px 16px;font-size:14px;color:#FFE4E8;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;outline:none;transition:all .2s;font-family:Inter,sans-serif}
        .rn-input::placeholder{color:rgba(255,210,215,.22)}
        .rn-input:focus{border-color:rgba(255,0,51,.5);background:rgba(255,0,51,.04);box-shadow:0 0 0 3px rgba(255,0,51,.12)}

        .btn-primary{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px 16px;font-size:14px;font-weight:700;background:linear-gradient(135deg,#FF0033 0%,#CC0022 100%);color:#fff;border:none;border-radius:12px;cursor:pointer;transition:all .25s;font-family:Inter,sans-serif;animation:glow-pulse 3s ease-in-out infinite}
        .btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 32px rgba(255,0,51,.55)}
        .btn-primary:disabled{background:rgba(255,255,255,.06);color:rgba(255,210,215,.28);animation:none;cursor:not-allowed;box-shadow:none}

        .btn-google{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:13px 16px;font-size:14px;font-weight:600;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:12px;cursor:pointer;color:#FFE4E8;transition:all .2s;font-family:Inter,sans-serif}
        .btn-google:hover{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.16)}
        .back-link{display:flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;color:#FF0033;font-size:12px;font-weight:600;padding:0;transition:color .2s}
        .back-link:hover{color:#FF4D6D}
        .rn-error{font-size:13px;color:#FF4D6D;background:rgba(255,0,51,.08);border:1px solid rgba(255,0,51,.25);border-radius:10px;padding:10px 14px;margin-bottom:16px}
        .rn-divider{display:flex;align-items:center;gap:14px;margin:22px 0}
        .rn-divider-line{flex:1;height:1px;background:rgba(255,255,255,.07)}
        .rn-divider-txt{font-size:11px;color:rgba(255,210,215,.28);letter-spacing:.06em;text-transform:uppercase}
        .field-lbl{display:block;font-size:11.5px;font-weight:700;color:rgba(255,210,215,.42);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px}

        .signup-success{text-align:center;padding:24px 8px}
        .signup-success-icon{font-size:52px;margin-bottom:16px;display:block}
        .signup-success h2{font-family:Outfit,sans-serif;font-size:1.5rem;font-weight:900;color:#FFE4E8;margin-bottom:10px}
        .signup-success p{font-size:13.5px;color:rgba(255,210,215,.5);line-height:1.65;margin-bottom:20px}
        .signup-success-note{font-size:12px;color:rgba(255,210,215,.3);background:rgba(255,0,51,.06);border:1px solid rgba(255,0,51,.15);border-radius:10px;padding:10px 14px}

        .rn-footer{margin-top:36px;font-size:11.5px;color:rgba(255,210,215,.2);text-align:center;line-height:1.6}
        .rn-footer a{color:rgba(255,0,51,.55);text-decoration:none}
        .rn-footer a:hover{color:#FF0033}
      `}</style>

      <div className="rn-login">

        {/* LEFT PANEL */}
        <div className="rn-left">
          <div className="ring-sys">
            <div className="rn-ring rn-ring-1" />
            <div className="rn-ring rn-ring-2" />
            <div className="rn-ring rn-ring-3" />
            <div className="rn-orbit"><div className="rn-dot" /></div>
            <div className="rn-orbit2"><div className="rn-dot rn-dot2" /></div>
            <div className="rn-logo-center">
              <img src="/logo.png" alt="RakshaNet" />
            </div>
          </div>
          <h2 className="rn-left-h2">
            India&apos;s <em>Safest</em><br />Women&apos;s Network
          </h2>
          <p className="rn-left-sub">
            AI-powered silent distress detection. Tamper-proof evidence vaults.
            Real-time verified responder coordination.
          </p>
          <div className="rn-badges">
            {[
              { icon: "🔒", txt: "End-to-end encrypted communications" },
              { icon: "🧠", txt: "On-device AI — zero cloud uploads" },
              { icon: "🛡️", txt: "Consent-gated evidence vault" },
            ].map((b) => (
              <div className="rn-badge" key={b.txt}>
                <div className="rn-badge-icon">{b.icon}</div>
                <span className="rn-badge-txt">{b.txt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FORM PANEL */}
        <div className="rn-form-panel">
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <img src="/logo.png" alt="RakshaNet" style={{ height: 52, width: "auto", objectFit: "contain", filter: "drop-shadow(0 0 12px rgba(255,0,51,0.45))" }} />
          </a>

          {/* Tab Switcher */}
          <div className="rn-tabs" role="tablist">
            <button role="tab" type="button"
              className={`rn-tab${mode === "login" ? " active" : ""}`}
              onClick={() => switchMode("login")}
            >
              Sign In
            </button>
            <button role="tab" type="button"
              className={`rn-tab${mode === "signup" ? " active" : ""}`}
              onClick={() => switchMode("signup")}
            >
              Create Account
            </button>
          </div>

          {signupDone ? (
            <div className="signup-success">
              <span className="signup-success-icon">🎉</span>
              <h2>Account created!</h2>
              <p>
                We sent a confirmation email to{" "}
                <strong style={{ color: "#FFE4E8" }}>{email}</strong>.
                <br />Check your inbox and click the link to verify.
              </p>
              <div className="signup-success-note">
                After verifying, click the <strong>Sign In</strong> tab and log in.
              </div>
              <button type="button" className="btn-primary" style={{ marginTop: 24 }} onClick={() => switchMode("login")}>
                Go to Sign In <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <>
              <button type="button" className="btn-google" onClick={handleGoogleLogin} disabled={loading}>
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="rn-divider">
                <div className="rn-divider-line" />
                <span className="rn-divider-txt">or email</span>
                <div className="rn-divider-line" />
              </div>

              {error && <div className="rn-error">{error}</div>}

              {step === "email" && (
                <form onSubmit={handleNext} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label htmlFor="email" className="field-lbl">Email Address</label>
                    <input
                      id="email" type="email" value={email} autoFocus required
                      className="rn-input"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={!emailValid}>
                    Continue <ArrowRight size={15} />
                  </button>
                </form>
              )}

              {step === "password" && (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <label htmlFor="password" className="field-lbl" style={{ marginBottom: 0 }}>
                        {mode === "signup" ? "Create Password" : "Password"}
                      </label>
                      <button type="button" className="back-link" onClick={() => setStep("email")}>
                        <ArrowLeft size={11} /> {email.length > 24 ? email.slice(0, 22) + "..." : email}
                      </button>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        ref={pwdRef} id="password"
                        type={showPwd ? "text" : "password"}
                        value={password} required minLength={6}
                        className="rn-input"
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === "signup" ? "Min. 6 characters" : "Password"}
                        style={{ paddingRight: 44 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,210,215,0.3)", padding: 4 }}
                      >
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {mode === "signup" && (
                      <p style={{ fontSize: 11.5, color: "rgba(255,210,215,0.3)", marginTop: 6, marginBottom: 0 }}>
                        Use at least 6 characters.
                      </p>
                    )}
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? (mode === "signup" ? "Creating account..." : "Signing in...") : mode === "login" ? "Sign In" : "Create Account"}
                    {!loading && <ArrowRight size={15} />}
                  </button>
                </form>
              )}
            </>
          )}

          <p className="rn-footer">
            By continuing you agree to our <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a>
            <br />Privacy-first. No data sold. Ever.
          </p>
        </div>
      </div>
    </>
  );
}