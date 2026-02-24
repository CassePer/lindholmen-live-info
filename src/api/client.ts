import { getToken } from "@/auth";
import { AppError, logError } from "@/lib/errors";
import type { ApiError } from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

// Dynamic import for mock handler – only loaded when needed
let mockHandler: ((path: string, init?: RequestInit) => Promise<unknown>) | null = null;

async function getMockHandler() {
  if (!mockHandler) {
    const mod = await import("./mocks/handler");
    mockHandler = mod.handleMockRequest;
  }
  return mockHandler;
}

export async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  // Mock mode
  if (USE_MOCKS) {
    try {
      const handler = await getMockHandler();
      return (await handler(path, options)) as T;
    } catch (err) {
      logError("fetchApi:mock", err);
      throw AppError.fromUnknown(err);
    }
  }

  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      let apiError: ApiError;
      try {
        apiError = await res.json();
      } catch {
        apiError = {
          error: { code: `HTTP_${res.status}`, message: res.statusText },
        };
      }
      throw AppError.fromApiError(apiError);
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof AppError) throw err;
    logError("fetchApi", err);
    throw new AppError("NETWORK_ERROR", "Kunde inte nå servern. Försök igen.");
  }
}
