import { useQuery } from "@tanstack/react-query";
import { getDepartures } from "@/services/departures";
import { useAppSettings } from "@/hooks/use-app-settings";

function isWeekend() {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

export function useDepartures() {
  const { data: settings } = useAppSettings();
  const intervalSec = settings?.departure_refresh_interval
    ? parseInt(settings.departure_refresh_interval, 10)
    : 60;
  const updateWeekends = settings?.departure_update_weekends !== "false";

  const shouldRefresh = updateWeekends || !isWeekend();

  return useQuery({
    queryKey: ["departures"],
    queryFn: () => getDepartures(),
    refetchInterval: shouldRefresh ? intervalSec * 1000 : false,
    staleTime: 10_000,
  });
}
