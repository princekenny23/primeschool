"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Eye, EyeOff, LockKeyhole, Sparkles } from "lucide-react";
import { ApiError } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(homeFor(user));
  }, [user, loading, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const me = await signIn(username.trim(), password);
      router.replace(homeFor(me));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Incorrect username or password." : "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-art">
        <div className="login-art-glow login-art-glow-one" />
        <div className="login-art-glow login-art-glow-two" />
        <div className="login-art-content">
          <div className="login-brand">
            <span className="brand-mark">P</span>
            <span>PrimeSchool</span>
          </div>
          <span className="login-eyebrow"><Sparkles size={14} /> SCHOOL OPERATIONS, SIMPLIFIED</span>
          <h1>Make every school day <span>run better.</span></h1>
          <p>Clarity for every classroom. Confidence for every decision.</p>
          <div className="login-art-note">
            <LockKeyhole size={17} />
            Secure access for your school community
          </div>
          <div className="login-art-footer">
            <span>Built for better learning outcomes</span>
            <ArrowUpRight size={16} />
          </div>
        </div>
      </section>

      <form className="login-card" onSubmit={submit}>
        <div className="login-card-top">
          <span className="section-kicker">WELCOME BACK</span>
          <span className="login-card-mark">P</span>
        </div>
        <h2>Sign in to PrimeSchool</h2>
        <p className="login-card-intro">Your school day starts here.</p>

        {error && <p className="ui-notice ui-notice-error">{error}</p>}

        <label>
          <span className="login-field-title">Username or email</span>
          <input
            type="text"
            autoComplete="username"
            placeholder="Enter your username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>
        <label>
          <span className="login-field-title">Password</span>
          <span className="ui-password">
            <input
              type={reveal ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button type="button" onClick={() => setReveal(!reveal)} aria-label={reveal ? "Hide password" : "Show password"}>
              {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>

        <div className="login-options">
          <label>
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Remember me
          </label>
          <Link href="/login">Forgot password?</Link>
        </div>

        <button className="login-button" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"} <span>→</span>
        </button>
        <small>
          New school owner? <Link href="/register">Create an account</Link>
        </small>
        <small>Staff accounts are issued by your school administrator.</small>
      </form>
    </main>
  );
}
