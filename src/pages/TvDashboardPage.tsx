import { useState } from "react";
import LunchPage from "@/pages/LunchPage";
import DeparturesPage from "@/pages/DeparturesPage";
import CamerasPage from "@/pages/CamerasPage";
import { TvToolbar } from "@/components/TvToolbar";
import { useAppSettings } from "@/hooks/use-app-settings";
import { parseTvPanels, type TvPanel } from "@/lib/tv-panels";
import { cn } from "@/lib/utils";

interface TvDashboardPageProps {
  iframeUrl: string;
}

const PANEL_COMPONENTS: Record<TvPanel, () => JSX.Element> = {
  lunch: () => <LunchPage embedded />,
  departures: () => <DeparturesPage embedded />,
  cameras: () => <CamerasPage embedded />,
};

export default function TvDashboardPage({ iframeUrl }: TvDashboardPageProps) {
  const { data: settings } = useAppSettings();
  const [chosen, setChosen] = useState<string | null>(() => {
    try { return localStorage.getItem("tv_panels"); } catch { return null; }
  });
  const panels = parseTvPanels(chosen ?? settings?.tv_panels);
  const choose = (next: TvPanel[]) => {
    const value = next.join(",");
    setChosen(value);
    try { localStorage.setItem("tv_panels", value); } catch { /* ignore */ }
  };

  return (
    <main className="flex h-screen overflow-hidden">
      <div className="flex w-1/3 min-w-0 shrink-0">
        {panels.map((panel, i) => {
          const Panel = PANEL_COMPONENTS[panel];
          return (
            <div
              key={panel}
              className={cn(
                "h-full overflow-auto p-4",
                panels.length === 1 ? "w-full" : "w-1/2",
                i < panels.length - 1 && "border-r border-border/50",
              )}
            >
              <Panel />
            </div>
          );
        })}
      </div>

      <div className="flex-1 min-w-0 border-l border-border/50">
        {iframeUrl ? (
          <iframe
            src={iframeUrl}
            className="w-full h-full border-0"
            title="Extern webbplats"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-lg">
              Ingen extern URL konfigurerad. Ställ in under Admin → Inställningar.
            </p>
          </div>
        )}
      </div>

      <TvToolbar panels={panels} onChange={choose} />
    </main>
  );
}
