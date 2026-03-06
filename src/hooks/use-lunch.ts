import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLunchMenus } from "@/services/lunch";
import { useAppSettings } from "@/hooks/use-app-settings";

export function useLunchMenus() {
  const queryClient = useQueryClient();
  const { data: settings } = useAppSettings();
  const refreshHour = parseInt(settings?.lunch_auto_refresh_hour ?? "10", 10);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const forceRefresh = useCallback(() => {
    queryClient.fetchQuery({
      queryKey: ["lunch"],
      queryFn: () => getLunchMenus(true),
    });
  }, [queryClient]);

  useEffect(() => {
    function scheduleNext() {
      const now = new Date();
      const target = new Date(now);
      target.setHours(refreshHour, 0, 0, 0);
      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }
      const ms = target.getTime() - now.getTime();
      timerRef.current = setTimeout(() => {
        forceRefresh();
        scheduleNext();
      }, ms);
    }
    scheduleNext();
    return () => clearTimeout(timerRef.current);
  }, [refreshHour, forceRefresh]);

  return useQuery({
    queryKey: ["lunch"],
    queryFn: () => getLunchMenus(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
