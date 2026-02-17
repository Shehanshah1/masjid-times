import { getAdhanTimes, fmtTime } from "@/lib/prayer";
import { getJamaatTimes } from "@/lib/db";
import { masjid } from "@/config/masjid";
import { fmt12From24 } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function Home() {
  const adhan = getAdhanTimes(new Date());
  const jamaat = await getJamaatTimes();

  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: masjid.timezone,
  }).format(new Date());

  const rows = [
    { label: "Fajr", adhan: fmtTime(adhan.fajr), jamaat: jamaat.fajr },
    { label: "Sunrise", adhan: fmtTime(adhan.sunrise) },
    { label: "Dhuhr", adhan: fmtTime(adhan.dhuhr), jamaat: jamaat.dhuhr },
    { label: "Asr", adhan: fmtTime(adhan.asr), jamaat: jamaat.asr },
    { label: "Maghrib", adhan: fmtTime(adhan.maghrib), jamaat: jamaat.maghrib },
    { label: "Isha", adhan: fmtTime(adhan.isha), jamaat: jamaat.isha },
  ];

  const jummah0 = jamaat.jummah?.[0];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Top gradient / hero */}
      <div className="bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Live Adhan + Jamaat
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                {masjid.name}
              </h1>

              <p className="mt-2 text-white/70">
                Prayer times calculated using {masjid.calc.method.replaceAll("_", " ")} •{" "}
                {masjid.calc.fajrAngle}° / {masjid.calc.ishaAngle}° • Hanafi Asr
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <div className="text-xs text-white/60">Today</div>
              <div className="mt-1 text-lg font-semibold">{today}</div>
              <div className="mt-1 text-xs text-white/60">{masjid.timezone}</div>
            </div>
          </div>

          {/* Main grid */}
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Times card */}
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Today’s Prayer Times</h2>
                <div className="text-sm text-white/60">Adhan • Jamaat</div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                {rows.map((r) => (
                  <TimeCard
                    key={r.label}
                    label={r.label}
                    adhan={r.adhan}
                    jamaat={r.jamaat}
                  />
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                Tip: Jamaat times are editable from the Admin panel. Display page pulls from{" "}
                <span className="font-mono text-white/80">/api/jamaat</span>.
              </div>
            </section>

            {/* Sidebar card */}
            <aside className="space-y-6">
              <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold">Jumu’ah</h3>
                <p className="mt-1 text-sm text-white/70">
                  Current schedule (Admin controlled)
                </p>

                <div className="mt-4 grid gap-3">
                  <InfoRow label="Khutbah" value={fmt12From24(jummah0?.khutbah)} />
                  <InfoRow label="Salah" value={fmt12From24(jummah0?.salah)} />
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                  Need multiple Jumu’ah slots? Add more entries to{" "}
                  <span className="font-mono text-white/80">jummah[]</span>.
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold">Quick Links</h3>
                <div className="mt-4 grid gap-3">
                  <LinkButton href="/display" label="Open TV Display Mode" />
                  <LinkButton href="/admin" label="Admin (Edit Jamaat Times)" />
                </div>
                <p className="mt-4 text-xs text-white/50">
                  Display mode is built for TVs / kiosks.
                </p>
              </section>
            </aside>
          </div>

          <footer className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/50">
            © {new Date().getFullYear()} {masjid.name} • Times shown in{" "}
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
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white/90">{props.label}</div>
        {props.jamaat ? (
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-200">
            Jamaat
          </span>
        ) : (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/60">
            —
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] text-white/60">Adhan</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">
            {props.adhan}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] text-white/60">Jamaat</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">
            {props.jamaat ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-sm text-white/70">{props.label}</div>
      <div className="text-lg font-semibold tabular-nums">{props.value}</div>
    </div>
  );
}

function LinkButton(props: { href: string; label: string }) {
  return (
    <a
      href={props.href}
      className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/90 hover:bg-black/30"
    >
      {props.label}
    </a>
  );
}
