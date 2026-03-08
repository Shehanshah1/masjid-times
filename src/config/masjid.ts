type CalcMethod = "NORTH_AMERICA" | "MUSLIM_WORLD_LEAGUE" | "EGYPTIAN" | "KARACHI" | "UMM_AL_QURA";
type MadhabType = "HANAFI" | "SHAFI";

export const masjid: {
  name: string;
  timezone: string;
  coordinates: { lat: number; lon: number };
  calc: {
    method: CalcMethod;
    fajrAngle?: number;
    ishaAngle?: number;
    madhab: MadhabType;
  };
} = {
  name: "Islamic Center of Hattiesburg",
  timezone: "America/Chicago",
  coordinates: { lat: 31.3271, lon: -89.2903 },
  calc: {
    method: "NORTH_AMERICA",
    fajrAngle: 18,
    ishaAngle: 18,
    madhab: "HANAFI",
  },
};
