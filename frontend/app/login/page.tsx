"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
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
        <span className="brand-mark">P</span>
        <h1>
          PrimeSchool
        </h1>
        <p>The calm operating system for ambitious schools.</p>
        <div className="login-art-note">
          <LockKeyhole size={18} />
          Secure access for your school community
        </div>
      </section>

      <form className="login-card" onSubmit={submit}>
        <span className="section-kicker">WELCOME BACK</span>
        <h2>Sign in to PrimeSchool</h2>
        <p>Use your school account to continue.</p>

        {error && <p className="ui-notice ui-notice-error">{error}</p>}

        <label>
          Username or email
          <input
            type="text"
            autoComplete="username"
            placeholder="you@primeschool.mw"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>
        <label>
          Password
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
        <small>Staff accounts are issued by your school administrator.</small>
      </form>
    </main>
  );
}
