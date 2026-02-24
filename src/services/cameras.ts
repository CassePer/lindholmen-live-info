import { fetchApi } from "@/api/client";
import type { Camera, CameraDetail } from "@/api/types";

export async function getCameras(): Promise<Camera[]> {
  return fetchApi<Camera[]>("/api/v1/cameras?area=goteborg");
}

export async function getCameraDetail(id: string): Promise<CameraDetail> {
  return fetchApi<CameraDetail>(`/api/v1/cameras/${id}`);
}
