"use client";

import { useEffect, useMemo, useState } from "react";
import { fmt12From24 } from "@/lib/time";

type JummahSlot = { khutbah: string; salah: string };

type Jamaat = {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jummah: JummahSlot[];
};

const EMPTY: Jamaat = {
  fajr: "",
  dhuhr: "",
  asr: "",
  maghrib: "",
  isha: "",
  jummah: [{ khutbah: "", salah: "" }],
};

function isLikelyTime(v: string) {
  if (!v) return true;
  return /^\d{1,2}:\d{2}$/.test(v.trim());
}

function normalizeTime(v: string) {
  const s = v.trim();
  if (!s) return s;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return s;
  const hh = String(Math.min(23, Math.max(0, parseInt(m[1], 10)))).padStart(2, "0");
  const mm = String(Math.min(59, Math.max(0, parseInt(m[2], 10)))).padStart(2, "0");
  return `${hh}:${mm}`;
}

function sanitizeIncoming(incoming: unknown): Jamaat {
  const safe = { ...EMPTY };
  if (!incoming || typeof incoming !== "object") return safe;

  const source = incoming as any;
  safe.fajr = typeof source.fajr === "string" ? source.fajr : "";
  safe.dhuhr = typeof source.dhuhr === "string" ? source.dhuhr : "";
  safe.asr = typeof source.asr === "string" ? source.asr : "";
  safe.maghrib = typeof source.maghrib === "string" ? source.maghrib : "";
  safe.isha = typeof source.isha === "string" ? source.isha : "";

  if (Array.isArray(source.jummah) && source.jummah.length) {
    safe.jummah = source.jummah.map((j: any) => ({
      khutbah: typeof j?.khutbah === "string" ? j.khutbah : "",
      salah: typeof j?.salah === "string" ? j.salah : "",
    }));
  }
  return safe;
}

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [status, setStatus] = useState("");
  const [data, setData] = useState<Jamaat>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const invalidTimes = useMemo(() => {
    const bad: string[] = [];
    ["fajr", "dhuhr", "asr", "maghrib", "isha"].forEach((key) => {
      if (!isLikelyTime((data as any)[key])) bad.push(key.charAt(0).toUpperCase() + key.slice(1));
    });
    data.jummah.forEach((j, i) => {
      if (!isLikelyTime(j.khutbah)) bad.push(`Jumu'ah ${i + 1} Khutbah`);
      if (!isLikelyTime(j.salah)) bad.push(`Jumu'ah ${i + 1} Salah`);
    });
    return bad;
  }, [data]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/jamaat", { cache: "no-store" });
      const json = await res.json();
      if (json.data) setData(sanitizeIncoming(json.data));
    } catch {
      setStatus("Error loading times ⚠️");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function login() {
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        setLoggedIn(true);
        setStatus("Logged in ✅");
      } else {
        setStatus("Wrong passcode ❌");
      }
    } finally {
      setLoggingIn(false);
    }
  }

  async function save() {
    if (invalidTimes.length > 0) {
      setStatus(`Fix format: ${invalidTimes.join(", ")}`);
      return;
    }
    setSaving(true);
    const payload = {
      ...data,
      fajr: normalizeTime(data.fajr),
      dhuhr: normalizeTime(data.dhuhr),
      asr: normalizeTime(data.asr),
      maghrib: normalizeTime(data.maghrib),
      isha: normalizeTime(data.isha),
      jummah: data.jummah.map(j => ({
        khutbah: normalizeTime(j.khutbah),
        salah: normalizeTime(j.salah)
      }))
    };

    try {
      const res = await fetch("/api/jamaat/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload }), // Fixed: Wrap in data key
      });
      if (res.ok) setStatus("Saved ✅");
      else setStatus("Save failed ❌");
    } catch {
      setStatus("Network error ❌");
    } finally {
      setSaving(false);
    }
  }

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-10">
        <div className="max-w-md mx-auto space-y-4">
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <input 
            type="password" 
            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
          />
          <button 
            onClick={login} 
            disabled={loggingIn}
            className="w-full bg-emerald-500 p-3 rounded-xl text-black font-bold"
          >
            {loggingIn ? "Logging in..." : "Login"}
          </button>
          {status && <p className="text-sm text-center">{status}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Update Times</h1>
          <button onClick={save} disabled={saving} className="bg-emerald-500 px-6 py-2 rounded-xl text-black font-bold">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {["fajr", "dhuhr", "asr", "maghrib", "isha"].map((key) => (
            <div key={key}>
              <label className="block text-sm opacity-70 mb-1 capitalize">{key}</label>
              <input 
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl"
                value={(data as any)[key]}
                onChange={(e) => setData({ ...data, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Jumu'ah Slots</h2>
            <button 
              onClick={() => setData({...data, jummah: [...data.jummah, {khutbah: "", salah: ""}]})}
              className="text-sm bg-white/10 px-3 py-1 rounded-lg"
            >+ Add Slot</button>
          </div>
          {data.jummah.map((j, i) => (
            <div key={i} className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
               <input 
                placeholder="Khutbah"
                className="p-2 bg-black/20 rounded-lg"
                value={j.khutbah}
                onChange={(e) => {
                  const next = [...data.jummah];
                  next[i].khutbah = e.target.value;
                  setData({...data, jummah: next});
                }}
              />
              <input 
                placeholder="Salah"
                className="p-2 bg-black/20 rounded-lg"
                value={j.salah}
                onChange={(e) => {
                  const next = [...data.jummah];
                  next[i].salah = e.target.value;
                  setData({...data, jummah: next});
                }}
              />
            </div>
          ))}
        </div>
        {status && <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">{status}</div>}
      </div>
    </main>
  );
}