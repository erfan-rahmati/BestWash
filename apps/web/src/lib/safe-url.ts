export function safeHttpUrl(value: unknown, fallback = "") {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : fallback;
  } catch {
    return fallback;
  }
}

export function safeTelephoneUrl(value: unknown) {
  const phone = String(value ?? "").replace(/[^+\d]/g, "");
  return /^\+?\d{7,15}$/.test(phone) ? `tel:${phone}` : "";
}

export function safeGoogleMapsEmbedUrl(value: unknown, address: unknown) {
  const fallback = `https://www.google.com/maps?q=${encodeURIComponent(
    String(address || "Babolsar Iran"),
  )}&output=embed`;
  const safe = safeHttpUrl(value);
  if (!safe) return fallback;
  try {
    const url = new URL(safe);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" &&
      (host === "google.com" || host.endsWith(".google.com"))
      ? url.toString()
      : fallback;
  } catch {
    return fallback;
  }
}
