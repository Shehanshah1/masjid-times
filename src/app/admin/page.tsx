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

  async function load() {
    const res = await fetch("/api/jamaat", { cache: "no-store" });
    const json = await res.json();
    setData(json.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function login() {
    setStatus("");
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
  }

  async function save() {
    setStatus("");
    const res = await fetch("/api/jamaat/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setStatus("Saved ✅ (refresh homepage to see it)");
    } else {
      setStatus("Unauthorized ❌ (login again)");
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
            <button className="rounded-xl bg-black px-4 py-3 text-white" onClick={login}>
              Login
            </button>
          </section>
        )}

        <section className="rounded-2xl bg-white p-6 shadow space-y-4">
          <TimeInput label="Fajr" value={data.fajr} onChange={(v) => setData({ ...data, fajr: v })} />
          <TimeInput label="Dhuhr" value={data.dhuhr} onChange={(v) => setData({ ...data, dhuhr: v })} />
          <TimeInput label="Asr" value={data.asr} onChange={(v) => setData({ ...data, asr: v })} />
          <TimeInput label="Maghrib" value={data.maghrib} onChange={(v) => setData({ ...data, maghrib: v })} />
          <TimeInput label="Isha" value={data.isha} onChange={(v) => setData({ ...data, isha: v })} />

          <div className="pt-2">
            <div className="text-sm font-semibold">Jumu&apos;ah</div>
            {data.jummah.map((j, idx) => (
              <div key={idx} className="mt-2 grid grid-cols-2 gap-3">
                <input
                  className="rounded-xl border bg-white p-3"
                  value={j.khutbah}
                  onChange={(e) => {
                    const copy = [...data.jummah];
                    copy[idx] = { ...copy[idx], khutbah: e.target.value };
                    setData({ ...data, jummah: copy });
                  }}
                  placeholder="Khutbah (e.g. 12:45)"
                />
                <input
                  className="rounded-xl border bg-white p-3"
                  value={j.salah}
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

          <button
            className="rounded-xl bg-emerald-600 px-4 py-3 text-white disabled:opacity-50"
            onClick={save}
            disabled={!loggedIn}
            title={!loggedIn ? "Login first" : ""}
          >
            Save Jamaat Times
          </button>

          {status ? <div className="text-sm text-slate-700">{status}</div> : null}
        </section>
      </div>
    </main>
  );
}

function TimeInput(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="w-28 font-medium text-slate-700">{props.label}</div>
      <input
        className="flex-1 rounded-xl border bg-white p-3"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder="e.g. 06:35"
      />
    </div>
  );
}
