import { supabase } from "@/integrations/supabase/client";
import type { LunchMenu, LunchWeek } from "@/api/types";
import { DATABASE_FREE } from "@/lib/deployment-mode";
import { projectStaticLunch } from "@/lib/static-lunch";
import { fetchStaticApi } from "@/api/static-client";

export interface LunchMenusResult {
  menus: LunchMenu[];
  week?: LunchWeek;
  aiCreditsExhausted?: boolean;
  cooldown?: boolean;
  minutesLeft?: number;
  reason?: string;
}

/**
 * Fetch today's lunch menus via the edge function.
 * The edge function handles caching internally.
 */
export async function getLunchMenus(force = false, restaurantId?: string): Promise<LunchMenusResult> {
  if (DATABASE_FREE) {
    return projectStaticLunch(await fetchStaticApi("/api/v1/lunch"));
  }
  const body: Record<string, unknown> = {};
  if (force) body.force = true;
  if (restaurantId) body.restaurantId = restaurantId;

  const { data, error } = await supabase.functions.invoke("lunch-menus", {
    body: Object.keys(body).length > 0 ? body : null,
  });

  if (error) {
    console.error("Edge function error:", error);
    throw new Error("Kunde inte hämta lunchmenyer.");
  }

  if (data?.error) {
    console.error("API error:", data.error);
    throw new Error(data.error.message || "Kunde inte hämta lunchmenyer.");
  }

  // New shape: { menus, aiCreditsExhausted?, cooldown?, minutesLeft? }
  // Back-compat: if server still returns a bare array, wrap it.
  if (Array.isArray(data)) {
    return { menus: data as LunchMenu[] };
  }
  return data as LunchMenusResult;
}
