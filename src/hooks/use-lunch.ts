import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLunchMenus, type LunchMenusResult } from "@/services/lunch";
import { useAppSettings } from "@/hooks/use-app-settings";

/** Parse "HH:MM" → {h, m}. Falls back to `lunch_auto_refresh_hour` (HH:00) or 00:01. */
function parseAutoRefreshTime(
  timeStr: string | undefined,
  hourStr: string | undefined,
): { h: number; m: number } {
  if (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(":").map((s) => parseInt(s, 10));
    if (Number.isFinite(h) && Number.isFinite(m) && h >= 0 && h < 24 && m >= 0 && m < 60) {
      return { h, m };
    }
  }
  if (hourStr !== undefined) {
    const h = parseInt(hourStr, 10);
    if (Number.isFinite(h) && h >= 0 && h < 24) return { h, m: 0 };
  }
  return { h: 0, m: 1 };
}

export function useLunchMenus() {
  const queryClient = useQueryClient();
  const { data: settings } = useAppSettings();
  const { h: refreshHour, m: refreshMinute } = parseAutoRefreshTime(
    settings?.lunch_auto_refresh_time,
    settings?.lunch_auto_refresh_hour,
  );
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
      target.setHours(refreshHour, refreshMinute, 0, 0);
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
  }, [refreshHour, refreshMinute, updateWeekends, forceRefresh]);

  return useQuery<LunchMenusResult>({
    queryKey: ["lunch"],
    queryFn: () => getLunchMenus(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
