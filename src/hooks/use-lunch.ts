import { useQuery } from "@tanstack/react-query";
import { getLunchMenus, getWeeklyMenus } from "@/services/lunch";

export function useLunchMenus(date?: Date) {
  return useQuery({
    queryKey: ["lunch", date?.toISOString()],
    queryFn: () => getLunchMenus(date),
    staleTime: 30 * 60 * 1000, // 30 min – scraping is expensive
    gcTime: 60 * 60 * 1000, // keep in cache 1h
  });
}

export function useWeeklyMenus(date?: Date) {
  return useQuery({
    queryKey: ["lunch-week", date?.toISOString()],
    queryFn: () => getWeeklyMenus(date),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
