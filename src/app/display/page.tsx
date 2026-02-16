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
  const coords = new Coordinates(
    masjid.coordinates.lat,
    masjid.coordinates.lon
  );

  const params = CalculationMethod.NorthAmerica();

  // Conservative 18° / 18°
  params.fajrAngle = masjid.calc.fajrAngle;
  params.ishaAngle = masjid.calc.ishaAngle;

  // Fixed Hanafi Asr (clean, no conditional)
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
  const order: PrayerKey[] = [
    "fajr",
    "sunrise",
    "dhuhr",
    "asr",
    "maghrib",
    "isha",
  ];

  for (const key of order) {
    if (times[key] > now) return key;
  }

  return "fajr"; // after isha → next is tomorrow fajr
}

/* ================= Component ================= */

export default function DisplayPage() {
  const [jamaat, setJamaat] = useState<Jamaat>(FALLBACK);
  const [now, setNow] = useState(new Date());

  /* ---------- Fetch Jamaat ---------- */
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/jamaat", { cache: "no-store" });
        const json = await res.json();
        if (active && json?.data) setJamaat(json.data);
      } catch {
        // fallback silently
      }
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  /* ---------- Clock ---------- */
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  /* ---------- Prayer Times ---------- */
  const adhanTimes = useMemo(() => calculateAdhanTimes(now), [now]);
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
      <div className="h-full w-full p-10 grid grid-rows-[auto_1fr_auto] gap-8">
        
        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-5xl font-semibold tracking-tight">
            {masjid.name}
          </h1>

          <div className="rounded-3xl bg-white/5 border border-white/10 px-8 py-5">
            <div className="text-5xl font-semibold tabular-nums">
              {clock}
            </div>
          </div>
        </header>

        {/* Prayer Grid */}
        <section className="grid grid-cols-2 gap-8 h-full">
          {tiles.map((t) => {
            const adhan = formatTime(adhanTimes[t.key]);
            const isNext = nextPrayer === t.key;

            return (
              <Tile
                key={t.key}
                title={t.title}
                adhan={adhan}
                jamaat={t.jamaat}
                highlight={isNext}
              />
            );
          })}
        </section>

        {/* Footer */}
        <footer className="rounded-3xl bg-white/5 border border-white/10 px-10 py-6 flex items-center justify-between">
          <div className="text-3xl">
            Jumu&apos;ah:{" "}
            <span className="font-semibold">
              {jamaat.jummah?.[0]?.khutbah ?? "—"} (Khutbah) •{" "}
              {jamaat.jummah?.[0]?.salah ?? "—"} (Salah)
            </span>
          </div>
          <div className="text-xl opacity-70">
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
      className={`rounded-3xl p-10 flex flex-col justify-center border transition-all
        ${
          highlight
            ? "bg-emerald-500/10 border-emerald-400/40"
            : "bg-white/5 border-white/10"
        }`}
    >
      <div className="text-4xl font-semibold opacity-90">{title}</div>

      <div className="mt-8 grid grid-cols-2 gap-10 items-end">
        <div>
          <div className="text-xl opacity-70">Adhan</div>
          <div className="mt-3 text-7xl font-semibold tabular-nums">
            {adhan}
          </div>
        </div>

        {jamaat ? (
          <div className="text-right">
            <div className="text-xl opacity-70">Jamaat</div>
            <div className="mt-3 text-7xl font-semibold tabular-nums">
              {jamaat}
            </div>
          </div>
        ) : (
          <div className="text-right text-6xl opacity-30">—</div>
        )}
      </div>
    </div>
  );
}
