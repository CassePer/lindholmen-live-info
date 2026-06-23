import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLunchMenus, type LunchMenusResult } from "@/services/lunch";
import { useAppSettings } from "@/hooks/use-app-settings";

function isWeekend() {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

export function useLunchMenus() {
  const queryClient = useQueryClient();
  const { data: settings } = useAppSettings();
  const refreshHour = parseInt(settings?.lunch_auto_refresh_hour ?? "10", 10);
  const updateWeekends = settings?.lunch_update_weekends !== "false";
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

      // Skip weekends if setting is off
      if (!updateWeekends) {
        while (target.getDay() === 0 || target.getDay() === 6) {
          target.setDate(target.getDate() + 1);
        }
      }

      const ms = target.getTime() - now.getTime();
      timerRef.current = setTimeout(() => {
        forceRefresh();
        scheduleNext();
      }, ms);
    }
    scheduleNext();
    return () => clearTimeout(timerRef.current);
  }, [refreshHour, updateWeekends, forceRefresh]);

  return useQuery<LunchMenusResult>({
    queryKey: ["lunch"],
    queryFn: () => getLunchMenus(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
