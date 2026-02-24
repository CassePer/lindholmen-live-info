import { useQuery } from "@tanstack/react-query";
import { getDepartures } from "@/services/departures";

export function useDepartures(minutes = 60) {
  return useQuery({
    queryKey: ["departures", minutes],
    queryFn: () => getDepartures(minutes),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}
