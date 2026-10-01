"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold px-4 py-2.5 rounded-full transition disabled:opacity-70"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
      Logout
    </button>
  );
}
