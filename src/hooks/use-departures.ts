import { useQuery } from "@tanstack/react-query";
import { getDepartures } from "@/services/departures";

export function useDepartures() {
  return useQuery({
    queryKey: ["departures"],
    queryFn: () => getDepartures(),
    refetchInterval: 60_000,
    staleTime: 10_000,
  });
}
