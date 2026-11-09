/** Browser helpers shared by the Meta and TikTok pixels. */

export function readCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
}

let clientIpRequest: Promise<string | undefined> | null = null;

/**
 * The visitor's public IP as our server sees it (app/api/client-ip), fetched
 * at most once per page load. Resolves undefined on any failure: attribution
 * must never hold up checkout.
 */
export function fetchClientIp(): Promise<string | undefined> {
  clientIpRequest ??= (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
      const res = await fetch("/api/client-ip", { cache: "no-store", signal: controller.signal });
      const { ip } = (await res.json()) as { ip?: string | null };
      return ip || undefined;
    } catch {
      clientIpRequest = null; // allow a retry later
      return undefined;
    } finally {
      clearTimeout(timeout);
    }
  })();
  return clientIpRequest;
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Unique per event; shared by the browser and server copies of that event for deduplication. */
export function newEventId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}
