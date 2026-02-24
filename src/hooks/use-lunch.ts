import { useQuery } from "@tanstack/react-query";
import { getLunchMenus, getWeeklyMenus } from "@/services/lunch";

export function useLunchMenus(date?: Date) {
  return useQuery({
    queryKey: ["lunch", date?.toISOString()],
    queryFn: () => getLunchMenus(date),
    staleTime: 5 * 60 * 1000,
  });
}

export function useWeeklyMenus(date?: Date) {
  return useQuery({
    queryKey: ["lunch-week", date?.toISOString()],
    queryFn: () => getWeeklyMenus(date),
    staleTime: 5 * 60 * 1000,
  });
}
