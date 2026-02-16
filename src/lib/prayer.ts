import { Coordinates, CalculationMethod, Madhab, PrayerTimes } from "adhan";
import { toZonedTime } from "date-fns-tz";
import { masjid } from "@/config/masjid";

type CalcMethod =
  | "MOON_SIGHTING_COMMITTEE"
  | "NORTH_AMERICA"
  | "MUSLIM_WORLD_LEAGUE"
  | "EGYPTIAN"
  | "KARACHI"
  | "UMM_AL_QURA";

export function getAdhanTimes(date: Date) {
 const zoned = toZonedTime(date, masjid.timezone);


  const coords = new Coordinates(
    masjid.coordinates.lat,
    masjid.coordinates.lon
  );

 let params;
switch (masjid.calc.method) {
  case "NORTH_AMERICA":
    params = CalculationMethod.NorthAmerica();
    break;
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
  default:
    params = CalculationMethod.NorthAmerica();
}


  params.fajrAngle = masjid.calc.fajrAngle;
  params.ishaAngle = masjid.calc.ishaAngle;
  params.madhab =
    masjid.calc.madhab === "HANAFI" ? Madhab.Hanafi : Madhab.Shafi;

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
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: masjid.timezone,
  }).format(d);
}
