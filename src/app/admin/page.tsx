"use client";

import { useEffect, useState } from "react";

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

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const [status, setStatus] = useState("");
  const [data, setData] = useState<Jamaat>(EMPTY);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  async function load() {
    setLoading(true);
    setStatus("");

    try {
      const res = await fetch("/api/jamaat", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");

      const json = await res.json();
      const incoming = json?.data;

      // Basic shape safety
      if (
        !incoming ||
        typeof incoming.fajr !== "string" ||
        typeof incoming.dhuhr !== "string" ||
        typeof incoming.asr !== "string" ||
        typeof incoming.maghrib !== "string" ||
        typeof incoming.isha !== "string" ||
        !Array.isArray(incoming.jummah)
      ) {
        setData(EMPTY);
        setStatus("Loaded defaults (invalid data received) ⚠️");
      } else {
        setData(incoming as Jamaat);
      }
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
    setSaving(true);

    try {
      const res = await fetch("/api/jamaat/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setStatus("Saved ✅ (refresh display/home to see it)");
      } else if (res.status === 401) {
        setLoggedIn(false);
        setStatus("Unauthorized ❌ (login again)");
      } else {
        setStatus("Server error ⚠️");
      }
    } catch {
      setStatus("Network error ❌");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-slate-600">Update Jamaat (Iqama) times</p>
        </header>

        {!loggedIn && (
          <section className="rounded-2xl bg-white p-6 shadow space-y-3">
            <div className="text-sm font-medium text-slate-700">Passcode</div>

            <input
              className="w-full rounded-xl border bg-white p-3"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode"
              type="password"
            />

            <button
              className="rounded-xl bg-black px-4 py-3 text-white disabled:opacity-50"
              onClick={login}
              disabled={loggingIn || !passcode}
            >
              {loggingIn ? "Logging in..." : "Login"}
            </button>
          </section>
        )}

        <section className="rounded-2xl bg-white p-6 shadow space-y-4">
          {loading ? (
            <div className="text-slate-600">Loading...</div>
          ) : (
            <>
              <TimeInput
                label="Fajr"
                value={data.fajr}
                onChange={(v) => setData({ ...data, fajr: v })}
                disabled={!loggedIn}
              />
              <TimeInput
                label="Dhuhr"
                value={data.dhuhr}
                onChange={(v) => setData({ ...data, dhuhr: v })}
                disabled={!loggedIn}
              />
              <TimeInput
                label="Asr"
                value={data.asr}
                onChange={(v) => setData({ ...data, asr: v })}
                disabled={!loggedIn}
              />
              <TimeInput
                label="Maghrib"
                value={data.maghrib}
                onChange={(v) => setData({ ...data, maghrib: v })}
                disabled={!loggedIn}
              />
              <TimeInput
                label="Isha"
                value={data.isha}
                onChange={(v) => setData({ ...data, isha: v })}
                disabled={!loggedIn}
              />

              <div className="pt-2">
                <div className="text-sm font-semibold">Jumu&apos;ah</div>

                {data.jummah.map((j, idx) => (
                  <div key={idx} className="mt-2 grid grid-cols-2 gap-3">
                    <input
                      className="rounded-xl border bg-white p-3 disabled:opacity-50"
                      value={j.khutbah}
                      disabled={!loggedIn}
                      onChange={(e) => {
                        const copy = [...data.jummah];
                        copy[idx] = { ...copy[idx], khutbah: e.target.value };
                        setData({ ...data, jummah: copy });
                      }}
                      placeholder="Khutbah (e.g. 12:45)"
                    />
                    <input
                      className="rounded-xl border bg-white p-3 disabled:opacity-50"
                      value={j.salah}
                      disabled={!loggedIn}
                      onChange={(e) => {
                        const copy = [...data.jummah];
                        copy[idx] = { ...copy[idx], salah: e.target.value };
                        setData({ ...data, jummah: copy });
                      }}
                      placeholder="Salah (e.g. 1:15)"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  className="rounded-xl bg-emerald-600 px-4 py-3 text-white disabled:opacity-50"
                  onClick={save}
                  disabled={!loggedIn || saving}
                  title={!loggedIn ? "Login first" : ""}
                >
                  {saving ? "Saving..." : "Save Jamaat Times"}
                </button>

                <button
                  className="rounded-xl bg-slate-200 px-4 py-3 text-slate-800 disabled:opacity-50"
                  onClick={load}
                  disabled={loading}
                >
                  Refresh
                </button>
              </div>
            </>
          )}

          {status ? <div className="text-sm text-slate-700">{status}</div> : null}
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
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="w-28 font-medium text-slate-700">{props.label}</div>
      <input
        className="flex-1 rounded-xl border bg-white p-3 disabled:opacity-50"
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder="e.g. 06:35"
      />
    </div>
  );
}
