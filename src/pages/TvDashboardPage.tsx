import { useState } from "react";
import LunchPage from "@/pages/LunchPage";
import DeparturesPage from "@/pages/DeparturesPage";
import { TvToolbar } from "@/components/TvToolbar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { AnimatePresence, motion } from "framer-motion";

interface TvDashboardPageProps {
  iframeUrl: string;
}

export default function TvDashboardPage({ iframeUrl }: TvDashboardPageProps) {
  const [iframeVisible, setIframeVisible] = useState(!!iframeUrl);

  return (
    <main className="flex h-screen overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        {/* Left: Lunch + Departures */}
        <ResizablePanel defaultSize={iframeVisible ? 50 : 100} minSize={30}>
          <div className="flex h-full">
            <div className="w-1/2 h-full overflow-auto border-r border-border/50 p-4">
              <LunchPage embedded />
            </div>
            <div className="w-1/2 h-full overflow-auto p-4">
              <DeparturesPage embedded />
            </div>
          </div>
        </ResizablePanel>

        {/* Right: Iframe (toggleable + resizable) */}
        <AnimatePresence>
          {iframeVisible && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={20}>
                <motion.div
                  className="h-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
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
                </motion.div>
              </ResizablePanel>
            </>
          )}
        </AnimatePresence>
      </ResizablePanelGroup>

      <TvToolbar
        iframeVisible={iframeVisible}
        onToggleIframe={() => setIframeVisible((v) => !v)}
      />
    </main>
  );
}
