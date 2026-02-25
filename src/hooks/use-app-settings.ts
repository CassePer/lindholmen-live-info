import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAppSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-settings", {
        method: "GET",
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
