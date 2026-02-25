"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn()) {
      router.push("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #0f0f13 0%, #1a0a2e 50%, #0f1a13 100%)" }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-xl gradient-text">Fantasy 5-a-side</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}>
            Log in
          </Link>
          <Link href="/register" className="btn-primary text-sm">
            Get Started
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ background: "rgba(56,255,126,0.1)", color: "var(--primary)", border: "1px solid rgba(56,255,126,0.2)" }}>
          <span>🏆</span>
          <span>Season 2026 is Live</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
          Build Your
          <br />
          <span className="gradient-text">Dream 5-a-side</span>
          <br />
          Fantasy Team
        </h1>

        <p className="text-lg md:text-xl mb-10 max-w-xl" style={{ color: "var(--muted)" }}>
          Pick 5 players, manage your budget, earn points from real local match stats. Compete with friends in private mini-leagues.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link href="/register" className="btn-primary text-base px-8 py-3">
            Play for Free →
          </Link>
          <Link href="/login" className="px-8 py-3 rounded-lg text-base font-medium" style={{ border: "1px solid var(--border)" }}>
            Sign In
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl w-full">
          {[
            { icon: "⚽", label: "Goals", pts: "+4 pts" },
            { icon: "🎯", label: "Assists", pts: "+3 pts" },
            { icon: "🧤", label: "GK Clean Sheet", pts: "+5 pts" },
            { icon: "⭐", label: "MVP", pts: "+3 pts" },
          ].map((item) => (
            <div key={item.label} className="card p-4 text-center">
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs font-bold mt-1" style={{ color: "var(--primary)" }}>{item.pts}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-6 text-center text-sm" style={{ color: "var(--muted)", borderTop: "1px solid var(--border)" }}>
        Fantasy 5-a-side Football © 2026
      </footer>
    </div>
  );
}
