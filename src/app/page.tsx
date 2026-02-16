import { getAdhanTimes, fmtTime } from "@/lib/prayer";
import { masjid } from "@/config/masjid";

type JummahSlot = { khutbah: string; salah: string };
type Jamaat = {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jummah: JummahSlot[];
};

const DEFAULTS: Jamaat = {
  fajr: "06:35",
  dhuhr: "13:20",
  asr: "17:15",
  maghrib: "17:50",
  isha: "19:15",
  jummah: [{ khutbah: "12:45", salah: "13:15" }],
};

function getBaseUrl() {
  // Vercel provides VERCEL_URL without protocol, e.g. "myapp.vercel.app"
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Local dev
  return "http://localhost:3000";
}

async function getJamaat(): Promise<Jamaat> {
  try {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/jamaat`, { cache: "no-store" });

    if (!res.ok) return DEFAULTS;

    const json = await res.json();
    return (json?.data ?? DEFAULTS) as Jamaat;
  } catch {
    return DEFAULTS;
  }
}

export default async function Home() {
  const adhan = getAdhanTimes(new Date());
  const jamaat = await getJamaat();

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-semibold">{masjid.name}</h1>
          <p className="text-slate-600">
            Today&apos;s Prayer Times (Adhan + Jamaat)
          </p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TimeRow label="Fajr" adhan={fmtTime(adhan.fajr)} jamaat={jamaat.fajr} />
            <TimeRow label="Sunrise" adhan={fmtTime(adhan.sunrise)} />
            <TimeRow label="Dhuhr" adhan={fmtTime(adhan.dhuhr)} jamaat={jamaat.dhuhr} />
            <TimeRow label="Asr" adhan={fmtTime(adhan.asr)} jamaat={jamaat.asr} />
            <TimeRow label="Maghrib" adhan={fmtTime(adhan.maghrib)} jamaat={jamaat.maghrib} />
            <TimeRow label="Isha" adhan={fmtTime(adhan.isha)} jamaat={jamaat.isha} />
          </div>
        </section>
      </div>
    </main>
  );
}

function TimeRow(props: { label: string; adhan: string; jamaat?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-sm font-medium text-slate-600">{props.label}</div>

      <div className="mt-2 flex items-end justify-between">
        <div>
          <div className="text-xs text-slate-500">Adhan</div>
          <div className="text-2xl font-semibold">{props.adhan}</div>
        </div>

        {props.jamaat ? (
          <div className="text-right">
            <div className="text-xs text-slate-500">Jamaat</div>
            <div className="text-2xl font-semibold">{props.jamaat}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
