// src/lib/time.ts
export type Time12 = { hour: number; minute: number; ampm: "AM" | "PM" };

export function to12(time24?: string): Time12 {
  if (!time24 || !time24.includes(":")) return { hour: 12, minute: 0, ampm: "PM" };
  const parts = time24.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  
  if (isNaN(h)) return { hour: 12, minute: 0, ampm: "PM" };
  
  const ampm: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour = ((h + 11) % 12) + 1;
  return { hour, minute: m, ampm };
}

export function to24(t: Time12) {
  let hour = t.hour % 12;
  if (t.ampm === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
}

export function fmt12From24(time24?: string) {
  if (!time24 || !time24.includes(":")) return "--:--";
  const t = to12(time24);
  return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")} ${t.ampm}`;
}

export function fmtDateTime12(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).formatToParts(d);

  const hh = (parts.find((p) => p.type === "hour")?.value ?? "12").padStart(2, "0");
  const mm = (parts.find((p) => p.type === "minute")?.value ?? "00").padStart(2, "0");
  const dpRaw = parts.find((p) => p.type === "dayPeriod")?.value ?? "PM";
  const dp = dpRaw.toUpperCase().includes("A") ? "AM" : "PM";

  return `${hh}:${mm} ${dp}`;
}