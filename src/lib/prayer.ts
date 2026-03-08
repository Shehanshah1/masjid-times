import { Coordinates, CalculationMethod, Madhab, PrayerTimes, CalculationParameters } from "adhan";
import { masjid } from "@/config/masjid";
import { fmtDateTime12 } from "@/lib/time";

/**
 * Calculates prayer times for a given date based on the masjid's configuration.
 * @param date - The date for which to calculate times (defaults to UTC).
 */
export function getAdhanTimes(date: Date) {
  // 1. Validate date to prevent library crashes
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error("Invalid date provided to getAdhanTimes");
  }

  // 2. Initialize Coordinates
  const coords = new Coordinates(masjid.coordinates.lat, masjid.coordinates.lon);

  // 3. Resolve Calculation Method
  // We use a mapping or switch to ensure params is a valid CalculationParameters object
  let params: CalculationParameters;
  
  switch (masjid.calc.method) {
    case "MUSLIM_WORLD_LEAGUE":
      params = CalculationMethod.MuslimWorldLeague();
      break;
    case "EGYPTIAN":
      params = CalculationMethod.Egyptian();
      break;
    case "KARACHI":
      params = CalculationMethod.Karachi();
      break;
    case "UMM_AL_QURA":
      params = CalculationMethod.UmmAlQura();
      break;
    case "NORTH_AMERICA":
    default:
      params = CalculationMethod.NorthAmerica();
  }

  // 4. Apply custom calculation parameters from config
  if (typeof masjid.calc.fajrAngle === "number") {
    params.fajrAngle = masjid.calc.fajrAngle;
  }
  if (typeof masjid.calc.ishaAngle === "number") {
    params.ishaAngle = masjid.calc.ishaAngle;
  }

  // 5. Set Madhab for Asr calculation (Hanafi vs Shafi)
  // This affects the shadow length ratio used for the Asr time.
  params.madhab = masjid.calc.madhab === "HANAFI" ? Madhab.Hanafi : Madhab.Shafi;

  // 6. Calculate Times
  // Adhan handles the UTC date internally; timezone conversion happens at the UI layer.
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

/**
 * Formats a Date object into a 12-hour time string specific to the masjid's timezone.
 *
 */
export function fmtTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return fmtDateTime12(d, masjid.timezone);
}