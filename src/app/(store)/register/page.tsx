"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Phone, User, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      router.push("/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="grad-soft min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-[28px] border border-gray-100 shadow-[0_20px_60px_rgba(17,18,28,0.1)] p-7 md:p-9">
        <div className="text-center">
          <span className="inline-grid place-items-center w-14 h-14 rounded-2xl grad-bg text-white mb-4">
            <UserPlus size={22} />
          </span>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Create Account</h1>
          <p className="text-[13px] text-gray-400 font-semibold mt-1.5">
            Join Kmcmartbd to track all your orders in one place
          </p>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block">
            <span className="block text-[12.5px] font-extrabold text-gray-700 mb-1.5">Full Name</span>
            <span className="relative block">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="field"
                placeholder="e.g. Rahim Uddin"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </span>
          </label>

          <label className="block">
            <span className="block text-[12.5px] font-extrabold text-gray-700 mb-1.5">Mobile Number</span>
            <span className="relative block">
              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="field"
                placeholder="01XXXXXXXXX"
                inputMode="numeric"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              />
            </span>
          </label>

          <label className="block">
            <span className="block text-[12.5px] font-extrabold text-gray-700 mb-1.5">Password</span>
            <span className="relative block">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                className="field"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </span>
          </label>

          <label className="block">
            <span className="block text-[12.5px] font-extrabold text-gray-700 mb-1.5">Confirm Password</span>
            <span className="relative block">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                className="field"
                placeholder="Repeat your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
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
            className="w-full grad-bg text-white rounded-2xl py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition disabled:opacity-70"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-gray-500 font-semibold">
          Already have an account?{" "}
          <Link href="/login" className="grad-text font-extrabold hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
