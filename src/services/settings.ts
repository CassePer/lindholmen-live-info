import { fetchStaticApi } from "@/api/static-client";
import { DATABASE_FREE } from "@/lib/deployment-mode";
import { supabase } from "@/integrations/supabase/client";

export async function getAppSettings(): Promise<Record<string, string>> {
  if (DATABASE_FREE) return fetchStaticApi("/api/v1/settings");
  const { data, error } = await supabase.functions.invoke("admin-settings", { method: "GET" });
  if (error) throw error;
  return data;
}