export const ADMIN_TTL_MS = 5 * 60 * 1000;

async function signingKey(secret: string) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function issueAdminSession(secret: string, now = Date.now()): Promise<string> {
  const payload = `${now + ADMIN_TTL_MS}.${crypto.randomUUID()}`;
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret), new TextEncoder().encode(payload));
  return `${payload}.${Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
export async function verifyAdminSession(token: string | null, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || !secret || token.length > 180) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
  const expires = Number(parts[0]);
  if (expires <= now || expires > now + ADMIN_TTL_MS) return false;
  const signature = Uint8Array.from(parts[2].match(/../g) ?? [], (hex) => parseInt(hex, 16));
  return crypto.subtle.verify("HMAC", await signingKey(secret), signature, new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
}
export function isAdminRequest(req: Request): Promise<boolean> {
  return verifyAdminSession(req.headers.get("x-admin-session"), Deno.env.get("ADMIN_SESSION_SECRET"));
}