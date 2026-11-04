import { useQuery } from "@tanstack/react-query";
import { getAppSettings } from "@/services/settings";

export function useAppSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
