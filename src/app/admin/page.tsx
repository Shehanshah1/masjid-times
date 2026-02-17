// src/app/admin/page.tsx

async function save() {
  setStatus("");
  if (invalidTimes.length > 0) {
    setStatus(`Fix time format: ${invalidTimes.join(", ")} (use HH:MM)`);
    return;
  }

  // 1. Construct the payload
  const payload = {
    fajr: normalizeTime(data.fajr),
    dhuhr: normalizeTime(data.dhuhr),
    asr: normalizeTime(data.asr),
    maghrib: normalizeTime(data.maghrib),
    isha: normalizeTime(data.isha),
    jummah: data.jummah.map((j) => ({
      khutbah: normalizeTime(j.khutbah),
      salah: normalizeTime(j.salah),
    })),
  };

  setSaving(true);
  try {
    const res = await fetch("/api/jamaat/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // WRAP in a data object to match API expectation
      body: JSON.stringify({ data: payload }), 
    });

    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus("Saved ✅ (Changes will reflect on refresh)");
      // Optional: reload to sync with any server-side merges (like jummah2)
      load(); 
    } else {
      setStatus(`Error: ${json.error || res.statusText || "Server error"}`);
    }
  } catch (e: unknown) {
    setStatus("Network error ❌");
  } finally {
    setSaving(false);
  }
}