import { useEffect, useReducer } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCameras } from "@/services/cameras";
import { useAppSettings } from "@/hooks/use-app-settings";
import { usePageVisible } from "@/hooks/use-page-visible";
import { shouldAutoRefresh } from "@/lib/refresh-gate";

/** Re-evaluates the refresh gate every minute so hour-boundary transitions take effect. */
function useMinuteTick() {
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
}

export function useCameras() {
  const { data: settings } = useAppSettings();
  const visible = usePageVisible();
  useMinuteTick();

  const active = shouldAutoRefresh({
    activeStart: settings?.camera_active_hours_start ?? "6",
    activeEnd: settings?.camera_active_hours_end ?? "22",
    visibilityState: visible ? "visible" : "hidden",
  });

  return useQuery({
    queryKey: ["cameras"],
    queryFn: getCameras,
    refetchInterval: active ? 3 * 60 * 1000 : false,
    refetchIntervalInBackground: false,
    staleTime: 2 * 60 * 1000,
  });
}
