"use client";

import { useEffect, useMemo, useState } from "react";
import { Coordinates, CalculationMethod, Madhab, PrayerTimes } from "adhan";
import { masjid } from "@/config/masjid";

/* ================= Types ================= */

type Jamaat = {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jummah: { khutbah: string; salah: string }[];
};

type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

/* ================= Fallback ================= */

const FALLBACK: Jamaat = {
  fajr: "06:35",
  dhuhr: "13:20",
  asr: "17:15",
  maghrib: "17:50",
  isha: "19:15",
  jummah: [{ khutbah: "12:45", salah: "13:15" }],
};

/* ================= Utilities ================= */

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: masjid.timezone,
  }).format(date);
}

function calculateAdhanTimes(date: Date) {
  const coords = new Coordinates(masjid.coordinates.lat, masjid.coordinates.lon);
  const params = CalculationMethod.NorthAmerica();

  params.fajrAngle = masjid.calc.fajrAngle;
  params.ishaAngle = masjid.calc.ishaAngle;
  params.madhab = Madhab.Hanafi;

  const pt = new PrayerTimes(coords, date, params);

  return {
    fajr: pt.fajr,
    sunrise: pt.sunrise,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
  };
}

function getNextPrayer(now: Date, times: ReturnType<typeof calculateAdhanTimes>) {
  const order: PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
  for (const key of order) if (times[key] > now) return key;
  return "fajr";
}

/* ================= Component ================= */

export default function DisplayPage() {
  const [jamaat, setJamaat] = useState<Jamaat>(FALLBACK);
  const [now, setNow] = useState(() => new Date());

  // Fetch jamaat
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/jamaat", { cache: "no-store" });
        const json = await res.json();
        if (active && json?.data) setJamaat(json.data);
      } catch {
        // keep fallback
      }
    }

    load();
    const id = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Calculate once per day
  const today = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    [now.getFullYear(), now.getMonth(), now.getDate()]
  );

  const adhanTimes = useMemo(() => calculateAdhanTimes(today), [today]);
  const nextPrayer = getNextPrayer(now, adhanTimes);

  const tiles = [
    { key: "fajr", title: "Fajr", jamaat: jamaat.fajr },
    { key: "sunrise", title: "Sunrise" },
    { key: "dhuhr", title: "Dhuhr", jamaat: jamaat.dhuhr },
    { key: "asr", title: "Asr", jamaat: jamaat.asr },
    { key: "maghrib", title: "Maghrib", jamaat: jamaat.maghrib },
    { key: "isha", title: "Isha", jamaat: jamaat.isha },
  ] as const;

  const clock = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: masjid.timezone,
  }).format(now);

  return (
    <main className="h-screen w-screen bg-black text-white overflow-hidden">
      {/* tighter padding so grid always fits */}
      <div className="h-full w-full p-6 grid grid-rows-[auto_1fr_auto] gap-5">
        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="font-semibold tracking-tight text-[clamp(28px,3.2vw,56px)]">
            {masjid.name}
          </h1>

          <div className="rounded-3xl bg-white/5 border border-white/10 px-6 py-4">
            <div className="font-semibold tabular-nums text-[clamp(28px,3vw,56px)]">
              {clock}
            </div>
          </div>
        </header>

        {/* Tiles: force 3x2 so all 6 always visible */}
        <section className="h-full grid grid-cols-3 grid-rows-2 gap-5 min-h-0">
          {tiles.map((t) => {
            const adhan = formatTime(adhanTimes[t.key]);
            const isNext = nextPrayer === t.key;

            return (
              <Tile
                key={t.key}
                title={t.title}
                adhan={adhan}
                jamaat={"jamaat" in t ? t.jamaat : undefined}
                highlight={isNext}
              />
            );
          })}
        </section>

        {/* Footer */}
        <footer className="rounded-3xl bg-white/5 border border-white/10 px-8 py-4 flex items-center justify-between">
          <div className="text-[clamp(16px,1.6vw,30px)]">
            Jumu&apos;ah:{" "}
            <span className="font-semibold">
              {jamaat.jummah?.[0]?.khutbah ?? "—"} (Khutbah) •{" "}
              {jamaat.jummah?.[0]?.salah ?? "—"} (Salah)
            </span>
          </div>
          <div className="text-[clamp(12px,1.1vw,18px)] opacity-70">
            Next: {nextPrayer.toUpperCase()}
          </div>
        </footer>
      </div>
    </main>
  );
}

/* ================= Tile ================= */

function Tile({
  title,
  adhan,
  jamaat,
  highlight,
}: {
  title: string;
  adhan: string;
  jamaat?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-6 flex flex-col justify-center min-h-0 ${
        highlight
          ? "bg-emerald-500/10 border-emerald-400/40"
          : "bg-white/5 border-white/10"
      }`}
    >
      <div className="font-semibold opacity-90 text-[clamp(18px,1.6vw,34px)]">
        {title}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-5 items-end min-h-0">
        <div className="min-w-0">
          <div className="opacity-70 text-[clamp(12px,1vw,18px)]">Adhan</div>
          <div className="mt-2 font-semibold tracking-tight tabular-nums text-[clamp(28px,3vw,64px)] leading-none">
            {adhan}
          </div>
        </div>

        {jamaat ? (
          <div className="text-right min-w-0">
            <div className="opacity-70 text-[clamp(12px,1vw,18px)]">Jamaat</div>
            <div className="mt-2 font-semibold tracking-tight tabular-nums text-[clamp(28px,3vw,64px)] leading-none">
              {jamaat}
            </div>
          </div>
        ) : (
          <div className="text-right opacity-25 text-[clamp(24px,2.2vw,48px)] leading-none">
            —
          </div>
        )}
      </div>
    </div>
  );
}
