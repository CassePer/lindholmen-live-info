import {
  restaurants,
  lunchMenus,
  weeklyMenus,
  departures,
  cameras,
  cameraDetails,
} from "./data";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function handleMockRequest(
  path: string,
  _init?: RequestInit
): Promise<unknown> {
  // Simulate network latency
  await delay(200 + Math.random() * 300);

  // Parse path and query
  const [pathname, queryString] = path.split("?");
  const params = new URLSearchParams(queryString ?? "");

  // Routes
  if (pathname === "/api/v1/restaurants") {
    return restaurants;
  }

  if (pathname === "/api/v1/lunch") {
    const date = params.get("date");
    if (date) {
      return lunchMenus.filter((m) => m.date === date);
    }
    return lunchMenus;
  }

  if (pathname === "/api/v1/lunch/week") {
    return weeklyMenus;
  }

  if (pathname === "/api/v1/departures/lindholmspiren") {
    return { departures, updatedAt: new Date().toISOString() };
  }

  if (pathname === "/api/v1/cameras") {
    return cameras;
  }

  // Single camera
  const cameraMatch = pathname.match(/^\/api\/v1\/cameras\/(.+)$/);
  if (cameraMatch) {
    const detail = cameraDetails[cameraMatch[1]];
    if (detail) return detail;
    throw { error: { code: "NOT_FOUND", message: "Kameran hittades inte." } };
  }

  throw { error: { code: "NOT_FOUND", message: "Resursen hittades inte." } };
}
