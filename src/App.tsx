import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import BottomNav from "@/components/BottomNav";
import LunchPage from "@/pages/LunchPage";
import DeparturesPage from "@/pages/DeparturesPage";
import CamerasPage from "@/pages/CamerasPage";
import DashboardPage from "@/pages/DashboardPage";
import InstallPage from "@/pages/InstallPage";
import NotFound from "@/pages/NotFound";
import { InstallBanner } from "@/components/InstallBanner";
import { useIsMobile } from "@/hooks/use-mobile";

const queryClient = new QueryClient();

function AppLayout() {
  const isMobile = useIsMobile();

  if (!isMobile) {
    // Desktop: single dashboard page, no bottom nav
    return (
      <div className="flex min-h-svh flex-col">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/install" element={<InstallPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </div>
    );
  }

  // Mobile: tabbed pages with bottom nav
  return (
    <div className="flex min-h-svh flex-col">
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
