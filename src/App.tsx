import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import BottomNav from "@/components/BottomNav";
import LunchPage from "@/pages/LunchPage";
import DeparturesPage from "@/pages/DeparturesPage";
import CamerasPage from "@/pages/CamerasPage";
import DashboardPage from "@/pages/DashboardPage";
import TvDashboardPage from "@/pages/TvDashboardPage";
import AdminPage from "@/pages/AdminPage";
import InstallPage from "@/pages/InstallPage";
import NotFound from "@/pages/NotFound";
import { InstallBanner } from "@/components/InstallBanner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTvMode } from "@/hooks/use-tv-mode";
const queryClient = new QueryClient();

function AppLayout() {
  const isMobile = useIsMobile();
  const { isTv, iframeUrl } = useTvMode();
  const [searchParams] = useSearchParams();
  const isAdminMode = searchParams.get("mode") === "admin";

  // Admin mode: accessible via ?mode=admin on any device
  if (isAdminMode) {
    return (
      <div className="flex min-h-screen flex-col">
        <AdminPage />
      </div>
    );
  }

  if (!isMobile && isTv) {
    return (
      <div className="flex min-h-screen flex-col">
        <Routes>
          <Route path="/" element={<TvDashboardPage iframeUrl={iframeUrl} />} />
          <Route path="*" element={<TvDashboardPage iframeUrl={iframeUrl} />} />
        </Routes>
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="flex min-h-screen flex-col">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/install" element={<InstallPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <InstallBanner />
        <Routes>
          <Route path="/" element={<LunchPage />} />
          <Route path="/avgangar" element={<DeparturesPage />} />
          <Route path="/kameror" element={<CamerasPage />} />
          <Route path="/install" element={<InstallPage />} />
          <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
