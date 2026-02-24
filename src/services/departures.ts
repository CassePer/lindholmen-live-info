import { supabase } from "@/integrations/supabase/client";
import type { DeparturesResponse } from "@/api/types";

export async function getDepartures(time?: string): Promise<DeparturesResponse> {
  const params: Record<string, string> = {};
  if (time) params.time = time;

  const { data, error } = await supabase.functions.invoke("departures", {
    body: null,
    headers: {},
  });

  if (error) {
    console.error("Edge function error:", error);
    throw new Error("Kunde inte hämta avgångar.");
  }

  if (data?.error) {
    console.error("API error:", data.error);
    throw new Error(data.error.message || "Kunde inte hämta avgångar.");
  }

  return data as DeparturesResponse;
}

export async function getDeparturesAtTime(time: string): Promise<DeparturesResponse> {
  const queryString = new URLSearchParams({ time }).toString();

  const { data, error } = await supabase.functions.invoke(`departures?${queryString}`, {
    body: null,
  });

  if (error) {
    console.error("Edge function error:", error);
    throw new Error("Kunde inte hämta avgångar.");
  }

  if (data?.error) {
    throw new Error(data.error.message || "Kunde inte hämta avgångar.");
  }

  return data as DeparturesResponse;
}
