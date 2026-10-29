import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export default function RegisterPage() {
  return (
    <main className="login-screen">
      <section className="login-art">
        <div className="login-brand">
          <span className="brand-mark">P</span>
          <span>PrimeSchool</span>
        </div>
        <h1>Make every school day <span>run better.</span></h1>
        <p>Clarity for every classroom. Confidence for every decision.</p>
        <div className="login-art-note">
          <LockKeyhole size={18} />
          Secure staff access
        </div>
      </section>
      <section className="login-card">
        <span className="section-kicker">STAFF ACCESS</span>
        <h2>Accounts are issued by your school</h2>
        <p>Self-service registration is disabled. Ask your school administrator to create or activate your staff account.</p>
        <Link className="login-button" href="/login">Back to sign in <span>→</span></Link>
      </section>
    </main>
  );
}
