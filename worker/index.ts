import { departuresHandler } from "./departures";
import { camerasHandler } from "./cameras";

interface Env extends Record<string, string | undefined> {
  ALLOWED_ORIGINS: string;
  TV_IP_RANGES?: string;
}
export function isTvIp(ip: string, ranges: string): boolean {
  const parse = (value: string): number | undefined => {
    const parts = value.split(".");
    if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return undefined;
    return parts.reduce((acc, part) => (acc * 256 + Number(part)) >>> 0, 0);
  };
  const candidate = parse(ip);
  if (candidate === undefined) return false;
  return ranges.split(",").some((range) => {
    const [base, prefixText] = range.trim().split("/");
    const address = parse(base);
    const prefix = prefixText === undefined ? 32 : Number(prefixText);
    if (address === undefined || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (candidate & mask) === (address & mask);
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("Origin");
    const allowed = env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()) ?? [];
    // CORS is not authentication; Cloudflare rate limiting must also be configured.
    if (origin && !allowed.includes(origin)) return new Response("Åtkomst nekad.", { status: 403 });
    const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Strict-Transport-Security": "max-age=31536000; includeSubDomains", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'", Vary: "Origin" });
    if (origin) headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    if (req.method === "OPTIONS") return new Response(null, { headers });
    if (req.method !== "GET") return new Response(JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "Endast läsning är tillåten." } }), { status: 405, headers });
    try {
      const path = new URL(req.url).pathname;
      let response: Response;
      if (path === "/api/v1/departures/lindholmspiren") response = await departuresHandler(req, env);
      else if (path === "/api/v1/cameras") response = await camerasHandler(req, env);
      else if (path === "/api/v1/tv") response = new Response(JSON.stringify({ isTv: isTvIp(req.headers.get("CF-Connecting-IP") ?? "", env.TV_IP_RANGES ?? "") }));
      else return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Resursen hittades inte." } }), { status: 404, headers });
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return new Response(JSON.stringify({ error: { code: "UPSTREAM_ERROR", message: "Kunde inte hämta informationen." } }), { status: 502, headers });
    }
  },
};