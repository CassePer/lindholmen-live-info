import { supabase } from "@/integrations/supabase/client";
import type { LunchMenu } from "@/api/types";

/**
 * Fetch today's lunch menus via the edge function.
 * The edge function handles caching internally.
 */
export async function getLunchMenus(force = false, restaurantId?: string): Promise<LunchMenu[]> {
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

  return data as LunchMenu[];
}
