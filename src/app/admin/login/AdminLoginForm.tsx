"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

export default function AdminLoginForm({ siteName, logo }: { siteName: string; logo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      // hard navigation so the new session cookie is used immediately
      window.location.href = "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[28px] border border-gray-100 shadow-[0_24px_70px_rgba(17,18,28,0.1)] p-7 md:p-9">
      <div className="text-center">
        <Link href="/" className="inline-block lg:hidden mb-5">
          <Image src={logo} alt={siteName} width={150} height={36} className="h-9 w-auto mx-auto" />
        </Link>
        <span className="inline-grid place-items-center w-14 h-14 rounded-2xl grad-bg text-white shadow-[0_12px_30px_rgba(255,61,119,0.35)] mb-4">
          <ShieldCheck size={24} />
        </span>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Admin Login</h2>
        <p className="text-[13px] text-gray-400 font-semibold mt-1.5">
          Sign in with your administrator credentials
        </p>
      </div>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block">
          <span className="block text-[12.5px] font-extrabold text-gray-700 mb-1.5">Email Address</span>
          <span className="relative block">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              className="field"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </span>
        </label>

        <label className="block">
          <span className="block text-[12.5px] font-extrabold text-gray-700 mb-1.5">Password</span>
          <span className="relative block">
            <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPw ? "text" : "password"}
              className="field pr-12"
              placeholder="Your admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>

        {error && (
          <p className="text-sm font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full grad-bg text-white rounded-2xl py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition disabled:opacity-70 shadow-[0_12px_30px_rgba(255,61,119,0.3)]"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {loading ? "Signing in…" : "Sign In to Dashboard"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="flex-1 h-px bg-gray-100" />
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-300">or</span>
        <span className="flex-1 h-px bg-gray-100" />
      </div>

      <Link
        href="/login"
        className="w-full grad-border rounded-2xl py-3 text-sm font-extrabold text-gray-800 flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.99] transition"
      >
        <UserRound size={15} className="text-[var(--g2)]" />
        Switch to Customer Login
      </Link>

      <Link
        href="/"
        className="mt-5 flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-gray-400 hover:text-gray-600 transition"
      >
        <ArrowLeft size={14} />
        Back to Store
      </Link>
    </div>
  );
}
