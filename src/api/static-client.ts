import { DATABASE_FREE } from "@/lib/deployment-mode";

const DATA_ROUTES: Record<string, string> = {
  "/api/v1/lunch": "lunch.json",
  "/api/v1/settings": "settings.json",
};

export async function fetchStaticApi<T>(path: string): Promise<T> {
  if (!DATABASE_FREE) throw new Error("Extern drift är inte aktiverad.");
  const pathname = path.split("?")[0];
  const file = DATA_ROUTES[pathname];
  const base = file ? import.meta.env.VITE_STATIC_DATA_URL : import.meta.env.VITE_API_BASE_URL;
  const url = file ? `${base.replace(/\/$/, "")}/api/v1/${file}` : `${base.replace(/\/$/, "")}${path}`;
  // Never forward Cloud/admin authentication to a static data origin.
  const response = await fetch(url, { method: "GET", credentials: "omit", cache: "no-store" });
  if (!response.ok) throw new Error("Kunde inte hämta informationen.");
  return response.json() as Promise<T>;
}