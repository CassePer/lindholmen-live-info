import { fetchApi } from "@/api/client";
import type { DeparturesResponse } from "@/api/types";

export async function getDepartures(minutes = 60): Promise<DeparturesResponse> {
  return fetchApi<DeparturesResponse>(
    `/api/v1/departures/lindholmspiren?minutes=${minutes}`
  );
}
