import { useEffect, useReducer } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDepartures } from "@/services/departures";
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

export function useDepartures() {
  const { data: settings } = useAppSettings();
  const intervalSec = settings?.departure_refresh_interval
    ? parseInt(settings.departure_refresh_interval, 10)
    : 60;
  const updateWeekends = settings?.departure_update_weekends !== "false";
  const visible = usePageVisible();
  useMinuteTick();

  const active = shouldAutoRefresh({
    updateWeekends,
    activeStart: settings?.departure_active_hours_start ?? "6",
    activeEnd: settings?.departure_active_hours_end ?? "22",
    visibilityState: visible ? "visible" : "hidden",
  });

  return useQuery({
    queryKey: ["departures"],
    queryFn: () => getDepartures(),
    refetchInterval: active ? intervalSec * 1000 : false,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  });
}
