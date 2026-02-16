"use client";

import { useEffect, useMemo, useState } from "react";
import { Coordinates, CalculationMethod, Madhab, PrayerTimes } from "adhan";
import { masjid } from "@/config/masjid";

type Jamaat = {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jummah: { khutbah: string; salah: string }[];
};

const FALLBACK: Jamaat = {
  fajr: "06:35",
  dhuhr: "13:20",
  asr: "17:15",
  maghrib: "17:50",
  isha: "19:15",
  jummah: [{ khutbah: "12:45", salah: "13:15" }],
};

function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: masjid.timezone,
  }).format(d);
}

function getAdhanTimes(date: Date) {
  // Calculate prayer times based on masjid config
  const coords = new Coordinates(masjid.coordinates.lat, masjid.coordinates.lon);

  // Use a method that exists in adhan
  let params = CalculationMethod.NorthAmerica();

  // Custom angles if you want (you already set 18/18)
  params.fajrAngle = masjid.calc.fajrAngle;
  params.ishaAngle = masjid.calc.ishaAngle;


  params.madhab =
  (masjid.calc.madhab as "SHAFI" | "HANAFI") === "HANAFI"
    ? Madhab.Hanafi
    : Madhab.Shafi;


  // Use local date (adhan uses Date object; formatting handles timezone)
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

export default function DisplayPage() {
  const [jamaat, setJamaat] = useState<Jamaat>(FALLBACK);

  // live clock state
  const [now, setNow] = useState(() => new Date());

  // fetch jamaat (no localhost, relative URL)
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/jamaat", { cache: "no-store" });
        const json = await res.json();
        if (alive && json?.data) setJamaat(json.data);
      } catch {
        // keep fallback
      }
    }

    load();
    const id = setInterval(load, 60_000); // refresh jamaat every 1 min (TV safe)
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // tick clock every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const adhan = useMemo(() => getAdhanTimes(now), [now]);

  const tiles = [
    { title: "Fajr", adhan: fmtTime(adhan.fajr), jamaat: jamaat.fajr },
    { title: "Sunrise", adhan: fmtTime(adhan.sunrise) },
    { title: "Dhuhr", adhan: fmtTime(adhan.dhuhr), jamaat: jamaat.dhuhr },
    { title: "Asr", adhan: fmtTime(adhan.asr), jamaat: jamaat.asr },
    { title: "Maghrib", adhan: fmtTime(adhan.maghrib), jamaat: jamaat.maghrib },
    { title: "Isha", adhan: fmtTime(adhan.isha), jamaat: jamaat.isha },
  ];

  const clockText = new Intl.DateTimeFormat("en-US", {
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
          <div className="text-5xl font-semibold tracking-tight">{masjid.name}</div>

          <div className="rounded-3xl bg-white/5 border border-white/10 px-8 py-5">
            <div className="text-5xl font-semibold tabular-nums">{clockText}</div>
          </div>
        </header>

        {/* Tiles */}
        <section className="h-full grid grid-cols-2 gap-8">
          {tiles.map((t) => (
            <Tile key={t.title} title={t.title} adhan={t.adhan} jamaat={(t as any).jamaat} />
          ))}
        </section>

        {/* Footer */}
        <footer className="rounded-3xl bg-white/5 border border-white/10 px-10 py-6 flex items-center justify-between">
          <div className="text-3xl">
            Jumu&apos;ah:{" "}
            <span className="font-semibold">
              {jamaat.jummah?.[0]?.khutbah ?? "—"} (Khutbah) • {jamaat.jummah?.[0]?.salah ?? "—"} (Salah)
            </span>
          </div>
          <div className="text-xl opacity-70">Display Mode</div>
        </footer>
      </div>
    </main>
  );
}

function Tile(props: { title: string; adhan: string; jamaat?: string }) {
  return (
    <div className="rounded-3xl bg-white/5 border border-white/10 p-10 flex flex-col justify-center">
      <div className="text-4xl font-semibold opacity-90">{props.title}</div>

      <div className="mt-8 grid grid-cols-2 gap-10 items-end">
        <div>
          <div className="text-xl opacity-70">Adhan</div>
          <div className="mt-3 text-7xl font-semibold tracking-tight tabular-nums">
            {props.adhan}
          </div>
        </div>

        {props.jamaat ? (
          <div className="text-right">
            <div className="text-xl opacity-70">Jamaat</div>
            <div className="mt-3 text-7xl font-semibold tracking-tight tabular-nums">
              {props.jamaat}
            </div>
          </div>
        ) : (
          <div className="text-right text-6xl opacity-30">—</div>
        )}
      </div>
    </div>
  );
}
