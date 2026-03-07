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
  jummah2?: { khutbah: string; salah: string }[];
};

type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

/* ================= Fallback ================= */

const FALLBACK: Jamaat = {
  fajr: "05:30",
  dhuhr: "12:35",
  asr: "16:15",
  maghrib: "17:55",
  isha: "19:30",
  jummah: [{ khutbah: "12:15", salah: "12:15" }],
  jummah2: [{ khutbah: "13:15", salah: "13:15" }],
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

function isFriday(now: Date): boolean {
  const p = zonedParts(now, masjid.timezone);
  const localDate = new Date(p.year, p.month - 1, p.day);
  return localDate.getDay() === 5;
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
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

function isValidJamaat(x: unknown): x is Jamaat {
  if (!x || typeof x !== "object") return false;

  const value = x as Partial<Jamaat> & { jummah?: unknown };

  return (
    typeof value.fajr === "string" &&
    typeof value.dhuhr === "string" &&
    typeof value.asr === "string" &&
    typeof value.maghrib === "string" &&
    typeof value.isha === "string" &&
    Array.isArray(value.jummah)
  );
}

/* ================= Component ================= */

export default function DisplayPage() {
  const [jamaat, setJamaat] = useState<Jamaat>(FALLBACK);
  const [now, setNow] = useState<Date>(() => new Date());
  const [isPortraitScreen, setIsPortraitScreen] = useState(false);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const updateOrientation = () => {
      setIsPortraitScreen(window.innerHeight > window.innerWidth);
    };

    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    return () => window.removeEventListener("resize", updateOrientation);
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
    const id = setInterval(load, 10_000);
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

  const friday = isFriday(now);
  const todayDate = formatDate(now);

  const tiles = friday
    ? [
        { key: "fajr" as PrayerKey, title: "Fajr", jamaat: jamaat.fajr },
        { key: "sunrise" as PrayerKey, title: "Sunrise" },
        { key: "dhuhr" as PrayerKey, title: "Jummah", isJummah: true },
        { key: "asr" as PrayerKey, title: "Asr", jamaat: jamaat.asr },
        { key: "maghrib" as PrayerKey, title: "Maghrib", jamaat: jamaat.maghrib },
        { key: "isha" as PrayerKey, title: "Isha", jamaat: jamaat.isha },
      ]
    : [
        { key: "fajr" as PrayerKey, title: "Fajr", jamaat: jamaat.fajr },
        { key: "sunrise" as PrayerKey, title: "Sunrise" },
        { key: "dhuhr" as PrayerKey, title: "Dhuhr", jamaat: jamaat.dhuhr },
        { key: "asr" as PrayerKey, title: "Asr", jamaat: jamaat.asr },
        { key: "maghrib" as PrayerKey, title: "Maghrib", jamaat: jamaat.maghrib },
        { key: "isha" as PrayerKey, title: "Isha", jamaat: jamaat.isha },
      ];

  const clock = formatClock(now);

  const nextLabel = friday && next.key === "dhuhr" ? "JUMMAH" : next.key.toUpperCase();

  return (
    <main className="h-screen w-screen overflow-hidden islamic-bg text-white">
      {/* Decorative Islamic pattern overlay */}
      <div className="islamic-pattern-overlay" />

      <div
        className={[
          "h-full w-full p-4 md:p-6 grid gap-4 md:gap-5 grid-rows-[auto_1fr_auto] relative z-10",
        ].join(" ")}
      >
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[clamp(24px,3vw,48px)]">&#x2726;</span>
              <h1
                className={[
                  "font-semibold tracking-tight",
                  isPortraitScreen ? "text-[clamp(24px,4.5vw,52px)]" : "text-[clamp(26px,3vw,52px)]",
                ].join(" ")}
              >
                {masjid.name}
              </h1>
            </div>
            <p className="mt-1 opacity-60 text-[clamp(11px,1vw,16px)]">
              {todayDate}
            </p>
          </div>

          <div className="rounded-2xl islamic-card px-6 py-4 text-center">
            <div className="font-semibold tabular-nums text-[clamp(26px,2.8vw,52px)]">
              {clock}
            </div>
            <div className="mt-1 text-[clamp(11px,1vw,16px)] opacity-70 tabular-nums">
              Next: <span className="font-semibold text-amber-300">{nextLabel}</span>{" "}
              in <span className="font-semibold text-amber-300">{countdown}</span>
            </div>
          </div>
        </header>

        {/* Tiles */}
        <section
          className={[
            "h-full min-h-0 grid gap-4 md:gap-5",
            isPortraitScreen ? "grid-cols-2 grid-rows-3" : "grid-cols-3 grid-rows-2",
          ].join(" ")}
        >
          {tiles.map((t) => {
            const adhan = formatTime(adhanToday[t.key]);
            const isNext = next.key === t.key && next.at.getTime() === adhanToday[t.key].getTime();
            const isSunrise = t.key === "sunrise";

            if ("isJummah" in t && t.isJummah) {
              return (
                <JummahTile
                  key={t.key}
                  adhan={adhan}
                  jummah1={fmt12From24("12:15")}
                  jummah2={fmt12From24("13:15")}
                  highlight={isNext}
                />
              );
            }

            return (
              <Tile
                key={t.key}
                title={t.title}
                adhan={adhan}
                hideAdhanLabel={isSunrise}
                jamaat={"jamaat" in t && t.jamaat ? fmt12From24(t.jamaat) : undefined}
                highlight={isNext}
              />
            );
          })}
        </section>

        {/* Footer */}
        <footer className="rounded-2xl islamic-card flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[clamp(14px,1.4vw,24px)] text-amber-400">&#9774;</span>
            <div className="text-[clamp(14px,1.4vw,26px)]">
              Jumu&apos;ah:{" "}
              <span className="font-semibold text-amber-300">
                1st &mdash; {fmt12From24("12:15")}
                &nbsp;&nbsp;&bull;&nbsp;&nbsp;
                2nd &mdash; {fmt12From24("13:15")}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[clamp(11px,1vw,16px)] opacity-60">
              Next Prayer
            </div>
            <div className="text-[clamp(14px,1.4vw,24px)] font-semibold tabular-nums">
              <span className="text-amber-300">{nextLabel}</span> &bull; {formatTime(next.at)} &bull; {countdown}
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* ================= Jummah Tile ================= */

function JummahTile({
  adhan,
  jummah1,
  jummah2,
  highlight,
}: {
  adhan: string;
  jummah1: string;
  jummah2: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-5 flex flex-col justify-center min-h-0 transition-transform duration-300",
        highlight
          ? "jummah-tile-highlight scale-[1.01]"
          : "jummah-tile",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className="text-[clamp(16px,1.4vw,28px)]">&#x1F54C;</span>
        <span className="font-bold text-amber-300 text-[clamp(18px,1.6vw,34px)]">
          Jummah
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="opacity-70 text-[clamp(11px,0.9vw,16px)]">1st Jummah</span>
          <span className="font-semibold tabular-nums text-[clamp(20px,2.2vw,48px)] leading-none text-amber-200">
            {jummah1}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="opacity-70 text-[clamp(11px,0.9vw,16px)]">2nd Jummah</span>
          <span className="font-semibold tabular-nums text-[clamp(20px,2.2vw,48px)] leading-none text-amber-200">
            {jummah2}
          </span>
        </div>
      </div>

      <div className="mt-2 opacity-50 text-[clamp(10px,0.8vw,14px)]">
        Adhan: {adhan}
      </div>
    </div>
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
        "rounded-2xl border p-6 flex flex-col justify-center min-h-0 transition-transform duration-300",
        highlight
          ? "islamic-tile-highlight scale-[1.01]"
          : "islamic-tile",
      ].join(" ")}
    >
      <div className="font-semibold opacity-90 text-[clamp(18px,1.6vw,34px)]">
        {title}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-5 items-end min-h-0">
        <div className="min-w-0">
          <div className="opacity-60 text-[clamp(11px,0.9vw,16px)]">
            {hideAdhanLabel ? "\u00A0" : "Adhan"}
          </div>
          <div className="mt-2 font-semibold tracking-tight tabular-nums text-[clamp(28px,3vw,64px)] leading-none">
            {adhan}
          </div>
        </div>

        {jamaat ? (
          <div className="text-right min-w-0">
            <div className="opacity-60 text-[clamp(11px,0.9vw,16px)]">Jamaat</div>
            <div className="mt-2 font-semibold tracking-tight tabular-nums text-[clamp(28px,3vw,64px)] leading-none text-emerald-300">
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
