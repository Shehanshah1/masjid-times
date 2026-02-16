export const masjid = {
  name: "Islamic Center of Hattiesburg",
  timezone: "America/Chicago",
  coordinates: { lat: 31.3271, lon: -89.2903 },

  calc: {
    method: "MOON_SIGHTING_COMMITTEE" as const,
    fajrAngle: 18,
    ishaAngle: 18,
    madhab: "SHAFI" as const,
  },
};
