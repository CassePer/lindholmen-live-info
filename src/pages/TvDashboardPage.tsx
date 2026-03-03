import LunchPage from "@/pages/LunchPage";
import DeparturesPage from "@/pages/DeparturesPage";

interface TvDashboardPageProps {
  iframeUrl: string;
}

export default function TvDashboardPage({ iframeUrl }: TvDashboardPageProps) {
  return (
    <main className="flex h-screen overflow-hidden">
      {/* Left half: Lunch + Departures */}
      <div className="w-1/2 h-full overflow-auto border-r border-border">
        <div className="p-4 space-y-4">
          <LunchPage embedded />
          <DeparturesPage embedded />
        </div>
      </div>

      {/* Right half: Configurable iframe */}
      <div className="w-1/2 h-full">
        {iframeUrl ? (
          <iframe
            src={iframeUrl}
            className="w-full h-full border-0"
            title="Extern webbplats"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-lg">Ingen extern URL konfigurerad. Ställ in under Admin → Inställningar.</p>
          </div>
        )}
      </div>
    </main>
  );
}
