import { supabase } from "@/integrations/supabase/client";
import type { LunchMenu } from "@/api/types";

/**
 * Fetch today's lunch menus via the edge function.
 * The edge function handles caching internally.
 */
export async function getLunchMenus(force = false): Promise<LunchMenu[]> {
  const { data, error } = await supabase.functions.invoke("lunch-menus", {
    body: force ? { force: true } : null,
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
