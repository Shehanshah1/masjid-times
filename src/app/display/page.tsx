"use client";

import { useEffect, useMemo, useState } from "react";
import { Coordinates, CalculationMethod, Madhab, PrayerTimes } from "adhan";
import { masjid } from "@/config/masjid";
import { fmt12From24, fmtDateTime12 } from "@/lib/time";

/* ================= Types ================= */

type Jamaat = {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jummah: { khutbah: string; salah: string }[];
  jummah2: { khutbah: string; salah: string }[];
};

type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

/* ================= Fallback ================= */

const FALLBACK: Jamaat = {
  fajr: "05:30",
  dhuhr: "12:35",
  asr: "16:15",
  maghrib: "17:55",
  isha: "19:30",
  jummah: [{ khutbah: "12:15", salah: "12:45" }],
  jummah2: [{ khutbah: "13:15", salah: "13:45" }],    
};

/* ================= Timezone helpers ================= */

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function nowInMasjidTZ(now: Date) {
  const p = zonedParts(now, masjid.timezone);
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

function todayInMasjidTZ(now: Date) {
  const p = zonedParts(now, masjid.timezone);
  return new Date(p.year, p.month - 1, p.day);
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/* ================= Utilities ================= */

function formatTime(date: Date) {
  return fmtDateTime12(date, masjid.timezone);
}

function formatClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: masjid.timezone,
  }).formatToParts(date);

  const hh = (parts.find((p) => p.type === "hour")?.value ?? "12").padStart(2, "0");
  const mm = (parts.find((p) => p.type === "minute")?.value ?? "00").padStart(2, "0");
  const ss = (parts.find((p) => p.type === "second")?.value ?? "00").padStart(2, "0");
  const dpRaw = parts.find((p) => p.type === "dayPeriod")?.value ?? "PM";
  const dp = dpRaw.toUpperCase().includes("A") ? "AM" : "PM";

  return `${hh}:${mm}:${ss} ${dp}`;
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

function getNextPrayerInfo(
  now: Date,
  todayTimes: ReturnType<typeof calculateAdhanTimes>,
  tomorrowTimes: ReturnType<typeof calculateAdhanTimes>
): { key: PrayerKey; at: Date } {
  const order: PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

  for (const key of order) {
    if (todayTimes[key] > now) return { key, at: todayTimes[key] };
  }

  return { key: "fajr", at: tomorrowTimes.fajr };
}

function msToHMS(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function isValidJamaat(x: any): x is Jamaat {
  return (
    x &&
    typeof x.fajr === "string" &&
    typeof x.dhuhr === "string" &&
    typeof x.asr === "string" &&
    typeof x.maghrib === "string" &&
    typeof x.isha === "string" &&
    Array.isArray(x.jummah)
  );
}

/* ================= Component ================= */

export default function DisplayPage() {
  const [jamaat, setJamaat] = useState<Jamaat>(FALLBACK);
  const [now, setNow] = useState<Date | null>(null);

  // Initial time sync and live clock
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Poll for jamaat updates
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/jamaat", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const data = json?.data;
        if (active && isValidJamaat(data)) setJamaat(data);
      } catch (e) {
        console.error("Failed to load jamaat times", e);
      }
    }

    load();
    const id = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Calculations based on current time
  const nowTz = useMemo(() => now ? nowInMasjidTZ(now) : nowInMasjidTZ(new Date()), [now]);
  const todayTz = useMemo(() => now ? todayInMasjidTZ(now) : todayInMasjidTZ(new Date()), [now]);
  const tomorrowTz = useMemo(() => addDays(todayTz, 1), [todayTz]);

  const adhanToday = useMemo(() => calculateAdhanTimes(todayTz), [todayTz]);
  const adhanTomorrow = useMemo(() => calculateAdhanTimes(tomorrowTz), [tomorrowTz]);

  const next = useMemo(
    () => getNextPrayerInfo(nowTz, adhanToday, adhanTomorrow),
    [nowTz, adhanToday, adhanTomorrow]
  );

  const countdown = useMemo(() => msToHMS(next.at.getTime() - nowTz.getTime()), [next, nowTz]);

  const tiles = [
    { key: "fajr", title: "Fajr", jamaat: jamaat.fajr },
    { key: "sunrise", title: "Sunrise" },
    { key: "dhuhr", title: "Dhuhr", jamaat: jamaat.dhuhr },
    { key: "asr", title: "Asr", jamaat: jamaat.asr },
    { key: "maghrib", title: "Maghrib", jamaat: jamaat.maghrib },
    { key: "isha", title: "Isha", jamaat: jamaat.isha },
  ] as const;

  // Prevent hydration mismatch by showing a black screen until the clock is ready
  if (!now) return <div className="h-screen w-screen bg-black" />;

  const clock = formatClock(now);

  return (
    <main className="h-screen w-screen bg-black text-white overflow-hidden">
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
            <div className="mt-1 text-[clamp(12px,1.1vw,18px)] opacity-70 tabular-nums">
              Next: <span className="font-semibold">{next.key.toUpperCase()}</span>{" "}
              <span className="opacity-70">at</span>{" "}
              <span className="font-semibold">{formatTime(next.at)}</span>{" "}
              <span className="opacity-70">(in</span>{" "}
              <span className="font-semibold">{countdown}</span>
              <span className="opacity-70">)</span>
            </div>
          </div>
        </header>

        {/* Tiles */}
        <section className="h-full grid grid-cols-3 grid-rows-2 gap-5 min-h-0">
          {tiles.map((t) => {
            const adhan = formatTime(adhanToday[t.key]);
            const isNext = next.key === t.key && next.at.getTime() === adhanToday[t.key].getTime();
            const isSunrise = t.key === "sunrise";

            return (
              <Tile
                key={t.key}
                title={t.title}
                adhan={adhan}
                hideAdhanLabel={isSunrise}
                jamaat={"jamaat" in t ? fmt12From24(t.jamaat) : undefined}
                highlight={isNext}
              />
            );
          })}
        </section>

        {/* Footer */}
        <footer className="rounded-3xl bg-white/5 border border-white/10 px-8 py-4 flex items-center justify-between gap-8">
          <div className="min-w-0">
            <div className="text-[clamp(16px,1.6vw,30px)]">
              Jumu&apos;ah:{" "}
              <span className="font-semibold">
                {jamaat.jummah?.length
                  ? jamaat.jummah
                      .slice(0, 3)
                      .map((j) => fmt12From24(j.khutbah))
                      .join("   •   ")
                  : "—"}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[clamp(12px,1.1vw,18px)] opacity-70">
              Next Prayer
            </div>
            <div className="text-[clamp(16px,1.6vw,28px)] font-semibold tabular-nums">
              {next.key.toUpperCase()} • {formatTime(next.at)} • {countdown}
            </div>
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
  hideAdhanLabel,
}: {
  title: string;
  adhan: string;
  jamaat?: string;
  highlight?: boolean;
  hideAdhanLabel?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-3xl border p-6 flex flex-col justify-center min-h-0 transition-transform duration-300",
        highlight
          ? "bg-emerald-500/12 border-emerald-300/50 shadow-[0_0_0_1px_rgba(52,211,153,0.25)] scale-[1.01]"
          : "bg-white/5 border-white/10",
      ].join(" ")}
    >
      <div className="font-semibold opacity-90 text-[clamp(18px,1.6vw,34px)]">
        {title}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-5 items-end min-h-0">
        <div className="min-w-0">
          <div className="opacity-70 text-[clamp(12px,1vw,18px)]">
            {hideAdhanLabel ? "\u00A0" : "Adhan"}
          </div>
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