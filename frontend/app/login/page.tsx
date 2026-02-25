"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { setAuth } from "@/lib/auth";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase"; // تأكد إنك عامل الملف ده زي ما شرحنا

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // الدخول بالطريقة العادية (يوزر وباسوورد)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", username);
      form.append("password", password);
      const res = await api.post("/auth/token", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      setAuth(res.data.access_token, res.data.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // الدخول بـ Google عن طريق Firebase
  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);
    try {
      // 1. تسجيل الدخول عن طريق نافذة جوجل
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();

      // 2. إرسال التوكن للباك إند بتاعنا
      const res = await api.post("/auth/firebase", { token });

      // 3. حفظ بيانات الدخول والتوجيه للوحة التحكم
      // بفترض هنا إن الباك إند بيرجع access_token و user زي الدخول العادي
      setAuth(res.data.access_token, res.data.user); 
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError("Google login failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #0f0f13, #1a0a2e)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-3xl">⚽</span>
            <span className="font-bold text-xl gradient-text">Fantasy 5-a-side</span>
          </Link>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Sign in to manage your fantasy team</p>
        </div>

        <div className="card p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg text-sm text-red-400" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}

          {/* زرار الدخول بجوجل */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full py-3 flex items-center justify-center gap-3 rounded-lg font-medium transition-all"
            style={{ 
              background: "white", 
              color: "#1f2937", 
              opacity: (googleLoading || loading) ? 0.7 : 1, 
              cursor: (googleLoading || loading) ? "not-allowed" : "pointer" 
            }}
          >
            {googleLoading ? (
              "Connecting to Google..."
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }}></div>
            <span className="text-sm" style={{ color: "var(--muted)" }}>OR</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }}></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                required
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full"
              />
            </div>
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-primary w-full py-3 text-center block"
              style={{ opacity: (loading || googleLoading) ? 0.7 : 1, cursor: (loading || googleLoading) ? "not-allowed" : "pointer" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
            <p className="text-center text-sm mt-4" style={{ color: "var(--muted)" }}>
              No account?{" "}
              <Link href="/register" className="font-medium" style={{ color: "var(--primary)" }}>
                Register here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}