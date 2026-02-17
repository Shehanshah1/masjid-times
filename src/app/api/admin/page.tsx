"use client";

import { useEffect, useState } from "react";
import { fmt12From24 } from "@/lib/time";

/* ================= Types ================= */

type Jamaat = {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jummah: { khutbah: string; salah: string }[];
};

/* ================= Defaults ================= */

// ✅ Your desired 2 Jumu'ah slots (store as HH:MM 24-hour)
const DEFAULT_JUMMAH = [
  { khutbah: "12:15", salah: "12:30" },
  { khutbah: "13:15", salah: "13:45" },
];

const FALLBACK: Jamaat = {
  fajr: "06:35",
  dhuhr: "13:20",
  asr: "17:15",
  maghrib: "17:50",
  isha: "19:15",
  jummah: DEFAULT_JUMMAH,
};

/* ================= Time Helpers ================= */

type Time12 = { hour: number; minute: number; ampm: "AM" | "PM" };

function to12(time24?: string): Time12 {
  if (!time24) return { hour: 12, minute: 0, ampm: "PM" };
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = ((h + 11) % 12) + 1;
  return { hour, minute: m, ampm };
}

function to24(t: Time12) {
  let hour = t.hour % 12;
  if (t.ampm === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const v = to12(value);

  function update(patch: Partial<Time12>) {
    const next = {
      hour: patch.hour ?? v.hour,
      minute: patch.minute ?? v.minute,
      ampm: patch.ampm ?? v.ampm,
    };
    onChange(to24(next));
  }

  return (
    <div className="space-y-2">
      <div className="text-sm opacity-80">{label}</div>
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          max={12}
          value={v.hour}
          onChange={(e) => update({ hour: Number(e.target.value) })}
          className="w-20 rounded-xl bg-black/40 border border-white/10 px-3 py-3"
        />
        <input
          type="number"
          min={0}
          max={59}
          value={String(v.minute).padStart(2, "0")}
          onChange={(e) => update({ minute: Number(e.target.value) })}
          className="w-24 rounded-xl bg-black/40 border border-white/10 px-3 py-3"
        />
        <select
          value={v.ampm}
          onChange={(e) => update({ ampm: e.target.value as "AM" | "PM" })}
          className="w-24 rounded-xl bg-black/40 border border-white/10 px-3 py-3"
        >
          <option>AM</option>
          <option>PM</option>
        </select>

        {/* ✅ Cohesive preview: 02:00 PM style */}
        <div className="flex items-center text-sm opacity-50 tabular-nums">
          {fmt12From24(value)}
        </div>
      </div>
    </div>
  );
}

/* ================= Page ================= */

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [jamaat, setJamaat] = useState<Jamaat>(FALLBACK);

  async function login() {
    setLoading(true);
    setStatus("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      if (res.ok) {
        setLoggedIn(true);
        setStatus("Logged in ✅");
        load();
      } else {
        setStatus("Wrong passcode ❌");
      }
    } catch {
      setStatus("Network error ❌");
    } finally {
      setLoading(false);
    }
  }

  async function load() {
    const res = await fetch("/api/jamaat", { cache: "no-store" });
    const json = await res.json();
    if (json?.data) {
      const data = json.data;

      // ✅ Ensure we always have TWO jummah slots by default
      if (!data.jummah || !Array.isArray(data.jummah) || data.jummah.length < 2) {
        data.jummah = DEFAULT_JUMMAH;
      }

      setJamaat(data);
    }
  }

  async function save() {
    setLoading(true);
    await fetch("/api/jamaat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jamaat),
    });
    setLoading(false);
    setStatus("Saved ✅");
  }

  /* ================= Login Screen ================= */

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow space-y-4">
          <h1 className="text-2xl font-semibold">Admin Login</h1>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter passcode"
            className="w-full rounded-xl border p-3"
          />
          <button
            onClick={login}
            disabled={loading}
            className="w-full rounded-xl bg-black text-white p-3"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          {status && <div className="text-sm">{status}</div>}
        </div>
      </main>
    );
  }

  /* ================= Admin Panel ================= */

  return (
    <main className="min-h-screen bg-[#0B1220] text-white p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold">Update Jamaat (Iqama) Times</h1>
          <div className="text-sm opacity-70">Logged in ✅</div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <TimeField label="Fajr" value={jamaat.fajr} onChange={(v) => setJamaat({ ...jamaat, fajr: v })} />
          <TimeField label="Dhuhr" value={jamaat.dhuhr} onChange={(v) => setJamaat({ ...jamaat, dhuhr: v })} />
          <TimeField label="Asr" value={jamaat.asr} onChange={(v) => setJamaat({ ...jamaat, asr: v })} />
          <TimeField label="Maghrib" value={jamaat.maghrib} onChange={(v) => setJamaat({ ...jamaat, maghrib: v })} />
          <TimeField label="Isha" value={jamaat.isha} onChange={(v) => setJamaat({ ...jamaat, isha: v })} />
        </div>

        {/* Jumu'ah */}
        <div className="bg-black/40 p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Jumu&apos;ah</h2>

            {/* ✅ Prevent unlimited slots; reset to the 2 you want */}
            <button
              onClick={() => setJamaat({ ...jamaat, jummah: DEFAULT_JUMMAH })}
              className="bg-white/10 px-4 py-2 rounded-xl"
              title="Reset to the default 2 Jumu'ah slots"
            >
              Reset to 2 Slots
            </button>
          </div>

          {jamaat.jummah.slice(0, 2).map((slot, i) => (
            <div
              key={i}
              className="grid md:grid-cols-2 gap-6 bg-black/30 p-4 rounded-xl"
            >
              <TimeField
                label={`Jumu'ah ${i + 1} Khutbah`}
                value={slot.khutbah}
                onChange={(v) =>
                  setJamaat({
                    ...jamaat,
                    jummah: jamaat.jummah.map((s, idx) =>
                      idx === i ? { ...s, khutbah: v } : s
                    ),
                  })
                }
              />
              <TimeField
                label={`Jumu'ah ${i + 1} Salah`}
                value={slot.salah}
                onChange={(v) =>
                  setJamaat({
                    ...jamaat,
                    jummah: jamaat.jummah.map((s, idx) =>
                      idx === i ? { ...s, salah: v } : s
                    ),
                  })
                }
              />
            </div>
          ))}

          <div className="text-xs opacity-60">
            Tip: Only the first 2 Jumu&apos;ah slots are used.
          </div>
        </div>

        <button
          onClick={save}
          disabled={loading}
          className="bg-emerald-500 px-6 py-3 rounded-xl font-semibold"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>

        {status && <div className="text-sm opacity-70">{status}</div>}
      </div>
    </main>
  );
}
