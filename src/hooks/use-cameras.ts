import { useQuery } from "@tanstack/react-query";
import { getCameras } from "@/services/cameras";

export function useCameras() {
  return useQuery({
    queryKey: ["cameras"],
    queryFn: getCameras,
    refetchInterval: 3 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
}
