"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, getUser } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/squad", label: "My Squad", icon: "👥" },
  { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  { href: "/minileagues", label: "Mini-Leagues", icon: "🔒" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const user = typeof window !== "undefined" ? getUser() : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleLogout() {
    clearAuth();
    router.push("/");
  }

  return (
    <>
      <nav
        className="hidden md:flex fixed top-0 left-0 bottom-0 w-60 flex-col py-6 px-4 z-50"
        style={{ background: "var(--card)", borderRight: "1px solid var(--border)" }}
      >
        <div className="mb-8">
          <Link href="/dashboard" className="flex items-center gap-2 px-2">
            <span className="text-2xl">⚽</span>
            <span className="font-bold text-lg gradient-text">Fantasy 5s</span>
          </Link>
        </div>

        <div className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: pathname === item.href ? "rgba(56,255,126,0.1)" : "transparent",
                color: pathname === item.href ? "var(--primary)" : "var(--foreground)",
                border: pathname === item.href ? "1px solid rgba(56,255,126,0.2)" : "1px solid transparent",
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          {/* تم إضافة mounted هنا لمنع الـ Hydration Error */}
          {mounted && user?.is_admin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: pathname === "/admin" ? "rgba(124,58,237,0.1)" : "transparent",
                color: pathname === "/admin" ? "#a78bfa" : "var(--muted)",
                border: pathname === "/admin" ? "1px solid rgba(124,58,237,0.2)" : "1px solid transparent",
              }}
            >
              <span>⚙️</span>
              <span>Admin Panel</span>
            </Link>
          )}
        </div>

        {/* تم إضافة mounted هنا أيضاً لبيانات المستخدم وزر الخروج */}
        {mounted && (
          <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "var(--primary)", color: "#0f0f13" }}>
                {user?.username?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user?.username}</div>
                <div className="text-xs truncate" style={{ color: "var(--muted)" }}>
                  {user?.is_admin ? "Admin" : "Manager"}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
              style={{ color: "var(--muted)" }}
            >
              <span>🚪</span>
              <span>Sign out</span>
            </button>
          </div>
        )}
      </nav>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex z-50"
        style={{ background: "var(--card)", borderTop: "1px solid var(--border)" }}
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center py-3 gap-1 text-xs"
            style={{
              color: pathname === item.href ? "var(--primary)" : "var(--muted)",
            }}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label.split(" ")[0]}</span>
          </Link>
        ))}
        {mounted && user?.is_admin && (
          <Link
            href="/admin"
            className="flex-1 flex flex-col items-center py-3 gap-1 text-xs"
            style={{
              color: pathname === "/admin" ? "#a78bfa" : "var(--muted)",
            }}
          >
            <span className="text-xl">⚙️</span>
            <span>Admin</span>
          </Link>
        )}
      </nav>
    </>
  );
}