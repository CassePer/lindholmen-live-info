import LunchPage from "@/pages/LunchPage";
import DeparturesPage from "@/pages/DeparturesPage";
import { TvToolbar } from "@/components/TvToolbar";

interface TvDashboardPageProps {
  iframeUrl: string;
}

export default function TvDashboardPage({ iframeUrl }: TvDashboardPageProps) {
  return (
    <main className="flex h-screen overflow-hidden">
      {/* Left: Lunch + Departures */}
      <div className="flex w-1/3 min-w-0 shrink-0">
        <div className="w-1/2 h-full overflow-auto border-r border-border/50 p-4">
          <LunchPage embedded />
        </div>
        <div className="w-1/2 h-full overflow-auto p-4">
          <DeparturesPage embedded />
        </div>
      </div>

      {/* Right: Iframe */}
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

      <TvToolbar />
    </main>
  );
}
