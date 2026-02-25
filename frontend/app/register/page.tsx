"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { setAuth } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    team_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register", form);
      setAuth(res.data.access_token, res.data.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Join the fantasy league today — it's free</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg text-sm text-red-400" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input name="username" value={form.username} onChange={handleChange} placeholder="your_username" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@email.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••" required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fantasy Team Name</label>
            <input name="team_name" value={form.team_name} onChange={handleChange} placeholder="e.g. The Invincibles FC" required />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-center block"
            style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
          <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-medium" style={{ color: "var(--primary)" }}>
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
