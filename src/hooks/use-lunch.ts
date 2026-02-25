import { useQuery } from "@tanstack/react-query";
import { getLunchMenus } from "@/services/lunch";

export function useLunchMenus() {
  return useQuery({
    queryKey: ["lunch"],
    queryFn: () => getLunchMenus(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
