import { getAdhanTimes, fmtTime } from "@/lib/prayer";
import { getJamaatTimes } from "@/lib/db";
import { masjid } from "@/config/masjid";
import { fmt12From24 } from "@/lib/time";
import Image from "next/image";

export const dynamic = "force-dynamic";

function isFridayInTZ(date: Date, timeZone: string): boolean {
  const dayName = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone,
  }).format(date);
  return dayName === "Friday";
}

export default async function Home() {
  const adhan = getAdhanTimes(new Date());
  const jamaat = await getJamaatTimes();
  const friday = isFridayInTZ(new Date(), masjid.timezone);

  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: masjid.timezone,
  }).format(new Date());

  // Use actual Jummah times from jamaat data
  const jummah1Time = jamaat.jummah?.[0]?.salah || "12:15";
  const jummah2Time = jamaat.jummah?.[1]?.salah || "13:15";

  const rows = [
    { label: "Fajr", adhan: fmtTime(adhan.fajr), jamaat: jamaat.fajr },
    { label: "Sunrise", adhan: fmtTime(adhan.sunrise) },
    ...(friday
      ? [{ label: "Jummah", adhan: fmtTime(adhan.dhuhr), jamaat: jamaat.dhuhr, isJummah: true }]
      : [{ label: "Dhuhr", adhan: fmtTime(adhan.dhuhr), jamaat: jamaat.dhuhr }]),
    { label: "Asr", adhan: fmtTime(adhan.asr), jamaat: jamaat.asr },
    { label: "Maghrib", adhan: fmtTime(adhan.maghrib), jamaat: jamaat.maghrib },
    { label: "Isha", adhan: fmtTime(adhan.isha), jamaat: jamaat.isha },
  ];

  return (
    <main className="min-h-screen islamic-bg text-[#1a1a2e]">
      <div className="islamic-pattern-overlay" />
      <div className="relative z-10">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-5">
              <Image
                src="/logo.svg"
                alt={masjid.name}
                width={90}
                height={90}
                className="w-[70px] h-[70px] md:w-[90px] md:h-[90px]"
                priority
              />
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-600/10 px-3 py-1 text-xs text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Live Adhan + Jamaat
                </div>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                  {masjid.name}
                </h1>

                <p className="mt-2 text-[#1a1a2e]/60">
                  Prayer times calculated using {masjid.calc.method.replaceAll("_", " ")} &bull;{" "}
                  {masjid.calc.fajrAngle}&deg; / {masjid.calc.ishaAngle}&deg; &bull; Hanafi Asr
                </p>
              </div>
            </div>

            <div className="rounded-2xl islamic-card px-5 py-4">
              <div className="text-xs text-amber-700/70">Today</div>
              <div className="mt-1 text-lg font-semibold">{today}</div>
              <div className="mt-1 text-xs text-[#1a1a2e]/50">{masjid.timezone}</div>
            </div>
          </div>

          {/* Main grid */}
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Times card */}
            <section className="rounded-2xl islamic-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Today&apos;s Prayer Times</h2>
                <div className="text-sm text-[#1a1a2e]/50">Adhan &bull; Jamaat</div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                {rows.map((r) =>
                  "isJummah" in r && r.isJummah ? (
                    <JummahCard key={r.label} adhan={r.adhan} jummah1Time={jummah1Time} jummah2Time={jummah2Time} />
                  ) : (
                    <TimeCard
                      key={r.label}
                      label={r.label}
                      adhan={r.adhan}
                      jamaat={r.jamaat}
                    />
                  )
                )}
              </div>

              <div className="mt-6 rounded-xl border border-emerald-700/10 bg-emerald-50/50 p-4 text-sm text-[#1a1a2e]/60">
                Tip: Jamaat times are editable from the Admin panel. Display page pulls from{" "}
                <span className="font-mono text-[#1a1a2e]/70">/api/jamaat</span>.
              </div>
            </section>

            {/* Sidebar card */}
            <aside className="space-y-6">
              <section className="rounded-2xl islamic-card p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span>&#x1F54C;</span> Jumu&apos;ah
                </h3>
                <p className="mt-1 text-sm text-[#1a1a2e]/60">
                  Friday prayer schedule
                </p>

                <div className="mt-4 grid gap-3">
                  <InfoRow label="1st Jummah" value={fmt12From24(jummah1Time)} />
                  <InfoRow label="2nd Jummah" value={fmt12From24(jummah2Time)} />
                </div>
              </section>

              <section className="rounded-2xl islamic-card p-6">
                <h3 className="text-lg font-semibold">Quick Links</h3>
                <div className="mt-4 grid gap-3">
                  <LinkButton href="/display" label="Open TV Display Mode" />
                  <LinkButton href="/admin" label="Admin (Edit Jamaat Times)" />
                </div>
                <p className="mt-4 text-xs text-[#1a1a2e]/40">
                  Display mode is built for TVs / kiosks.
                </p>
              </section>
            </aside>
          </div>

          <footer className="mt-10 border-t border-[#1a1a2e]/10 pt-6 text-center text-xs text-[#1a1a2e]/40">
            &copy; {new Date().getFullYear()} {masjid.name} &bull; Times shown in{" "}
            {masjid.timezone}
          </footer>
        </div>
      </div>
    </main>
  );
}

/* ================= UI Pieces ================= */

function TimeCard(props: { label: string; adhan: string; jamaat?: string }) {
  return (
    <div className="rounded-xl border border-emerald-700/10 bg-white/50 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-[#1a1a2e]/80">{props.label}</div>
        {props.jamaat ? (
          <span className="rounded-full border border-emerald-600/20 bg-emerald-600/10 px-2 py-0.5 text-[11px] text-emerald-700">
            Jamaat
          </span>
        ) : (
          <span className="rounded-full border border-[#1a1a2e]/10 bg-[#1a1a2e]/5 px-2 py-0.5 text-[11px] text-[#1a1a2e]/40">
            &mdash;
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] text-[#1a1a2e]/50">Adhan</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">
            {props.adhan}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] text-[#1a1a2e]/50">Jamaat</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-emerald-700">
            {props.jamaat ? fmt12From24(props.jamaat) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function JummahCard(props: { adhan: string; jummah1Time: string; jummah2Time: string }) {
  return (
    <div className="rounded-xl border jummah-tile p-4 md:col-span-2">
      <div className="relative z-10 flex items-center justify-between">
        <div className="text-sm font-bold text-amber-800 flex items-center gap-2">
          <span>&#x1F54C;</span> Jummah (Friday Prayer)
        </div>
        <span className="rounded-full border border-amber-600/20 bg-amber-600/10 px-2 py-0.5 text-[11px] text-amber-800">
          2 Sessions
        </span>
      </div>

      <div className="relative z-10 mt-3 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[11px] text-[#1a1a2e]/50">Adhan</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{props.adhan}</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-amber-800/70">1st Jummah</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-amber-800">
            {fmt12From24(props.jummah1Time)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-amber-800/70">2nd Jummah</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-amber-800">
            {fmt12From24(props.jummah2Time)}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-amber-700/10 bg-amber-50/50 p-4">
      <div className="text-sm text-[#1a1a2e]/60">{props.label}</div>
      <div className="text-lg font-semibold tabular-nums text-amber-800">{props.value}</div>
    </div>
  );
}

function LinkButton(props: { href: string; label: string }) {
  return (
    <a
      href={props.href}
      className="block rounded-xl border border-emerald-700/10 bg-white/50 px-4 py-3 text-sm font-semibold text-[#1a1a2e]/80 hover:bg-emerald-50 transition-colors"
    >
      {props.label}
    </a>
  );
}
