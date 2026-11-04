/** The Cloud deployment stays active until both external origins are configured. */
export function databaseFreeReady(mode: string | undefined, dataUrl: string | undefined, apiUrl: string | undefined): boolean {
  if (mode !== "static") return false;
  try {
    return [dataUrl, apiUrl].every((value) => value && new URL(value).protocol === "https:");
  } catch {
    return false;
  }
}

export const DATABASE_FREE = databaseFreeReady(
  import.meta.env.VITE_DATA_MODE,
  import.meta.env.VITE_STATIC_DATA_URL,
  import.meta.env.VITE_API_BASE_URL,
);