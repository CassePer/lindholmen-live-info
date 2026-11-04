import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/hooks/use-app-settings";
import { DATABASE_FREE } from "@/lib/deployment-mode";
import { fetchStaticApi } from "@/api/static-client";

function useIpTvCheck() {
  return useQuery<{ isTv: boolean }>({
    queryKey: ["client-ip-tv"],
    queryFn: async () => {
      if (DATABASE_FREE) return fetchStaticApi<{ isTv: boolean }>("/api/v1/tv");
      const { data, error } = await supabase.functions.invoke("client-ip", {
        method: "GET",
      });
      if (error) return { isTv: false };
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useTvMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = urlParams.get("mode");

  const { data: ipData } = useIpTvCheck();
  const { data: settings } = useAppSettings();

  // URL param takes priority
  if (modeParam === "tv") return { isTv: true, iframeUrl: settings?.tv_iframe_url || "" };
  if (modeParam === "normal") return { isTv: false, iframeUrl: "" };

  return {
    isTv: ipData?.isTv ?? false,
    iframeUrl: settings?.tv_iframe_url || "",
  };
}
