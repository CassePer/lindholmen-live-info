export type TvPanel = "lunch" | "departures" | "cameras";
export const TV_PANELS: { id: TvPanel; label: string }[] = [
  { id: "lunch", label: "Dagens lunch" },
  { id: "departures", label: "Avgångar" },
  { id: "cameras", label: "Kameror" },
];
export const DEFAULT_TV_PANELS: TvPanel[] = ["lunch", "departures"];

/** Parses the saved setting; must contain 1 or 2 known panels, otherwise default. */
export function parseTvPanels(value: string | undefined): TvPanel[] {
  const ids = TV_PANELS.map((p) => p.id);
  const list = [...new Set((value ?? "").split(",").map((s) => s.trim()))].filter((s): s is TvPanel => ids.includes(s as TvPanel));
  return list.length >= 1 && list.length <= 2 ? ids.filter((id) => list.includes(id)) : DEFAULT_TV_PANELS;
}

/** Toggles a panel while keeping 1–2 selected. Returns null when the change is not allowed. */
export function toggleTvPanel(current: TvPanel[], panel: TvPanel): TvPanel[] | null {
  const next = current.includes(panel) ? current.filter((p) => p !== panel) : [...current, panel];
  if (next.length < 1 || next.length > 2) return null;
  return TV_PANELS.map((p) => p.id).filter((id) => next.includes(id));
}
