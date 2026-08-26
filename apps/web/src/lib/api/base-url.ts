const CONFIGURED_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Keeps local browser and API requests on the same loopback host. Cookies with
 * SameSite=Lax then work consistently whether the developer opens localhost or
 * 127.0.0.1, without relaxing production origin or cookie policy.
 */
export function getApiBaseUrl(): string {
  if (typeof window === "undefined") return CONFIGURED_API_BASE_URL;

  try {
    const apiUrl = new URL(CONFIGURED_API_BASE_URL);
    if (
      LOOPBACK_HOSTS.has(apiUrl.hostname) &&
      LOOPBACK_HOSTS.has(window.location.hostname)
    ) {
      apiUrl.hostname = window.location.hostname;
      return apiUrl.toString().replace(/\/$/, "");
    }
  } catch {
    // Environment validation is authoritative. Preserve the configured value
    // so a malformed deployment fails visibly instead of being rewritten.
  }

  return CONFIGURED_API_BASE_URL;
}
