"use client";

import { useState } from "react";

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [status, setStatus] = useState("");

  async function login() {
    setStatus("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });

    if (res.ok) setStatus("Logged in ✅");
    else setStatus("Wrong passcode ❌");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow space-y-4">
        <h1 className="text-2xl font-semibold">Admin Login</h1>

        <input
          className="w-full rounded-xl border p-3"
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Enter passcode"
        />

        <button
          className="w-full rounded-xl bg-black p-3 text-white"
          onClick={login}
        >
          Login
        </button>

        {status && <div className="text-sm text-slate-700">{status}</div>}
      </div>
    </main>
  );
}
