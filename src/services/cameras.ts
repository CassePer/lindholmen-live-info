import { supabase } from "@/integrations/supabase/client";
import type { Camera } from "@/api/types";
import { DATABASE_FREE } from "@/lib/deployment-mode";
import { fetchStaticApi } from "@/api/static-client";

export async function getCameras(): Promise<Camera[]> {
  if (DATABASE_FREE) return fetchStaticApi("/api/v1/cameras");
  const { data, error } = await supabase.functions.invoke("cameras");

  if (error) {
    console.error("Edge function error:", error);
    throw new Error("Kunde inte hämta kamerabilder.");
  }

  if (data?.error) {
    console.error("API error:", data.error);
    throw new Error(data.error.message || "Kunde inte hämta kamerabilder.");
  }

  return data as Camera[];
}
