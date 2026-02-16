import { Coordinates, CalculationMethod, Madhab, PrayerTimes } from "adhan";
import { toZonedTime } from "date-fns-tz";
import { masjid } from "@/config/masjid";

export function getAdhanTimes(date: Date) {
  // Ensure the Date passed to adhan is in the masjid timezone
  const zoned = toZonedTime(date, masjid.timezone);

  const coords = new Coordinates(masjid.coordinates.lat, masjid.coordinates.lon);

  // Pick calculation method
  const params =
    masjid.calc.method === "MUSLIM_WORLD_LEAGUE"
      ? CalculationMethod.MuslimWorldLeague()
      : masjid.calc.method === "EGYPTIAN"
      ? CalculationMethod.Egyptian()
      : masjid.calc.method === "KARACHI"
      ? CalculationMethod.Karachi()
      : masjid.calc.method === "UMM_AL_QURA"
      ? CalculationMethod.UmmAlQura()
      : CalculationMethod.NorthAmerica();

  // Apply your angles (e.g., 18/18)
  params.fajrAngle = masjid.calc.fajrAngle;
  params.ishaAngle = masjid.calc.ishaAngle;

  // ONE fixed madhab (no comparison -> no TS build error)
  params.madhab = Madhab.Hanafi;

  const pt = new PrayerTimes(coords, zoned, params);

  return {
    fajr: pt.fajr,
    sunrise: pt.sunrise,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
  };
}

export function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,        // 🔥 this forces AM/PM
    timeZone: masjid.timezone,
  }).format(d);
}
