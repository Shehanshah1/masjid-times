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
  const safe: Jamaat = {
    fajr: "",
    dhuhr: "",
    asr: "",
    maghrib: "",
    isha: "",
    jummah: [{ khutbah: "", salah: "" }],
  };

  if (!incoming || typeof incoming !== "object") return safe;

  const source = incoming as Partial<Jamaat> & { jummah?: unknown };

  safe.fajr = typeof source.fajr === "string" ? source.fajr : "";
  safe.dhuhr = typeof source.dhuhr === "string" ? source.dhuhr : "";
  safe.asr = typeof source.asr === "string" ? source.asr : "";
  safe.maghrib = typeof source.maghrib === "string" ? source.maghrib : "";
  safe.isha = typeof source.isha === "string" ? source.isha : "";

  if (Array.isArray(source.jummah) && source.jummah.length) {
    safe.jummah = source.jummah.map((j) => ({
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
    if (!isLikelyTime(data.fajr)) bad.push("Fajr");
    if (!isLikelyTime(data.dhuhr)) bad.push("Dhuhr");
    if (!isLikelyTime(data.asr)) bad.push("Asr");
    if (!isLikelyTime(data.maghrib)) bad.push("Maghrib");
    if (!isLikelyTime(data.isha)) bad.push("Isha");

    for (let i = 0; i < data.jummah.length; i++) {
      if (!isLikelyTime(data.jummah[i]?.khutbah)) bad.push(`Jumu'ah ${i + 1} Khutbah`);
      if (!isLikelyTime(data.jummah[i]?.salah)) bad.push(`Jumu'ah ${i + 1} Salah`);
    }
    return bad;
  }, [data]);

  async function load() {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/jamaat", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(sanitizeIncoming(json?.data));
    } catch {
      setData(EMPTY);
      setStatus("Could not load jamaat times ⚠️");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function login() {
    setStatus("");
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
        setLoggedIn(false);
        setStatus("Wrong passcode ❌");
      }
    } catch {
      setLoggedIn(false);
      setStatus("Network error ❌");
    } finally {
      setLoggingIn(false);
    }
  }

  async function save() {
    setStatus("");
    if (invalidTimes.length > 0) {
      setStatus(`Fix time format: ${invalidTimes.join(", ")} (use HH:MM)`);
      return;
    }

    const payload: Jamaat = {
      fajr: normalizeTime(data.fajr),
      dhuhr: normalizeTime(data.dhuhr),
      asr: normalizeTime(data.asr),
      maghrib: normalizeTime(data.maghrib),
      isha: normalizeTime(data.isha),
      jummah: data.jummah.map((j) => ({
        khutbah: normalizeTime(j.khutbah),
        salah: normalizeTime(j.salah),
      })),
    };

    setSaving(true);

    try {
      const res = await fetch("/api/jamaat/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus("Saved ✅ (refresh display/home to see it)");
      } else if (res.status === 401) {
        setLoggedIn(false);
        setStatus("Unauthorized ❌ (login again)");
      } else {
        // Display the ACTUAL error from server
        setStatus(`Error: ${json.error || res.statusText || "Server error"}`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "unknown";
      setStatus(`Network error: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  function addJummahSlot() {
    setData((d) => ({ ...d, jummah: [...d.jummah, { khutbah: "", salah: "" }] }));
  }

  function removeJummahSlot(idx: number) {
    setData((d) => {
      const copy = d.jummah.slice();
      copy.splice(idx, 1);
      return { ...d, jummah: copy.length ? copy : [{ khutbah: "", salah: "" }] };
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        {/* Header */}
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs text-white/60">Admin Panel</div>
              <h1 className="mt-1 text-2xl font-semibold">Update Jamaat Times</h1>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="text-xs text-white/60">Status</div>
              <div className="mt-1 text-sm">
                {loading ? "Loading..." : loggedIn ? "Logged In ✅" : "Locked 🔒"}
              </div>
            </div>
          </div>
        </header>

        {/* Login */}
        {!loggedIn && (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Login</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label className="text-sm text-white/70">Passcode</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-emerald-400/60"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  type="password"
                />
              </div>
              <button
                className="rounded-2xl bg-emerald-500 px-5 py-3 font-semibold text-black disabled:opacity-50"
                onClick={login}
                disabled={loggingIn || !passcode}
              >
                {loggingIn ? "Logging in..." : "Login"}
              </button>
            </div>
          </section>
        )}

        {/* Editor */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Times</h2>
            <div className="flex gap-3">
              <button
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/90 disabled:opacity-50"
                onClick={load}
                disabled={loading}
              >
                Refresh
              </button>
              <button
                className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black disabled:opacity-50"
                onClick={save}
                disabled={!loggedIn || saving || loading}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <TimeInput label="Fajr" value={data.fajr} onChange={(v) => setData({ ...data, fajr: v })} disabled={!loggedIn || loading} />
            <TimeInput label="Dhuhr" value={data.dhuhr} onChange={(v) => setData({ ...data, dhuhr: v })} disabled={!loggedIn || loading} />
            <TimeInput label="Asr" value={data.asr} onChange={(v) => setData({ ...data, asr: v })} disabled={!loggedIn || loading} />
            <TimeInput label="Maghrib" value={data.maghrib} onChange={(v) => setData({ ...data, maghrib: v })} disabled={!loggedIn || loading} />
            <TimeInput label="Isha" value={data.isha} onChange={(v) => setData({ ...data, isha: v })} disabled={!loggedIn || loading} />
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Jumu&apos;ah</div>
              </div>
              <button
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 disabled:opacity-50"
                onClick={addJummahSlot}
                disabled={!loggedIn || loading}
              >
                + Add Slot
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              {data.jummah.map((j, idx) => (
                <div key={idx} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-white/85">Slot {idx + 1}</div>
                    <button
                      className="text-xs text-white/60 hover:text-white disabled:opacity-50"
                      onClick={() => removeJummahSlot(idx)}
                      disabled={!loggedIn || data.jummah.length === 1 || loading}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TimeInput
                      label="Khutbah"
                      value={j.khutbah}
                      onChange={(v) => {
                        const copy = [...data.jummah];
                        copy[idx] = { ...copy[idx], khutbah: v };
                        setData({ ...data, jummah: copy });
                      }}
                      disabled={!loggedIn || loading}
                      placeholder="e.g. 12:45"
                    />
                    <TimeInput
                      label="Salah"
                      value={j.salah}
                      onChange={(v) => {
                        const copy = [...data.jummah];
                        copy[idx] = { ...copy[idx], salah: v };
                        setData({ ...data, jummah: copy });
                      }}
                      disabled={!loggedIn || loading}
                      placeholder="e.g. 1:15"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {status ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              {status}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function TimeInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const isOk = isLikelyTime(props.value);
  const normalized = isOk ? normalizeTime(props.value) : "";

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm text-white/70">{props.label}</label>
        <div className="flex items-center gap-2">
          {!isOk ? <span className="text-xs text-amber-300">HH:MM</span> : null}
          {isOk && normalized ? (
            <span className="text-xs text-white/50 font-mono">{fmt12From24(normalized)}</span>
          ) : null}
        </div>
      </div>
      <input
        className={`mt-2 w-full rounded-2xl border px-4 py-3 outline-none transition disabled:opacity-50
          ${
            isOk
              ? "border-white/10 bg-black/30 focus:border-emerald-400/60"
              : "border-amber-400/40 bg-black/30 focus:border-amber-400/60"
          }`}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder ?? "e.g. 06:35"}
        inputMode="numeric"
      />
    </div>
  );
}
