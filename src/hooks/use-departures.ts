import { useQuery } from "@tanstack/react-query";
import { getDepartures } from "@/services/departures";
import { useAppSettings } from "@/hooks/use-app-settings";

export function useDepartures() {
  const { data: settings } = useAppSettings();
  const interval = settings?.departure_refresh_interval
    ? parseInt(settings.departure_refresh_interval, 10) * 1000
    : 60_000;

  return useQuery({
    queryKey: ["departures"],
    queryFn: () => getDepartures(),
    refetchInterval: interval,
    staleTime: 10_000,
  });
}
