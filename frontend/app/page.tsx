"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homeFor, useAuth } from "@/lib/auth";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(homeFor(user));
  }, [user, loading, router]);

  return (
    <main className="ui-boot">
      <span className="brand-mark">P</span>
      <p>Opening PrimeSchool…</p>
    </main>
  );
}
