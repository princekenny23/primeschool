"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, login, signupOwner } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", first_name: "", last_name: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signupOwner(form);
      await login(form.username, form.password);
      router.replace("/schools");
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Unable to create your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-art">
        <div className="login-brand"><span className="brand-mark">P</span><span>PrimeSchool</span></div>
        <h1>Set up your <span>school platform.</span></h1>
        <p>Create an owner account, then add and configure your school.</p>
      </section>
      <form className="login-card" onSubmit={submit}>
        <span className="section-kicker">GET STARTED</span>
        <h2>Create your school owner account</h2>
        <p className="login-card-intro">You can create your school after signing in.</p>
        {error && <p className="ui-notice ui-notice-error">{error}</p>}
        <label><span className="login-field-title">Username</span><input autoComplete="username" value={form.username} onChange={set("username")} required /></label>
        <label><span className="login-field-title">Email</span><input type="email" autoComplete="email" value={form.email} onChange={set("email")} required /></label>
        <div className="login-form-grid">
          <label><span className="login-field-title">First name</span><input autoComplete="given-name" value={form.first_name} onChange={set("first_name")} required /></label>
          <label><span className="login-field-title">Last name</span><input autoComplete="family-name" value={form.last_name} onChange={set("last_name")} required /></label>
        </div>
        <label><span className="login-field-title">Password</span><input type="password" autoComplete="new-password" value={form.password} onChange={set("password")} required /></label>
        <button className="login-button" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"} <span>→</span></button>
        <small>Already have an account? <Link href="/login">Sign in</Link></small>
      </form>
    </main>
  );
}
